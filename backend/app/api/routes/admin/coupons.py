from fastapi import APIRouter, Depends, Query

from app.schemas.admin import CouponUpsert
from app.schemas.admin.responses import CouponRead
from app.services.admin.coupons_service import coupons_service
from app.services.admin.security import require_permission

router = APIRouter(prefix="/coupons", tags=["coupons"])


@router.get("", response_model=list[CouponRead])
async def list_coupons(
    status: str | None = Query(None),
    source: str | None = Query(None),
    _: dict = Depends(require_permission("coupons:read")),
) -> list[CouponRead]:
    return await coupons_service.list_coupons(status=status, source=source)


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
