# Current State — DealRadar (placeholder name)

_Read this first each session; update it last. The blueprint lives in `foundation.md` — grep it, don't re-read it whole._

**Last updated:** 2026-07-11 (vendor click-out links shipped, D20 — see Next session.)

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

## Next session
**Vendor click-out links — ✅ DONE + VERIFIED LIVE-IN-DEV (2026-07-11, Sonnet session).**
`/go/[provider]` redirect + "Go to deal" CTAs shipped on /deals and /flights/[route],
single vendor (Aviasales) for now — see D20 for the "why not cheapest-of-several-partners"
answer and the real multi-partner backlog item. Styling kept minimal (small pill CTA, no
layout redesign). `next build`/typecheck/lint green; redirect + fallback behavior verified
against a live local dev server (not just code reading).
**NEXT TASK (pick one):** (a) multi-partner price sources for `/go` (D20 backlog — real
build, not started); (b) resume the ON-HOLD items below (v3 mockup feedback, QA/staging);
(c) task 4 deal scoring once ~14 days of history exist (~2026-07-25). Start with
`/faresteal-next` and the state doc will re-propose whichever makes sense at that time.

**ON HOLD (user, 2026-07-11):** (a) v3 cinematic mockup — built, awaiting the user's
batched feedback round (4 sign-off items at the bottom of the mockup + "fare scan" label
reframe); (b) QA/staging setup (Vercel preview deploys per branch + Neon DB branch —
discussed, not yet decided/recorded). Resume both after the fix.

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
