import asyncio
import base64
import json
import secrets
import urllib.parse
import uuid
from pathlib import Path

import httpx
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.core.config import settings
from app.schemas.checkout import CheckoutOrder
from app.services.reservations import (
    PAYMENT_GRACE_SECONDS,
    attach_payment,
    create_reservation,
    get_active_reservation,
    mark_paid_by_provider_reference,
)
from app.utils.datetime import utc_now_millis_z
from app.utils.datetime import utc_now

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
    reservation_id: str | None = Field(default=None, alias="reservationId")
    description: str = "Terracotta Warriors VR"
    order: CheckoutOrder | None = None

    model_config = {"populate_by_name": True}


@router.post("/qr")
async def create_qr(req: QrRequest):
    payment_request_id = req.payment_request_id or _payment_request_id()
    if req.reservation_id:
        reservation = await get_active_reservation(
            req.reservation_id,
            req.amount,
            grace_seconds=PAYMENT_GRACE_SECONDS,
        )
        order = {
            "id": str(reservation["id"]),
            "orderNumber": reservation.get("order_number"),
            "paymentStatus": reservation.get("payment_status"),
            "providerReference": reservation.get("provider_reference"),
        }
    elif req.order:
        order = await create_reservation(req.order, req.amount)
    else:
        raise HTTPException(status_code=400, detail="Reservation is required.")

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

    order = await attach_payment(
        order["id"],
        provider="alphapay",
        method=req.method,
        provider_reference=payment_request_id,
    )

    return {
        "qrImage": data["paymentInfo"]["paymentQRImage"],
        "paymentRequestId": payment_request_id,
        "order": order,
    }


def _payment_request_id() -> str:
    return f"ap-{utc_now():%Y%m%d%H%M%S}-{secrets.token_hex(4)}"


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
    if payment_request_id:
        await mark_paid_by_provider_reference("alphapay", payment_request_id)
    queue = _pending.get(payment_request_id)
    if queue:
        await queue.put({"paid": True})
    return {"result": {"resultCode": "SUCCESS", "resultStatus": "S", "resultMessage": "success"}}
