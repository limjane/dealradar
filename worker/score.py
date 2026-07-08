"""Job: score snapshots vs rolling median → upsert deals. Logic lands in task 4.

scoring v1 (foundation §3): discount_pct = (median_60d − current) / median_60d.
Publish ≥15%, instant-alert ≥30%, ≥14 days history required, expire on rebound
>10% or 48h unrefreshed. Every scoring decision gets logged (explainability).
"""

from logging_setup import get_logger

log = get_logger("score")


def run() -> None:
    log.info(
        "score run complete (scaffold no-op)",
        extra={"summary": {"deals_created": 0, "deals_expired": 0}},
    )


if __name__ == "__main__":
    run()
