import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Core schema — foundation §3. Shared contract with the Python worker
 * (worker/models.py mirrors these shapes via Pydantic). Change here first,
 * generate a migration, then update the worker models in the same commit.
 */

export const dealStatus = pgEnum("deal_status", ["active", "expired"]);
export const subscriberStatus = pgEnum("subscriber_status", [
  "pending",
  "confirmed",
  "unsubscribed",
]);

export const routes = pgTable(
  "routes",
  {
    id: serial("id").primaryKey(),
    origin: text("origin").notNull(), // IATA, e.g. SIN
    destination: text("destination").notNull(), // IATA, e.g. NRT
    active: boolean("active").notNull().default(true),
    seedPriority: integer("seed_priority").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("routes_origin_destination_idx").on(t.origin, t.destination)],
);

// Append-only (§3) — partition by month later if it grows.
export const priceSnapshots = pgTable(
  "price_snapshots",
  {
    id: serial("id").primaryKey(),
    routeId: integer("route_id")
      .notNull()
      .references(() => routes.id),
    travelMonth: text("travel_month").notNull(), // YYYY-MM
    cabin: text("cabin").notNull().default("ECONOMY"),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    currency: text("currency").notNull(),
    source: text("source").notNull(), // e.g. amadeus
    fetchedAt: timestamp("fetched_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("price_snapshots_route_month_idx").on(
      t.routeId,
      t.travelMonth,
      t.fetchedAt,
    ),
  ],
);

export const deals = pgTable(
  "deals",
  {
    id: serial("id").primaryKey(),
    routeId: integer("route_id")
      .notNull()
      .references(() => routes.id),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    baselineMedian: numeric("baseline_median", {
      precision: 10,
      scale: 2,
    }).notNull(),
    discountPct: numeric("discount_pct", { precision: 5, scale: 2 }).notNull(),
    score: numeric("score", { precision: 6, scale: 2 }).notNull(),
    deepLinkParams: jsonb("deep_link_params").notNull(),
    status: dealStatus("status").notNull().default("active"),
    firstSeen: timestamp("first_seen", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (t) => [index("deals_status_route_idx").on(t.status, t.routeId)],
);

// Short-TTL cost control (§3 data flow) — prune nightly from the worker.
export const searchCache = pgTable(
  "search_cache",
  {
    id: serial("id").primaryKey(),
    routeId: integer("route_id")
      .notNull()
      .references(() => routes.id),
    dates: text("dates").notNull(), // canonical "YYYY-MM-DD_YYYY-MM-DD" (one-way: single date)
    resultsJson: jsonb("results_json").notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("search_cache_route_dates_idx").on(t.routeId, t.dates)],
);

// Crown jewels (§4.4): only PII table. No PII in logs, ever.
export const subscribers = pgTable("subscribers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  status: subscriberStatus("status").notNull().default("pending"),
  routesFilter: jsonb("routes_filter"), // null = all routes
  confirmToken: text("confirm_token").notNull(),
  unsubscribeToken: text("unsubscribe_token").notNull(),
  consentAt: timestamp("consent_at", { withTimezone: true }), // set on double opt-in confirm (PDPA/GDPR)
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Revenue accounting — /go redirect logs here before 302 (§3, §4.3).
export const clicks = pgTable(
  "clicks",
  {
    id: serial("id").primaryKey(),
    dealId: integer("deal_id").references(() => deals.id), // nullable: search click-outs
    target: text("target").notNull(), // affiliate program key, not raw URL
    subscriberId: integer("subscriber_id").references(() => subscribers.id),
    ts: timestamp("ts", { withTimezone: true }).notNull().defaultNow(),
    uaHash: text("ua_hash"), // hashed UA — no raw fingerprints
  },
  (t) => [index("clicks_ts_idx").on(t.ts)],
);
