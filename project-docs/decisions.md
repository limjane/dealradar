# Decisions — DealRadar (append-only)

## 2026-08-01 — D34: Month-rollover verdict bug — score the cheapest month *with history*
The bug D33 found and flagged: `getRouteStats().cheapest` / `db.cheapest_current_snapshot()`
both pick a route's lowest-priced tracked month. When the rolling poll window admits a
brand-new travel month it has 1 snapshot -> 0-day span -> `computeVerdict` correctly returns
`nodata` — and because a further-out month is often the cheapest, the whole route's verdict
vanishes even with weeks of history on its other months. Confirmed on real prod data today:
BKK and DPS were showing NO VERDICT YET off a single 2026-10 snapshot while 2026-08/09 each
had 21 days of history.

**Fix (one commit, both mirrors):** a new pure selector — `selectVerdictMonth` in
`apps/web/lib/verdict.ts`, `select_verdict_month` in `worker/verdict.py` — picks the
**cheapest month that has enough history** (>=1 row and >= `MIN_HISTORY_DAYS` span), falling
back to the cheapest month overall only when none qualifies, so a genuinely new route still
scores `nodata` honestly. Month choice is now a scoring decision in the pure, tested layer
rather than an implicit consequence of a SQL `ORDER BY price LIMIT 1`.

**Display (signed off by user):** the badge names the scored month **only when it differs
from the month that page shows as its headline** — e.g. `/deals` BKK card reads "Cheapest in
Oct 2026 · S$202" with a "👌 FAIR PRICE · Aug 2026" badge. A verdict is a claim about one
specific fare, so where the two diverge it has to say which; where they agree the badge is
unchanged from before. Rejected: leaving the badge unlabelled (silently describes a different
fare than the price shown), and hiding immature months from the headline until they mature
(hides a genuinely cheap new month's fare for two weeks — the product's whole point).

**Query shape changed with it.** Web: `getVerdict(dest, month, price)` -> `getRouteVerdicts(destFilter?)`
returning a `dest -> {travelMonth, price, verdict}` map from 2 queries; `/deals` went from 15
queries (1 + one per route) to 2. Worker: `cheapest_current_snapshot` -> `month_candidates`
(all months, not just the cheapest) and `month_price_history` -> `month_histories` (all of a
route's months in one query).

**Verified:** worker `pytest` 18 (was 13 — 5 new selector cases incl. the exact BKK/DPS
scenario), `ruff check`/`format` green; web `pnpm test` 27 (new `lib/verdict.test.ts` mirrors
the worker cases one-for-one), `tsc`/`eslint`/`next build` green (32 pages, 14 SSG paths).
Ran the old-vs-new selection against production Neon: **BKK nodata -> fair (2026-08, S$247)
and DPS nodata -> fair (2026-09, S$223)** recovered; the 10 other routes unchanged, including
the 4 D31 routes and PER, which correctly stay `nodata`. Live in local dev: `/deals` shows the
two month-labelled badges and 8 unlabelled ones, `/flights/sin-bkk` badge reads "FAIR PRICE ·
Aug 2026" with the FAQ sentence quoting the same S$247/Aug figures, no console or server errors.
**Not yet verified on prod** (uncommitted at time of writing) — and the Render `score` cron
hasn't run against the new code either.

## 2026-08-01 — D33: Data-backed SEO copy on /flights/[route] — gated claims, within-month day-of-week, honest freshness
The 4 evergreen blog posts won't rank; the real SEO asset is the price DB itself (noted in
the social-post session). Built `apps/web/lib/route-copy.ts` — pure, no DB, no `now()` — that
turns the fare rows the route page ALREADY fetches into prose, a crawlable month table, FAQ
copy, and the meta description. Zero new queries (one extra column on the existing
fare_calendar select). Three judgment calls, all put to the user and signed off:

**1. Every claim is sample-size gated (`COPY_GATES`).** Thin routes drop claims rather than
publish a confident number backed by two data points — same discipline as the social-post
guardrails. Gates: price-spread needs 8 dates; naming a cheapest/priciest month needs 3
months that each have >= 2 dates (so one lucky date can't christen a month); midweek needs 2
qualifying months and a >= 5% gap. Verified live: SIN–FCO (1 date) prints only "route was
added recently" + a 1-row table + 2 FAQs, no spread, no month comparison, no lead time.

**2. Midweek vs weekend is computed WITHIN each month, then averaged.** The obvious
implementation — raw weekday vs weekend medians across the whole calendar — reports a
SEASONAL effect as a day-of-week one, because a route's weekend dates can cluster in its
expensive months. Measured on real data: SIN–TPE showed a fake **+32% weekend premium** that
collapses to **+2%** once month is controlled for (and is then correctly suppressed by the 5%
gate). Rejected alternatives: drop the claim entirely (loses a high-volume query), or ship
the raw gap (publishes a wrong causal claim on a page whose whole pitch is honest data).
Under the stricter method only BKK +10%, HKG +12%, NRT +13%, SYD +5% qualify today.

**3. Stale routes stop claiming "updated daily".** Any route whose newest fare row is >= 3
days old swaps the label for "last updated <date>", shows a banner, and drops the "N days
out" lead-time sentence (a claim about *today's* board). Generic rule, so it self-heals when
a route recovers — currently only SIN–PER (D32's provider cache gap), confirmed rendering
live. Rejected: suppressing all generated copy on stale routes (leaves sin-per a thin page).

**Also decided:** the "how far in advance should I book" FAQ was CUT — its honest answer is
"we don't know yet", which is dead weight in a FAQPage schema. Re-add when there's
booking-window history to answer it from.

**SEO scaffolding shipped alongside:** JSON-LD `FAQPage` (verified byte-identical to the
visible Q&As — mismatched schema gets penalised), a crawlable cheapest-fare-by-month table
(previously every price except the headline lived only inside an SVG, so crawlers saw almost
no numbers), live meta descriptions ("from S$202 one-way (October 2026)" instead of a static
blurb), and H2s phrased as real search queries. Hand-written `blurb`/`tips` in
`routes-meta.ts` are kept as secondary colour under the generated copy, not replaced.

**Testing:** no test runner existed in `apps/web`. Rather than add a framework dependency for
one module, used Node's built-in runner with native TS type-stripping — `pnpm test`, 21 tests,
zero new deps (needed `allowImportingTsExtensions` in tsconfig). Worth revisiting if the web
side ever needs component tests; Node's runner won't cover those.

**Found but NOT fixed (out of scope, flagged as its own task):** verdicts silently vanish at
each month rollover. `getRouteStats().cheapest` picks the lowest-priced month; when the
worker's rolling window admits a brand-new month it has 1 snapshot -> 0-day span -> `nodata`.
On 2026-08-01 this took verdicts off BKK, DPS and HKG (3 of 10 mature routes) even though all
three have 21 days of usable history on other months. Same class as the bug D26 fixed once —
that fix decoupled from fare_calendar but kept "cheapest month" as the selector. Affects
/deals identically, and worker/score.py picks its month the same way.

## 2026-08-01 — D32: SIN-PER staleness — wait it out, no code change
Root cause (established last session, D31 section of current_state.md): Travelpayouts'
calendar endpoint serves their own server-side cache, which "updates when users search the
route" — SIN-PER's cache has thinned to near-nothing on their end since 2026-07-24, not a
bug in `poll.py` (0 errors logged, `raise_for_status`/`success` checks never fired). Asked
user: wait it out vs. drop the route. **User chose wait it out.** No code changes made.
Consequence stands: SIN-PER can't accrue the 14-day verdict history while the provider
cache stays empty — may sit at "NO VERDICT YET" indefinitely. Revisit only if it's still
stale after search volume on that route would plausibly have picked back up, or if the
user wants to drop it later (removal = `worker/seed_routes.py` + `apps/web/lib/routes-meta.ts`
+ clean up any stale `deals` row).

## 2026-08-01 — D31: D28 seed routes built — SIN–CGK/DXB/CDG/FCO live
Built the "immediate" bucket from D28: 4 new SIN-outbound routes added to
`worker/seed_routes.py` (CGK/DXB/CDG/FCO, seed_priority 65/45/35/30 slotted by rough
haul-length/volume, same list shape as the existing 10) and `apps/web/lib/routes-meta.ts`'s
`DESTINATIONS` (editorial copy: blurb + seasonal tips, gradient, emoji — same pattern as the
existing 10). No architecture change — both files are the same data-driven shape the existing
routes use, so `/deals`, `/flights/[route]`, `/search`, and `sitemap.ts` all picked the 4 up
for free via `ROUTE_SLUGS`/`generateStaticParams`.
Seeded live against production Neon (`routes` table, idempotent `ON CONFLICT DO NOTHING`) —
14 active routes total. Ran a real poll (`poll.py`) immediately after seeding so the new
routes have data now instead of waiting for tonight's 21:00 UTC cron: 14/14 routes polled,
0 errors, 35 snapshots + 292 fare_calendar days written.
**Verified:** worker `pytest`/`ruff check`/`ruff format --check` green (13 tests, unchanged —
no new worker logic, just data); web `tsc --noEmit`/`eslint`/`next build` all green (32 pages,
up from 28; `/flights/[route]` now shows 14 SSG paths). Live in local dev (after clearing the
recurring OneDrive `.next` corruption — see ENVIRONMENT note): all 4 new route pages
(`/flights/sin-cgk`, `-dxb`, `-cdg`, `-fco`) render with real prices and correct editorial
copy, no console errors; `/deals` lists all 14 routes sorted by price including the 4 new
ones. All 4 correctly show "NO VERDICT YET" (expected — brand-new routes, no 14-day history
yet, same gate D26 task 4 already enforces).

## 2026-08-01 — D30: Geo-IP default origin built (D27 block A) — corrected which "SIN" constant, chose dynamic rendering
Built the geo-IP default described in D27 block A, with two corrections found during
implementation:
**Wrong constant identified in D27/state-doc:** the hardcoded default the visitor actually
sees is `DEFAULT_FROM` in `components/flight-search-form.tsx` (a client-component constant,
`{code:"SIN",...}`), NOT `routes-meta.ts`'s `ORIGIN`. `ORIGIN` there drives SEO route-slug
generation (`routeSlug`/`ROUTE_SLUGS`/`destBySlug`, e.g. `/flights/sin-bkk`) computed once at
module/build time — making it request-dynamic would break static params. Left `ORIGIN` alone;
fixed `DEFAULT_FROM` via a new `initialFrom` prop on `FlightSearchForm` (mirrors the existing
`initialTo` pattern).
**Rendering trade-off surfaced + user chose "go dynamic":** reading `next/headers` in a
Server Component makes that route request-dynamic (opts out of static/ISR). Home (`/`) and
`/search` both now render dynamically (confirmed in `next build` output: `ƒ` not `○`/`●`);
`/deals` and `/flights/[route]` don't use the form and stay static, unaffected. Chosen over
keeping both pages static with a client-side round-trip fetch, since traffic is low and the
extra round-trip would add a visible flash-of-SIN — standard Vercel pattern for
geo-personalization, SEO unaffected (still SSR'd/crawlable).
**New file `lib/geo-origin.ts`:** `COUNTRY_ORIGIN` lookup table covering the countries our
existing SIN-outbound `DESTINATIONS` serve (TH/MY/ID/PH/HK/TW/KR/JP/AU/GB) + SG itself;
`originForCountry()` falls back to SIN for unmapped/missing country. Not tied to "hub"
existence — the search form is worldwide/freeform since D23, so any visitor gets their own
city as a default even though BKK/KUL/PEN aren't tracked hubs yet (that's D29 block B).
**Verified:** `tsc --noEmit`/`eslint`/`next build` all green (28 pages). Live in local dev:
no header → "Singapore (SIN)" (unchanged fallback behavior, no regression); `curl -H
"x-vercel-ip-country: TH"` → "Bangkok (BKK)"; `GB` → "London (LHR)"; unmapped `ZZ` → SIN
fallback. No console errors. Real Vercel geo-header behavior only observable on an actual
Vercel deployment (this session verified the logic, not the live header on faresteal.com).

## 2026-08-01 — D29: Regional multi-hub expansion — 3 new origin hubs researched (Bangkok, KL, Penang); Jakarta/Manila dropped
Amends D27/D28. User asked to go further than pre-seeding SIN-outbound routes: make Bangkok,
Kuala Lumpur, Jakarta, Manila (and, confirmed after an initial caution, Penang) their own
tracked **origin hubs** — each getting its own destination list, the same way Singapore does
today. This is the concrete form of D27 block B's "origin-aware pages" requirement, scoped
across multiple cities instead of one.
**Researched via web search** (sources in chat, not re-quoted here — grep chat history if
needed): route-level ranking data is freely available for Bangkok (aviationa2z.com published
a ranked top-10 with flight/seat counts, Jan 2026) but NOT for Jakarta or Manila — that
appears to be paid OAG/Cirium territory. KL and Penang landed in between: real destinations
confirmed, but unranked beyond the top 1–2.
**User decision: drop Jakarta and Manila as origin hubs** rather than seed them with
guessed/padded lists. (Jakarta and Manila remain reachable as SIN-outbound destinations
already — SIN–CGK is in D28's immediate list — this only drops them as *their own* hub.)
**Final hub destination lists (unranked ones ordered by mention-frequency, not confirmed
volume — flag this if it ever surfaces in UI copy claiming "cheapest"):**
- **Bangkok (ranked, high confidence):** KUL, SIN, HKG, TPE, ICN, PVG(Shanghai),
  NRT/HND(Tokyo), CAN(Guangzhou), RGN(Yangon), SGN(HCMC) — 10 routes.
- **Kuala Lumpur (unranked, medium confidence):** SIN, CGK(Jakarta), BKK, HKG, TPE,
  ICN(Seoul), DPS(Bali), SGN(HCMC), PNH(Phnom Penh) — 9 routes. Note KUL→SIN reintroduces
  the exact "fares too flat to ever verdict" characteristic D28 used to exclude SIN→KUL —
  keeping it anyway since KL residents still need a Singapore option on their own hub page;
  just don't expect GRAB verdicts on it.
- **Penang (unranked, medium confidence):** KUL, SIN, BKK, HKG, TPE, CGK(Jakarta), SGN(HCMC),
  CAN(Guangzhou), PVG(Shanghai), SZX(Shenzhen), XMN(Xiamen), DXB, HKT(Phuket), DOH, MAA(Chennai)
  — 15 routes.
**Net new routes if all 3 hubs are built: 34** (10+9+15), on top of D28's 14 SIN routes
(10 existing + 4 new) = **48 routes total** in the fully-expanded scope. Directional schema
means e.g. KUL→SIN is a separate row from SIN→BKK even where cities overlap — expected, not
a bug.
**Supersedes part of D28's "6 queued foreign-pair routes" list:** BKK-HKG is now covered by
Bangkok's own hub list (drop the duplicate). HKG-TPE, ICN-NRT, ICN-KIX, NRT-TPE, JFK-LHR
remain queued as lower-priority standalone additions (none of those 5 cities became hubs
themselves) — keep them at the bottom of the backlog, not blocking.
**Not yet checked:** Travelpayouts API quota headroom at 48 routes × 3 forward months
(~144 monthly-price calls/day) — was "fine, free, 10 req/s" at 10 routes (D17); worth a
quick confirm before block B's build session actually runs the poller against this list.
**No code changed this session** — scoping/research only, same as D27/D28. Still blocked on
block A (geo-IP + origin-aware `/deals`/`/flights/[route]`) before ANY of this is visible on
a real page — the research is done early, but the build order in current_state.md is
unchanged.

## 2026-08-01 — D28: Pre-seed route list researched + finalized (busiest + most-searched)
Amends D27 block B. User wanted popular routes pre-seeded rather than waiting entirely on
the N-search flywheel. Researched two data sources (web search, sources in chat):
**Busiest-by-volume** (OAG 2025 international rankings, cross-checked against 2 independent
sources): top 10 = HKG-TPE, CAI-JED, KUL-SIN, ICN-NRT, ICN-KIX, CGK-SIN, DXB-RUH, BKK-HKG,
NRT-TPE, JFK-LHR. Trimmed 3: CAI-JED + DXB-RUH skew religious/labor travel (Hajj/Umrah,
migrant labor), not leisure deal-seeking; KUL-SIN's fares are too flat/cheap to ever clear a
GRAB verdict threshold.
**Most-searched-by-demand** (Google Flights 2025 top-10 Googled destinations; Delta's
US-origin most-searched, cross-validating Dubai + Paris/London): destination-only data, no
origin attached, so it can't become a route pair without guessing an origin — unlike the OAG
data. Applied it instead as new SIN-outbound destinations (fits today's single-origin
architecture, zero rework): added CDG (Paris), FCO (Rome), DXB (Dubai, appears in both
datasets — strongest signal). Skipped the more exotic Google-list entries (Bilbao, Ibiza,
Kraków, Málaga, etc.) — geographically odd/low-realism asks ex-Singapore.
**Reclassification:** CGK-SIN (Jakarta) has Singapore on one side, so — despite coming from
the OAG "foreign pair" list — it doesn't need block B's origin-aware pages at all. Moved to
the immediate bucket.
**Final scope:**
- **Immediate (SIN-outbound extension — same pattern as the existing 10 seed routes, no
  architecture change, can ship standalone or bundled with block A):** SIN–CDG, SIN–FCO,
  SIN–DXB, SIN–CGK.
- **Queued for block B (need geo-IP origin + origin-aware `/deals`/`/flights/[route]` before
  these can render on any page):** HKG-TPE, ICN-NRT, ICN-KIX, BKK-HKG, NRT-TPE, JFK-LHR.
No code changed this session — scoping/research only, same as D27.

## 2026-08-01 — D27: Worldwide expansion split into two sessions; flywheel trigger = after N searches
User asked "are you able to grab deals from not just Singapore" — this is D17/D19.1's
worldwide-search + geo-IP-default-origin directive, not yet built. Scoped before building
(per standing rule): confirmed via code read that the `routes` table is already
origin-agnostic (free-text IATA pair, unique-indexed, no migration needed to add a route —
schema.ts) and `worker/db.py:active_routes()` already just reads `WHERE active = true` — the
poller has no hardcoded route list beyond the one-time seed script. Split into two
building blocks, sequenced:
**A) Geo-IP default origin (next session, small):** search form's "From" field already has
full autocomplete + is user-editable (`flight-search-form.tsx`) — manual override already
exists. Only fix: default it from Vercel's free `x-vercel-ip-country` header (→ hub-airport
lookup table) instead of the hardcoded `SIN` in `routes-meta.ts`'s `ORIGIN` constant.
**B) Flywheel — auto-track searched routes (later session, bigger):** trigger decided —
**add a route to daily polling only after it's been searched/clicked N times** (not on first
search), to keep the `routes` table and Travelpayouts API quota from filling with one-off
noise. Exact N not locked yet (starting reference: ~3 in a rolling window) — finalize when
scoping B's build. Still open for that session: (1) where the search-count gets logged (new
table vs. reuse `search_cache`), (2) generic content template for auto-added routes (the 10
seed routes have hand-written editorial copy per page; flywheel routes won't), (3) making
`/deals`/`/flights/[route]` origin-aware instead of assuming `SIN` (headline copy + route
resolution both currently hardcode it).
**Not touched this session** — no code changed, scoping only.

## 2026-08-01 — D26: Task 4 scoring v1 — one active deal per route (schema-driven), publish only GRAB
`deals` table (schema.ts) has `route_id` but no per-travel-month column, unlike
`price_snapshots`/`fare_calendar`. Rather than add a migration this session (out of scope for
"score against existing data"), v1 keeps **one active deal per route** — whichever tracked
month is currently cheapest — matching foundation §3's "keep dumb, tune later" v1 posture.
Only GRAB-level verdicts (≥15% below that route+month's own 60-day median, ≥14 days history)
get written to `deals`; FAIR/HIGH are computed live for display but not persisted — `deals`
stays reserved for actual bargains (feeds task 7's deals-feed page + task 8's alerts later).
**Verdict formula lives in two places on purpose** (same pattern as poll.py/lib/deals.ts
already independently reimplementing "latest snapshot per route+month"): `worker/verdict.py`
is canonical + pytest-covered (foundation's must-test item); `apps/web/lib/verdict.ts` is a
thin TS mirror so /deals can show a verdict for every route, not just the ones that clear the
publish bar. Change the formula in one, change the other in the same commit.
**No 48h-unrefreshed expiry in v1:** foundation says expire "on rebound >10% or after 48h
unrefreshed," but `deals` has no last-refreshed column (only `first_seen`/`expires_at`) and
score.py runs daily right after poll — a stale-cron scenario is an ops/liveness concern, not
a per-row scoring one. Rebound-expiry is implemented (verdict drops below GRAB → expire);
the 48h timer is deliberately deferred rather than bolted on with a field the schema doesn't
have. Revisit if/when alerts (task 8) need it.
**Bug found + fixed during verification:** the route page's headline "cheapest tracked" price
comes from `fare_calendar` (unrestricted date range) while the verdict is scored off
`price_snapshots` (3-month rolling window) — scoring whatever month the headline day happened
to fall in could pick a month with too little snapshot history and show a misleading
NO_VERDICT next to a perfectly fine FAIR-priced fare. Fixed: route-page verdict always scores
`getRouteStats`' price_snapshots-sourced cheapest month, independent of the fare_calendar
headline day.
**Verified against real prod data** (not fixtures): ran `score.py` against live Neon —
10/10 routes, 0 errors, 9 FAIR + 1 NO VERDICT (Perth, 12-day span), 0 GRAB — hand-checked
every route's discount_pct to confirm the 0-GRAB result is correct (real fares just haven't
dropped 15%+ yet), not a silent scoring bug. Live-checked badges on a local dev server
(`/deals`, `/flights/sin-bkk`, `/flights/sin-per`) — content matches the CLI diagnostic
exactly, no console errors. Committed `65337b8`, pushed to `origin/main` — see
current_state.md for the prod-verification follow-up.

## 2026-08-01 — D25: Swap hand-rolled calendar for react-day-picker
User called the custom calendar "broken and ugly" (round 1: autocomplete-scare turned out
environment-specific — Chrome extension hydration mismatch / stale OneDrive `.next` cache,
not code). Round 2: user said it was still "ugly and unprofessional." **Decided:** replace
the custom-built calendar in `flight-search-form.tsx` with `react-day-picker` (new dep),
themed to the site's coral/ink palette (Aviasales-style single-month, minimal chrome), rather
than keep patching the hand-rolled version. Root cause of the misalignment: day *cells* were
sized 38px via `--rdp-day-height/width` but day *buttons* were left at the library's default
42-44px, overflowing their cells — fixed by matching both to 38px. Also removed the default
2px selected-border (redundant with coral fill), reset "selected = bigger+bold" back to
normal size, switched to `navLayout="around"` (centered month label, flanking chevrons — was
overlapping top-right), softened popover shadow/radius. **Real functional bug found in
review and fixed:** `month` prop was fully controlled (`isoToDate(selected ?? min)`) with no
`onMonthChange`, so the nav arrows silently did nothing — changed to `defaultMonth`
(uncontrolled) so navigation actually updates.
**Verified:** local `next build` (lint+types+28 routes) green; user eyeballed on local dev
server and signed off. Committed `f689358`, pushed, deployed. Live-on-prod check
(faresteal.com/search): page loads clean (no console errors), calendar renders with
`navLayout="around"` centered label, clicked "Next month" → August 2026 → September 2026
confirmed working on the live site (not just dev).

## 2026-07-12 — D24: Blend the two Aviasales handoff journeys (keep split, unify the seams)
User flagged that "Go to deal" (→ Aviasales direct) vs nav "Search flights" (→ our D23 form)
felt inconsistent. **Decided (user: "ok let's try"):** keep the structural split — deal cards
are high-intent and go straight out (like Skyscanner); open-ended search goes through our
form — but make the handoff feel identical: (1) one shared disclosure line everywhere we send
users out (`.handoff-note`: "Opens our booking partner Aviasales — same price, we may earn a
commission"), under the form CTA, under route-page CTAs, and in the /deals footer note;
(2) CTA copy aligned to price-promise voice — "Go to deal →" → **"See this fare →"**;
(3) route pages cross-link "pick your own dates →" to `/search?to=CODE`, and /search reads
`?to=` to pre-fill the form (only codes in DESTINATIONS get a label; anything else ignored).
**Rejected:** interstitial form before deal clicks (adds a click to the highest-intent
action); nav search jumping straight to Aviasales (loses the D23 branded form).
Also fixed this session: hero `overflow: hidden` → `overflow-x: hidden` (was clipping the
form's dropdown/calendar popovers — the "no dropdown" bug); calendar restyled softer
(lighter shadow, flat coral selected state); dev-only `'unsafe-eval'` added to CSP
script-src (Next dev-mode webpack needs eval; without it the page renders but nothing is
clickable — prod unchanged).
**⚠ Recurring environment issue:** the repo lives inside OneDrive; OneDrive sync corrupted
`.next` THREE times this session (EINVAL readlink, UNKNOWN open on manifests). Workaround
each time: delete `.next`, restart dev. Durable fix (user decision pending): move the repo
out of OneDrive (e.g. C:\dev\dealradar) or stop OneDrive syncing it — note this changes the
path every skill/doc references, so do it as its own deliberate task.
## 2026-07-12 — D23 build complete: FlightSearchForm shipped, click-interactivity verification blocked by preview tool
Build (Sonnet session) matches the D23 spec below exactly: new `components/flight-search-form.tsx`
on home + /search, `lib/go-links.ts`/`/go/[provider]` extended for worldwide from/to + optional
return leg (validation relaxed from destination-whitelist to IATA-shape, since D23 destinations
are no longer limited to our 10 tracked routes), WL widget + its CSP entries removed.
**Tooling note for future sessions:** spent significant effort chasing what looked like a
hydration bug (no console logs, no fetches, no state updates on click) before proving via a
throwaway trivial counter-button test that THIS preview harness doesn't register click-driven
React interactivity at all in this environment — SSR render, build, typecheck all confirmed
fine independently. Don't re-debug this from scratch next time: if click interactivity seems
dead but SSR/build/typecheck are clean, suspect the harness first and ask the user to eyeball
it in a real browser instead of burning a session on it.

## 2026-07-12 — D23: Search UX = our own branded form → Aviasales deep-link (retire the generic WL widget)
**Decided (Opus session, user sign-off "Path A").** Two problems surfaced live: (1) the home
hero "search" form was a static decorative mockup — unacceptable, must be interactive; (2)
the Travelpayouts White Label widget on /search looks generic/off-brand, clashing with the
premium cinematic direction (D18).
**Hard constraint driving this:** rendering a full live results list *inside* our site needs
the Aviasales Flights Search API, which is GATED at ≥50k MAU (D21). So on-brand embedded
*results* are not possible yet — only the *form* can be ours.
**Chosen (Path A):** build ONE shared, on-brand `FlightSearchForm` React component and use it
on BOTH the home hero and /search:
- From/To fields = real airport autocomplete via Travelpayouts' FREE Places API
  (`https://autocomplete.travelpayouts.com/places2?term=…&locale=en&types[]=city&types[]=airport`;
  no auth, no gating; host already allowed by CSP `*.travelpayouts.com`).
- Depart/Return = real date picker, styled to brand (build our own or a light headless lib —
  no heavy UI dep that fights our CSS).
- On submit = open Aviasales results via our affiliate marker (extend the existing `/go`
  deep-link pattern to carry origin/dest/dates). Same commission as the widget; user lands on
  Aviasales for the actual results (acceptable — that's the booking step, and it's how polished
  metasearch sites work).
- **Retire the generic WL widget** (wl_id=19722) as the /search UI. Keep the WL account/marker
  for the affiliate link. Revisit an on-brand embedded results page only once the Search API
  ungates at 50k MAU (same trigger as D21 multi-partner /go).
**Rejected:** Path B (branded form feeding the embedded widget for on-site results) — keeps the
off-brand widget look at the results step, undercutting the whole point. Quick-wire (style the
widget via its Design tab) — insufficiently premium.
**Build ownership:** design locked here (Opus); mechanical build = a Sonnet session (D19
segregation). New shared component + modest CSS; strict module boundary (new `components/
flight-search-form.tsx`, not edits sprayed across pages) per D19.4.

## 2026-07-12 — D22 build complete: /search shipped, CSP opened for tpembd.com
Steps 2–4 of D22 done (Sonnet session). `apps/web/app/search/page.tsx` added (chrome +
noindex + the two WL divs + `next/script` loader). CSP in `next.config.ts` widened:
`script-src` gained `https://tpembd.com`; `connect-src`/new `frame-src` gained
`tpembd.com`, `*.travelpayouts.com`, `*.aviasales.com` (widget's own network calls aren't
documented by TP, so scoped to their known domains rather than left at `'self'`). Entry
points wired per step 3: home hero CTA + nav pill → /search, footer nav (site-wide) gains
Search, /deals subhead cross-links to /search.
**Verification finding:** on `localhost:3000/search` the widget script loads (200, no CSP
violations) but paints nothing into `#tpwl-search`/`#tpwl-tickets` — most likely TP's WL
widgets are domain-locked to the project's registered domain (faresteal.com) and silently
no-op elsewhere. This isn't a CSP or wiring bug (network trace is clean); local dev cannot
fully prove the widget works. **Open follow-up:** confirm on the live faresteal.com domain
after next deploy (user eyeballs, no curl loops — bot-challenge rule) that a real search
returns bookable results.

## 2026-07-11 — D22: /search = White Label WIDGET-type embedded on faresteal.com/search (worldwide, geo-IP default origin)
Scoped the D21 interim search option (Fable session; user signed off "Widget-type on
/search"). Travelpayouts **White Label, Widget type**: embed the WL script + two divs
(`<div id="tpwl-search">` form, `<div id="tpwl-tickets">` results) on our own page —
users get real multi-agency bookable results **without leaving faresteal.com**, monetized
under our marker. Free, ungated (no MAU floor). Rejected: Page-type WL on
search.faresteal.com (TP-hosted, CNAME→whitelabel.travelpayouts.com, up to 72h DNS —
visible hop off-site for no gain) and plain Aviasales search-form widget (results open on
Aviasales — users leave immediately).
**Worldwide + user-country default (user requirement, aligns w/ D19.1):** leave the
widget's default departure city EMPTY → origin auto-detects from user IP; destinations
worldwide. No geo code on our side.
**Facts:** design customization = colors/font/border-radius/logo via TP dashboard (HEX) —
approximates FareSteal look, won't pixel-match; rev share sources conflict (30% vs "up to
70%") — read the real % off the dashboard, doesn't change the choice; domain must not
contain travel brand names (faresteal.com fine).
**Build scope (Sonnet session, one task):**
1. USER (dashboard): Tools → White Label (Widget type) on the DealRadar TP project → main
   lang EN + currency (add more later) → set FareSteal colors → copy widget + results codes.
   If the WL tool turns out to be gated on project approval, this blocks on the pending
   resubmission (already a user action).
2. BUILD `apps/web` `/search`: client component that injects the WL script post-hydration
   with the two divs; page chrome (nav/footer/OG) matching site; `noindex` on /search
   (TP results content, not ours to index).
3. WIRE entry points: home search CTA → /search (closes the D16 "functional search inputs"
   polish item), nav + footer links, /deals cross-link.
4. VERIFY on local dev server (widget renders, a search returns results); live check =
   ONE delayed request or user eyeballs (no curl loops — bot challenge).
**Relation to Group B:** this is the interim search. Group B native search (Aviasales
Search API, autocomplete, our own UI) still revisits at ≥50k MAU per D21.
Sources: TP help 26857907357458 (widget-type setup), 203955753 (WL overview),
8505942823954 (search form IP geo-detect), 16436383582226 (WL setup guide).

## 2026-07-11 — D21: multi-partner /go routing BLOCKED on Search API gate — shelved to post-launch
Researched the D20 backlog item (route /go to the actual cheapest vendor). The real
mechanism is the **Aviasales Flights Search API** (real-time): one search returns
`proposals[]`, each from a different booking agency (`gate_id` — Trip.com, Kiwi, etc.)
with its own price + 15-min deep link, all under our existing Travelpayouts account — no
separate affiliate signups needed. BUT access requires **≥50,000 MAU** (confirmed via
analytics screenshot at application) plus conversion floors (≥9% search→Book click,
≥5% click→purchase), results page robots.txt-blocked, no auto-link-harvesting.
https://support.travelpayouts.com/hc/en-us/articles/210995808
**Decision:** shelve multi-partner routing until traffic qualifies — it is a gated API,
not an engineering gap. No cosmetic multi-vendor UI in the meantime (re-affirms D20).
**Interim option (future task, ungated):** Travelpayouts **White Label / search widgets**
give visitors real multi-agency bookable search monetized under our marker, no MAU
requirement — candidate for a native-feeling /search page pre-50k.
**MAU monitoring:** = unique visitors / 30 days in Plausible (locked, task 9) or Vercel
Analytics as a stopgap. Nothing to build; check the dashboard, apply at 50k.
**Strategy note (user asked "how did Skyscanner start?"):** early metas built their own
aggregation (scraping + direct airline deals) and grew on SEO route-page content — same
ladder we're on: verdicts/history content first, search breadth later. Wedge unchanged.

## 2026-07-11 — D20: vendor click-out built (D17 Group D, pulled forward) — single-vendor, multi-partner deferred
Built `/go/[provider]` redirect + "Go to deal" CTAs on /deals and /flights/[route] (Sonnet
session). **Single vendor for now: Aviasales** (Travelpayouts' own search/booking site, same
account/token as our price source). User initially asked why not show the cheapest of
several partners (Trip.com, Aviasales, etc.) — answer recorded here: our only price data is
Travelpayouts' `/v1/prices/calendar`, which reflects Aviasales-observed fares only; we have
no per-vendor pricing for Trip.com/Kiwi/Booking (separate affiliate APIs, not integrated).
Picking a "cheapest partner" today would be cosmetic, not real. **Backlog (real task, not
started):** integrate additional Travelpayouts-partner price sources so `/go` can compare
and route to the actual cheapest vendor, not just Aviasales.
**Design:** `lib/go-links.ts` whitelists provider + validates destination/date before
building any URL (foundation.md §4.3 — never redirect to a caller-supplied URL). URL format
`aviasales.com/search/{ORIGIN}{DDMM}{DEST}1`, no `marker=` yet — added in `aviasalesUrl()`
(the one function that builds this provider's links) once Travelpayouts approval lands.
Invalid provider/destination/date all fall back to `/deals` rather than erroring.
**Verified live in dev:** `/deals` cards + route-page CTA both link correctly; redirect to
`/go/aviasales?to=DPS&date=2026-09-15` resolved to `aviasales.com/search/SIN1509DPS1`;
bogus provider/dest/date all fell back to `/deals` (checked via network log, not just code
reading). `next build`, typecheck, lint all green.
**Local dev note:** created `apps/web/.env.local` (gitignored) with `DATABASE_URL` copied
from root `.env` — Next.js only auto-loads env files from the app's own directory, not the
monorepo root, so `pnpm dev` was failing with "Invalid environment variables" before this.
Same OneDrive-folder `.next` readlink quirk as before; deleting `.next` before first `dev`
run cleared it.

## 2026-07-11 — D19 (user directives, batch 2): global default-origin, bug fix, ways of working, backlog
1. **Global from day one (amends D17 Group B):** launch is NOT SG-only. Deals/search default
   the "From" to the **visitor's country (geo-IP)** with a manual country/origin switcher.
   Implementation note: Vercel provides `x-vercel-ip-country` header free — map country →
   primary hub airports; SG routes remain the seeded base, flywheel adds the rest.
2. **Bug fixed:** home showcase deal-cards were static divs — now link to their route pages
   (Tokyo card corrected HND→NRT to match the tracked route). NOTE: "click through to GRAB
   the deal" (affiliate link-out to book) is Group D — blocked on Travelpayouts approval.
3. **Model segregation (cost optimisation, applies to all sessions):** user asked to route
   work to the cheapest capable model. Mapping: **Fable/Opus** = architecture, design
   direction (v3 mockup), tricky debugging, security review sign-off. **Sonnet** = ordinary
   feature builds from an agreed plan (Group B port, blog articles, page work). **Haiku** =
   mechanical edits/copy tweaks/single-file fixes. Plans get written in these docs by the
   big model; cheaper sessions execute them.
4. **Modularity requirement:** keep strict module boundaries so parallel contributors don't
   collide and fixes stay contained — already the architecture (monorepo apps/web + worker;
   provider adapter layer; lib/* single-purpose modules; append-only tables; CI + tests as
   the regression guard). New features must land as new modules/routes, not edits across
   unrelated files.
5. **Backlog (future phase, recorded not scheduled):** user accounts + points system;
   "Steal the deal for a partner / surprise gift" — user sets a gift budget, FareSteal
   suggests 3–5 deals to gift a friend/colleague/family member. Sequence AFTER monetization
   works (post Group D) — accounts add PII/PDPA burden (subscribers table stays the only
   PII until then).
6. **Security cadence:** run `/security-review` at each milestone (next: before Group B
   ships) + full pre-launch security pass (task 9: nonce CSP, rate limiting on /go +
   subscribe, dependency audit, secret rotation — Neon password + TP token are in chat
   history and must rotate pre-launch).

## 2026-07-11 — D18 (user directive): Design elevation pass — premium/cinematic, mockup-first
After seeing Group A live, user verdict: graph + overall look "not classy and premium…
looks cheap… very normal"; wants **bold, futuristic, cinematic, travel-feel, lively**
("$100K"). Supersedes v2's look as the bar (v2 structure/mascot stay unless mockup v3
changes them). User is also **cost-conscious about Claude credits** → the pass MUST follow
the mockup-first rule: build `mockups/v3-cinematic.html` as ONE standalone file, iterate
there in the live preview (batched feedback rounds, no build/deploy per tweak), sign off,
then port once. Open design decision for the mockup: keep the CSS/SVG-only perf gate vs
allow optimized photography/AVIF (real cinematic feel usually needs imagery; small
Lighthouse tradeoff) — present both in v3 for sign-off. Group A itself is BUILT/live
(fare_calendar data layer, chart, stat rows, /blog) — v3 restyles, doesn't rebuild.

## 2026-07-11 — D17 (user directive; sequence needs sign-off): Scope expansion — worldwide + rich UX
User directives (post-D16 review of the live site): (1) calendar date-picker on search
dates; (2) replace monthly price boxes with a professional trend graph — current route
pages "not rich"; (3) overall "$100K website" bar; (4+5) **worldwide search — do NOT limit
to Singapore** ("too small"); (6) travel articles section; (7) destination autocomplete on
"To"; (8) flights + hotel affiliate links.
**What this supersedes:** the SG-only assumption (open item, now resolved: SG = curated
seed + SEO base, search = worldwide). **What stays locked:** D1 affiliate link-out (no
in-app booking — "book on site" = link-out); D4 flights-first (hotels stay phase 2, same
Travelpayouts account, after flights earn); mockup v2 as design reference (most of the
"$100K" richness is the un-ported parts of the signed-off design).
**Honest constraints recorded:** all affiliate links blocked until Travelpayouts project
approval (pending); verdicts/history trends need ≥14d data (task 4, ~2026-07-25); the graph
we CAN ship now is cheapest-fare-per-departure-date (~23 real points/route from the
calendar endpoint — needs per-day storage alongside monthly, small schema addition).
Worldwide verdicts grow via the D4 flywheel: unknown searched routes get honest "tracking
just started" + auto-added to daily polling (quota fine: API free, 10 req/s).
**Proposed sequence (one session each):** A) rich route pages (price-by-date graph, finish
mockup port, /blog with 3–5 articles) → B) functional worldwide search (autocomplete +
calendar picker + live results + flywheel) → C) task 4 scoring/verdicts when history lands
→ D) /go affiliate redirects the moment approval arrives; hotels after. Awaiting user
sign-off on the sequence.

## 2026-07-11 — D16: Content build to harden Travelpayouts approval (task 5 slice)
Travelpayouts' #1 rejection reason is thin content. Built out faresteal.com from a single
landing page into a real multi-page content site, using LIVE data (not mockups):
- **/deals** — cheapest current fare per route, queried from `price_snapshots` (ISR hourly).
- **/flights/[route]** — 10 SSG route pages (SIN→BKK…LHR) with real cheapest-per-month
  prices + evergreen "when to book" editorial. generateStaticParams + ISR.
- **Legal/trust:** /about (+contact hello@faresteal.com), /privacy (PDPA-aware),
  /terms, /disclosure (affiliate). Shared `SiteFooter` (legal nav) + `DocShell`.
- Home CTA + "Today's deals" now link to /deals; showcase has a "see all deals" button.
Web read layer: `lib/deals.ts` (neon direct, latest snapshot per route+month, try/catch so
a DB hiccup can't fail the build) + `lib/routes-meta.ts` (destinations, slugs, editorial).
**Verified:** typecheck+lint clean; `next build` green — DB pages prerendered from real Neon
data (needs DATABASE_URL at build; Vercel has it, pass it locally).
**Honest limits:** no buy/wait verdicts or history charts yet (need ~14 days → task 4);
home showcase cards still use illustrative %-off badges (signed-off marketing). Email is a
mailto to hello@faresteal.com — set up free forwarding/Zoho when convenient.

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
