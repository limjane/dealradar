"""Seed the 10 test routes (SG-outbound, short→long haul). Idempotent — run once.

    python seed_routes.py

seed_priority orders polling: higher = polled first (higher-volume/short-haul leads).
"""

import db
from logging_setup import get_logger

log = get_logger("seed_routes")

# (origin, destination, seed_priority) — all ex-SIN; mix of haul lengths.
SEED_ROUTES: list[tuple[str, str, int]] = [
    ("SIN", "BKK", 100),
    ("SIN", "DPS", 95),
    ("SIN", "HKG", 90),
    ("SIN", "TPE", 85),
    ("SIN", "ICN", 80),
    ("SIN", "NRT", 75),
    ("SIN", "MNL", 70),
    ("SIN", "SYD", 60),
    ("SIN", "PER", 55),
    ("SIN", "LHR", 40),
]


def run() -> None:
    with db.get_conn() as conn, conn.cursor() as cur:
        cur.executemany(
            "INSERT INTO routes (origin, destination, seed_priority) VALUES (%s, %s, %s) "
            "ON CONFLICT (origin, destination) DO NOTHING",
            SEED_ROUTES,
        )
    total = len(db.active_routes())
    log.info(
        "seed complete", extra={"summary": {"seeded": len(SEED_ROUTES), "active_routes": total}}
    )


if __name__ == "__main__":
    run()
