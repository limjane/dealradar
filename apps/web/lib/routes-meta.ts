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

/**
 * D37 — generic copy template for the 36-route expansion (BKK..FCO above stay hand-written).
 * Region-level seasonal notes only (no airline/nonstop claims we can't verify per route).
 */
type Region =
  | "seasia"
  | "eastasia"
  | "southasia"
  | "oceania"
  | "namerica"
  | "europe"
  | "middleeast"
  | "africa";

const REGION_NOTE: Record<Region, string> = {
  seasia:
    "Regional demand is driven by school holidays and religious festival dates, which vary by country. Budget carriers compete heavily on Southeast Asian routes, so fares tend to be lower and more volatile than long-haul.",
  eastasia:
    "Spring and autumn tourist seasons (cherry blossom / autumn foliage in Northeast Asia, or Lunar New Year further south) push fares up across the region. Winter outside major holidays tends to be cheaper.",
  southasia:
    "Fares often dip during the regional monsoon season and rise around major national and religious holidays, which shift each year.",
  oceania:
    "Australian and New Zealand school holidays plus December are the priciest windows. Shoulder months (Feb–Mar, Sep–Oct) tend to be the best value.",
  namerica:
    "Summer (Jun–Aug) and the December holidays are the most expensive times to fly. January–February outside any holiday tends to be cheapest on this long-haul route.",
  europe:
    "European summer (Jun–Aug) and the Christmas–New Year period are the priciest windows. Low season (Jan–Mar, Nov) usually brings the best fares on this long-haul route.",
  middleeast:
    "Fares can spike around regional pilgrimage and holiday periods. Shoulder months outside those windows tend to offer better value.",
  africa:
    "Peak safari/dry season (roughly Jun–Oct) tends to push fares up. Shoulder months outside that window are usually better value on this long-haul route.",
};

type NewRoute = {
  code: string;
  city: string;
  country: string;
  emoji: string;
  grad: string;
  hours: string;
  region: Region;
};

function genericDest(r: NewRoute): DestMeta {
  return {
    code: r.code,
    city: r.city,
    country: r.country,
    emoji: r.emoji,
    grad: r.grad,
    blurb: `Singapore to ${r.city} is roughly ${r.hours} in the air. ${REGION_NOTE[r.region]}`,
    tips: `Prices vary by season and how far ahead you book — track this route for a while before judging what's a genuine deal. ${REGION_NOTE[r.region]}`,
  };
}

const NEW_ROUTES: NewRoute[] = [
  { code: "KUL", city: "Kuala Lumpur", country: "Malaysia", emoji: "🏙️", grad: "linear-gradient(135deg,#0ea5e9,#22c55e)", hours: "1h10m", region: "seasia" },
  { code: "SGN", city: "Ho Chi Minh City", country: "Vietnam", emoji: "🍜", grad: "linear-gradient(135deg,#f59e0b,#dc2626)", hours: "1h45m", region: "seasia" },
  { code: "PVG", city: "Shanghai", country: "China", emoji: "🏮", grad: "linear-gradient(135deg,#ef4444,#f59e0b)", hours: "5h20m", region: "eastasia" },
  { code: "DEL", city: "Delhi", country: "India", emoji: "🕌", grad: "linear-gradient(135deg,#f97316,#16a34a)", hours: "5h40m", region: "southasia" },
  { code: "BOM", city: "Mumbai", country: "India", emoji: "🌊", grad: "linear-gradient(135deg,#0891b2,#f97316)", hours: "5h30m", region: "southasia" },
  { code: "PEK", city: "Beijing", country: "China", emoji: "🏯", grad: "linear-gradient(135deg,#b91c1c,#facc15)", hours: "6h30m", region: "eastasia" },
  { code: "KIX", city: "Osaka", country: "Japan", emoji: "🎏", grad: "linear-gradient(135deg,#f472b6,#38bdf8)", hours: "6h45m", region: "eastasia" },
  { code: "PUS", city: "Busan", country: "South Korea", emoji: "🌊", grad: "linear-gradient(135deg,#0ea5e9,#f472b6)", hours: "6h50m", region: "eastasia" },
  { code: "CEB", city: "Cebu", country: "Philippines", emoji: "🏖️", grad: "linear-gradient(135deg,#38bdf8,#facc15)", hours: "3h30m", region: "seasia" },
  { code: "CMB", city: "Colombo", country: "Sri Lanka", emoji: "🐘", grad: "linear-gradient(135deg,#15803d,#f97316)", hours: "4h", region: "southasia" },
  { code: "KHH", city: "Kaohsiung", country: "Taiwan", emoji: "⛩️", grad: "linear-gradient(135deg,#a855f7,#f472b6)", hours: "4h30m", region: "eastasia" },
  { code: "REP", city: "Siem Reap", country: "Cambodia", emoji: "🛕", grad: "linear-gradient(135deg,#f59e0b,#7c3aed)", hours: "2h10m", region: "seasia" },
  { code: "RGN", city: "Yangon", country: "Myanmar", emoji: "🛕", grad: "linear-gradient(135deg,#ca8a04,#dc2626)", hours: "2h50m", region: "seasia" },
  { code: "KTM", city: "Kathmandu", country: "Nepal", emoji: "🏔️", grad: "linear-gradient(135deg,#64748b,#f97316)", hours: "5h", region: "southasia" },
  { code: "MLE", city: "Male", country: "Maldives", emoji: "🏝️", grad: "linear-gradient(135deg,#0ea5e9,#34d399)", hours: "4h20m", region: "southasia" },
  { code: "AKL", city: "Auckland", country: "New Zealand", emoji: "🥝", grad: "linear-gradient(135deg,#16a34a,#0ea5e9)", hours: "10h30m", region: "oceania" },
  { code: "MEL", city: "Melbourne", country: "Australia", emoji: "🌆", grad: "linear-gradient(135deg,#334155,#0ea5e9)", hours: "7h40m", region: "oceania" },
  { code: "LAX", city: "Los Angeles", country: "United States", emoji: "🌴", grad: "linear-gradient(135deg,#f472b6,#facc15)", hours: "17h30m", region: "namerica" },
  { code: "JFK", city: "New York", country: "United States", emoji: "🗽", grad: "linear-gradient(135deg,#1e3a8a,#f59e0b)", hours: "18h30m", region: "namerica" },
  { code: "FRA", city: "Frankfurt", country: "Germany", emoji: "🍺", grad: "linear-gradient(135deg,#facc15,#1e293b)", hours: "12h50m", region: "europe" },
  { code: "AMS", city: "Amsterdam", country: "Netherlands", emoji: "🚲", grad: "linear-gradient(135deg,#f97316,#0ea5e9)", hours: "13h", region: "europe" },
  { code: "IST", city: "Istanbul", country: "Turkey", emoji: "🕌", grad: "linear-gradient(135deg,#dc2626,#0ea5e9)", hours: "11h30m", region: "europe" },
  { code: "DOH", city: "Doha", country: "Qatar", emoji: "🏜️", grad: "linear-gradient(135deg,#7c2d12,#a855f7)", hours: "8h30m", region: "middleeast" },
  { code: "BCN", city: "Barcelona", country: "Spain", emoji: "⛱️", grad: "linear-gradient(135deg,#dc2626,#facc15)", hours: "14h30m", region: "europe" },
  { code: "ZRH", city: "Zurich", country: "Switzerland", emoji: "🏔️", grad: "linear-gradient(135deg,#dc2626,#64748b)", hours: "13h", region: "europe" },
  { code: "ATH", city: "Athens", country: "Greece", emoji: "🏛️", grad: "linear-gradient(135deg,#0ea5e9,#f1f5f9)", hours: "12h30m", region: "europe" },
  { code: "LIS", city: "Lisbon", country: "Portugal", emoji: "🌅", grad: "linear-gradient(135deg,#16a34a,#dc2626)", hours: "16h", region: "europe" },
  { code: "YVR", city: "Vancouver", country: "Canada", emoji: "🏔️", grad: "linear-gradient(135deg,#dc2626,#16a34a)", hours: "15h30m", region: "namerica" },
  { code: "JNB", city: "Johannesburg", country: "South Africa", emoji: "🦁", grad: "linear-gradient(135deg,#ca8a04,#166534)", hours: "10h30m", region: "africa" },
  { code: "NBO", city: "Nairobi", country: "Kenya", emoji: "🦒", grad: "linear-gradient(135deg,#f59e0b,#166534)", hours: "9h30m", region: "africa" },
  { code: "CAI", city: "Cairo", country: "Egypt", emoji: "🐫", grad: "linear-gradient(135deg,#d97706,#0369a1)", hours: "9h30m", region: "africa" },
  { code: "JED", city: "Jeddah", country: "Saudi Arabia", emoji: "🕋", grad: "linear-gradient(135deg,#166534,#f1f5f9)", hours: "9h", region: "middleeast" },
  { code: "DAC", city: "Dhaka", country: "Bangladesh", emoji: "🌾", grad: "linear-gradient(135deg,#16a34a,#dc2626)", hours: "4h", region: "southasia" },
  { code: "BWN", city: "Bandar Seri Begawan", country: "Brunei", emoji: "🕌", grad: "linear-gradient(135deg,#facc15,#dc2626)", hours: "2h", region: "seasia" },
  { code: "VTE", city: "Vientiane", country: "Laos", emoji: "🛕", grad: "linear-gradient(135deg,#dc2626,#0ea5e9)", hours: "2h40m", region: "seasia" },
  { code: "NAN", city: "Nadi", country: "Fiji", emoji: "🏝️", grad: "linear-gradient(135deg,#0ea5e9,#f472b6)", hours: "9h30m", region: "oceania" },
];

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
  CGK: {
    code: "CGK",
    city: "Jakarta",
    country: "Indonesia",
    emoji: "🏙️",
    grad: "linear-gradient(135deg,#f97316,#ef4444)",
    blurb:
      "Singapore to Jakarta is one of the busiest short-haul routes in Southeast Asia, under 2 hours direct. Heavy competition between full-service and budget carriers keeps fares low and frequently on sale.",
    tips: "Fares are fairly flat year-round given how competitive the route is, but dip further outside Indonesian public holidays (Idul Fitri, Christmas–New Year). Weekday flights are usually the cheapest.",
  },
  DXB: {
    code: "DXB",
    city: "Dubai",
    country: "United Arab Emirates",
    emoji: "🏜️",
    grad: "linear-gradient(135deg,#d97706,#7c3aed)",
    blurb:
      "Singapore to Dubai is a ~7h30m route and a major hub connection, with strong leisure and stopover demand year-round.",
    tips: "Shoulder months (Feb–Mar, Oct–Nov) tend to be cheaper, avoiding both the summer heat lull and the Nov–Jan peak. Watch for stopover fare promos via Dubai-based carriers.",
  },
  CDG: {
    code: "CDG",
    city: "Paris",
    country: "France",
    emoji: "🗼",
    grad: "linear-gradient(135deg,#1e3a8a,#dc2626)",
    blurb:
      "Singapore to Paris (Charles de Gaulle) is a ~13h30m long-haul route and consistently one of the most-searched European destinations from Singapore.",
    tips: "Cheapest fares typically appear Jan–Mar and Nov, outside European summer (Jun–Aug) and Christmas–New Year peaks. Booking well ahead helps on this popular route.",
  },
  FCO: {
    code: "FCO",
    city: "Rome",
    country: "Italy",
    emoji: "🏛️",
    grad: "linear-gradient(135deg,#166534,#f59e0b)",
    blurb:
      "Singapore to Rome (Fiumicino) is a ~13h40m long-haul route, popular for its combination of history, food, and onward access to the rest of Italy.",
    tips: "Low season (Jan–Mar, Nov) usually brings the best fares. Avoid the Jun–Aug Italian summer peak and major Catholic holiday periods when prices climb.",
  },
  ...Object.fromEntries(NEW_ROUTES.map((r) => [r.code, genericDest(r)])),
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
