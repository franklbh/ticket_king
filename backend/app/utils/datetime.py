from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def utc_now_iso_seconds() -> str:
    return utc_now().isoformat(timespec="seconds")


def utc_now_millis_z() -> str:
    return utc_now().strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def format_datetime(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)
