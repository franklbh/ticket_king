from fastapi import APIRouter, Depends, Query

from app.schemas.admin.responses import DashboardResponse
from app.services.admin.dashboard_service import dashboard_service
from app.services.admin.security import require_admin

router = APIRouter(prefix="/dashboard", tags=["dashboard"], dependencies=[Depends(require_admin)])


@router.get("", response_model=DashboardResponse)
async def get_dashboard(range: str = Query("7d", pattern="^(7d|14d|30d|90d|all)$")) -> DashboardResponse:
    return await dashboard_service.dashboard(range)
