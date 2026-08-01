"""Postgres connection for the worker — standard postgres:// to the same Neon DB as the web app."""

from contextlib import contextmanager
from datetime import datetime
from decimal import Decimal

import psycopg
from psycopg.types.json import Json

from models import Deal, FareDay, MonthCandidate, PriceSnapshot, Route
from settings import settings


@contextmanager
def get_conn():
    """One connection per job run — jobs are short cron bursts, no pool needed at MVP."""
    conn = psycopg.connect(settings.database_url)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def healthcheck() -> bool:
    with get_conn() as conn:
        return conn.execute("SELECT 1").fetchone() == (1,)


def active_routes() -> list[Route]:
    """Seed routes to poll, highest seed_priority first."""
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT id, origin, destination, active, seed_priority "
            "FROM routes WHERE active = true ORDER BY seed_priority DESC, id"
        ).fetchall()
    return [
        Route(id=r[0], origin=r[1], destination=r[2], active=r[3], seed_priority=r[4]) for r in rows
    ]


def insert_snapshots(snaps: list[PriceSnapshot]) -> int:
    """Append price_snapshots rows (table is append-only, §3). Returns count written."""
    if not snaps:
        return 0
    with get_conn() as conn, conn.cursor() as cur:
        cur.executemany(
            "INSERT INTO price_snapshots "
            "(route_id, travel_month, cabin, price, currency, source) "
            "VALUES (%s, %s, %s, %s, %s, %s)",
            [(s.route_id, s.travel_month, s.cabin, s.price, s.currency, s.source) for s in snaps],
        )
    return len(snaps)


def insert_fare_days(days: list[FareDay]) -> int:
    """Append fare_calendar rows (per-departure-date fares, D17). Returns count written."""
    if not days:
        return 0
    with get_conn() as conn, conn.cursor() as cur:
        cur.executemany(
            "INSERT INTO fare_calendar (route_id, depart_date, price, currency, source) "
            "VALUES (%s, %s, %s, %s, %s)",
            [(d.route_id, d.depart_date, d.price, d.currency, d.source) for d in days],
        )
    return len(days)


def month_candidates(route_id: int) -> list[MonthCandidate]:
    """Every tracked (travel_month, price) for the route — one row per month, latest poll
    only, same "latest per group" logic as the web read layer (apps/web/lib/deals.ts)
    mirrors independently. Cheapest-first; which one actually gets scored is
    verdict.select_verdict_month's call, not this query's (D34)."""
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT s.travel_month, s.price, s.currency "
            "FROM price_snapshots s "
            "JOIN (SELECT travel_month, max(fetched_at) AS mx FROM price_snapshots "
            "      WHERE route_id = %(route_id)s GROUP BY travel_month) l "
            "  ON l.travel_month = s.travel_month AND l.mx = s.fetched_at "
            "WHERE s.route_id = %(route_id)s "
            "ORDER BY s.price ASC",
            {"route_id": route_id},
        ).fetchall()
    return [MonthCandidate(travel_month=r[0], price=r[1], currency=r[2]) for r in rows]


def month_histories(route_id: int, window_days: int = 60) -> dict[str, tuple[list[Decimal], int]]:
    """Per travel-month: that route+month's own snapshot prices within the trailing window,
    plus the day-span between its oldest and newest snapshot (used to gate "not enough
    history yet"). One query for all of the route's months."""
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT travel_month, price, fetched_at FROM price_snapshots "
            "WHERE route_id = %s "
            "  AND fetched_at >= now() - (%s || ' days')::interval "
            "ORDER BY travel_month, fetched_at",
            (route_id, window_days),
        ).fetchall()
    by_month: dict[str, tuple[list[Decimal], list[datetime]]] = {}
    for travel_month, price, fetched_at in rows:
        prices, fetched_ats = by_month.setdefault(travel_month, ([], []))
        prices.append(price)
        fetched_ats.append(fetched_at)
    return {
        month: (prices, (fetched_ats[-1] - fetched_ats[0]).days)
        for month, (prices, fetched_ats) in by_month.items()
    }


def active_deal_id(route_id: int) -> int | None:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT id FROM deals WHERE route_id = %s AND status = 'active' LIMIT 1",
            (route_id,),
        ).fetchone()
    return row[0] if row else None


def upsert_active_deal(existing_id: int | None, deal: Deal) -> None:
    """Update the route's existing active deal in place, or insert a new one. One active
    deal per route in v1 (dumb on purpose — see verdict.py)."""
    with get_conn() as conn, conn.cursor() as cur:
        if existing_id is not None:
            cur.execute(
                "UPDATE deals SET price=%s, baseline_median=%s, discount_pct=%s, score=%s, "
                "deep_link_params=%s WHERE id=%s",
                (
                    deal.price,
                    deal.baseline_median,
                    deal.discount_pct,
                    deal.score,
                    Json(deal.deep_link_params),
                    existing_id,
                ),
            )
        else:
            cur.execute(
                "INSERT INTO deals (route_id, price, baseline_median, discount_pct, score, "
                "deep_link_params, status) VALUES (%s, %s, %s, %s, %s, %s, 'active')",
                (
                    deal.route_id,
                    deal.price,
                    deal.baseline_median,
                    deal.discount_pct,
                    deal.score,
                    Json(deal.deep_link_params),
                ),
            )


def expire_deal(deal_id: int) -> None:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("UPDATE deals SET status='expired', expires_at=now() WHERE id=%s", (deal_id,))
