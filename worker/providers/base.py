"""PriceSource interface — the contract poll.py depends on, not any concrete provider."""

from collections import defaultdict
from decimal import Decimal
from typing import Protocol

from pydantic import BaseModel


class DayPrice(BaseModel):
    """Cheapest fare found for a route on one departure date. Provider-agnostic DTO."""

    depart_date: str  # YYYY-MM-DD
    price: Decimal
    currency: str  # ISO 4217, uppercase (e.g. SGD)


class MonthPrice(BaseModel):
    """Cheapest fare found for a route in one travel month. Provider-agnostic DTO.

    Maps to a PriceSnapshot row once poll.py attaches route_id + source.
    """

    travel_month: str  # YYYY-MM
    price: Decimal
    currency: str
    cabin: str = "ECONOMY"


def cheapest_by_month_from_days(days: list[DayPrice], months: list[str]) -> list[MonthPrice]:
    """Group per-date fares into the cheapest per requested month (months w/o data omitted)."""
    cheapest: dict[str, DayPrice] = {}
    grouped: dict[str, list[DayPrice]] = defaultdict(list)
    for d in days:
        grouped[d.depart_date[:7]].append(d)
    for month, entries in grouped.items():
        cheapest[month] = min(entries, key=lambda e: e.price)
    return [
        MonthPrice(travel_month=m, price=cheapest[m].price, currency=cheapest[m].currency)
        for m in months
        if m in cheapest
    ]


class PriceSource(Protocol):
    """A flight-price data source."""

    source_name: str

    def day_prices(self, origin: str, destination: str) -> list[DayPrice]:
        """Cheapest fare per departure date, as far ahead as the source knows."""
        ...
