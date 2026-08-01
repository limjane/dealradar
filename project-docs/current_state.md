# Current State — DealRadar (placeholder name)

_Read this first each session; update it last. The blueprint lives in `foundation.md` — grep it, don't re-read it whole._

**Last updated:** 2026-08-01 (**D30 + D31 + D36 COMMITTED + PUSHED as `441b1d0`** — bundled
because all three touch `page.tsx`; working tree is now clean, nothing left uncommitted.
Prod verification of `/` (real prices, no fabricated discounts) still to eyeball once Vercel
finishes deploying — see the D36 section below. D34 + D33 shipped earlier in `e8fa66a` and are
confirmed live. D26 task 4 Render cron confirmation still pending (not checkable until tonight
21:30 UTC). D29's 3-new-hub block B still not built, needs a Fable/Opus scoping session first
per D19 model segregation.)

## ✅ D34 — month-rollover verdict bug — FIXED + VERIFIED IN DEV (2026-08-01, Opus session)
The OPEN BUG below, closed. Full rationale in decisions.md D34. Short version: verdict month
selection moved out of SQL (`ORDER BY price LIMIT 1`) into a pure, tested selector —
`selectVerdictMonth` (`apps/web/lib/verdict.ts`) / `select_verdict_month` (`worker/verdict.py`),
deliberate mirrors — which picks the **cheapest month that has enough history**, falling back
to cheapest overall only when no month qualifies (so new routes still say `nodata` honestly).
- **Badge names the scored month only when it differs from the page's headline month**
  (user signed off): `/deals` BKK reads "Cheapest in Oct 2026 · S$202" + "👌 FAIR PRICE ·
  Aug 2026". Where they agree the badge is unchanged.
- **Query shape:** web `getVerdict(dest, month, price)` → `getRouteVerdicts(destFilter?)`
  (a `dest → {travelMonth, price, verdict}` map, 2 queries — `/deals` went 15 → 2); worker
  `cheapest_current_snapshot`/`month_price_history` → `month_candidates`/`month_histories`.
**Verified:** worker pytest 18 (was 13), ruff green; web `pnpm test` 27 (new
`lib/verdict.test.ts` mirrors the worker cases), tsc/eslint/`next build` green (32 pages, 14
SSG paths). Old-vs-new selection run against production Neon: **BKK and DPS recovered
(nodata → FAIR)**, 10 other routes unchanged, the 4 D31 routes + PER correctly still nodata.
Local dev confirms `/deals` and `/flights/sin-bkk`/`-hkg`/`-lhr` render the right badges and
the FAQ sentence quotes the same figures; no console or server errors.
**✅ COMMITTED + PUSHED + CONFIRMED LIVE ON PROD (2026-08-01, this session):** committed as
`e8fa66a` (D33+D34 files only — D30/D31 changes sitting in the same working tree were
deliberately left unstaged/unpushed, out of this session's scope) and pushed to `origin/main`.
Re-verified `tsc`/`eslint`/`pnpm test` (27/27)/`next build` (28 pages, 10 SSG paths) and worker
`pytest` (18)/`ruff` against that exact committed subset (temporarily stashed the D30/D31 diff
to test the real push contents) before pushing. Live on faresteal.com: `/deals` now shows BKK
and DPS as **FAIR** (were NO VERDICT YET pre-fix) with the scored-month label (`· Aug 2026` /
`· Sep 2026`) distinct from each card's Oct 2026 headline month; PER correctly still NO
VERDICT (D32, unrelated data gap). `/flights/sin-bkk` renders the full D33 SEO copy (lead
paragraph, 9-month cheapest-fare table, day-of-week FAQ) plus the D34 verdict sentence — no
console errors on either page.
**NEXT: after tonight's 2026-08-01 21:30 UTC `dealradar-score` cron**, confirm it ran clean
against the new `score.py` (re-query the `deals` table or check Render's run log — same check
D26 task 4 queued). ~~Separately, D30/D31 still need their own commit+push session.~~ →
**DONE — D30 + D31 + D36 pushed as `441b1d0`, see D36 below.**

## ✅ D33 — data-backed SEO copy on /flights/[route] — BUILT + VERIFIED IN DEV (2026-08-01, Opus session)
The queued "turn the price DB into per-route data pages" task. Full rationale in decisions.md
D33. Short version: new `apps/web/lib/route-copy.ts` (pure — no DB, no `now()`, fully
testable) turns the fare rows the route page already fetches into a lead paragraph, a
crawlable cheapest-fare-by-month table, FAQ copy, and the meta description. **Zero new
queries** — one extra column (`fetched_at`) on the existing fare_calendar select.
- **Every claim is sample-size gated** (`COPY_GATES`): thin routes silently drop claims
  instead of publishing a number backed by two data points.
- **Midweek vs weekend is computed within-month, then averaged** — the raw cross-calendar
  version reports seasonality as a day-of-week effect (SIN–TPE showed a fake +32% weekend
  premium that is really +2%). Only BKK/HKG/NRT/SYD clear the gate today.
- **Stale routes stop saying "updated daily"** (>= 3 days old -> "last updated <date>" +
  banner + no lead-time claim). Generic rule; currently fires only on SIN–PER (D32).
- **SEO scaffolding:** JSON-LD `FAQPage` (verified identical to the visible Q&As), live meta
  descriptions, H2s as real search queries. Hand-written blurb/tips kept as secondary colour.
- **Testing:** `apps/web` had no test runner. Used Node's built-in runner + native TS
  type-stripping — `pnpm test`, **21 tests, zero new deps** (tsconfig needed
  `allowImportingTsExtensions`). Won't cover component tests if those are ever needed.
**Verified:** `tsc`/`eslint` green; `next build` green (32 pages, 14 SSG route paths);
`pnpm test` 21/21. Live in local dev: sin-bkk renders the full set with numbers matching a
direct DB query, sin-fco (1 date) degrades cleanly, sin-per shows the real stale banner,
/deals unaffected by the `money` re-export. No console errors on any page checked.
**✅ COMMITTED + PUSHED + CONFIRMED LIVE ON PROD** — see D34 above (bundled in the same
`e8fa66a` commit; both were built together and share the `getRouteVerdicts`/`loadRoute`
call site in `flights/[route]/page.tsx` so they weren't separable into two commits).
**Still not done:** run the sin-bkk FAQ through Google's Rich Results Test.

## ~~🐞 OPEN BUG (found during D33)~~ → ✅ FIXED, see D34 above (2026-08-01)
**Verdicts silently vanish at each month rollover.** `getRouteStats().cheapest` picks the
lowest-priced month; when the worker's rolling window admits a brand-new travel month it has
1 snapshot -> 0-day span -> `computeVerdict` returns `nodata`. On 2026-08-01 this took the
verdict off **BKK, DPS and HKG** (3 of the 10 mature routes) even though all three have 21
days of usable history on other months — 2026-10 entered the window and happened to be
cheapest. Recurs every month boundary, hitting a different subset. Affects `/deals`
identically, and `worker/score.py` selects its month the same way (verdict.ts/verdict.py are
deliberate mirrors — fix both in one commit). Same class as the bug D26 fixed once. Suggested
fix + alternatives are in the spawned task and decisions.md D33.

## ✅ D36 — homepage fabricated discounts — FIXED + VERIFIED IN DEV (2026-08-01, Opus session)
The 🔴 open bug below, closed. Full rationale in decisions.md D36. Short version:
`apps/web/app/page.tsx` now reads the same `getCheapestPerRoute()` + `getRouteVerdicts()` pair
`/deals` uses (same try/catch → "gathering fares" fallback), so the two pages cannot disagree.
- **Showcase:** 3 cheapest tracked routes, real `<VerdictBadge>` (with the D34 scored-month label
  when it differs), no badge when a route has no verdict. The fabricated `41/38/29% below normal`
  GRAB badges and the strikethrough "was" prices are gone — we never tracked a was-price.
- **Hot chips:** NRT/DPS/ICN/BKK with live prices, topped up from the cheapest list if one has no
  data; now link to `/flights/[route]` instead of the `#deals` anchor (which holds only 3 cards).
- **"60 days" fixed in all THREE places,** not just the trustbar as scoped — the same claim was
  also in how-it-works step 2 and the showcase subheading. Trustbar reads "Real prices tracked
  daily since 11 July 2026" (`TRACKING_SINCE` const); step 2 reads "every fare we've tracked on
  that route"; subheading matches `/deals`' wording.
**Verified:** `tsc`/`eslint` green, `pnpm test` 27/27, `next build` green (32 pages, 14 SSG paths,
`/` still `ƒ` dynamic as D30 made it). Live in local dev: homepage chips read Tokyo $447 / Bali
$183 / Seoul $347 / Bangkok $202 and the showcase reads DPS $183 (FAIR · Sep 2026) / CGK $184
(NO VERDICT) / BKK $202 (FAIR · Aug 2026) — **every figure matches the `/deals` page row-for-row**
(checked side by side). DOM assert confirms zero `badge grab` elements and all 4 chip hrefs are
valid SSG route paths. No console errors.
**✅ COMMITTED + PUSHED (2026-08-01, Opus session):** `441b1d0`, bundled with D30 + D31 as
predicted — `page.tsx` carried all three, so D35's split-by-file trick no longer worked. Every
gate re-run against the exact staged contents (staged tree was byte-identical to the working
tree, so nothing needed stashing): worker `pytest` 18 + `ruff check`/`format --check` clean;
web `tsc`, `eslint`, `pnpm test` 27/27, `next build` green — 32 pages, 14 SSG paths, `/` and
`/search` still `ƒ` dynamic as D30 intends. Pushed to `origin/main`; working tree clean.
**NEXT: eyeball prod** once Vercel's deploy lands — `faresteal.com/` should show real prices
matching `/deals` (no `41/38/29% below normal` badges, no strikethrough "was" prices, hot chips
linking to `/flights/[route]`). Do this BEFORE any promo from D35's packs drives traffic to `/`.

## ~~🔴 OPEN BUG — homepage advertises fabricated discounts~~ → ✅ FIXED, see D36 above
(found 2026-08-01, Opus session) `apps/web/app/page.tsx` carried hardcoded mockup numbers from
the v2 design, never swapped for live data — 3 showcase cards claiming `41%`/`38%`/`29%` below
normal (no route has ever hit 15%+; the worker has produced 0 GRAB verdicts against real data),
hot chips reading `$312/$168/$385/$142` against a real `$447/$183/$310/$202` (Bangkok understated
by 42%), and a "60 days of real price tracking" trustbar when tracking started 2026-07-11.

## 📣 Brand promo pack — WRITTEN (2026-08-01, Opus session) — no code change
User asked for promo copy about the website (distinct from the fare-deal pack below). Wrote
`project-docs/promo-2026-08-01.md`: positioning + Telegram (2 versions), IG carousel + caption,
FB group post, X single + 4-post thread, and a bio/one-liner bank. **Contains no fare numbers on
purpose** — evergreen, nothing to re-pull before publishing (unlike the deal pack). Positioning
locked as: *the hard part isn't finding a fare, it's knowing whether to book it* — lead with the
verdict, never the price, and publish the "wait" verdicts because they're what make the "grab"
verdicts believable. File's closing section carries the homepage-bug warning above.

## 📣 Social post pack — WRITTEN (2026-08-01, Opus session) — no code change
User asked for traffic/marketing content instead of the queued build task. Wrote
`project-docs/social-posts-2026-08-01.md`: 6 verified-discount posts (TPE/MNL/LHR/NRT/ICN/SYD),
7 price-only posts, and per-medium adaptations (Telegram, IG carousel, Reddit/HWZ, FB, X, TikTok).
All numbers pulled live from prod Neon on 2026-08-01 — **all fares are ONE-WAY economy SGD**.
Guardrails encoded in the file: no % claim without ≥18 snapshots for that route+month; Perth
excluded (D32 stale data would read as +60% *above* median); re-pull before publishing.
Strategic note for later: the 4 existing evergreen blog posts won't rank — the real SEO asset is
turning the price DB into per-route data pages. ~~Queued as a Sonnet task below.~~ → **DONE, see
D33 above** (built in an Opus session — the gating and day-of-week statistics turned out to be
editorial/analytical judgment, not a mechanical port).
**Possible small worker task:** promote the throwaway query into `worker/report.py` so the weekly
post is one command instead of a hand-written script.

## ✅ D32 — SIN-PER staleness — DECIDED: wait it out (2026-08-01, Sonnet session)
Presented the decision flagged in D26 below (provider-side cache gap, not our bug) to the
user: wait it out vs. drop the route. **User chose wait it out — no code changes.** Full
rationale in decisions.md D32. Revisit later if still stale, or if user wants to drop it
(removal = `worker/seed_routes.py` + `apps/web/lib/routes-meta.ts` + clean up any stale
`deals` row).

## ✅ D31 — 4 new SIN-outbound seed routes — BUILT + VERIFIED + PUSHED (`441b1d0`, 2026-08-01)
D28's "immediate" bucket, built. Full detail in decisions.md D31 — short version: added
SIN–CGK (Jakarta), SIN–DXB (Dubai), SIN–CDG (Paris), SIN–FCO (Rome) to
`worker/seed_routes.py` + editorial copy (blurb/tips/emoji/gradient) to
`apps/web/lib/routes-meta.ts`'s `DESTINATIONS` — same pattern as the existing 10, no
architecture change, so every page that reads `DESTINATIONS`/`ROUTE_SLUGS` (`/deals`,
`/flights/[route]`, `/search`, `sitemap.ts`) picked them up automatically.
Seeded live on production Neon (14 active routes now) and ran a real `poll.py` immediately
after so the new routes have real price data now rather than waiting for tonight's cron:
14/14 routes, 0 errors, 35 snapshots + 292 fare_calendar days written.
**Verified:** worker pytest/ruff green (13 tests, unchanged); web tsc/eslint/`next build`
green (32 pages, 14 SSG route paths). Live in local dev (after the usual OneDrive `.next`
clear): all 4 new route pages render real prices + correct copy, no console errors; `/deals`
shows all 14 routes sorted by price. All 4 show "NO VERDICT YET" as expected (fresh routes,
no 14-day history — same gate as D26 task 4).
**NEXT session options:** (a) after 2026-08-01 21:30 UTC, confirm the D26 `dealradar-score`
cron ran clean on Render against the new deploy (see D26 task 4 section below — still
unconfirmed, now also covers these 4 routes' eventual verdicts); (b) ~~check Render's
`dealradar-poll` logs for why SIN→PER has been stale~~ → **DONE, see D32 above (user chose
wait it out)**; (c) D29 block B (bigger — 3 new origin hubs, needs origin-aware pages first
— scope in a Fable/Opus session per D19 before building in Sonnet).

## ✅ D30 — geo-IP default origin — BUILT + VERIFIED + PUSHED (`441b1d0`, 2026-08-01)
D27 block A, built. Full detail in decisions.md D30 — short version: the real hardcoded
default was `DEFAULT_FROM` in `components/flight-search-form.tsx` (not `routes-meta.ts`'s
`ORIGIN`, which is fixed-SIN on purpose for SEO route-slug generation and was left alone).
Added `initialFrom` prop to `FlightSearchForm` (mirrors `initialTo`) + new
`apps/web/lib/geo-origin.ts` (`originForCountry()`, covers SG/TH/MY/ID/PH/HK/TW/KR/JP/AU/GB,
falls back to SIN). Wired into `/` and `/search` via `next/headers` reading
`x-vercel-ip-country` — user chose to accept the resulting trade-off (those two routes now
render dynamically/`ƒ` instead of static, confirmed in `next build` output; `/deals` and
`/flights/[route]` don't use the form and stay static).
**Verified:** `tsc`/`eslint`/`next build` all green; local dev confirmed no-header→SIN
(unchanged), and `curl -H "x-vercel-ip-country: TH"` → Bangkok, `GB` → London, unmapped `ZZ`
→ SIN fallback, no console errors.
**NOT yet verified:** the real Vercel geo header on an actual deployment (faresteal.com) —
next time this comes up, a quick live check (different-country VPN or ask a friend abroad) or
just trust the mechanism, since it's Vercel's documented, standard header.
~~NEXT: 4 new SIN-outbound seed routes (D28)~~ → **DONE, see D31 above.**
**Later session = block B (bigger, needs origin-aware pages first):** the flywheel —
auto-add a route after **N searches** (exact N TBD, ~3 as a starting reference) — PLUS seed
3 new origin hubs with their researched destination lists (D29):
- Bangkok → 10 routes (ranked/high-confidence data)
- Kuala Lumpur → 9 routes (unranked/medium-confidence)
- Penang → 15 routes (unranked/medium-confidence)
That's 34 net-new routes → **48 total once fully built** (14 SIN + 34 across the 3 new hubs).
Also queued, lower priority (not covered by any hub): HKG-TPE, ICN-NRT, ICN-KIX, NRT-TPE,
JFK-LHR. Needs its own scoping pass before build for: where search counts get logged, a
generic content template for routes without hand-written editorial copy, making
`/deals`/`/flights/[route]` origin-aware instead of assuming SIN, and a Travelpayouts quota
check at 48 routes (was fine at 10 — not yet re-confirmed at this scale).

## 🟡 D26 task 4 — deal scoring/verdicts — LIVE ON PROD (web), CRON UNCONFIRMED (2026-08-01)
**Vercel/web confirmed live:** `faresteal.com/deals` and `/flights/sin-bkk` both checked in a
real browser — no console errors, badges match the dev diagnostic exactly (9 FAIR + 1 NO
VERDICT for Perth on /deals; sin-bkk shows FAIR PRICE with correct stats). The verdict logic
shipped in D26 task 4 is confirmed working on the live domain.
**Render `dealradar-score` cron NOT YET confirmed with the new code.** Queried the prod
`deals` table directly (Neon, via worker's own `DATABASE_URL`): 0 rows — consistent with 0
GRAB verdicts (matches dev), but NOT proof the new `score.py` has actually run, because
`price_snapshots.fetched_at` shows the poll cron's last run was **2026-07-31 21:01 UTC**,
which is *before* today's `65337b8` was pushed. Render hasn't fired its 21:00 UTC job since
the deploy landed — that happens tonight. **NEXT: after 2026-08-01 21:30 UTC** (score cron,
30 min after poll), re-query the `deals` table (or check Render's run log) to confirm it ran
clean against the new code and wrote/updated rows as expected (still 0 GRAB rows is a valid
outcome if no route has actually dropped 15%+; the point is confirming the cron *ran*, e.g.
via Render's dashboard log or a timestamp check).
**Also found, unrelated:** `SIN→PER` (Perth) hasn't polled successfully since **2026-07-24**
— 8 days stale vs. every other route's 2026-07-31. The "NO VERDICT YET" badge is currently
explained as "only 12-day history," but if polling has silently been failing for this one
route for over a week, that's a bug, not a data-maturity gap. Worth a quick look at Render's
`dealradar-poll` logs for PER-specific errors next session.

**UPDATE 2026-08-01 (this session) — root-caused via direct Neon query, no Render dashboard
access needed:** Not a code bug — `poll.py` isolates per-route failures and would log/count
an error on exception, but SIN-PER shows **0 errors** in every run, including today's D31
manual run. Queried `price_snapshots`/`fare_calendar` for route_id=9 directly:
- `price_snapshots`: last row 2026-07-24 (still true today, 08-01 → now 8 days with zero
  new rows, confirmed).
- `fare_calendar`: kept getting rows through 2026-07-29 but **only far-future dates**
  (2026-12-02, 2027-02-27) — none landing in the "current month + next 2" window
  `cheapest_by_month_from_days` needs, so `price_snapshots` silently got nothing even
  though the call "succeeded." From **2026-07-30 onward, zero fare_calendar rows too** —
  the provider call is returning an empty/near-empty body for this route, not throwing.
- Every other active route kept polling fine the whole time (8–9/10 routes daily through
  July, 13/14 on today's 08-01 run — the 1 missing is PER).
- Root cause per `providers/travelpayouts.py`'s own documented behavior: the calendar
  endpoint serves Travelpayouts' own server-side cache, which "updates when users search
  the route" (D10/D15). SIN-PER's cache appears to have thinned to nothing on their end —
  a provider data-availability gap, not our bug. `raise_for_status()` /
  `body["success"]` checks would have raised `ProviderError` on a real API failure; neither
  fired.
**Consequence:** SIN-PER can't accrue the 14-day history needed for a verdict while this
persists — it may sit at "NO VERDICT YET" indefinitely, not just until day 14.
**DECIDED 2026-08-01 (D32): wait it out.** No code changes. Revisit later if still stale.

## ✅ D26 task 4 — deal scoring/verdicts — COMMITTED + PUSHED (2026-08-01)
The ≥14-day history gate (started 2026-07-11, usable ~2026-07-25) had passed, so this
session implemented foundation §3's scoring v1 (`discount_pct = (median − current) /
median`, GRAB ≥15%, HIGH ≥15% over, ≥14d history required else "no verdict") for real.
**Worker:** `worker/verdict.py` (pure `compute_verdict`, table-driven pytest in
`tests/test_verdict.py`, 8 cases incl. boundaries) + `worker/score.py` rewritten from its
scaffold no-op to actually query each route's cheapest tracked month, score it against that
route+month's own 60-day price_snapshots history, and upsert/expire rows in the `deals`
table. Schema has no per-route-month column on `deals` (route_id only) → v1 keeps ONE active
deal per route (dumb on purpose, matches "keep dumb, tune later"); only GRAB-level verdicts
get published there (FAIR/HIGH are display-only, not persisted as "deals"). db.py gained
5 query helpers; models.py gained `MonthCandidate`. **Ran score.py against real production
Neon data:** 10/10 routes scored, 0 errors, 9 FAIR + 1 NO VERDICT (Perth — only 12-day
history span), 0 GRAB (honest — no route has actually dropped 15%+ yet on ~3 weeks of real
data, confirmed by hand-checking every route's discount_pct).
**Web:** `lib/verdict.ts` (TS mirror of the same pure formula — /deals needs a verdict for
EVERY route, not just the ≥15% ones the worker publishes, so it reads price_snapshots
history directly rather than the `deals` table), `components/verdict-badge.tsx` (4-state
badge from the signed-off v2 mockup: grab/fair/high/nodata), `globals.css` gained the
missing `--fair`/`--high`/`--nodata` vars + badge classes (only `--grab` existed before).
Wired into `/deals` (badge per route) and `/flights/[route]` (badge replaces the old "buy/wait
verdicts are coming" placeholder copy). **Fixed one real bug found during verification:** the
route page's headline price comes from `fare_calendar` (unrestricted, spans further out than
price_snapshots' 3-month rolling window) — scoring that exact day's month could hit a month
price_snapshots barely has history for, showing a misleading NO_VERDICT even when the route's
actual tracked month (same one /deals shows) was FAIR. Fixed by always scoring off
`getRouteStats`' price_snapshots-sourced cheapest month, decoupled from the fare_calendar
headline day.
**Verified:** worker `pytest`/`ruff check`/`ruff format --check` all green (13 tests);
web `tsc --noEmit`/`eslint`/`next build` all green (28 pages, DB-backed pages prerendered
against real data); live-checked in a local dev server (`/deals`, `/flights/sin-bkk` now
FAIR after the fix, `/flights/sin-per` correctly NO VERDICT YET) — no console errors, badge
content matches the CLI diagnostic exactly.
**NEXT: confirm live on prod** — once Vercel finishes deploying, eyeball faresteal.com/deals
and a /flights/[route] page for real badges (no 404/console errors). Render's
`dealradar-score` cron (already deployed, was a no-op per its old scaffold) auto-deploys from
`main` too — its next scheduled run is 30 min after the 21:00 UTC poll; check Render's run
log or query the `deals` table afterward to confirm it created/updated rows on prod, not just
locally (same "verified = deployed + real run" bar as D25's lesson).

## ✅ D25 calendar swap — COMMITTED + PUSHED + LIVE ON PROD (2026-08-01)
User eyeballed the react-day-picker swap on their own local dev server and signed off.
Committed `f689358`, pushed to `origin/main`. Live-on-prod check of
https://www.faresteal.com/search: page loads clean (title "Search flights — FareSteal", no
console errors), calendar popover renders with `navLayout="around"` (centered month label,
flanking chevrons), and clicking "Next month" moved August 2026 → September 2026 —
confirming the actual functional bug this pass fixed (nav arrows previously did nothing,
`month` was fully controlled with no `onMonthChange`) works on the live site, not just dev.
Full rationale in decisions.md D25.

## ✅ D23/D24 — COMMITTED + PUSHED + LIVE ON PROD (2026-07-12)
Local build re-verified green after clearing the OneDrive-corrupted `.next` cache (`rm -rf
.next`, known issue — see ENVIRONMENT note below). Committed as `1d7864c`, pushed to
`origin/main`. Post-deploy check of https://www.faresteal.com/search: page loads (title
"Search flights — FareSteal"), From/To fields + date selection present, no errors.
**⚠ Still unverified:** actual click-driven behavior in prod (autocomplete dropdown, calendar
popover, submit → `/go/aviasales?...` redirect) — a fetch-based check can't exercise clicks.
User to manually click through once on the live site before calling this fully done.

## ⚠ ENVIRONMENT: OneDrive corrupts .next — user decision pending
Repo lives in OneDrive; sync corrupted the dev `.next` cache 3× in one session (server 500s /
EINVAL/UNKNOWN manifest errors, plus 7–26s compiles). Workaround: `rm -rf .next` + restart.
Durable fix = move repo out of OneDrive or exclude it from sync — its own task (all skill/doc
paths change). Also: user's regular Chrome profile has an extension injecting `data-sharkid`
attrs → hydration mismatch; test in Incognito.

## ✅ D24 handoff blend — BUILT + VERIFIED IN DEV (2026-07-12, Fable session)
Deal-CTA and search-form journeys now share one visual/verbal handoff (full rationale D24):
shared `.handoff-note` disclosure everywhere we send users to Aviasales; "Go to deal →" →
"See this fare →" (/deals + route pages); route pages cross-link "pick your own dates →" to
`/search?to=CODE`; /search pre-fills the form from `?to=`. Verified live in dev: pre-fill
renders "Bali (DPS)", both /go link shapes redirect correctly (one-way `to`+`date` →
`SIN0911DPS1`; round-trip `from/to/depart/return` → `SIN0911DPS1611SIN1`). Also fixed the
"no dropdown" bug (hero `overflow:hidden` clipped the popovers → `overflow-x`), softened the
calendar styling, and added dev-only `'unsafe-eval'` to CSP (dev-mode webpack needs it;
without it the form renders but nothing responds to clicks). Autocomplete verified live:
typing fires the Places API and renders 8 suggestions.

## ✅ D23 branded search form — BUILT (2026-07-12, Sonnet session)
`components/flight-search-form.tsx` (new, single shared component per D19.4 module boundary)
now powers BOTH the home hero and /search, replacing the static hero mockup and the retired
Travelpayouts White Label widget:
- From/To: live airport autocomplete via TP's free Places API (debounced fetch,
  `autocomplete.travelpayouts.com/places2`) — confirmed working with a direct browser fetch
  (12 results for "Tokyo", real IATA codes/coords).
- Depart/Return: small custom calendar popover (own build, no date-picker dep), return
  disabled before depart.
- Submit: `router.push('/go/aviasales?from=…&to=…&depart=…&return=…')`.
- `lib/go-links.ts` + `app/go/[provider]/route.ts` extended for worldwide origin/destination
  + optional round-trip leg; validation changed from whitelist-membership to IATA-shape only
  (D23 makes destinations arbitrary/worldwide, not just our 10 tracked routes) — legacy
  `to`+`date` one-way callers (/deals, /flights/[route]) unchanged, still resolve correctly.
- Retired WL widget script/divs; pruned now-dead CSP entries (tpembd.com, avsplow.com,
  fonts.googleapis/gstatic — all were widget-only, site self-hosts fonts via next/font).
- `next build`/typecheck/lint all green.
**⚠ Verification gap:** could not confirm click-driven interactivity (autocomplete dropdown
opening, calendar popover, submit → correct /go URL) in the preview harness — a *minimal
throwaway counter-button test* (unrelated to this component) also failed to register clicks
in the same session, isolating this to a preview-tool/environment limitation, not the new
code. SSR render, build, typecheck, and the underlying TP API call were all verified
directly. **NEXT: user should manually click through the form on a real browser (dev server
or after deploy) before this is called fully done** — specifically: type a destination and
confirm the dropdown appears, pick dates, submit, and confirm it lands on an Aviasales URL
with the right origin/dest/dates.

## ✅ /search 404 + CSP — RESOLVED (2026-07-12, this session)
D22 was never committed (see correction below) → committed + deployed (722be26). Then live
console revealed the WL widget's data fetches to **avsplow.com** and its Google Fonts
stylesheet were CSP-blocked, and `#tpwl-modals` was missing. Fixed in `next.config.ts`
(`connect-src`/`frame-src` += avsplow.com/*.avsplow.com; `style-src` += fonts.googleapis.com;
`font-src` += fonts.gstatic.com) + added `#tpwl-modals` div; deployed. NOTE: D23 will retire
this widget anyway, so the CSP-for-widget entries become dead once the branded form ships —
the fonts.googleapis/gstatic entries may still be useful; avsplow/tpembd can be pruned then.
(Widget functional-on-live not user-confirmed before the Path-A pivot; moot under D23.)

## ⚠ CORRECTION — D22 /search was never actually shipped (fixed 2026-07-12)
Last session built /search + CSP + nav links, verified on a LOCAL DEV SERVER (reads the
working tree, not git), marked it "done + verified," and updated this doc — **but never ran
`git commit`/`push`.** Production faresteal.com 404'd on /search the whole time. All 7 files
sat as uncommitted working-tree changes. **Fixed this session:** `next build` re-verified
green (/search in route table), committed (722be26) + pushed to main → Vercel deploying.
LESSON: "verified" must mean *deployed to prod + a real interaction run on the live domain* —
NOT "worked on the local dev server." A local dev server proves nothing about production for
a domain-locked widget. Do not mark widget/UI work "done" until it's confirmed on the live URL.
NEXT: once deploy lands, confirm /search loads (no 404), THEN diagnose the widget's
autocomplete-dropdown + date-calendar (user reports both non-functional — likely CSP
`connect-src` blocking the widget's airport-suggest / per-date-price fetches; need live
console CSP-violation errors to know exact domains to whitelist).

## Phase
**BUILD.** Task 2 (scaffold + deploy) all but done. Live services:
- ✅ **GitHub**: `git@github.com:limjane/dealradar` (SSH; HTTPS PAT lacked `workflow` scope). `main` pushed.
- ✅ **Neon**: project `dealradar` in ap-southeast-1; migration applied; all 6 tables verified. Pooled `DATABASE_URL` in `.env` (gitignored).
- ✅ **Vercel**: https://dealradar-web-chi.vercel.app — **real landing page live** (D12; replaced placeholder to unblock Travelpayouts review). Security headers verified earlier. Root Dir `apps/web`, `DATABASE_URL` set.
- 🟡 **Render**: blueprint deployed from `render.yaml`, builds green. BUT env still has **fake Amadeus vars** — must be swapped (see below). Crons only fire 21:00 UTC daily, so nothing has run yet.

## ⚠ Provider pivot — D10 (price source: Amadeus → Travelpayouts Data API)
**Amadeus Self-Service portal is decommissioned 2026-07-17** (7 days out). Whole price
layer moved to **Travelpayouts Data API** (`/v1/prices/calendar`), which is ALSO our
affiliate network — one token for both. Env changed: `AMADEUS_*` → `TRAVELPAYOUTS_TOKEN`
(+ `TRAVELPAYOUTS_MARKER` later). `.env`, `.env.example`, `render.yaml` all updated.
Data is aggregated/cached, not live — fine for a deals/price-history engine. Full
rationale + endpoint fit in decisions.md D10.

## Site is now a real multi-page content site (D16) — approval-hardened
Live on faresteal.com: home, **/deals** (live prices), **10 /flights/[route]** pages (real
per-month prices + editorial), /about /privacy /terms /disclosure, favicon, robots.txt,
sitemap.xml, OG tags. Addresses Travelpayouts' "thin content" rejection reason. Remaining
polish (optional): functional search inputs (CTA already links to /deals), a real OG image,
buy/wait verdicts (task 4, needs ~14d history).

## Travelpayouts review (D12/D13/D14) — READY TO RESUBMIT
Landing page is **LIVE on https://faresteal.com** (custom domain, D13) — verified: real
content (26.5 KB), SSL, apex→www redirect, no bot-challenge. Repo made public to unblock
Vercel Hobby deploys (D14). **→ Resubmit the project to Travelpayouts using faresteal.com**
(was rejected on the vercel.app placeholder). Content is still fairly thin — if a brand
declines for "not enough content," the SEO route pages (task 5) are the fix.
NOTE: the **Data API token** (for polling) is from Developers/API and is NOT gated on this
review — grab it independently to keep the build moving.
Also: confirm Vercel → Firewall → Attack Challenge Mode is OFF so crawlers aren't challenged.

## Blocking — user actions
1. **Travelpayouts account (DealRadar's OWN — separate from TravelHub)**: sign up at
   travelpayouts.com → Developers → copy API token → put in `.env` as `TRAVELPAYOUTS_TOKEN`.
   Resubmit project for review now that the landing page is real (D12).
2. **Render env fix**: in Render dashboard, delete the 3 fake `AMADEUS_*` vars on both
   cron services, add `TRAVELPAYOUTS_TOKEN` (real). (render.yaml already reflects this for
   future syncs.) Push the updated render.yaml too so the blueprint matches.
3. Push the doc/env/yaml changes from this session to GitHub (not yet committed).

## Task 3 — worker polling — ✅ DONE + VERIFIED LIVE (2026-07-11)
First real poll ran: real Travelpayouts token + Neon → **10/10 routes, 23 snapshots, 0
errors** (months 07/08/09, sane prices). Adapter corrected for the month-ignoring endpoint
(D15). **≥14-day verdict clock started 2026-07-11 → usable ~2026-07-25.**
**✅ Daily accrual LIVE (verified 2026-07-11):** Render `dealradar-poll` cron ran
successfully via Trigger Run and wrote 23 rows to Neon (46 total incl. the manual run) —
full Render→Travelpayouts→Neon path proven in production. Env vars correct on both crons
(`DATABASE_URL` + `TRAVELPAYOUTS_TOKEN`); the blueprint auto-synced away the old `AMADEUS_*`.
Now hands-off: polls 10 routes daily at 21:00 UTC (5am SGT), scores 30 min later.
Next build task = **task 4 (deal scoring)** once ~14 days of history exist (~2026-07-25).
(Minor: 2026-07-11 has a duplicate snapshot batch — manual + Render run; harmless.)

## (history) Task 3 — worker polling — CODE-COMPLETE, live run pending token
Built (committed): `worker/providers/` (`PriceSource` protocol + `TravelpayoutsPriceSource`
wrapping `GET /v1/prices/calendar`), `dates.next_travel_months`, `db.active_routes` +
`db.insert_snapshots`, `seed_routes.py`, real `poll.py`. Choices in D11 (one row per
route×travel-month = monthly cheapest, one-way, current month + next 2, httpx, per-route
error isolation).
**Verified:** 8 unit tests (adapter via httpx MockTransport + date wrap); DB write path
against real Neon — **10 routes seeded** (SIN→BKK/DPS/HKG/TPE/ICN/NRT/MNL/SYD/PER/LHR),
insert→readback→cleanup of a test snapshot OK; ruff lint+format clean.
**NOT yet verified (needs token):** the live Travelpayouts HTTP call (auth + real response
shape). Adapter codes to the documented contract — confirm on first real run.
**First run next session:** with `TRAVELPAYOUTS_TOKEN` set, `python -m uv run python poll.py`
→ expect ~30 snapshot rows (10 routes × 3 months). Then daily accrual builds history.
- **14-day history is a launch gate but too short for seasonality — beta-launch plan:**
  ship basic "cheaper than rolling median" verdict (task 4), collect 30–60 days real data in
  beta, upgrade to percentile/seasonal scoring post-launch. START EARLY (history has to accrue).

## What's locked (see decisions.md)
- D1 affiliate link-out · D2 price-intelligence wedge · D3 stack · D4 search-first, flights
  only · D5 specific-flights list · D6–D8 design + "Radar" mascot · D9 scaffold choices ·
  **D10 price source = Travelpayouts Data API (replaced Amadeus)**
- Blueprint: `foundation.md` · Mockup: `mockups/v2-fun-travel.html`

## Still open (non-blocking)
- Seed market confirmation (assumed SG/SEA outbound)
- ~~product name + domain~~ → **RESOLVED: FareSteal / faresteal.com** (D13; registering at
  Porkbun). Pending: purchase → connect to Vercel → DNS → disable bot-challenge → resubmit
  Travelpayouts. Code/UI still says "DealRadar" (cosmetic rename later).
- Neon password is in this session's chat history — rotate before real launch (non-urgent).

## Open bug — mockup (assigned to a fresh Sonnet session)
`mockups/v2-fun-travel.html`, hero: FLYING mascot's eye pupil not visible (perched pose
fine). See prior notes — fix eye only.

## QA/Staging — ✅ DONE (2026-07-12)
**Neon-Vercel integration wired:** Installed Neon integration in Vercel, linked existing `dealradar` Neon project to `dealradar-web`, configured Preview environments. **Verified live:** pushed test branch → Vercel auto-deployed preview → Neon auto-created preview branch → merged PR → Neon branch auto-deleted. Production (Vercel `main` branch) stays locked to Neon's Default branch; each preview deployment gets an isolated staging DB. Zero manual database branch management going forward.

## Next session
**Vendor click-out links — ✅ DONE + VERIFIED LIVE-IN-DEV (2026-07-11, Sonnet session).**
`/go/[provider]` redirect + "Go to deal" CTAs shipped on /deals and /flights/[route],
single vendor (Aviasales) for now — see D20 for the "why not cheapest-of-several-partners"
answer and the real multi-partner backlog item. Styling kept minimal (small pill CTA, no
layout redesign). `next build`/typecheck/lint green; redirect + fallback behavior verified
against a live local dev server (not just code reading).
**NEXT TASK (pick one):** (a) v3 mockup sign-off — review `mockups/v3-cinematic.html`, provide
batched feedback (4 sign-off items + "fare scan" label reframe); (b) task 4 deal scoring
once ~14 days history exist (~2026-07-25); (c) user eyeballs **https://www.faresteal.com/search**
to confirm White Label widget renders + functions on prod domain. Start with `/faresteal-next`
and the state doc will re-propose whichever makes sense at that time.

**ON HOLD (user, 2026-07-11):** v3 cinematic mockup — built, awaiting batched feedback.
~~QA/staging~~ → ✅ DONE 2026-07-12 (Neon-Vercel integration live, tested end-to-end).

**D17 sequence signed off ("go A") — Group A BUILT + pushed 2026-07-11:** `fare_calendar`
table (migrated), worker writes per-date fares (160 rows live, 1 call/route), route pages
rebuilt with stat row + SVG price-by-date chart (mockup style, real data), /blog with 4
articles, footer/sitemap wired. Local gates green (lint/types/build, 9 worker tests).
**Live verification pending** — my curl polling re-tripped Vercel's bot challenge (2nd
time; see memory note — verify with ONE delayed request only, or user eyeballs it).
**D18 mockup BUILT (2026-07-11): `project-docs/mockups/v3-cinematic.html` — awaiting batched
feedback.** Cinematic dark design language (deep-space navy, glass cards, Space Grotesk +
Fraunces italic accent, gold/coral CTAs, glowing gradient chart with typical-range band +
low/today annotations). Contains BOTH hero options (A = pure CSS/SVG aurora+route-arcs,
B = photography w/ Unsplash placeholder — production = self-hosted AVIF ≤90KB), photo vs
no-photo deal tiles, night-scout Radar vs monogram, and a 4-item sign-off panel at the
bottom (recommendations: B on home / photos in feed / keep mascot small). Iterate in THIS
file on feedback; port to apps/web only after sign-off (port can be a Sonnet session).
THEN Group B (Sonnet, plan in D17/D19) = worldwide search: autocomplete, date-picker, live
results, flywheel, **geo-IP default origin with manual switcher (D19.1 — global launch)**.
C = task 4 scoring (~2026-07-25). D = /go redirects the moment Travelpayouts approval lands.
**Ways of working now standing (D19): model segregation by task, strict module boundaries,
/security-review each milestone, secrets rotate pre-launch. User is credit-conscious —
single-task sessions, batch feedback.** Backlog recorded in D19.5 (points, gift deals).
Local dev notes: pnpm via `corepack pnpm@9.15.0 …` (no global pnpm); web build needs
DATABASE_URL exported (grep it from root `.env` — the `&` breaks shell sourcing, export
quoted); worker via `python -m uv run …`.
