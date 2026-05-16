from fastapi import APIRouter

from app.schemas.admin.responses import HealthResponse
from app.services.admin.dashboard_service import dashboard_service

router = APIRouter(prefix="/health", tags=["health"])


@router.get("", response_model=HealthResponse)
async def health() -> HealthResponse:
    return await dashboard_service.health()
