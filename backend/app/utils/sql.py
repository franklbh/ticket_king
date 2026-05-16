from __future__ import annotations

import re

from fastapi import HTTPException

SQL_IDENTIFIER_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


def split_table_name(table_name: str) -> tuple[str | None, str]:
    parts = table_name.split(".")
    if len(parts) == 1:
        schema = None
        name = parts[0]
    elif len(parts) == 2:
        schema, name = parts
    else:
        raise HTTPException(status_code=400, detail=f"Invalid SQL table: {table_name}")

    for part in [item for item in [schema, name] if item]:
        if not SQL_IDENTIFIER_RE.fullmatch(part):
            raise HTTPException(status_code=400, detail=f"Invalid SQL table: {table_name}")
    return schema, name
