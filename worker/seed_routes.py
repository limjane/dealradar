"""Seed SG-outbound routes (short→long haul). Idempotent — run once.

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
    ("SIN", "CGK", 65),
    ("SIN", "DXB", 45),
    ("SIN", "CDG", 35),
    ("SIN", "FCO", 30),
    # D37 — expansion to 50 routes, new countries prioritized over duplicate cities.
    ("SIN", "KUL", 92),
    ("SIN", "SGN", 78),
    ("SIN", "PVG", 72),
    ("SIN", "DEL", 68),
    ("SIN", "BOM", 66),
    ("SIN", "PEK", 64),
    ("SIN", "KIX", 62),
    ("SIN", "PUS", 58),
    ("SIN", "CEB", 56),
    ("SIN", "CMB", 54),
    ("SIN", "KHH", 52),
    ("SIN", "REP", 50),
    ("SIN", "RGN", 48),
    ("SIN", "KTM", 46),
    ("SIN", "MLE", 44),
    ("SIN", "AKL", 42),
    ("SIN", "MEL", 41),
    ("SIN", "LAX", 38),
    ("SIN", "JFK", 36),
    ("SIN", "FRA", 34),
    ("SIN", "AMS", 33),
    ("SIN", "IST", 32),
    ("SIN", "DOH", 31),
    ("SIN", "BCN", 29),
    ("SIN", "ZRH", 27),
    ("SIN", "ATH", 25),
    ("SIN", "LIS", 23),
    ("SIN", "YVR", 21),
    ("SIN", "JNB", 19),
    ("SIN", "NBO", 17),
    ("SIN", "CAI", 15),
    ("SIN", "JED", 13),
    ("SIN", "DAC", 11),
    ("SIN", "BWN", 9),
    ("SIN", "VTE", 7),
    ("SIN", "NAN", 5),
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
