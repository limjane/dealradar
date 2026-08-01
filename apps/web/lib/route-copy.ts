/**
 * Data-backed SEO copy for /flights/[route].
 *
 * Pure — no DB, no React, no `now()`. Everything is derived from the fare-calendar rows the
 * route page already fetches, so this module is directly testable and adds zero queries.
 *
 * Every sentence is gated on sample size (COPY_GATES). Routes with thin data silently drop
 * the claims they can't support rather than printing a confident-sounding number backed by
 * three data points — the same discipline as the social-post guardrails.
 *
 * Two gates deserve a note:
 *  - Midweek/weekend is computed WITHIN each month and then averaged across months. Comparing
 *    raw weekday vs weekend medians across the whole calendar reports a seasonal effect as a
 *    day-of-week one: SIN–TPE's weekend dates cluster in expensive Dec 2026, which showed a
 *    fake "+32% on weekends" that collapses to +2% once month is controlled for.
 *  - Freshness: a route whose newest fare row is >= staleAfterDays old stops claiming "updated
 *    daily" and shows the real date instead. Generic rule so it self-heals — currently only
 *    relevant to SIN–PER's provider-side cache gap (D32).
 */

/** Gate thresholds. Every claim below cites the ones it depends on. */
export const COPY_GATES = {
  /** Dates needed before quoting a price range / cheapest-date lead time. */
  minDatesForRange: 8,
  /** Distinct qualifying months needed to name a cheapest vs priciest month. */
  minMonths: 3,
  /** Dates a month needs before it can be named cheapest or priciest. */
  minDatesPerMonth: 2,
  /** Months that must individually qualify before we make a midweek claim. */
  minDowMonths: 2,
  /** Weekday and weekend dates a month needs to contribute a midweek comparison. */
  minDowSide: 3,
  /** Below this average gap the midweek difference isn't worth claiming. */
  minDowGapPct: 5,
  /** A route's newest fare row this many days old or more counts as stale. */
  staleAfterDays: 3,
} as const;

export type CopyFareDay = { departDate: string; price: number };

export type MonthRow = { month: string; label: string; from: number; dateCount: number };
export type Faq = { question: string; answer: string };

export type RouteCopy = {
  hasData: boolean;
  /** True when the newest fare row is >= COPY_GATES.staleAfterDays old. */
  stale: boolean;
  ageDays: number | null;
  /** Newest fetched_at we have for this route, "YYYY-MM-DD" — for the stale banner. */
  lastFetchedAt: string | null;
  /** "updated daily" or "last updated 24 July 2026" — goes under the H1. */
  freshnessLabel: string;
  /** Opening paragraph: price spread, cheapest/priciest month, cheapest date. */
  lead: string;
  /** Crawlable cheapest-fare-by-month rows (the chart is an SVG; Google reads this). */
  monthRows: MonthRow[];
  /** Midweek vs weekend sentence, or null when the gate isn't met. */
  midweek: string | null;
  faqs: Faq[];
  metaDescription: string;
};

const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAY_MS = 86_400_000;

/** "S$412" / "USD 412" — shared with lib/deals.ts, which re-exports it. */
export function money(price: number, currency: string): string {
  const prefix = currency === "SGD" ? "S$" : `${currency} `;
  return `${prefix}${Math.round(price)}`;
}

/** "2026-08" -> "August 2026" (prose form; routes-meta's formatMonth is the short one). */
export function formatMonthLong(ym: string): string {
  const [y, m] = ym.split("-");
  return `${MONTHS_LONG[Number(m) - 1] ?? m} ${y}`;
}

/** "2026-10-27" -> "27 October 2026". */
export function formatDateLong(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${Number(d)} ${MONTHS_LONG[Number(m) - 1] ?? m} ${y}`;
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/** UTC day-of-week so a server TZ can't shift a Thursday fare onto Friday. */
function isWeekendDeparture(iso: string): boolean {
  const dow = new Date(`${iso}T00:00:00Z`).getUTCDay(); // 0 = Sun
  return dow === 5 || dow === 6 || dow === 0; // Fri–Sun
}

function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(`${fromIso}T00:00:00Z`).getTime();
  const b = new Date(`${toIso}T00:00:00Z`).getTime();
  return Math.round((b - a) / DAY_MS);
}

function plural(n: number, one: string, many = `${one}s`): string {
  return n === 1 ? one : many;
}

/**
 * Average of each qualifying month's own weekday-vs-weekend gap, in percent.
 * Returns null when fewer than minDowMonths months have enough dates on both sides.
 */
function withinMonthWeekendGap(byMonth: Map<string, CopyFareDay[]>): number | null {
  const gaps: number[] = [];
  for (const days of byMonth.values()) {
    const weekday = days.filter((d) => !isWeekendDeparture(d.departDate)).map((d) => d.price);
    const weekend = days.filter((d) => isWeekendDeparture(d.departDate)).map((d) => d.price);
    if (weekday.length < COPY_GATES.minDowSide || weekend.length < COPY_GATES.minDowSide) continue;
    gaps.push((median(weekend) / median(weekday) - 1) * 100);
  }
  if (gaps.length < COPY_GATES.minDowMonths) return null;
  return gaps.reduce((a, b) => a + b, 0) / gaps.length;
}

export type BuildRouteCopyInput = {
  origin: string;
  city: string;
  days: CopyFareDay[];
  currency: string;
  /** Newest fetched_at across this route's fare rows, "YYYY-MM-DD". Null = unknown. */
  lastFetchedAt: string | null;
  /** Today, "YYYY-MM-DD". Injected so this stays pure and testable. */
  today: string;
  /** Optional one-liner from the verdict badge, becomes the "book now?" FAQ answer. */
  verdictLine?: string | null;
};

export function buildRouteCopy(input: BuildRouteCopyInput): RouteCopy {
  const { origin, city, days, currency, lastFetchedAt, today, verdictLine } = input;
  const route = `${origin} to ${city}`;

  const ageDays = lastFetchedAt ? daysBetween(lastFetchedAt, today) : null;
  const stale = ageDays !== null && ageDays >= COPY_GATES.staleAfterDays;
  const freshnessLabel =
    stale && lastFetchedAt ? `last updated ${formatDateLong(lastFetchedAt)}` : "updated daily";

  if (days.length === 0) {
    return {
      hasData: false,
      stale,
      ageDays,
      lastFetchedAt,
      freshnessLabel,
      lead: `We've just started tracking ${route} fares. Prices appear here as our daily scan collects them.`,
      monthRows: [],
      midweek: null,
      faqs: [],
      metaDescription: `${route} flight prices, tracked daily by FareSteal — see the cheapest departure dates and whether today's fare is a good deal.`,
    };
  }

  const prices = days.map((d) => d.price);
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  const mid = median(prices);
  const cheapest = days.reduce((a, b) => (b.price < a.price ? b : a));
  const n = days.length;

  const byMonth = new Map<string, CopyFareDay[]>();
  for (const d of days) {
    const m = d.departDate.slice(0, 7);
    if (!byMonth.has(m)) byMonth.set(m, []);
    byMonth.get(m)!.push(d);
  }
  const monthRows: MonthRow[] = [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, ds]) => ({
      month,
      label: formatMonthLong(month),
      from: Math.min(...ds.map((d) => d.price)),
      dateCount: ds.length,
    }));

  // Only months with enough dates can be named cheapest/priciest — a month represented by a
  // single lucky (or unlucky) date isn't evidence about that month.
  const solidMonths = monthRows.filter((r) => r.dateCount >= COPY_GATES.minDatesPerMonth);

  const sentences: string[] = [];

  if (n >= COPY_GATES.minDatesForRange) {
    sentences.push(
      `Across the ${n} departure dates we're tracking, one-way fares to ${city} have ranged from ` +
        `${money(lo, currency)} to ${money(hi, currency)} — a ${(hi / lo).toFixed(1)}× spread, which is ` +
        `why the date you pick moves the price more than anything else on this route.`,
    );
  } else {
    sentences.push(
      `We're tracking ${n} departure ${plural(n, "date")} to ${city} so far, from ` +
        `${money(lo, currency)} one-way. This route was added recently, so the breakdown below fills ` +
        `out as our daily scan collects more dates.`,
    );
  }

  let cheapestMonth: MonthRow | null = null;
  if (solidMonths.length >= COPY_GATES.minMonths) {
    cheapestMonth = solidMonths.reduce((a, b) => (b.from < a.from ? b : a));
    const priciest = solidMonths.reduce((a, b) => (b.from > a.from ? b : a));
    if (cheapestMonth.month !== priciest.month) {
      sentences.push(
        `${cheapestMonth.label} is the cheapest month on our board, from ` +
          `${money(cheapestMonth.from, currency)}. The best ${priciest.label} has offered is ` +
          `${money(priciest.from, currency)} — about ${money(priciest.from - cheapestMonth.from, currency)} ` +
          `more for the same one-way seat.`,
      );
    }
  }

  const gapPct = withinMonthWeekendGap(byMonth);
  let midweek: string | null = null;
  if (gapPct !== null && Math.abs(gapPct) >= COPY_GATES.minDowGapPct) {
    midweek =
      gapPct > 0
        ? `Comparing departures within the same month, Friday–Sunday flights to ${city} run about ` +
          `${Math.round(gapPct)}% more than Monday–Thursday ones. Shifting a trip by a day or two is ` +
          `often the cheapest change you can make.`
        : `Comparing departures within the same month, Friday–Sunday flights to ${city} are currently ` +
          `about ${Math.round(Math.abs(gapPct))}% cheaper than Monday–Thursday ones — the reverse of ` +
          `the usual pattern, and worth checking before you assume midweek is the saving.`;
  }

  // Lead time is a claim about *today's* board, so it's suppressed on stale routes.
  if (n >= COPY_GATES.minDatesForRange && !stale) {
    const lead = daysBetween(today, cheapest.departDate);
    if (lead >= 0) {
      sentences.push(
        `The cheapest date on the board right now is ${formatDateLong(cheapest.departDate)} at ` +
          `${money(cheapest.price, currency)}, ${lead} ${plural(lead, "day")} out.`,
      );
    }
  }

  const faqs: Faq[] = [
    {
      question: `How much is a flight from ${route}?`,
      answer:
        `The cheapest one-way fare our tracker has found is ${money(lo, currency)}, departing ` +
        `${formatDateLong(cheapest.departDate)}. Typical fares across the dates we track sit around ` +
        `${money(mid, currency)}` +
        (n >= COPY_GATES.minDatesForRange
          ? `, and we've seen them as high as ${money(hi, currency)}.`
          : `.`) +
        (stale && lastFetchedAt ? ` These figures were last refreshed on ${formatDateLong(lastFetchedAt)}.` : ""),
    },
  ];

  if (cheapestMonth) {
    faqs.push({
      question: `When is the cheapest month to fly from ${route}?`,
      answer:
        `Of the ${monthRows.length} departure ${plural(monthRows.length, "month")} we currently track, ` +
        `${cheapestMonth.label} has the lowest fare at ${money(cheapestMonth.from, currency)}. ` +
        `We re-scan every day, so this can move.`,
    });
  }

  if (midweek && gapPct !== null) {
    const weekendDearer = gapPct > 0;
    faqs.push({
      question: `Is it cheaper to fly to ${city} midweek?`,
      answer:
        `${weekendDearer ? "Yes" : "Not at the moment"} — comparing departures within the same month, ` +
        `Friday–Sunday fares run about ${Math.round(Math.abs(gapPct))}% ` +
        `${weekendDearer ? "above" : "below"} Monday–Thursday ones on this route. We compare within ` +
        `each month so the answer reflects the day of the week, not which months happen to be busy.`,
    });
  }

  if (verdictLine) {
    faqs.push({
      question: `Is now a good time to book ${route}?`,
      answer: verdictLine,
    });
  }

  const metaDescription =
    `${route} flights from ${money(lo, currency)} one-way ` +
    `(${formatMonthLong(cheapest.departDate.slice(0, 7))}). We track fares across ` +
    `${monthRows.length} departure ${plural(monthRows.length, "month")} and score today's price ` +
    `against the route's own history.`;

  return {
    hasData: true,
    stale,
    ageDays,
    lastFetchedAt,
    freshnessLabel,
    lead: sentences.join(" "),
    monthRows,
    midweek,
    faqs,
    metaDescription,
  };
}
