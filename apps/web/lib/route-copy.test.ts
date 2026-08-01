/**
 * Gate tests for lib/route-copy.ts. Run with `pnpm test` (Node's built-in runner + native
 * TS type-stripping — no test-framework dependency).
 *
 * The point of these is the *gates*: thin routes must stay silent rather than publish a
 * confident number backed by two data points, and the midweek claim must survive the
 * seasonal confound that made SIN-TPE look like a 32% weekend premium when it is ~2%.
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildRouteCopy,
  COPY_GATES,
  formatDateLong,
  formatMonthLong,
  money,
  type CopyFareDay,
} from "./route-copy.ts";

const BASE: {
  origin: string;
  city: string;
  currency: string;
  today: string;
  lastFetchedAt: string | null;
} = {
  origin: "Singapore",
  city: "Taipei",
  currency: "SGD",
  today: "2026-08-01",
  lastFetchedAt: "2026-08-01",
};

/** First `weekday` Mon–Thu dates and first `weekend` Fri–Sun dates of a month, priced flat. */
function datesIn(
  ym: string,
  opts: { weekday?: number; weekend?: number; price: number },
): CopyFareDay[] {
  const [y, m] = ym.split("-").map(Number);
  const out: CopyFareDay[] = [];
  let wd = 0;
  let we = 0;
  for (let day = 1; day <= 28; day++) {
    const iso = `${ym}-${String(day).padStart(2, "0")}`;
    const dow = new Date(Date.UTC(y!, m! - 1, day)).getUTCDay();
    const isWeekend = dow === 5 || dow === 6 || dow === 0;
    if (isWeekend && we < (opts.weekend ?? 0)) {
      out.push({ departDate: iso, price: opts.price });
      we++;
    } else if (!isWeekend && wd < (opts.weekday ?? 0)) {
      out.push({ departDate: iso, price: opts.price });
      wd++;
    }
  }
  return out;
}

function build(days: CopyFareDay[], over: Partial<typeof BASE> = {}) {
  return buildRouteCopy({ ...BASE, ...over, days });
}

// ---------------------------------------------------------------- formatters

test("money formats SGD with the S$ prefix and other currencies with a code", () => {
  assert.equal(money(412.4, "SGD"), "S$412");
  assert.equal(money(412.6, "USD"), "USD 413");
});

test("date formatters render prose forms without leading zeros", () => {
  assert.equal(formatMonthLong("2026-10"), "October 2026");
  assert.equal(formatDateLong("2026-10-07"), "7 October 2026");
});

// ---------------------------------------------------------------- no data

test("a route with no fare rows reports hasData false and publishes no FAQs", () => {
  const copy = build([]);
  assert.equal(copy.hasData, false);
  assert.deepEqual(copy.faqs, []);
  assert.deepEqual(copy.monthRows, []);
  assert.match(copy.lead, /just started tracking/);
});

// ---------------------------------------------------------------- thin routes

test("under minDatesForRange the lead admits the route is new and quotes no spread", () => {
  const days = datesIn("2026-09", { weekday: 1, price: 887 });
  const copy = build(days, { city: "Rome" });
  assert.equal(copy.hasData, true);
  assert.match(copy.lead, /tracking 1 departure date to Rome/);
  assert.doesNotMatch(copy.lead, /spread/);
  assert.doesNotMatch(copy.lead, /days out/); // lead-time claim is gated too
});

test("a single-date route pluralises months correctly in the meta description", () => {
  const copy = build(datesIn("2026-09", { weekday: 1, price: 887 }), { city: "Rome" });
  assert.match(copy.metaDescription, /1 departure month\b/);
  assert.doesNotMatch(copy.metaDescription, /1 departure months/);
});

test("months represented by a single date are never named cheapest or priciest", () => {
  // 3 months, but only one has >= minDatesPerMonth dates, so the comparison must not fire.
  const days = [
    ...datesIn("2026-08", { weekday: 4, price: 300 }),
    ...datesIn("2026-09", { weekday: 1, price: 100 }), // lone cheap outlier
    ...datesIn("2026-10", { weekday: 1, price: 900 }), // lone expensive outlier
  ];
  const copy = build(days);
  assert.doesNotMatch(copy.lead, /cheapest month/);
  assert.equal(
    copy.faqs.some((f) => f.question.includes("cheapest month")),
    false,
  );
});

test("with enough solid months the cheapest/priciest comparison fires", () => {
  const days = [
    ...datesIn("2026-08", { weekday: 3, price: 300 }),
    ...datesIn("2026-09", { weekday: 3, price: 200 }),
    ...datesIn("2026-10", { weekday: 3, price: 500 }),
  ];
  const copy = build(days);
  assert.match(copy.lead, /September 2026 is the cheapest month/);
  assert.match(copy.lead, /October 2026/);
  assert.match(copy.lead, /S\$300 more/); // 500 - 200
  const faq = copy.faqs.find((f) => f.question.includes("cheapest month"));
  assert.ok(faq);
  assert.match(faq.answer, /September 2026 has the lowest fare at S\$200/);
});

// ---------------------------------------------------------------- price spread

test("at or above minDatesForRange the lead quotes the range and the multiple", () => {
  const days = [
    ...datesIn("2026-08", { weekday: 4, price: 200 }),
    ...datesIn("2026-09", { weekday: 4, price: 400 }),
  ];
  assert.ok(days.length >= COPY_GATES.minDatesForRange);
  const copy = build(days);
  assert.match(copy.lead, /ranged from S\$200 to S\$400/);
  assert.match(copy.lead, /2\.0× spread/);
});

// ---------------------------------------------------------------- midweek confound

test("a weekend premium that is really a seasonal effect is NOT reported", () => {
  // Cheap month is weekday-heavy, expensive month is weekend-heavy. Comparing raw medians
  // says weekends cost 4x; comparing within each month says they cost exactly the same.
  const days = [
    ...datesIn("2026-08", { weekday: 5, weekend: 3, price: 100 }),
    ...datesIn("2026-09", { weekday: 3, weekend: 5, price: 400 }),
  ];
  const copy = build(days);
  assert.equal(copy.midweek, null);
  assert.equal(
    copy.faqs.some((f) => f.question.includes("midweek")),
    false,
  );
});

test("a genuine within-month weekend premium IS reported", () => {
  const days = [
    ...datesIn("2026-08", { weekday: 3, price: 100 }),
    ...datesIn("2026-08", { weekend: 3, price: 130 }),
    ...datesIn("2026-09", { weekday: 3, price: 100 }),
    ...datesIn("2026-09", { weekend: 3, price: 130 }),
  ];
  const copy = build(days);
  assert.ok(copy.midweek);
  assert.match(copy.midweek, /within the same month/);
  assert.match(copy.midweek, /about 30% more/);
  assert.ok(copy.faqs.some((f) => f.question.includes("midweek")));
});

test("a within-month gap below minDowGapPct is suppressed", () => {
  const days = [
    ...datesIn("2026-08", { weekday: 3, price: 100 }),
    ...datesIn("2026-08", { weekend: 3, price: 103 }), // +3%
    ...datesIn("2026-09", { weekday: 3, price: 100 }),
    ...datesIn("2026-09", { weekend: 3, price: 103 }),
  ];
  assert.ok(3 < COPY_GATES.minDowGapPct);
  assert.equal(build(days).midweek, null);
});

test("one qualifying month is not enough for a midweek claim", () => {
  const days = [
    ...datesIn("2026-08", { weekday: 3, price: 100 }),
    ...datesIn("2026-08", { weekend: 3, price: 200 }),
  ];
  assert.equal(build(days).midweek, null);
});

test("a weekend discount is reported as the reverse of the usual pattern", () => {
  const days = [
    ...datesIn("2026-08", { weekday: 3, price: 200 }),
    ...datesIn("2026-08", { weekend: 3, price: 100 }),
    ...datesIn("2026-09", { weekday: 3, price: 200 }),
    ...datesIn("2026-09", { weekend: 3, price: 100 }),
  ];
  const copy = build(days);
  assert.ok(copy.midweek);
  assert.match(copy.midweek, /cheaper than Monday–Thursday/);
  const faq = copy.faqs.find((f) => f.question.includes("midweek"));
  assert.ok(faq);
  assert.match(faq.answer, /^Not at the moment/);
});

// ---------------------------------------------------------------- freshness

test("fresh data claims daily updates and quotes lead time", () => {
  const days = datesIn("2026-09", { weekday: 4, weekend: 4, price: 300 });
  const copy = build(days, { lastFetchedAt: "2026-08-01" });
  assert.equal(copy.stale, false);
  assert.equal(copy.ageDays, 0);
  assert.equal(copy.freshnessLabel, "updated daily");
  assert.match(copy.lead, /days out/);
});

test("stale data swaps the freshness label and drops the lead-time claim", () => {
  const days = datesIn("2026-09", { weekday: 4, weekend: 4, price: 300 });
  const copy = build(days, { lastFetchedAt: "2026-07-24" }); // 8 days before `today`
  assert.equal(copy.stale, true);
  assert.equal(copy.ageDays, 8);
  assert.equal(copy.freshnessLabel, "last updated 24 July 2026");
  assert.doesNotMatch(copy.lead, /days out/);
  assert.match(copy.faqs[0]!.answer, /last refreshed on 24 July 2026/);
});

test("the staleness boundary is exactly staleAfterDays", () => {
  const days = datesIn("2026-09", { weekday: 4, price: 300 });
  const dayBefore = build(days, { lastFetchedAt: "2026-07-30" }); // 2 days old
  const atGate = build(days, { lastFetchedAt: "2026-07-29" }); // 3 days old
  assert.equal(COPY_GATES.staleAfterDays, 3);
  assert.equal(dayBefore.stale, false);
  assert.equal(atGate.stale, true);
});

test("unknown freshness is treated as fresh rather than invented", () => {
  const copy = build(datesIn("2026-09", { weekday: 4, price: 300 }), { lastFetchedAt: null });
  assert.equal(copy.stale, false);
  assert.equal(copy.ageDays, null);
  assert.equal(copy.lastFetchedAt, null);
});

// ---------------------------------------------------------------- FAQ shape

test("the empty 'how far in advance' FAQ is not published", () => {
  const copy = build(datesIn("2026-09", { weekday: 4, weekend: 4, price: 300 }));
  assert.equal(
    copy.faqs.some((f) => /how far in advance/i.test(f.question)),
    false,
  );
});

test("a verdict line becomes the booking-timing FAQ when supplied", () => {
  const copy = buildRouteCopy({
    ...BASE,
    days: datesIn("2026-09", { weekday: 4, price: 300 }),
    verdictLine: "Yes — 20% below the 60-day median.",
  });
  const faq = copy.faqs.at(-1);
  assert.ok(faq);
  assert.match(faq.question, /Is now a good time to book/);
  assert.equal(faq.answer, "Yes — 20% below the 60-day median.");
});

test("every published FAQ has a non-empty answer", () => {
  const copy = build([
    ...datesIn("2026-08", { weekday: 3, weekend: 3, price: 100 }),
    ...datesIn("2026-09", { weekday: 3, weekend: 3, price: 200 }),
    ...datesIn("2026-10", { weekday: 3, price: 300 }),
  ]);
  assert.ok(copy.faqs.length >= 2);
  for (const f of copy.faqs) {
    assert.ok(f.question.length > 10, `question too short: ${f.question}`);
    assert.ok(f.answer.length > 30, `answer too short: ${f.answer}`);
  }
});

// ---------------------------------------------------------------- timezone safety

test("day-of-week classification uses UTC so a server TZ cannot shift a date", () => {
  // 2026-08-07 is a Friday; 2026-08-06 a Thursday. Price the Fridays higher and confirm the
  // gap lands with the sign we expect regardless of the host timezone.
  const days = [
    { departDate: "2026-08-03", price: 100 }, // Mon
    { departDate: "2026-08-04", price: 100 }, // Tue
    { departDate: "2026-08-06", price: 100 }, // Thu
    { departDate: "2026-08-07", price: 150 }, // Fri
    { departDate: "2026-08-08", price: 150 }, // Sat
    { departDate: "2026-08-09", price: 150 }, // Sun
    { departDate: "2026-09-07", price: 100 }, // Mon
    { departDate: "2026-09-08", price: 100 }, // Tue
    { departDate: "2026-09-10", price: 100 }, // Thu
    { departDate: "2026-09-11", price: 150 }, // Fri
    { departDate: "2026-09-12", price: 150 }, // Sat
    { departDate: "2026-09-13", price: 150 }, // Sun
  ];
  const copy = build(days);
  assert.ok(copy.midweek);
  assert.match(copy.midweek, /about 50% more/);
});
