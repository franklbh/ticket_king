from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any, TypeVar
from uuid import UUID

from pydantic import BaseModel

from app.schemas.admin.common import PaginatedResponse

T = TypeVar("T", bound=BaseModel)


def prepare_value(value: Any) -> Any:
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d %H:%M:%S")
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, dict):
        return {key: prepare_value(item) for key, item in value.items()}
    if isinstance(value, list):
        return [prepare_value(item) for item in value]
    return value


def prepare_row(data: dict[str, Any]) -> dict[str, Any]:
    return {key: prepare_value(value) for key, value in data.items()}


def to_model(model: type[T], data: dict[str, Any]) -> T:
    return model.model_validate(prepare_row(data))


def to_models(model: type[T], rows: list[dict[str, Any]]) -> list[T]:
    return [model.model_validate(prepare_row(row)) for row in rows]


def paginate(
    model: type[T],
    items: list[dict[str, Any]],
    *,
    page: int,
    page_size: int,
) -> PaginatedResponse[T]:
    page = max(page, 1)
    page_size = max(min(page_size, 200), 1)
    start = (page - 1) * page_size
    slice_items = items[start : start + page_size]
    return PaginatedResponse[T](
        items=to_models(model, slice_items),
        total=len(items),
        page=page,
        page_size=page_size,
    )
