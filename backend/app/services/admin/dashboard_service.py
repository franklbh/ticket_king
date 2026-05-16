from __future__ import annotations

from datetime import date, timedelta

from app.core.config import settings
from app.schemas.admin.responses import DashboardResponse, HealthResponse
from app.services.admin.normalizers import as_float
from app.services.admin.repository import admin_repository


class DashboardService:
    async def health(self) -> HealthResponse:
        return HealthResponse(
            status="ok",
            database_configured=admin_repository.configured,
            tables={
                "orders": settings.admin_orders_table,
                "tickets": settings.admin_tickets_table,
                "slots": settings.admin_slots_table,
                "ticketTypes": settings.admin_ticket_types_table,
            },
        )

    async def dashboard(self, range_key: str = "7d") -> DashboardResponse:
        days = None if range_key == "all" else {"7d": 7, "14d": 14, "30d": 30, "90d": 90}.get(range_key, 7)
        start = None if days is None else date.today() - timedelta(days=days - 1)
        data = await admin_repository.dashboard(start_date=start, days=days)
        order_summary = data["order_summary"]
        ticket_summary = data["ticket_summary"]
        return DashboardResponse.model_validate({
            "stats": {
                "todayRevenue": round(as_float(order_summary.get("today_revenue")), 2),
                "todayOrders": int(order_summary.get("today_orders") or 0),
                "todayTickets": int(ticket_summary.get("today_tickets") or 0),
                "pendingOrders": int(data.get("pending_orders") or 0),
                "activeSlots": int(data.get("active_slots") or 0),
            },
            "summary": {
                "totalRevenue": round(as_float(order_summary.get("total_revenue")), 2),
                "totalOrders": int(order_summary.get("total_orders") or 0),
                "totalTickets": int(ticket_summary.get("total_tickets") or 0),
            },
            "salesTrend": self._sales_trend(data["order_trend"], data["ticket_trend"], days),
            "ticketDistribution": self._ticket_distribution(data["distribution"]),
            "popularSlots": self._popular_slots(data["popular"]),
        })

    @staticmethod
    def _sales_trend(
        order_rows: list[dict],
        ticket_rows: list[dict],
        days: int | None,
    ) -> list[dict]:
        order_by_day = {
            str(row.get("day"))[:10]: {
                "revenue": as_float(row.get("revenue")),
                "orders": int(row.get("orders") or 0),
            }
            for row in order_rows
            if row.get("day") is not None
        }
        tickets_by_day = {
            str(row.get("day"))[:10]: int(row.get("tickets") or 0)
            for row in ticket_rows
            if row.get("day") is not None
        }
        if days:
            start = date.today() - timedelta(days=days - 1)
            keys = [(start + timedelta(days=i)).isoformat() for i in range(days)]
        else:
            keys = sorted(set(order_by_day) | set(tickets_by_day))
        return [
            {
                "date": key,
                "revenue": round(order_by_day.get(key, {}).get("revenue", 0), 2),
                "orders": order_by_day.get(key, {}).get("orders", 0),
                "tickets": tickets_by_day.get(key, 0),
            }
            for key in keys
        ]

    @staticmethod
    def _ticket_distribution(rows: list[dict]) -> list[dict]:
        colors = ["#1e40af", "#3b82f6", "#93c5fd", "#f59e0b", "#fcd34d", "#10b981"]
        total = sum(int(row.get("value") or 0) for row in rows) or 1
        return [
            {
                "name": row.get("name") or "Unknown",
                "value": int(row.get("value") or 0),
                "percent": round((int(row.get("value") or 0) / total) * 100),
                "color": colors[index % len(colors)],
            }
            for index, row in enumerate(rows)
        ]

    @staticmethod
    def _popular_slots(rows: list[dict]) -> list[dict]:
        result = []
        for row in rows:
            sold = int(row.get("sold") or 0)
            slot_date = str(row.get("slot_date") or "")
            slot_time = str(row.get("slot_time") or "")
            result.append({
                "slot": f"{slot_date} {slot_time}".strip(),
                "sold": sold,
                "total": max(sold, 20),
            })
        return result


dashboard_service = DashboardService()
