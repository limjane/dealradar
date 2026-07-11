/**
 * Presentation + editorial metadata for the seed routes (all ex-Singapore).
 * Mirrors worker/seed_routes.py. Used by the deals page and route pages.
 */

export const ORIGIN = { code: "SIN", city: "Singapore" };

export type DestMeta = {
  code: string;
  city: string;
  country: string;
  emoji: string;
  grad: string;
  blurb: string;
  tips: string;
};

export const DESTINATIONS: Record<string, DestMeta> = {
  BKK: {
    code: "BKK",
    city: "Bangkok",
    country: "Thailand",
    emoji: "🌆",
    grad: "linear-gradient(135deg,#fb923c,#f43f5e)",
    blurb:
      "Singapore to Bangkok is one of the busiest short-haul routes in the region, with several airlines flying it daily. High competition keeps fares low and volatile, so a little patience often pays off.",
    tips: "Fares dip most often outside Thai school holidays and the Nov–Feb peak. Mid-week departures are usually cheaper than weekends, and budget carriers frequently undercut full-service fares on this 2h20m hop.",
  },
  DPS: {
    code: "DPS",
    city: "Bali",
    country: "Indonesia",
    emoji: "🏝️",
    grad: "linear-gradient(135deg,#34d399,#0ea5e9)",
    blurb:
      "Singapore to Bali (Denpasar) is a favourite short getaway, roughly 2h40m direct. Prices swing with Indonesian and Australian holiday demand, so the same seat can vary widely week to week.",
    tips: "Shoulder months (Feb–Mar, Oct–Nov) tend to be cheapest. Avoid Christmas–New Year and the July–August peak when Bali fills up.",
  },
  HKG: {
    code: "HKG",
    city: "Hong Kong",
    country: "Hong Kong SAR",
    emoji: "🌃",
    grad: "linear-gradient(135deg,#6366f1,#22d3ee)",
    blurb:
      "Singapore to Hong Kong is a 4-hour route served by several carriers. It's a common business and connecting route, so fares move with weekday demand and seasonal sales.",
    tips: "Watch for airline flash sales, which hit this route often. Travelling mid-week and avoiding Chinese New Year and Golden Week usually lands the best prices.",
  },
  TPE: {
    code: "TPE",
    city: "Taipei",
    country: "Taiwan",
    emoji: "🏮",
    grad: "linear-gradient(135deg,#f472b6,#a855f7)",
    blurb:
      "Singapore to Taipei runs about 4h40m direct. A mix of full-service and low-cost carriers keeps this route competitively priced for much of the year.",
    tips: "Spring (Mar–Apr) and autumn (Oct–Nov) are pleasant and often cheaper than summer. Lunar New Year sends prices sharply up — avoid it if budget matters.",
  },
  ICN: {
    code: "ICN",
    city: "Seoul",
    country: "South Korea",
    emoji: "🌸",
    grad: "linear-gradient(135deg,#fb7185,#8b5cf6)",
    blurb:
      "Singapore to Seoul (Incheon) is a ~6h30m route with strong year-round demand. Fares reward flexible travellers who can dodge the cherry-blossom and autumn-foliage peaks.",
    tips: "Late spring and early winter often bring the lowest fares. Blossom season (late Mar–Apr) and the Chuseok holiday push prices up.",
  },
  NRT: {
    code: "NRT",
    city: "Tokyo",
    country: "Japan",
    emoji: "🗼",
    grad: "linear-gradient(135deg,#f472b6,#8b5cf6)",
    blurb:
      "Singapore to Tokyo (Narita) is a ~7h route and one of the most-searched from Singapore. Demand is high, so genuine dips are worth pouncing on when they appear.",
    tips: "Cheapest windows are usually January–February and early summer, away from cherry blossom (late Mar–Apr) and autumn leaves (Nov). Book early for those peaks.",
  },
  MNL: {
    code: "MNL",
    city: "Manila",
    country: "Philippines",
    emoji: "🏖️",
    grad: "linear-gradient(135deg,#38bdf8,#34d399)",
    blurb:
      "Singapore to Manila is a ~3h30m route with frequent budget and full-service options, making it one of the more affordable regional hops.",
    tips: "Avoid Philippine holiday peaks (Holy Week and Christmas). Mid-week departures and low-cost carriers usually offer the best value.",
  },
  SYD: {
    code: "SYD",
    city: "Sydney",
    country: "Australia",
    emoji: "🌉",
    grad: "linear-gradient(135deg,#0ea5e9,#6366f1)",
    blurb:
      "Singapore to Sydney is a ~8h long-haul route. Fares are noticeably higher than regional hops and move with Australian school-holiday demand.",
    tips: "Australian school holidays and December are the priciest. February–March and mid-year (outside June–July holidays) tend to be the sweet spots.",
  },
  PER: {
    code: "PER",
    city: "Perth",
    country: "Australia",
    emoji: "🦘",
    grad: "linear-gradient(135deg,#f59e0b,#ef4444)",
    blurb:
      "Singapore to Perth is the closest Australian city, around 5h. It's often the cheapest gateway into Australia from Singapore.",
    tips: "Shoulder months (Mar–May, Sep–Oct) usually offer the best fares. School holidays and Christmas drive prices up.",
  },
  LHR: {
    code: "LHR",
    city: "London",
    country: "United Kingdom",
    emoji: "🎡",
    grad: "linear-gradient(135deg,#64748b,#0ea5e9)",
    blurb:
      "Singapore to London (Heathrow) is a ~13h30m long-haul route. Prices are the highest on our list and vary a lot, so tracking pays off most here.",
    tips: "The cheapest fares usually appear in the low season (Jan–Mar and Nov, excluding the festive peak). Summer and December holidays are the most expensive.",
  },
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** "2026-08" -> "Aug 2026" */
export function formatMonth(ym: string): string {
  const [y, m] = ym.split("-");
  return `${MONTHS[Number(m) - 1] ?? m} ${y}`;
}

export function routeSlug(destCode: string): string {
  return `${ORIGIN.code}-${destCode}`.toLowerCase();
}

export const ROUTE_SLUGS = Object.keys(DESTINATIONS).map(routeSlug);

/** "sin-bkk" -> DestMeta for BKK (or undefined). */
export function destBySlug(slug: string): DestMeta | undefined {
  const [origin, code] = slug.toLowerCase().split("-");
  if (origin !== ORIGIN.code.toLowerCase() || !code) return undefined;
  return DESTINATIONS[code.toUpperCase()];
}
