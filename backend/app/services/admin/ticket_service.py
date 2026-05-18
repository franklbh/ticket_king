from __future__ import annotations

import csv
import io
import secrets
from datetime import timedelta
from typing import Any

from fastapi import HTTPException, status

from app.core.config import settings
from app.schemas.admin import TicketBatchStatusUpdate, TicketCheckInRequest, TicketOverrideCheckInRequest, TicketRegenerateRequest, TicketStatusUpdate
from app.schemas.admin.mappers import paginate, to_model, to_models
from app.schemas.admin.responses import CheckInResponse, TicketPage, TicketRead
from app.services.admin.audit import write_audit_log
from app.services.admin.enrichment import (
    merge_ticket_order,
    orders_by_id,
    slots_by_id,
    users_by_id,
)
from app.services.admin.normalizers import (
    db_ticket_status,
    normalize_ticket,
    normalize_ticket_status,
)
from app.services.admin.repository import admin_repository
from app.utils.datetime import utc_now, utc_now_iso_seconds


class TicketService:
    async def list_tickets(self, filters: dict[str, Any]) -> TicketPage:
        rows, total = await admin_repository.list_tickets(filters)
        tickets = [normalize_ticket(row) for row in rows]
        return paginate(
            TicketRead,
            tickets,
            page=filters.get("page", 1),
            page_size=filters.get("page_size", 25),
            total=total,
            already_paginated=True,
        )

    async def get_ticket(self, ticket_id: str) -> TicketRead:
        row = await admin_repository.get_ticket(ticket_id)
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found.")
        return to_model(TicketRead, normalize_ticket(row))

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
            "#", "Verification Code", "Order ID", "Customer", "Email", "Payment Method",
            "Remarks", "Ticket Type", "Slot Date", "Slot Time", "Status", "Verified At", "Order Created At",
        ])
        for index, ticket in enumerate(data.items, start=1):
            writer.writerow([
                index, ticket.code, ticket.order_id, ticket.order_user, ticket.order_email,
                ticket.order_payment, ticket.remarks, ticket.ticket_type, ticket.slot_date,
                f"{ticket.slot_start or ''}-{ticket.slot_end or ''}".strip("-"),
                ticket.status, ticket.verified_at, ticket.created_at,
            ])
        csv_body = output.getvalue()
        if actor:
            await write_audit_log(
                actor, "Export", "Ticket", None,
                {"filters": filters, "rows": len(data.items)},
                client_ip,
            )
        return csv_body

    async def update_ticket_status(
        self,
        ticket_id: str,
        update: TicketStatusUpdate,
        actor: dict[str, Any],
        client_ip: str | None = None,
    ) -> TicketRead:
        ticket_status = normalize_ticket_status(update.status)
        values: dict[str, Any] = {
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
        await write_audit_log(actor, "Update", "Ticket", ticket_id, {"status": ticket_status}, client_ip)
        orders = await orders_by_id()
        slots = await slots_by_id()
        users = await users_by_id()
        order = orders.get(str(rows[0].get("order_id")))
        slot = slots.get(str((order or {}).get("slot_id") or ""))
        customer = users.get(str((order or {}).get("customer_id") or ""))
        merged = merge_ticket_order(rows[0], order)
        return to_model(TicketRead, normalize_ticket(merged, slot=slot, customer=customer))

    async def batch_update_status(
        self,
        payload: TicketBatchStatusUpdate,
        actor: dict[str, Any],
        client_ip: str | None = None,
    ) -> dict[str, Any]:
        updated_ids: list[str] = []
        for ticket_id in payload.ticket_ids:
            await self.update_ticket_status(ticket_id, TicketStatusUpdate(status=payload.status), actor, client_ip)
            updated_ids.append(ticket_id)
        await write_audit_log(actor, "Batch Update", "Ticket", None, {"ids": updated_ids, "status": payload.status}, client_ip)
        return {"ok": True, "updated": len(updated_ids), "ids": updated_ids}

    async def regenerate_ticket_qr(
        self,
        ticket_id: str,
        payload: TicketRegenerateRequest,
        actor: dict[str, Any],
        client_ip: str | None = None,
    ) -> TicketRead:
        code = self._verification_code()
        rows = await admin_repository.update(
            settings.admin_tickets_table,
            match_column=settings.admin_ticket_id_column,
            match_value=ticket_id,
            values={
                "verification_code": code,
                "qr_payload": f"ticket:{code}",
                "updated_at": utc_now_iso_seconds(),
            },
        )
        if not rows:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found.")
        await write_audit_log(actor, "Regenerate", "Ticket", ticket_id, {"verification_code": code, "reason": payload.reason}, client_ip)
        orders = await orders_by_id()
        slots = await slots_by_id()
        users = await users_by_id()
        order = orders.get(str(rows[0].get("order_id")))
        slot = slots.get(str((order or {}).get("slot_id") or ""))
        customer = users.get(str((order or {}).get("customer_id") or ""))
        merged = merge_ticket_order(rows[0], order)
        return to_model(TicketRead, normalize_ticket(merged, slot=slot, customer=customer))

    async def check_in_ticket(
        self,
        payload: TicketCheckInRequest,
        actor: dict[str, Any],
        client_ip: str | None = None,
    ) -> CheckInResponse:
        code = payload.code.strip()
        match = await admin_repository.get_ticket_by_code(code)
        if not match:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found.")

        ticket = normalize_ticket(match)
        if ticket["status"] == "used":
            return CheckInResponse(result="already_used", ticket=to_model(TicketRead, ticket))
        if ticket["status"] == "voided":
            return CheckInResponse(result="voided", ticket=to_model(TicketRead, ticket))

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
        await write_audit_log(
            actor, "Check In", "Ticket", str(normalized.get("id") or ""),
            {"verification_code": normalized.get("code"), "order_id": normalized.get("orderId")},
            client_ip,
        )
        return CheckInResponse(result="checked_in", ticket=to_model(TicketRead, normalized))

    async def override_check_in_ticket(
        self,
        payload: TicketOverrideCheckInRequest,
        actor: dict[str, Any],
        client_ip: str | None = None,
    ) -> CheckInResponse:
        try:
            result = await self.check_in_ticket(TicketCheckInRequest(code=payload.code), actor, client_ip)
        except HTTPException:
            raise
        await write_audit_log(
            actor,
            "Override Check In",
            "Ticket",
            str(result.ticket.id or ""),
            {"code": payload.code, "reason": payload.reason, "result": result.result},
            client_ip,
        )
        return result

    async def recent_scans(self, minutes: int = 20) -> list[TicketRead]:
        cutoff = utc_now() - timedelta(minutes=minutes)
        rows = await admin_repository.recent_checked_in_tickets(cutoff, limit=100)
        return to_models(TicketRead, [normalize_ticket(row) for row in rows])

    @staticmethod
    def _verification_code() -> str:
        return f"{utc_now():%y%m%d}{secrets.randbelow(9000000) + 1000000}"


ticket_service = TicketService()
