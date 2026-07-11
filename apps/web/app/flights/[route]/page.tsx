import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getFareCalendar, getRouteStats, money, type FareDay } from "@/lib/deals";
import { destBySlug, formatMonth, ORIGIN, ROUTE_SLUGS } from "@/lib/routes-meta";

import { FareChart } from "../../../components/fare-chart";
import { SiteFooter } from "../../../components/site-footer";

export const revalidate = 3600; // ISR — refresh hourly

export function generateStaticParams() {
  return ROUTE_SLUGS.map((route) => ({ route }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ route: string }>;
}): Promise<Metadata> {
  const { route } = await params;
  const d = destBySlug(route);
  if (!d) return { title: "Route not found — FareSteal" };
  return {
    title: `${ORIGIN.city} to ${d.city} flights — price tracker | FareSteal`,
    description: `Track cheap ${ORIGIN.city} to ${d.city} (${d.code}) flights. ${d.blurb}`,
  };
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

export default async function RoutePage({ params }: { params: Promise<{ route: string }> }) {
  const { route } = await params;
  const d = destBySlug(route);
  if (!d) notFound();

  let days: FareDay[] = [];
  let currency = "SGD";
  try {
    days = await getFareCalendar(d.code);
    if (days.length === 0) {
      // calendar not populated yet — fall back to monthly snapshots for the headline
      const stats = await getRouteStats(d.code);
      currency = stats.currency;
      days = stats.months.map((m) => ({
        departDate: `${m.travelMonth}-15`,
        price: m.price,
        currency: m.currency,
      }));
    } else {
      currency = days[0]!.currency;
    }
  } catch {
    days = [];
  }

  const prices = days.map((x) => x.price);
  const lo = prices.length ? Math.min(...prices) : null;
  const hi = prices.length ? Math.max(...prices) : null;
  const med = prices.length ? median(prices) : null;
  const cheapestDay = lo !== null ? days[prices.indexOf(lo)]! : null;

  return (
    <>
      <header className="doc-header">
        <div className="inner">
          <Link href="/" className="logo-link">
            <span className="mark">✈</span>Fare<span style={{ fontWeight: 400 }}>Steal</span>
          </Link>
        </div>
      </header>

      <main className="doc">
        <h1>
          {ORIGIN.city} → {d.city} {d.emoji}
        </h1>
        <p className="updated">Flight price tracker · {d.country} · updated daily</p>

        {cheapestDay && lo !== null && (
          <p
            style={{
              background: "linear-gradient(135deg,#d8fbe9,#eafff5)",
              border: "1px solid #baf3d9",
              borderRadius: 14,
              padding: "16px 18px",
              fontWeight: 700,
              color: "var(--ink)",
            }}
          >
            Cheapest date we&apos;re tracking:{" "}
            <strong style={{ color: "var(--grab)" }}>{money(lo, currency)}</strong> departing{" "}
            {formatMonth(cheapestDay.departDate.slice(0, 7))}.
          </p>
        )}

        {cheapestDay && (
          <p style={{ textAlign: "center", marginTop: 16 }}>
            <Link
              href={`/go/aviasales?to=${d.code}&date=${cheapestDay.departDate}`}
              className="go-cta"
              prefetch={false}
            >
              Go to deal →
            </Link>
          </p>
        )}

        {lo !== null && hi !== null && med !== null && (
          <div className="statrow">
            <div className="stat">
              <div className="k">Cheapest tracked</div>
              <div className="v" style={{ color: "var(--grab)" }}>
                {money(lo, currency)}
              </div>
            </div>
            <div className="stat">
              <div className="k">Typical fare</div>
              <div className="v">{money(med, currency)}</div>
            </div>
            <div className="stat">
              <div className="k">Highest tracked</div>
              <div className="v" style={{ color: "var(--high, #e11d48)" }}>
                {money(hi, currency)}
              </div>
            </div>
            <div className="stat">
              <div className="k">Dates tracked</div>
              <div className="v">{days.length}</div>
            </div>
          </div>
        )}

        {days.length >= 2 && (
          <div className="chart-wrap">
            <h3>Cheapest fare by departure date</h3>
            <div className="note">
              One-way fares our tracker has found for upcoming travel dates · updated daily
            </div>
            <FareChart days={days} currency={currency} />
          </div>
        )}

        <p>{d.blurb}</p>

        <h2>
          When is it cheapest to fly {ORIGIN.city} → {d.city}?
        </h2>
        <p>{d.tips}</p>

        <p className="note">
          Prices are the cheapest one-way fares our tracker has found and may be cached or
          delayed. Buy-or-wait verdicts based on longer price history are coming as we gather
          more data. Always confirm the final price on the provider&apos;s site.
        </p>

        <p style={{ marginTop: 24 }}>
          <Link href="/deals" style={{ color: "var(--lilac)", fontWeight: 700 }}>
            ← See all deals from {ORIGIN.city}
          </Link>
        </p>
      </main>

      <SiteFooter />
    </>
  );
}
