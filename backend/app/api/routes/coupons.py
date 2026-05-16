from __future__ import annotations

from datetime import date, datetime
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.core.config import settings
from app.services.admin.repository import admin_repository


router = APIRouter(prefix="/coupons", tags=["coupons"])


class CouponValidateRequest(BaseModel):
    code: str = Field(min_length=1)
    amount: float = Field(default=0, ge=0)


class CouponValidateResponse(BaseModel):
    valid: bool
    code: str | None = None
    discountType: str | None = None
    discountValue: float = 0
    discountAmount: float = 0
    minPurchase: float = 0
    message: str


def _as_date(value: Any) -> date | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00")).date()
        except ValueError:
            try:
                return date.fromisoformat(value[:10])
            except ValueError:
                return None
    return None


def _invalid(message: str, code: str | None = None) -> CouponValidateResponse:
    return CouponValidateResponse(valid=False, code=code, message=message)


@router.post("/validate", response_model=CouponValidateResponse)
async def validate_coupon(payload: CouponValidateRequest) -> CouponValidateResponse:
    code = payload.code.strip()
    if not code:
        return _invalid("Enter a coupon code first.")

    rows = await admin_repository.select_where(
        settings.admin_coupons_table,
        column="code",
        value=code,
        limit=1,
    )
    if not rows:
        return _invalid("Invalid coupon code.", code)

    coupon = rows[0]
    if str(coupon.get("status") or "").lower() != "active":
        return _invalid("Invalid coupon code.", code)

    today = date.today()
    valid_from = _as_date(coupon.get("valid_from"))
    valid_to = _as_date(coupon.get("valid_to"))
    if valid_from and today < valid_from:
        return _invalid("Coupon is not active yet.", code)
    if valid_to and today > valid_to:
        return _invalid("Coupon has expired.", code)

    max_uses = coupon.get("max_uses")
    used_count = int(coupon.get("used_count") or 0)
    if max_uses is not None and used_count >= int(max_uses):
        return _invalid("Coupon has reached its usage limit.", code)

    amount = round(float(payload.amount or 0), 2)
    min_purchase = round(float(coupon.get("min_purchase") or 0), 2)
    if amount < min_purchase:
        return _invalid(f"Minimum purchase is CA${min_purchase:.2f}.", code)

    discount_type = str(coupon.get("discount_type") or "").lower()
    discount_value = float(coupon.get("discount_value") or 0)
    if discount_type == "percent":
        discount_amount = amount * discount_value / 100
    elif discount_type in {"fixed", "amount"}:
        discount_amount = discount_value
    else:
        return _invalid("Invalid coupon code.", code)

    discount_amount = round(max(0, min(discount_amount, amount)), 2)
    if discount_amount <= 0:
        return _invalid("Invalid coupon code.", code)

    return CouponValidateResponse(
        valid=True,
        code=code,
        discountType=discount_type,
        discountValue=round(discount_value, 2),
        discountAmount=discount_amount,
        minPurchase=min_purchase,
        message="Coupon applied.",
    )
