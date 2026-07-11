import { money, type FareDay } from "@/lib/deals";

/**
 * Price-by-departure-date chart (D17) — server-rendered SVG in the signed-off mockup's
 * chart style (draw-in line, area fill, median dashline, pinging dot on the cheapest date).
 * Real tracked fares only; no synthetic points.
 */

const W = 640;
const H = 190;
const PAD = { top: 18, right: 14, bottom: 30, left: 14 };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

export function FareChart({ days, currency }: { days: FareDay[]; currency: string }) {
  if (days.length < 2) return null;

  const prices = days.map((d) => d.price);
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  const med = median(prices);
  const span = Math.max(hi - lo, 1);
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const x = (i: number) => PAD.left + (i / (days.length - 1)) * innerW;
  const y = (p: number) => PAD.top + (1 - (p - lo) / span) * innerH * 0.92 + innerH * 0.04;

  const pts = days.map((d, i) => `${x(i).toFixed(1)},${y(d.price).toFixed(1)}`);
  const area = [...pts, `${(W - PAD.right).toFixed(1)},${H - PAD.bottom}`, `${PAD.left},${H - PAD.bottom}`];

  const cheapestIdx = prices.indexOf(lo);
  const cx = x(cheapestIdx);
  const cy = y(lo);

  // One tick per month change, at that month's first data point.
  const ticks: { xPos: number; label: string }[] = [];
  let lastMonth = "";
  days.forEach((d, i) => {
    const m = d.departDate.slice(0, 7);
    if (m !== lastMonth) {
      lastMonth = m;
      ticks.push({ xPos: x(i), label: MONTHS[Number(d.departDate.slice(5, 7)) - 1] ?? m });
    }
  });

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      role="img"
      aria-label={`Cheapest tracked fare by departure date, from ${money(lo, currency)} to ${money(hi, currency)}`}
    >
      <defs>
        <linearGradient id="fc-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8b5cf6" stopOpacity=".22" />
          <stop offset="1" stopColor="#8b5cf6" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* median guide */}
      <line x1={PAD.left} y1={y(med)} x2={W - PAD.right} y2={y(med)} stroke="#cbd5e1" strokeDasharray="5 5" />
      <text x={PAD.left + 2} y={y(med) - 6} fontSize="11" fontWeight="700" fill="#8b7fb8">
        typical {money(med, currency)}
      </text>

      <polygon className="areafill" fill="url(#fc-area)" points={area.join(" ")} />
      <polyline
        className="drawline"
        pathLength={100}
        fill="none"
        stroke="#8b5cf6"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pts.join(" ")}
      />

      {/* cheapest date */}
      <circle cx={cx} cy={cy} r="6" fill="#059669" />
      <circle className="ping" cx={cx} cy={cy} r="11" fill="#059669" />
      <text
        x={Math.min(Math.max(cx, PAD.left + 40), W - PAD.right - 40)}
        y={Math.min(cy + 22, H - PAD.bottom - 4)}
        fontSize="11.5"
        fontWeight="800"
        fill="#059669"
        textAnchor="middle"
      >
        {money(lo, currency)}
      </text>

      {/* month ticks */}
      {ticks.map((t) => (
        <text
          key={t.xPos}
          x={t.xPos}
          y={H - 8}
          fontSize="11"
          fontWeight="700"
          fill="#8b7fb8"
        >
          {t.label}
        </text>
      ))}
    </svg>
  );
}
