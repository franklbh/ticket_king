from __future__ import annotations

from datetime import datetime
from collections.abc import Iterable
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


ROLE_PERMISSIONS = {
    "dashboard:read": ADMIN_ROLES,
    "orders:read": ADMIN_ROLES,
    "orders:write": ADMIN_ROLES,
    "orders:export": ADMIN_ROLES,
    "tickets:read": ADMIN_ROLES,
    "tickets:write": ADMIN_ROLES,
    "tickets:export": ADMIN_ROLES,
    "scanner:use": ADMIN_ROLES,
    "catalog:read": ADMIN_ROLES,
    "catalog:write": ADMIN_ROLES,
    "coupons:read": ADMIN_ROLES,
    "coupons:write": ADMIN_ROLES,
    "marketing:read": ADMIN_ROLES,
    "marketing:write": {OWNER},
    "users:read": {OWNER},
    "users:write": {OWNER},
    "logs:read": {OWNER},
    "health:read": ADMIN_ROLES,
}


def permissions_for_role(role: str) -> list[str]:
    normalized_role = normalize_role(role)
    return sorted(
        permission
        for permission, roles in ROLE_PERMISSIONS.items()
        if normalized_role in roles
    )


def effective_permissions(user: dict[str, Any]) -> set[str]:
    permissions = set(permissions_for_role(str(user.get("role") or CUSTOMER)))
    permissions.update(_coerce_permissions(user.get("permissions")))
    permissions.difference_update(_coerce_permissions(user.get("denied_permissions")))
    return permissions


def _coerce_permissions(value: Any) -> set[str]:
    if value is None:
        return set()
    if isinstance(value, str):
        return {part.strip() for part in value.split(",") if part.strip()}
    if isinstance(value, Iterable):
        return {str(part).strip() for part in value if str(part).strip()}
    return set()


def normalize_role(value: Any) -> str:
    role = str(value or CUSTOMER).strip().lower()
    aliases = {
        # UI/business alias. The DB canonical value remains "administrator".
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
        if str(user.get("status") or "active").lower() != "active":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This admin account is inactive.",
            )
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


def require_permission(permission: str):
    if permission not in ROLE_PERMISSIONS:
        raise RuntimeError(f"Unknown admin permission: {permission}")

    async def dependency(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
        if permission not in effective_permissions(user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This account does not have permission for that action.",
            )
        return user

    return dependency


require_admin = require_roles(OWNER, ADMINISTRATOR)
require_owner = require_roles(OWNER)


def public_user(row: dict[str, Any]) -> dict[str, Any]:
    role = normalize_role(row.get("role"))
    return {
        "id": row.get("id"),
        "email": row.get("email"),
        "name": row.get("name"),
        "username": row.get("username") or row.get("name") or row.get("email"),
        "role": role,
        "permissions": sorted(effective_permissions(row)),
        "staffRole": row.get("staff_role"),
        "department": row.get("department"),
        "position": row.get("position"),
        "status": row.get("status", "active"),
        "canDisable": role == ADMINISTRATOR,
        "lastLoginAt": _format_datetime(row.get("last_login_at")),
        "lastLoginIp": row.get("last_login_ip"),
        "createdAt": _format_datetime(row.get("created_at")),
        "updatedAt": _format_datetime(row.get("updated_at")),
    }


def now_utc() -> datetime:
    return utc_now()


_format_datetime = format_datetime
