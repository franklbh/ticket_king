from __future__ import annotations

from typing import Any

from app.core.config import settings
from app.schemas.admin import MarketingRecordAction, MarketingRecordCreate, MarketingSettingsUpdate, MarketingTestSendRequest
from app.schemas.admin.mappers import paginate, to_model, to_models
from app.schemas.admin.responses import MarketingRecordPage, MarketingRecordRead, MarketingSettingsRead
from app.services.admin.audit import audit_change, write_audit_log
from app.services.admin.normalizers import normalize_marketing_record, normalize_marketing_settings
from app.services.admin.repository import admin_repository
from app.utils.datetime import utc_now_iso_seconds


class MarketingService:
    async def _record_write_values(self, values: dict[str, Any]) -> dict[str, Any]:
        columns = await admin_repository.columns(settings.admin_marketing_records_table)
        if "updated_at" not in columns:
            values.pop("updated_at", None)
        return values

    async def get_settings(self) -> MarketingSettingsRead:
        rows = await admin_repository.select(settings.admin_marketing_settings_table)
        if not rows:
            return to_model(MarketingSettingsRead, normalize_marketing_settings({"id": True}))
        return to_model(MarketingSettingsRead, normalize_marketing_settings(rows[0]))

    async def update_settings(
        self,
        payload: MarketingSettingsUpdate,
        actor: dict[str, Any],
    ) -> MarketingSettingsRead:
        now = utc_now_iso_seconds()
        values = {
            "id": True,
            "enabled": payload.enabled,
            "send_delay_minutes": payload.send_delay_minutes,
            "coupon_validity_days": payload.coupon_validity_days,
            "discount_type": payload.discount_type,
            "discount_value": payload.discount_value,
            "min_purchase": payload.min_purchase,
            "max_uses": payload.max_uses,
            "referral_enabled": payload.referral_enabled,
            "referral_reward": payload.referral_reward,
            "updated_at": now,
        }
        existing = await admin_repository.select(settings.admin_marketing_settings_table)
        before = existing[0] if existing else None
        if existing:
            rows = await admin_repository.update(
                settings.admin_marketing_settings_table,
                match_column="id",
                match_value=True,
                values=values,
            )
            result = rows[0]
        else:
            inserted = await admin_repository.insert(settings.admin_marketing_settings_table, values)
            result = inserted[0]
        details = audit_change(
            before,
            result,
            ["enabled", "send_delay_minutes", "coupon_validity_days", "discount_type", "discount_value", "min_purchase", "max_uses", "referral_enabled", "referral_reward"],
        )
        await write_audit_log(actor, "Update", "Marketing", "settings", details, None)
        return to_model(MarketingSettingsRead, normalize_marketing_settings(result))

    async def list_records(
        self,
        *,
        page: int = 1,
        page_size: int = 25,
        status: str | None = None,
    ) -> MarketingRecordPage:
        rows, total = await admin_repository.list_marketing_records({"page": page, "page_size": page_size, "status": status})
        records = [normalize_marketing_record(row) for row in rows]
        return paginate(MarketingRecordRead, records, page=page, page_size=page_size, total=total, already_paginated=True)

    async def create_record(self, payload: MarketingRecordCreate, actor: dict[str, Any]) -> MarketingRecordRead:
        now = utc_now_iso_seconds()
        row = await self._record_write_values({
            "recipient_name": payload.recipient_name,
            "recipient_email": payload.recipient_email,
            "coupon_code": payload.coupon_code,
            "order_id": payload.order_id,
            "status": "pending",
            "coupon_used": False,
            "created_at": now,
            "updated_at": now,
        })
        inserted = await admin_repository.insert(settings.admin_marketing_records_table, row)
        record_id = str(inserted[0].get("id"))
        await write_audit_log(actor, "Create", "Marketing", record_id, {"recipientEmail": payload.recipient_email}, None)
        return to_model(MarketingRecordRead, normalize_marketing_record(inserted[0]))

    async def cancel_record(self, record_id: int | str, payload: MarketingRecordAction, actor: dict[str, Any]) -> MarketingRecordRead:
        return await self._update_record_status(record_id, "cancelled", payload.reason, actor)

    async def retry_record(self, record_id: int | str, payload: MarketingRecordAction, actor: dict[str, Any]) -> MarketingRecordRead:
        return await self._update_record_status(record_id, "pending", payload.reason, actor)

    async def test_send(self, payload: MarketingTestSendRequest, actor: dict[str, Any]) -> dict[str, Any]:
        await write_audit_log(
            actor,
            "Test Send",
            "Marketing",
            None,
            {"recipientEmail": payload.recipient_email, "queued": False, "message": "Email provider is not configured in this backend."},
            None,
        )
        return {"ok": True, "message": "Test send request audited. Email provider is not configured.", "id": None}

    async def _update_record_status(
        self,
        record_id: int | str,
        next_status: str,
        reason: str | None,
        actor: dict[str, Any],
    ) -> MarketingRecordRead:
        before_rows = await admin_repository.select_where(settings.admin_marketing_records_table, column="id", value=int(record_id), limit=1)
        values = await self._record_write_values({"status": next_status, "updated_at": utc_now_iso_seconds()})
        if next_status == "pending":
            values["sent_at"] = None
        rows = await admin_repository.update(
            settings.admin_marketing_records_table,
            match_column="id",
            match_value=int(record_id),
            values=values,
        )
        if not rows:
            from fastapi import HTTPException, status
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Marketing record not found.")
        details = audit_change(before_rows[0] if before_rows else None, rows[0], ["status", "sent_at"])
        details.update({"status": next_status, "reason": reason})
        await write_audit_log(actor, "Update", "Marketing", str(record_id), details, None)
        return to_model(MarketingRecordRead, normalize_marketing_record(rows[0]))


marketing_service = MarketingService()
