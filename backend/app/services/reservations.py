from __future__ import annotations

import secrets
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Any

from fastapi import HTTPException

from app.core.config import settings
from app.schemas.checkout import CheckoutOrder
from app.services.admin.repository import admin_repository
from app.utils.datetime import utc_now, utc_now_iso_seconds

RESERVATION_MINUTES = 5
PAYMENT_GRACE_SECONDS = 30


async def create_reservation(checkout: CheckoutOrder, amount_cents: int) -> dict[str, Any]:
    await expire_stale_reservations()
    await _validate_capacity(checkout)

    now_dt = datetime.now(timezone.utc)
    expires_dt = now_dt + timedelta(minutes=RESERVATION_MINUTES)
    now = now_dt.isoformat()
    expires_at = expires_dt.isoformat()
    order_id = str(uuid.uuid4())
    ticket_amount = _money(sum(item.unit_price * item.quantity for item in checkout.items))
    total_amount = _money(checkout.total_amount if checkout.total_amount is not None else Decimal(amount_cents) / 100)
    expected_cents = int((total_amount * 100).to_integral_value(rounding=ROUND_HALF_UP))
    if expected_cents != amount_cents:
        raise HTTPException(status_code=400, detail="Checkout total does not match payment amount.")

    ticket_quantity = sum(item.quantity for item in checkout.items)
    ticket_details = [
        {
            "event_id": item.event_id,
            "slot_id": item.slot_id,
            "ticket_type_id": item.ticket_type_id,
            "event_name": item.event_name,
            "slot_date": item.slot_date,
            "slot_time": item.slot_time,
            "ticket_type": item.ticket_type,
            "quantity": item.quantity,
            "unit_price": float(_money(item.unit_price)),
            "line_total": float(_money(item.unit_price * item.quantity)),
        }
        for item in checkout.items
    ]

    columns = await admin_repository.columns(settings.admin_orders_table)
    order_row = {
        "id": order_id,
        "order_number": _order_number(),
        "slot_id": checkout.items[0].slot_id if len(checkout.items) == 1 else None,
        "customer_id": None,
        "guest_name": checkout.customer.name,
        "guest_email": checkout.customer.email,
        "guest_phone": checkout.customer.phone,
        "sales_channel": "online",
        "order_status": "Pending",
        "payment_status": "Pending",
        "fulfillment_status": "Unfulfilled",
        "payment_method": None,
        "payment_provider": "reservation",
        "provider_reference": None,
        "ticket_quantity": ticket_quantity,
        "ticket_details": ticket_details,
        "ticket_amount": ticket_amount,
        "addon_amount": Decimal("0"),
        "platform_fee": _money(checkout.platform_fee),
        "payment_fee": _money(checkout.payment_fee),
        "gst": _money(checkout.gst),
        "pst": _money(checkout.pst),
        "coupon_discount": _money(checkout.coupon_discount),
        "admin_adjustment": Decimal("0"),
        "total_amount": total_amount,
        "coupon_code": checkout.coupon_code,
        "coupon_details": {},
        "remarks": checkout.customer.remarks,
        "created_by": None,
        "created_at": now,
        "updated_at": now,
        "email_status": "not_sent",
        "ip": checkout.ip,
    }
    if "reserved_at" in columns:
        order_row["reserved_at"] = now
    if "reservation_expires_at" in columns:
        order_row["reservation_expires_at"] = expires_at

    inserted_orders = await admin_repository.insert(settings.admin_orders_table, order_row)
    order_items = [
        {
            "order_id": order_id,
            "event_id": item.event_id,
            "slot_id": item.slot_id,
            "ticket_type_id": item.ticket_type_id,
            "event_name": item.event_name,
            "slot_date": item.slot_date,
            "slot_time": item.slot_time,
            "ticket_type": item.ticket_type,
            "quantity": item.quantity,
            "unit_price": _money(item.unit_price),
            "subtotal_amount": _money(item.unit_price * item.quantity),
            "created_at": now,
            "updated_at": now,
        }
        for item in checkout.items
    ]
    await admin_repository.insert("order_items", order_items)
    inserted = inserted_orders[0] if inserted_orders else order_row
    return _reservation_response(inserted)


async def get_active_reservation(
    order_id: str,
    amount_cents: int | None = None,
    *,
    grace_seconds: int = 0,
) -> dict[str, Any]:
    await expire_stale_reservations(grace_seconds=grace_seconds)
    rows = await admin_repository.select_where(settings.admin_orders_table, column="id", value=uuid.UUID(str(order_id)))
    if not rows:
        raise HTTPException(status_code=404, detail="Reservation not found.")
    order = rows[0]
    if not _is_active_pending_reservation(order, grace_seconds=grace_seconds):
        raise HTTPException(status_code=409, detail="Reservation expired or is no longer pending.")
    if amount_cents is not None:
        total_amount = _money(order.get("total_amount") or 0)
        expected_cents = int((total_amount * 100).to_integral_value(rounding=ROUND_HALF_UP))
        if expected_cents != amount_cents:
            raise HTTPException(status_code=400, detail="Payment amount does not match reservation total.")
    return order


async def attach_payment(
    order_id: str,
    *,
    provider: str,
    method: str,
    provider_reference: str,
    payment_intent_id: str | None = None,
) -> dict[str, Any]:
    columns = await admin_repository.columns(settings.admin_orders_table)
    values = {
        "payment_provider": provider,
        "payment_method": method,
        "provider_reference": provider_reference,
        "updated_at": utc_now_iso_seconds(),
    }
    if payment_intent_id and "payment_intent_id" in columns:
        values["payment_intent_id"] = payment_intent_id
    rows = await admin_repository.update(
        settings.admin_orders_table,
        match_column="id",
        match_value=uuid.UUID(str(order_id)),
        values=values,
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Reservation not found.")
    return _reservation_response(rows[0])


async def expire_reservation(order_id: str) -> dict[str, Any]:
    rows = await admin_repository.select_where(settings.admin_orders_table, column="id", value=uuid.UUID(str(order_id)))
    if not rows:
        raise HTTPException(status_code=404, detail="Reservation not found.")
    order = rows[0]
    if str(order.get("payment_status") or "").lower() != "pending":
        return _reservation_response(order)
    updated = await admin_repository.update(
        settings.admin_orders_table,
        match_column="id",
        match_value=uuid.UUID(str(order_id)),
        values={
            "order_status": "Expired Unpaid",
            "payment_status": "Expired",
            "fulfillment_status": "Unfulfilled",
            "updated_at": utc_now_iso_seconds(),
        },
    )
    return _reservation_response(updated[0] if updated else order)


async def mark_paid_by_provider_reference(provider: str, provider_reference: str) -> dict[str, Any] | None:
    if not provider_reference:
        return None
    for order in await admin_repository.select(settings.admin_orders_table):
        if str(order.get("payment_provider") or "") != provider:
            continue
        if str(order.get("provider_reference") or "") != str(provider_reference):
            continue
        updated = await admin_repository.update(
            settings.admin_orders_table,
            match_column="id",
            match_value=order["id"],
            values={
                "order_status": "Paid",
                "payment_status": "Paid",
                "fulfillment_status": "Pending",
                "updated_at": utc_now_iso_seconds(),
            },
        )
        return _reservation_response(updated[0] if updated else order)
    return None


async def expire_stale_reservations(*, grace_seconds: int = 0) -> None:
    now = datetime.now(timezone.utc)
    for order in await admin_repository.select(settings.admin_orders_table):
        if str(order.get("payment_status") or "").lower() != "pending":
            continue
        expires_at = _reservation_expires_at(order)
        if not expires_at or expires_at + timedelta(seconds=grace_seconds) > now:
            continue
        await admin_repository.update(
            settings.admin_orders_table,
            match_column="id",
            match_value=order["id"],
            values={
                "order_status": "Expired Unpaid",
                "payment_status": "Expired",
                "fulfillment_status": "Unfulfilled",
                "updated_at": utc_now_iso_seconds(),
            },
        )


def _is_active_pending_reservation(order: dict[str, Any], *, grace_seconds: int = 0) -> bool:
    if str(order.get("payment_status") or "").lower() != "pending":
        return False
    expires_at = _reservation_expires_at(order)
    return expires_at is None or expires_at + timedelta(seconds=grace_seconds) > datetime.now(timezone.utc)


async def _validate_capacity(checkout: CheckoutOrder) -> None:
    from app.services.public_catalog import public_catalog_service

    for item in checkout.items:
        slots = await public_catalog_service.available_slots(str(item.event_id), item.slot_date)
        slot = next((row for row in slots if row.id == item.slot_id), None)
        if slot is None:
            raise HTTPException(status_code=409, detail="Selected time is no longer available.")
        if item.quantity > slot.available_seats:
            raise HTTPException(status_code=409, detail=f"Only {slot.available_seats} tickets are left for {item.slot_time}.")


def _reservation_response(order: dict[str, Any]) -> dict[str, Any]:
    expires_at = _reservation_expires_at(order)
    expires_in = RESERVATION_MINUTES * 60
    if expires_at:
        expires_in = max(0, int((expires_at - datetime.now(timezone.utc)).total_seconds()))
    return {
        "id": str(order["id"]),
        "orderNumber": order.get("order_number"),
        "paymentStatus": order.get("payment_status"),
        "providerReference": order.get("provider_reference"),
        "expiresAt": expires_at.isoformat() if hasattr(expires_at, "isoformat") else expires_at,
        "expiresInSeconds": expires_in,
    }


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


def _reservation_expires_at(order: dict[str, Any]) -> datetime | None:
    explicit_expiry = _parse_datetime(order.get("reservation_expires_at"))
    if explicit_expiry:
        return explicit_expiry
    created_at = _parse_datetime(order.get("created_at"))
    if created_at:
        return created_at + timedelta(minutes=RESERVATION_MINUTES)
    return None


def _money(value: Decimal | int | float | str) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _order_number() -> str:
    return f"TK{utc_now():%Y%m%d%H%M%S}{secrets.randbelow(9000) + 1000}"
