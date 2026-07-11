"""Travelpayouts Data API adapter (D10). Endpoint: /v1/prices/calendar.

Real behavior (verified 2026-07-10): the calendar endpoint IGNORES the depart_date month —
it returns one cached set of cheapest-fare-per-departure-date spanning ~a year ahead,
regardless of the month requested. So `day_prices()` makes ONE call per route and returns
the raw per-date fares; callers bucket by month via `cheapest_by_month_from_days` (D15/D17).

Data is aggregated/cached server-side (updates when users search the route), not a live
per-query quote — accepted tradeoff for a price-history/deals engine (D10). One-way fares.
"""

from datetime import date
from decimal import Decimal

import httpx

from providers.base import DayPrice, MonthPrice, cheapest_by_month_from_days

DEFAULT_CURRENCY = "sgd"  # SG-outbound seed market; API defaults to USD if omitted
_TIMEOUT = httpx.Timeout(15.0)


class ProviderError(RuntimeError):
    """Travelpayouts returned a non-success body or an unexpected shape."""


class TravelpayoutsPriceSource:
    source_name = "travelpayouts"
    BASE_URL = "https://api.travelpayouts.com/v1/prices/calendar"

    def __init__(
        self,
        token: str,
        currency: str = DEFAULT_CURRENCY,
        client: httpx.Client | None = None,
    ) -> None:
        if not token:
            raise ValueError("TRAVELPAYOUTS_TOKEN is required to poll prices")
        self._token = token
        self._currency = currency
        self._client = client or httpx.Client(timeout=_TIMEOUT)

    def day_prices(self, origin: str, destination: str) -> list[DayPrice]:
        """ONE API call: cheapest fare per departure date (sorted by date)."""
        data = self._fetch(origin, destination)
        out = [
            DayPrice(
                depart_date=date_str,
                price=Decimal(str(entry["price"])),
                currency=self._currency.upper(),
            )
            for date_str, entry in data.items()
            if entry and entry.get("price") is not None
        ]
        out.sort(key=lambda d: d.depart_date)
        return out

    def cheapest_by_month(
        self, origin: str, destination: str, months: list[str]
    ) -> list[MonthPrice]:
        """Convenience: day_prices grouped to the cheapest per requested month."""
        return cheapest_by_month_from_days(self.day_prices(origin, destination), months)

    def close(self) -> None:
        self._client.close()

    def _fetch(self, origin: str, destination: str) -> dict:
        resp = self._client.get(
            self.BASE_URL,
            params={
                "origin": origin,
                "destination": destination,
                # depart_date is required by the API but its month is ignored (see module
                # docstring) — pass the current month as a valid hint; callers bucket the
                # full response by month themselves.
                "depart_date": f"{date.today():%Y-%m}",
                "calendar_type": "departure_date",
                "one_way": "true",
                "currency": self._currency,
            },
            headers={"X-Access-Token": self._token},
        )
        resp.raise_for_status()
        body = resp.json()
        if not body.get("success", False):
            raise ProviderError(f"travelpayouts error for {origin}-{destination}: {body!r}")
        return body.get("data") or {}
