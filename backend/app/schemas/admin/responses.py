from typing import Any, Literal

from pydantic import Field

from app.schemas.admin.common import AdminModel, PaginatedResponse


class HealthResponse(AdminModel):
    status: str
    database_configured: bool = Field(alias="databaseConfigured")
    tables: dict[str, str]


class ActionResponse(AdminModel):
    ok: bool = True
    message: str | None = None
    id: str | int | None = None


class CouponValidationResponse(AdminModel):
    valid: bool
    code: str
    discount: float = 0
    reason: str | None = None


class CouponQrResponse(AdminModel):
    code: str
    payload: str


class TicketTypeValidationResponse(AdminModel):
    valid: bool
    conflicts: list[dict[str, Any]] = Field(default_factory=list)


class CustomerInfo(AdminModel):
    name: str
    email: str | None = None
    phone: str | None = None


class SlotInfo(AdminModel):
    date: str | None = None
    start_time: str | None = Field(default=None, alias="startTime")
    end_time: str | None = Field(default=None, alias="endTime")
    event_name: str | None = Field(default=None, alias="eventName")


class TicketCountInfo(AdminModel):
    total: int = 0
    completed: int = 0
    not_used: int = Field(default=0, alias="notUsed")


class OrderRead(AdminModel):
    id: str
    user: CustomerInfo
    email_status: str = Field(alias="emailStatus")
    slot: SlotInfo
    slots: list[SlotInfo] = Field(default_factory=list)
    ticket_details: Any = Field(alias="ticketDetails")
    ticket_count: TicketCountInfo = Field(alias="ticketCount")
    amount: float = 0
    coupon_code: str | None = Field(default=None, alias="couponCode")
    coupon_discount: float = Field(default=0, alias="couponDiscount")
    remarks: str | None = None
    status: str
    payment_method: str | None = Field(default=None, alias="paymentMethod")
    created_at: str | None = Field(default=None, alias="createdAt")
    created_by: str | None = Field(default=None, alias="createdBy")
    ip: str | None = None


class TicketRead(AdminModel):
    id: str | None = None
    code: str
    qr_code: str | None = Field(default=None, alias="qrCode")
    order_id: str = Field(alias="orderId")
    order_user: str | None = Field(default=None, alias="orderUser")
    order_email: str | None = Field(default=None, alias="orderEmail")
    order_payment: str | None = Field(default=None, alias="orderPayment")
    remarks: str | None = None
    ticket_type: str = Field(alias="ticketType")
    slot_date: str | None = Field(default=None, alias="slotDate")
    slot_start: str | None = Field(default=None, alias="slotStart")
    slot_end: str | None = Field(default=None, alias="slotEnd")
    event_name: str | None = Field(default=None, alias="eventName")
    status: str
    verified_at: str | None = Field(default=None, alias="verifiedAt")
    created_at: str | None = Field(default=None, alias="createdAt")


class SlotRead(AdminModel):
    id: str | None = None
    event: int | None = None
    date: str | None = None
    start_time: str | None = Field(default=None, alias="startTime")
    end_time: str | None = Field(default=None, alias="endTime")
    price: float = 0
    total_seats: int = Field(default=0, alias="totalSeats")
    website_seats: int = Field(default=0, alias="websiteSeats")
    in_store_seats: int = Field(default=0, alias="inStoreSeats")
    status: str = "active"


class TicketTypeRead(AdminModel):
    id: str | None = None
    name: str
    event: int | None = None
    price_type: str = Field(alias="priceType")
    price: float | None = None
    price_adj: float = Field(default=0, alias="priceAdj")
    weekdays: list[str] = Field(default_factory=list)
    valid_from: str | None = Field(default=None, alias="validFrom")
    valid_to: str | None = Field(default=None, alias="validTo")
    time_start: str | None = Field(default=None, alias="timeStart")
    time_end: str | None = Field(default=None, alias="timeEnd")
    add_on: str | None = Field(default=None, alias="addOn")
    remarks: str | None = None
    status: str = "enabled"


class EventRead(AdminModel):
    id: int | None = None
    name: str
    slug: str | None = None
    status: str = "active"


class CouponRead(AdminModel):
    id: int | None = None
    code: str
    source: str = "manual"
    discount_type: str = Field(alias="discountType")
    discount_value: float = Field(alias="discountValue")
    min_purchase: float = Field(default=0, alias="minPurchase")
    max_uses: int | None = Field(default=None, alias="maxUses")
    used_count: int = Field(default=0, alias="usedCount")
    total_amount: float = Field(default=0, alias="totalAmount")
    valid_from: str | None = Field(default=None, alias="validFrom")
    valid_to: str | None = Field(default=None, alias="validTo")
    remarks: str | None = None
    status: str = "active"
    created_at: str | None = Field(default=None, alias="createdAt")
    updated_at: str | None = Field(default=None, alias="updatedAt")


class MarketingSettingsRead(AdminModel):
    enabled: bool = False
    send_delay: int = Field(default=45, alias="sendDelay")
    coupon_validity: int = Field(default=30, alias="couponValidity")
    discount_type: str = Field(default="percent", alias="discountType")
    discount_value: float = Field(default=5, alias="discountValue")
    min_purchase: float = Field(default=0, alias="minPurchase")
    max_uses: int = Field(default=9999, alias="maxUses")
    referral_enabled: bool = Field(default=False, alias="referralEnabled")
    referral_reward: float = Field(default=5, alias="referralReward")
    updated_at: str | None = Field(default=None, alias="updatedAt")


class MarketingRecordRead(AdminModel):
    id: int | None = None
    recipient_name: str | None = Field(default=None, alias="recipientName")
    recipient_email: str | None = Field(default=None, alias="recipientEmail")
    coupon_code: str | None = Field(default=None, alias="couponCode")
    order_id: str | None = Field(default=None, alias="orderId")
    status: str = "pending"
    coupon_used: bool = Field(default=False, alias="couponUsed")
    sent_at: str | None = Field(default=None, alias="sentAt")
    created_at: str | None = Field(default=None, alias="createdAt")


class ActivityLogRead(AdminModel):
    id: int | str | None = None
    admin: str
    admin_id: str | None = Field(default=None, alias="adminId")
    action_type: str = Field(alias="actionType")
    target_type: str | None = Field(default=None, alias="targetType")
    target_id: str | None = Field(default=None, alias="targetId")
    action_details: Any = Field(default_factory=dict, alias="actionDetails")
    login_info: str | None = Field(default=None, alias="loginInfo")
    timestamp: str | None = None


class DashboardStats(AdminModel):
    today_revenue: float = Field(alias="todayRevenue")
    today_orders: int = Field(alias="todayOrders")
    today_tickets: int = Field(alias="todayTickets")
    pending_orders: int = Field(alias="pendingOrders")
    active_slots: int = Field(alias="activeSlots")


class DashboardSummary(AdminModel):
    total_revenue: float = Field(alias="totalRevenue")
    total_orders: int = Field(alias="totalOrders")
    total_tickets: int = Field(alias="totalTickets")


class SalesTrendPoint(AdminModel):
    date: str
    revenue: float = 0
    orders: int = 0
    tickets: int = 0


class TicketDistributionSlice(AdminModel):
    name: str
    value: int = 0
    percent: float = 0
    color: str


class PopularSlotPoint(AdminModel):
    slot: str
    sold: int = 0
    total: int = 20


class DashboardResponse(AdminModel):
    stats: DashboardStats
    summary: DashboardSummary
    sales_trend: list[SalesTrendPoint] = Field(alias="salesTrend")
    ticket_distribution: list[TicketDistributionSlice] = Field(alias="ticketDistribution")
    popular_slots: list[PopularSlotPoint] = Field(alias="popularSlots")


class EventIncomeItem(AdminModel):
    event_id: int = Field(alias="eventId")
    event_name: str = Field(alias="eventName")
    revenue: float


class ReportRow(AdminModel):
    date: str | None = None
    ip_brand: str | None = Field(default=None, alias="ipBrand")
    event_name: str | None = Field(default=None, alias="eventName")
    ticket_type: str | None = Field(default=None, alias="ticketType")
    ticket_status: str | None = Field(default=None, alias="ticketStatus")
    checked_in_at: str | None = Field(default=None, alias="checkedInAt")
    order_date: str | None = Field(default=None, alias="orderDate")
    slot_time: str | None = Field(default=None, alias="slotTime")
    order_id: str | None = Field(default=None, alias="orderId")
    ticket_amount: float = Field(default=0, alias="ticketAmount")
    payment_method: str | None = Field(default=None, alias="paymentMethod")
    remarks: str | None = None


class WalkInOrderResponse(AdminModel):
    order: OrderRead
    tickets: list[TicketRead]


class CheckInResponse(AdminModel):
    result: Literal["checked_in", "already_used", "voided"]
    ticket: TicketRead


class UserRead(AdminModel):
    id: str | None = None
    email: str | None = None
    name: str | None = None
    username: str | None = None
    role: str | None = None
    staff_role: str | None = Field(default=None, alias="staffRole")
    department: str | None = None
    position: str | None = None
    status: str | None = None
    last_login_at: str | None = Field(default=None, alias="lastLoginAt")
    last_login_ip: str | None = Field(default=None, alias="lastLoginIp")
    created_at: str | None = Field(default=None, alias="createdAt")
    updated_at: str | None = Field(default=None, alias="updatedAt")


class BatchActionResponse(AdminModel):
    ok: bool = True
    updated: int = 0
    ids: list[str] = Field(default_factory=list)


OrderPage = PaginatedResponse[OrderRead]
TicketPage = PaginatedResponse[TicketRead]
ActivityLogPage = PaginatedResponse[ActivityLogRead]
MarketingRecordPage = PaginatedResponse[MarketingRecordRead]
