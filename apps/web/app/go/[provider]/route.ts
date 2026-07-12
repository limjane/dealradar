import { NextResponse, type NextRequest } from "next/server";

import { buildGoLink, isProvider } from "@/lib/go-links";

/**
 * Click-out redirect (D17 Group D; extended D23 for the branded search form). `to`/`from`/
 * `depart`/`return` are validated (shape only, see go-links.ts) before a URL is built —
 * never redirects to a caller-supplied URL. `date` is kept as an alias for `depart` so the
 * existing /deals and /flights/[route] one-way links keep working unchanged. Falls back to
 * /deals on anything unrecognized rather than erroring.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  const q = request.nextUrl.searchParams;
  const to = (q.get("to") ?? "").toUpperCase();
  const from = q.get("from")?.toUpperCase();
  const depart = q.get("depart") ?? q.get("date") ?? "";
  const ret = q.get("return") ?? undefined;

  const fallback = new URL("/deals", request.url);
  if (!isProvider(provider)) return NextResponse.redirect(fallback);

  const target = buildGoLink(provider, { from, to, depart, return: ret });
  if (!target) return NextResponse.redirect(fallback);

  return NextResponse.redirect(target);
}
