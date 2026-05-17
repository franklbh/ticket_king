from fastapi import APIRouter, Depends, Query

from app.schemas.admin import MarketingSettingsUpdate
from app.schemas.admin.responses import MarketingRecordPage, MarketingSettingsRead
from app.services.admin.marketing_service import marketing_service
from app.services.admin.security import require_permission

router = APIRouter(prefix="/marketing", tags=["marketing"])


@router.get("/settings", response_model=MarketingSettingsRead)
async def get_marketing_settings(
    _: dict = Depends(require_permission("marketing:read")),
) -> MarketingSettingsRead:
    return await marketing_service.get_settings()


@router.put("/settings", response_model=MarketingSettingsRead)
async def update_marketing_settings(
    payload: MarketingSettingsUpdate,
    actor: dict = Depends(require_permission("marketing:write")),
) -> MarketingSettingsRead:
    return await marketing_service.update_settings(payload, actor)


@router.get("/records", response_model=MarketingRecordPage)
async def list_marketing_records(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200, alias="pageSize"),
    status: str | None = None,
    _: dict = Depends(require_permission("marketing:read")),
) -> MarketingRecordPage:
    return await marketing_service.list_records(page=page, page_size=page_size, status=status)
