"""Postgres connection for the worker — standard postgres:// to the same Neon DB as the web app."""

from contextlib import contextmanager

import psycopg

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
