import { NextResponse, type NextRequest } from "next/server";

import { buildGoLink, isProvider } from "@/lib/go-links";

/**
 * Click-out redirect (D17 Group D, pulled forward). `to` + `date` are validated against
 * our own whitelist before a URL is built — never redirects to a caller-supplied URL.
 * Falls back to /deals on anything unrecognized rather than erroring.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  const to = (request.nextUrl.searchParams.get("to") ?? "").toUpperCase();
  const date = request.nextUrl.searchParams.get("date") ?? "";

  const fallback = new URL("/deals", request.url);
  if (!isProvider(provider)) return NextResponse.redirect(fallback);

  const target = buildGoLink(provider, to, date);
  if (!target) return NextResponse.redirect(fallback);

  return NextResponse.redirect(target);
}
