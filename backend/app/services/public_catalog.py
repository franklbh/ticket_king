from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, time, timedelta
from typing import Any

from fastapi import HTTPException, status

from app.core.config import settings
from app.schemas.public import AvailableSlotRead
from app.services.admin.repository import admin_repository

ACTIVE_ORDER_STATUSES = {"pending", "paid", "completed"}
ACTIVE_PAYMENT_STATUSES = {"pending", "paid", "processing", "authorized"}


class PublicCatalogService:
    async def available_slots(self, event_id_or_slug: str, slot_date: str) -> list[AvailableSlotRead]:
        target_date = self._parse_date(slot_date)
        event = await self._event(event_id_or_slug)
        slots = [
            row for row in await admin_repository.select(settings.admin_slots_table)
            if self._slot_matches(row, event["id"], target_date)
        ]
        if not slots:
            return []

        requirements = await self._requirements_by_event()
        resources = await self._resources_by_id()
        order_items = await admin_repository.select("order_items")
        orders = {str(row.get("id")): row for row in await admin_repository.select(settings.admin_orders_table)}
        events = {str(row.get("id")): row for row in await admin_repository.select(settings.admin_events_table)}
        all_slots = {str(row.get("id")): row for row in await admin_repository.select(settings.admin_slots_table)}

        booked_items = [
            item for item in order_items
            if self._active_order(orders.get(str(item.get("order_id"))))
        ]

        available: list[AvailableSlotRead] = []
        for slot in slots:
            event_requirements = requirements.get(str(event["id"]), [])
            availability = self._slot_availability(
                slot=slot,
                event=event,
                requirements=event_requirements,
                requirements_by_event=requirements,
                resources=resources,
                booked_items=booked_items,
                events=events,
                slots=all_slots,
            )
            if availability <= 0:
                continue
            capacity = self._effective_capacity(slot, event_requirements, resources)
            available.append(self._slot_response(slot, event["id"], availability, capacity))

        available.sort(key=lambda item: (item.date, item.start_time))
        return available

    async def _event(self, event_id_or_slug: str) -> dict[str, Any]:
        events = await admin_repository.select(settings.admin_events_table)
        needle = str(event_id_or_slug)
        for event in events:
            if str(event.get("id")) == needle or str(event.get("slug")) == needle:
                if str(event.get("status") or "").lower() != "active":
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event is not active.")
                return event
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    async def _requirements_by_event(self) -> dict[str, list[dict[str, Any]]]:
        rows = await admin_repository.select("event_resource_requirements")
        grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for row in rows:
            grouped[str(row.get("event_id"))].append(row)
        return dict(grouped)

    async def _resources_by_id(self) -> dict[str, dict[str, Any]]:
        return {
            str(row.get("id")): row
            for row in await admin_repository.select("resources")
            if row.get("id") is not None and str(row.get("status") or "").lower() == "active"
        }

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
        event_id: Any,
        availability: int,
        capacity: int,
    ) -> AvailableSlotRead:
        start = PublicCatalogService._format_time(slot.get("start_time"))
        end = PublicCatalogService._format_time(slot.get("end_time"))
        fallback_label = f"{start}-{end}" if end else str(start)
        label = str(slot.get("slot_time_label") or fallback_label)
        return AvailableSlotRead(
            id=str(slot["id"]),
            eventId=int(event_id),
            date=PublicCatalogService._parse_date(slot.get("business_date")).isoformat(),
            startTime=start,
            endTime=end,
            label=label,
            capacity=capacity,
            availableSeats=availability,
            price=float(slot["base_price"]) if slot.get("base_price") is not None else None,
            status=str(slot.get("status") or "active").lower(),
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
    def _format_time(value: Any) -> str | None:
        if value is None:
            return None
        parsed = PublicCatalogService._parse_time(value)
        return parsed.strftime("%H:%M")


public_catalog_service = PublicCatalogService()
