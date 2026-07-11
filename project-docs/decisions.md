# Decisions — DealRadar (append-only)

## 2026-07-11 — D15: Calendar endpoint ignores month → group client-side (task 3 verified live)
**Found on first real call:** `/v1/prices/calendar` **ignores the `depart_date` month** —
requesting Aug/Sep/Nov all returned the identical cached dataset (dates spanning ~a year,
same cheapest). The original adapter's "one call per month, label by requested month" (D11)
would have written identical prices under different month labels — garbage.
**Fix:** ONE call per route, then bucket the returned per-date fares by `YYYY-MM` and keep
the min per month. Accurate "cheapest to fly in month X" AND cheaper (1 call/route, not 3).
Tests updated to mirror real shape (single multi-month dataset → grouped).
**Verified end-to-end (2026-07-11):** real token + Neon → 10/10 routes, **23 snapshots**,
0 errors, months 07/08/09; prices sane and genuinely differ per month. First real history
row — the ≥14-day verdict clock starts today (2026-07-11); usable ~2026-07-25.
**Caveat (D10 reminder):** data is Travelpayouts' cache — updates when users search the
route, so daily snapshots for quiet routes may be flat until someone searches them.

## 2026-07-10 — D14: Repo made PUBLIC to unblock Vercel Hobby deploys
**Problem:** After the task-2 import build, every git-pushed commit deployed as **"Blocked"**
on Vercel — "commit author did not have contributing access… Hobby Plan does not support
collaboration for private repositories." Commit author is `tofutrade1@gmail.com`; the repo
is GitHub `limjane` connected to Vercel — Vercel treated the author as an outside
collaborator on a *private* repo and refused to build (so production stayed pinned to the
old placeholder commit `523ed9f`).
**Fix:** Made `limjane/dealradar` **public**. Vercel Hobby's collaborator restriction only
applies to private repos; public repos build any commit — free, no Pro upgrade. Verified no
secrets in tracked files first (`.env` gitignored; only a fake `ci:ci@localhost` CI cred).
**Tradeoff:** source is now publicly visible (acceptable — MVP moat is data/execution, no
secrets). Can revert to private later if we ever move to Vercel Pro.
**Domain:** faresteal.com (D13) now registered at Porkbun + wired to Vercel — apex A
216.198.79.1, `www` CNAME cname.vercel-dns.com, SSL issued, apex→www 307. DNS verified live.

## 2026-07-10 — D13: Product name + domain = FareSteal / faresteal.com
**Decision:** Product name is **FareSteal**, domain **faresteal.com** (verified available;
being registered at **Porkbun**, ~US$11/yr, domain only — no web/email hosting add-ons).
Resolves the long-open "product name + domain" item. Forced now because Travelpayouts
review requires a custom domain, not the `*.vercel.app` subdomain (see
[[dealradar-travelpayouts-approval]] / D12).
**Why this name:** ties to the hero line "actually a steal?"; clean `.com`; descriptive of
the deal wedge; spellable (unlike fairtail/farebird homophones we rejected). "DealRadar"
was taken on `.com` and stays only as the internal repo/placeholder name for now.
**Mascot:** "Radar" the swift can keep its name (it's a character name, independent of the
brand) — revisit if we want it to echo "FareSteal".
**Email:** deferred — will use free forwarding or Zoho free tier when a branded address is
wanted; not needed for launch or review.
**Next:** register → add domain in Vercel → set Porkbun DNS → turn off Vercel bot-challenge
→ resubmit Travelpayouts. Rename in code/UI (DealRadar→FareSteal) is a later cosmetic pass.

## 2026-07-10 — D12: Landing page brought live early (task 5 slice) to unblock affiliate review
**Trigger:** Travelpayouts rejected the project — 25 programs incl. Trip.com locked because
the live site was the "scaffold v0 — Launching soon" placeholder (read as "under
construction"). The API token side is NOT gated on this; the affiliate/marker side is.
**What:** Ported section 1 of the signed-off v2 design (hero + search card + destination
chips + trust bar) as the real Next.js homepage, plus a how-it-works section, a deals
showcase (reusing the signed-off deal-card design), and a footer with an affiliate-commission
disclosure. Replaces the placeholder `page.tsx`.
**Choices:** (a) `next/font` self-hosts Plus Jakarta Sans → meets the Lighthouse≥95 perf
gate (D7) AND stays within the 'self'-only CSP (no Google CDN). (b) Mascot uses the clean
"scout" pose (blinks), deliberately NOT the flying pose (open eye bug) — sidesteps it.
(c) Search is **presentational** — wiring live search is still task 5. (d) Showcase fares
are illustrative; footer says so (honesty + FTC-style disclosure).
**Verified:** web typecheck + lint clean; `next build` green with `/` prerendered static
(102 kB First Load JS). Live-URL check pending Vercel redeploy.
**Not done:** functional search, live deals, `/go` affiliate redirect — remain task 4/5.

## 2026-07-10 — D11: Task 3 build choices (poll granularity + HTTP client)
Small choices made building the poller (under D10's frame):
- **Snapshot granularity = one row per route×travel-month** (the cheapest fare found in
  that month), NOT per-day. Matches the `price_snapshots.travel_month` schema and the deals
  wedge ("cheapest to fly this month"). The calendar endpoint returns per-day; the adapter
  takes the monthly min. Per-day would need a schema change — deferred unless the verdict
  engine (task 4) needs finer signal.
- **One-way fares** (`one_way=true`): a clean, consistent per-month minimum without
  return-date combinatorics. Round-trip baselines can be added later if the UX needs them.
- **Poll window = current month + next 2** (`MONTHS_AHEAD=3`) → 10 routes × 3 = 30 calls/day,
  far under the 10 req/s limit.
- **HTTP client = httpx** (added to worker deps): real timeouts + `MockTransport` for
  network-free adapter tests. First non-stdlib runtime dep in the worker.
- **Per-route failure isolation:** one route erroring is logged + skipped, run continues.
Status: code-complete, unit-tested (8 tests), DB write path verified against Neon (10
routes seeded). Live Travelpayouts call unverified until a token exists.

## 2026-07-10 — D10: Price source pivot — Amadeus → Travelpayouts Data API (forced)
**Trigger:** Amadeus **Self-Service portal is being decommissioned on 2026-07-17** (found
while registering — 7 days' notice). D2/foundation §2 assumed Amadeus Self-Service as the
flight-price source; that assumption is dead. (Amadeus *Enterprise* survives but is
contract-based/heavyweight — wrong tier for this MVP.)
**Decision:** Make **Travelpayouts Data API** (Aviasales) the primary `PriceSource`. This
is the swap foundation §2 explicitly anticipated ("swapping Amadeus→Travelpayouts must
touch only the adapter"). Consolidates two dependencies into one: Travelpayouts is *already*
our affiliate network (D1), so one account/token now covers **both** price data and
affiliate deep links — one less provider, key, and quota to manage.
**Endpoint fit (verified 2026-07-10):** `GET /v1/prices/calendar` returns cheapest
non-stop/1-stop/2-stop fare per day for a route+month (one-way or round-trip). Token via
`X-Access-Token` header; 10 req/s; data cached 7 days server-side. Maps cleanly to the
snapshot poller (one row per route×travel-month×day) and the verdict engine.
**Known tradeoff (accepted):** Travelpayouts data is **aggregated/cached** (reflects what
other users recently searched), not a fresh live per-query quote like Amadeus. For a
price-*history*/deals engine this is fine — verdicts run on trend/median, not on quoting a
bookable seat. Live per-itinerary quoting (D5 phase-2 item) will still need a booking-grade
source later; revisit then.
**Separate from TravelHub:** DealRadar registers its **own** Travelpayouts account/token
(kept isolated per the two-projects-separate rule). TravelHub hit the same Amadeus
decommission but has different needs (hotels + live itinerary) — its provider is being
re-decided independently; see TravelHub decisions.md 2026-07-10.
**Env change:** `AMADEUS_CLIENT_ID/SECRET/ENV` → `TRAVELPAYOUTS_TOKEN` (+ `TRAVELPAYOUTS_MARKER`
for affiliate links, lands with task 5). `.env.example`, `.env`, and `render.yaml` updated.
**Task 3 reworked** around this endpoint (see current_state.md).

## 2026-07-08 — D9: Scaffold implementation choices (task 2 DONE)
User directive for the scaffold: "robust and scalable." Decisions within D3's frame:
- **Monorepo** (`apps/web` + `worker/` in one repo) over two repos: shared DB schema
  can't drift — schema.ts + worker/models.py change in one commit. Vercel (Root Dir
  `apps/web`) and Render (`rootDir: worker` in render.yaml) both deploy subdirs natively.
- **pnpm 9 workspace** (pinned via `packageManager`), lockfile committed. Node ≥20.
- **Neon serverless HTTP driver** for web (fits Vercel serverless); worker uses plain
  psycopg3 over postgres://. Same DB, two idiomatic clients.
- **Versions**: Next 15.5.20 (15.1.x deprecated on registry — security), React 19,
  Tailwind v4, drizzle-orm 0.38/kit 0.30, Python 3.12 + uv + ruff + pydantic v2.
- **`eslint .` instead of `next lint`** (deprecated, removed in Next 16). Flat config.
- **CSP ships day one but with 'unsafe-inline'** (Next/Tailwind inline bootstrap);
  tighten to nonce-based CSP in task 9 (launch pass). All other §4.6 headers final.
- **Deliberately NOT added** (anti-overbuild, per §3): no queue/Redis, no Docker, no
  turborepo (2 packages don't need it), no shadcn/ui yet (lands with real UI, task 5).
Verified locally: typecheck/lint/build green (web), ruff/format/pytest green (worker),
placeholder page + all 6 security headers + zero console errors in browser preview.
Deploys NOT yet live — needs user's GitHub/Vercel/Render/Neon accounts (see
current_state.md handoff).

## 2026-07-08 — D7 + D8 SIGNED OFF: v2 design + mascot
User signed off `mockups/v2-fun-travel.html` — fun/premium travel look (D7) and "Radar"
the swift mascot incl. flight-and-perch hero routine, idle movements, four verdict-state
poses (D8). Signed off with one known open bug: flying pose's eye pupil not visible
(being fixed in a separate Sonnet session — see current_state.md). v2 supersedes v1 as
the build reference for all UI work. Perf gate unchanged: CSS/SVG-only animation, one
self-hosted font, Lighthouse ≥95; Rive adoption deferred to launch-polish phase.
Build is green-lit: next task = #2 scaffold (foundation.md §7).

## 2026-07-08 — D8 (PROPOSED, needs sign-off): Brand mascot "Radar" the swift
User found the hero plane + dotted path artificial and asked for an animatable brand
character. Designed "Radar": chubby coral swift w/ radar goggles, pure inline SVG
(one shared base rig `#bird-base` + per-pose eye overlays), four moods mapped to verdict
states — scout/default (blinks), deal-spotted (goggle radar-ping + star eye), price-high
(unimpressed side-eye), no-data (asleep + zzz). Replaces plane in hero (flies a smooth
path w/ puff trail, wing/tail flap via SMIL). Zero plugins/deps at MVP; recommended
upgrade path when interactive/clip animation is wanted: Rive (state machines, ~small
runtime) or Lottie for pre-rendered clips — decide post-MVP, artwork ports 1:1.
Mascot sheet added as mockup section 5 in v2-fun-travel.html. Name "Radar" tentative
pending product naming (still open).

## 2026-07-08 — D7 (PROPOSED, needs sign-off): Design direction pivot → fun/premium travel look
User asked to make the site visually appealing to young/mid-age travellers — "fun / travel
look… like a 30K website" — superseding v1's plain utility styling. Built
`mockups/v2-fun-travel.html`: same signed-off structure (search-first, verdict badges,
flights list, route page, feed, email) restyled Hopper/Airbnb-style — sunset-gradient hero
w/ flight path, glass search card, destination emoji tiles, gradient CTAs, Plus Jakarta Sans.
Perf gate kept: all CSS/SVG (zero image files), ONE self-hosted variable font in prod;
Lighthouse ≥95 still binding (amends foundation.md §6 "system fonts" line).
Awaiting user sign-off on v2 before scaffold/UI code.

## 2026-07-08 — D6: Mockup v1 SIGNED OFF; D3 stack SIGNED OFF
User approved all surfaces of `mockups/v1-search-verdict.html` as-is ("yes please build")
— home/search, results (verdict card + all 4 badge states + specific-flights list 2b),
route page, deals feed, alert email. Same message green-lit the build, taken as sign-off
on the D3 stack proposal (Next.js/Vercel + Python worker/Render + Neon Postgres + Resend).
Build phase begins at task 2 (scaffold), one task per fresh session.

## 2026-07-08 — D1: Revenue model = affiliate link-out
User chose affiliate over OTA/hybrid. No payments, no PCI, revenue from launch via
commission on click-outs (Travelpayouts et al).

## 2026-07-08 — D2: Wedge = flight deals & price-drop engine; 4–6 week MVP
User chose deals wedge over regional-specialist / hotels-only / broad clone, and the
4–6 week MVP timeline. Flights only at MVP; hotels deferred to phase 2.
Complementary to TravelHub (shared price-snapshot dataset, Amadeus account, ops stack)
but a separate product and repo.

## 2026-07-08 — D4: Pivot to search-first hybrid; flights only at MVP
User challenged feed-first design wanting live "grab the best deal when they search."
Resolved: search is the core UX (live cached prices + verdict badge from price history);
deals feed + alerts become secondary/retention surfaces. Every live search result is also
written to price_snapshots (traffic feeds the data flywheel). Verticals: flights only at
MVP; hotels phase 2; cars phase 3 or never (low commission/volume). Same project/folder —
rescoped in place, foundation.md updated.

## 2026-07-08 — D5: Specific-flights list in MVP search results
User asked for Skyscanner-style specific-flight search. Added to MVP: results show a
flights list (airline, flight no., times, stops; direct-only filter; price/duration sort)
under the route-level verdict card, each flight deep-linking out at its quoted total price.
Per-itinerary cross-provider price comparison deferred to phase 2 (needs Travelpayouts
data API; affiliate APIs can't reliably match identical itineraries at MVP).
Mockup 2b added to v1-search-verdict.html.

## 2026-07-08 — D3 (PROPOSED, needs sign-off): Stack
Next.js 15 on Vercel (site + API) + Python background worker on Render (polling/scoring/
alerts) + Neon Postgres shared by both + Resend for email. Rationale in foundation.md §3.
Alternative considered: full FastAPI backend mirroring TravelHub — rejected as heavier
than needed (no user accounts, mostly static pages).
