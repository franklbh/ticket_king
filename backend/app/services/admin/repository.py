from __future__ import annotations

import asyncio
from datetime import date
from threading import Lock
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import MetaData, String, Table, case, cast, func, insert, select, update
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
            order_status = func.lower(cast(orders.c.order_status, String))
            slot_status = func.lower(cast(slots.c.status, String))
            amount = func.coalesce(orders.c.total_amount, 0)

            order_filters = []
            ticket_filters = []
            if start_date is not None:
                order_filters.append(order_created_date >= start_date)
                ticket_filters.append(ticket_created_date >= start_date)

            order_summary_stmt = select(
                func.coalesce(func.sum(case((order_created_date == today, amount), else_=0)), 0).label("today_revenue"),
                func.count(case((order_created_date == today, 1))).label("today_orders"),
                func.coalesce(func.sum(amount), 0).label("total_revenue"),
                func.count().label("total_orders"),
            )
            if order_filters:
                order_summary_stmt = order_summary_stmt.where(*order_filters)
            order_summary = dict(db.execute(order_summary_stmt).mappings().one())
            pending_orders = db.scalar(
                select(func.count()).select_from(orders).where(order_status == "pending")
            ) or 0

            ticket_summary_stmt = select(
                func.count(case((ticket_created_date == today, 1))).label("today_tickets"),
                func.count().label("total_tickets"),
            )
            if ticket_filters:
                ticket_summary_stmt = ticket_summary_stmt.where(*ticket_filters)
            ticket_summary = dict(db.execute(ticket_summary_stmt).mappings().one())

            active_slots = db.scalar(select(func.count()).select_from(slots).where(slot_status == "active")) or 0

            order_trend_stmt = (
                select(
                    order_created_date.label("day"),
                    func.coalesce(func.sum(amount), 0).label("revenue"),
                    func.count().label("orders"),
                )
                .group_by(order_created_date)
                .order_by(order_created_date)
            )
            if order_filters:
                order_trend_stmt = order_trend_stmt.where(*order_filters)
            order_trend = db.execute(order_trend_stmt).mappings().all()

            ticket_trend_stmt = (
                select(ticket_created_date.label("day"), func.count().label("tickets"))
                .group_by(ticket_created_date)
                .order_by(ticket_created_date)
            )
            if ticket_filters:
                ticket_trend_stmt = ticket_trend_stmt.where(*ticket_filters)
            ticket_trend = db.execute(ticket_trend_stmt).mappings().all()

            distribution_stmt = (
                select(tickets.c.ticket_type.label("name"), func.count().label("value"))
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
                    )
                    .select_from(
                        tickets.join(orders, tickets.c.order_id == orders.c.id).join(
                            slots,
                            orders.c.slot_id == slots.c.id,
                        )
                    )
                    .where(slot_date_col.is_not(None))
                    .group_by(slot_date_col, slot_time_col)
                    .order_by(func.count().desc())
                    .limit(10)
                )
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
            statement = (
                update(table)
                .where(table.c[match_column] == match_value)
                .values(**values)
                .returning(table)
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
    def _db_error_detail(action: str, table_name: str, exc: Exception) -> str:
        base = f"Admin database {action} failed for table '{table_name}'."
        if settings.app_env.lower() == "local":
            return f"{base} {type(exc).__name__}: {exc}"
        return base


admin_repository = AdminRepository()
