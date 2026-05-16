import json
import secrets
import uuid
from decimal import Decimal, ROUND_HALF_UP
from typing import Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from app.core.config import settings
from app.services.admin.repository import admin_repository
from app.utils.datetime import utc_now, utc_now_iso_seconds

try:
    import stripe as stripe_lib
except ModuleNotFoundError:
    stripe_lib = None

router = APIRouter(prefix="/stripe", tags=["stripe"])


def _stripe():
    if stripe_lib is None:
        raise HTTPException(
            status_code=503,
            detail="Stripe package is not installed. Run: python3 -m pip install -r backend/requirements.txt",
        )
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=503, detail="Stripe secret key not configured. Set STRIPE_SECRET_KEY.")
    stripe_lib.api_key = settings.stripe_secret_key
    return stripe_lib


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


class PaymentIntentRequest(BaseModel):
    amount: int        # CAD cents
    order_id: str = ""
    description: str = "Terracotta Warriors VR"
    order: CheckoutOrder | None = None


@router.post("/payment-intent")
async def create_payment_intent(req: PaymentIntentRequest):
    s = _stripe()
    order: dict[str, Any] | None = None
    if req.order:
        order = await _create_pending_order(req)

    intent = s.PaymentIntent.create(
        amount=req.amount,
        currency="cad",
        description=req.description,
        metadata={
            "order_id": order["id"] if order else req.order_id,
            "order_number": order["orderNumber"] if order else "",
        },
        payment_method_types=["card"],
    )
    if order:
        updated = await admin_repository.update(
            settings.admin_orders_table,
            match_column="id",
            match_value=order["id"],
            values={
                "provider_reference": intent.id,
                "updated_at": utc_now_iso_seconds(),
            },
        )
        if updated:
            order["providerReference"] = updated[0].get("provider_reference")

    return {
        "client_secret": intent.client_secret,
        "payment_intent_id": intent.id,
        "order": order,
    }


async def _create_pending_order(req: PaymentIntentRequest) -> dict[str, Any]:
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
        "payment_method": "card",
        "payment_provider": "stripe",
        "provider_reference": None,
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


def _order_number() -> str:
    return f"TK{utc_now():%Y%m%d%H%M%S}{secrets.randbelow(9000) + 1000}"


def _money(value: Decimal | int | float | str) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


@router.post("/webhook")
async def stripe_webhook(request: Request):
    if stripe_lib is None:
        raise HTTPException(
            status_code=503,
            detail="Stripe package is not installed. Run: python3 -m pip install -r backend/requirements.txt",
        )
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    if settings.stripe_webhook_secret:
        try:
            event = stripe_lib.Webhook.construct_event(
                payload, sig_header, settings.stripe_webhook_secret
            )
        except stripe_lib.error.SignatureVerificationError:
            raise HTTPException(status_code=400, detail="Invalid signature")
    else:
        event = json.loads(payload)

    if event["type"] == "payment_intent.succeeded":
        pi = event["data"]["object"]
        print(f"[Stripe] Payment succeeded: {pi.get('id')} order={pi.get('metadata', {}).get('order_id')}")

    return {"status": "ok"}
