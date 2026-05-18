from fastapi import APIRouter
from pydantic import BaseModel

from app.schemas.checkout import CheckoutOrder
from app.services.reservations import create_reservation, expire_reservation, fulfill_paid_order, mark_paid_reservation

router = APIRouter(prefix="/reservations", tags=["reservations"])


class ReservationCreateRequest(BaseModel):
    amount: int
    order: CheckoutOrder


class ReservationCompleteRequest(BaseModel):
    provider: str
    providerReference: str
    method: str | None = None


@router.post("")
async def reserve_checkout(req: ReservationCreateRequest):
    return await create_reservation(req.order, req.amount)


@router.post("/{order_id}/complete")
async def complete_checkout_reservation(order_id: str, req: ReservationCompleteRequest):
    await mark_paid_reservation(
        order_id,
        provider=req.provider,
        provider_reference=req.providerReference,
        method=req.method,
    )
    return await fulfill_paid_order(order_id)


@router.post("/{order_id}/expire")
async def expire_checkout_reservation(order_id: str):
    return await expire_reservation(order_id)
