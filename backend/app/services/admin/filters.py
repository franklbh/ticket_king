from __future__ import annotations

from typing import Any

from app.services.admin.normalizers import normalize_order_status, normalize_ticket_status


def filter_orders(orders: list[dict[str, Any]], filters: dict[str, Any]) -> list[dict[str, Any]]:
    result = orders
    if filters.get("order_id"):
        needle = str(filters["order_id"]).lower()
        result = [row for row in result if needle in row["id"].lower()]
    if filters.get("user_info"):
        needle = str(filters["user_info"]).lower()
        result = [
            row for row in result
            if needle in " ".join(str(value or "") for value in row["user"].values()).lower()
        ]
    if filters.get("status"):
        statuses = {normalize_order_status(item) for item in str(filters["status"]).split(",")}
        result = [row for row in result if row.get("status") in statuses]
    if filters.get("order_date_from"):
        result = [row for row in result if (row.get("createdAt") or "")[:10] >= filters["order_date_from"]]
    if filters.get("order_date_to"):
        result = [row for row in result if (row.get("createdAt") or "")[:10] <= filters["order_date_to"]]
    if filters.get("slot_date_from"):
        result = [row for row in result if (row["slot"].get("date") or "") >= filters["slot_date_from"]]
    if filters.get("slot_date_to"):
        result = [row for row in result if (row["slot"].get("date") or "") <= filters["slot_date_to"]]
    return result


def filter_tickets(tickets: list[dict[str, Any]], filters: dict[str, Any]) -> list[dict[str, Any]]:
    result = tickets
    if filters.get("code"):
        needle = str(filters["code"]).lower()
        result = [row for row in result if needle in str(row.get("code") or "").lower()]
    if filters.get("order_id"):
        needle = str(filters["order_id"]).lower()
        result = [row for row in result if needle in str(row.get("orderId") or "").lower()]
    if filters.get("status") and filters["status"] != "all":
        status = normalize_ticket_status(filters["status"])
        result = [row for row in result if row.get("status") == status]
    if filters.get("slot_date_from"):
        result = [row for row in result if (row.get("slotDate") or "") >= filters["slot_date_from"]]
    if filters.get("slot_date_to"):
        result = [row for row in result if (row.get("slotDate") or "") <= filters["slot_date_to"]]
    if filters.get("verified_from"):
        result = [row for row in result if (row.get("verifiedAt") or "")[:10] >= filters["verified_from"]]
    if filters.get("verified_to"):
        result = [row for row in result if (row.get("verifiedAt") or "")[:10] <= filters["verified_to"]]
    if filters.get("ticket_type"):
        types = {item.strip() for item in str(filters["ticket_type"]).split(",") if item.strip()}
        result = [row for row in result if row.get("ticketType") in types]
    return result


def filter_activity_logs(logs: list[dict[str, Any]], filters: dict[str, Any]) -> list[dict[str, Any]]:
    result = logs
    if filters.get("admin"):
        needle = str(filters["admin"]).lower()
        result = [row for row in result if needle in str(row.get("admin") or "").lower()]
    if filters.get("action_type"):
        allowed = {item.strip() for item in str(filters["action_type"]).split(",") if item.strip()}
        result = [row for row in result if row.get("actionType") in allowed]
    if filters.get("target_type"):
        allowed = {item.strip() for item in str(filters["target_type"]).split(",") if item.strip()}
        result = [row for row in result if row.get("targetType") in allowed]
    if filters.get("target_id"):
        needle = str(filters["target_id"]).lower()
        result = [row for row in result if needle in str(row.get("targetId") or "").lower()]
    if filters.get("date_from"):
        result = [row for row in result if (row.get("timestamp") or "")[:10] >= filters["date_from"]]
    if filters.get("date_to"):
        result = [row for row in result if (row.get("timestamp") or "")[:10] <= filters["date_to"]]
    return result
