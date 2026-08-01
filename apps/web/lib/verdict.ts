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

export const VERDICT_COPY: Record<VerdictLabel, string> = {
  grab: "GRAB IT",
  fair: "FAIR PRICE",
  high: "HIGH",
  nodata: "NO VERDICT YET",
};
