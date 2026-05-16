from pydantic import BaseModel, Field


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

    model_config = {"populate_by_name": True}
