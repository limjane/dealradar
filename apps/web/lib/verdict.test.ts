/**
 * Tests for lib/verdict.ts — the TS mirror of worker/verdict.py. Run with `pnpm test`
 * (Node's built-in runner + native TS type-stripping — no test-framework dependency).
 *
 * The month-selection cases mirror worker/tests/test_verdict.py one-for-one: the two files
 * are deliberate mirrors, so a divergence in either one is a bug (D34).
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { computeVerdict, selectVerdictMonth, type MonthHistory } from "./verdict.ts";

const MATURE = { history: Array(21).fill(500) as number[], historySpanDays: 21 };
const FRESH = { history: [410], historySpanDays: 0 }; // just entered the rolling window

function month(travelMonth: string, price: number, h: typeof MATURE | typeof FRESH): MonthHistory {
  return { travelMonth, price, currency: "SGD", ...h };
}

test("computeVerdict: labels and boundaries", () => {
  assert.equal(computeVerdict(312, Array(20).fill(505), 20).label, "grab");
  assert.equal(computeVerdict(425, Array(20).fill(500), 20).label, "grab"); // exactly -15%
  assert.equal(computeVerdict(470, Array(20).fill(500), 20).label, "fair");
  assert.equal(computeVerdict(610, Array(20).fill(500), 20).label, "high");
  assert.equal(computeVerdict(575, Array(20).fill(500), 20).label, "high"); // exactly +15%
  assert.equal(computeVerdict(312, [], 0).label, "nodata");
  assert.equal(computeVerdict(312, Array(5).fill(500), 6).label, "nodata"); // span too short
  assert.equal(computeVerdict(500, Array(14).fill(500), 14).label, "fair"); // span exactly 14d
});

test("selectVerdictMonth: skips a brand-new cheaper month for one with history", () => {
  // The actual 2026-08-01 bug: 2026-10 entered the window cheapest with 1 snapshot and took
  // the verdict off BKK/DPS/HKG even though 08/09 had 21 days of history.
  const picked = selectVerdictMonth([
    month("2026-10", 410, FRESH),
    month("2026-08", 455, MATURE),
    month("2026-09", 470, MATURE),
  ]);
  assert.equal(picked?.travelMonth, "2026-08"); // cheapest of the two *scoreable* months
  assert.equal(computeVerdict(picked!.price, picked!.history, picked!.historySpanDays).label, "fair");
});

test("selectVerdictMonth: picks the cheapest month when it is itself mature", () => {
  const picked = selectVerdictMonth([month("2026-08", 410, MATURE), month("2026-09", 470, MATURE)]);
  assert.equal(picked?.travelMonth, "2026-08");
});

test("selectVerdictMonth: falls back to cheapest when no month has history", () => {
  // A genuinely new route still scores nodata — it just does so honestly.
  const picked = selectVerdictMonth([month("2026-10", 410, FRESH), month("2026-08", 455, FRESH)]);
  assert.equal(picked?.travelMonth, "2026-10");
  assert.equal(computeVerdict(picked!.price, picked!.history, picked!.historySpanDays).label, "nodata");
});

test("selectVerdictMonth: a month with no history rows at all is immature", () => {
  const picked = selectVerdictMonth([
    month("2026-10", 410, { history: [], historySpanDays: 0 }),
    month("2026-08", 455, MATURE),
  ]);
  assert.equal(picked?.travelMonth, "2026-08");
});

test("selectVerdictMonth: no candidates", () => {
  assert.equal(selectVerdictMonth([]), null);
});
