from fastapi import APIRouter, Depends, Query

from app.schemas.admin import EventUpsert, SlotBatchCreate, SlotCapacityUpdate, SlotStatusUpdate, SlotUpsert, TicketTypeBulkPriceUpdate, TicketTypeStatusUpdate, TicketTypeUpsert
from app.schemas.admin.responses import TicketTypeValidationResponse, EventRead, SlotRead, TicketTypeRead
from app.services.admin.catalog_service import catalog_service
from app.services.admin.security import require_permission

router = APIRouter(tags=["catalog"])


@router.get("/events", response_model=list[EventRead])
async def list_events(
    _: dict = Depends(require_permission("catalog:read")),
) -> list[EventRead]:
    return await catalog_service.list_events()


@router.post("/events", status_code=201, response_model=EventRead)
async def create_event(
    payload: EventUpsert,
    actor: dict = Depends(require_permission("catalog:write")),
) -> EventRead:
    return await catalog_service.create_event(payload, actor)


@router.patch("/events/{event_id}", response_model=EventRead)
async def update_event(
    event_id: int,
    payload: EventUpsert,
    actor: dict = Depends(require_permission("catalog:write")),
) -> EventRead:
    return await catalog_service.update_event(event_id, payload, actor)


@router.get("/slots", response_model=list[SlotRead])
async def list_slots(
    date_from: str | None = Query(None, alias="dateFrom"),
    date_to: str | None = Query(None, alias="dateTo"),
    _: dict = Depends(require_permission("catalog:read")),
) -> list[SlotRead]:
    return await catalog_service.list_slots(date_from, date_to)


@router.post("/slots", status_code=201, response_model=SlotRead)
async def create_slot(
    payload: SlotUpsert,
    actor: dict = Depends(require_permission("catalog:write")),
) -> SlotRead:
    return await catalog_service.create_slot(payload, actor)


@router.post("/slots/batch", status_code=201, response_model=list[SlotRead])
async def create_slots_batch(
    payload: SlotBatchCreate,
    actor: dict = Depends(require_permission("catalog:write")),
) -> list[SlotRead]:
    return await catalog_service.create_slots_batch(payload, actor)


@router.get("/slots/{slot_id}", response_model=SlotRead)
async def get_slot(
    slot_id: str,
    _: dict = Depends(require_permission("catalog:read")),
) -> SlotRead:
    return await catalog_service.get_slot(slot_id)


@router.patch("/slots/{slot_id}", response_model=SlotRead)
async def update_slot(
    slot_id: str,
    payload: SlotUpsert,
    actor: dict = Depends(require_permission("catalog:write")),
) -> SlotRead:
    return await catalog_service.update_slot(slot_id, payload, actor)


@router.patch("/slots/{slot_id}/status", response_model=SlotRead)
async def update_slot_status(
    slot_id: str,
    payload: SlotStatusUpdate,
    actor: dict = Depends(require_permission("catalog:write")),
) -> SlotRead:
    return await catalog_service.update_slot_status(slot_id, payload, actor)


@router.patch("/slots/{slot_id}/capacity", response_model=SlotRead)
async def update_slot_capacity(
    slot_id: str,
    payload: SlotCapacityUpdate,
    actor: dict = Depends(require_permission("catalog:write")),
) -> SlotRead:
    return await catalog_service.update_slot_capacity(slot_id, payload, actor)


@router.get("/ticket-types", response_model=list[TicketTypeRead])
async def list_ticket_types(
    enabled_only: bool = Query(False, alias="enabledOnly"),
    _: dict = Depends(require_permission("catalog:read")),
) -> list[TicketTypeRead]:
    return await catalog_service.list_ticket_types(enabled_only)


@router.post("/ticket-types", status_code=201, response_model=TicketTypeRead)
async def create_ticket_type(
    payload: TicketTypeUpsert,
    actor: dict = Depends(require_permission("catalog:write")),
) -> TicketTypeRead:
    return await catalog_service.create_ticket_type(payload, actor)


@router.post("/ticket-types/validate", response_model=TicketTypeValidationResponse)
async def validate_ticket_type(
    payload: TicketTypeUpsert,
    _: dict = Depends(require_permission("catalog:read")),
) -> TicketTypeValidationResponse:
    return TicketTypeValidationResponse.model_validate(await catalog_service.validate_ticket_type(payload))


@router.patch("/ticket-types/bulk-price", response_model=list[TicketTypeRead])
async def bulk_update_ticket_type_prices(
    payload: TicketTypeBulkPriceUpdate,
    actor: dict = Depends(require_permission("catalog:write")),
) -> list[TicketTypeRead]:
    return await catalog_service.bulk_update_ticket_type_prices(payload, actor)


@router.patch("/ticket-types/{type_id}", response_model=TicketTypeRead)
async def update_ticket_type(
    type_id: str,
    payload: TicketTypeUpsert,
    actor: dict = Depends(require_permission("catalog:write")),
) -> TicketTypeRead:
    return await catalog_service.update_ticket_type(type_id, payload, actor)


@router.patch("/ticket-types/{type_id}/status", response_model=TicketTypeRead)
async def update_ticket_type_status(
    type_id: str,
    payload: TicketTypeStatusUpdate,
    actor: dict = Depends(require_permission("catalog:write")),
) -> TicketTypeRead:
    return await catalog_service.update_ticket_type_status(type_id, payload, actor)


@router.delete("/ticket-types/{type_id}", response_model=TicketTypeRead)
async def archive_ticket_type(
    type_id: int,
    actor: dict = Depends(require_permission("catalog:write")),
) -> TicketTypeRead:
    return await catalog_service.archive_ticket_type(type_id, actor)
