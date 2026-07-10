"""Job: poll seed routes → price_snapshots (task 3).

Per active route, ask the PriceSource for the cheapest fare in each of the next few travel
months and append one snapshot row per (route, month). Daily accrual builds the history the
verdict engine (task 4) scores against. A single route failing is logged and skipped — one
bad route must not sink the whole run.
"""

import db
from dates import next_travel_months
from logging_setup import get_logger
from models import PriceSnapshot
from providers import TravelpayoutsPriceSource
from settings import settings

log = get_logger("poll")

MONTHS_AHEAD = 3  # current month + next 2


def run() -> None:
    source = TravelpayoutsPriceSource(settings.travelpayouts_token)
    months = next_travel_months(MONTHS_AHEAD)
    routes = db.active_routes()
    written = 0
    errors = 0
    try:
        for route in routes:
            try:
                prices = source.cheapest_by_month(route.origin, route.destination, months)
                snaps = [
                    PriceSnapshot(
                        route_id=route.id,
                        travel_month=p.travel_month,
                        cabin=p.cabin,
                        price=p.price,
                        currency=p.currency,
                        source=source.source_name,
                    )
                    for p in prices
                ]
                written += db.insert_snapshots(snaps)
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
                "snapshots_written": written,
                "errors": errors,
                "months": months,
            }
        },
    )


if __name__ == "__main__":
    run()
