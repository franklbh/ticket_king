from fastapi import APIRouter, Depends, Query

from app.schemas.admin.responses import DashboardResponse, EventIncomeItem
from app.services.admin.dashboard_service import dashboard_service
from app.services.admin.security import require_permission

router = APIRouter(prefix="/dashboard", tags=["dashboard"], dependencies=[Depends(require_permission("dashboard:read"))])


@router.get("", response_model=DashboardResponse)
async def get_dashboard(range: str = Query("all", pattern="^(7d|14d|30d|90d|all)$")) -> DashboardResponse:
    return await dashboard_service.dashboard(range)


@router.get("/income-by-event", response_model=list[EventIncomeItem])
async def get_income_by_event(
    range: str = Query("all", pattern="^(today|7d|14d|30d|90d|all)$"),
) -> list[EventIncomeItem]:
    return await dashboard_service.income_by_event(range)
