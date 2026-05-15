from __future__ import annotations

import csv
import io
import secrets
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta
from typing import Any

from app.core.config import settings
from app.core.admin_db import supabase
from app.schemas.admin import TicketStatusUpdate, WalkInOrderCreate
from app.services.normalizers import (
    as_float,
    db_order_status,
    db_ticket_status,
    normalize_order,
    normalize_order_status,
    normalize_slot,
    normalize_ticket,
    normalize_ticket_status,
    normalize_ticket_type,
    pick,
    to_date_string,
)


class AdminDataService:
    async def health(self) -> dict[str, Any]:
        return {
            "status": "ok",
            "databaseConfigured": supabase.configured,
            "tables": {
                "orders": settings.admin_orders_table,
                "tickets": settings.admin_tickets_table,
                "slots": settings.admin_slots_table,
                "ticketTypes": settings.admin_ticket_types_table,
            },
        }

    async def dashboard(self, range_key: str = "7d") -> dict[str, Any]:
        orders, tickets, slots = await self._load_dashboard_rows()
        today = date.today().isoformat()

        today_orders = [o for o in orders if (o.get("createdAt") or "").startswith(today)]
        today_tickets = [t for t in tickets if (t.get("createdAt") or "").startswith(today)]
        pending_orders = [o for o in orders if o.get("status") == "pending"]
        active_slots = [s for s in slots if s.get("status") == "active"]

        trend_orders = self._filter_by_range(orders, range_key, "createdAt")
        trend_tickets = self._filter_by_range(tickets, range_key, "createdAt")

        return {
            "stats": {
                "todayRevenue": round(sum(as_float(o.get("amount")) for o in today_orders), 2),
                "todayOrders": len(today_orders),
                "todayTickets": len(today_tickets),
                "pendingOrders": len(pending_orders),
                "activeSlots": len(active_slots),
            },
            "summary": {
                "totalRevenue": round(sum(as_float(o.get("amount")) for o in trend_orders), 2),
                "totalOrders": len(trend_orders),
                "totalTickets": len(trend_tickets),
            },
            "salesTrend": self._sales_trend(trend_orders, trend_tickets, range_key),
            "ticketDistribution": self._ticket_distribution(trend_tickets),
            "popularSlots": self._popular_slots(slots, tickets),
        }

    async def list_orders(self, filters: dict[str, Any]) -> dict[str, Any]:
        tickets = await self._tickets()
        ticket_counts = self._ticket_counts(tickets)
        rows = await supabase.select(settings.admin_orders_table)
        orders = [normalize_order(row, ticket_counts) for row in rows]
        orders = self._filter_orders(orders, filters)
        orders.sort(key=lambda row: row.get("createdAt") or "", reverse=True)
        return self._paginate(orders, filters.get("page", 1), filters.get("page_size", 25))

    async def export_orders_csv(self, filters: dict[str, Any]) -> str:
        filters = filters | {"page": 1, "page_size": settings.max_table_rows}
        data = await self.list_orders(filters)
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "Order ID",
            "Customer Name",
            "Email",
            "Phone",
            "Email Status",
            "Slot Date",
            "Slot Time",
            "Ticket Total",
            "Amount",
            "Coupon Discount",
            "Coupon Code",
            "Remarks",
            "Status",
            "Payment Method",
            "Created At",
            "Created By",
            "IP",
        ])
        for order in data["items"]:
            writer.writerow([
                order["id"],
                order["user"].get("name"),
                order["user"].get("email"),
                order["user"].get("phone"),
                order.get("emailStatus"),
                order["slot"].get("date"),
                f"{order['slot'].get('startTime') or ''}-{order['slot'].get('endTime') or ''}".strip("-"),
                order["ticketCount"].get("total"),
                order.get("amount"),
                order.get("couponDiscount"),
                order.get("couponCode"),
                order.get("remarks"),
                order.get("status"),
                order.get("paymentMethod"),
                order.get("createdAt"),
                order.get("createdBy"),
                order.get("ip"),
            ])
        return output.getvalue()

    async def list_tickets(self, filters: dict[str, Any]) -> dict[str, Any]:
        tickets = await self._tickets()
        tickets = self._filter_tickets(tickets, filters)
        tickets.sort(key=lambda row: row.get("createdAt") or "", reverse=True)
        return self._paginate(tickets, filters.get("page", 1), filters.get("page_size", 25))

    async def export_tickets_csv(self, filters: dict[str, Any]) -> str:
        filters = filters | {"page": 1, "page_size": settings.max_table_rows}
        data = await self.list_tickets(filters)
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "#",
            "Verification Code",
            "Order ID",
            "Customer",
            "Email",
            "Payment Method",
            "Remarks",
            "Ticket Type",
            "Slot Date",
            "Slot Time",
            "Status",
            "Verified At",
            "Order Created At",
        ])
        for index, ticket in enumerate(data["items"], start=1):
            writer.writerow([
                index,
                ticket.get("code"),
                ticket.get("orderId"),
                ticket.get("orderUser"),
                ticket.get("orderEmail"),
                ticket.get("orderPayment"),
                ticket.get("remarks"),
                ticket.get("ticketType"),
                ticket.get("slotDate"),
                f"{ticket.get('slotStart') or ''}-{ticket.get('slotEnd') or ''}".strip("-"),
                ticket.get("status"),
                ticket.get("verifiedAt"),
                ticket.get("createdAt"),
            ])
        return output.getvalue()

    async def update_ticket_status(self, ticket_id: str, update: TicketStatusUpdate) -> dict[str, Any]:
        status = normalize_ticket_status(update.status)
        values = {
            settings.admin_ticket_status_column: db_ticket_status(status),
        }
        if status == "used":
            values["check_in_at"] = datetime.utcnow().isoformat(timespec="seconds")
        elif status in {"not_used", "voided"}:
            values["check_in_at"] = None

        rows = await supabase.update(
            settings.admin_tickets_table,
            match_column=settings.admin_ticket_id_column,
            match_value=ticket_id,
            values=values,
        )
        return normalize_ticket(rows[0]) if rows else {"id": ticket_id, "status": status}

    async def list_slots(self, date_from: str | None = None, date_to: str | None = None) -> list[dict[str, Any]]:
        rows = await supabase.select(settings.admin_slots_table)
        slots = [normalize_slot(row) for row in rows]
        if date_from:
            slots = [slot for slot in slots if (slot.get("date") or "") >= date_from]
        if date_to:
            slots = [slot for slot in slots if (slot.get("date") or "") <= date_to]
        slots.sort(key=lambda slot: (slot.get("date") or "", slot.get("startTime") or ""))
        return slots

    async def list_ticket_types(self, enabled_only: bool = False) -> list[dict[str, Any]]:
        rows = await supabase.select(settings.admin_ticket_types_table)
        types = [normalize_ticket_type(row) for row in rows]
        if enabled_only:
            types = [row for row in types if row.get("status") == "enabled"]
        types.sort(key=lambda row: (str(row.get("name") or ""), str(row.get("id") or "")))
        return types

    async def create_walk_in_order(self, payload: WalkInOrderCreate) -> dict[str, Any]:
        now = datetime.utcnow().isoformat(timespec="seconds")
        order_id = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        total_amount = round(sum(item.quantity * item.unit_price for item in payload.tickets), 2)
        gst = round(total_amount * 0.05, 2)
        total_due = round(total_amount + gst, 2)
        ticket_summary = ", ".join(f"{item.ticket_type} x{item.quantity}" for item in payload.tickets)
        order_status = "completed" if payload.mark_used_immediately else "paid"
        email_status = "not_sent" if payload.mark_used_immediately or not payload.customer.email else "sent"

        order_row = {
            settings.admin_order_id_column: order_id,
            "customer_name": payload.customer.name or "Walk-in customer",
            "email": payload.customer.email,
            "phone": payload.customer.phone,
            "slot_date": payload.slot_date,
            "slot_time": payload.slot_start_time,
            "ticket_details": ticket_summary,
            "ticket_amount": total_amount,
            "gst": gst,
            "total_amount": total_due,
            "remarks": payload.customer.remarks,
            "status": db_order_status(order_status),
            "payment_method": payload.payment_method,
            "email_status": email_status,
            "created_at": now,
        }
        inserted_orders = await supabase.insert(settings.admin_orders_table, order_row)

        ticket_rows = []
        for item in payload.tickets:
            for _ in range(item.quantity):
                code = self._verification_code()
                ticket_rows.append({
                    "order_id": order_id,
                    "verification_code": code,
                    "qr_code": code,
                    "slot_date": payload.slot_date,
                    "slot_time": self._slot_time_label(payload.slot_start_time, payload.slot_end_time),
                    "ticket_type": item.ticket_type,
                    settings.admin_ticket_status_column: db_ticket_status("used" if payload.mark_used_immediately else "not_used"),
                    "check_in_at": now if payload.mark_used_immediately else None,
                    "net_ticket_amount": item.unit_price,
                    "original_ticket_amount": item.unit_price,
                    "order_status": db_order_status(order_status),
                    "memo": payload.customer.remarks,
                    "payment_method": payload.payment_method,
                    "created_at": now,
                })
        inserted_tickets = await supabase.insert(settings.admin_tickets_table, ticket_rows) if ticket_rows else []
        normalized_order = normalize_order(inserted_orders[0] if inserted_orders else order_row)
        return {
            "order": normalized_order,
            "tickets": [normalize_ticket(ticket) for ticket in inserted_tickets],
        }

    async def _load_dashboard_rows(self) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
        tickets = await self._tickets()
        counts = self._ticket_counts(tickets)
        order_rows = await supabase.select(settings.admin_orders_table)
        slot_rows = await supabase.select(settings.admin_slots_table)
        return (
            [normalize_order(row, counts) for row in order_rows],
            tickets,
            [normalize_slot(row) for row in slot_rows],
        )

    async def _tickets(self) -> list[dict[str, Any]]:
        rows = await supabase.select(settings.admin_tickets_table)
        return [normalize_ticket(row) for row in rows]

    @staticmethod
    def _ticket_counts(tickets: list[dict[str, Any]]) -> dict[str, dict[str, int]]:
        counts: dict[str, dict[str, int]] = defaultdict(lambda: {"total": 0, "used": 0})
        for ticket in tickets:
            order_id = str(ticket.get("orderId") or "")
            if not order_id:
                continue
            counts[order_id]["total"] += 1
            if ticket.get("status") == "used":
                counts[order_id]["used"] += 1
        return counts

    @staticmethod
    def _filter_orders(orders: list[dict[str, Any]], filters: dict[str, Any]) -> list[dict[str, Any]]:
        result = orders
        if filters.get("order_id"):
            needle = str(filters["order_id"]).lower()
            result = [row for row in result if needle in row["id"].lower()]
        if filters.get("user_info"):
            needle = str(filters["user_info"]).lower()
            result = [
                row for row in result
                if needle in " ".join(str(value or "") for value in row["user"].values()).lower()
            ]
        if filters.get("status"):
            statuses = {normalize_order_status(item) for item in str(filters["status"]).split(",")}
            result = [row for row in result if row.get("status") in statuses]
        if filters.get("order_date_from"):
            result = [row for row in result if (row.get("createdAt") or "")[:10] >= filters["order_date_from"]]
        if filters.get("order_date_to"):
            result = [row for row in result if (row.get("createdAt") or "")[:10] <= filters["order_date_to"]]
        if filters.get("slot_date_from"):
            result = [row for row in result if (row["slot"].get("date") or "") >= filters["slot_date_from"]]
        if filters.get("slot_date_to"):
            result = [row for row in result if (row["slot"].get("date") or "") <= filters["slot_date_to"]]
        return result

    @staticmethod
    def _filter_tickets(tickets: list[dict[str, Any]], filters: dict[str, Any]) -> list[dict[str, Any]]:
        result = tickets
        if filters.get("code"):
            needle = str(filters["code"]).lower()
            result = [row for row in result if needle in str(row.get("code") or "").lower()]
        if filters.get("order_id"):
            needle = str(filters["order_id"]).lower()
            result = [row for row in result if needle in str(row.get("orderId") or "").lower()]
        if filters.get("status") and filters["status"] != "all":
            status = normalize_ticket_status(filters["status"])
            result = [row for row in result if row.get("status") == status]
        if filters.get("slot_date_from"):
            result = [row for row in result if (row.get("slotDate") or "") >= filters["slot_date_from"]]
        if filters.get("slot_date_to"):
            result = [row for row in result if (row.get("slotDate") or "") <= filters["slot_date_to"]]
        if filters.get("verified_from"):
            result = [row for row in result if (row.get("verifiedAt") or "")[:10] >= filters["verified_from"]]
        if filters.get("verified_to"):
            result = [row for row in result if (row.get("verifiedAt") or "")[:10] <= filters["verified_to"]]
        if filters.get("ticket_type"):
            types = {item.strip() for item in str(filters["ticket_type"]).split(",") if item.strip()}
            result = [row for row in result if row.get("ticketType") in types]
        return result

    @staticmethod
    def _paginate(items: list[dict[str, Any]], page: int, page_size: int) -> dict[str, Any]:
        page = max(page, 1)
        page_size = max(min(page_size, 200), 1)
        start = (page - 1) * page_size
        end = start + page_size
        return {
            "items": items[start:end],
            "total": len(items),
            "page": page,
            "pageSize": page_size,
        }

    @staticmethod
    def _filter_by_range(rows: list[dict[str, Any]], range_key: str, field: str) -> list[dict[str, Any]]:
        if range_key == "all":
            return rows
        days = {"7d": 7, "14d": 14, "30d": 30, "90d": 90}.get(range_key, 7)
        start = date.today() - timedelta(days=days - 1)
        return [row for row in rows if (row.get(field) or "")[:10] >= start.isoformat()]

    @staticmethod
    def _sales_trend(orders: list[dict[str, Any]], tickets: list[dict[str, Any]], range_key: str) -> list[dict[str, Any]]:
        order_revenue: dict[str, float] = defaultdict(float)
        order_count: Counter[str] = Counter()
        ticket_count: Counter[str] = Counter()
        for order in orders:
            key = (order.get("createdAt") or "")[:10]
            if key:
                order_revenue[key] += as_float(order.get("amount"))
                order_count[key] += 1
        for ticket in tickets:
            key = (ticket.get("createdAt") or "")[:10]
            if key:
                ticket_count[key] += 1
        keys = sorted(set(order_revenue) | set(order_count) | set(ticket_count))
        if range_key != "all":
            days = {"7d": 7, "14d": 14, "30d": 30, "90d": 90}.get(range_key, 7)
            start = date.today() - timedelta(days=days - 1)
            keys = [(start + timedelta(days=i)).isoformat() for i in range(days)]
        return [
            {
                "date": key,
                "revenue": round(order_revenue[key], 2),
                "orders": order_count[key],
                "tickets": ticket_count[key],
            }
            for key in keys
        ]

    @staticmethod
    def _ticket_distribution(tickets: list[dict[str, Any]]) -> list[dict[str, Any]]:
        colors = ["#1e40af", "#3b82f6", "#93c5fd", "#f59e0b", "#fcd34d", "#10b981"]
        counts = Counter(ticket.get("ticketType") or "Unknown" for ticket in tickets)
        total = sum(counts.values()) or 1
        return [
            {
                "name": name,
                "value": count,
                "percent": round((count / total) * 100),
                "color": colors[index % len(colors)],
            }
            for index, (name, count) in enumerate(counts.most_common())
        ]

    @staticmethod
    def _popular_slots(slots: list[dict[str, Any]], tickets: list[dict[str, Any]]) -> list[dict[str, Any]]:
        ticket_counts = Counter(
            f"{ticket.get('slotDate')} {ticket.get('slotStart')}:00"
            for ticket in tickets
            if ticket.get("slotDate") and ticket.get("slotStart")
        )
        slot_capacity = {
            f"{slot.get('date')} {slot.get('startTime')}:00": slot.get("totalSeats") or 20
            for slot in slots
            if slot.get("date") and slot.get("startTime")
        }
        rows = [
            {"slot": key, "sold": sold, "total": slot_capacity.get(key, max(sold, 20))}
            for key, sold in ticket_counts.items()
            if sold > 0
        ]
        return sorted(rows, key=lambda row: row["sold"], reverse=True)[:10]

    @staticmethod
    def _verification_code() -> str:
        return f"{datetime.utcnow():%y%m%d}{secrets.randbelow(9000000) + 1000000}"

    @staticmethod
    def _slot_time_label(start: str, end: str | None) -> str:
        return f"{start}-{end}" if end else start


admin_data_service = AdminDataService()
