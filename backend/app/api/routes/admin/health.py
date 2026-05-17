from fastapi import APIRouter, Depends

from app.schemas.admin.responses import HealthResponse
from app.services.admin.dashboard_service import dashboard_service
from app.services.admin.security import require_permission

router = APIRouter(prefix="/health", tags=["health"], dependencies=[Depends(require_permission("health:read"))])


@router.get("", response_model=HealthResponse)
async def health() -> HealthResponse:
    return await dashboard_service.health()
