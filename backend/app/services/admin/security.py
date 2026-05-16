from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import Depends, HTTPException, status

from app.core.config import settings
from app.core.supabase_auth import SupabaseUser, get_current_user
from app.services.admin.repository import admin_repository
from app.utils.datetime import format_datetime, utc_now

OWNER = "owner"
ADMINISTRATOR = "administrator"
CUSTOMER = "customer"
ADMIN_ROLES = {OWNER, ADMINISTRATOR}
ALL_ROLES = {OWNER, ADMINISTRATOR, CUSTOMER}


def normalize_role(value: Any) -> str:
    role = str(value or CUSTOMER).strip().lower()
    aliases = {
        "admin": ADMINISTRATOR,
        "administrator": ADMINISTRATOR,
        "super_admin": OWNER,
        "superadmin": OWNER,
        "customer": CUSTOMER,
        "owner": OWNER,
    }
    return aliases.get(role, CUSTOMER)


async def current_user(
    auth_user: SupabaseUser = Depends(get_current_user),
) -> dict[str, Any]:
    rows = await admin_repository.select_where(
        settings.admin_users_table,
        column="id",
        value=auth_user.id,
        limit=1,
    )
    if rows:
        user = dict(rows[0])
        user["role"] = normalize_role(user.get("role"))
        return user

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unknown user.")


def require_roles(*allowed_roles: str):
    normalized_allowed = {normalize_role(role) for role in allowed_roles}

    async def dependency(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
        if normalize_role(user.get("role")) not in normalized_allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This account does not have permission for that action.",
            )
        return user

    return dependency


require_admin = require_roles(OWNER, ADMINISTRATOR)
require_owner = require_roles(OWNER)


def public_user(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row.get("id"),
        "email": row.get("email"),
        "name": row.get("name"),
        "username": row.get("username") or row.get("name") or row.get("email"),
        "role": normalize_role(row.get("role")),
        "staffRole": row.get("staff_role"),
        "department": row.get("department"),
        "position": row.get("position"),
        "status": row.get("status", "active"),
        "lastLoginAt": _format_datetime(row.get("last_login_at")),
        "lastLoginIp": row.get("last_login_ip"),
        "createdAt": _format_datetime(row.get("created_at")),
        "updatedAt": _format_datetime(row.get("updated_at")),
    }


def now_utc() -> datetime:
    return utc_now()


_format_datetime = format_datetime
