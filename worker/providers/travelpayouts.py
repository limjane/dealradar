"""Travelpayouts Data API adapter (D10). Endpoint: /v1/prices/calendar.

The calendar endpoint returns the cheapest fare per departure day for a route+month. We
call it once per (route, travel_month) and keep the single cheapest fare in that month —
matching the price_snapshots granularity (travel_month, not day) and the deals wedge
("how cheap can I fly this month?").

Data is aggregated/cached server-side (~7 days), not a live per-query quote — accepted
tradeoff for a price-history/deals engine (D10). One-way fares only: a clean, consistent
per-month minimum without return-date combinatorics.
"""

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
        out: list[MonthPrice] = []
        for month in months:
            data = self._fetch_month(origin, destination, month)
            cheapest = self._min_price(data)
            if cheapest is not None:
                out.append(
                    MonthPrice(
                        travel_month=month,
                        price=cheapest,
                        currency=self._currency.upper(),
                    )
                )
        return out

    def close(self) -> None:
        self._client.close()

    def _fetch_month(self, origin: str, destination: str, month: str) -> dict:
        resp = self._client.get(
            self.BASE_URL,
            params={
                "origin": origin,
                "destination": destination,
                "depart_date": month,  # YYYY-MM = whole month
                "calendar_type": "departure_date",
                "one_way": "true",
                "currency": self._currency,
            },
            headers={"X-Access-Token": self._token},
        )
        resp.raise_for_status()
        body = resp.json()
        if not body.get("success", False):
            raise ProviderError(f"travelpayouts error for {origin}-{destination} {month}: {body!r}")
        return body.get("data") or {}

    @staticmethod
    def _min_price(data: dict) -> Decimal | None:
        prices = [
            Decimal(str(entry["price"]))
            for entry in data.values()
            if entry and entry.get("price") is not None
        ]
        return min(prices) if prices else None
