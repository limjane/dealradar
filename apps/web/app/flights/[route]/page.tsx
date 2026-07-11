import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getRouteStats, money, type RouteStats } from "@/lib/deals";
import { destBySlug, formatMonth, ORIGIN, ROUTE_SLUGS } from "@/lib/routes-meta";

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

const boxStyle: React.CSSProperties = {
  flex: "1 1 120px",
  background: "#f6f3fb",
  border: "1px solid var(--line)",
  borderRadius: 12,
  padding: "12px 14px",
};

export default async function RoutePage({ params }: { params: Promise<{ route: string }> }) {
  const { route } = await params;
  const d = destBySlug(route);
  if (!d) notFound();

  let stats: RouteStats = { months: [], cheapest: null, currency: "SGD" };
  try {
    stats = await getRouteStats(d.code);
  } catch {
    // leave empty — render the evergreen content with a "gathering fares" note
  }

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
        <p className="updated">
          Flight price tracker · {d.country} · updated daily
        </p>

        {stats.cheapest && (
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
            Cheapest we&apos;re tracking now:{" "}
            <strong style={{ color: "var(--grab)" }}>
              {money(stats.cheapest.price, stats.currency)}
            </strong>{" "}
            for travel in {formatMonth(stats.cheapest.travelMonth)}.
          </p>
        )}

        <p>{d.blurb}</p>

        <h2>Cheapest fare by month</h2>
        {stats.months.length === 0 ? (
          <p>We&apos;re gathering fares for this route — check back shortly.</p>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, margin: "8px 0 4px" }}>
            {stats.months.map((m) => (
              <div key={m.travelMonth} style={boxStyle}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--ink-soft)",
                  }}
                >
                  {formatMonth(m.travelMonth)}
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, marginTop: 2 }}>
                  {money(m.price, m.currency)}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-soft)" }}>
                  cheapest found
                </div>
              </div>
            ))}
          </div>
        )}

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
