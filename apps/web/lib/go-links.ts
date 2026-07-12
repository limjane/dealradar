import { ORIGIN } from "@/lib/routes-meta";

/**
 * Server-built vendor deep links for the /go click-out redirect (D17 Group D, pulled
 * forward; extended D23 for worldwide origin/destination + round-trip). Never accept a raw
 * URL from the caller — validate origin/destination as IATA-code shaped and the date as a
 * real calendar date (foundation.md §4.3: the #1 abuse surface is an open redirect). Target
 * is always a whitelisted provider's own search page, so a syntactically-valid-but-made-up
 * code is harmless (worst case: that provider's "no results" page) — D23 needs arbitrary
 * worldwide codes from the autocomplete field, so we no longer require destination
 * membership in our tracked-routes list (that list is now editorial-only, see
 * routes-meta.ts). Single vendor for now (Aviasales, same Travelpayouts account as our
 * price source); unmonetized until Travelpayouts project approval lands, at which point
 * `TRAVELPAYOUTS_MARKER` gets appended in `aviasalesUrl` below — the one place a link is
 * built for this provider.
 */

export type Provider = "aviasales";

const PROVIDERS: readonly Provider[] = ["aviasales"];

export function isProvider(value: string): value is Provider {
  return (PROVIDERS as readonly string[]).includes(value);
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const IATA_RE = /^[A-Z]{3}$/;

/** "2026-08-15" -> "1508" (Aviasales search-string date format). */
function ddmm(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${d}${m}`;
}

function aviasalesUrl(fromCode: string, destCode: string, depart: string, ret?: string): string {
  const searchId = ret
    ? `${fromCode}${ddmm(depart)}${destCode}${ddmm(ret)}${fromCode}1`
    : `${fromCode}${ddmm(depart)}${destCode}1`;
  return `https://www.aviasales.com/search/${searchId}`;
}

export type GoLinkParams = {
  from?: string;
  to: string;
  depart: string;
  return?: string;
};

/**
 * Builds a deep link for a whitelisted provider. `from` defaults to our tracked seed
 * origin (SIN) for legacy one-way callers (/deals, /flights/[route]); `to`/`from` are
 * validated as IATA-shaped, not looked up against a fixed list — D23 search is worldwide.
 * Returns null on anything malformed so the caller can fall back safely instead of
 * redirecting.
 */
export function buildGoLink(provider: Provider, params: GoLinkParams): string | null {
  const from = (params.from ?? ORIGIN.code).toUpperCase();
  const to = params.to.toUpperCase();
  if (!IATA_RE.test(from) || !IATA_RE.test(to)) return null;
  if (!DATE_RE.test(params.depart)) return null;
  if (params.return && !DATE_RE.test(params.return)) return null;
  switch (provider) {
    case "aviasales":
      return aviasalesUrl(from, to, params.depart, params.return);
    default:
      return null;
  }
}

/** Mid-month placeholder when only a travel month is known (mirrors the monthly-fallback
 * convention already used on the route page). */
export function defaultDateForMonth(travelMonth: string): string {
  return `${travelMonth}-15`;
}
