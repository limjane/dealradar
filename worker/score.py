"""Job: score each route's cheapest tracked fare vs its own history -> upsert deals.

v1 (foundation §3, task 4): one active deal per route (dumb on purpose — see verdict.py).
Only GRAB-level verdicts (>=15% below the route+month's own 60-day median, with >=14 days
of history) get published to `deals`; a route that drops out of GRAB (price rebounded, or
history reset) has its existing active deal expired. A route failing to score is logged and
skipped — one bad route must not sink the whole run (same isolation pattern as poll.py).
"""

import db
from dates import default_date_for_month
from logging_setup import get_logger
from models import Deal
from verdict import VerdictLabel, compute_verdict

log = get_logger("score")


def run() -> None:
    routes = db.active_routes()
    created = 0
    updated = 0
    expired = 0
    errors = 0

    for route in routes:
        try:
            candidate = db.cheapest_current_snapshot(route.id)
            existing_id = db.active_deal_id(route.id)
            if candidate is None:
                if existing_id is not None:
                    db.expire_deal(existing_id)
                    expired += 1
                continue

            history, span_days = db.month_price_history(route.id, candidate.travel_month)
            v = compute_verdict(candidate.price, history, span_days)

            if v.label != VerdictLabel.GRAB:
                if existing_id is not None:
                    db.expire_deal(existing_id)
                    expired += 1
                continue

            deal = Deal(
                route_id=route.id,
                price=candidate.price,
                baseline_median=v.baseline_median,
                discount_pct=v.discount_pct,
                score=v.discount_pct,
                deep_link_params={
                    "to": route.destination,
                    "depart": default_date_for_month(candidate.travel_month),
                },
            )
            db.upsert_active_deal(existing_id, deal)
            if existing_id is None:
                created += 1
            else:
                updated += 1
        except Exception as exc:  # noqa: BLE001 — isolate per-route failures
            errors += 1
            log.warning(
                "route score failed",
                extra={
                    "summary": {
                        "route": f"{route.origin}-{route.destination}",
                        "error": str(exc),
                    }
                },
            )

    log.info(
        "score run complete",
        extra={
            "summary": {
                "routes_scored": len(routes),
                "deals_created": created,
                "deals_updated": updated,
                "deals_expired": expired,
                "errors": errors,
            }
        },
    )


if __name__ == "__main__":
    run()
