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

/** Buy/wait verdict badge (task 4; mockup v2 states, D8). Shared by /deals + /flights/[route]. */
export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  return (
    <span className={`badge ${verdict.label}`}>
      {ICON[verdict.label]} {TEXT[verdict.label](verdict.discountPct)}
    </span>
  );
}
