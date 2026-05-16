from __future__ import annotations

import csv
import io
import secrets
import uuid
from collections import Counter, defaultdict
from datetime import date, timedelta
from typing import Any

from fastapi import HTTPException, status

from app.core.config import settings
from app.services.admin.repository import admin_repository
from app.schemas.admin import TicketCheckInRequest, TicketStatusUpdate, WalkInOrderCreate
from app.services.admin.normalizers import (
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
from app.utils.datetime import utc_now, utc_now_iso_seconds


class AdminDataService:
    async def health(self) -> dict[str, Any]:
        return {
            "status": "ok",
            "databaseConfigured": admin_repository.configured,
            "tables": {
                "orders": settings.admin_orders_table,
                "tickets": settings.admin_tickets_table,
                "slots": settings.admin_slots_table,
                "ticketTypes": settings.admin_ticket_types_table,
            },
        }

    async def dashboard(self, range_key: str = "7d") -> dict[str, Any]:
        days = None if range_key == "all" else {"7d": 7, "14d": 14, "30d": 30, "90d": 90}.get(range_key, 7)
        start = None if days is None else date.today() - timedelta(days=days - 1)
        data = await admin_repository.dashboard(start_date=start, days=days)
        order_summary = data["order_summary"]
        ticket_summary = data["ticket_summary"]

        return {
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
            "salesTrend": self._sales_trend_from_rows(data["order_trend"], data["ticket_trend"], days),
            "ticketDistribution": self._ticket_distribution_from_rows(data["distribution"]),
            "popularSlots": self._popular_slots_from_rows(data["popular"]),
        }

    async def list_orders(self, filters: dict[str, Any]) -> dict[str, Any]:
        table_rows = await admin_repository.select_many([
            settings.admin_tickets_table,
            settings.admin_orders_table,
        ])
        ticket_rows = table_rows[settings.admin_tickets_table]
        rows = table_rows[settings.admin_orders_table]
        ticket_counts = self._ticket_counts([normalize_ticket(row) for row in ticket_rows])
        orders = [normalize_order(row, ticket_counts) for row in rows]
        orders = self._filter_orders(orders, filters)
        orders.sort(key=lambda row: row.get("createdAt") or "", reverse=True)
        return self._paginate(orders, filters.get("page", 1), filters.get("page_size", 25))

    async def export_orders_csv(
        self,
        filters: dict[str, Any],
        actor: dict[str, Any] | None = None,
        client_ip: str | None = None,
    ) -> str:
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
        csv_body = output.getvalue()
        if actor:
            await self._audit_log(actor, "Export", "Order", None, {"filters": filters, "rows": len(data["items"])}, client_ip)
        return csv_body

    async def list_tickets(self, filters: dict[str, Any]) -> dict[str, Any]:
        tickets = await self._tickets()
        tickets = self._filter_tickets(tickets, filters)
        tickets.sort(key=lambda row: row.get("createdAt") or "", reverse=True)
        return self._paginate(tickets, filters.get("page", 1), filters.get("page_size", 25))

    async def export_tickets_csv(
        self,
        filters: dict[str, Any],
        actor: dict[str, Any] | None = None,
        client_ip: str | None = None,
    ) -> str:
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
        csv_body = output.getvalue()
        if actor:
            await self._audit_log(actor, "Export", "Ticket", None, {"filters": filters, "rows": len(data["items"])}, client_ip)
        return csv_body

    async def update_ticket_status(
        self,
        ticket_id: str,
        update: TicketStatusUpdate,
        actor: dict[str, Any],
        client_ip: str | None = None,
    ) -> dict[str, Any]:
        ticket_status = normalize_ticket_status(update.status)
        values = {
            settings.admin_ticket_status_column: db_ticket_status(ticket_status),
            "updated_at": utc_now_iso_seconds(),
        }
        if ticket_status == "used":
            values["checked_in_at"] = utc_now_iso_seconds()
            values["checked_in_by"] = actor.get("id")
        elif ticket_status in {"not_used", "voided"}:
            values["checked_in_at"] = None
            values["checked_in_by"] = None

        rows = await admin_repository.update(
            settings.admin_tickets_table,
            match_column=settings.admin_ticket_id_column,
            match_value=ticket_id,
            values=values,
        )
        if not rows:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found.")
        await self._audit_log(
            actor,
            "Update",
            "Ticket",
            ticket_id,
            {"status": ticket_status},
            client_ip,
        )
        return normalize_ticket(rows[0])

    async def list_slots(self, date_from: str | None = None, date_to: str | None = None) -> list[dict[str, Any]]:
        rows = await admin_repository.select(settings.admin_slots_table)
        counts = await self._slot_inventory_counts()
        slots = [
            normalize_slot({**row, **self._slot_counts_for_row(row, counts)})
            for row in rows
        ]
        if date_from:
            slots = [slot for slot in slots if (slot.get("date") or "") >= date_from]
        if date_to:
            slots = [slot for slot in slots if (slot.get("date") or "") <= date_to]
        slots.sort(key=lambda slot: (slot.get("date") or "", slot.get("startTime") or ""))
        return slots

    async def list_ticket_types(self, enabled_only: bool = False) -> list[dict[str, Any]]:
        rows = await admin_repository.select(settings.admin_ticket_types_table)
        types = [normalize_ticket_type(row) for row in rows]
        if enabled_only:
            types = [row for row in types if row.get("status") == "enabled"]
        types.sort(key=lambda row: (str(row.get("name") or ""), str(row.get("id") or "")))
        return types

    async def create_walk_in_order(
        self,
        payload: WalkInOrderCreate,
        actor: dict[str, Any],
        client_ip: str | None = None,
    ) -> dict[str, Any]:
        now = utc_now_iso_seconds()
        order_id = str(uuid.uuid4())
        order_number = self._order_number()
        total_amount = round(sum(item.quantity * item.unit_price for item in payload.tickets), 2)
        gst = round(total_amount * 0.05, 2)
        total_due = round(total_amount + gst, 2)
        order_status = "completed" if payload.mark_used_immediately else "paid"
        ticket_quantity = sum(item.quantity for item in payload.tickets)
        ticket_details = [
            {
                "ticket_type_id": item.ticket_type_id,
                "ticket_type": item.ticket_type,
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "line_total": round(item.quantity * item.unit_price, 2),
            }
            for item in payload.tickets
        ]

        order_row = {
            "id": order_id,
            "order_number": order_number,
            "slot_id": str(payload.slot_id) if payload.slot_id else None,
            "slot_date": payload.slot_date,
            "slot_time": self._slot_time_label(payload.slot_start_time, payload.slot_end_time),
            "customer_name": payload.customer.name or "Walk-in customer",
            "customer_email": payload.customer.email,
            "customer_phone": payload.customer.phone,
            "sales_channel": "walk_in",
            "order_status": db_order_status(order_status),
            "payment_status": "Paid",
            "fulfillment_status": "Completed" if payload.mark_used_immediately else "Pending",
            "payment_method": payload.payment_method,
            "payment_provider": "physical_pos",
            "provider_reference": None,
            "ticket_quantity": ticket_quantity,
            "ticket_details": ticket_details,
            "ticket_amount": total_amount,
            "addon_amount": 0,
            "platform_fee": 0,
            "payment_fee": 0,
            "gst": gst,
            "pst": 0,
            "coupon_discount": 0,
            "admin_adjustment": 0,
            "total_amount": total_due,
            "coupon_code": None,
            "coupon_details": {},
            "remarks": payload.customer.remarks,
            "created_by": actor.get("id"),
            "created_at": now,
            "updated_at": now,
        }
        inserted_orders = await admin_repository.insert(settings.admin_orders_table, order_row)

        ticket_rows = []
        for item in payload.tickets:
            for _ in range(item.quantity):
                code = self._verification_code()
                ticket_id = str(uuid.uuid4())
                ticket_rows.append({
                    "id": ticket_id,
                    "ticket_number": self._ticket_number(),
                    "order_id": order_id,
                    "slot_id": str(payload.slot_id) if payload.slot_id else None,
                    "verification_code": code,
                    "slot_date": payload.slot_date,
                    "slot_time": self._slot_time_label(payload.slot_start_time, payload.slot_end_time),
                    "ticket_type": item.ticket_type,
                    settings.admin_ticket_status_column: db_ticket_status("used" if payload.mark_used_immediately else "not_used"),
                    "qr_payload": f"ticket:{code}",
                    "net_ticket_amount": item.unit_price,
                    "original_ticket_amount": item.unit_price,
                    "checked_in_at": now if payload.mark_used_immediately else None,
                    "checked_in_by": actor.get("id") if payload.mark_used_immediately else None,
                    "memo": payload.customer.remarks,
                    "created_at": now,
                    "updated_at": now,
                })
        inserted_tickets = await admin_repository.insert(settings.admin_tickets_table, ticket_rows) if ticket_rows else []
        normalized_order = normalize_order(inserted_orders[0] if inserted_orders else order_row)
        await self._audit_log(
            actor,
            "Create",
            "Order",
            order_id,
            {
                "order_number": order_number,
                "sales_channel": "walk_in",
                "ticket_quantity": ticket_quantity,
                "total_amount": total_due,
                "mark_used_immediately": payload.mark_used_immediately,
            },
            client_ip,
        )
        return {
            "order": normalized_order,
            "tickets": [normalize_ticket(ticket) for ticket in inserted_tickets],
        }

    async def check_in_ticket(
        self,
        payload: TicketCheckInRequest,
        actor: dict[str, Any],
        client_ip: str | None = None,
    ) -> dict[str, Any]:
        code = payload.code.strip()
        rows = await admin_repository.select(settings.admin_tickets_table)
        match = next(
            (
                row for row in rows
                if str(row.get("verification_code") or "") == code
                or str(row.get("qr_payload") or "") == code
                or str(row.get("qr_payload") or "").endswith(f":{code}")
            ),
            None,
        )
        if not match:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found.")

        ticket = normalize_ticket(match)
        if ticket["status"] == "used":
            return {"result": "already_used", "ticket": ticket}
        if ticket["status"] == "voided":
            return {"result": "voided", "ticket": ticket}

        now = utc_now_iso_seconds()
        updated = await admin_repository.update(
            settings.admin_tickets_table,
            match_column=settings.admin_ticket_id_column,
            match_value=str(match.get(settings.admin_ticket_id_column) or match.get("id")),
            values={
                settings.admin_ticket_status_column: db_ticket_status("used"),
                "checked_in_at": now,
                "checked_in_by": actor.get("id"),
                "updated_at": now,
            },
        )
        normalized = normalize_ticket(updated[0] if updated else match)
        await self._audit_log(
            actor,
            "Check In",
            "Ticket",
            str(normalized.get("id") or ""),
            {"verification_code": normalized.get("code"), "order_id": normalized.get("orderId")},
            client_ip,
        )
        return {"result": "checked_in", "ticket": normalized}

    async def recent_scans(self, minutes: int = 20) -> list[dict[str, Any]]:
        cutoff = utc_now() - timedelta(minutes=minutes)
        rows = await admin_repository.select(settings.admin_tickets_table)
        tickets = [
            normalize_ticket(row)
            for row in rows
            if row.get("checked_in_at")
            and str(row.get("checked_in_at")).replace("T", " ")[:19] >= cutoff.strftime("%Y-%m-%d %H:%M:%S")
        ]
        tickets.sort(key=lambda row: row.get("verifiedAt") or "", reverse=True)
        return tickets[:100]

    async def list_activity_logs(self, filters: dict[str, Any]) -> dict[str, Any]:
        rows = await admin_repository.select(settings.admin_audit_logs_table)
        logs = [self._normalize_activity_log(row) for row in rows]
        logs = self._filter_activity_logs(logs, filters)
        logs.sort(key=lambda row: row.get("timestamp") or "", reverse=True)
        return self._paginate(logs, filters.get("page", 1), filters.get("page_size", 25))

    async def _tickets(self) -> list[dict[str, Any]]:
        rows = await admin_repository.select(settings.admin_tickets_table)
        orders = await self._orders_by_id()
        enriched_rows = [self._merge_ticket_order(row, orders.get(str(row.get("order_id")))) for row in rows]
        return [normalize_ticket(row) for row in enriched_rows]

    async def _orders_by_id(self) -> dict[str, dict[str, Any]]:
        rows = await admin_repository.select(settings.admin_orders_table)
        return {str(row.get("id")): row for row in rows if row.get("id") is not None}

    @staticmethod
    def _merge_ticket_order(ticket: dict[str, Any], order: dict[str, Any] | None) -> dict[str, Any]:
        if not order:
            return ticket
        return {
            **order,
            **ticket,
            "customer_name": order.get("customer_name"),
            "customer_email": order.get("customer_email"),
            "payment_method": order.get("payment_method"),
            "remarks": ticket.get("memo") or order.get("remarks"),
            "order_created_at": order.get("created_at"),
        }

    async def _slot_inventory_counts(self) -> dict[str, dict[str, int]]:
        tickets = await admin_repository.select(settings.admin_tickets_table)
        orders = await self._orders_by_id()
        counts: dict[str, dict[str, int]] = defaultdict(lambda: {"online_sold": 0, "walkin_sold": 0})
        for ticket in tickets:
            key = self._slot_key(ticket)
            if not key:
                continue
            order = orders.get(str(ticket.get("order_id")))
            channel = str((order or {}).get("sales_channel") or "").lower()
            if channel in {"walk_in", "walk-in", "instore", "in_store"}:
                counts[key]["walkin_sold"] += 1
            else:
                counts[key]["online_sold"] += 1
        return dict(counts)

    @staticmethod
    def _slot_key(row: dict[str, Any]) -> str:
        slot_id = row.get("slot_id") or row.get("id")
        if slot_id:
            return str(slot_id)
        slot_date = row.get("slot_date") or row.get("business_date") or row.get("date")
        slot_time = row.get("slot_time") or row.get("slot_time_label")
        return f"{slot_date}|{slot_time}" if slot_date and slot_time else ""

    @staticmethod
    def _slot_counts_for_row(row: dict[str, Any], counts: dict[str, dict[str, int]]) -> dict[str, int]:
        direct = counts.get(str(row.get("id") or row.get("slot_id") or ""))
        if direct:
            return direct
        slot_date = row.get("slot_date") or row.get("business_date") or row.get("date")
        slot_time = row.get("slot_time") or row.get("slot_time_label")
        return counts.get(f"{slot_date}|{slot_time}", {})

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
    def _filter_activity_logs(logs: list[dict[str, Any]], filters: dict[str, Any]) -> list[dict[str, Any]]:
        result = logs
        if filters.get("admin"):
            needle = str(filters["admin"]).lower()
            result = [row for row in result if needle in str(row.get("admin") or "").lower()]
        if filters.get("action_type"):
            allowed = {item.strip() for item in str(filters["action_type"]).split(",") if item.strip()}
            result = [row for row in result if row.get("actionType") in allowed]
        if filters.get("target_type"):
            allowed = {item.strip() for item in str(filters["target_type"]).split(",") if item.strip()}
            result = [row for row in result if row.get("targetType") in allowed]
        if filters.get("target_id"):
            needle = str(filters["target_id"]).lower()
            result = [row for row in result if needle in str(row.get("targetId") or "").lower()]
        if filters.get("date_from"):
            result = [row for row in result if (row.get("timestamp") or "")[:10] >= filters["date_from"]]
        if filters.get("date_to"):
            result = [row for row in result if (row.get("timestamp") or "")[:10] <= filters["date_to"]]
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
    def _sales_trend_from_rows(
        order_rows: list[dict[str, Any]],
        ticket_rows: list[dict[str, Any]],
        days: int | None,
    ) -> list[dict[str, Any]]:
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
    def _ticket_distribution_from_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
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
    def _popular_slots_from_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
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

    @staticmethod
    def _verification_code() -> str:
        return f"{utc_now():%y%m%d}{secrets.randbelow(9000000) + 1000000}"

    @staticmethod
    def _slot_time_label(start: str, end: str | None) -> str:
        return f"{start}-{end}" if end else start

    @staticmethod
    def _order_number() -> str:
        return f"TK{utc_now():%Y%m%d%H%M%S}{secrets.randbelow(9000) + 1000}"

    @staticmethod
    def _ticket_number() -> str:
        return f"T{utc_now():%Y%m%d%H%M%S}{secrets.randbelow(900000) + 100000}"

    async def _audit_log(
        self,
        actor: dict[str, Any],
        action_type: str,
        target_type: str,
        target_id: str | None,
        details: dict[str, Any],
        client_ip: str | None = None,
    ) -> None:
        await admin_repository.insert(
            settings.admin_audit_logs_table,
            {
                "admin_id": actor.get("id"),
                "admin_email": actor.get("email"),
                "admin_name": actor.get("name") or actor.get("username") or actor.get("email"),
                "action_type": action_type,
                "target_type": target_type,
                "target_id": target_id,
                "action_details": details,
                "login_info": client_ip,
                "created_at": utc_now_iso_seconds(),
            },
        )

    @staticmethod
    def _normalize_activity_log(row: dict[str, Any]) -> dict[str, Any]:
        admin = pick(row, "admin_name", "admin_email", "admin_id", default="Unknown")
        return {
            "id": pick(row, "id"),
            "admin": admin,
            "adminId": pick(row, "admin_id"),
            "actionType": pick(row, "action_type"),
            "targetType": pick(row, "target_type"),
            "targetId": pick(row, "target_id"),
            "actionDetails": pick(row, "action_details", default={}),
            "loginInfo": pick(row, "login_info", "ip"),
            "timestamp": str(pick(row, "created_at", "timestamp", default=""))[:19],
        }


admin_data_service = AdminDataService()
