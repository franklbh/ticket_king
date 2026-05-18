from __future__ import annotations

import csv
import io
import secrets
import uuid
from typing import Any

from fastapi import HTTPException, status

from app.core.config import settings
from app.schemas.admin import OrderCouponUpdate, OrderCustomerUpdate, OrderEmailRequest, OrderSlotUpdate, OrderStatusUpdate, WalkInOrderCreate
from app.schemas.admin.mappers import paginate, to_model, to_models
from app.schemas.admin.responses import OrderPage, OrderRead, TicketRead, WalkInOrderResponse
from app.services.admin.audit import audit_change, write_audit_log
from app.services.admin.enrichment import slots_by_id
from app.services.admin.normalizers import (
    db_order_status,
    db_ticket_status,
    normalize_order,
    normalize_ticket,
)
from app.services.admin.repository import admin_repository
from app.utils.datetime import utc_now, utc_now_iso_seconds


class OrderService:
    async def _resolve_order_row(self, order_ref: str) -> dict[str, Any]:
        row = await admin_repository.get_order(order_ref)
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")
        return row

    async def list_orders(self, filters: dict[str, Any]) -> OrderPage:
        rows, total = await admin_repository.list_orders(filters)
        orders = [normalize_order(row) for row in rows]
        return paginate(
            OrderRead,
            orders,
            page=filters.get("page", 1),
            page_size=filters.get("page_size", 25),
            total=total,
            already_paginated=True,
        )

    async def get_order(self, order_id: str) -> OrderRead:
        row = await self._resolve_order_row(order_id)
        return to_model(OrderRead, normalize_order(row))

    async def update_order_status(
        self,
        order_id: str,
        payload: OrderStatusUpdate,
        actor: dict[str, Any],
        client_ip: str | None = None,
    ) -> OrderRead:
        before = await self._resolve_order_row(order_id)
        rows = await admin_repository.update(
            settings.admin_orders_table,
            match_column="id",
            match_value=before["id"],
            values={"order_status": db_order_status(payload.status), "updated_at": utc_now_iso_seconds()},
        )
        details = audit_change(before, rows[0], ["order_status"])
        details["requested_status"] = payload.status
        await write_audit_log(actor, "Update", "Order", order_id, details, client_ip)
        return await self.get_order(order_id)

    async def update_order_customer(
        self,
        order_id: str,
        payload: OrderCustomerUpdate,
        actor: dict[str, Any],
        client_ip: str | None = None,
    ) -> OrderRead:
        before = await self._resolve_order_row(order_id)
        values = {
            "guest_name": payload.name,
            "guest_email": payload.email,
            "guest_phone": payload.phone,
            "updated_at": utc_now_iso_seconds(),
        }
        rows = await admin_repository.update(
            settings.admin_orders_table,
            match_column="id",
            match_value=before["id"],
            values=values,
        )
        details = audit_change(before, rows[0], ["guest_name", "guest_email", "guest_phone"])
        details["customer"] = payload.model_dump()
        await write_audit_log(actor, "Update", "Order", order_id, details, client_ip)
        return await self.get_order(order_id)

    async def update_order_slot(
        self,
        order_id: str,
        payload: OrderSlotUpdate,
        actor: dict[str, Any],
        client_ip: str | None = None,
    ) -> OrderRead:
        before = await self._resolve_order_row(order_id)
        slot_id = str(payload.slot_id)
        try:
            slot_value: Any = uuid.UUID(slot_id)
        except ValueError:
            slot_value = slot_id
        rows = await admin_repository.update(
            settings.admin_orders_table,
            match_column="id",
            match_value=before["id"],
            values={"slot_id": slot_value, "updated_at": utc_now_iso_seconds()},
        )
        details = audit_change(before, rows[0], ["slot_id"])
        details["slot_id"] = slot_id
        await write_audit_log(actor, "Update", "Order", order_id, details, client_ip)
        return await self.get_order(order_id)

    async def apply_coupon(
        self,
        order_id: str,
        payload: OrderCouponUpdate,
        actor: dict[str, Any],
        client_ip: str | None = None,
    ) -> OrderRead:
        before = await self._resolve_order_row(order_id)
        code = payload.coupon_code.strip().upper()
        rows = await admin_repository.update(
            settings.admin_orders_table,
            match_column="id",
            match_value=before["id"],
            values={
                "coupon_code": code,
                "coupon_discount": payload.coupon_discount,
                "updated_at": utc_now_iso_seconds(),
            },
        )
        details = audit_change(before, rows[0], ["coupon_code", "coupon_discount"])
        details.update({"coupon_code": code, "coupon_discount": payload.coupon_discount})
        await write_audit_log(actor, "Update", "Order", order_id, details, client_ip)
        return await self.get_order(order_id)

    async def remove_coupon(
        self,
        order_id: str,
        actor: dict[str, Any],
        client_ip: str | None = None,
    ) -> OrderRead:
        before = await self._resolve_order_row(order_id)
        rows = await admin_repository.update(
            settings.admin_orders_table,
            match_column="id",
            match_value=before["id"],
            values={"coupon_code": None, "coupon_discount": 0, "coupon_details": {}, "updated_at": utc_now_iso_seconds()},
        )
        details = audit_change(before, rows[0], ["coupon_code", "coupon_discount", "coupon_details"])
        details["coupon_removed"] = True
        await write_audit_log(actor, "Update", "Order", order_id, details, client_ip)
        return await self.get_order(order_id)

    async def resend_ticket_email(
        self,
        order_id: str,
        payload: OrderEmailRequest,
        actor: dict[str, Any],
        client_ip: str | None = None,
    ) -> dict[str, Any]:
        order = await self.get_order(order_id)
        await write_audit_log(
            actor,
            "Resend Email",
            "Order",
            order_id,
            {"email": order.user.email, "reason": payload.reason, "queued": False, "message": "Email provider is not configured in this backend."},
            client_ip,
        )
        return {
            "ok": True,
            "message": "Resend request audited. Email dispatch provider is not configured.",
            "id": order_id,
        }

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
