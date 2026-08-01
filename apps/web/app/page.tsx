/**
 * Landing page — the live front door. Ports section 1 of the signed-off design
 * (project-docs/mockups/v2-fun-travel.html, D7/D8) plus how-it-works, a deals
 * showcase, and a footer with the affiliate-commission disclosure.
 *
 * Animated SVG (mascot, sky) is injected raw to keep the signed-off SMIL intact;
 * everything else is plain JSX. Renders dynamically (per-request, not ISR) since D27
 * block A reads the geo-IP header for the search form's default origin.
 */

import Link from "next/link";
import { headers } from "next/headers";

import {
  getCheapestPerRoute,
  getRouteVerdicts,
  money,
  type RouteDeal,
  type RouteVerdict,
} from "@/lib/deals";
import { DESTINATIONS, formatMonth, ORIGIN, routeSlug } from "@/lib/routes-meta";

import { originForCountry } from "../lib/geo-origin";
import { FlightSearchForm } from "../components/flight-search-form";
import { SiteFooter } from "../components/site-footer";
import { VerdictBadge } from "../components/verdict-badge";

/** Daily polling started 2026-07-11 (see project-docs/current_state.md, task 3). Stated as a
 * date rather than a day/month count so the claim ages upward instead of going stale — the
 * hardcoded "60 days" it replaced was wrong on day 1 and wrong again later. */
const TRACKING_SINCE = "11 July 2026";

/** Recognisable names for the hero chips, in display order. Only rendered if the route has a
 * live price; the list is topped up from the cheapest routes if any of these have no data. */
const CHIP_PREFERENCE = ["NRT", "DPS", "ICN", "BKK"];
const CHIP_COUNT = 4;
const SHOWCASE_COUNT = 3;

// Reusable animated symbols: "fire" flame + "Radar" mascot base rig (wing/tail flap SMIL).
const SYMBOLS = `
<symbol id="fire" viewBox="0 0 24 24">
  <path fill="#ff5a1f" d="M12 2C12 2 5 9 5 14.5A7 7 0 0 0 19 14.5C19 9 12 2 12 2Z">
    <animateTransform attributeName="transform" type="rotate" values="-2.5 12 20;2.5 12 20;-2.5 12 20" dur="0.9s" repeatCount="indefinite"/>
  </path>
  <path fill="#ffc94d" d="M12 10.5C12 10.5 8.8 13.4 8.8 15.8A3.2 3.2 0 0 0 15.2 15.8C15.2 13.4 12 10.5 12 10.5Z">
    <animateTransform attributeName="transform" type="rotate" values="3.5 12 18;-3.5 12 18;3.5 12 18" dur="0.6s" repeatCount="indefinite"/>
  </path>
</symbol>
<symbol id="bird-base" viewBox="0 0 120 120">
  <defs>
    <linearGradient id="bodyg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ff7a5c"/><stop offset="1" stop-color="#f03e31"/>
    </linearGradient>
  </defs>
  <g>
    <path fill="#e8402f" d="M30 60 C14 50 8 38 12 26 C20 40 30 46 40 50 Z"/>
    <animateTransform attributeName="transform" type="rotate" values="-7 34 56;7 34 56;-7 34 56" dur="0.9s" repeatCount="indefinite"/>
  </g>
  <ellipse cx="62" cy="62" rx="32" ry="28" fill="url(#bodyg)"/>
  <ellipse cx="72" cy="72" rx="17" ry="12" fill="#ffedd0"/>
  <rect x="42" y="40" width="40" height="7" rx="3.5" fill="#231a4f"/>
  <path fill="#ffb648" d="M92 52 L110 58 L92 64 Q95 58 92 52 Z"/>
  <ellipse cx="86" cy="66" rx="4.5" ry="2.8" fill="#ff9d94" opacity=".8"/>
  <circle cx="80" cy="46" r="14" fill="#fff" stroke="#231a4f" stroke-width="4"/>
  <g>
    <path fill="#e8402f" d="M56 56 C40 42 22 42 12 52 C26 56 30 66 44 70 C52 72 58 66 56 56 Z"/>
    <animateTransform attributeName="transform" type="rotate" values="-16 54 58;14 54 58;-16 54 58" dur="0.55s" repeatCount="indefinite"/>
  </g>
</symbol>`;

// Perched "scout" pose (blinks) — the clean, non-buggy pose (avoids the flying-pose eye bug).
const MASCOT = `
<svg class="mascot floaty" viewBox="0 0 120 120" width="96" height="96" role="img" aria-label="Radar, the FareSteal price-scout mascot">
  <use href="#bird-base"/>
  <circle cx="84" cy="48" r="6" fill="#231a4f"/>
  <circle cx="82" cy="46" r="2" fill="#fff"/>
  <circle cx="80" cy="46" r="12.5" fill="#ff7a5c" opacity="0">
    <animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;.85;.9;.95;1" dur="3.8s" repeatCount="indefinite"/>
  </circle>
</svg>`;

// Starfield + drifting clouds behind the hero.
const SKY = `
<svg class="sky" viewBox="0 0 780 360" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <circle class="star" cx="60" cy="70" r="1.6" fill="#fff"/>
  <circle class="star" style="animation-delay:.4s" cx="180" cy="40" r="1.2" fill="#fff"/>
  <circle class="star" style="animation-delay:.9s" cx="320" cy="90" r="1.4" fill="#fff"/>
  <circle class="star" style="animation-delay:1.3s" cx="700" cy="60" r="1.6" fill="#fff"/>
  <circle class="star" style="animation-delay:1.7s" cx="600" cy="120" r="1.1" fill="#fff"/>
  <circle class="star" style="animation-delay:2.1s" cx="740" cy="160" r="1.3" fill="#fff"/>
  <circle class="star" style="animation-delay:.6s" cx="120" cy="150" r="1.2" fill="#fff"/>
  <circle class="star" style="animation-delay:1.5s" cx="480" cy="45" r="1.5" fill="#fff"/>
  <ellipse class="cloud" cx="90" cy="250" rx="90" ry="26" fill="rgba(255,255,255,.10)"/>
  <ellipse class="cloud" style="animation-delay:2s" cx="700" cy="215" rx="110" ry="30" fill="rgba(255,255,255,.09)"/>
  <ellipse class="cloud" style="animation-delay:4.5s" cx="640" cy="330" rx="150" ry="36" fill="rgba(255,255,255,.07)"/>
</svg>`;

function Flame({ size = 14 }: { size?: number }) {
  return (
    <svg className="flame" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <use href="#fire" />
    </svg>
  );
}

export default async function Home() {
  const initialFrom = originForCountry((await headers()).get("x-vercel-ip-country"));

  // Same live source /deals reads — the showcase and chips used to carry v2 mockup numbers.
  let deals: RouteDeal[] = [];
  let verdicts = new Map<string, RouteVerdict>();
  try {
    deals = await getCheapestPerRoute();
    verdicts = await getRouteVerdicts();
  } catch {
    deals = [];
  }
  const byDest = new Map(deals.map((d) => [d.destCode, d]));
  const showcase = deals.filter((d) => DESTINATIONS[d.destCode]).slice(0, SHOWCASE_COUNT);
  const chips = [
    ...CHIP_PREFERENCE.map((code) => byDest.get(code)).filter((d) => d !== undefined),
    ...deals.filter((d) => !CHIP_PREFERENCE.includes(d.destCode)),
  ]
    .filter((d) => DESTINATIONS[d.destCode])
    .slice(0, CHIP_COUNT);

  return (
    <>
      <svg
        width="0"
        height="0"
        style={{ position: "absolute" }}
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: SYMBOLS }}
      />

      <main>
        {/* ---------- HERO ---------- */}
        <section className="hero">
          <div dangerouslySetInnerHTML={{ __html: SKY }} />
          <header className="site on-dark" style={{ position: "relative" }}>
            <div className="logo">
              <span className="mark">✈</span>Fare<span style={{ fontWeight: 400 }}>Steal</span>
            </div>
            <nav className="site">
              <a href="#how">How it works</a>
              <Link href="/deals">Today&apos;s deals</Link>
              <Link href="/search" className="pill">
                Search flights
              </Link>
            </nav>
          </header>

          <div className="hero-inner">
            <div dangerouslySetInnerHTML={{ __html: MASCOT }} />
            <h1>
              Is that flight price
              <br />
              actually{" "}
              <span className="zing">
                a steal?
                <svg viewBox="0 0 120 10" preserveAspectRatio="none">
                  <path
                    d="M2 7 Q 20 1, 40 6 T 80 5 T 118 6"
                    fill="none"
                    stroke="#ffb648"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>
            <p className="lead">
              We track fares every day, so you know a good price when you see one.
            </p>

            <FlightSearchForm variant="hero" initialFrom={initialFrom} />

            {chips.length > 0 && (
              <div className="hot-chips">
                {chips.map((d) => {
                  const meta = DESTINATIONS[d.destCode]!;
                  return (
                    <Link key={d.destCode} href={`/flights/${routeSlug(d.destCode)}`}>
                      {meta.emoji} {meta.city} <b>fr {money(d.price, d.currency)}</b>
                    </Link>
                  );
                })}
              </div>
            )}

            <div className="trustbar">
              <span>📈 Real prices tracked daily since {TRACKING_SINCE}</span>
              <span>🤝 Commission, never a markup</span>
              <span>⚡ Verdict in one search</span>
            </div>
          </div>
        </section>

        {/* ---------- HOW IT WORKS ---------- */}
        <section className="section" id="how">
          <h2>How FareSteal works</h2>
          <p className="sub">Three steps between you and a fare you can trust.</p>
          <div className="steps">
            <div className="step">
              <div className="ico">🔍</div>
              <h3>1 · Search any route</h3>
              <p>
                Tell us where from and where to. We pull fares from Trip.com, Kiwi, Aviasales and
                more — all in one place.
              </p>
            </div>
            <div className="step">
              <div className="ico">📊</div>
              <h3>2 · See the verdict</h3>
              <p>
                We check today&apos;s price against every fare we&apos;ve tracked on that route and
                tell you plainly: grab it, fair, or wait.
              </p>
            </div>
            <div className="step">
              <div className="ico">✈️</div>
              <h3>3 · Book with confidence</h3>
              <p>
                Click through to the airline or travel site at their price. We earn a small
                commission — never a markup on you.
              </p>
            </div>
          </div>
        </section>

        {/* ---------- DEALS SHOWCASE ---------- */}
        <section className="deals">
          <div className="section" id="deals">
            <h2>
              Deals from Singapore <Flame size={20} />
            </h2>
            <p className="sub">
              Live from our daily fare tracking · cheapest one-way, from
            </p>

            {showcase.length === 0 ? (
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
              showcase.map((d) => {
                const meta = DESTINATIONS[d.destCode]!;
                const rv = verdicts.get(d.destCode);
                // Name the scored month only when it isn't the month this card prices (D34).
                const monthLabel =
                  rv && rv.travelMonth !== d.travelMonth ? formatMonth(rv.travelMonth) : undefined;
                return (
                  <Link
                    key={d.destCode}
                    href={`/flights/${routeSlug(d.destCode)}`}
                    className="deal-card"
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <div className="dest" style={{ background: meta.grad }}>
                      {meta.emoji}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {rv && <VerdictBadge verdict={rv.verdict} monthLabel={monthLabel} />}
                      <div className="route">
                        {ORIGIN.code} → {meta.city} ({d.destCode})
                      </div>
                      <div className="when">Cheapest in {formatMonth(d.travelMonth)}</div>
                    </div>
                    <div className="p">{money(d.price, d.currency)}</div>
                  </Link>
                );
              })
            )}

            <div style={{ textAlign: "center", marginTop: 28 }}>
              <Link
                href="/deals"
                style={{
                  display: "inline-block",
                  background: "linear-gradient(135deg, var(--coral), #ff7a3d)",
                  color: "#fff",
                  textDecoration: "none",
                  fontWeight: 800,
                  padding: "13px 26px",
                  borderRadius: 14,
                  boxShadow: "0 8px 22px rgba(240,62,49,.35)",
                }}
              >
                See all live deals from Singapore →
              </Link>
            </div>
          </div>
        </section>

        {/* ---------- FOOTER ---------- */}
        <SiteFooter />
      </main>
    </>
  );
}
