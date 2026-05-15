from fastapi import APIRouter, Depends, Query

from app.services.security import require_admin
from app.services.admin_data import admin_data_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"], dependencies=[Depends(require_admin)])


@router.get("")
async def get_dashboard(range: str = Query("7d", pattern="^(7d|14d|30d|90d|all)$")) -> dict:
    return await admin_data_service.dashboard(range)
