from fastapi import APIRouter, Depends, Query, Request

from app.schemas.admin import TicketCheckInRequest
from app.services.admin_data import admin_data_service
from app.services.admin_security import require_admin

router = APIRouter(prefix="/scanner", tags=["scanner"], dependencies=[Depends(require_admin)])


@router.post("/check-in")
async def check_in_ticket(
    payload: TicketCheckInRequest,
    request: Request,
    actor: dict = Depends(require_admin),
) -> dict:
    return await admin_data_service.check_in_ticket(payload, actor, _client_ip(request))


@router.get("/recent")
async def recent_scans(minutes: int = Query(20, ge=1, le=240)) -> list[dict]:
    return await admin_data_service.recent_scans(minutes)


def _client_ip(request: Request) -> str | None:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",", 1)[0].strip()
    return request.client.host if request.client else None
