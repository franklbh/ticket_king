from __future__ import annotations

from typing import Any

from app.core.config import settings
from app.schemas.admin.mappers import paginate
from app.schemas.admin.responses import ActivityLogPage, ActivityLogRead
from app.services.admin.enrichment import users_by_id
from app.services.admin.filters import filter_activity_logs
from app.services.admin.normalizers import pick
from app.services.admin.repository import admin_repository


class ActivityService:
    async def list_activity_logs(self, filters: dict[str, Any]) -> ActivityLogPage:
        rows = await admin_repository.select(settings.admin_audit_logs_table)
        users = await users_by_id()
        logs = [self._normalize_log(row, users) for row in rows]
        logs = filter_activity_logs(logs, filters)
        logs.sort(key=lambda row: row.get("timestamp") or "", reverse=True)
        return paginate(ActivityLogRead, logs, page=filters.get("page", 1), page_size=filters.get("page_size", 25))

    @staticmethod
    def _normalize_log(row: dict[str, Any], users_by_id: dict[str, dict[str, Any]]) -> dict[str, Any]:
        admin_user = users_by_id.get(str(row.get("admin_id") or ""))
        admin = (
            (admin_user or {}).get("name")
            or (admin_user or {}).get("email")
            or pick(row, "admin_name", "admin_email", "admin_id", default="Unknown")
        )
        return {
            "id": pick(row, "id"),
            "admin": admin,
            "adminId": pick(row, "admin_id"),
            "actionType": pick(row, "action_type"),
            "targetType": pick(row, "target_type"),
            "targetId": pick(row, "target_id"),
            "actionDetails": pick(row, "action_details", default={}),
            "loginInfo": pick(row, "login_info", "ip"),
            "timestamp": str(pick(row, "created_at", "timestamp", default=""))[:19],
        }


activity_service = ActivityService()
