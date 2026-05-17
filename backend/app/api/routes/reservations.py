from fastapi import APIRouter
from pydantic import BaseModel

from app.schemas.checkout import CheckoutOrder
from app.services.reservations import create_reservation, expire_reservation

router = APIRouter(prefix="/reservations", tags=["reservations"])


class ReservationCreateRequest(BaseModel):
    amount: int
    order: CheckoutOrder


@router.post("")
async def reserve_checkout(req: ReservationCreateRequest):
    return await create_reservation(req.order, req.amount)


@router.post("/{order_id}/expire")
async def expire_checkout_reservation(order_id: str):
    return await expire_reservation(order_id)
