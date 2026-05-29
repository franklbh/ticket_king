import asyncio

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import text

from app.core.database import SessionLocal

router = APIRouter(prefix="/combos", tags=["combos"])


class ComboCheckRequest(BaseModel):
    eventIds: list[int]
    subtotal: float


class ComboCheckResponse(BaseModel):
    eligible: bool
    coupon_code: str | None
    eligible_event_ids: list[int] = Field(default_factory=list)


def _check_sync(event_ids: list[int]) -> dict[str, object] | None:
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
            text("SELECT id, slug FROM events WHERE id = ANY(:ids)"),
            {"ids": event_ids},
        ).mappings().all()
        event_slugs = {int(r["id"]): r["slug"] for r in slug_rows}
        slugs = set(event_slugs.values())

        show_slugs = set(row["show_event_slugs"] or [])
        game_slugs = set(row["game_event_slugs"] or [])

        if slugs & show_slugs and slugs & game_slugs:
            combo_slugs = show_slugs | game_slugs
            return {
                "coupon_code": str(row["coupon_code"]),
                "eligible_event_ids": [event_id for event_id, slug in event_slugs.items() if slug in combo_slugs],
            }
    return None


@router.post("/check", response_model=ComboCheckResponse)
async def check_combo(payload: ComboCheckRequest) -> ComboCheckResponse:
    if not payload.eventIds:
        return ComboCheckResponse(eligible=False, coupon_code=None)
    if SessionLocal is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database not configured.")

    combo = await asyncio.to_thread(_check_sync, payload.eventIds)
    if not combo:
        return ComboCheckResponse(eligible=False, coupon_code=None)
    return ComboCheckResponse(
        eligible=True,
        coupon_code=str(combo["coupon_code"]),
        eligible_event_ids=combo["eligible_event_ids"],
    )
