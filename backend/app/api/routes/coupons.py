from datetime import date
from decimal import Decimal, ROUND_HALF_UP

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.core.config import settings
from app.services.admin.repository import admin_repository


router = APIRouter(prefix="/coupons", tags=["coupons"])


class CouponValidateRequest(BaseModel):
    code: str = Field(min_length=1)
    subtotal: Decimal = Field(ge=0)


class CouponValidateResponse(BaseModel):
    valid: bool
    code: str
    discountType: str
    discountValue: Decimal
    discountAmount: Decimal
    message: str


def _money(value: Decimal | int | float | str) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


@router.post("/validate", response_model=CouponValidateResponse)
async def validate_coupon(payload: CouponValidateRequest) -> CouponValidateResponse:
    code = payload.code.strip()
    subtotal = _money(payload.subtotal)
    if not code:
        raise HTTPException(status_code=400, detail="Coupon code is required.")

    rows = await admin_repository.select_where(
        settings.admin_coupons_table,
        column="code",
        value=code,
        limit=1,
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Invalid coupon code.")

    coupon = rows[0]
    today = date.today()
    status = str(coupon.get("status") or "").lower()
    if status != "active":
        raise HTTPException(status_code=400, detail="Coupon is not active.")

    valid_from = coupon.get("valid_from")
    valid_to = coupon.get("valid_to")
    if valid_from and today < date.fromisoformat(str(valid_from)[:10]):
        raise HTTPException(status_code=400, detail="Coupon is not valid yet.")
    if valid_to and today > date.fromisoformat(str(valid_to)[:10]):
        raise HTTPException(status_code=400, detail="Coupon has expired.")

    min_purchase = _money(coupon.get("min_purchase") or 0)
    if subtotal < min_purchase:
        raise HTTPException(status_code=400, detail=f"Minimum purchase is CA${min_purchase}.")

    max_uses = coupon.get("max_uses")
    used_count = int(coupon.get("used_count") or 0)
    if max_uses is not None and used_count >= int(max_uses):
        raise HTTPException(status_code=400, detail="Coupon usage limit reached.")

    discount_type = str(coupon.get("discount_type") or "").lower()
    discount_value = _money(coupon.get("discount_value") or 0)
    if discount_type == "percent":
        discount_amount = _money(subtotal * discount_value / Decimal("100"))
    elif discount_type in {"fixed", "amount"}:
        discount_amount = discount_value
    else:
        raise HTTPException(status_code=400, detail="Coupon discount type is not supported.")

    discount_amount = min(discount_amount, subtotal)
    return CouponValidateResponse(
        valid=True,
        code=code,
        discountType=discount_type,
        discountValue=discount_value,
        discountAmount=discount_amount,
        message=f"Coupon {code} applied.",
    )
