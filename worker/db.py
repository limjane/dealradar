"""Postgres connection for the worker — standard postgres:// to the same Neon DB as the web app."""

from contextlib import contextmanager

import psycopg

from models import PriceSnapshot, Route
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
