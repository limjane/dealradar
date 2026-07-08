"""Job: dispatch alert emails via Resend. Lands in task 8 (double opt-in first — §4.4)."""

from logging_setup import get_logger

log = get_logger("alert")


def run() -> None:
    log.info(
        "alert run complete (scaffold no-op)",
        extra={"summary": {"alerts_sent": 0}},
    )


if __name__ == "__main__":
    run()
