from typing import Literal

from pydantic import BaseModel, Field


UserRole = Literal["owner", "administrator", "admin", "customer"]


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


class TicketBatchStatusUpdate(BaseModel):
    ticket_ids: list[str] = Field(alias="ticketIds", min_length=1)
    status: str

    model_config = {"populate_by_name": True}


class TicketRegenerateRequest(BaseModel):
    reason: str | None = None


class OrderStatusUpdate(BaseModel):
    status: str


class OrderCustomerUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None


class OrderSlotUpdate(BaseModel):
    slot_id: int | str = Field(alias="slotId")

    model_config = {"populate_by_name": True}


class OrderCouponUpdate(BaseModel):
    coupon_code: str = Field(alias="couponCode", min_length=1)
    coupon_discount: float = Field(default=0, ge=0, alias="couponDiscount")

    model_config = {"populate_by_name": True}


class OrderEmailRequest(BaseModel):
    reason: str | None = None


class TicketCheckInRequest(BaseModel):
    code: str = Field(min_length=1)


class TicketOverrideCheckInRequest(BaseModel):
    code: str = Field(min_length=1)
    reason: str = Field(min_length=1)


class AdminAccountCreate(BaseModel):
    user_id: str | None = None
    name: str
    email: str
    password: str = Field(min_length=8)
    department: str | None = None
    position: str | None = None
    staff_role: str | None = Field(default=None, alias="staffRole")
    role: Literal["administrator", "admin"] = "administrator"

    model_config = {"populate_by_name": True}


class OwnerBootstrapCreate(BaseModel):
    user_id: str | None = None
    name: str
    email: str
    password: str | None = Field(default=None, min_length=8)


class UserRoleUpdate(BaseModel):
    role: UserRole


class StaffProfileUpdate(BaseModel):
    staff_role: str | None = None
    department: str | None = None
    position: str | None = None
    status: Literal["active", "inactive"] | None = None


class SlotStatusUpdate(BaseModel):
    status: str


class SlotCapacityUpdate(BaseModel):
    total_seats: int = Field(gt=0, alias="totalSeats")
    reason: str | None = None

    model_config = {"populate_by_name": True}


class SlotBatchCreate(BaseModel):
    slots: list["SlotUpsert"] = Field(min_length=1)


class SlotUpsert(BaseModel):
    event: int = 1
    business_date: str = Field(alias="date")
    start_time: str = Field(alias="startTime")
    end_time: str | None = Field(default=None, alias="endTime")
    capacity: int = Field(gt=0, alias="totalSeats")
    base_price: float = Field(ge=0, alias="price")
    status: str = "active"
    timezone: str | None = None
    notes: str | None = None
    slot_code: str | None = Field(default=None, alias="slotCode")

    model_config = {"populate_by_name": True}


class TicketTypeUpsert(BaseModel):
    event: int = 1
    name: str
    price_type: str = Field(default="fixed", alias="priceType")
    price: float | None = None
    price_adj: float = Field(default=0, alias="priceAdj")
    weekdays: list[str] = Field(default_factory=lambda: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"])
    valid_from: str | None = Field(default=None, alias="validFrom")
    valid_to: str | None = Field(default=None, alias="validTo")
    time_start: str | None = Field(default=None, alias="timeStart")
    time_end: str | None = Field(default=None, alias="timeEnd")
    add_on: str | None = Field(default=None, alias="addOn")
    remarks: str | None = None
    status: str = "enabled"

    model_config = {"populate_by_name": True}


class TicketTypeStatusUpdate(BaseModel):
    status: str


class TicketTypeBulkPriceUpdate(BaseModel):
    ids: list[int | str] = Field(min_length=1)
    price: float | None = Field(default=None, ge=0)
    price_adj: float | None = Field(default=None, alias="priceAdj")
    remarks: str | None = None

    model_config = {"populate_by_name": True}


class EventUpsert(BaseModel):
    name: str
    slug: str | None = None
    status: str = "active"


class CouponUpsert(BaseModel):
    code: str = Field(min_length=1)
    source: str = "manual"
    discount_type: str = Field(alias="discountType")
    discount_value: float = Field(ge=0, alias="discountValue")
    min_purchase: float = Field(default=0, ge=0, alias="minPurchase")
    max_uses: int | None = Field(default=None, alias="maxUses")
    valid_from: str | None = Field(default=None, alias="validFrom")
    valid_to: str | None = Field(default=None, alias="validTo")
    remarks: str | None = None
    status: str = "active"

    model_config = {"populate_by_name": True}


class CouponValidationRequest(BaseModel):
    code: str = Field(min_length=1)
    amount: float = Field(default=0, ge=0)


class MarketingRecordCreate(BaseModel):
    recipient_name: str | None = Field(default=None, alias="recipientName")
    recipient_email: str = Field(alias="recipientEmail")
    coupon_code: str | None = Field(default=None, alias="couponCode")
    order_id: str | None = Field(default=None, alias="orderId")

    model_config = {"populate_by_name": True}


class MarketingRecordAction(BaseModel):
    reason: str | None = None


class MarketingTestSendRequest(BaseModel):
    recipient_email: str = Field(alias="recipientEmail")

    model_config = {"populate_by_name": True}


class MarketingSettingsUpdate(BaseModel):
    enabled: bool = False
    send_delay_minutes: int = Field(default=45, alias="sendDelay")
    coupon_validity_days: int = Field(default=30, alias="couponValidity")
    discount_type: str = Field(default="percent", alias="discountType")
    discount_value: float = Field(default=5, ge=0, alias="discountValue")
    min_purchase: float = Field(default=0, ge=0, alias="minPurchase")
    max_uses: int = Field(default=9999, ge=1, alias="maxUses")
    referral_enabled: bool = Field(default=False, alias="referralEnabled")
    referral_reward: float = Field(default=5, ge=0, alias="referralReward")

    model_config = {"populate_by_name": True}
