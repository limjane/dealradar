"""Table-driven tests for the pure verdict function (foundation §3, task 4 must-test item)."""

from decimal import Decimal

from models import MonthCandidate
from verdict import VerdictLabel, compute_verdict, median, select_verdict_month

CASES = [
    # (name, current, history, span_days, expected_label)
    ("38% below median -> grab", Decimal("312"), [Decimal("505")] * 20, 20, VerdictLabel.GRAB),
    (
        "exactly 15% below -> grab (boundary)",
        Decimal("425"),
        [Decimal("500")] * 20,
        20,
        VerdictLabel.GRAB,
    ),
    ("within +-15% -> fair", Decimal("470"), [Decimal("500")] * 20, 20, VerdictLabel.FAIR),
    ("22% above median -> high", Decimal("610"), [Decimal("500")] * 20, 20, VerdictLabel.HIGH),
    (
        "exactly 15% above -> high (boundary)",
        Decimal("575"),
        [Decimal("500")] * 20,
        20,
        VerdictLabel.HIGH,
    ),
    ("no history -> nodata", Decimal("312"), [], 0, VerdictLabel.NO_VERDICT),
    (
        "history span too short -> nodata",
        Decimal("312"),
        [Decimal("500")] * 5,
        6,
        VerdictLabel.NO_VERDICT,
    ),
    (
        "history span exactly 14d -> scored",
        Decimal("500"),
        [Decimal("500")] * 14,
        14,
        VerdictLabel.FAIR,
    ),
]


def test_verdict_labels() -> None:
    for name, current, history, span, expected in CASES:
        v = compute_verdict(current, history, span)
        assert v.label == expected, f"{name}: got {v.label}, expected {expected}"


def test_discount_pct_sign() -> None:
    v = compute_verdict(Decimal("312"), [Decimal("505")] * 20, 20)
    assert v.discount_pct > 0  # cheaper than baseline -> positive discount
    v2 = compute_verdict(Decimal("610"), [Decimal("500")] * 20, 20)
    assert v2.discount_pct < 0  # pricier than baseline -> negative discount


def test_median_even_and_odd() -> None:
    assert median([Decimal("1"), Decimal("3"), Decimal("2")]) == Decimal("2")
    assert median([Decimal("1"), Decimal("4"), Decimal("2"), Decimal("3")]) == Decimal("2.5")


def test_no_history_uses_current_as_baseline_and_zero_discount() -> None:
    v = compute_verdict(Decimal("312"), [], 0)
    assert v.baseline_median == Decimal("312")
    assert v.discount_pct == Decimal("0")


# --- month selection (D34: verdicts must survive a month rollover) ---


def _month(m: str, price: str) -> MonthCandidate:
    return MonthCandidate(travel_month=m, price=Decimal(price), currency="SGD")


MATURE = ([Decimal("500")] * 21, 21)
FRESH = ([Decimal("410")], 0)  # a month that just entered the rolling window


def test_skips_a_brand_new_cheaper_month_for_one_with_history() -> None:
    """The actual 2026-08-01 bug: 2026-10 entered the window cheapest with 1 snapshot and
    took the verdict off BKK/DPS/HKG even though 08/09 had 21 days of history."""
    picked = select_verdict_month(
        [_month("2026-10", "410"), _month("2026-08", "455"), _month("2026-09", "470")],
        {"2026-08": MATURE, "2026-09": MATURE, "2026-10": FRESH},
    )
    assert picked is not None
    assert picked.travel_month == "2026-08"  # cheapest of the two *scoreable* months


def test_picks_cheapest_when_it_is_itself_mature() -> None:
    picked = select_verdict_month(
        [_month("2026-08", "410"), _month("2026-09", "470")],
        {"2026-08": MATURE, "2026-09": MATURE},
    )
    assert picked is not None
    assert picked.travel_month == "2026-08"


def test_falls_back_to_cheapest_when_no_month_has_history() -> None:
    """A genuinely new route still scores NO_VERDICT — it just does so honestly."""
    picked = select_verdict_month(
        [_month("2026-10", "410"), _month("2026-08", "455")],
        {"2026-08": FRESH, "2026-10": FRESH},
    )
    assert picked is not None
    assert picked.travel_month == "2026-10"
    history, span = FRESH
    assert compute_verdict(picked.price, history, span).label == VerdictLabel.NO_VERDICT


def test_treats_a_month_missing_from_histories_as_immature() -> None:
    picked = select_verdict_month(
        [_month("2026-10", "410"), _month("2026-08", "455")],
        {"2026-08": MATURE},
    )
    assert picked is not None
    assert picked.travel_month == "2026-08"


def test_no_candidates() -> None:
    assert select_verdict_month([], {}) is None
