from __future__ import annotations

import uuid
from typing import Any

from fastapi import HTTPException, status

from app.core.config import settings
from app.db.supabase import supabase
from app.schemas import AdminAccountCreate, OwnerBootstrapCreate, UserRoleUpdate
from app.services.security import ADMINISTRATOR, ALL_ROLES, OWNER, normalize_role, now_iso, password_hash, public_user


class UserService:
    async def list_users(self, role: str | None = None) -> list[dict[str, Any]]:
        rows = await supabase.select(settings.admin_users_table)
        users = [public_user(row) for row in rows]
        if role:
            normalized_role = normalize_role(role)
            users = [user for user in users if user["role"] == normalized_role]
        users.sort(key=lambda row: (row.get("role") or "", row.get("username") or ""))
        return users

    async def create_admin_account(self, payload: AdminAccountCreate, actor: dict[str, Any]) -> dict[str, Any]:
        await self._ensure_unique(payload.username, payload.email)
        inserted = await self._create_user(
            name=payload.name,
            username=payload.username,
            email=payload.email,
            password=payload.password,
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
        await self._ensure_unique(payload.username, payload.email)
        inserted = await self._create_user(
            name=payload.name,
            username=payload.username,
            email=payload.email,
            password=payload.password,
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
        updated = await supabase.update(
            settings.admin_users_table,
            match_column="id",
            match_value=user_id,
            values={"role": role},
        )
        await supabase.update(
            settings.admin_profiles_table,
            match_column="id",
            match_value=user_id,
            values={"role": role},
        )
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
        return public_user(updated[0])

    async def _ensure_unique(self, username: str, email: str) -> None:
        rows = await supabase.select(settings.admin_users_table)
        for row in rows:
            if str(row.get("username")).lower() == username.lower():
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists.")
            if str(row.get("email")).lower() == email.lower():
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists.")

    async def _create_user(
        self,
        *,
        name: str,
        username: str,
        email: str,
        password: str,
        role: str,
    ) -> list[dict[str, Any]]:
        user_id = str(uuid.uuid4())
        now = now_iso()
        user_row = {
            "id": user_id,
            "name": name,
            "username": username,
            "email": email,
            "password_hash": password_hash(password),
            "email_verified": True,
            "role": role,
            "created_at": now,
        }
        profile_row = {
            "id": user_id,
            "name": name,
            "username": username,
            "role": role,
            "created_at": now,
        }
        inserted = await supabase.insert(settings.admin_users_table, user_row)
        await supabase.insert(settings.admin_profiles_table, profile_row)
        return inserted


user_service = UserService()
