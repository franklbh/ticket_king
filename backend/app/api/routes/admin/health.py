from fastapi import APIRouter

from app.services.admin.data import admin_data_service

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict:
    return await admin_data_service.health()

