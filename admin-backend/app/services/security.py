from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import datetime
from typing import Any

from fastapi import Depends, Header, HTTPException, status

from app.core.config import settings
from app.db.supabase import supabase

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
        "customer": CUSTOMER,
        "owner": OWNER,
    }
    return aliases.get(role, CUSTOMER)


async def current_user(x_user_id: str | None = Header(default=None, alias="X-User-Id")) -> dict[str, Any]:
    if not x_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-User-Id header.",
        )

    rows = await supabase.select(settings.admin_users_table)
    for row in rows:
        if str(row.get("id")) == str(x_user_id):
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
        "name": row.get("name"),
        "username": row.get("username"),
        "email": row.get("email"),
        "emailVerified": row.get("email_verified"),
        "role": normalize_role(row.get("role")),
        "createdAt": _format_datetime(row.get("created_at")),
    }


def password_hash(password: str) -> str:
    salt = secrets.token_hex(16)
    iterations = 210_000
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), iterations)
    return f"pbkdf2_sha256${iterations}${salt}${digest.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        algorithm, iterations_text, salt, digest = stored_hash.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        iterations = int(iterations_text)
    except ValueError:
        return False
    candidate = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), iterations)
    return hmac.compare_digest(candidate.hex(), digest)


def now_iso() -> str:
    return datetime.utcnow().isoformat(timespec="seconds")


def _format_datetime(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)

