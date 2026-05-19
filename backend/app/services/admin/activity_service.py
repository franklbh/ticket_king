from __future__ import annotations

import csv
import io
from typing import Any

from fastapi import HTTPException, status

from app.core.config import settings
from app.schemas.admin.mappers import paginate
from app.schemas.admin.responses import ActivityLogPage, ActivityLogRead
from app.services.admin.normalizers import pick
from app.services.admin.repository import admin_repository


class ActivityService:
    async def list_activity_logs(self, filters: dict[str, Any]) -> ActivityLogPage:
        rows, total = await admin_repository.list_activity_logs(filters)
        logs = [self._normalize_log(row) for row in rows]
        return paginate(
            ActivityLogRead,
            logs,
            page=filters.get("page", 1),
            page_size=filters.get("page_size", 25),
            total=total,
            already_paginated=True,
        )

    async def get_activity_log(self, log_id: str) -> ActivityLogRead:
        row = await admin_repository.get_activity_log(log_id)
        if row:
            return ActivityLogRead.model_validate(self._normalize_log(row))
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity log not found.")

    async def export_activity_logs_csv(self, filters: dict[str, Any]) -> str:
        page = await self.list_activity_logs(filters | {"page": 1, "page_size": settings.max_table_rows})
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["ID", "Admin", "Action Type", "Target Type", "Target ID", "Action Details", "Login Info", "Timestamp"])
        for log in page.items:
            writer.writerow([
                log.id,
                log.admin,
                log.action_type,
                log.target_type,
                log.target_id,
                log.action_details,
                log.login_info,
                log.timestamp,
            ])
        return output.getvalue()

    @staticmethod
    def _normalize_log(row: dict[str, Any]) -> dict[str, Any]:
        admin = (
            row.get("admin_name")
            or row.get("admin_email")
            or pick(row, "admin_name", "admin_email", "admin_id", default="Unknown")
        )
        return {
            "id": pick(row, "id"),
            "admin": admin,
            "adminId": _optional_string(pick(row, "admin_id")),
            "actionType": pick(row, "action_type"),
            "targetType": pick(row, "target_type"),
            "targetId": _optional_string(pick(row, "target_id")),
            "actionDetails": pick(row, "action_details", default={}),
            "loginInfo": _optional_string(pick(row, "login_info", "ip")),
            "timestamp": str(pick(row, "created_at", "timestamp", default=""))[:19],
        }


def _optional_string(value: Any) -> str | None:
    if value in (None, ""):
        return None
    return str(value)


activity_service = ActivityService()
