from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query

from app.services.admin_data import admin_data_service
from app.services.security import require_admin

router = APIRouter(tags=["catalog"], dependencies=[Depends(require_admin)])


@router.get("/slots")
async def list_slots(
    date_from: str | None = Query(None, alias="dateFrom"),
    date_to: str | None = Query(None, alias="dateTo"),
) -> list[dict]:
    if date_from is None:
        date_from = date.today().isoformat()
    if date_to is None:
        date_to = (date.today() + timedelta(days=90)).isoformat()
    return await admin_data_service.list_slots(date_from, date_to)


@router.get("/ticket-types")
async def list_ticket_types(enabled_only: bool = Query(False, alias="enabledOnly")) -> list[dict]:
    return await admin_data_service.list_ticket_types(enabled_only)
