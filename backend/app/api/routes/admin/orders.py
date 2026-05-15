from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response

from app.schemas.admin import WalkInOrderCreate
from app.services.admin_data import admin_data_service
from app.services.admin_security import require_admin

router = APIRouter(prefix="/orders", tags=["orders"], dependencies=[Depends(require_admin)])


def _order_filters(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200, alias="pageSize"),
    order_id: str | None = Query(None, alias="orderId"),
    user_info: str | None = Query(None, alias="userInfo"),
    order_date_from: str | None = Query(None, alias="orderDateFrom"),
    order_date_to: str | None = Query(None, alias="orderDateTo"),
    slot_date_from: str | None = Query(None, alias="slotDateFrom"),
    slot_date_to: str | None = Query(None, alias="slotDateTo"),
    status: str | None = None,
) -> dict:
    return {
        "page": page,
        "page_size": page_size,
        "order_id": order_id,
        "user_info": user_info,
        "order_date_from": order_date_from,
        "order_date_to": order_date_to,
        "slot_date_from": slot_date_from,
        "slot_date_to": slot_date_to,
        "status": status,
    }


@router.get("")
async def list_orders(filters: dict = Depends(_order_filters)) -> dict:
    return await admin_data_service.list_orders(filters)


@router.get("/export")
async def export_orders(filters: dict = Depends(_order_filters)) -> Response:
    csv_body = await admin_data_service.export_orders_csv(filters)
    return Response(
        content="\ufeff" + csv_body,
        media_type="text/csv; charset=utf-8",
        headers={"content-disposition": "attachment; filename=orders_export.csv"},
    )


@router.post("/walk-in", status_code=201)
async def create_walk_in_order(payload: WalkInOrderCreate) -> dict:
    return await admin_data_service.create_walk_in_order(payload)
