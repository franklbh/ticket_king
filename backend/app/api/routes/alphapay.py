import asyncio
import base64
import json
import secrets
import urllib.parse
import uuid
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from typing import Any

import httpx
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.core.config import settings
from app.services.admin.repository import admin_repository
from app.utils.datetime import utc_now_millis_z
from app.utils.datetime import utc_now, utc_now_iso_seconds

# test
router = APIRouter(prefix="/alphapay", tags=["alphapay"])

ALPHAPAY_BASE_URL = "https://openapi.alphapay.ca"

# paymentRequestId -> asyncio.Queue, kept in memory while the SSE stream is open
_pending: dict[str, asyncio.Queue] = {}


def _load_private_key():
    path = settings.alphapay_private_key_path
    if path and Path(path).exists():
        pem = Path(path).read_text()
    elif settings.alphapay_private_key_pem:
        pem = settings.alphapay_private_key_pem.replace("\\n", "\n")
    else:
        raise RuntimeError("No Alphapay private key configured")
    return serialization.load_pem_private_key(pem.encode(), password=None)


def _build_headers(method: str, uri: str, body_str: str) -> dict[str, str]:
    timestamp = utc_now_millis_z()
    nonce = uuid.uuid4().hex  # 32 hex chars
    content = f"{method} {uri}\n{settings.alphapay_partner_code}.{timestamp}.{nonce}.{body_str}"
    private_key = _load_private_key()
    sig_bytes = private_key.sign(content.encode(), padding.PKCS1v15(), hashes.SHA256())
    signature = urllib.parse.quote(base64.b64encode(sig_bytes).decode())
    return {
        "Content-Type": "application/json",
        "Merchant-Code": settings.alphapay_partner_code,
        "Request-Time": timestamp,
        "Nonce": nonce,
        "Signature": f"algorithm=RS256, keyVersion=1, signature={signature}",
    }


class QrRequest(BaseModel):
    method: str  # "alipay" | "wechat"
    amount: int  # total in CAD cents
    payment_request_id: str | None = None
    description: str = "Terracotta Warriors VR"
    order: "CheckoutOrder | None" = None


class CheckoutCustomer(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    remarks: str | None = None


class CheckoutItem(BaseModel):
    event_id: int = Field(alias="eventId")
    slot_id: str = Field(alias="slotId")
    ticket_type_id: int | None = Field(default=None, alias="ticketTypeId")
    event_name: str = Field(alias="eventName")
    slot_date: str = Field(alias="slotDate")
    slot_time: str = Field(alias="slotTime")
    ticket_type: str = Field(alias="ticketType")
    quantity: int = Field(gt=0)
    unit_price: Decimal = Field(alias="unitPrice", ge=0)

    model_config = {"populate_by_name": True}


class CheckoutOrder(BaseModel):
    customer: CheckoutCustomer = Field(default_factory=CheckoutCustomer)
    items: list[CheckoutItem] = Field(min_length=1)
    coupon_code: str | None = Field(default=None, alias="couponCode")
    coupon_discount: Decimal = Field(default=Decimal("0"), alias="couponDiscount", ge=0)
    platform_fee: Decimal = Field(default=Decimal("0"), alias="platformFee", ge=0)
    payment_fee: Decimal = Field(default=Decimal("0"), alias="paymentFee", ge=0)
    gst: Decimal = Field(default=Decimal("0"), ge=0)
    pst: Decimal = Field(default=Decimal("0"), ge=0)
    total_amount: Decimal | None = Field(default=None, alias="totalAmount", ge=0)
    ip: str | None = None

    model_config = {"populate_by_name": True}


@router.post("/qr")
async def create_qr(req: QrRequest):
    payment_request_id = req.payment_request_id or _payment_request_id()
    order: dict[str, Any] | None = None
    if req.order:
        order = await _create_pending_order(req, payment_request_id)

    uri = "/api/v2.0/payments/pay"
    body = {
        "scenarioCode": "ONLINE_QRCODE",
        "paymentRequestId": payment_request_id,
        "order": {
            "orderAmount": {"value": str(req.amount), "currency": "CAD"},
            "description": req.description,
            "notifyUrl": f"{settings.webhook_base_url}/api/v1/alphapay/webhook",
        },
        "paymentMethod": {
            "paymentMethodType": "Wechat" if req.method == "wechat" else "Alipay"
        },
    }
    body_str = json.dumps(body, separators=(",", ":"))
    headers = _build_headers("POST", uri, body_str)

    async with httpx.AsyncClient() as client:
        resp = await client.post(f"{ALPHAPAY_BASE_URL}{uri}", headers=headers, content=body_str)

    data = resp.json()
    if not data.get("paymentInfo", {}).get("paymentQRImage"):
        msg = data.get("result", {}).get("resultMessage", "Failed to create QR")
        raise HTTPException(status_code=400, detail=msg)

    return {
        "qrImage": data["paymentInfo"]["paymentQRImage"],
        "paymentRequestId": payment_request_id,
        "order": order,
    }


async def _create_pending_order(req: QrRequest, payment_request_id: str) -> dict[str, Any]:
    assert req.order is not None
    now = utc_now_iso_seconds()
    order_id = str(uuid.uuid4())
    ticket_amount = _money(sum(item.unit_price * item.quantity for item in req.order.items))
    total_amount = _money(req.order.total_amount if req.order.total_amount is not None else Decimal(req.amount) / 100)
    expected_cents = int((total_amount * 100).to_integral_value(rounding=ROUND_HALF_UP))
    if expected_cents != req.amount:
        raise HTTPException(status_code=400, detail="Checkout total does not match payment amount.")

    ticket_quantity = sum(item.quantity for item in req.order.items)
    ticket_details = [
        {
            "event_id": item.event_id,
            "slot_id": item.slot_id,
            "ticket_type_id": item.ticket_type_id,
            "event_name": item.event_name,
            "slot_date": item.slot_date,
            "slot_time": item.slot_time,
            "ticket_type": item.ticket_type,
            "quantity": item.quantity,
            "unit_price": float(_money(item.unit_price)),
            "line_total": float(_money(item.unit_price * item.quantity)),
        }
        for item in req.order.items
    ]
    order_row = {
        "id": order_id,
        "order_number": _order_number(),
        "slot_id": req.order.items[0].slot_id if len(req.order.items) == 1 else None,
        "customer_id": None,
        "guest_name": req.order.customer.name,
        "guest_email": req.order.customer.email,
        "guest_phone": req.order.customer.phone,
        "sales_channel": "online",
        "order_status": "Pending",
        "payment_status": "Pending",
        "fulfillment_status": "Unfulfilled",
        "payment_method": req.method,
        "payment_provider": "alphapay",
        "provider_reference": payment_request_id,
        "ticket_quantity": ticket_quantity,
        "ticket_details": ticket_details,
        "ticket_amount": ticket_amount,
        "addon_amount": Decimal("0"),
        "platform_fee": _money(req.order.platform_fee),
        "payment_fee": _money(req.order.payment_fee),
        "gst": _money(req.order.gst),
        "pst": _money(req.order.pst),
        "coupon_discount": _money(req.order.coupon_discount),
        "admin_adjustment": Decimal("0"),
        "total_amount": total_amount,
        "coupon_code": req.order.coupon_code,
        "coupon_details": {},
        "remarks": req.order.customer.remarks,
        "created_by": None,
        "created_at": now,
        "updated_at": now,
        "email_status": "not_sent",
        "ip": req.order.ip,
    }
    inserted_orders = await admin_repository.insert(settings.admin_orders_table, order_row)
    order_items = [
        {
            "order_id": order_id,
            "event_id": item.event_id,
            "slot_id": item.slot_id,
            "ticket_type_id": item.ticket_type_id,
            "event_name": item.event_name,
            "slot_date": item.slot_date,
            "slot_time": item.slot_time,
            "ticket_type": item.ticket_type,
            "quantity": item.quantity,
            "unit_price": _money(item.unit_price),
            "subtotal_amount": _money(item.unit_price * item.quantity),
            "created_at": now,
            "updated_at": now,
        }
        for item in req.order.items
    ]
    await admin_repository.insert("order_items", order_items)
    inserted = inserted_orders[0] if inserted_orders else order_row
    return {
        "id": str(inserted["id"]),
        "orderNumber": inserted["order_number"],
        "paymentStatus": inserted["payment_status"],
        "providerReference": inserted["provider_reference"],
    }


def _payment_request_id() -> str:
    return f"ap-{utc_now():%Y%m%d%H%M%S}-{secrets.token_hex(4)}"


def _order_number() -> str:
    return f"TK{utc_now():%Y%m%d%H%M%S}{secrets.randbelow(9000) + 1000}"


def _money(value: Decimal | int | float | str) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


@router.get("/events/{payment_request_id}")
async def payment_events(payment_request_id: str):
    queue: asyncio.Queue = asyncio.Queue()
    _pending[payment_request_id] = queue

    async def generate():
        try:
            data = await asyncio.wait_for(queue.get(), timeout=300)
            yield f"data: {json.dumps(data)}\n\n"
        except asyncio.TimeoutError:
            yield 'data: {"timeout": true}\n\n'
        finally:
            _pending.pop(payment_request_id, None)

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


@router.post("/webhook")
async def alphapay_webhook(request: Request):
    body = await request.json()
    payment_request_id = body.get("paymentRequestId")
    queue = _pending.get(payment_request_id)
    if queue:
        await queue.put({"paid": True})
    return {"result": {"resultCode": "SUCCESS", "resultStatus": "S", "resultMessage": "success"}}
