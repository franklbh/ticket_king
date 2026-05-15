from typing import Literal

from pydantic import BaseModel, Field


UserRole = Literal["owner", "administrator", "customer"]


class CustomerInput(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    remarks: str | None = None


class WalkInTicketInput(BaseModel):
    ticket_type_id: int | str | None = None
    ticket_type: str
    quantity: int = Field(gt=0)
    unit_price: float = Field(ge=0)


class WalkInOrderCreate(BaseModel):
    slot_id: int | str | None = None
    slot_date: str
    slot_start_time: str
    slot_end_time: str | None = None
    tickets: list[WalkInTicketInput]
    customer: CustomerInput = Field(default_factory=CustomerInput)
    payment_method: str
    mark_used_immediately: bool = False


class TicketStatusUpdate(BaseModel):
    status: str


class AdminAccountCreate(BaseModel):
    name: str
    username: str
    email: str
    password: str = Field(min_length=8)
    role: Literal["administrator"] = "administrator"


class OwnerBootstrapCreate(BaseModel):
    name: str
    username: str
    email: str
    password: str = Field(min_length=8)


class UserRoleUpdate(BaseModel):
    role: UserRole
