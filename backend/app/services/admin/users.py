from __future__ import annotations

import uuid
from typing import Any

from fastapi import HTTPException, status
import httpx

from app.core.config import settings
from app.services.admin.repository import admin_repository
from app.schemas.admin import AdminAccountCreate, OwnerBootstrapCreate, StaffProfileUpdate, UserRoleUpdate
from app.services.admin.audit import write_audit_log
from app.services.admin.security import ADMINISTRATOR, ALL_ROLES, OWNER, normalize_role, now_utc, public_user


class UserService:
    async def record_login(self, user: dict[str, Any], client_ip: str | None = None) -> dict[str, Any]:
        values = {"last_login_at": now_utc(), "last_login_ip": client_ip}
        updated = await self._update_user(user_id=str(user.get("id")), values=values)
        row = updated[0] if updated else user
        await write_audit_log(row, "Login", "Admin", str(user.get("id")), {"email": user.get("email")}, client_ip)
        return public_user(row)

    async def list_users(self, role: str | None = None) -> list[dict[str, Any]]:
        normalized_role = normalize_role(role) if role else None
        rows = await admin_repository.list_users(normalized_role)
        users = [public_user(row) for row in rows]
        users.sort(key=lambda row: (row.get("role") or "", row.get("email") or "", row.get("name") or ""))
        return users

    async def create_admin_account(self, payload: AdminAccountCreate, actor: dict[str, Any]) -> dict[str, Any]:
        auth_user = await self._get_or_create_auth_user_by_email(payload.email, payload.password, payload.name)
        existing_rows = await admin_repository.select_where(settings.admin_users_table, column="id", value=auth_user["id"], limit=1)
        existing_user = existing_rows[0] if existing_rows else None
        values = {
            "name": payload.name,
            "email": payload.email,
            "role": ADMINISTRATOR,
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
            await write_audit_log(actor, "Update", "Admin", str(existing_user["id"]), {"email": payload.email, "reactivated": True}, None)
            return {
                "user": public_user(updated[0]),
                "createdBy": actor.get("id"),
            }

        await self._ensure_email_unique(payload.email)
        inserted = await self._create_user(
            user_id=auth_user["id"],
            name=payload.name,
            email=payload.email,
            role=ADMINISTRATOR,
            staff_role=payload.staff_role,
            department=payload.department,
            position=payload.position,
            status="active",
        )
        await write_audit_log(actor, "Create", "Admin", str(inserted[0].get("id")), {"email": payload.email}, None)
        return {
            "user": public_user(inserted[0]),
            "createdBy": actor.get("id"),
        }

    async def bootstrap_owner(self, payload: OwnerBootstrapCreate) -> dict[str, Any]:
        owners = await admin_repository.select_where(settings.admin_users_table, column="role", value=OWNER, limit=1)
        if owners:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Owner account already exists.")

        existing_user = await self._find_user_by_email(payload.email)
        if existing_user:
            updated = await self._update_user(
                user_id=existing_user["id"],
                values={"name": payload.name, "role": OWNER},
            )
            return {"user": public_user(updated[0])}

        auth_user = await self._require_auth_user_by_email(payload.email)
        existing_rows = await admin_repository.select_where(settings.admin_users_table, column="id", value=auth_user["id"], limit=1)
        existing_user = existing_rows[0] if existing_rows else None
        if existing_user:
            updated = await self._update_user(
                user_id=existing_user["id"],
                values={"name": payload.name, "email": payload.email, "role": OWNER},
            )
            return {"user": public_user(updated[0])}

        await self._ensure_email_unique(payload.email)
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
        password = values.pop("password", None)
        email = values.get("email")
        existing_rows = await admin_repository.select_where(settings.admin_users_table, column="id", value=uuid.UUID(str(user_id)), limit=1)
        existing = existing_rows[0] if existing_rows else None
        if not existing:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
        if email and str(email).lower() != str(existing.get("email") or "").lower():
            found = await self._find_user_by_email(email)
            if found and str(found.get("id")) != str(user_id):
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists.")
        if password or (email and str(email).lower() != str(existing.get("email") or "").lower()):
            await self._update_auth_user(user_id=user_id, email=email, password=password)

        updated = await self._update_user(user_id=user_id, values=values) if values else [existing]
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
        details = {"profile": values}
        if password:
            details["password_updated"] = True
        await write_audit_log(actor, "Update", "Admin", str(user_id), details, None)
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
        await write_audit_log(actor, "Update", "Admin", str(user_id), {"role": role}, None)
        return public_user(updated[0])

    async def _ensure_email_unique(self, email: str) -> None:
        if await self._find_user_by_email(email):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists.")

    async def _find_user_by_email(self, email: str) -> dict[str, Any] | None:
        rows = await admin_repository.select_where(
            settings.admin_users_table,
            column="email",
            value=email,
            limit=1,
        )
        return rows[0] if rows else None

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
                "app_metadata": {"role": ADMINISTRATOR},
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
                "data": {"name": name, "role": ADMINISTRATOR},
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

    async def _update_auth_user(
        self,
        *,
        user_id: str,
        email: str | None = None,
        password: str | None = None,
    ) -> None:
        if not settings.supabase_url or not settings.supabase_service_role_key:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Supabase service role key is required to update admin email or password.",
            )
        payload: dict[str, Any] = {}
        if email:
            payload["email"] = email
        if password:
            payload["password"] = password
        if not payload:
            return
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.put(
                    f"{settings.supabase_url.rstrip('/')}/auth/v1/admin/users/{user_id}",
                    headers={
                        "apikey": settings.supabase_service_role_key,
                        "Authorization": f"Bearer {settings.supabase_service_role_key}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )
        except httpx.HTTPError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Could not update Supabase Auth user.",
            ) from exc
        if response.status_code not in {200, 204}:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=self._supabase_error_detail(response))

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
