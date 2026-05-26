from pydantic import BaseModel, Field


class SlotTicketTypeRead(BaseModel):
    id: str
    label: str
    price: float
    min_qty: int = Field(default=1, alias="minQty")

    model_config = {"populate_by_name": True}


class AvailableSlotRead(BaseModel):
    id: str
    event_id: int = Field(alias="eventId")
    date: str
    start_time: str = Field(alias="startTime")
    end_time: str | None = Field(default=None, alias="endTime")
    label: str
    capacity: int
    available_seats: int = Field(alias="availableSeats")
    price: float | None = None
    status: str
    ticket_types: list[SlotTicketTypeRead] = Field(default_factory=list, alias="ticketTypes")

    model_config = {"populate_by_name": True}
