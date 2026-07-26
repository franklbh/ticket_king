import unittest
from decimal import Decimal
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException

from app.schemas.checkout import CheckoutOrder
from app.schemas.public import AvailableSlotRead, SlotTicketTypeRead
from app.services.promotions import TERRACOTTA_TUESDAY_DISCOUNT_CODE
from app.services.reservations import _validate_capacity, create_reservation


def checkout_order(*, unit_price: str = "37.95", total_amount: str = "22.20") -> CheckoutOrder:
    return CheckoutOrder.model_validate(
        {
            "customer": {"name": "Test Customer", "email": "test@example.com"},
            "items": [
                {
                    "eventId": 1,
                    "slotId": "slot-1",
                    "ticketTypeId": 159,
                    "eventName": "Terracotta Warriors",
                    "slotDate": "2026-07-28",
                    "slotTime": "10:00-10:30",
                    "ticketType": "Adult",
                    "quantity": 1,
                    "unitPrice": unit_price,
                }
            ],
            "paymentFee": "2.27",
            "gst": "0.95",
            "totalAmount": total_amount,
        }
    )


def tuesday_slot() -> AvailableSlotRead:
    return AvailableSlotRead(
        id="slot-1",
        eventId=1,
        eventSlug="terracotta-warriors",
        date="2026-07-28",
        startTime="10:00",
        endTime="10:30",
        label="10:00-10:30",
        capacity=20,
        availableSeats=20,
        price=37.95,
        status="active",
        ticketTypes=[
            SlotTicketTypeRead(id="159", label="Adult", price=37.95, minQty=1)
        ],
    )


class ReservationPromotionTests(unittest.IsolatedAsyncioTestCase):
    async def test_original_price_is_validated_and_automatic_coupon_is_stored(self):
        order = checkout_order()
        inserted_orders = []

        async def insert(table, values):
            if table == "order_items":
                return values
            inserted_orders.append(values)
            return [values]

        with (
            patch(
                "app.services.reservations.expire_stale_reservations",
                new=AsyncMock(),
            ),
            patch(
                "app.services.reservations._validate_capacity",
                new=AsyncMock(
                    return_value=[
                        {
                            "event_slug": "terracotta-warriors",
                            "slot_date": "2026-07-28",
                            "unit_price": Decimal("37.95"),
                            "quantity": 1,
                        }
                    ]
                ),
            ),
            patch(
                "app.services.reservations.admin_repository.columns",
                new=AsyncMock(return_value=set()),
            ),
            patch(
                "app.services.reservations.admin_repository.insert",
                new=AsyncMock(side_effect=insert),
            ),
        ):
            response = await create_reservation(order, 2220)

        saved_order = inserted_orders[0]
        self.assertEqual(saved_order["ticket_amount"], Decimal("37.95"))
        self.assertEqual(saved_order["coupon_discount"], Decimal("18.97"))
        self.assertEqual(saved_order["coupon_code"], TERRACOTTA_TUESDAY_DISCOUNT_CODE)
        self.assertEqual(saved_order["total_amount"], Decimal("22.20"))
        self.assertEqual(response["automaticDiscount"], 18.97)
        self.assertEqual(response["totalAmount"], 22.20)

    async def test_discounted_client_unit_price_is_rejected(self):
        from app.services.public_catalog import public_catalog_service

        with patch.object(
            public_catalog_service,
            "available_slots",
            new=AsyncMock(return_value=[tuesday_slot()]),
        ):
            with self.assertRaises(HTTPException) as raised:
                await _validate_capacity(
                    checkout_order(unit_price="18.98", total_amount="22.20")
                )

        self.assertEqual(raised.exception.status_code, 400)
        self.assertEqual(
            raised.exception.detail,
            "Ticket price no longer matches this time.",
        )


if __name__ == "__main__":
    unittest.main()

