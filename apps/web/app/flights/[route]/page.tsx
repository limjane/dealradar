import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getFareCalendar, getRouteStats, getRouteVerdicts, money, type FareDay } from "@/lib/deals";
import { buildRouteCopy, formatDateLong, type RouteCopy } from "@/lib/route-copy";
import { destBySlug, formatMonth, ORIGIN, ROUTE_SLUGS } from "@/lib/routes-meta";
import { MIN_HISTORY_DAYS, type Verdict } from "@/lib/verdict";

import { FareChart } from "../../../components/fare-chart";
import { SiteFooter } from "../../../components/site-footer";
import { VerdictBadge } from "../../../components/verdict-badge";

export const revalidate = 3600; // ISR — refresh hourly

export function generateStaticParams() {
  return ROUTE_SLUGS.map((route) => ({ route }));
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/** Plain-language version of the verdict badge — becomes the "is now a good time" FAQ answer. */
function verdictSentence(
  verdict: Verdict,
  city: string,
  travelMonth: string,
  price: number,
  currency: string,
): string {
  const pct = Math.abs(Math.round(verdict.discountPct * 100));
  const month = formatMonth(travelMonth);
  const baseline = money(verdict.baselineMedian, currency);
  switch (verdict.label) {
    case "grab":
      return `Yes — the cheapest ${month} fare to ${city} is ${money(price, currency)}, about ${pct}% below this route's own 60-day median of ${baseline}. That clears our 15% "grab it" bar.`;
    case "high":
      return `Probably not — the cheapest ${month} fare to ${city} is ${money(price, currency)}, running about ${pct}% above this route's 60-day median of ${baseline}. If your dates are flexible, waiting has usually paid off.`;
    case "fair":
      return `It's an ordinary price — the cheapest ${month} fare to ${city} is ${money(price, currency)}, within ${pct}% of this route's own 60-day median of ${baseline}. No unusual dip right now.`;
    default:
      return `We can't say yet. We need at least ${MIN_HISTORY_DAYS} days of daily price scans on a route before calling a fare cheap or expensive, and this one hasn't reached that yet.`;
  }
}

type RouteData = {
  days: FareDay[];
  currency: string;
  copy: RouteCopy;
  verdict: Verdict | null;
  verdictMonth: string | null;
  lo: number | null;
  hi: number | null;
  med: number | null;
  cheapestDay: FareDay | null;
};

/** Shared by the page and generateMetadata so the SERP snippet quotes the same live numbers. */
async function loadRoute(destCode: string, city: string): Promise<RouteData> {
  let days: FareDay[] = [];
  let currency = "SGD";
  try {
    days = await getFareCalendar(destCode);
    if (days.length === 0) {
      // calendar not populated yet — fall back to monthly snapshots for the headline
      const stats = await getRouteStats(destCode);
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

  // Verdict is scored off price_snapshots (the worker's canonical source, same as /deals),
  // not the fare_calendar headline day above — fare_calendar spans further out than the
  // 3-month rolling window price_snapshots tracks, so an oddball far-out cheap date can
  // otherwise land on a month with too little snapshot history to score honestly.
  // It also scores the cheapest month with enough history rather than the cheapest month
  // outright, so the verdict survives a month rollover admitting a 1-snapshot month (D34).
  let verdict: Verdict | null = null;
  let verdictMonth: string | null = null;
  let verdictLine: string | null = null;
  try {
    const rv = (await getRouteVerdicts(destCode)).get(destCode);
    if (rv) {
      verdict = rv.verdict;
      verdictMonth = rv.travelMonth;
      verdictLine = verdictSentence(verdict, city, rv.travelMonth, rv.price, rv.currency);
    }
  } catch {
    verdict = null;
  }

  // Freshness comes only from real fare_calendar rows — the monthly-snapshot fallback above
  // carries no fetched_at, and guessing one would be the exact lie the stale check exists to stop.
  const fetchedDates = days.map((x) => x.fetchedAt).filter((x): x is string => Boolean(x));
  const lastFetchedAt = fetchedDates.length ? fetchedDates.sort().at(-1)! : null;

  const copy = buildRouteCopy({
    origin: ORIGIN.city,
    city,
    days: days.map((x) => ({ departDate: x.departDate, price: x.price })),
    currency,
    lastFetchedAt,
    today: new Date().toISOString().slice(0, 10),
    verdictLine,
  });

  return { days, currency, copy, verdict, verdictMonth, lo, hi, med, cheapestDay };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ route: string }>;
}): Promise<Metadata> {
  const { route } = await params;
  const d = destBySlug(route);
  if (!d) return { title: "Route not found — FareSteal" };
  let description = `Track cheap ${ORIGIN.city} to ${d.city} (${d.code}) flights. ${d.blurb}`;
  try {
    const { copy } = await loadRoute(d.code, d.city);
    if (copy.hasData) description = copy.metaDescription;
  } catch {
    /* keep the static description */
  }
  return {
    title: `${ORIGIN.city} to ${d.city} flights — price tracker | FareSteal`,
    description,
  };
}

export default async function RoutePage({ params }: { params: Promise<{ route: string }> }) {
  const { route } = await params;
  const d = destBySlug(route);
  if (!d) notFound();

  const { days, currency, copy, verdict, verdictMonth, lo, hi, med, cheapestDay } =
    await loadRoute(d.code, d.city);

  // Name the scored month on the badge only when it isn't the month of the headline fare
  // above it — otherwise the badge reads as a claim about a price that isn't shown (D34).
  const verdictMonthLabel =
    verdictMonth && verdictMonth !== cheapestDay?.departDate.slice(0, 7)
      ? formatMonth(verdictMonth)
      : undefined;

  const faqJsonLd = copy.faqs.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: copy.faqs.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      }
    : null;

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
        {faqJsonLd && (
          // Rich-result eligibility for the Q&As below. Same strings as the visible FAQ —
          // Google penalises schema that doesn't match on-page content.
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
          />
        )}

        <h1>
          {ORIGIN.city} → {d.city} {d.emoji}
        </h1>
        <p className="updated">
          Flight price tracker · {d.country} · {copy.freshnessLabel}
        </p>

        {copy.stale && copy.lastFetchedAt && (
          <p className="stale-note">
            Heads up: our price feed for this route hasn&apos;t refreshed since{" "}
            {formatDateLong(copy.lastFetchedAt)}. The figures below are the last ones we
            recorded, not today&apos;s.
          </p>
        )}

        {verdict && (
          <div style={{ marginTop: 8 }}>
            <VerdictBadge verdict={verdict} monthLabel={verdictMonthLabel} />
          </div>
        )}

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
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <Link
              href={`/go/aviasales?to=${d.code}&date=${cheapestDay.departDate}`}
              className="go-cta"
              prefetch={false}
            >
              See this fare →
            </Link>
            <p className="handoff-note">
              Opens our booking partner Aviasales — same price, we may earn a commission.
              <br />
              Or{" "}
              <Link href={`/search?to=${d.code}`} style={{ color: "var(--lilac)" }}>
                pick your own dates for {d.city} →
              </Link>
            </p>
          </div>
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

        <h2>
          How much is a flight from {ORIGIN.city} to {d.city}?
        </h2>
        <p>{copy.lead}</p>
        <p>{d.blurb}</p>

        {copy.monthRows.length > 0 && (
          <>
            <h2>
              Cheapest {ORIGIN.city} to {d.city} fare by departure month
            </h2>
            <table className="month-table">
              <thead>
                <tr>
                  <th scope="col">Departure month</th>
                  <th scope="col">Cheapest one-way</th>
                  <th scope="col">Dates tracked</th>
                </tr>
              </thead>
              <tbody>
                {copy.monthRows.map((row) => (
                  <tr key={row.month}>
                    <th scope="row">{row.label}</th>
                    <td className="price">{money(row.from, currency)}</td>
                    <td className="count">{row.dateCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <h2>
          When is it cheapest to fly {ORIGIN.city} → {d.city}?
        </h2>
        {copy.midweek && <p>{copy.midweek}</p>}
        <p>{d.tips}</p>

        {copy.faqs.length > 0 && (
          <>
            <h2>
              {ORIGIN.city} to {d.city} flights — common questions
            </h2>
            <div className="faq">
              {copy.faqs.map((f) => (
                <div className="faq-item" key={f.question}>
                  <h3>{f.question}</h3>
                  <p>{f.answer}</p>
                </div>
              ))}
            </div>
          </>
        )}

        <p className="note">
          Prices are the cheapest one-way fares our tracker has found and may be cached or
          delayed. The verdict above compares today&apos;s price to this route&apos;s own
          60-day median. Always confirm the final price on the provider&apos;s site.
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
