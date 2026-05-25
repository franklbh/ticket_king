import hashlib
import hmac
import json
from datetime import date, datetime, time
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, HTTPException, Request
from sqlalchemy import text

from app.core.config import settings
from app.core.database import SessionLocal

router = APIRouter(prefix="/showpass", tags=["showpass"])

# Events that reduce available seats
PURCHASE_EVENTS = {"purchase"}
# Events that restore available seats
CANCEL_EVENTS = {"refund", "void"}
# Events that change ownership but not seat count — ignore
IGNORE_EVENTS = {"transfer", "transferred"}


def _verify_signature(payload: dict, header: str) -> None:
    """HMAC-SHA1 verification over the Showpass payload id."""
    if not settings.showpass_webhook_secret:
        return

    payload_id = payload.get("id")
    if payload_id is None:
        raise HTTPException(status_code=400, detail="Missing signature payload id")

    received = header.strip().strip('"')
    if received.startswith("sha1="):
        received = received.removeprefix("sha1=")

    expected = hmac.new(
        settings.showpass_webhook_secret.encode("utf-8"),
        str(payload_id).encode("utf-8"),
        hashlib.sha1,
    ).hexdigest()
    if not hmac.compare_digest(expected, received):
        import logging

        logging.getLogger(__name__).warning(
            "Showpass signature mismatch. payload_id=%r received=%r expected=%r",
            payload_id,
            received,
            expected,
        )
        raise HTTPException(status_code=400, detail="Invalid signature")


def _parse_payload(body: bytes) -> dict:
    try:
        payload = json.loads(body)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Invalid JSON payload") from exc

    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Invalid JSON payload")
    return payload


def _normalize_event_type(payload: dict) -> str:
    raw_event = str(payload.get("event_type") or payload.get("event") or "").lower()
    return raw_event.removeprefix("invoice.")


def _nested_data(payload: dict) -> dict:
    data = payload.get("data")
    return data if isinstance(data, dict) else {}


def _first_dict(items) -> dict:
    if isinstance(items, list):
        for item in items:
            if isinstance(item, dict):
                return item
    return {}


def _showpass_line_item(payload: dict) -> dict:
    data = _nested_data(payload)
    return _first_dict(data.get("invoice_items")) or _first_dict(data.get("ticket_items"))


def _event_id(payload: dict) -> str:
    data = _nested_data(payload)
    item = _showpass_line_item(payload)
    return str(payload.get("event_id") or data.get("event_id") or item.get("event_id") or "")


def _order_id(payload: dict) -> str:
    data = _nested_data(payload)
    return str(payload.get("order_id") or data.get("transaction_id") or payload.get("id") or "")


def _quantity(payload: dict, showpass_event_id: str) -> int:
    if payload.get("quantity") is not None:
        return int(payload.get("quantity") or 1)

    data = _nested_data(payload)
    invoice_items = data.get("invoice_items")
    if isinstance(invoice_items, list):
        quantities = [
            int(item.get("quantity") or 0)
            for item in invoice_items
            if isinstance(item, dict) and str(item.get("event_id") or "") == showpass_event_id
        ]
        if quantities:
            return sum(quantities)

    ticket_items = data.get("ticket_items")
    if isinstance(ticket_items, list):
        tickets = [
            item
            for item in ticket_items
            if isinstance(item, dict) and str(item.get("event_id") or "") == showpass_event_id
        ]
        if tickets:
            return len(tickets)

    return 1


def _event_datetime(payload: dict) -> tuple[date | None, time | None]:
    item = _showpass_line_item(payload)
    raw_dt = (
        payload.get("start_datetime")
        or payload.get("event_starts_on")
        or item.get("event_starts_on")
    )
    if not raw_dt:
        return None, None

    try:
        dt = datetime.fromisoformat(str(raw_dt).replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None, None

    if dt.tzinfo is not None:
        try:
            dt = dt.astimezone(ZoneInfo(settings.admin_default_timezone))
        except ZoneInfoNotFoundError:
            dt = dt.replace(tzinfo=None)

    return dt.date(), dt.time().replace(tzinfo=None, second=0, microsecond=0)


def _resolve_slot_id(db, showpass_event_id: str, event_date: date, start_time: time):
    """Find our internal slot_id from Showpass event + date + time."""
    row = db.execute(
        text(
            """
            SELECT s.id
            FROM public.showpass_event_mapping m
            JOIN public.slots s
              ON s.event_id = m.our_event_id
             AND s.business_date = :event_date
             AND s.start_time = :start_time
            WHERE m.showpass_event_id = :showpass_event_id
              AND lower(s.status) = 'active'
            LIMIT 1
            """
        ),
        {
            "showpass_event_id": showpass_event_id,
            "event_date": event_date,
            "start_time": start_time,
        },
    ).mappings().first()
    return str(row["id"]) if row else None


@router.post("/webhook")
async def showpass_webhook(request: Request):
    body = await request.body()
    sig = request.headers.get("X-Showpass-Signature", "")
    payload = _parse_payload(body)
    _verify_signature(payload, sig)

    event_type = _normalize_event_type(payload)

    if event_type in IGNORE_EVENTS:
        return {"status": "ignored"}

    if event_type not in PURCHASE_EVENTS | CANCEL_EVENTS:
        return {"status": "unknown_event"}

    order_id = _order_id(payload)
    showpass_event_id = _event_id(payload)
    quantity = _quantity(payload, showpass_event_id)
    evt_date, evt_time = _event_datetime(payload)

    if not order_id or not showpass_event_id:
        raise HTTPException(status_code=422, detail="Missing order_id or event_id")

    if SessionLocal is None:
        raise HTTPException(status_code=503, detail="Database not configured")

    with SessionLocal() as db:
        slot_id = None
        if evt_date and evt_time:
            slot_id = _resolve_slot_id(db, showpass_event_id, evt_date, evt_time)

        if event_type in PURCHASE_EVENTS:
            db.execute(
                text(
                    """
                    INSERT INTO public.showpass_tickets
                        (showpass_order_id, showpass_event_id, our_slot_id,
                         quantity, status, event_date, event_start_time, raw_payload)
                    VALUES
                        (:order_id, :showpass_event_id, :slot_id,
                         :quantity, 'active', :event_date, :event_start_time, CAST(:raw_payload AS jsonb))
                    ON CONFLICT (showpass_order_id, showpass_event_id)
                    DO UPDATE SET
                        quantity         = EXCLUDED.quantity,
                        status           = 'active',
                        our_slot_id      = COALESCE(EXCLUDED.our_slot_id, showpass_tickets.our_slot_id),
                        updated_at       = NOW()
                    """
                ),
                {
                    "order_id": order_id,
                    "showpass_event_id": showpass_event_id,
                    "slot_id": slot_id,
                    "quantity": quantity,
                    "event_date": evt_date,
                    "event_start_time": evt_time,
                    "raw_payload": body.decode(),
                },
            )
        else:  # refund / void
            new_status = "refunded" if event_type == "refund" else "voided"
            db.execute(
                text(
                    """
                    UPDATE public.showpass_tickets
                    SET status = :new_status, updated_at = NOW()
                    WHERE showpass_order_id = :order_id
                      AND showpass_event_id = :showpass_event_id
                    """
                ),
                {
                    "new_status": new_status,
                    "order_id": order_id,
                    "showpass_event_id": showpass_event_id,
                },
            )
        db.commit()

    return {"status": "ok"}
