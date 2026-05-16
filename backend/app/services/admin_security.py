from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials

from app.core.admin_db import supabase
from app.core.config import settings
from app.core.supabase_auth import bearer_scheme, verify_supabase_token

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
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
) -> dict[str, Any]:
    user_id = _user_id_from_credentials(credentials)
    if user_id is None and x_user_id and _dev_header_allowed():
        user_id = x_user_id
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing admin bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    rows = await supabase.select(settings.admin_users_table)
    for row in rows:
        if str(row.get("id")) == str(user_id):
            user = dict(row)
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
    return datetime.now(timezone.utc)


def _dev_header_allowed() -> bool:
    return settings.admin_allow_dev_user_header and settings.app_env.lower() in {"local", "dev", "development", "test"}


def _user_id_from_credentials(credentials: HTTPAuthorizationCredentials | None) -> str | None:
    if credentials is None:
        return None
    return verify_supabase_token(credentials.credentials).id


def _format_datetime(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)
