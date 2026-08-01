"""Table-driven tests for the pure verdict function (foundation §3, task 4 must-test item)."""

from decimal import Decimal

from verdict import VerdictLabel, compute_verdict, median

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
