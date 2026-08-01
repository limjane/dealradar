# Current State — DealRadar (placeholder name)

_Read this first each session; update it last. The blueprint lives in `foundation.md` — grep it, don't re-read it whole._

**Last updated:** 2026-08-01 (D26 task 4 deal scoring built + verified against real prod
data on a local dev server. NOT yet committed — awaiting user review/sign-off.)

## 🟡 D26 task 4 — deal scoring/verdicts — BUILT + VERIFIED LOCALLY, NOT COMMITTED (2026-08-01)
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
**NOT DONE:** nothing committed/pushed yet — 8 modified + 4 new files sitting in the working
tree, all Task-4 scoped. Render's `dealradar-score` cron (already deployed, currently a
no-op per its old scaffold) will start actually scoring the moment this ships — next daily
run is 30 min after the 21:00 UTC poll. **NEXT: user reviews on their own dev server
(`corepack pnpm@9.15.0 --dir apps/web dev`, or the `dealradar-web` launch.json config) →
sign off → commit → push → confirm the Render cron's next run creates/updates deals
correctly on prod** (same "verified = deployed + real run" bar as D25's lesson).

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
