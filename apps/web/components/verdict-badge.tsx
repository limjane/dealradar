import type { Verdict } from "@/lib/verdict";

const ICON: Record<Verdict["label"], string> = {
  grab: "\u{1F525}", // 🔥
  fair: "\u{1F44C}", // 👌
  high: "\u{1F4C8}", // 📈
  nodata: "\u{1F52D}", // 🔭
};

const TEXT: Record<Verdict["label"], (pct: number) => string> = {
  grab: (pct) => `GRAB IT — ${Math.round(pct * 100)}% below normal`,
  fair: () => "FAIR PRICE",
  high: (pct) => `HIGH — ${Math.round(Math.abs(pct) * 100)}% above normal`,
  nodata: () => "NO VERDICT YET",
};

/** Buy/wait verdict badge (task 4; mockup v2 states, D8). Shared by /deals + /flights/[route].
 * `monthLabel` is set only when the scored month differs from the month the page shows as its
 * headline (D34) — the badge is a claim about one specific fare, so it has to name which. */
export function VerdictBadge({ verdict, monthLabel }: { verdict: Verdict; monthLabel?: string }) {
  return (
    <span className={`badge ${verdict.label}`}>
      {ICON[verdict.label]} {TEXT[verdict.label](verdict.discountPct)}
      {monthLabel ? ` · ${monthLabel}` : ""}
    </span>
  );
}
