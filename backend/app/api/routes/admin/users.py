from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status

from app.api.deps import client_ip
from app.core.config import settings
from app.schemas.admin import AdminAccountCreate, OwnerBootstrapCreate, StaffProfileUpdate, UserPasswordUpdate, UserRoleUpdate
from app.schemas.admin.responses import ActionResponse, ActivityLogPage
from app.services.admin.security import public_user, require_admin, require_permission
from app.services.admin.users import user_service

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me")
async def me(
    user: dict = Depends(require_admin),
) -> dict:
    return public_user(user)


@router.post("/me/login-event")
async def record_login_event(
    request: Request,
    user: dict = Depends(require_admin),
) -> dict:
    return await user_service.record_login(user, client_ip(request))


@router.get("")
async def list_users(
    role: str | None = Query(None),
    _: dict = Depends(require_permission("users:read")),
) -> list[dict]:
    return await user_service.list_users(role)


@router.get("/{user_id}")
async def get_user(
    user_id: str,
    _: dict = Depends(require_permission("users:read")),
) -> dict:
    return await user_service.get_user(user_id)


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


@router.delete("/{user_id}")
async def deactivate_user(
    user_id: str,
    actor: dict = Depends(require_permission("users:write")),
) -> dict:
    return await user_service.deactivate_user(user_id, actor)


@router.post("/{user_id}/password-reset", response_model=ActionResponse)
async def request_password_reset(
    user_id: str,
    actor: dict = Depends(require_permission("users:write")),
) -> ActionResponse:
    return ActionResponse.model_validate(await user_service.request_password_reset(user_id, actor))


@router.patch("/{user_id}/password", response_model=ActionResponse)
async def update_password(
    user_id: str,
    payload: UserPasswordUpdate,
    actor: dict = Depends(require_permission("users:write")),
) -> ActionResponse:
    return ActionResponse.model_validate(await user_service.set_password(user_id, payload, actor))


@router.get("/{user_id}/login-history", response_model=ActivityLogPage)
async def login_history(
    user_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200, alias="pageSize"),
    _: dict = Depends(require_permission("users:read")),
) -> ActivityLogPage:
    return await user_service.login_history(user_id, page, page_size)
