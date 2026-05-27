from fastapi import APIRouter, Depends, Query

from app.schemas.admin.responses import ReportRow
from app.services.admin.normalizers import as_float
from app.services.admin.repository import admin_repository
from app.services.admin.security import PARTNER, require_permission

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/comprehensive", response_model=list[ReportRow])
async def get_comprehensive_report(
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    headset_brand: str | None = Query(None),
    event_ids: str | None = Query(None),
    ticket_types: str | None = Query(None),
    ticket_statuses: str | None = Query(None),
    payment_methods: str | None = Query(None),
    user: dict = Depends(require_permission("reports:read")),
) -> list[ReportRow]:
    if (user.get("role") or "").lower() == PARTNER:
        headset_brand = user.get("department")

    filters = {
        "date_from": date_from,
        "date_to": date_to,
        "headset_brand": headset_brand,
        "event_ids": [int(i) for i in event_ids.split(",") if i] if event_ids else None,
        "ticket_types": ticket_types.split(",") if ticket_types else None,
        "ticket_statuses": ticket_statuses.split(",") if ticket_statuses else None,
        "payment_methods": payment_methods.split(",") if payment_methods else None,
    }
    rows = await admin_repository.report(filters={k: v for k, v in filters.items() if v})
    return [
        {
            "ipBrand": row.get("ip_brand"),
            "eventName": row.get("event_name"),
            "ticketType": row.get("ticket_type"),
            "ticketStatus": row.get("ticket_status"),
            "checkedInAt": str(row["checked_in_at"])[:19] if row.get("checked_in_at") else None,
            "orderDate": str(row["order_date"])[:10] if row.get("order_date") else None,
            "date": str(row["date"])[:10] if row.get("date") else None,
            "slotTime": row.get("slot_time"),
            "orderId": str(row.get("order_id") or ""),
            "ticketAmount": round(as_float(row.get("ticket_amount")), 2),
            "paymentMethod": row.get("payment_method"),
            "remarks": row.get("remarks"),
        }
        for row in rows
    ]
