"""Travelpayouts Data API adapter (D10). Endpoint: /v1/prices/calendar.

Real behavior (verified 2026-07-10): the calendar endpoint IGNORES the depart_date month —
it returns one cached set of cheapest-fare-per-departure-date spanning ~a year ahead,
regardless of the month requested. So we make ONE call per route and bucket the returned
dates by month ourselves, taking the cheapest fare in each month. That yields an accurate
"cheapest to fly in month X" per travel month, and is cheaper (1 call/route, not 3).

Data is aggregated/cached server-side (updates when users search the route), not a live
per-query quote — accepted tradeoff for a price-history/deals engine (D10). One-way fares.
"""

from collections import defaultdict
from decimal import Decimal

import httpx

from providers.base import MonthPrice

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

    def cheapest_by_month(
        self, origin: str, destination: str, months: list[str]
    ) -> list[MonthPrice]:
        """One API call, then bucket the returned dates by month and keep the min per month.

        Returns a MonthPrice only for the requested `months` that actually have fares.
        """
        data = self._fetch(origin, destination, months[0] if months else None)
        cheapest: dict[str, Decimal] = defaultdict(lambda: Decimal("Infinity"))
        for date_str, entry in data.items():
            if not entry or entry.get("price") is None:
                continue
            month = date_str[:7]  # "YYYY-MM-DD" -> "YYYY-MM"
            price = Decimal(str(entry["price"]))
            if price < cheapest[month]:
                cheapest[month] = price
        return [
            MonthPrice(travel_month=m, price=cheapest[m], currency=self._currency.upper())
            for m in months
            if m in cheapest
        ]

    def close(self) -> None:
        self._client.close()

    def _fetch(self, origin: str, destination: str, depart_hint: str | None) -> dict:
        resp = self._client.get(
            self.BASE_URL,
            params={
                "origin": origin,
                "destination": destination,
                # depart_date is required by the API but its month is ignored (see module
                # docstring) — we bucket the full response by month ourselves.
                "depart_date": depart_hint or "",
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
