import asyncio

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text

from app.core.database import SessionLocal

router = APIRouter(prefix="/combos", tags=["combos"])


class ComboCheckRequest(BaseModel):
    eventIds: list[int]
    subtotal: float


class ComboCheckResponse(BaseModel):
    eligible: bool
    coupon_code: str | None


def _check_sync(event_ids: list[int]) -> str | None:
    if not SessionLocal:
        return None
    with SessionLocal() as db:
        row = db.execute(
            text(
                "SELECT coupon_code, show_event_slugs, game_event_slugs "
                "FROM combo_promotions WHERE active = TRUE LIMIT 1"
            )
        ).mappings().first()
        if not row:
            return None

        slug_rows = db.execute(
            text("SELECT slug FROM events WHERE id = ANY(:ids)"),
            {"ids": event_ids},
        ).mappings().all()
        slugs = {r["slug"] for r in slug_rows}

        show_slugs = set(row["show_event_slugs"] or [])
        game_slugs = set(row["game_event_slugs"] or [])

        if slugs & show_slugs and slugs & game_slugs:
            return str(row["coupon_code"])
    return None


@router.post("/check", response_model=ComboCheckResponse)
async def check_combo(payload: ComboCheckRequest) -> ComboCheckResponse:
    if not payload.eventIds:
        return ComboCheckResponse(eligible=False, coupon_code=None)
    if SessionLocal is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database not configured.")

    coupon_code = await asyncio.to_thread(_check_sync, payload.eventIds)
    return ComboCheckResponse(eligible=coupon_code is not None, coupon_code=coupon_code)
