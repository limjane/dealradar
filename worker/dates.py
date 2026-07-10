"""Small date helpers for the worker. No deps — keep it trivially testable."""

from datetime import date


def next_travel_months(n: int, today: date | None = None) -> list[str]:
    """The current month plus the following n-1 months, as 'YYYY-MM' strings.

    Current month is included: its remaining departure days are still valid to poll.
    """
    today = today or date.today()
    year, month = today.year, today.month
    out: list[str] = []
    for _ in range(n):
        out.append(f"{year:04d}-{month:02d}")
        month += 1
        if month > 12:
            month = 1
            year += 1
    return out
