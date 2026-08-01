import type { Metadata } from "next";
import Link from "next/link";

import { getCheapestPerRoute, getRouteVerdicts, money, type RouteDeal, type RouteVerdict } from "@/lib/deals";
import { defaultDateForMonth } from "@/lib/go-links";
import { DESTINATIONS, formatMonth, ORIGIN, routeSlug } from "@/lib/routes-meta";

import { SiteFooter } from "../../components/site-footer";
import { VerdictBadge } from "../../components/verdict-badge";

export const revalidate = 3600; // ISR — refresh hourly (foundation §3)

export const metadata: Metadata = {
  title: "Cheapest flight deals from Singapore — FareSteal",
  description:
    "The cheapest flights we're currently tracking from Singapore, updated daily. Compare fares to Bangkok, Bali, Tokyo, Seoul, London and more.",
};

export default async function DealsPage() {
  let deals: RouteDeal[] = [];
  let verdicts = new Map<string, RouteVerdict>();
  try {
    deals = await getCheapestPerRoute();
    verdicts = await getRouteVerdicts();
  } catch {
    deals = [];
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

      <main className="section">
        <h2>Cheapest fares from Singapore right now</h2>
        <p className="sub">
          Live from our daily fare tracking · prices are one-way, from · or{" "}
          <Link href="/search" style={{ color: "var(--lilac)" }}>
            search any route worldwide
          </Link>
        </p>

        {deals.length === 0 ? (
          <p
            style={{
              textAlign: "center",
              marginTop: 28,
              fontWeight: 600,
              color: "var(--ink-soft)",
            }}
          >
            We&apos;re gathering fares — check back shortly.
          </p>
        ) : (
          <div style={{ marginTop: 24 }}>
            {deals.map((d) => {
              const meta = DESTINATIONS[d.destCode];
              if (!meta) return null;
              const rv = verdicts.get(d.destCode);
              // Name the month only when the verdict scored a different one than the card
              // shows — otherwise the badge would describe a fare that isn't the price here.
              const monthLabel =
                rv && rv.travelMonth !== d.travelMonth ? formatMonth(rv.travelMonth) : undefined;
              return (
                <div key={d.destCode} className="deal-card">
                  <Link
                    href={`/flights/${routeSlug(d.destCode)}`}
                    style={{
                      display: "flex",
                      flex: 1,
                      gap: 14,
                      alignItems: "center",
                      minWidth: 0,
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <div className="dest" style={{ background: meta.grad }}>
                      {meta.emoji}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="route">
                        {ORIGIN.city} → {meta.city} ({d.destCode})
                      </div>
                      <div className="when">Cheapest in {formatMonth(d.travelMonth)}</div>
                      {rv && (
                        <div style={{ marginTop: 6 }}>
                          <VerdictBadge verdict={rv.verdict} monthLabel={monthLabel} />
                        </div>
                      )}
                    </div>
                    <div className="p">{money(d.price, d.currency)}</div>
                  </Link>
                  <Link
                    href={`/go/aviasales?to=${d.destCode}&date=${defaultDateForMonth(d.travelMonth)}`}
                    className="go-cta"
                    prefetch={false}
                  >
                    See this fare →
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        <p
          style={{
            textAlign: "center",
            marginTop: 24,
            fontSize: 12.5,
            fontWeight: 600,
            color: "var(--ink-soft)",
          }}
        >
          &ldquo;See this fare&rdquo; opens our booking partner Aviasales — same price, we may
          earn a commission. Fares are the cheapest one-way prices our tracker has found and
          may be cached or delayed. Confirm the final price on the provider&apos;s site. See our{" "}
          <Link href="/disclosure" style={{ color: "var(--lilac)" }}>
            affiliate disclosure
          </Link>
          .
        </p>
      </main>

      <SiteFooter />
    </>
  );
}
