import unittest
from decimal import Decimal

from app.services.promotions import (
    TERRACOTTA_TUESDAY_DISCOUNT_CODE,
    calculate_automatic_promotions,
)


class AutomaticPromotionTests(unittest.TestCase):
    def test_applies_to_terracotta_tuesday_lines(self):
        promotions = calculate_automatic_promotions(
            [
                {
                    "event_slug": "terracotta-warriors",
                    "slot_date": "2026-07-28",
                    "unit_price": Decimal("37.95"),
                    "quantity": 2,
                }
            ]
        )

        self.assertEqual(len(promotions), 1)
        self.assertEqual(promotions[0]["code"], TERRACOTTA_TUESDAY_DISCOUNT_CODE)
        self.assertEqual(promotions[0]["eligibleSubtotal"], 75.90)
        self.assertEqual(promotions[0]["discountAmount"], 37.94)

    def test_does_not_apply_to_other_days_or_events(self):
        promotions = calculate_automatic_promotions(
            [
                {
                    "event_slug": "terracotta-warriors",
                    "slot_date": "2026-07-27",
                    "unit_price": Decimal("37.95"),
                    "quantity": 1,
                },
                {
                    "event_slug": "panda-vr",
                    "slot_date": "2026-07-28",
                    "unit_price": Decimal("25.95"),
                    "quantity": 1,
                },
            ]
        )

        self.assertEqual(promotions, [])

    def test_only_discounts_eligible_lines_in_a_mixed_cart(self):
        promotions = calculate_automatic_promotions(
            [
                {
                    "event_slug": "terracotta-warriors",
                    "slot_date": "2026-07-28",
                    "unit_price": Decimal("37.95"),
                    "quantity": 1,
                },
                {
                    "event_slug": "panda-vr",
                    "slot_date": "2026-07-28",
                    "unit_price": Decimal("25.95"),
                    "quantity": 1,
                },
            ]
        )

        self.assertEqual(promotions[0]["eligibleSubtotal"], 37.95)
        self.assertEqual(promotions[0]["discountAmount"], 18.97)


if __name__ == "__main__":
    unittest.main()

