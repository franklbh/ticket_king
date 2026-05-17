from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import Response

from app.api.deps import client_ip
from app.schemas.admin import OrderCustomerUpdate, OrderSlotUpdate, OrderStatusUpdate, WalkInOrderCreate
from app.schemas.admin.responses import OrderPage, OrderRead, WalkInOrderResponse
from app.services.admin.order_service import order_service
from app.services.admin.security import require_permission

router = APIRouter(prefix="/orders", tags=["orders"])


def _order_filters(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200, alias="pageSize"),
    order_id: str | None = Query(None, alias="orderId"),
    user_info: str | None = Query(None, alias="userInfo"),
    order_date_from: str | None = Query(None, alias="orderDateFrom"),
    order_date_to: str | None = Query(None, alias="orderDateTo"),
    slot_date_from: str | None = Query(None, alias="slotDateFrom"),
    slot_date_to: str | None = Query(None, alias="slotDateTo"),
    slot_start: str | None = Query(None, alias="slotStart"),
    status: str | None = None,
    coupon_code: str | None = Query(None, alias="couponCode"),
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
        "slot_start": slot_start,
        "status": status,
        "coupon_code": coupon_code,
    }


@router.get("", response_model=OrderPage)
async def list_orders(
    filters: dict = Depends(_order_filters),
    _: dict = Depends(require_permission("orders:read")),
) -> OrderPage:
    return await order_service.list_orders(filters)


@router.get("/export")
async def export_orders(
    request: Request,
    filters: dict = Depends(_order_filters),
    actor: dict = Depends(require_permission("orders:export")),
) -> Response:
    csv_body = await order_service.export_orders_csv(filters, actor, client_ip(request))
    return Response(
        content="\ufeff" + csv_body,
        media_type="text/csv; charset=utf-8",
        headers={"content-disposition": "attachment; filename=orders_export.csv"},
    )


@router.post("/walk-in", status_code=201, response_model=WalkInOrderResponse)
async def create_walk_in_order(
    payload: WalkInOrderCreate,
    request: Request,
    actor: dict = Depends(require_permission("orders:write")),
) -> WalkInOrderResponse:
    return await order_service.create_walk_in_order(payload, actor, client_ip(request))


@router.get("/{order_id}", response_model=OrderRead)
async def get_order(
    order_id: str,
    _: dict = Depends(require_permission("orders:read")),
) -> OrderRead:
    return await order_service.get_order(order_id)


@router.patch("/{order_id}/status", response_model=OrderRead)
async def update_order_status(
    order_id: str,
    payload: OrderStatusUpdate,
    request: Request,
    actor: dict = Depends(require_permission("orders:write")),
) -> OrderRead:
    return await order_service.update_order_status(order_id, payload, actor, client_ip(request))


@router.patch("/{order_id}/customer", response_model=OrderRead)
async def update_order_customer(
    order_id: str,
    payload: OrderCustomerUpdate,
    request: Request,
    actor: dict = Depends(require_permission("orders:write")),
) -> OrderRead:
    return await order_service.update_order_customer(order_id, payload, actor, client_ip(request))


@router.patch("/{order_id}/slot", response_model=OrderRead)
async def update_order_slot(
    order_id: str,
    payload: OrderSlotUpdate,
    request: Request,
    actor: dict = Depends(require_permission("orders:write")),
) -> OrderRead:
    return await order_service.update_order_slot(order_id, payload, actor, client_ip(request))
