from __future__ import annotations

import uuid
from typing import Any

from fastapi import HTTPException, status

from app.core.config import settings
from app.schemas.admin import SlotUpsert, TicketTypeUpsert
from app.schemas.admin.mappers import to_model, to_models
from app.schemas.admin.responses import EventRead, SlotRead, TicketTypeRead
from app.services.admin.audit import write_audit_log
from app.services.admin.enrichment import slot_counts_for_row, slot_inventory_counts
from app.services.admin.normalizers import normalize_event, normalize_slot, normalize_ticket_type
from app.services.admin.repository import admin_repository
from app.utils.datetime import utc_now_iso_seconds


class CatalogService:
    async def list_events(self) -> list[EventRead]:
        rows = await admin_repository.select(settings.admin_events_table)
        events = [normalize_event(row) for row in rows]
        events.sort(key=lambda row: row.get("id") or 0)
        return to_models(EventRead, events)

    async def list_slots(self, date_from: str | None, date_to: str | None) -> list[SlotRead]:
        rows = await admin_repository.select(settings.admin_slots_table)
        counts = await slot_inventory_counts()
        slots = [
            normalize_slot({**row, **slot_counts_for_row(row, counts)})
            for row in rows
        ]
        if date_from:
            slots = [slot for slot in slots if (slot.get("date") or "") >= date_from]
        if date_to:
            slots = [slot for slot in slots if (slot.get("date") or "") <= date_to]
        slots.sort(key=lambda slot: (slot.get("date") or "", slot.get("startTime") or ""))
        return to_models(SlotRead, slots)

    async def create_slot(self, payload: SlotUpsert, actor: dict[str, Any]) -> SlotRead:
        row = self._slot_row_from_payload(payload, actor)
        inserted = await admin_repository.insert(settings.admin_slots_table, row)
        await write_audit_log(actor, "Create", "Slot", str(row["id"]), {"slot_code": row.get("slot_code")}, None)
        return to_model(SlotRead, normalize_slot(inserted[0]))

    async def update_slot(self, slot_id: str, payload: SlotUpsert, actor: dict[str, Any]) -> SlotRead:
        values = self._slot_row_from_payload(payload, actor, include_id=False)
        values["updated_at"] = utc_now_iso_seconds()
        rows = await admin_repository.update(
            settings.admin_slots_table,
            match_column="id",
            match_value=uuid.UUID(str(slot_id)),
            values=values,
        )
        if not rows:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Slot not found.")
        await write_audit_log(actor, "Update", "Slot", slot_id, {"status": values.get("status")}, None)
        return to_model(SlotRead, normalize_slot(rows[0]))

    async def list_ticket_types(self, enabled_only: bool = False) -> list[TicketTypeRead]:
        rows = await admin_repository.select(settings.admin_ticket_types_table)
        types = [normalize_ticket_type(row) for row in rows]
        if enabled_only:
            types = [row for row in types if row.get("status") == "enabled"]
        types.sort(key=lambda row: (str(row.get("name") or ""), str(row.get("id") or "")))
        return to_models(TicketTypeRead, types)

    async def create_ticket_type(self, payload: TicketTypeUpsert, actor: dict[str, Any]) -> TicketTypeRead:
        row = self._ticket_type_row_from_payload(payload)
        inserted = await admin_repository.insert(settings.admin_ticket_types_table, row)
        type_id = str(inserted[0].get("id"))
        await write_audit_log(actor, "Create", "Ticket Type", type_id, {"name": payload.name}, None)
        return to_model(TicketTypeRead, normalize_ticket_type(inserted[0]))

    async def update_ticket_type(
        self,
        type_id: int | str,
        payload: TicketTypeUpsert,
        actor: dict[str, Any],
    ) -> TicketTypeRead:
        values = self._ticket_type_row_from_payload(payload)
        values["updated_at"] = utc_now_iso_seconds()
        rows = await admin_repository.update(
            settings.admin_ticket_types_table,
            match_column="id",
            match_value=int(type_id),
            values=values,
        )
        if not rows:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket type not found.")
        await write_audit_log(actor, "Update", "Ticket Type", str(type_id), {"name": payload.name}, None)
        return to_model(TicketTypeRead, normalize_ticket_type(rows[0]))

    @staticmethod
    def _slot_time_label(start: str, end: str | None) -> str:
        start = (start or "")[:5]
        end = (end or "")[:5] if end else None
        return f"{start}-{end}" if end else start

    def _slot_row_from_payload(
        self,
        payload: SlotUpsert,
        actor: dict[str, Any],
        *,
        include_id: bool = True,
    ) -> dict[str, Any]:
        now = utc_now_iso_seconds()
        row: dict[str, Any] = {
            "event_id": payload.event,
            "business_date": payload.business_date,
            "start_time": payload.start_time,
            "end_time": payload.end_time,
            "slot_time_label": self._slot_time_label(payload.start_time, payload.end_time),
            "timezone": payload.timezone or settings.admin_default_timezone,
            "capacity": payload.capacity,
            "status": payload.status,
            "base_price": payload.base_price,
            "notes": payload.notes,
            "updated_at": now,
        }
        if payload.slot_code:
            row["slot_code"] = payload.slot_code
        if include_id:
            row["id"] = uuid.uuid4()
            row["created_by"] = actor.get("id")
            row["created_at"] = now
        return row

    @staticmethod
    def _ticket_type_row_from_payload(payload: TicketTypeUpsert) -> dict[str, Any]:
        now = utc_now_iso_seconds()
        return {
            "event": payload.event,
            "name": payload.name,
            "price_type": payload.price_type,
            "price": payload.price,
            "price_adj": payload.price_adj,
            "weekdays": payload.weekdays,
            "valid_from": payload.valid_from,
            "valid_to": payload.valid_to,
            "time_start": payload.time_start,
            "time_end": payload.time_end,
            "add_on": payload.add_on,
            "remarks": payload.remarks,
            "status": payload.status,
            "created_at": now,
            "updated_at": now,
        }


catalog_service = CatalogService()
