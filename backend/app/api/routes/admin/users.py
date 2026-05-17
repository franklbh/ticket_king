from fastapi import APIRouter, Depends, Header, HTTPException, Query, status

from app.core.config import settings
from app.schemas.admin import AdminAccountCreate, OwnerBootstrapCreate, StaffProfileUpdate, UserRoleUpdate
from app.services.admin.security import public_user, require_admin, require_permission
from app.services.admin.users import user_service

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me")
async def me(user: dict = Depends(require_admin)) -> dict:
    return public_user(user)


@router.get("")
async def list_users(
    role: str | None = Query(None),
    _: dict = Depends(require_permission("users:read")),
) -> list[dict]:
    return await user_service.list_users(role)


@router.post("/admins", status_code=201)
async def create_admin_account(
    payload: AdminAccountCreate,
    actor: dict = Depends(require_permission("users:write")),
) -> dict:
    return await user_service.create_admin_account(payload, actor)


@router.post("/bootstrap-owner", status_code=201)
async def bootstrap_owner(
    payload: OwnerBootstrapCreate,
    x_bootstrap_token: str | None = Header(default=None, alias="X-Bootstrap-Token"),
) -> dict:
    if settings.admin_bootstrap_token and x_bootstrap_token != settings.admin_bootstrap_token:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid bootstrap token.")
    return await user_service.bootstrap_owner(payload)


@router.patch("/{user_id}/role")
async def update_user_role(
    user_id: str,
    payload: UserRoleUpdate,
    actor: dict = Depends(require_permission("users:write")),
) -> dict:
    return await user_service.update_role(user_id, payload, actor)


@router.patch("/{user_id}/staff-profile")
async def update_staff_profile(
    user_id: str,
    payload: StaffProfileUpdate,
    actor: dict = Depends(require_permission("users:write")),
) -> dict:
    return await user_service.update_staff_profile(user_id, payload, actor)
