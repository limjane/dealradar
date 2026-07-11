"""Job: poll seed routes → fare_calendar (per-date) + price_snapshots (monthly rollup).

One provider call per route (task 3 / D15 / D17): the per-departure-date fares feed the
route-page graph (fare_calendar, append-only), and the same response is bucketed into the
cheapest-per-month snapshot rows the verdict engine (task 4) scores against. A single
route failing is logged and skipped — one bad route must not sink the whole run.
"""

import db
from dates import next_travel_months
from logging_setup import get_logger
from models import FareDay, PriceSnapshot
from providers import TravelpayoutsPriceSource
from providers.base import cheapest_by_month_from_days
from settings import settings

log = get_logger("poll")

MONTHS_AHEAD = 3  # current month + next 2 (monthly rollup window)


def run() -> None:
    source = TravelpayoutsPriceSource(settings.travelpayouts_token)
    months = next_travel_months(MONTHS_AHEAD)
    routes = db.active_routes()
    snapshots_written = 0
    days_written = 0
    errors = 0
    try:
        for route in routes:
            try:
                days = source.day_prices(route.origin, route.destination)
                days_written += db.insert_fare_days(
                    [
                        FareDay(
                            route_id=route.id,
                            depart_date=d.depart_date,
                            price=d.price,
                            currency=d.currency,
                            source=source.source_name,
                        )
                        for d in days
                    ]
                )
                snapshots_written += db.insert_snapshots(
                    [
                        PriceSnapshot(
                            route_id=route.id,
                            travel_month=p.travel_month,
                            cabin=p.cabin,
                            price=p.price,
                            currency=p.currency,
                            source=source.source_name,
                        )
                        for p in cheapest_by_month_from_days(days, months)
                    ]
                )
            except Exception as exc:  # noqa: BLE001 — isolate per-route failures
                errors += 1
                log.warning(
                    "route poll failed",
                    extra={
                        "summary": {
                            "route": f"{route.origin}-{route.destination}",
                            "error": str(exc),
                        }
                    },
                )
    finally:
        source.close()

    log.info(
        "poll run complete",
        extra={
            "summary": {
                "routes_polled": len(routes),
                "snapshots_written": snapshots_written,
                "calendar_days_written": days_written,
                "errors": errors,
                "months": months,
            }
        },
    )


if __name__ == "__main__":
    run()
