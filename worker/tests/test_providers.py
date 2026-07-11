"""Adapter unit tests — no network. httpx.MockTransport feeds canned calendar responses.

The real calendar endpoint returns one dataset of cheapest-fare-per-date spanning ~a year
(it ignores the requested month), so the adapter makes ONE call and buckets by month. Tests
mirror that: a single response with dates across several months, grouped to a min per month.
"""

from datetime import date
from decimal import Decimal

import httpx
import pytest

from dates import next_travel_months
from providers.base import MonthPrice
from providers.travelpayouts import ProviderError, TravelpayoutsPriceSource

# One cached dataset spanning multiple months (as the real API returns).
_CALENDAR = {
    "success": True,
    "currency": "sgd",
    "data": {
        "2026-09-05": {"price": 500},
        "2026-09-12": {"price": 388},  # cheapest Sep
        "2026-09-20": {"price": 610},
        "2026-10-03": {"price": 250},  # cheapest Oct
        "2026-10-19": {"price": 322},
    },
}


def _source(handler) -> TravelpayoutsPriceSource:
    client = httpx.Client(transport=httpx.MockTransport(handler))
    return TravelpayoutsPriceSource("tok", client=client)


def test_buckets_by_month_and_keeps_min() -> None:
    calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        assert request.headers["X-Access-Token"] == "tok"
        return httpx.Response(200, json=_CALENDAR)

    res = _source(handler).cheapest_by_month("SIN", "BKK", ["2026-09", "2026-10"])
    assert res == [
        MonthPrice(travel_month="2026-09", price=Decimal("388"), currency="SGD"),
        MonthPrice(travel_month="2026-10", price=Decimal("250"), currency="SGD"),
    ]
    assert calls["n"] == 1  # ONE call per route, not one per month


def test_requested_month_with_no_data_is_omitted() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=_CALENDAR)

    # 2026-12 has no fares in the dataset -> only Sep comes back.
    res = _source(handler).cheapest_by_month("SIN", "BKK", ["2026-09", "2026-12"])
    assert [r.travel_month for r in res] == ["2026-09"]


def test_empty_data_returns_nothing() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"success": True, "data": {}, "currency": "sgd"})

    assert _source(handler).cheapest_by_month("SIN", "XXX", ["2026-09"]) == []


def test_non_success_body_raises() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"success": False, "data": None, "error": "bad token"})

    with pytest.raises(ProviderError):
        _source(handler).cheapest_by_month("SIN", "BKK", ["2026-09"])


def test_missing_token_raises() -> None:
    with pytest.raises(ValueError):
        TravelpayoutsPriceSource("")


def test_day_prices_parses_and_sorts() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=_CALENDAR)

    days = _source(handler).day_prices("SIN", "BKK")
    assert [d.depart_date for d in days] == sorted(d.depart_date for d in days)
    assert len(days) == 5
    assert days[0].currency == "SGD"


def test_next_travel_months_wraps_year() -> None:
    assert next_travel_months(3, date(2026, 11, 10)) == ["2026-11", "2026-12", "2027-01"]
