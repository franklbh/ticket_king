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
            "action_details": _json_safe(details),
            "login_info": client_ip,
            "created_at": utc_now_iso_seconds(),
        },
    )


def audit_change(before: dict[str, Any] | None, after: dict[str, Any] | None, fields: list[str]) -> dict[str, Any]:
    before = before or {}
    after = after or {}
    changes = {}
    for field in fields:
        old = before.get(field)
        new = after.get(field)
        if old != new:
            changes[field] = {"before": _json_safe(old), "after": _json_safe(new)}
    return {"changes": changes} if changes else {"changes": {}}


def _json_safe(value: Any) -> Any:
    if isinstance(value, dict):
        return {str(key): _json_safe(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_json_safe(item) for item in value]
    if isinstance(value, tuple):
        return [_json_safe(item) for item in value]
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    return str(value)
