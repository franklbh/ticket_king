from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text

from app.core.database import SessionLocal
from app.services.admin.security import require_permission

router = APIRouter(tags=["showpass"])


class MappingCreate(BaseModel):
    showpass_event_id: str
    our_event_id: int


@router.get("/showpass/mappings")
async def list_mappings(
    _: dict = Depends(require_permission("catalog:read")),
):
    with SessionLocal() as db:
        rows = db.execute(
            text(
                """
                SELECT m.id, m.showpass_event_id, m.our_event_id,
                       e.name as event_name, m.created_at
                FROM public.showpass_event_mapping m
                JOIN public.events e ON e.id = m.our_event_id
                ORDER BY m.created_at DESC
                """
            )
        ).mappings().all()
    return [dict(r) for r in rows]


@router.post("/showpass/mappings", status_code=201)
async def create_mapping(
    payload: MappingCreate,
    _: dict = Depends(require_permission("catalog:write")),
):
    with SessionLocal() as db:
        # Verify the event exists
        event = db.execute(
            text("SELECT id, name FROM public.events WHERE id = :id"),
            {"id": payload.our_event_id},
        ).mappings().first()
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")

        db.execute(
            text(
                """
                INSERT INTO public.showpass_event_mapping (showpass_event_id, our_event_id)
                VALUES (:showpass_event_id, :our_event_id)
                ON CONFLICT (showpass_event_id) DO UPDATE
                    SET our_event_id = EXCLUDED.our_event_id
                """
            ),
            {
                "showpass_event_id": payload.showpass_event_id,
                "our_event_id": payload.our_event_id,
            },
        )
        db.commit()
    return {"showpass_event_id": payload.showpass_event_id, "our_event_id": payload.our_event_id}


@router.delete("/showpass/mappings/{showpass_event_id}", status_code=204)
async def delete_mapping(
    showpass_event_id: str,
    _: dict = Depends(require_permission("catalog:write")),
):
    with SessionLocal() as db:
        db.execute(
            text("DELETE FROM public.showpass_event_mapping WHERE showpass_event_id = :id"),
            {"id": showpass_event_id},
        )
        db.commit()
