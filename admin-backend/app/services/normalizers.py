from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import Any


def pick(row: dict[str, Any], *keys: str, default: Any = None) -> Any:
    for key in keys:
        if key in row and row[key] not in (None, ""):
            return row[key]
    return default


def as_float(value: Any, default: float = 0.0) -> float:
    if value in (None, ""):
        return default
    try:
        return float(Decimal(str(value)))
    except (InvalidOperation, ValueError):
        return default


def as_int(value: Any, default: int = 0) -> int:
    if value in (None, ""):
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def to_date_string(value: Any) -> str | None:
    if value in (None, ""):
        return None
    if isinstance(value, date):
        return value.isoformat()
    return str(value)[:10]


def to_datetime_string(value: Any) -> str | None:
    if value in (None, ""):
        return None
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d %H:%M:%S")
    text = str(value).replace("T", " ")
    return text[:19]


def split_slot_time(value: Any) -> tuple[str | None, str | None]:
    if value in (None, ""):
        return None, None
    text = str(value).strip()
    if "-" not in text:
        return text[:5], None
    start, end = [part.strip() for part in text.split("-", 1)]
    return start[:5], end[:5]


def normalize_order_status(value: Any) -> str:
    text = str(value or "pending").strip().lower().replace(" ", "_").replace("-", "_")
    aliases = {
        "completed": "completed",
        "paid": "paid",
        "pending": "pending",
        "payment_pending": "pending",
        "cancelled": "cancelled",
        "canceled": "cancelled",
        "refunded": "refunded",
        "expired": "expired_unpaid",
        "expired_unpaid": "expired_unpaid",
        "user_cancelled": "user_cancelled",
        "user_canceled": "user_cancelled",
    }
    return aliases.get(text, text)


def db_order_status(value: str) -> str:
    aliases = {
        "completed": "Completed",
        "paid": "Paid",
        "pending": "Pending",
        "cancelled": "Cancelled",
        "refunded": "Refunded",
        "expired_unpaid": "Expired Unpaid",
        "user_cancelled": "User Cancelled",
    }
    return aliases.get(value, value)


def normalize_ticket_status(value: Any) -> str:
    text = str(value or "not_used").strip().lower().replace(" ", "_").replace("-", "_")
    aliases = {
        "unused": "not_used",
        "notused": "not_used",
        "not_used": "not_used",
        "used": "used",
        "void": "voided",
        "voided": "voided",
        "cancelled": "voided",
        "canceled": "voided",
    }
    return aliases.get(text, text)


def db_ticket_status(value: str) -> str:
    aliases = {
        "not_used": "Unused",
        "used": "Used",
        "voided": "Voided",
    }
    return aliases.get(value, value)


def normalize_order(row: dict[str, Any], ticket_counts: dict[str, dict[str, int]] | None = None) -> dict[str, Any]:
    order_id = str(pick(row, "order_id", "order_number", "id"))
    slot_time = pick(row, "slot_time", "slot_time_label")
    start_time, end_time = split_slot_time(slot_time)
    start_time = pick(row, "slot_start_time", "start_time", default=start_time)
    end_time = pick(row, "slot_end_time", "end_time", default=end_time)
    counts = (ticket_counts or {}).get(order_id, {})
    total = as_int(pick(row, "ticket_total", "ticket_count", "total_tickets"), counts.get("total", 0))
    used = as_int(pick(row, "completed_tickets", "used_tickets"), counts.get("used", 0))
    not_used = as_int(pick(row, "not_used_tickets", "unused_tickets"), max(total - used, 0))
    coupon_discount = as_float(pick(row, "coupon_discount", "discount_amount"))

    return {
        "id": order_id,
        "user": {
            "name": pick(row, "customer_name", "user_name", "name", default="Walk-in customer"),
            "email": pick(row, "email", "customer_email"),
            "phone": pick(row, "phone", "customer_phone"),
        },
        "emailStatus": normalize_email_status(pick(row, "email_status")),
        "slot": {
            "date": to_date_string(pick(row, "slot_date", "date")),
            "startTime": str(start_time)[:5] if start_time else None,
            "endTime": str(end_time)[:5] if end_time else None,
        },
        "ticketDetails": pick(row, "ticket_details"),
        "ticketCount": {
            "total": total,
            "completed": used,
            "notUsed": not_used,
        },
        "amount": as_float(pick(row, "total_amount", "amount")),
        "couponCode": pick(row, "coupon_code"),
        "couponDiscount": -abs(coupon_discount) if coupon_discount else 0,
        "remarks": pick(row, "remarks", "memo"),
        "status": normalize_order_status(pick(row, "status", "order_status")),
        "paymentMethod": pick(row, "payment_method"),
        "createdAt": to_datetime_string(pick(row, "created_at", "created")),
        "createdBy": pick(row, "created_by", "admin_name", default="Admin"),
        "ip": pick(row, "ip", "created_ip", "ip_address"),
    }


def normalize_ticket(row: dict[str, Any]) -> dict[str, Any]:
    order_id = str(pick(row, "order_id", "order_number"))
    slot_time = pick(row, "slot_time")
    start_time, end_time = split_slot_time(slot_time)
    start_time = pick(row, "slot_start_time", "start_time", default=start_time)
    end_time = pick(row, "slot_end_time", "end_time", default=end_time)
    status = normalize_ticket_status(pick(row, "ticket_status", "status"))

    return {
        "id": pick(row, "ticket_id", "id"),
        "code": pick(row, "verification_code", "code", "qr_code", default=str(pick(row, "ticket_id", "id"))),
        "qrCode": pick(row, "qr_code", "qr_payload", "verification_code", "code"),
        "orderId": order_id,
        "orderUser": pick(row, "customer_name", "order_user", "user_name"),
        "orderEmail": pick(row, "email", "order_email"),
        "orderPayment": pick(row, "payment_method", "order_payment"),
        "remarks": pick(row, "memo", "remarks"),
        "ticketType": pick(row, "ticket_type", "ticket_type_name", default="Regular"),
        "slotDate": to_date_string(pick(row, "slot_date", "date")),
        "slotStart": str(start_time)[:5] if start_time else None,
        "slotEnd": str(end_time)[:5] if end_time else None,
        "status": status,
        "verifiedAt": to_datetime_string(pick(row, "check_in_at", "verified_at", "checked_in_at")),
        "createdAt": to_datetime_string(pick(row, "created_at", "order_created_at")),
    }


def normalize_slot(row: dict[str, Any]) -> dict[str, Any]:
    slot_time = pick(row, "slot_time")
    start_time, end_time = split_slot_time(slot_time)
    start_time = pick(row, "start_time", "slot_start_time", default=start_time)
    end_time = pick(row, "end_time", "slot_end_time", default=end_time)
    return {
        "id": pick(row, "id", "slot_id"),
        "event": pick(row, "event", "event_id", default=1),
        "date": to_date_string(pick(row, "date", "slot_date")),
        "startTime": str(start_time)[:5] if start_time else None,
        "endTime": str(end_time)[:5] if end_time else None,
        "price": as_float(pick(row, "price", "base_price"), 37.95),
        "totalSeats": as_int(pick(row, "total_seats", "capacity"), 20),
        "websiteSeats": as_int(pick(row, "website_seats", "online_sold"), 0),
        "inStoreSeats": as_int(pick(row, "instore_seats", "in_store_seats", "walkin_sold"), 0),
        "status": str(pick(row, "status", default="active")).lower(),
    }


def normalize_ticket_type(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": pick(row, "id", "ticket_type_id"),
        "name": pick(row, "name", "ticket_type", default="Regular"),
        "event": pick(row, "event", "event_id", default=1),
        "priceType": pick(row, "price_type", default="fixed" if pick(row, "price") else "daily"),
        "price": none_or_float(pick(row, "price", "base_price")),
        "priceAdj": as_float(pick(row, "price_adj", "price_adjustment"), 0),
        "weekdays": pick(row, "weekdays", default=["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]),
        "validFrom": to_date_string(pick(row, "valid_from")),
        "validTo": to_date_string(pick(row, "valid_to")),
        "timeStart": pick(row, "time_start"),
        "timeEnd": pick(row, "time_end"),
        "addOn": pick(row, "add_on", "addon"),
        "remarks": pick(row, "remarks"),
        "status": normalize_enabled_status(pick(row, "status", "active")),
    }


def normalize_email_status(value: Any) -> str:
    text = str(value or "").strip().lower()
    if text in {"sent", "delivered", "true", "1"}:
        return "sent"
    return "not_sent"


def normalize_enabled_status(value: Any) -> str:
    if isinstance(value, bool):
        return "enabled" if value else "disabled"
    text = str(value or "enabled").strip().lower()
    if text in {"active", "enabled", "true", "1"}:
        return "enabled"
    return "disabled"


def none_or_float(value: Any) -> float | None:
    if value in (None, ""):
        return None
    return as_float(value)

