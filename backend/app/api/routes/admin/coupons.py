from fastapi import APIRouter, Depends, Query

from app.schemas.admin import CouponValidationRequest, CouponUpsert
from app.schemas.admin.responses import CouponQrResponse, CouponRead, CouponValidationResponse, OrderPage
from app.services.admin.order_service import order_service
from app.services.admin.coupons_service import coupons_service
from app.services.admin.security import require_permission

router = APIRouter(prefix="/coupons", tags=["coupons"])


@router.get("", response_model=list[CouponRead])
async def list_coupons(
    status: str | None = Query(None),
    source: str | None = Query(None),
    search: str | None = Query(None),
    _: dict = Depends(require_permission("coupons:read")),
) -> list[CouponRead]:
    return await coupons_service.list_coupons(status=status, source=source, search=search)


@router.post("/validate", response_model=CouponValidationResponse)
async def validate_coupon(
    payload: CouponValidationRequest,
    _: dict = Depends(require_permission("coupons:read")),
) -> CouponValidationResponse:
    return CouponValidationResponse.model_validate(await coupons_service.validate_coupon(payload))


@router.post("", status_code=201, response_model=CouponRead)
async def create_coupon(
    payload: CouponUpsert,
    actor: dict = Depends(require_permission("coupons:write")),
) -> CouponRead:
    return await coupons_service.create_coupon(payload, actor)


@router.patch("/{coupon_id}", response_model=CouponRead)
async def update_coupon(
    coupon_id: int,
    payload: CouponUpsert,
    actor: dict = Depends(require_permission("coupons:write")),
) -> CouponRead:
    return await coupons_service.update_coupon(coupon_id, payload, actor)


@router.delete("/{coupon_id}", response_model=CouponRead)
async def archive_coupon(
    coupon_id: int,
    actor: dict = Depends(require_permission("coupons:write")),
) -> CouponRead:
    return await coupons_service.archive_coupon(coupon_id, actor)


@router.get("/{coupon_id}/qr", response_model=CouponQrResponse)
async def coupon_qr(
    coupon_id: int,
    _: dict = Depends(require_permission("coupons:read")),
) -> CouponQrResponse:
    return CouponQrResponse.model_validate(await coupons_service.coupon_qr(coupon_id))


@router.get("/{coupon_id}/orders", response_model=OrderPage)
async def coupon_orders(
    coupon_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200, alias="pageSize"),
    _: dict = Depends(require_permission("coupons:read")),
) -> OrderPage:
    coupon = await coupons_service.coupon_qr(coupon_id)
    return await order_service.list_orders({"page": page, "page_size": page_size, "coupon_code": coupon["code"]})
