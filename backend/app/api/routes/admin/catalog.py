from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query

from app.schemas.admin import SlotUpsert, TicketTypeUpsert
from app.schemas.admin.responses import EventRead, SlotRead, TicketTypeRead
from app.services.admin.catalog_service import catalog_service
from app.services.admin.security import require_admin

router = APIRouter(tags=["catalog"], dependencies=[Depends(require_admin)])


@router.get("/events", response_model=list[EventRead])
async def list_events() -> list[EventRead]:
    return await catalog_service.list_events()


@router.get("/slots", response_model=list[SlotRead])
async def list_slots(
    date_from: str | None = Query(None, alias="dateFrom"),
    date_to: str | None = Query(None, alias="dateTo"),
) -> list[SlotRead]:
    if date_from is None:
        date_from = date.today().isoformat()
    if date_to is None:
        date_to = (date.today() + timedelta(days=90)).isoformat()
    return await catalog_service.list_slots(date_from, date_to)


@router.post("/slots", status_code=201, response_model=SlotRead)
async def create_slot(
    payload: SlotUpsert,
    actor: dict = Depends(require_admin),
) -> SlotRead:
    return await catalog_service.create_slot(payload, actor)


@router.patch("/slots/{slot_id}", response_model=SlotRead)
async def update_slot(
    slot_id: str,
    payload: SlotUpsert,
    actor: dict = Depends(require_admin),
) -> SlotRead:
    return await catalog_service.update_slot(slot_id, payload, actor)


@router.get("/ticket-types", response_model=list[TicketTypeRead])
async def list_ticket_types(enabled_only: bool = Query(False, alias="enabledOnly")) -> list[TicketTypeRead]:
    return await catalog_service.list_ticket_types(enabled_only)


@router.post("/ticket-types", status_code=201, response_model=TicketTypeRead)
async def create_ticket_type(
    payload: TicketTypeUpsert,
    actor: dict = Depends(require_admin),
) -> TicketTypeRead:
    return await catalog_service.create_ticket_type(payload, actor)


@router.patch("/ticket-types/{type_id}", response_model=TicketTypeRead)
async def update_ticket_type(
    type_id: int,
    payload: TicketTypeUpsert,
    actor: dict = Depends(require_admin),
) -> TicketTypeRead:
    return await catalog_service.update_ticket_type(type_id, payload, actor)
