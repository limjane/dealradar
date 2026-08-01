import { neon } from "@neondatabase/serverless";

import { env } from "@/lib/env";
import {
  computeVerdict,
  selectVerdictMonth,
  type MonthHistory,
  type Verdict,
} from "@/lib/verdict";

/**
 * Read-side queries for the public pages. Uses the latest snapshot per (route, month)
 * so pages reflect the freshest tracked fare. Prices are one-way cheapest, in SGD.
 */
const sql = neon(env.DATABASE_URL);

type LatestRow = { dest: string; month: string; price: number; currency: string };

// Latest snapshot per route+month (the most recent daily poll for each tracked month).
async function latestByRouteMonth(destFilter?: string): Promise<LatestRow[]> {
  if (destFilter) {
    return (await sql`
      SELECT r.destination AS dest, s.travel_month AS month, s.price::float8 AS price, s.currency
      FROM price_snapshots s
      JOIN routes r ON r.id = s.route_id
      JOIN (SELECT route_id, travel_month, max(fetched_at) AS mx
            FROM price_snapshots GROUP BY route_id, travel_month) l
        ON l.route_id = s.route_id AND l.travel_month = s.travel_month AND l.mx = s.fetched_at
      WHERE r.destination = ${destFilter}
      ORDER BY s.travel_month
    `) as LatestRow[];
  }
  return (await sql`
    SELECT r.destination AS dest, s.travel_month AS month, s.price::float8 AS price, s.currency
    FROM price_snapshots s
    JOIN routes r ON r.id = s.route_id
    JOIN (SELECT route_id, travel_month, max(fetched_at) AS mx
          FROM price_snapshots GROUP BY route_id, travel_month) l
      ON l.route_id = s.route_id AND l.travel_month = s.travel_month AND l.mx = s.fetched_at
    ORDER BY r.destination, s.travel_month
  `) as LatestRow[];
}

export type RouteDeal = {
  destCode: string;
  travelMonth: string;
  price: number;
  currency: string;
};

/** Cheapest current fare per route, cheapest-first — for the deals page. */
export async function getCheapestPerRoute(): Promise<RouteDeal[]> {
  const rows = await latestByRouteMonth();
  const best = new Map<string, RouteDeal>();
  for (const r of rows) {
    const cur = best.get(r.dest);
    if (!cur || r.price < cur.price) {
      best.set(r.dest, {
        destCode: r.dest,
        travelMonth: r.month,
        price: r.price,
        currency: r.currency,
      });
    }
  }
  return [...best.values()].sort((a, b) => a.price - b.price);
}

export type MonthPrice = { travelMonth: string; price: number; currency: string };
export type RouteStats = { months: MonthPrice[]; cheapest: MonthPrice | null; currency: string };

/** Cheapest fare per tracked month for one route — for the route page. */
export async function getRouteStats(destCode: string): Promise<RouteStats> {
  const rows = await latestByRouteMonth(destCode);
  const months: MonthPrice[] = rows.map((r) => ({
    travelMonth: r.month,
    price: r.price,
    currency: r.currency,
  }));
  const cheapest = months.length
    ? months.reduce((a, b) => (b.price < a.price ? b : a))
    : null;
  return { months, cheapest, currency: months[0]?.currency ?? "SGD" };
}

export type FareDay = {
  departDate: string;
  price: number;
  currency: string;
  /** When this row was polled, "YYYY-MM-DD" — drives the route page's freshness line.
   * Absent on rows synthesised from monthly snapshots when fare_calendar is empty. */
  fetchedAt?: string;
};

/** Latest cheapest fare per upcoming departure date for one route — feeds the graph (D17). */
export async function getFareCalendar(destCode: string): Promise<FareDay[]> {
  const rows = (await sql`
    SELECT f.depart_date AS date, f.price::float8 AS price, f.currency,
           to_char(f.fetched_at, 'YYYY-MM-DD') AS fetched_at
    FROM fare_calendar f
    JOIN routes r ON r.id = f.route_id
    JOIN (SELECT route_id, depart_date, max(fetched_at) AS mx
          FROM fare_calendar GROUP BY route_id, depart_date) l
      ON l.route_id = f.route_id AND l.depart_date = f.depart_date AND l.mx = f.fetched_at
    WHERE r.destination = ${destCode} AND f.depart_date >= to_char(now(), 'YYYY-MM-DD')
    ORDER BY f.depart_date
  `) as { date: string; price: number; currency: string; fetched_at: string }[];
  return rows.map((r) => ({
    departDate: r.date,
    price: r.price,
    currency: r.currency,
    fetchedAt: r.fetched_at,
  }));
}

type HistoryRow = { dest: string; month: string; price: number; fetched_at: string };

/** Every tracked route+month's own snapshot prices over the trailing window — same
 * "route+month's own history" shape worker/db.py::month_histories reads for the worker's
 * publish-side scoring. One query for all routes (or one, with `destFilter`). */
async function monthHistories(destFilter?: string, windowDays = 60): Promise<HistoryRow[]> {
  if (destFilter) {
    return (await sql`
      SELECT r.destination AS dest, s.travel_month AS month, s.price::float8 AS price,
             s.fetched_at AS fetched_at
      FROM price_snapshots s
      JOIN routes r ON r.id = s.route_id
      WHERE r.destination = ${destFilter}
        AND s.fetched_at >= now() - (${windowDays} || ' days')::interval
      ORDER BY s.travel_month, s.fetched_at
    `) as HistoryRow[];
  }
  return (await sql`
    SELECT r.destination AS dest, s.travel_month AS month, s.price::float8 AS price,
           s.fetched_at AS fetched_at
    FROM price_snapshots s
    JOIN routes r ON r.id = s.route_id
    WHERE s.fetched_at >= now() - (${windowDays} || ' days')::interval
    ORDER BY r.destination, s.travel_month, s.fetched_at
  `) as HistoryRow[];
}

/** The month a route's verdict was scored against — may differ from the cheapest month a
 * page shows as its headline, which is exactly why callers get the month back (D34). */
export type RouteVerdict = {
  destCode: string;
  travelMonth: string;
  price: number;
  currency: string;
  verdict: Verdict;
};

/**
 * Live buy/wait verdict per route (task 4), keyed by destination code. Scores the cheapest
 * month that actually has enough history — see verdict.ts::selectVerdictMonth for why
 * "cheapest month" alone loses the verdict at every month rollover (D34).
 */
export async function getRouteVerdicts(destFilter?: string): Promise<Map<string, RouteVerdict>> {
  const [latest, history] = await Promise.all([
    latestByRouteMonth(destFilter),
    monthHistories(destFilter),
  ]);

  // route -> month -> its own snapshot prices, oldest first (SQL already ordered them).
  const byRouteMonth = new Map<string, Map<string, HistoryRow[]>>();
  for (const r of history) {
    let months = byRouteMonth.get(r.dest);
    if (!months) {
      months = new Map<string, HistoryRow[]>();
      byRouteMonth.set(r.dest, months);
    }
    const rows = months.get(r.month);
    if (rows) rows.push(r);
    else months.set(r.month, [r]);
  }

  const candidates = new Map<string, MonthHistory[]>();
  for (const row of latest) {
    const rows = byRouteMonth.get(row.dest)?.get(row.month) ?? [];
    const spanMs = rows.length
      ? new Date(rows[rows.length - 1]!.fetched_at).getTime() - new Date(rows[0]!.fetched_at).getTime()
      : 0;
    const list = candidates.get(row.dest) ?? [];
    list.push({
      travelMonth: row.month,
      price: row.price,
      currency: row.currency,
      history: rows.map((r) => r.price),
      historySpanDays: Math.floor(spanMs / 86_400_000),
    });
    candidates.set(row.dest, list);
  }

  const out = new Map<string, RouteVerdict>();
  for (const [dest, months] of candidates) {
    const picked = selectVerdictMonth(months);
    if (!picked) continue;
    out.set(dest, {
      destCode: dest,
      travelMonth: picked.travelMonth,
      price: picked.price,
      currency: picked.currency,
      verdict: computeVerdict(picked.price, picked.history, picked.historySpanDays),
    });
  }
  return out;
}

/** Formatter lives in lib/route-copy.ts (pure, no DB client) — re-exported for existing callers. */
export { money } from "@/lib/route-copy";
