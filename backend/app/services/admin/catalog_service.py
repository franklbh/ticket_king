from __future__ import annotations

import uuid
from datetime import date, time
from typing import Any

from fastapi import HTTPException, status

from app.core.config import settings
from app.schemas.admin import SlotBatchCreate, SlotCapacityUpdate, SlotStatusUpdate, EventUpsert, SlotUpsert, TicketTypeBulkPriceUpdate, TicketTypeStatusUpdate, TicketTypeUpsert
from app.schemas.admin.mappers import to_model, to_models
from app.schemas.admin.responses import EventRead, SlotRead, TicketTypeRead
from app.services.admin.audit import audit_change, write_audit_log
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

    async def create_event(self, payload: EventUpsert, actor: dict[str, Any]) -> EventRead:
        now = utc_now_iso_seconds()
        row = {
            "name": payload.name,
            "slug": payload.slug or payload.name.lower().strip().replace(" ", "-"),
            "status": payload.status,
            "created_at": now,
            "updated_at": now,
        }
        inserted = await admin_repository.insert(settings.admin_events_table, row)
        event_id = str(inserted[0].get("id"))
        await write_audit_log(actor, "Create", "Event", event_id, {"name": payload.name}, None)
        return to_model(EventRead, normalize_event(inserted[0]))

    async def update_event(self, event_id: int, payload: EventUpsert, actor: dict[str, Any]) -> EventRead:
        before_rows = await admin_repository.select_where(settings.admin_events_table, column="id", value=event_id, limit=1)
        values = {
            "name": payload.name,
            "slug": payload.slug or payload.name.lower().strip().replace(" ", "-"),
            "status": payload.status,
            "updated_at": utc_now_iso_seconds(),
        }
        rows = await admin_repository.update(
            settings.admin_events_table,
            match_column="id",
            match_value=event_id,
            values=values,
        )
        if not rows:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")
        details = audit_change(before_rows[0] if before_rows else None, rows[0], ["name", "slug", "status"])
        await write_audit_log(actor, "Update", "Event", str(event_id), details, None)
        return to_model(EventRead, normalize_event(rows[0]))

    async def archive_event(self, event_id: int, actor: dict[str, Any]) -> EventRead:
        before_rows = await admin_repository.select_where(settings.admin_events_table, column="id", value=event_id, limit=1)
        rows = await admin_repository.update(
            settings.admin_events_table,
            match_column="id",
            match_value=event_id,
            values={"status": "archived", "updated_at": utc_now_iso_seconds()},
        )
        if not rows:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")
        details = audit_change(before_rows[0] if before_rows else None, rows[0], ["status"])
        await write_audit_log(actor, "Archive", "Event", str(event_id), details, None)
        return to_model(EventRead, normalize_event(rows[0]))

    async def list_slots(self, date_from: str | None, date_to: str | None) -> list[SlotRead]:
        rows = await admin_repository.list_slots(date_from, date_to)
        counts = await slot_inventory_counts()
        slots = [
            normalize_slot({**row, **slot_counts_for_row(row, counts)})
            for row in rows
        ]
        return to_models(SlotRead, slots)

    async def create_slot(self, payload: SlotUpsert, actor: dict[str, Any]) -> SlotRead:
        self._validate_active_slot_business_hours(payload.business_date, payload.start_time, payload.end_time, payload.status)
        row = self._slot_row_from_payload(payload, actor)
        inserted = await admin_repository.insert(settings.admin_slots_table, row)
        await write_audit_log(actor, "Create", "Slot", str(row["id"]), {"slot_code": row.get("slot_code")}, None)
        return to_model(SlotRead, normalize_slot(inserted[0]))

    async def update_slot(self, slot_id: str, payload: SlotUpsert, actor: dict[str, Any]) -> SlotRead:
        before_rows = await admin_repository.select_where(settings.admin_slots_table, column="id", value=uuid.UUID(str(slot_id)), limit=1)
        self._validate_active_slot_business_hours(payload.business_date, payload.start_time, payload.end_time, payload.status)
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
        details = audit_change(before_rows[0] if before_rows else None, rows[0], ["business_date", "start_time", "end_time", "capacity", "status", "base_price", "notes"])
        await write_audit_log(actor, "Update", "Slot", slot_id, details, None)
        return to_model(SlotRead, normalize_slot(rows[0]))

    async def get_slot(self, slot_id: str) -> SlotRead:
        rows = await admin_repository.select_where(settings.admin_slots_table, column="id", value=uuid.UUID(str(slot_id)), limit=1)
        if not rows:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Slot not found.")
        counts = await slot_inventory_counts()
        return to_model(SlotRead, normalize_slot({**rows[0], **slot_counts_for_row(rows[0], counts)}))

    async def create_slots_batch(self, payload: SlotBatchCreate, actor: dict[str, Any]) -> list[SlotRead]:
        created: list[SlotRead] = []
        for slot in payload.slots:
            created.append(await self.create_slot(slot, actor))
        await write_audit_log(actor, "Batch Create", "Slot", None, {"count": len(created)}, None)
        return created

    async def update_slot_status(self, slot_id: str, payload: SlotStatusUpdate, actor: dict[str, Any]) -> SlotRead:
        before_rows = await admin_repository.select_where(settings.admin_slots_table, column="id", value=uuid.UUID(str(slot_id)), limit=1)
        if not before_rows:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Slot not found.")
        if str(payload.status or "").lower() == "active":
            slot = before_rows[0]
            self._validate_active_slot_business_hours(
                slot.get("business_date"),
                slot.get("start_time"),
                slot.get("end_time"),
                payload.status,
            )
        rows = await admin_repository.update(
            settings.admin_slots_table,
            match_column="id",
            match_value=uuid.UUID(str(slot_id)),
            values={"status": payload.status, "updated_at": utc_now_iso_seconds()},
        )
        if not rows:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Slot not found.")
        details = audit_change(before_rows[0] if before_rows else None, rows[0], ["status"])
        await write_audit_log(actor, "Update", "Slot", slot_id, details, None)
        return await self.get_slot(slot_id)

    async def update_slot_capacity(self, slot_id: str, payload: SlotCapacityUpdate, actor: dict[str, Any]) -> SlotRead:
        before_rows = await admin_repository.select_where(settings.admin_slots_table, column="id", value=uuid.UUID(str(slot_id)), limit=1)
        rows = await admin_repository.update(
            settings.admin_slots_table,
            match_column="id",
            match_value=uuid.UUID(str(slot_id)),
            values={"capacity": payload.total_seats, "updated_at": utc_now_iso_seconds()},
        )
        if not rows:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Slot not found.")
        details = audit_change(before_rows[0] if before_rows else None, rows[0], ["capacity"])
        details["reason"] = payload.reason
        await write_audit_log(actor, "Restock", "Slot", slot_id, details, None)
        return await self.get_slot(slot_id)

    async def list_ticket_types(self, enabled_only: bool = False) -> list[TicketTypeRead]:
        rows = await admin_repository.select(settings.admin_ticket_types_table)
        types = [normalize_ticket_type(row) for row in rows]
        if enabled_only:
            types = [row for row in types if row.get("status") == "enabled"]
        types.sort(key=lambda row: (str(row.get("name") or ""), str(row.get("id") or "")))
        return to_models(TicketTypeRead, types)

    async def create_ticket_type(self, payload: TicketTypeUpsert, actor: dict[str, Any]) -> TicketTypeRead:
        row = await self._ticket_type_row_from_payload(payload)
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
        before_rows = await admin_repository.select_where(settings.admin_ticket_types_table, column="id", value=self._coerce_type_id(type_id), limit=1)
        values = await self._ticket_type_row_from_payload(payload)
        values["updated_at"] = utc_now_iso_seconds()
        rows = await admin_repository.update(
            settings.admin_ticket_types_table,
            match_column="id",
            match_value=self._coerce_type_id(type_id),
            values=values,
        )
        if not rows:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket type not found.")
        details = audit_change(before_rows[0] if before_rows else None, rows[0], ["name", "price_type", "price", "price_adj", "weekdays", "valid_from", "valid_to", "time_start", "time_end", "add_on", "remarks", "status"])
        await write_audit_log(actor, "Update", "Ticket Type", str(type_id), details, None)
        return to_model(TicketTypeRead, normalize_ticket_type(rows[0]))

    async def update_ticket_type_status(self, type_id: int | str, payload: TicketTypeStatusUpdate, actor: dict[str, Any]) -> TicketTypeRead:
        before_rows = await admin_repository.select_where(settings.admin_ticket_types_table, column="id", value=self._coerce_type_id(type_id), limit=1)
        rows = await admin_repository.update(
            settings.admin_ticket_types_table,
            match_column="id",
            match_value=self._coerce_type_id(type_id),
            values={"status": payload.status, "updated_at": utc_now_iso_seconds()},
        )
        if not rows:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket type not found.")
        details = audit_change(before_rows[0] if before_rows else None, rows[0], ["status"])
        await write_audit_log(actor, "Update", "Ticket Type", str(type_id), details, None)
        return to_model(TicketTypeRead, normalize_ticket_type(rows[0]))

    async def archive_ticket_type(self, type_id: int | str, actor: dict[str, Any]) -> TicketTypeRead:
        return await self.update_ticket_type_status(type_id, TicketTypeStatusUpdate(status="archived"), actor)

    async def bulk_update_ticket_type_prices(self, payload: TicketTypeBulkPriceUpdate, actor: dict[str, Any]) -> list[TicketTypeRead]:
        values: dict[str, Any] = {"updated_at": utc_now_iso_seconds()}
        if payload.price is not None:
            values["price"] = payload.price
        if payload.price_adj is not None:
            values["price_adj"] = payload.price_adj
        if payload.remarks is not None:
            values["remarks"] = payload.remarks
        if len(values) == 1:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No price fields provided.")
        updated: list[TicketTypeRead] = []
        for type_id in payload.ids:
            rows = await admin_repository.update(
                settings.admin_ticket_types_table,
                match_column="id",
                match_value=self._coerce_type_id(type_id),
                values=values,
            )
            if rows:
                updated.append(to_model(TicketTypeRead, normalize_ticket_type(rows[0])))
        await write_audit_log(actor, "Batch Update", "Ticket Type", None, {"ids": [str(item) for item in payload.ids], "values": values}, None)
        return updated

    async def validate_ticket_type(self, payload: TicketTypeUpsert) -> dict[str, Any]:
        rows = await admin_repository.select(settings.admin_ticket_types_table)
        conflicts = []
        for row in rows:
            normalized = normalize_ticket_type(row)
            if normalized.get("name") != payload.name or normalized.get("status") in {"disabled", "archived"}:
                continue
            if normalized.get("validFrom") == payload.valid_from and normalized.get("validTo") == payload.valid_to:
                conflicts.append({"id": normalized.get("id"), "name": normalized.get("name"), "reason": "Same date window"})
        return {"valid": not conflicts, "conflicts": conflicts}

    @staticmethod
    def _slot_time_label(start: str, end: str | None) -> str:
        start = (start or "")[:5]
        end = (end or "")[:5] if end else None
        return f"{start}-{end}" if end else start

    @staticmethod
    def _parse_slot_date(value: Any) -> date:
        if isinstance(value, date):
            return value
        try:
            return date.fromisoformat(str(value)[:10])
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Slot date must be YYYY-MM-DD.") from exc

    @staticmethod
    def _parse_slot_time(value: Any, field_name: str) -> time:
        if isinstance(value, time):
            return value.replace(tzinfo=None)
        text = str(value or "").strip()
        if not text:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"{field_name} is required for active slots.")
        try:
            return time.fromisoformat(text)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"{field_name} must be HH:mm.") from exc

    @staticmethod
    def _latest_start_time_for_slot_date(slot_date: date) -> time:
        if slot_date.weekday() in (4, 5):
            return time(20, 0)
        return time(19, 0)

    def _validate_active_slot_business_hours(
        self,
        business_date: Any,
        start_time: Any,
        end_time: Any,
        slot_status: str,
    ) -> None:
        if str(slot_status or "").lower() != "active":
            return

        slot_date = self._parse_slot_date(business_date)
        start = self._parse_slot_time(start_time, "Start time")
        end = self._parse_slot_time(end_time, "End time")
        opening = time(10, 0)
        latest_start = self._latest_start_time_for_slot_date(slot_date)

        if end <= start:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Slot end time must be after start time.")
        if start < opening or start > latest_start:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Active slots must start at or after 10:00 and no later than "
                    f"{latest_start.strftime('%H:%M')} for this day."
                ),
            )

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

    async def _ticket_type_row_from_payload(self, payload: TicketTypeUpsert) -> dict[str, Any]:
        now = utc_now_iso_seconds()
        columns = await admin_repository.columns(settings.admin_ticket_types_table)
        row = {
            "name": payload.name,
            "price_type": payload.price_type,
            "price": payload.price,
            "weekdays": payload.weekdays,
            "valid_from": payload.valid_from,
            "valid_to": payload.valid_to,
            "time_start": payload.time_start,
            "time_end": payload.time_end,
            "remarks": payload.remarks,
            "status": payload.status,
            "created_at": now,
            "updated_at": now,
        }
        if "event_id" in columns:
            row["event_id"] = payload.event
        elif "event" in columns:
            row["event"] = payload.event
        if "price_adj" in columns:
            row["price_adj"] = payload.price_adj
        elif "price_adjustment" in columns:
            row["price_adjustment"] = payload.price_adj
        if "add_on" in columns:
            row["add_on"] = payload.add_on
        elif "addon" in columns:
            row["addon"] = payload.add_on
        return row

    @staticmethod
    def _coerce_type_id(type_id: int | str) -> int | str:
        try:
            return int(type_id)
        except (TypeError, ValueError):
            try:
                return uuid.UUID(str(type_id))
            except ValueError:
                return str(type_id)


catalog_service = CatalogService()
