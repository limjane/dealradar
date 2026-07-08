"""Job: poll seed routes → price_snapshots. Real Amadeus adapter lands in task 3.

Scaffold behavior: verify DB connectivity and log the run summary, so the Render
cron + logging + DB path is proven green end-to-end before task 3 builds on it.
"""

import db
from logging_setup import get_logger

log = get_logger("poll")


def run() -> None:
    ok = db.healthcheck()
    log.info(
        "poll run complete (scaffold no-op)",
        extra={
            "summary": {
                "db_ok": ok,
                "routes_polled": 0,
                "snapshots_written": 0,
            }
        },
    )


if __name__ == "__main__":
    run()
