/**
 * /search — our own branded search form (D23), replacing the retired Travelpayouts White
 * Label widget (D22: off-brand look, clashed with the cinematic direction). Submitting
 * deep-links to Aviasales via /go (see lib/go-links.ts); on-brand embedded results return
 * once the Aviasales Search API ungates at 50k MAU (D21).
 */

import type { Metadata } from "next";
import Link from "next/link";

import { DESTINATIONS } from "@/lib/routes-meta";

import { FlightSearchForm } from "../../components/flight-search-form";
import { SiteFooter } from "../../components/site-footer";

export const metadata: Metadata = {
  title: "Search flights — FareSteal",
  description: "Search flights worldwide with FareSteal — compare fares via our booking partners.",
  robots: { index: false, follow: true },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string }>;
}) {
  // Carry route-page context into the form (?to=DPS) so arriving from a tracked route
  // doesn't feel like starting over on a different product.
  const { to } = await searchParams;
  const code = to?.toUpperCase() ?? "";
  const meta = /^[A-Z]{3}$/.test(code) ? DESTINATIONS[code] : undefined;
  const initialTo = meta ? { code: meta.code, label: `${meta.city} (${meta.code})` } : null;

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
        <h2>Search flights</h2>
        <p className="sub">
          Pick your route and dates — we hand you to our booking partner at the same price.
        </p>

        <div style={{ marginTop: 24 }}>
          <FlightSearchForm variant="page" initialTo={initialTo} />
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
