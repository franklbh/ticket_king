from __future__ import annotations

from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Iterable


TERRACOTTA_TUESDAY_DISCOUNT_CODE = "terracotta_tuesday_50"
TERRACOTTA_TUESDAY_DISCOUNT_RATE = Decimal("0.50")
TERRACOTTA_EVENT_SLUG = "terracotta-warriors"


def _money(value: Decimal | int | float | str) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def calculate_automatic_promotions(lines: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    eligible_subtotal = Decimal("0")
    discount_amount = Decimal("0")

    for line in lines:
        if str(line.get("event_slug") or "") != TERRACOTTA_EVENT_SLUG:
            continue
        slot_date = date.fromisoformat(str(line.get("slot_date"))[:10])
        if slot_date.weekday() != 1:
            continue

        unit_price = _money(line.get("unit_price") or 0)
        quantity = max(0, int(line.get("quantity") or 0))
        discounted_unit_price = _money(unit_price * TERRACOTTA_TUESDAY_DISCOUNT_RATE)
        eligible_subtotal += unit_price * quantity
        discount_amount += (unit_price - discounted_unit_price) * quantity

    eligible_subtotal = _money(eligible_subtotal)
    discount_amount = _money(discount_amount)
    if discount_amount <= 0:
        return []

    return [
        {
            "code": TERRACOTTA_TUESDAY_DISCOUNT_CODE,
            "source": "automatic",
            "discountType": "percent",
            "discountValue": 50,
            "eligibleSubtotal": float(eligible_subtotal),
            "discountAmount": float(discount_amount),
        }
    ]

