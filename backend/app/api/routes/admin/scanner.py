from fastapi import APIRouter, Depends, Query, Request

from app.api.deps import client_ip
from app.schemas.admin import TicketCheckInRequest
from app.schemas.admin.responses import CheckInResponse, TicketRead
from app.services.admin.security import require_admin
from app.services.admin.ticket_service import ticket_service

router = APIRouter(prefix="/scanner", tags=["scanner"], dependencies=[Depends(require_admin)])


@router.post("/check-in", response_model=CheckInResponse)
async def check_in_ticket(
    payload: TicketCheckInRequest,
    request: Request,
    actor: dict = Depends(require_admin),
) -> CheckInResponse:
    return await ticket_service.check_in_ticket(payload, actor, client_ip(request))


@router.get("/recent", response_model=list[TicketRead])
async def recent_scans(minutes: int = Query(20, ge=1, le=240)) -> list[TicketRead]:
    return await ticket_service.recent_scans(minutes)
