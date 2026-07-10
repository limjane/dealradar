"""Adapter unit tests — no network. httpx.MockTransport feeds canned calendar responses."""

from datetime import date
from decimal import Decimal

import httpx
import pytest

from dates import next_travel_months
from providers.base import MonthPrice
from providers.travelpayouts import ProviderError, TravelpayoutsPriceSource


def _source(handler) -> TravelpayoutsPriceSource:
    client = httpx.Client(transport=httpx.MockTransport(handler))
    return TravelpayoutsPriceSource("tok", client=client)


def test_cheapest_by_month_picks_min_and_maps_currency() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["X-Access-Token"] == "tok"
        month = dict(request.url.params)["depart_date"]
        data = {
            f"{month}-05": {"price": 500},
            f"{month}-12": {"price": 388},  # cheapest
            f"{month}-20": {"price": 610},
        }
        return httpx.Response(200, json={"success": True, "data": data, "currency": "sgd"})

    res = _source(handler).cheapest_by_month("SIN", "BKK", ["2026-09"])
    assert res == [
        MonthPrice(travel_month="2026-09", price=Decimal("388"), currency="SGD", cabin="ECONOMY")
    ]


def test_multiple_months_one_row_each() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        month = dict(request.url.params)["depart_date"]
        return httpx.Response(
            200, json={"success": True, "data": {f"{month}-01": {"price": 250}}, "currency": "sgd"}
        )

    res = _source(handler).cheapest_by_month("SIN", "BKK", ["2026-09", "2026-10"])
    assert [r.travel_month for r in res] == ["2026-09", "2026-10"]


def test_empty_month_is_omitted() -> None:
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


def test_next_travel_months_wraps_year() -> None:
    assert next_travel_months(3, date(2026, 11, 10)) == ["2026-11", "2026-12", "2027-01"]
