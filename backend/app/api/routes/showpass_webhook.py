import hashlib
import hmac
import json
from datetime import date, datetime, time

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


def _verify_signature(body: bytes, header: str) -> None:
    """HMAC-SHA256 verification. Skip if no secret configured (dev mode)."""
    if not settings.showpass_webhook_secret:
        return
    expected = hmac.new(
        settings.showpass_webhook_secret.encode(),
        body,
        hashlib.sha256,
    ).hexdigest()
    # Strip common prefix in case Showpass sends "sha256=<hex>"
    normalized = header.removeprefix("sha256=")
    if not hmac.compare_digest(expected, normalized):
        import logging
        logging.getLogger(__name__).warning(
            "Showpass signature mismatch. received=%r expected=%r", header, expected
        )
        raise HTTPException(status_code=400, detail="Invalid signature")


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
    _verify_signature(body, sig)

    payload = json.loads(body)
    event_type = str(payload.get("event") or "").lower()

    if event_type in IGNORE_EVENTS:
        return {"status": "ignored"}

    if event_type not in PURCHASE_EVENTS | CANCEL_EVENTS:
        return {"status": "unknown_event"}

    order_id = str(payload.get("order_id") or "")
    showpass_event_id = str(payload.get("event_id") or "")
    quantity = int(payload.get("quantity") or 1)

    # Parse date/time from "start_datetime" (ISO 8601) or separate fields
    raw_dt = payload.get("start_datetime") or ""
    try:
        dt = datetime.fromisoformat(str(raw_dt).replace("Z", "+00:00"))
        evt_date = dt.date()
        evt_time = dt.time().replace(tzinfo=None, second=0, microsecond=0)
    except (ValueError, AttributeError):
        evt_date = None
        evt_time = None

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
