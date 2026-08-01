"""Deal scoring v1 — foundation §3 (task 4). Pure, no I/O: table-driven-testable.

discount_pct = (baseline_median - current) / baseline_median, evaluated per route's
currently-cheapest tracked travel-month against that same route+month's own price
history. Kept dumb on purpose (v1); percentile/seasonal scoring is a post-launch upgrade
once 30-60 days of real data land (see decisions.md D11-era beta-launch plan).
"""

from collections.abc import Mapping, Sequence
from decimal import Decimal
from enum import StrEnum

from pydantic import BaseModel

from models import MonthCandidate

MIN_HISTORY_DAYS = 14
GRAB_THRESHOLD = Decimal("0.15")
HIGH_THRESHOLD = Decimal("-0.15")


class VerdictLabel(StrEnum):
    GRAB = "grab"
    FAIR = "fair"
    HIGH = "high"
    NO_VERDICT = "nodata"


class Verdict(BaseModel):
    label: VerdictLabel
    discount_pct: Decimal
    baseline_median: Decimal


def median(prices: list[Decimal]) -> Decimal:
    s = sorted(prices)
    n = len(s)
    mid = n // 2
    return s[mid] if n % 2 else (s[mid - 1] + s[mid]) / 2


def compute_verdict(current: Decimal, history: list[Decimal], history_span_days: int) -> Verdict:
    """`history` = that route+month's own price_snapshot prices (any window); the caller
    decides the window. `history_span_days` = days between the oldest and newest snapshot
    in that history, used only to gate NO_VERDICT — too short a span makes a median
    meaningless even if enough rows exist (e.g. all polled within one hour).
    """
    baseline = median(history) if history else current
    if not history or history_span_days < MIN_HISTORY_DAYS:
        return Verdict(
            label=VerdictLabel.NO_VERDICT, discount_pct=Decimal(0), baseline_median=baseline
        )

    discount_pct = (baseline - current) / baseline if baseline else Decimal(0)
    if discount_pct >= GRAB_THRESHOLD:
        label = VerdictLabel.GRAB
    elif discount_pct <= HIGH_THRESHOLD:
        label = VerdictLabel.HIGH
    else:
        label = VerdictLabel.FAIR
    return Verdict(label=label, discount_pct=discount_pct, baseline_median=baseline)


def select_verdict_month(
    candidates: Sequence[MonthCandidate],
    histories: Mapping[str, tuple[list[Decimal], int]],
) -> MonthCandidate | None:
    """Which of a route's tracked months to score.

    "Cheapest month" alone silently kills the verdict at every month rollover: the rolling
    poll window admits a brand-new travel month with 1 snapshot (0-day span), that month is
    often the cheapest, and `compute_verdict` correctly returns NO_VERDICT for it even though
    the route has weeks of usable history on its other months. So: cheapest month **that has
    enough history**, falling back to cheapest overall only when none qualifies (a genuinely
    new route, which then honestly scores NO_VERDICT). Mirrored in
    apps/web/lib/verdict.ts::selectVerdictMonth — change one, change both.
    """
    if not candidates:
        return None
    mature = [
        c
        for c in candidates
        if (h := histories.get(c.travel_month)) is not None and h[0] and h[1] >= MIN_HISTORY_DAYS
    ]
    pool = mature or list(candidates)
    return min(pool, key=lambda c: c.price)
