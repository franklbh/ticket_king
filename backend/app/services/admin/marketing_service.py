from __future__ import annotations

from typing import Any

from app.core.config import settings
from app.schemas.admin import MarketingSettingsUpdate
from app.schemas.admin.mappers import paginate, to_model, to_models
from app.schemas.admin.responses import MarketingRecordPage, MarketingRecordRead, MarketingSettingsRead
from app.services.admin.audit import write_audit_log
from app.services.admin.normalizers import normalize_marketing_record, normalize_marketing_settings
from app.services.admin.repository import admin_repository
from app.utils.datetime import utc_now_iso_seconds


class MarketingService:
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
        await write_audit_log(actor, "Update", "Marketing", "settings", {"enabled": payload.enabled}, None)
        return to_model(MarketingSettingsRead, normalize_marketing_settings(result))

    async def list_records(
        self,
        *,
        page: int = 1,
        page_size: int = 25,
        status: str | None = None,
    ) -> MarketingRecordPage:
        rows = await admin_repository.select(settings.admin_marketing_records_table)
        records = [normalize_marketing_record(row) for row in rows]
        if status and status != "all":
            records = [row for row in records if row.get("status") == status]
        records.sort(key=lambda row: row.get("createdAt") or "", reverse=True)
        return paginate(MarketingRecordRead, records, page=page, page_size=page_size)


marketing_service = MarketingService()
