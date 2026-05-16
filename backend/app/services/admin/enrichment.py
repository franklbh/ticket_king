from __future__ import annotations

from collections import defaultdict
from typing import Any

from app.core.config import settings
from app.services.admin.normalizers import normalize_ticket
from app.services.admin.repository import admin_repository


def index_by_id(rows: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    return {str(row.get("id")): row for row in rows if row.get("id") is not None}


async def orders_by_id() -> dict[str, dict[str, Any]]:
    rows = await admin_repository.select(settings.admin_orders_table)
    return index_by_id(rows)


async def slots_by_id() -> dict[str, dict[str, Any]]:
    rows = await admin_repository.select(settings.admin_slots_table)
    return index_by_id(rows)


async def users_by_id() -> dict[str, dict[str, Any]]:
    rows = await admin_repository.select(settings.admin_users_table)
    return index_by_id(rows)


def merge_ticket_order(ticket: dict[str, Any], order: dict[str, Any] | None) -> dict[str, Any]:
    if not order:
        return ticket
    return {
        **order,
        **ticket,
        "payment_method": order.get("payment_method"),
        "remarks": ticket.get("memo") or order.get("remarks"),
        "order_created_at": order.get("created_at"),
    }


async def load_enriched_tickets() -> list[dict[str, Any]]:
    rows = await admin_repository.select(settings.admin_tickets_table)
    orders = await orders_by_id()
    slots = await slots_by_id()
    users = await users_by_id()
    tickets: list[dict[str, Any]] = []
    for row in rows:
        order = orders.get(str(row.get("order_id")))
        slot = slots.get(str((order or {}).get("slot_id") or ""))
        customer = users.get(str((order or {}).get("customer_id") or ""))
        merged = merge_ticket_order(row, order)
        tickets.append(normalize_ticket(merged, slot=slot, customer=customer))
    return tickets


def ticket_counts(tickets: list[dict[str, Any]]) -> dict[str, dict[str, int]]:
    counts: dict[str, dict[str, int]] = defaultdict(lambda: {"total": 0, "used": 0})
    for ticket in tickets:
        order_id = str(ticket.get("orderId") or "")
        if not order_id:
            continue
        counts[order_id]["total"] += 1
        if ticket.get("status") == "used":
            counts[order_id]["used"] += 1
    return dict(counts)


async def slot_inventory_counts() -> dict[str, dict[str, int]]:
    tickets = await admin_repository.select(settings.admin_tickets_table)
    orders = await orders_by_id()
    counts: dict[str, dict[str, int]] = defaultdict(lambda: {"online_sold": 0, "walkin_sold": 0})
    for ticket in tickets:
        order = orders.get(str(ticket.get("order_id")))
        key = slot_key(order or ticket)
        if not key:
            continue
        channel = str((order or {}).get("sales_channel") or "").lower()
        if channel in {"walk_in", "walk-in", "instore", "in_store"}:
            counts[key]["walkin_sold"] += 1
        else:
            counts[key]["online_sold"] += 1
    return dict(counts)


def slot_key(row: dict[str, Any]) -> str:
    slot_id = row.get("slot_id") or row.get("id")
    if slot_id:
        return str(slot_id)
    slot_date = row.get("slot_date") or row.get("business_date") or row.get("date")
    slot_time = row.get("slot_time") or row.get("slot_time_label")
    return f"{slot_date}|{slot_time}" if slot_date and slot_time else ""


def slot_counts_for_row(row: dict[str, Any], counts: dict[str, dict[str, int]]) -> dict[str, int]:
    direct = counts.get(str(row.get("id") or row.get("slot_id") or ""))
    if direct:
        return direct
    slot_date = row.get("slot_date") or row.get("business_date") or row.get("date")
    slot_time = row.get("slot_time") or row.get("slot_time_label")
    return counts.get(f"{slot_date}|{slot_time}", {})
