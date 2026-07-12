/**
 * /search — Travelpayouts White Label (Widget type) embedded on our own page (D22).
 * Loader script renders a search form into #tpwl-search and results into #tpwl-tickets;
 * users book without leaving faresteal.com. Worldwide destinations, origin left to the
 * widget's geo-IP default (D19.1) — no origin code on our side.
 */

import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";

import { SiteFooter } from "../../components/site-footer";

export const metadata: Metadata = {
  title: "Search flights — FareSteal",
  description: "Search and book flights worldwide, powered by FareSteal's fare partners.",
  robots: { index: false, follow: true },
};

export default function SearchPage() {
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
        <p className="sub">Worldwide fares from our booking partners — book without leaving FareSteal.</p>

        <div id="tpwl-search" style={{ marginTop: 24 }} />
        <div id="tpwl-tickets" style={{ marginTop: 24 }} />
        <div id="tpwl-modals" />

        <Script
          id="tpwl-loader"
          strategy="afterInteractive"
          src="https://tpembd.com/wl_web/main.js?wl_id=19722"
          type="module"
        />
      </main>

      <SiteFooter />
    </>
  );
}
