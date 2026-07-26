from __future__ import annotations

import asyncio
from collections import defaultdict
from datetime import date, datetime, time, timedelta, timezone
from time import monotonic
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import text

from app.core.database import SessionLocal
from app.schemas.public import AvailableSlotRead, SlotTicketTypeRead

ACTIVE_ORDER_STATUSES = {"pending", "paid", "completed"}
ACTIVE_PAYMENT_STATUSES = {"pending", "paid", "processing", "authorized"}
CATALOG_CACHE_SECONDS = 60


class PublicCatalogService:
    def __init__(self) -> None:
        self._catalog_cache: dict[str, Any] | None = None
        self._catalog_cache_at = 0.0
        self._slot_cache: dict[tuple[str, str], tuple[float, list[dict[str, Any]]]] = {}

    async def available_slots(self, event_id_or_slug: str, slot_date: str) -> list[AvailableSlotRead]:
        return await asyncio.to_thread(self._available_slots_sync, event_id_or_slug, slot_date)

    def _available_slots_sync(self, event_id_or_slug: str, slot_date: str) -> list[AvailableSlotRead]:
        if SessionLocal is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database connection is not configured.",
            )
        target_date = self._parse_date(slot_date)
        with SessionLocal() as db:
            catalog = self._catalog_snapshot_sync(db)
            event = self._event_from_catalog(catalog["events"], event_id_or_slug)
            slots = self._slots_for_date_sync(db, event["id"], target_date)
            if not slots:
                return []
            ticket_types = self._ticket_types_for_event_sync(db, event["id"])

            booked_items, booked_orders, booked_slots = self._booked_items_for_date_sync(db, target_date)
            showpass_counts = self._showpass_counts_for_date_sync(db, target_date)

        booked_items = [
            item for item in booked_items
            if self._active_order(booked_orders.get(str(item.get("order_id"))))
        ]

        available: list[AvailableSlotRead] = []
        for slot in slots:
            event_requirements = catalog["requirements"].get(str(event["id"]), [])
            availability = self._slot_availability(
                slot=slot,
                event=event,
                requirements=event_requirements,
                requirements_by_event=catalog["requirements"],
                resources=catalog["resources"],
                booked_items=booked_items,
                events=catalog["events"],
                slots=booked_slots,
            )
            availability = max(availability - showpass_counts.get(str(slot["id"]), 0), 0)
            if availability <= 0:
                continue
            capacity = self._effective_capacity(slot, event_requirements, catalog["resources"])
            slot_ticket_types = self._ticket_types_for_slot(ticket_types, slot)
            available.append(self._slot_response(slot, event, availability, capacity, slot_ticket_types))

        available.sort(key=lambda item: (item.date, item.start_time))
        return available

    def _catalog_snapshot_sync(self, db: Any) -> dict[str, Any]:
        now = monotonic()
        if self._catalog_cache and now - self._catalog_cache_at < CATALOG_CACHE_SECONDS:
            return self._catalog_cache

        events = self._events_by_id_sync(db)
        requirements, resources = self._requirements_and_resources_sync(db)
        self._catalog_cache = {
            "events": events,
            "requirements": requirements,
            "resources": resources,
        }
        self._catalog_cache_at = now
        return self._catalog_cache

    def _event_from_catalog(self, events: dict[str, dict[str, Any]], event_id_or_slug: str) -> dict[str, Any]:
        needle = str(event_id_or_slug)
        for event in events.values():
            if str(event.get("id")) != needle and str(event.get("slug")) != needle:
                continue
            if str(event.get("status") or "").lower() != "active":
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event is not active.")
            return event
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    def _slots_for_date_sync(self, db: Any, event_id: Any, target_date: date) -> list[dict[str, Any]]:
        cache_key = (str(event_id), target_date.isoformat())
        cached = self._slot_cache.get(cache_key)
        now = monotonic()
        if cached and now - cached[0] < CATALOG_CACHE_SECONDS:
            return cached[1]

        rows = db.execute(
            text(
                """
                select id, event_id, slot_code, business_date, start_time, end_time,
                       slot_time_label, timezone, capacity, status, base_price
                from public.slots
                where event_id = :event_id
                  and business_date = :target_date
                  and lower(status) = 'active'
                order by start_time
                """
            ),
            {"event_id": event_id, "target_date": target_date},
        ).mappings().all()
        slots = [dict(row) for row in rows]
        self._slot_cache[cache_key] = (now, slots)
        return slots

    def _ticket_types_for_event_sync(self, db: Any, event_id: Any) -> list[dict[str, Any]]:
        rows = db.execute(
            text(
                """
                select id, name, price, weekdays, time_start, time_end, remarks, status
                from public.ticket_types
                where event = :event_id
                  and lower(status) = 'enabled'
                order by
                  case
                    when lower(name) = 'adult' then 1
                    when lower(name) like 'child%' then 2
                    when lower(name) like 'senior%' then 3
                    when lower(name) like 'group%' then 4
                    when lower(name) like 'family%' then 5
                    else 99
                  end,
                  id
                """
            ),
            {"event_id": event_id},
        ).mappings().all()
        return [dict(row) for row in rows]

    def _requirements_and_resources_sync(
        self,
        db: Any,
    ) -> tuple[dict[str, list[dict[str, Any]]], dict[str, dict[str, Any]]]:
        rows = db.execute(
            text(
                """
                select
                  err.event_id,
                  err.resource_id,
                  err.units_per_ticket,
                  r.id as resource_row_id,
                  r.code,
                  r.name,
                  r.resource_type,
                  r.capacity,
                  r.status
                from public.event_resource_requirements err
                join public.resources r on r.id = err.resource_id
                where lower(r.status) = 'active'
                """
            )
        ).mappings().all()
        grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
        resources: dict[str, dict[str, Any]] = {}
        for row in rows:
            row_dict = dict(row)
            resource_id = row_dict["resource_id"]
            grouped[str(row_dict["event_id"])].append(
                {
                    "event_id": row_dict["event_id"],
                    "resource_id": resource_id,
                    "units_per_ticket": row_dict["units_per_ticket"],
                }
            )
            resources[str(resource_id)] = {
                "id": resource_id,
                "code": row_dict["code"],
                "name": row_dict["name"],
                "resource_type": row_dict["resource_type"],
                "capacity": row_dict["capacity"],
                "status": row_dict["status"],
            }
        return dict(grouped), resources

    def _events_by_id_sync(self, db: Any) -> dict[str, dict[str, Any]]:
        rows = db.execute(
            text(
                """
                select id, name, slug, status, event_type, content_mode, headset_brand,
                       vr_room_mode, duration_minutes
                from public.events
                """
            )
        ).mappings().all()
        return {str(row["id"]): dict(row) for row in rows if row.get("id") is not None}

    def _booked_items_for_date_sync(
        self,
        db: Any,
        target_date: date,
    ) -> tuple[list[dict[str, Any]], dict[str, dict[str, Any]], dict[str, dict[str, Any]]]:
        rows = db.execute(
            text(
                """
                select
                  oi.order_id,
                  oi.event_id as item_event_id,
                  oi.slot_id as item_slot_id,
                  oi.quantity,
                  o.order_status,
                  o.payment_status,
                  o.created_at,
                  to_jsonb(o) ->> 'reservation_expires_at' as reservation_expires_at,
                  s.id as slot_id,
                  s.business_date,
                  s.start_time,
                  s.end_time
                from public.order_items oi
                join public.orders o on o.id = oi.order_id
                join public.slots s on s.id = oi.slot_id
                where s.business_date = :target_date
                  and lower(o.order_status) in ('pending', 'paid', 'completed')
                  and lower(o.payment_status) in ('pending', 'paid', 'processing', 'authorized')
                """
            ),
            {"target_date": target_date},
        ).mappings().all()

        booked_items: list[dict[str, Any]] = []
        orders: dict[str, dict[str, Any]] = {}
        slots: dict[str, dict[str, Any]] = {}
        for row in rows:
            item = {
                "order_id": row["order_id"],
                "event_id": row["item_event_id"],
                "slot_id": row["item_slot_id"],
                "quantity": row["quantity"],
            }
            order = {
                "id": row["order_id"],
                "order_status": row["order_status"],
                "payment_status": row["payment_status"],
                "created_at": row["created_at"],
                "reservation_expires_at": row["reservation_expires_at"],
            }
            slot = {
                "id": row["slot_id"],
                "business_date": row["business_date"],
                "start_time": row["start_time"],
                "end_time": row["end_time"],
            }
            booked_items.append(item)
            orders[str(row["order_id"])] = order
            slots[str(row["slot_id"])] = slot
        return booked_items, orders, slots

    def _showpass_counts_for_date_sync(self, db: Any, target_date: date) -> dict[str, int]:
        """Returns {slot_id: active_showpass_quantity} for all slots on target_date."""
        rows = db.execute(
            text(
                """
                SELECT st.our_slot_id, SUM(st.quantity) AS total
                FROM public.showpass_tickets st
                JOIN public.slots s ON s.id = st.our_slot_id
                WHERE s.business_date = :target_date
                  AND st.status = 'active'
                GROUP BY st.our_slot_id
                """
            ),
            {"target_date": target_date},
        ).mappings().all()
        return {str(row["our_slot_id"]): int(row["total"]) for row in rows}

    def _slot_availability(
        self,
        *,
        slot: dict[str, Any],
        event: dict[str, Any],
        requirements: list[dict[str, Any]],
        requirements_by_event: dict[str, list[dict[str, Any]]],
        resources: dict[str, dict[str, Any]],
        booked_items: list[dict[str, Any]],
        events: dict[str, dict[str, Any]],
        slots: dict[str, dict[str, Any]],
    ) -> int:
        if not requirements:
            return int(slot.get("capacity") or 0)

        target_window = self._slot_window(slot, event)
        target_mode = str(event.get("vr_room_mode") or "none").lower()
        used_by_resource: dict[str, int] = defaultdict(int)
        slot_used = 0

        for item in booked_items:
            booked_slot = slots.get(str(item.get("slot_id")))
            booked_event = events.get(str(item.get("event_id")))
            if not booked_slot or not booked_event:
                continue
            if not self._overlaps(target_window, self._slot_window(booked_slot, booked_event)):
                continue
            if self._vr_mode_conflicts(target_mode, str(booked_event.get("vr_room_mode") or "none").lower()):
                return 0
            quantity = int(item.get("quantity") or 0)
            if str(booked_slot.get("id")) == str(slot.get("id")):
                slot_used += quantity
            for req in requirements_by_event.get(str(booked_event.get("id")), []):
                resource_id = str(req.get("resource_id"))
                units = int(req.get("units_per_ticket") or 0)
                if resource_id in resources:
                    used_by_resource[resource_id] += quantity * units

        remaining = []
        for req in requirements:
            resource_id = str(req.get("resource_id"))
            units = int(req.get("units_per_ticket") or 0)
            resource = resources.get(resource_id)
            if not resource or units <= 0:
                continue
            capacity = int(resource.get("capacity") or 0)
            remaining.append((capacity - used_by_resource[resource_id]) // units)

        if not remaining:
            return int(slot.get("capacity") or 0)
        return max(min(remaining), 0)

    @staticmethod
    def _effective_capacity(
        slot: dict[str, Any],
        requirements: list[dict[str, Any]],
        resources: dict[str, dict[str, Any]],
    ) -> int:
        capacities = []
        for req in requirements:
            resource_id = str(req.get("resource_id"))
            units = int(req.get("units_per_ticket") or 0)
            resource = resources.get(resource_id)
            if resource and units > 0:
                capacities.append(int(resource.get("capacity") or 0) // units)
        if capacities:
            return max(min(capacities), 0)
        return int(slot.get("capacity") or 0)

    @staticmethod
    def _active_order(order: dict[str, Any] | None) -> bool:
        if not order:
            return False
        order_status = str(order.get("order_status") or "").lower()
        payment_status = str(order.get("payment_status") or "").lower()
        if payment_status == "pending":
            expires_at = PublicCatalogService._reservation_expires_at(order)
            if expires_at and expires_at <= datetime.now(timezone.utc):
                return False
        return order_status in ACTIVE_ORDER_STATUSES and payment_status in ACTIVE_PAYMENT_STATUSES

    @staticmethod
    def _vr_mode_conflicts(target_mode: str, booked_mode: str) -> bool:
        return {target_mode, booked_mode} == {"htc", "pico"}

    def _slot_matches(self, row: dict[str, Any], event_id: Any, slot_date: date) -> bool:
        return (
            str(row.get("event_id")) == str(event_id)
            and str(row.get("status") or "").lower() == "active"
            and self._parse_date(row.get("business_date")) == slot_date
        )

    def _ticket_types_for_slot(
        self,
        ticket_types: list[dict[str, Any]],
        slot: dict[str, Any],
    ) -> list[SlotTicketTypeRead]:
        weekday = self._weekday_name(self._parse_date(slot.get("business_date")))
        slot_start = self._parse_time(slot.get("start_time"))
        seen: set[str] = set()
        matched: list[SlotTicketTypeRead] = []
        for ticket_type in ticket_types:
            days = ticket_type.get("weekdays") or []
            if isinstance(days, str):
                days = [part.strip() for part in days.strip("{}").split(",") if part.strip()]
            if weekday not in days:
                continue
            start = ticket_type.get("time_start")
            end = ticket_type.get("time_end")
            if start is None or end is None:
                continue
            window_start = self._parse_time(start)
            window_end = self._ticket_window_end(ticket_type)
            if not (window_start <= slot_start <= window_end):
                continue
            label = str(ticket_type.get("name") or "Ticket")
            dedupe_key = label.lower()
            if dedupe_key in seen:
                continue
            seen.add(dedupe_key)
            matched.append(
                SlotTicketTypeRead(
                    id=str(ticket_type["id"]),
                    label=label,
                    price=float(ticket_type.get("price") or 0),
                    minQty=self._min_qty_for_ticket(label),
                )
            )
        return matched

    def _ticket_window_end(self, ticket_type: dict[str, Any]) -> time:
        return self._parse_time(ticket_type.get("time_end"))

    @staticmethod
    def _weekday_name(value: date) -> str:
        return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][value.weekday()]

    @staticmethod
    def _min_qty_for_ticket(label: str) -> int:
        lowered = label.lower()
        if "group" in lowered:
            return 6
        if "family" in lowered:
            return 3
        return 1

    def _slot_window(self, slot: dict[str, Any], event: dict[str, Any]) -> tuple[datetime, datetime]:
        day = self._parse_date(slot.get("business_date"))
        start = self._parse_time(slot.get("start_time"))
        end_value = slot.get("end_time")
        end = self._parse_time(end_value) if end_value else None
        start_dt = datetime.combine(day, start)
        if end:
            end_dt = datetime.combine(day, end)
        else:
            duration = int(event.get("duration_minutes") or 15)
            end_dt = start_dt + timedelta(minutes=duration)
        if end_dt <= start_dt:
            end_dt = start_dt + timedelta(minutes=int(event.get("duration_minutes") or 15))
        return start_dt, end_dt

    @staticmethod
    def _overlaps(left: tuple[datetime, datetime], right: tuple[datetime, datetime]) -> bool:
        return left[0] < right[1] and right[0] < left[1]

    @staticmethod
    def _slot_response(
        slot: dict[str, Any],
        event: dict[str, Any],
        availability: int,
        capacity: int,
        ticket_types: list[SlotTicketTypeRead],
    ) -> AvailableSlotRead:
        start = PublicCatalogService._format_time(slot.get("start_time"))
        end = PublicCatalogService._format_time(slot.get("end_time"))
        fallback_label = f"{start}-{end}" if end else str(start)
        label = str(slot.get("slot_time_label") or fallback_label)
        return AvailableSlotRead(
            id=str(slot["id"]),
            eventId=int(event["id"]),
            eventSlug=str(event.get("slug") or ""),
            date=PublicCatalogService._parse_date(slot.get("business_date")).isoformat(),
            startTime=start,
            endTime=end,
            label=label,
            capacity=capacity,
            availableSeats=availability,
            price=float(slot["base_price"]) if slot.get("base_price") is not None else None,
            status=str(slot.get("status") or "active").lower(),
            ticketTypes=ticket_types,
        )

    @staticmethod
    def _parse_date(value: Any) -> date:
        if isinstance(value, date):
            return value
        return date.fromisoformat(str(value)[:10])

    @staticmethod
    def _parse_time(value: Any) -> time:
        if isinstance(value, time):
            return value
        return time.fromisoformat(str(value)[:8])

    @staticmethod
    def _parse_datetime(value: Any) -> datetime | None:
        if value in (None, ""):
            return None
        if isinstance(value, datetime):
            parsed = value
        else:
            parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)

    @staticmethod
    def _reservation_expires_at(order: dict[str, Any]) -> datetime | None:
        explicit_expiry = PublicCatalogService._parse_datetime(order.get("reservation_expires_at"))
        if explicit_expiry:
            return explicit_expiry
        created_at = PublicCatalogService._parse_datetime(order.get("created_at"))
        if created_at:
            return created_at + timedelta(minutes=5)
        return None

    @staticmethod
    def _format_time(value: Any) -> str | None:
        if value is None:
            return None
        parsed = PublicCatalogService._parse_time(value)
        return parsed.strftime("%H:%M")


public_catalog_service = PublicCatalogService()
