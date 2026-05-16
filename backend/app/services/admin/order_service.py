from __future__ import annotations

import csv
import io
import secrets
import uuid
from typing import Any

from app.core.config import settings
from app.schemas.admin import WalkInOrderCreate
from app.schemas.admin.mappers import paginate, to_model, to_models
from app.schemas.admin.responses import OrderPage, OrderRead, TicketRead, WalkInOrderResponse
from app.services.admin.audit import write_audit_log
from app.services.admin.enrichment import index_by_id, slots_by_id, ticket_counts
from app.services.admin.filters import filter_orders
from app.services.admin.normalizers import (
    db_order_status,
    db_ticket_status,
    normalize_order,
    normalize_ticket,
)
from app.services.admin.repository import admin_repository
from app.utils.datetime import utc_now, utc_now_iso_seconds


class OrderService:
    async def list_orders(self, filters: dict[str, Any]) -> OrderPage:
        table_rows = await admin_repository.select_many([
            settings.admin_tickets_table,
            settings.admin_orders_table,
            settings.admin_slots_table,
            settings.admin_users_table,
        ])
        ticket_rows = table_rows[settings.admin_tickets_table]
        rows = table_rows[settings.admin_orders_table]
        slots = index_by_id(table_rows[settings.admin_slots_table])
        users = index_by_id(table_rows[settings.admin_users_table])
        counts = ticket_counts([normalize_ticket(row) for row in ticket_rows])
        orders = [
            normalize_order(
                row,
                counts,
                slot=slots.get(str(row.get("slot_id") or "")),
                customer=users.get(str(row.get("customer_id") or "")),
            )
            for row in rows
        ]
        orders = filter_orders(orders, filters)
        orders.sort(key=lambda row: row.get("createdAt") or "", reverse=True)
        return paginate(OrderRead, orders, page=filters.get("page", 1), page_size=filters.get("page_size", 25))

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
            "Order ID", "Customer Name", "Email", "Phone", "Email Status",
            "Slot Date", "Slot Time", "Ticket Total", "Amount", "Coupon Discount",
            "Coupon Code", "Remarks", "Status", "Payment Method", "Created At", "Created By", "IP",
        ])
        for order in data.items:
            writer.writerow([
                order.id,
                order.user.name,
                order.user.email,
                order.user.phone,
                order.email_status,
                order.slot.date,
                f"{order.slot.start_time or ''}-{order.slot.end_time or ''}".strip("-"),
                order.ticket_count.total,
                order.amount,
                order.coupon_discount,
                order.coupon_code,
                order.remarks,
                order.status,
                order.payment_method,
                order.created_at,
                order.created_by,
                order.ip,
            ])
        csv_body = output.getvalue()
        if actor:
            await write_audit_log(
                actor, "Export", "Order", None,
                {"filters": filters, "rows": len(data.items)},
                client_ip,
            )
        return csv_body

    async def create_walk_in_order(
        self,
        payload: WalkInOrderCreate,
        actor: dict[str, Any],
        client_ip: str | None = None,
    ) -> WalkInOrderResponse:
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
            "customer_id": None,
            "guest_name": payload.customer.name or "Walk-in customer",
            "guest_email": payload.customer.email,
            "guest_phone": payload.customer.phone,
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
                    "ticket_type_id": item.ticket_type_id,
                    "verification_code": code,
                    "ticket_type": item.ticket_type,
                    settings.admin_ticket_status_column: db_ticket_status(
                        "used" if payload.mark_used_immediately else "not_used"
                    ),
                    "qr_payload": f"ticket:{code}",
                    "net_ticket_amount": item.unit_price,
                    "original_ticket_amount": item.unit_price,
                    "checked_in_at": now if payload.mark_used_immediately else None,
                    "checked_in_by": actor.get("id") if payload.mark_used_immediately else None,
                    "memo": payload.customer.remarks,
                    "created_at": now,
                    "updated_at": now,
                })
        inserted_tickets = (
            await admin_repository.insert(settings.admin_tickets_table, ticket_rows) if ticket_rows else []
        )
        slot_map = await slots_by_id()
        slot = slot_map.get(str(payload.slot_id) or "")
        normalized_order = normalize_order(
            inserted_orders[0] if inserted_orders else order_row,
            slot=slot,
        )
        await write_audit_log(
            actor, "Create", "Order", order_id,
            {
                "order_number": order_number,
                "sales_channel": "walk_in",
                "ticket_quantity": ticket_quantity,
                "total_amount": total_due,
                "mark_used_immediately": payload.mark_used_immediately,
            },
            client_ip,
        )
        return WalkInOrderResponse(
            order=to_model(OrderRead, normalized_order),
            tickets=to_models(TicketRead, [normalize_ticket(t) for t in inserted_tickets]),
        )

    @staticmethod
    def _verification_code() -> str:
        return f"{utc_now():%y%m%d}{secrets.randbelow(9000000) + 1000000}"

    @staticmethod
    def _order_number() -> str:
        return f"TK{utc_now():%Y%m%d%H%M%S}{secrets.randbelow(9000) + 1000}"

    @staticmethod
    def _ticket_number() -> str:
        return f"T{utc_now():%Y%m%d%H%M%S}{secrets.randbelow(900000) + 100000}"


order_service = OrderService()
