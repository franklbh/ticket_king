from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field


class AdminModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


T = TypeVar("T")


class PaginatedResponse(AdminModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int = Field(alias="pageSize")
