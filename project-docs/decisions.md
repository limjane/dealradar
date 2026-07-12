# Decisions — DealRadar (append-only)

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
