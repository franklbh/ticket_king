import json

import stripe as stripe_lib
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.core.config import settings

router = APIRouter(prefix="/stripe", tags=["stripe"])


def _stripe():
    if not settings.stripe_secret_key:
        raise RuntimeError("Stripe secret key not configured — set STRIPE_SECRET_KEY")
    stripe_lib.api_key = settings.stripe_secret_key
    return stripe_lib


class PaymentIntentRequest(BaseModel):
    amount: int        # CAD cents
    order_id: str = ""
    description: str = "Terracotta Warriors VR"


@router.post("/payment-intent")
async def create_payment_intent(req: PaymentIntentRequest):
    s = _stripe()
    intent = s.PaymentIntent.create(
        amount=req.amount,
        currency="cad",
        description=req.description,
        metadata={"order_id": req.order_id},
        payment_method_types=["card"],
    )
    return {
        "client_secret": intent.client_secret,
        "payment_intent_id": intent.id,
    }


@router.post("/webhook")
async def stripe_webhook(request: Request):
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
