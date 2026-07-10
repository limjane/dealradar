"""Smoke tests: models import and validate. Table-driven scoring tests land in task 4."""

from decimal import Decimal

from models import DealStatus, PriceSnapshot


def test_price_snapshot_validates() -> None:
    snap = PriceSnapshot(
        route_id=1,
        travel_month="2026-09",
        cabin="ECONOMY",
        price=Decimal("412.50"),
        currency="SGD",
        source="travelpayouts",
    )
    assert snap.travel_month == "2026-09"


def test_deal_status_values() -> None:
    assert {s.value for s in DealStatus} == {"active", "expired"}
