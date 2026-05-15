from __future__ import annotations

import uuid
from typing import Any

from fastapi import HTTPException, status

from app.core.config import settings
from app.core.admin_db import supabase
from app.schemas.admin import AdminAccountCreate, OwnerBootstrapCreate, UserRoleUpdate
from app.services.admin_security import ADMINISTRATOR, ALL_ROLES, OWNER, normalize_role, now_utc, public_user


class UserService:
    async def list_users(self, role: str | None = None) -> list[dict[str, Any]]:
        rows = await supabase.select(settings.admin_users_table)
        users = [public_user(row) for row in rows]
        if role:
            normalized_role = normalize_role(role)
            users = [user for user in users if user["role"] == normalized_role]
        users.sort(key=lambda row: (row.get("role") or "", row.get("email") or "", row.get("name") or ""))
        return users

    async def create_admin_account(self, payload: AdminAccountCreate, actor: dict[str, Any]) -> dict[str, Any]:
        rows = await supabase.select(settings.admin_users_table)
        auth_user = await self._require_auth_user_by_email(payload.email)
        existing_user = self._find_user_by_id(rows, auth_user["id"])
        if existing_user:
            updated = await self._update_user(
                user_id=existing_user["id"],
                values={"name": payload.name, "email": payload.email, "role": ADMINISTRATOR},
            )
            return {
                "user": public_user(updated[0]),
                "createdBy": actor.get("id"),
            }

        await self._ensure_email_unique(payload.email, rows)
        inserted = await self._create_user(
            user_id=auth_user["id"],
            name=payload.name,
            email=payload.email,
            role=ADMINISTRATOR,
        )
        return {
            "user": public_user(inserted[0]),
            "createdBy": actor.get("id"),
        }

    async def bootstrap_owner(self, payload: OwnerBootstrapCreate) -> dict[str, Any]:
        rows = await supabase.select(settings.admin_users_table)
        if any(normalize_role(row.get("role")) == OWNER for row in rows):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Owner account already exists.")

        existing_user = self._find_user_by_email(rows, payload.email)
        if existing_user:
            updated = await self._update_user(
                user_id=existing_user["id"],
                values={"name": payload.name, "role": OWNER},
            )
            return {"user": public_user(updated[0])}

        auth_user = await self._require_auth_user_by_email(payload.email)
        existing_user = self._find_user_by_id(rows, auth_user["id"])
        if existing_user:
            updated = await self._update_user(
                user_id=existing_user["id"],
                values={"name": payload.name, "email": payload.email, "role": OWNER},
            )
            return {"user": public_user(updated[0])}

        await self._ensure_email_unique(payload.email, rows)
        inserted = await self._create_user(
            user_id=auth_user["id"],
            name=payload.name,
            email=payload.email,
            role=OWNER,
        )
        return {"user": public_user(inserted[0])}

    async def update_role(self, user_id: str, payload: UserRoleUpdate, actor: dict[str, Any]) -> dict[str, Any]:
        role = normalize_role(payload.role)
        if role not in ALL_ROLES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role.")
        if str(actor.get("id")) == str(user_id) and role != "owner":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Owner accounts cannot remove their own owner role.",
            )
        updated = await self._update_user(user_id=user_id, values={"role": role})
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
        return public_user(updated[0])

    async def _ensure_email_unique(self, email: str, rows: list[dict[str, Any]] | None = None) -> None:
        rows = rows or await supabase.select(settings.admin_users_table)
        for row in rows:
            if str(row.get("email")).lower() == email.lower():
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists.")

    def _find_user_by_email(self, rows: list[dict[str, Any]], email: str) -> dict[str, Any] | None:
        for row in rows:
            if str(row.get("email")).lower() == email.lower():
                return row
        return None

    def _find_user_by_id(self, rows: list[dict[str, Any]], user_id: Any) -> dict[str, Any] | None:
        for row in rows:
            if str(row.get("id")) == str(user_id):
                return row
        return None

    async def _require_auth_user_by_email(self, email: str) -> dict[str, Any]:
        rows = await supabase.select(settings.supabase_auth_users_table)
        for row in rows:
            if str(row.get("email")).lower() == email.lower():
                return row
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Supabase Auth user does not exist for this email. "
                "Sign up the user through Supabase Auth first, then call this endpoint again."
            ),
        )

    async def _create_user(
        self,
        *,
        user_id: Any,
        name: str,
        email: str,
        role: str,
    ) -> list[dict[str, Any]]:
        now = now_utc()
        user_row = {
            "id": uuid.UUID(str(user_id)),
            "email": email,
            "name": name,
            "role": role,
            "created_at": now,
            "updated_at": now,
        }
        return await supabase.insert(settings.admin_users_table, user_row)

    async def _update_user(self, *, user_id: str, values: dict[str, Any]) -> list[dict[str, Any]]:
        return await supabase.update(
            settings.admin_users_table,
            match_column="id",
            match_value=uuid.UUID(str(user_id)),
            values={**values, "updated_at": now_utc()},
        )


user_service = UserService()
