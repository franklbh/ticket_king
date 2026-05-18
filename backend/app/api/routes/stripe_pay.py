import json

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from app.core.config import settings
from app.schemas.checkout import CheckoutOrder
from app.services.reservations import (
    PAYMENT_GRACE_SECONDS,
    attach_payment,
    create_reservation,
    fulfill_paid_order,
    get_active_reservation,
    mark_paid_by_provider_reference,
)

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


class PaymentIntentRequest(BaseModel):
    amount: int        # CAD cents
    order_id: str = Field(default="", alias="order_id")
    reservation_id: str | None = Field(default=None, alias="reservationId")
    description: str = "Terracotta Warriors VR"
    order: CheckoutOrder | None = None

    model_config = {"populate_by_name": True}


@router.post("/payment-intent")
async def create_payment_intent(req: PaymentIntentRequest):
    s = _stripe()
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
    order = await attach_payment(
        order["id"],
        provider="stripe",
        method="card",
        provider_reference=intent.id,
        payment_intent_id=intent.id,
    )

    return {
        "client_secret": intent.client_secret,
        "payment_intent_id": intent.id,
        "order": order,
    }


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
        order = await mark_paid_by_provider_reference("stripe", pi["id"])
        if order:
            await fulfill_paid_order(order["id"])

    return {"status": "ok"}
