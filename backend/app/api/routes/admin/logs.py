from fastapi import APIRouter, Depends, Query

from app.schemas.admin.responses import ActivityLogPage
from app.services.admin.activity_service import activity_service
from app.services.admin.security import require_permission

router = APIRouter(prefix="/logs", tags=["logs"], dependencies=[Depends(require_permission("logs:read"))])


def _log_filters(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200, alias="pageSize"),
    admin: str | None = None,
    action_type: str | None = Query(None, alias="actionType"),
    target_type: str | None = Query(None, alias="targetType"),
    target_id: str | None = Query(None, alias="targetId"),
    date_from: str | None = Query(None, alias="dateFrom"),
    date_to: str | None = Query(None, alias="dateTo"),
) -> dict:
    return {
        "page": page,
        "page_size": page_size,
        "admin": admin,
        "action_type": action_type,
        "target_type": target_type,
        "target_id": target_id,
        "date_from": date_from,
        "date_to": date_to,
    }


@router.get("", response_model=ActivityLogPage)
async def list_activity_logs(filters: dict = Depends(_log_filters)) -> ActivityLogPage:
    return await activity_service.list_activity_logs(filters)
