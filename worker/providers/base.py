"""PriceSource interface — the contract poll.py depends on, not any concrete provider."""

from decimal import Decimal
from typing import Protocol

from pydantic import BaseModel


class MonthPrice(BaseModel):
    """Cheapest fare found for a route in one travel month. Provider-agnostic DTO.

    Maps to a PriceSnapshot row once poll.py attaches route_id + source.
    """

    travel_month: str  # YYYY-MM
    price: Decimal
    currency: str  # ISO 4217, uppercase (e.g. SGD)
    cabin: str = "ECONOMY"


class PriceSource(Protocol):
    """A flight-price data source. One method: cheapest fare per requested travel month."""

    source_name: str

    def cheapest_by_month(
        self, origin: str, destination: str, months: list[str]
    ) -> list[MonthPrice]:
        """Return one MonthPrice per month that had any fare (months with no data are omitted)."""
        ...
