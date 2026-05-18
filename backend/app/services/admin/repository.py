from __future__ import annotations

import asyncio
from datetime import date, datetime
from threading import Lock
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import MetaData, String, Table, and_, case, cast, func, insert, or_, select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal, engine
from app.utils.sql import split_table_name


class AdminRepository:
    def __init__(self) -> None:
        self._metadata = MetaData()
        self._tables: dict[str, Table] = {}
        self._lock = Lock()

    @property
    def configured(self) -> bool:
        return engine is not None and SessionLocal is not None

    async def select(
        self,
        table_name: str,
        *,
        params: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        return await asyncio.to_thread(self._select_sync, table_name, params)

    async def select_many(
        self,
        table_names: list[str],
        *,
        limit: int | None = None,
    ) -> dict[str, list[dict[str, Any]]]:
        return await asyncio.to_thread(self._select_many_sync, table_names, limit)

    async def select_where(
        self,
        table_name: str,
        *,
        column: str,
        value: Any,
        limit: int = 1,
    ) -> list[dict[str, Any]]:
        return await asyncio.to_thread(self._select_where_sync, table_name, column, value, limit)

    async def columns(self, table_name: str) -> set[str]:
        return await asyncio.to_thread(self._columns_sync, table_name)

    async def dashboard(self, *, start_date: date | None, days: int | None) -> dict[str, Any]:
        return await asyncio.to_thread(self._dashboard_sync, start_date, days)

    async def list_orders(self, filters: dict[str, Any]) -> tuple[list[dict[str, Any]], int]:
        return await asyncio.to_thread(self._list_orders_sync, filters)

    async def get_order(self, order_id: str) -> dict[str, Any] | None:
        rows, _ = await asyncio.to_thread(
            self._list_orders_sync,
            {"order_id_exact": order_id, "page": 1, "page_size": 1},
        )
        return rows[0] if rows else None

    async def list_tickets(self, filters: dict[str, Any]) -> tuple[list[dict[str, Any]], int]:
        return await asyncio.to_thread(self._list_tickets_sync, filters)

    async def get_ticket(self, ticket_id: str) -> dict[str, Any] | None:
        rows, _ = await asyncio.to_thread(
            self._list_tickets_sync,
            {"ticket_id_exact": ticket_id, "page": 1, "page_size": 1},
        )
        return rows[0] if rows else None

    async def get_ticket_by_code(self, code: str) -> dict[str, Any] | None:
        return await asyncio.to_thread(self._get_ticket_by_code_sync, code)

    async def recent_checked_in_tickets(self, cutoff: datetime, limit: int = 100) -> list[dict[str, Any]]:
        return await asyncio.to_thread(self._recent_checked_in_tickets_sync, cutoff, limit)

    async def list_slots(self, date_from: str | None = None, date_to: str | None = None) -> list[dict[str, Any]]:
        return await asyncio.to_thread(self._list_slots_sync, date_from, date_to)

    async def slot_inventory_counts(self) -> dict[str, dict[str, int]]:
        return await asyncio.to_thread(self._slot_inventory_counts_sync)

    async def list_activity_logs(self, filters: dict[str, Any]) -> tuple[list[dict[str, Any]], int]:
        return await asyncio.to_thread(self._list_activity_logs_sync, filters)

    async def get_activity_log(self, log_id: str) -> dict[str, Any] | None:
        return await asyncio.to_thread(self._get_activity_log_sync, log_id)

    async def list_coupons(
        self,
        *,
        status_filter: str | None = None,
        source: str | None = None,
        search: str | None = None,
    ) -> list[dict[str, Any]]:
        return await asyncio.to_thread(self._list_coupons_sync, status_filter, source, search)

    async def list_marketing_records(self, filters: dict[str, Any]) -> tuple[list[dict[str, Any]], int]:
        return await asyncio.to_thread(self._list_marketing_records_sync, filters)

    async def list_users(self, role: str | None = None) -> list[dict[str, Any]]:
        return await asyncio.to_thread(self._list_users_sync, role)

    async def insert(self, table_name: str, rows: dict[str, Any] | list[dict[str, Any]]) -> list[dict[str, Any]]:
        payload = rows if isinstance(rows, list) else [rows]
        return await asyncio.to_thread(self._insert_sync, table_name, payload)

    async def update(
        self,
        table_name: str,
        *,
        match_column: str,
        match_value: Any,
        values: dict[str, Any],
    ) -> list[dict[str, Any]]:
        return await asyncio.to_thread(self._update_sync, table_name, match_column, match_value, values)

    async def claim_order_fulfillment(self, order_id: Any, *, updated_at: str) -> list[dict[str, Any]]:
        return await asyncio.to_thread(self._claim_order_fulfillment_sync, order_id, updated_at)

    def _select_sync(self, table_name: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        limit = settings.max_table_rows
        if params and params.get("limit"):
            limit = min(int(params["limit"]), settings.max_table_rows)
        with self._session() as db:
            table = self._table(db, table_name)
            rows = db.execute(select(table).limit(limit)).mappings().all()
            return [dict(row) for row in rows]

    def _select_many_sync(self, table_names: list[str], limit: int | None = None) -> dict[str, list[dict[str, Any]]]:
        query_limit = min(limit or settings.max_table_rows, settings.max_table_rows)
        with self._session() as db:
            results: dict[str, list[dict[str, Any]]] = {}
            for table_name in table_names:
                table = self._table(db, table_name)
                rows = db.execute(select(table).limit(query_limit)).mappings().all()
                results[table_name] = [dict(row) for row in rows]
            return results

    def _select_where_sync(self, table_name: str, column: str, value: Any, limit: int) -> list[dict[str, Any]]:
        query_limit = min(limit, settings.max_table_rows)
        with self._session() as db:
            table = self._table(db, table_name)
            if column not in table.c:
                raise HTTPException(status_code=400, detail=f"Invalid SQL column: {column}")
            rows = db.execute(select(table).where(table.c[column] == value).limit(query_limit)).mappings().all()
            return [dict(row) for row in rows]

    def _columns_sync(self, table_name: str) -> set[str]:
        with self._session() as db:
            table = self._table(db, table_name)
            return set(table.c.keys())

    def _dashboard_sync(self, start_date: date | None, days: int | None) -> dict[str, Any]:
        today = date.today()
        with self._session() as db:
            orders = self._table(db, settings.admin_orders_table)
            tickets = self._table(db, settings.admin_tickets_table)
            slots = self._table(db, settings.admin_slots_table)

            order_created_date = func.date(orders.c.created_at)
            ticket_created_date = func.date(tickets.c.created_at)
            slot_business_date = slots.c.business_date
            order_status = func.lower(cast(orders.c.order_status, String))
            slot_status = func.lower(cast(slots.c.status, String))
            amount = func.coalesce(orders.c.total_amount, 0)
            slot_capacity = func.coalesce(getattr(slots.c, "capacity", None), 20)
            ticketing_order_filters = [orders.c.slot_id.is_not(None)] if hasattr(orders.c, "slot_id") else []

            orders_from = orders.outerjoin(slots, orders.c.slot_id == slots.c.id)
            tickets_from = (
                tickets.outerjoin(orders, tickets.c.order_id == orders.c.id)
                .outerjoin(slots, orders.c.slot_id == slots.c.id)
            )
            order_activity_date = func.coalesce(slot_business_date, order_created_date)
            ticket_activity_date = func.coalesce(slot_business_date, ticket_created_date, order_created_date)

            order_filters = []
            ticket_filters = []
            if start_date is not None:
                order_filters.append(order_activity_date >= start_date)
                ticket_filters.append(ticket_activity_date >= start_date)
            order_filters.extend(ticketing_order_filters)
            ticket_filters.extend(ticketing_order_filters)

            order_summary_stmt = select(
                func.coalesce(func.sum(case((order_activity_date == today, amount), else_=0)), 0).label("today_revenue"),
                func.count(case((order_activity_date == today, 1))).label("today_orders"),
                func.coalesce(func.sum(amount), 0).label("total_revenue"),
                func.count().label("total_orders"),
            ).select_from(orders_from)
            if order_filters:
                order_summary_stmt = order_summary_stmt.where(*order_filters)
            order_summary = dict(db.execute(order_summary_stmt).mappings().one())
            pending_orders = db.scalar(
                select(func.count()).select_from(orders).where(order_status == "pending", *ticketing_order_filters)
            ) or 0

            ticket_summary_stmt = select(
                func.count(case((ticket_activity_date == today, 1))).label("today_tickets"),
                func.count().label("total_tickets"),
            ).select_from(tickets_from)
            if ticket_filters:
                ticket_summary_stmt = ticket_summary_stmt.where(*ticket_filters)
            ticket_summary = dict(db.execute(ticket_summary_stmt).mappings().one())

            active_slots = db.scalar(select(func.count()).select_from(slots).where(slot_status == "active")) or 0

            order_trend_stmt = (
                select(
                    order_activity_date.label("day"),
                    func.coalesce(func.sum(amount), 0).label("revenue"),
                    func.count().label("orders"),
                )
                .select_from(orders_from)
                .group_by(order_activity_date)
                .order_by(order_activity_date)
            )
            if order_filters:
                order_trend_stmt = order_trend_stmt.where(*order_filters)
            order_trend = db.execute(order_trend_stmt).mappings().all()

            ticket_trend_stmt = (
                select(ticket_activity_date.label("day"), func.count().label("tickets"))
                .select_from(tickets_from)
                .group_by(ticket_activity_date)
                .order_by(ticket_activity_date)
            )
            if ticket_filters:
                ticket_trend_stmt = ticket_trend_stmt.where(*ticket_filters)
            ticket_trend = db.execute(ticket_trend_stmt).mappings().all()

            distribution_stmt = (
                select(tickets.c.ticket_type.label("name"), func.count().label("value"))
                .select_from(tickets_from)
                .group_by(tickets.c.ticket_type)
                .order_by(func.count().desc())
            )
            if ticket_filters:
                distribution_stmt = distribution_stmt.where(*ticket_filters)
            distribution = db.execute(distribution_stmt).mappings().all()

            slot_date_col = getattr(slots.c, "business_date", None)
            slot_time_col = getattr(slots.c, "slot_time_label", None)
            if slot_date_col is not None and slot_time_col is not None and hasattr(orders.c, "slot_id"):
                popular_stmt = (
                    select(
                        slot_date_col.label("slot_date"),
                        slot_time_col.label("slot_time"),
                        func.count().label("sold"),
                        slot_capacity.label("total"),
                    )
                    .select_from(
                        tickets.join(orders, tickets.c.order_id == orders.c.id).join(
                            slots,
                            orders.c.slot_id == slots.c.id,
                        )
                    )
                    .where(slot_date_col.is_not(None))
                    .group_by(slot_date_col, slot_time_col, slot_capacity)
                    .order_by(func.count().desc())
                    .limit(10)
                )
                if start_date is not None:
                    popular_stmt = popular_stmt.where(slot_date_col >= start_date)
                popular = db.execute(popular_stmt).mappings().all()
            else:
                popular = []

            return {
                "days": days,
                "start_date": start_date,
                "order_summary": order_summary,
                "ticket_summary": ticket_summary,
                "pending_orders": pending_orders,
                "active_slots": active_slots,
                "order_trend": [dict(row) for row in order_trend],
                "ticket_trend": [dict(row) for row in ticket_trend],
                "distribution": [dict(row) for row in distribution],
                "popular": [dict(row) for row in popular],
            }

    def _list_orders_sync(self, filters: dict[str, Any]) -> tuple[list[dict[str, Any]], int]:
        page = max(int(filters.get("page") or 1), 1)
        page_size = min(max(int(filters.get("page_size") or 25), 1), 200)
        with self._session() as db:
            orders = self._table(db, settings.admin_orders_table)
            tickets = self._table(db, settings.admin_tickets_table)
            slots = self._table(db, settings.admin_slots_table)
            users = self._table(db, settings.admin_users_table)

            order_id = cast(orders.c.id, String)
            order_number = cast(orders.c.order_number, String) if "order_number" in orders.c else None
            order_created_date = func.date(orders.c.created_at)
            order_status = func.lower(cast(orders.c.order_status, String))
            slot_date = slots.c.business_date
            slot_start = cast(slots.c.start_time, String)
            ticket_status = func.lower(cast(tickets.c[settings.admin_ticket_status_column], String))

            ticket_counts = (
                select(
                    tickets.c.order_id.label("count_order_id"),
                    func.count(tickets.c.id).label("ticket_total"),
                    func.count(case((ticket_status == "used", 1))).label("completed_tickets"),
                )
                .group_by(tickets.c.order_id)
                .subquery()
            )

            conditions = []
            if filters.get("order_id_exact"):
                exact_order_id = str(filters["order_id_exact"])
                if order_number is not None:
                    conditions.append(or_(order_id == exact_order_id, order_number == exact_order_id))
                else:
                    conditions.append(order_id == exact_order_id)
            elif filters.get("order_id"):
                needle = f"%{filters['order_id']}%"
                if order_number is not None:
                    conditions.append(or_(order_id.ilike(needle), order_number.ilike(needle)))
                else:
                    conditions.append(order_id.ilike(needle))
            if filters.get("user_info"):
                needle = f"%{str(filters['user_info']).lower()}%"
                conditions.append(or_(
                    func.lower(cast(orders.c.guest_name, String)).like(needle),
                    func.lower(cast(orders.c.guest_email, String)).like(needle),
                    func.lower(cast(orders.c.guest_phone, String)).like(needle),
                    func.lower(cast(users.c.name, String)).like(needle),
                    func.lower(cast(users.c.email, String)).like(needle),
                ))
            if filters.get("coupon_code"):
                conditions.append(func.lower(cast(orders.c.coupon_code, String)) == str(filters["coupon_code"]).lower())
            if filters.get("status"):
                statuses = [item.strip().lower() for item in str(filters["status"]).split(",") if item.strip()]
                conditions.append(order_status.in_(statuses))
            if filters.get("order_date_from"):
                conditions.append(order_created_date >= filters["order_date_from"])
            if filters.get("order_date_to"):
                conditions.append(order_created_date <= filters["order_date_to"])
            if filters.get("slot_date_from"):
                conditions.append(slot_date >= filters["slot_date_from"])
            if filters.get("slot_date_to"):
                conditions.append(slot_date <= filters["slot_date_to"])
            if filters.get("slot_start"):
                conditions.append(slot_start.like(f"{filters['slot_start']}%"))

            from_clause = (
                orders.outerjoin(slots, orders.c.slot_id == slots.c.id)
                .outerjoin(users, orders.c.customer_id == users.c.id)
                .outerjoin(ticket_counts, orders.c.id == ticket_counts.c.count_order_id)
            )
            base = select(
                orders,
                slots.c.business_date.label("slot_date"),
                slots.c.start_time.label("slot_start_time"),
                slots.c.end_time.label("slot_end_time"),
                slots.c.slot_time_label.label("slot_time"),
                users.c.name.label("customer_name"),
                users.c.email.label("customer_email"),
                ticket_counts.c.ticket_total,
                ticket_counts.c.completed_tickets,
                (
                    func.coalesce(ticket_counts.c.ticket_total, 0)
                    - func.coalesce(ticket_counts.c.completed_tickets, 0)
                ).label("not_used_tickets"),
            ).select_from(from_clause)
            count_stmt = select(func.count()).select_from(from_clause)
            if conditions:
                base = base.where(and_(*conditions))
                count_stmt = count_stmt.where(and_(*conditions))
            total = int(db.scalar(count_stmt) or 0)
            rows = (
                db.execute(
                    base.order_by(orders.c.created_at.desc())
                    .limit(page_size)
                    .offset((page - 1) * page_size)
                )
                .mappings()
                .all()
            )
            return [dict(row) for row in rows], total

    def _list_tickets_sync(self, filters: dict[str, Any]) -> tuple[list[dict[str, Any]], int]:
        page = max(int(filters.get("page") or 1), 1)
        page_size = min(max(int(filters.get("page_size") or 25), 1), 200)
        with self._session() as db:
            tickets = self._table(db, settings.admin_tickets_table)
            orders = self._table(db, settings.admin_orders_table)
            slots = self._table(db, settings.admin_slots_table)
            users = self._table(db, settings.admin_users_table)

            ticket_id = cast(tickets.c[settings.admin_ticket_id_column], String)
            order_id = cast(tickets.c.order_id, String)
            ticket_code = cast(tickets.c.verification_code, String)
            ticket_status = func.lower(cast(tickets.c[settings.admin_ticket_status_column], String))
            slot_date = slots.c.business_date
            checked_date = func.date(tickets.c.checked_in_at)

            conditions = []
            if filters.get("ticket_id_exact"):
                conditions.append(ticket_id == str(filters["ticket_id_exact"]))
            if filters.get("code"):
                needle = f"%{filters['code']}%"
                conditions.append(or_(ticket_code.ilike(needle), cast(tickets.c.qr_payload, String).ilike(needle)))
            if filters.get("order_id"):
                conditions.append(order_id.ilike(f"%{filters['order_id']}%"))
            if filters.get("status") and filters["status"] != "all":
                requested_status = str(filters["status"]).lower()
                db_status = {"not_used": "unused", "used": "used", "voided": "voided"}.get(
                    requested_status,
                    requested_status.replace("_", " "),
                )
                conditions.append(ticket_status == db_status)
            if filters.get("slot_date_from"):
                conditions.append(slot_date >= filters["slot_date_from"])
            if filters.get("slot_date_to"):
                conditions.append(slot_date <= filters["slot_date_to"])
            if filters.get("verified_from"):
                conditions.append(checked_date >= filters["verified_from"])
            if filters.get("verified_to"):
                conditions.append(checked_date <= filters["verified_to"])
            if filters.get("ticket_type"):
                types = [item.strip() for item in str(filters["ticket_type"]).split(",") if item.strip()]
                conditions.append(tickets.c.ticket_type.in_(types))

            from_clause = (
                tickets.outerjoin(orders, tickets.c.order_id == orders.c.id)
                .outerjoin(slots, orders.c.slot_id == slots.c.id)
                .outerjoin(users, orders.c.customer_id == users.c.id)
            )
            base = select(
                tickets,
                orders.c.payment_method.label("order_payment"),
                orders.c.created_at.label("order_created_at"),
                orders.c.remarks.label("remarks"),
                orders.c.guest_name.label("guest_name"),
                orders.c.guest_email.label("guest_email"),
                orders.c.guest_phone.label("guest_phone"),
                users.c.name.label("customer_name"),
                users.c.email.label("customer_email"),
                slots.c.business_date.label("slot_date"),
                slots.c.start_time.label("slot_start_time"),
                slots.c.end_time.label("slot_end_time"),
                slots.c.slot_time_label.label("slot_time"),
            ).select_from(from_clause)
            count_stmt = select(func.count()).select_from(from_clause)
            if conditions:
                base = base.where(and_(*conditions))
                count_stmt = count_stmt.where(and_(*conditions))
            total = int(db.scalar(count_stmt) or 0)
            rows = (
                db.execute(
                    base.order_by(tickets.c.created_at.desc())
                    .limit(page_size)
                    .offset((page - 1) * page_size)
                )
                .mappings()
                .all()
            )
            return [dict(row) for row in rows], total

    def _get_ticket_by_code_sync(self, code: str) -> dict[str, Any] | None:
        with self._session() as db:
            tickets = self._table(db, settings.admin_tickets_table)
            ticket_code = cast(tickets.c.verification_code, String)
            qr_payload = cast(tickets.c.qr_payload, String)
            row = (
                db.execute(
                    select(tickets)
                    .where(or_(
                        ticket_code == code,
                        qr_payload == code,
                        qr_payload == f"ticket:{code}",
                    ))
                    .limit(1)
                )
                .mappings()
                .first()
            )
            return dict(row) if row else None

    def _recent_checked_in_tickets_sync(self, cutoff: datetime, limit: int) -> list[dict[str, Any]]:
        query_limit = min(max(limit, 1), settings.max_table_rows)
        with self._session() as db:
            tickets = self._table(db, settings.admin_tickets_table)
            rows = (
                db.execute(
                    select(tickets)
                    .where(tickets.c.checked_in_at.is_not(None), tickets.c.checked_in_at >= cutoff)
                    .order_by(tickets.c.checked_in_at.desc())
                    .limit(query_limit)
                )
                .mappings()
                .all()
            )
            return [dict(row) for row in rows]

    def _list_slots_sync(self, date_from: str | None, date_to: str | None) -> list[dict[str, Any]]:
        with self._session() as db:
            slots = self._table(db, settings.admin_slots_table)
            slot_date = slots.c.business_date
            statement = select(slots)
            conditions = []
            if date_from:
                conditions.append(slot_date >= date_from)
            if date_to:
                conditions.append(slot_date <= date_to)
            if conditions:
                statement = statement.where(and_(*conditions))
            rows = (
                db.execute(
                    statement
                    .order_by(slots.c.business_date.asc(), slots.c.start_time.asc())
                    .limit(settings.max_table_rows)
                )
                .mappings()
                .all()
            )
            return [dict(row) for row in rows]

    def _slot_inventory_counts_sync(self) -> dict[str, dict[str, int]]:
        with self._session() as db:
            orders = self._table(db, settings.admin_orders_table)
            tickets = self._table(db, settings.admin_tickets_table)
            channel = func.lower(cast(orders.c.sales_channel, String))
            is_walkin = channel.in_(["walk_in", "walk-in", "instore", "in_store"])
            rows = (
                db.execute(
                    select(
                        orders.c.slot_id.label("slot_id"),
                        func.coalesce(func.sum(case((is_walkin, 1), else_=0)), 0).label("walkin_sold"),
                        func.coalesce(func.sum(case((is_walkin, 0), else_=1)), 0).label("online_sold"),
                    )
                    .select_from(tickets.join(orders, tickets.c.order_id == orders.c.id))
                    .where(orders.c.slot_id.is_not(None))
                    .group_by(orders.c.slot_id)
                )
                .mappings()
                .all()
            )
            return {
                str(row["slot_id"]): {
                    "walkin_sold": int(row["walkin_sold"] or 0),
                    "online_sold": int(row["online_sold"] or 0),
                }
                for row in rows
            }

    def _list_activity_logs_sync(self, filters: dict[str, Any]) -> tuple[list[dict[str, Any]], int]:
        page = max(int(filters.get("page") or 1), 1)
        page_size = min(max(int(filters.get("page_size") or 25), 1), 200)
        with self._session() as db:
            logs = self._table(db, settings.admin_audit_logs_table)
            users = self._table(db, settings.admin_users_table)
            created_date = func.date(logs.c.created_at)
            conditions = []
            if filters.get("admin"):
                needle = f"%{str(filters['admin']).lower()}%"
                conditions.append(or_(
                    func.lower(cast(users.c.name, String)).like(needle),
                    func.lower(cast(users.c.email, String)).like(needle),
                    func.lower(cast(logs.c.admin_id, String)).like(needle),
                ))
            if filters.get("action_type"):
                actions = [item.strip() for item in str(filters["action_type"]).split(",") if item.strip()]
                conditions.append(logs.c.action_type.in_(actions))
            if filters.get("target_type"):
                targets = [item.strip() for item in str(filters["target_type"]).split(",") if item.strip()]
                conditions.append(logs.c.target_type.in_(targets))
            if filters.get("target_id"):
                conditions.append(cast(logs.c.target_id, String).ilike(f"%{filters['target_id']}%"))
            if filters.get("date_from"):
                conditions.append(created_date >= filters["date_from"])
            if filters.get("date_to"):
                conditions.append(created_date <= filters["date_to"])
            if filters.get("search"):
                needle = f"%{str(filters['search']).lower()}%"
                conditions.append(or_(
                    func.lower(cast(logs.c.action_details, String)).like(needle),
                    func.lower(cast(logs.c.target_id, String)).like(needle),
                    func.lower(cast(users.c.name, String)).like(needle),
                    func.lower(cast(users.c.email, String)).like(needle),
                ))

            from_clause = logs.outerjoin(users, logs.c.admin_id == users.c.id)
            base = select(
                logs,
                users.c.name.label("admin_name"),
                users.c.email.label("admin_email"),
            ).select_from(from_clause)
            count_stmt = select(func.count()).select_from(from_clause)
            if conditions:
                base = base.where(and_(*conditions))
                count_stmt = count_stmt.where(and_(*conditions))
            total = int(db.scalar(count_stmt) or 0)
            rows = (
                db.execute(
                    base.order_by(logs.c.created_at.desc())
                    .limit(page_size)
                    .offset((page - 1) * page_size)
                )
                .mappings()
                .all()
            )
            return [dict(row) for row in rows], total

    def _get_activity_log_sync(self, log_id: str) -> dict[str, Any] | None:
        with self._session() as db:
            logs = self._table(db, settings.admin_audit_logs_table)
            users = self._table(db, settings.admin_users_table)
            row = (
                db.execute(
                    select(
                        logs,
                        users.c.name.label("admin_name"),
                        users.c.email.label("admin_email"),
                    )
                    .select_from(logs.outerjoin(users, logs.c.admin_id == users.c.id))
                    .where(cast(logs.c.id, String) == str(log_id))
                    .limit(1)
                )
                .mappings()
                .first()
            )
            return dict(row) if row else None

    def _list_coupons_sync(
        self,
        status_filter: str | None,
        source: str | None,
        search: str | None,
    ) -> list[dict[str, Any]]:
        with self._session() as db:
            coupons = self._table(db, settings.admin_coupons_table)
            statement = select(coupons)
            conditions = []
            if status_filter and status_filter != "all":
                conditions.append(func.lower(cast(coupons.c.status, String)) == status_filter.lower())
            if source and source != "all":
                conditions.append(func.lower(cast(coupons.c.source, String)) == source.lower())
            if search:
                needle = f"%{search.lower()}%"
                conditions.append(or_(
                    func.lower(cast(coupons.c.code, String)).like(needle),
                    func.lower(cast(coupons.c.remarks, String)).like(needle),
                ))
            if conditions:
                statement = statement.where(and_(*conditions))
            rows = (
                db.execute(
                    statement
                    .order_by(coupons.c.created_at.desc(), coupons.c.code.asc())
                    .limit(settings.max_table_rows)
                )
                .mappings()
                .all()
            )
            return [dict(row) for row in rows]

    def _list_marketing_records_sync(self, filters: dict[str, Any]) -> tuple[list[dict[str, Any]], int]:
        page = max(int(filters.get("page") or 1), 1)
        page_size = min(max(int(filters.get("page_size") or 25), 1), 200)
        with self._session() as db:
            records = self._table(db, settings.admin_marketing_records_table)
            statement = select(records)
            count_stmt = select(func.count()).select_from(records)
            if filters.get("status") and filters["status"] != "all":
                condition = func.lower(cast(records.c.status, String)) == str(filters["status"]).lower()
                statement = statement.where(condition)
                count_stmt = count_stmt.where(condition)
            total = int(db.scalar(count_stmt) or 0)
            rows = (
                db.execute(
                    statement
                    .order_by(records.c.created_at.desc())
                    .limit(page_size)
                    .offset((page - 1) * page_size)
                )
                .mappings()
                .all()
            )
            return [dict(row) for row in rows], total

    def _list_users_sync(self, role: str | None) -> list[dict[str, Any]]:
        with self._session() as db:
            users = self._table(db, settings.admin_users_table)
            statement = select(users)
            if role:
                statement = statement.where(func.lower(cast(users.c.role, String)) == role.lower())
            rows = (
                db.execute(
                    statement
                    .order_by(users.c.role.asc(), users.c.email.asc())
                    .limit(settings.max_table_rows)
                )
                .mappings()
                .all()
            )
            return [dict(row) for row in rows]

    def _insert_sync(self, table_name: str, rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if not rows:
            return []
        with self._session() as db:
            table = self._table(db, table_name)
            result = db.execute(insert(table).returning(table), rows)
            db.commit()
            return [dict(row) for row in result.mappings().all()]

    def _update_sync(
        self,
        table_name: str,
        match_column: str,
        match_value: Any,
        values: dict[str, Any],
    ) -> list[dict[str, Any]]:
        if not values:
            return []
        with self._session() as db:
            table = self._table(db, table_name)
            if match_column not in table.c:
                raise HTTPException(status_code=400, detail=f"Invalid SQL column: {match_column}")
            match_value = self._coerce_column_value(table, match_column, match_value)
            statement = (
                update(table)
                .where(table.c[match_column] == match_value)
                .values(**values)
                .returning(table)
            )
            result = db.execute(statement)
            db.commit()
            return [dict(row) for row in result.mappings().all()]

    def _claim_order_fulfillment_sync(self, order_id: Any, updated_at: str) -> list[dict[str, Any]]:
        with self._session() as db:
            orders = self._table(db, settings.admin_orders_table)
            order_id = self._coerce_column_value(orders, "id", order_id)
            fulfillment_status = func.lower(cast(orders.c.fulfillment_status, String))
            statement = (
                update(orders)
                .where(orders.c.id == order_id)
                .where(~fulfillment_status.in_(["fulfilled", "completed", "processing"]))
                .values(fulfillment_status="Processing", updated_at=updated_at)
                .returning(orders)
            )
            result = db.execute(statement)
            db.commit()
            return [dict(row) for row in result.mappings().all()]

    def _session(self) -> Session:
        if SessionLocal is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Admin database connection is not configured.",
            )
        return SessionLocal()

    def _table(self, db: Session, table_name: str) -> Table:
        cached = self._tables.get(table_name)
        if cached is not None:
            return cached

        try:
            schema, name = split_table_name(table_name)
            with self._lock:
                cached = self._tables.get(table_name)
                if cached is not None:
                    return cached
                table = Table(name, self._metadata, schema=schema, autoload_with=db.get_bind())
                self._tables[table_name] = table
                return table
        except HTTPException:
            raise
        except SQLAlchemyError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=self._db_error_detail("reflect", table_name, exc),
            ) from exc

    @staticmethod
    def _coerce_column_value(table: Table, column: str, value: Any) -> Any:
        try:
            if table.c[column].type.python_type is UUID and not isinstance(value, UUID):
                return UUID(str(value))
        except (AttributeError, NotImplementedError, TypeError, ValueError):
            return value
        return value

    @staticmethod
    def _db_error_detail(action: str, table_name: str, exc: Exception) -> str:
        base = f"Admin database {action} failed for table '{table_name}'."
        if settings.app_env.lower() == "local":
            return f"{base} {type(exc).__name__}: {exc}"
        return base


admin_repository = AdminRepository()
