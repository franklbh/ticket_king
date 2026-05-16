from fastapi import APIRouter, Query

from app.schemas.public import AvailableSlotRead
from app.services.public_catalog import public_catalog_service

router = APIRouter(prefix="/events", tags=["events"])


@router.get("/{event_id}/slots", response_model=list[AvailableSlotRead])
async def available_slots(
    event_id: str,
    date: str = Query(..., description="Business date in YYYY-MM-DD format."),
) -> list[AvailableSlotRead]:
    return await public_catalog_service.available_slots(event_id, date)
