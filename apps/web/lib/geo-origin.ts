import type { Airport } from "../components/flight-search-form";

/**
 * Geo-IP default origin (D27 block A). Maps Vercel's `x-vercel-ip-country` header to a
 * sensible default "From" airport for the search form — purely a UX default, the field
 * stays fully user-editable via autocomplete. Covers the countries our existing SIN-outbound
 * destinations serve (so a visitor from any of those markets sees their own city, not SIN)
 * plus Singapore itself. Unmapped/missing country falls back to SIN.
 */
export const DEFAULT_ORIGIN: Airport = { code: "SIN", label: "Singapore (SIN)" };

const COUNTRY_ORIGIN: Record<string, Airport> = {
  SG: DEFAULT_ORIGIN,
  TH: { code: "BKK", label: "Bangkok (BKK)" },
  MY: { code: "KUL", label: "Kuala Lumpur (KUL)" },
  ID: { code: "CGK", label: "Jakarta (CGK)" },
  PH: { code: "MNL", label: "Manila (MNL)" },
  HK: { code: "HKG", label: "Hong Kong (HKG)" },
  TW: { code: "TPE", label: "Taipei (TPE)" },
  KR: { code: "ICN", label: "Seoul (ICN)" },
  JP: { code: "NRT", label: "Tokyo (NRT)" },
  AU: { code: "SYD", label: "Sydney (SYD)" },
  GB: { code: "LHR", label: "London (LHR)" },
};

export function originForCountry(country: string | null | undefined): Airport {
  if (!country) return DEFAULT_ORIGIN;
  return COUNTRY_ORIGIN[country.toUpperCase()] ?? DEFAULT_ORIGIN;
}
