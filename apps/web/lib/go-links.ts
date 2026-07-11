import { DESTINATIONS, ORIGIN } from "@/lib/routes-meta";

/**
 * Server-built vendor deep links for the /go click-out redirect (D17 Group D, pulled
 * forward). Never accept a raw URL from the caller — only whitelisted providers +
 * destinations we already track (foundation.md §4.3: the #1 abuse surface is an open
 * redirect). Single vendor for now (Aviasales, same Travelpayouts account as our price
 * source); unmonetized until Travelpayouts project approval lands, at which point
 * `TRAVELPAYOUTS_MARKER` gets appended in `aviasalesUrl` below — the one place a link is
 * built for this provider.
 */

export type Provider = "aviasales";

const PROVIDERS: readonly Provider[] = ["aviasales"];

export function isProvider(value: string): value is Provider {
  return (PROVIDERS as readonly string[]).includes(value);
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** "2026-08-15" -> "1508" (Aviasales search-string date format). */
function ddmm(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${d}${m}`;
}

function aviasalesUrl(destCode: string, date: string): string {
  const searchId = `${ORIGIN.code}${ddmm(date)}${destCode}1`;
  return `https://www.aviasales.com/search/${searchId}`;
}

/**
 * Builds a deep link for a whitelisted provider + a destination we track. Returns null on
 * anything unrecognized so the caller can fall back safely instead of redirecting.
 */
export function buildGoLink(provider: Provider, destCode: string, date: string): string | null {
  if (!DESTINATIONS[destCode]) return null;
  if (!DATE_RE.test(date)) return null;
  switch (provider) {
    case "aviasales":
      return aviasalesUrl(destCode, date);
    default:
      return null;
  }
}

/** Mid-month placeholder when only a travel month is known (mirrors the monthly-fallback
 * convention already used on the route page). */
export function defaultDateForMonth(travelMonth: string): string {
  return `${travelMonth}-15`;
}
