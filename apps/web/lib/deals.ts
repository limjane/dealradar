import { neon } from "@neondatabase/serverless";

import { env } from "@/lib/env";

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

export type FareDay = { departDate: string; price: number; currency: string };

/** Latest cheapest fare per upcoming departure date for one route — feeds the graph (D17). */
export async function getFareCalendar(destCode: string): Promise<FareDay[]> {
  const rows = (await sql`
    SELECT f.depart_date AS date, f.price::float8 AS price, f.currency
    FROM fare_calendar f
    JOIN routes r ON r.id = f.route_id
    JOIN (SELECT route_id, depart_date, max(fetched_at) AS mx
          FROM fare_calendar GROUP BY route_id, depart_date) l
      ON l.route_id = f.route_id AND l.depart_date = f.depart_date AND l.mx = f.fetched_at
    WHERE r.destination = ${destCode} AND f.depart_date >= to_char(now(), 'YYYY-MM-DD')
    ORDER BY f.depart_date
  `) as { date: string; price: number; currency: string }[];
  return rows.map((r) => ({ departDate: r.date, price: r.price, currency: r.currency }));
}

/** "S$412" / "USD 412" */
export function money(price: number, currency: string): string {
  const prefix = currency === "SGD" ? "S$" : `${currency} `;
  return `${prefix}${Math.round(price)}`;
}
