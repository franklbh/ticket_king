import asyncio
import re
from typing import Any

from fastapi import HTTPException, status

from app.core.config import settings


class SupabasePostgresClient:
    def __init__(self) -> None:
        self.database_url = settings.database_url

    @property
    def configured(self) -> bool:
        return bool(
            self.database_url
            or (settings.db_user and settings.db_password and settings.db_host and settings.db_name)
        )

    async def select(
        self,
        table: str,
        *,
        params: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        return await asyncio.to_thread(self._select_sync, table, params)

    async def insert(self, table: str, rows: dict[str, Any] | list[dict[str, Any]]) -> list[dict[str, Any]]:
        payload = rows if isinstance(rows, list) else [rows]
        return await asyncio.to_thread(self._insert_sync, table, payload)

    async def update(
        self,
        table: str,
        *,
        match_column: str,
        match_value: str | int,
        values: dict[str, Any],
    ) -> list[dict[str, Any]]:
        return await asyncio.to_thread(
            self._update_sync,
            table,
            match_column,
            match_value,
            values,
        )

    def _connect(self):
        if not self.configured:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Admin Postgres connection is not configured.",
            )
        try:
            from psycopg import connect
            from psycopg.rows import dict_row
        except ImportError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Install admin-backend dependencies first: pip install -e .",
            ) from exc
        try:
            if self.database_url:
                return connect(self.database_url, row_factory=dict_row)
            return connect(
                user=settings.db_user,
                password=settings.db_password,
                host=settings.db_host,
                port=settings.db_port,
                dbname=settings.db_name,
                row_factory=dict_row,
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Could not connect to Admin Postgres database.",
            ) from exc

    def _select_sync(self, table: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        limit = settings.max_table_rows
        if params and params.get("limit"):
            limit = min(int(params["limit"]), settings.max_table_rows)
        sql = f"select * from {self._identifier(table)} limit %s"
        try:
            with self._connect() as connection:
                with connection.cursor() as cursor:
                    cursor.execute(sql, (limit,))
                    return [dict(row) for row in cursor.fetchall()]
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Database select failed for table '{table}'.") from exc

    def _insert_sync(self, table: str, rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if not rows:
            return []
        columns = list(rows[0].keys())
        placeholders = ", ".join(["%s"] * len(columns))
        column_sql = ", ".join(self._identifier(column) for column in columns)
        values = [tuple(row.get(column) for column in columns) for row in rows]
        sql = (
            f"insert into {self._identifier(table)} ({column_sql}) "
            f"values ({placeholders}) returning *"
        )
        try:
            with self._connect() as connection:
                with connection.cursor() as cursor:
                    cursor.executemany(sql, values, returning=True)
                    results: list[dict[str, Any]] = []
                    while True:
                        results.extend(dict(row) for row in cursor.fetchall())
                        if not cursor.nextset():
                            break
                    return results
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Database insert failed for table '{table}'.") from exc

    def _update_sync(
        self,
        table: str,
        match_column: str,
        match_value: str | int,
        values: dict[str, Any],
    ) -> list[dict[str, Any]]:
        if not values:
            return []
        columns = list(values.keys())
        set_sql = ", ".join(f"{self._identifier(column)} = %s" for column in columns)
        sql = (
            f"update {self._identifier(table)} "
            f"set {set_sql} "
            f"where {self._identifier(match_column)} = %s "
            "returning *"
        )
        params = [values[column] for column in columns] + [match_value]
        try:
            with self._connect() as connection:
                with connection.cursor() as cursor:
                    cursor.execute(sql, params)
                    return [dict(row) for row in cursor.fetchall()]
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Database update failed for table '{table}'.") from exc

    @staticmethod
    def _identifier(value: str) -> str:
        parts = value.split(".")
        for part in parts:
            if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", part):
                raise HTTPException(status_code=400, detail=f"Invalid SQL identifier: {value}")
        return ".".join(f'"{part}"' for part in parts)


supabase = SupabasePostgresClient()
