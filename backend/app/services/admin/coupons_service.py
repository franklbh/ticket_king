from __future__ import annotations

from typing import Any

from fastapi import HTTPException, status

from app.core.config import settings
from app.schemas.admin import CouponValidationRequest
from app.schemas.admin import CouponUpsert
from app.schemas.admin.mappers import to_model, to_models
from app.schemas.admin.responses import CouponRead
from app.services.admin.audit import audit_change, write_audit_log
from app.services.admin.normalizers import normalize_coupon
from app.services.admin.repository import admin_repository
from app.utils.datetime import utc_now_iso_seconds


class CouponsService:
    async def list_coupons(self, *, status: str | None = None, source: str | None = None, search: str | None = None) -> list[CouponRead]:
        rows = await admin_repository.list_coupons(status_filter=status, source=source, search=search)
        coupons = [normalize_coupon(row) for row in rows]
        return to_models(CouponRead, coupons)

    async def create_coupon(self, payload: CouponUpsert, actor: dict[str, Any]) -> CouponRead:
        code = payload.code.strip().upper()
        existing = await admin_repository.select_where(
            settings.admin_coupons_table,
            column="code",
            value=code,
            limit=1,
        )
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Coupon code already exists.")
        row = self._coupon_row_from_payload(payload, code)
        inserted = await admin_repository.insert(settings.admin_coupons_table, row)
        coupon_id = str(inserted[0].get("id"))
        await write_audit_log(actor, "Create", "Coupon", coupon_id, {"code": code}, None)
        return to_model(CouponRead, normalize_coupon(inserted[0]))

    async def update_coupon(
        self,
        coupon_id: int | str,
        payload: CouponUpsert,
        actor: dict[str, Any],
    ) -> CouponRead:
        code = payload.code.strip().upper()
        before_rows = await admin_repository.select_where(settings.admin_coupons_table, column="id", value=int(coupon_id), limit=1)
        values = {
            "code": code,
            "source": payload.source,
            "discount_type": payload.discount_type,
            "discount_value": payload.discount_value,
            "min_purchase": payload.min_purchase,
            "max_uses": payload.max_uses,
            "valid_from": payload.valid_from,
            "valid_to": payload.valid_to,
            "remarks": payload.remarks,
            "status": payload.status,
            "updated_at": utc_now_iso_seconds(),
        }
        rows = await admin_repository.update(
            settings.admin_coupons_table,
            match_column="id",
            match_value=int(coupon_id),
            values=values,
        )
        if not rows:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coupon not found.")
        details = audit_change(
            before_rows[0] if before_rows else None,
            rows[0],
            ["code", "source", "discount_type", "discount_value", "min_purchase", "max_uses", "valid_from", "valid_to", "remarks", "status"],
        )
        details["code"] = code
        await write_audit_log(actor, "Update", "Coupon", str(coupon_id), details, None)
        return to_model(CouponRead, normalize_coupon(rows[0]))

    async def archive_coupon(self, coupon_id: int | str, actor: dict[str, Any]) -> CouponRead:
        before_rows = await admin_repository.select_where(settings.admin_coupons_table, column="id", value=int(coupon_id), limit=1)
        rows = await admin_repository.update(
            settings.admin_coupons_table,
            match_column="id",
            match_value=int(coupon_id),
            values={"status": "archived", "updated_at": utc_now_iso_seconds()},
        )
        if not rows:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coupon not found.")
        details = audit_change(before_rows[0] if before_rows else None, rows[0], ["status"])
        await write_audit_log(actor, "Deactivate", "Coupon", str(coupon_id), details, None)
        return to_model(CouponRead, normalize_coupon(rows[0]))

    async def validate_coupon(self, payload: CouponValidationRequest) -> dict[str, Any]:
        code = payload.code.strip().upper()
        rows = await admin_repository.select_where(settings.admin_coupons_table, column="code", value=code, limit=1)
        if not rows:
            return {"valid": False, "code": code, "discount": 0, "reason": "Coupon not found."}
        coupon = normalize_coupon(rows[0])
        if coupon.get("status") != "active":
            return {"valid": False, "code": code, "discount": 0, "reason": "Coupon is not active."}
        max_uses = coupon.get("maxUses")
        if max_uses is not None and coupon.get("usedCount", 0) >= max_uses:
            return {"valid": False, "code": code, "discount": 0, "reason": "Coupon usage limit reached."}
        min_purchase = float(coupon.get("minPurchase") or 0)
        if payload.amount < min_purchase:
            return {"valid": False, "code": code, "discount": 0, "reason": "Minimum purchase not met."}
        value = float(coupon.get("discountValue") or 0)
        discount = round(payload.amount * value / 100, 2) if coupon.get("discountType") == "percent" else value
        return {"valid": True, "code": code, "discount": min(discount, payload.amount), "reason": None}

    async def coupon_qr(self, coupon_id: int | str) -> dict[str, Any]:
        rows = await admin_repository.select_where(settings.admin_coupons_table, column="id", value=int(coupon_id), limit=1)
        if not rows:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coupon not found.")
        code = str(rows[0].get("code") or "")
        return {"code": code, "payload": f"coupon:{code}"}

    @staticmethod
    def _coupon_row_from_payload(
        payload: CouponUpsert,
        code: str,
        *,
        include_timestamps: bool = True,
    ) -> dict[str, Any]:
        now = utc_now_iso_seconds()
        row: dict[str, Any] = {
            "code": code,
            "source": payload.source,
            "discount_type": payload.discount_type,
            "discount_value": payload.discount_value,
            "min_purchase": payload.min_purchase,
            "max_uses": payload.max_uses,
            "used_count": 0,
            "total_amount": 0,
            "valid_from": payload.valid_from,
            "valid_to": payload.valid_to,
            "remarks": payload.remarks,
            "status": payload.status,
        }
        if include_timestamps:
            row["created_at"] = now
            row["updated_at"] = now
        return row


coupons_service = CouponsService()
