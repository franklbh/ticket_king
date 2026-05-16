from __future__ import annotations

from typing import Any

from app.core.config import settings
from app.services.admin.repository import admin_repository
from app.utils.datetime import utc_now_iso_seconds


async def write_audit_log(
    actor: dict[str, Any],
    action_type: str,
    target_type: str,
    target_id: str | None,
    details: dict[str, Any],
    client_ip: str | None = None,
) -> None:
    await admin_repository.insert(
        settings.admin_audit_logs_table,
        {
            "admin_id": actor.get("id"),
            "action_type": action_type,
            "target_type": target_type,
            "target_id": target_id,
            "action_details": details,
            "login_info": client_ip,
            "created_at": utc_now_iso_seconds(),
        },
    )
