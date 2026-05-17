from fastapi import APIRouter, Depends, Query

from app.schemas.admin import MarketingRecordAction, MarketingRecordCreate, MarketingSettingsUpdate, MarketingTestSendRequest
from app.schemas.admin.responses import ActionResponse, MarketingRecordPage, MarketingRecordRead, MarketingSettingsRead
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


@router.post("/records", status_code=201, response_model=MarketingRecordRead)
async def create_marketing_record(
    payload: MarketingRecordCreate,
    actor: dict = Depends(require_permission("marketing:write")),
) -> MarketingRecordRead:
    return await marketing_service.create_record(payload, actor)


@router.post("/records/{record_id}/cancel", response_model=MarketingRecordRead)
async def cancel_marketing_record(
    record_id: int,
    payload: MarketingRecordAction,
    actor: dict = Depends(require_permission("marketing:write")),
) -> MarketingRecordRead:
    return await marketing_service.cancel_record(record_id, payload, actor)


@router.post("/records/{record_id}/retry", response_model=MarketingRecordRead)
async def retry_marketing_record(
    record_id: int,
    payload: MarketingRecordAction,
    actor: dict = Depends(require_permission("marketing:write")),
) -> MarketingRecordRead:
    return await marketing_service.retry_record(record_id, payload, actor)


@router.post("/test-send", response_model=ActionResponse)
async def test_send_marketing(
    payload: MarketingTestSendRequest,
    actor: dict = Depends(require_permission("marketing:write")),
) -> ActionResponse:
    return ActionResponse.model_validate(await marketing_service.test_send(payload, actor))
