/**
 * TS mirror of worker/verdict.py (foundation §3, task 4). Kept in the web layer so /deals
 * and /flights/[route] can show a live verdict for every tracked route, not just the
 * >=15% "GRAB" ones the worker publishes to the `deals` table (see decisions.md D26) —
 * same formula, same thresholds; change one, change both in the same commit.
 */

export const MIN_HISTORY_DAYS = 14;
const GRAB_THRESHOLD = 0.15;
const HIGH_THRESHOLD = -0.15;

export type VerdictLabel = "grab" | "fair" | "high" | "nodata";

export type Verdict = {
  label: VerdictLabel;
  discountPct: number;
  baselineMedian: number;
};

export function median(prices: number[]): number {
  const s = [...prices].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/** `history` = that route+month's own price history (any window); `historySpanDays` =
 * days between the oldest and newest point in it (gates a too-short span even if enough
 * rows exist). */
export function computeVerdict(
  current: number,
  history: number[],
  historySpanDays: number,
): Verdict {
  const baseline = history.length ? median(history) : current;
  if (!history.length || historySpanDays < MIN_HISTORY_DAYS) {
    return { label: "nodata", discountPct: 0, baselineMedian: baseline };
  }
  const discountPct = baseline ? (baseline - current) / baseline : 0;
  const label: VerdictLabel =
    discountPct >= GRAB_THRESHOLD ? "grab" : discountPct <= HIGH_THRESHOLD ? "high" : "fair";
  return { label, discountPct, baselineMedian: baseline };
}

/** One tracked travel-month of a route: its current (latest-poll) price plus that same
 * route+month's own snapshot history. Input to `selectVerdictMonth`. */
export type MonthHistory = {
  travelMonth: string;
  price: number;
  currency: string;
  history: number[];
  historySpanDays: number;
};

export function hasEnoughHistory(m: MonthHistory): boolean {
  return m.history.length > 0 && m.historySpanDays >= MIN_HISTORY_DAYS;
}

/**
 * Which month to score for a route. The obvious rule — "cheapest month" — silently kills the
 * verdict at every month rollover: the worker's rolling window admits a brand-new travel
 * month with 1 snapshot (0-day span), that month is often the cheapest, and `computeVerdict`
 * correctly returns `nodata` for it even though the route has weeks of usable history on its
 * other months. So: cheapest month **that has enough history**, falling back to the cheapest
 * overall only when no month qualifies (a genuinely new route, which then honestly scores
 * `nodata`). Mirrored in worker/verdict.py::select_verdict_month — change one, change both.
 */
export function selectVerdictMonth(months: MonthHistory[]): MonthHistory | null {
  if (months.length === 0) return null;
  const mature = months.filter(hasEnoughHistory);
  const pool = mature.length ? mature : months;
  return pool.reduce((a, b) => (b.price < a.price ? b : a));
}

export const VERDICT_COPY: Record<VerdictLabel, string> = {
  grab: "GRAB IT",
  fair: "FAIR PRICE",
  high: "HIGH",
  nodata: "NO VERDICT YET",
};
