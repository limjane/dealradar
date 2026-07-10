# Current State — DealRadar (placeholder name)

_Read this first each session; update it last. The blueprint lives in `foundation.md` — grep it, don't re-read it whole._

**Last updated:** 2026-07-10 (deploys mostly live; price provider pivoted Amadeus→Travelpayouts — D10.)

## Phase
**BUILD.** Task 2 (scaffold + deploy) all but done. Live services:
- ✅ **GitHub**: `git@github.com:limjane/dealradar` (SSH; HTTPS PAT lacked `workflow` scope). `main` pushed.
- ✅ **Neon**: project `dealradar` in ap-southeast-1; migration applied; all 6 tables verified. Pooled `DATABASE_URL` in `.env` (gitignored).
- ✅ **Vercel**: https://dealradar-web-chi.vercel.app — placeholder page live, all 6 security headers verified (CSP/HSTS/nosniff/frame-deny). Root Dir `apps/web`, `DATABASE_URL` set.
- 🟡 **Render**: blueprint deployed from `render.yaml`, builds green. BUT env still has **fake Amadeus vars** — must be swapped (see below). Crons only fire 21:00 UTC daily, so nothing has run yet.

## ⚠ Provider pivot — D10 (price source: Amadeus → Travelpayouts Data API)
**Amadeus Self-Service portal is decommissioned 2026-07-17** (7 days out). Whole price
layer moved to **Travelpayouts Data API** (`/v1/prices/calendar`), which is ALSO our
affiliate network — one token for both. Env changed: `AMADEUS_*` → `TRAVELPAYOUTS_TOKEN`
(+ `TRAVELPAYOUTS_MARKER` later). `.env`, `.env.example`, `render.yaml` all updated.
Data is aggregated/cached, not live — fine for a deals/price-history engine. Full
rationale + endpoint fit in decisions.md D10.

## Blocking — user actions
1. **Travelpayouts account (DealRadar's OWN — separate from TravelHub)**: sign up at
   travelpayouts.com → Developers → copy API token → put in `.env` as `TRAVELPAYOUTS_TOKEN`.
2. **Render env fix**: in Render dashboard, delete the 3 fake `AMADEUS_*` vars on both
   cron services, add `TRAVELPAYOUTS_TOKEN` (real). (render.yaml already reflects this for
   future syncs.) Push the updated render.yaml too so the blueprint matches.
3. Push the doc/env/yaml changes from this session to GitHub (not yet committed).

## Task 3 — worker polling (reworked around Travelpayouts)
Goal unchanged: daily poll → `price_snapshots` for 10 test SG-outbound routes (SIN→BKK,
DPS, HKG, TPE, ICN, NRT, MNL, SYD, LHR, PER). New shape:
- `providers/PriceSource` adapter wraps Travelpayouts `GET /v1/prices/calendar`
  (X-Access-Token header; per route, pull cheapest fare/day for next ~3 travel months).
- One `price_snapshots` row per route×travel-month (or ×day — decide at build; calendar
  returns per-day). ~30–90 rows/day; well under 10 req/s.
- Build + verify pipeline works with a real token, then let daily history accrue.
- **14-day history is a launch gate but too short for seasonality — beta-launch plan:**
  ship basic "cheaper than rolling median" verdict, collect 30–60 days real data in beta,
  upgrade to percentile/seasonal scoring post-launch. START EARLY (history has to accrue).

## What's locked (see decisions.md)
- D1 affiliate link-out · D2 price-intelligence wedge · D3 stack · D4 search-first, flights
  only · D5 specific-flights list · D6–D8 design + "Radar" mascot · D9 scaffold choices ·
  **D10 price source = Travelpayouts Data API (replaced Amadeus)**
- Blueprint: `foundation.md` · Mockup: `mockups/v2-fun-travel.html`

## Still open (non-blocking)
- Seed market confirmation (assumed SG/SEA outbound), product name + domain
- Neon password is in this session's chat history — rotate before real launch (non-urgent).

## Open bug — mockup (assigned to a fresh Sonnet session)
`mockups/v2-fun-travel.html`, hero: FLYING mascot's eye pupil not visible (perched pose
fine). See prior notes — fix eye only.

## Next session
User does the 3 blocking actions above → I commit/push session changes → verify Render
cron runs against real Travelpayouts token → task 2 DONE → build task 3. Local dev note:
pnpm via `corepack pnpm@9.15.0 …` (no global pnpm); migration needs root `.env` loaded
(the `&` in DATABASE_URL breaks shell sourcing — export it quoted).
