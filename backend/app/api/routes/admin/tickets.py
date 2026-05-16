from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import Response

from app.schemas.admin import TicketStatusUpdate
from app.services.admin_data import admin_data_service
from app.services.admin_security import require_admin

router = APIRouter(prefix="/tickets", tags=["tickets"], dependencies=[Depends(require_admin)])


def _ticket_filters(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200, alias="pageSize"),
    code: str | None = None,
    order_id: str | None = Query(None, alias="orderId"),
    status: str | None = None,
    slot_date_from: str | None = Query(None, alias="slotDateFrom"),
    slot_date_to: str | None = Query(None, alias="slotDateTo"),
    verified_from: str | None = Query(None, alias="verifiedFrom"),
    verified_to: str | None = Query(None, alias="verifiedTo"),
    ticket_type: str | None = Query(None, alias="ticketType"),
) -> dict:
    return {
        "page": page,
        "page_size": page_size,
        "code": code,
        "order_id": order_id,
        "status": status,
        "slot_date_from": slot_date_from,
        "slot_date_to": slot_date_to,
        "verified_from": verified_from,
        "verified_to": verified_to,
        "ticket_type": ticket_type,
    }


@router.get("")
async def list_tickets(filters: dict = Depends(_ticket_filters)) -> dict:
    return await admin_data_service.list_tickets(filters)


@router.get("/export")
async def export_tickets(
    request: Request,
    filters: dict = Depends(_ticket_filters),
    actor: dict = Depends(require_admin),
) -> Response:
    csv_body = await admin_data_service.export_tickets_csv(filters, actor, _client_ip(request))
    return Response(
        content="\ufeff" + csv_body,
        media_type="text/csv; charset=utf-8",
        headers={"content-disposition": "attachment; filename=tickets_export.csv"},
    )


@router.patch("/{ticket_id}/status")
async def update_ticket_status(
    ticket_id: str,
    payload: TicketStatusUpdate,
    request: Request,
    actor: dict = Depends(require_admin),
) -> dict:
    return await admin_data_service.update_ticket_status(ticket_id, payload, actor, _client_ip(request))


def _client_ip(request: Request) -> str | None:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",", 1)[0].strip()
    return request.client.host if request.client else None
