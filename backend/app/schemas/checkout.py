from decimal import Decimal

from pydantic import BaseModel, Field


class CheckoutCustomer(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    remarks: str | None = None


class CheckoutItem(BaseModel):
    event_id: int = Field(alias="eventId")
    slot_id: str = Field(alias="slotId")
    ticket_type_id: int | None = Field(default=None, alias="ticketTypeId")
    event_name: str = Field(alias="eventName")
    slot_date: str = Field(alias="slotDate")
    slot_time: str = Field(alias="slotTime")
    ticket_type: str = Field(alias="ticketType")
    quantity: int = Field(gt=0)
    unit_price: Decimal = Field(alias="unitPrice", ge=0)

    model_config = {"populate_by_name": True}


class CheckoutOrder(BaseModel):
    customer: CheckoutCustomer = Field(default_factory=CheckoutCustomer)
    items: list[CheckoutItem] = Field(min_length=1)
    coupon_code: str | None = Field(default=None, alias="couponCode")
    coupon_discount: Decimal = Field(default=Decimal("0"), alias="couponDiscount", ge=0)
    addon_amount: Decimal = Field(default=Decimal("0"), alias="addonAmount", ge=0)
    platform_fee: Decimal = Field(default=Decimal("0"), alias="platformFee", ge=0)
    payment_fee: Decimal = Field(default=Decimal("0"), alias="paymentFee", ge=0)
    gst: Decimal = Field(default=Decimal("0"), ge=0)
    pst: Decimal = Field(default=Decimal("0"), ge=0)
    total_amount: Decimal | None = Field(default=None, alias="totalAmount", ge=0)
    ip: str | None = None

    model_config = {"populate_by_name": True}
