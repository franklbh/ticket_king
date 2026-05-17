from __future__ import annotations

import uuid
from typing import Any

from fastapi import HTTPException, status
import httpx

from app.core.config import settings
from app.services.admin.repository import admin_repository
from app.schemas.admin import AdminAccountCreate, OwnerBootstrapCreate, StaffProfileUpdate, UserRoleUpdate
from app.services.admin.security import ADMIN, ALL_ROLES, OWNER, normalize_role, now_utc, public_user


class UserService:
    async def list_users(self, role: str | None = None) -> list[dict[str, Any]]:
        rows = await admin_repository.select(settings.admin_users_table)
        users = [public_user(row) for row in rows]
        if role:
            normalized_role = normalize_role(role)
            users = [user for user in users if user["role"] == normalized_role]
        users.sort(key=lambda row: (row.get("role") or "", row.get("email") or "", row.get("name") or ""))
        return users

    async def create_admin_account(self, payload: AdminAccountCreate, actor: dict[str, Any]) -> dict[str, Any]:
        rows = await admin_repository.select(settings.admin_users_table)
        auth_user = await self._get_or_create_auth_user_by_email(payload.email, payload.password, payload.name)
        existing_user = self._find_user_by_id(rows, auth_user["id"])
        values = {
            "name": payload.name,
            "email": payload.email,
            "role": ADMIN,
            "staff_role": payload.staff_role,
            "department": payload.department,
            "position": payload.position,
            "status": "active",
        }
        if existing_user:
            updated = await self._update_user(
                user_id=existing_user["id"],
                values=values,
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
            role=ADMIN,
            staff_role=payload.staff_role,
            department=payload.department,
            position=payload.position,
            status="active",
        )
        return {
            "user": public_user(inserted[0]),
            "createdBy": actor.get("id"),
        }

    async def bootstrap_owner(self, payload: OwnerBootstrapCreate) -> dict[str, Any]:
        rows = await admin_repository.select(settings.admin_users_table)
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

    async def update_staff_profile(
        self,
        user_id: str,
        payload: StaffProfileUpdate,
        actor: dict[str, Any],
    ) -> dict[str, Any]:
        values = payload.model_dump(exclude_unset=True)
        if not values:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No profile fields provided.")
        updated = await self._update_user(user_id=user_id, values=values)
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
        return public_user(updated[0])

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
        rows = rows or await admin_repository.select(settings.admin_users_table)
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
        rows = await admin_repository.select_where(
            settings.supabase_auth_users_table,
            column="email",
            value=email,
            limit=1,
        )
        if rows:
            return rows[0]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Supabase Auth user does not exist for this email. "
                "Sign up the user through Supabase Auth first, then call this endpoint again."
            ),
        )

    async def _get_or_create_auth_user_by_email(self, email: str, password: str, name: str) -> dict[str, Any]:
        try:
            return await self._require_auth_user_by_email(email)
        except HTTPException as exc:
            if exc.status_code != status.HTTP_400_BAD_REQUEST:
                raise

        created = await self._create_auth_user(email=email, password=password, name=name)
        if created:
            return created
        return await self._require_auth_user_by_email(email)

    async def _create_auth_user(self, *, email: str, password: str, name: str) -> dict[str, Any] | None:
        if not settings.supabase_url:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Supabase URL is not configured.",
            )

        if settings.supabase_service_role_key:
            return await self._create_auth_user_with_service_role(email=email, password=password, name=name)

        if settings.supabase_publishable_key:
            return await self._create_auth_user_with_signup(email=email, password=password, name=name)

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase Auth user creation is not configured.",
        )

    async def _create_auth_user_with_service_role(self, *, email: str, password: str, name: str) -> dict[str, Any] | None:
        response = await self._post_supabase_auth(
            "/auth/v1/admin/users",
            key=settings.supabase_service_role_key or "",
            payload={
                "email": email,
                "password": password,
                "email_confirm": True,
                "app_metadata": {"role": ADMIN},
                "user_metadata": {"name": name},
            },
        )
        return self._auth_user_from_response(response, email)

    async def _create_auth_user_with_signup(self, *, email: str, password: str, name: str) -> dict[str, Any] | None:
        response = await self._post_supabase_auth(
            "/auth/v1/signup",
            key=settings.supabase_publishable_key or "",
            payload={
                "email": email,
                "password": password,
                "data": {"name": name, "role": ADMIN},
            },
        )
        return self._auth_user_from_response(response, email)

    async def _post_supabase_auth(self, path: str, *, key: str, payload: dict[str, Any]) -> httpx.Response:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.post(
                    f"{settings.supabase_url.rstrip('/')}{path}",
                    headers={
                        "apikey": key,
                        "Authorization": f"Bearer {key}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )
        except httpx.HTTPError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Could not create Supabase Auth user.",
            ) from exc

        if response.status_code in {200, 201}:
            return response

        detail = self._supabase_error_detail(response)
        duplicate_markers = ("already", "registered", "exists")
        if response.status_code in {400, 409, 422} and any(marker in detail.lower() for marker in duplicate_markers):
            return response
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)

    def _auth_user_from_response(self, response: httpx.Response, email: str) -> dict[str, Any] | None:
        if response.status_code not in {200, 201}:
            return None

        data = response.json()
        user = data.get("user") if isinstance(data.get("user"), dict) else data
        user_id = user.get("id")
        if not user_id:
            return None
        return {"id": user_id, "email": user.get("email") or email}

    @staticmethod
    def _supabase_error_detail(response: httpx.Response) -> str:
        try:
            data = response.json()
        except ValueError:
            return response.text or "Supabase Auth user creation failed."
        return (
            data.get("msg")
            or data.get("message")
            or data.get("error_description")
            or data.get("error")
            or "Supabase Auth user creation failed."
        )

    async def _create_user(
        self,
        *,
        user_id: Any,
        name: str,
        email: str,
        role: str,
        staff_role: str | None = None,
        department: str | None = None,
        position: str | None = None,
        status: str = "active",
    ) -> list[dict[str, Any]]:
        now = now_utc()
        user_row = {
            "id": uuid.UUID(str(user_id)),
            "email": email,
            "name": name,
            "role": role,
            "staff_role": staff_role,
            "department": department,
            "position": position,
            "status": status,
            "created_at": now,
            "updated_at": now,
        }
        return await admin_repository.insert(settings.admin_users_table, user_row)

    async def _update_user(self, *, user_id: str, values: dict[str, Any]) -> list[dict[str, Any]]:
        return await admin_repository.update(
            settings.admin_users_table,
            match_column="id",
            match_value=uuid.UUID(str(user_id)),
            values={**values, "updated_at": now_utc()},
        )


user_service = UserService()
