# Current State — DealRadar (placeholder name)

_Read this first each session; update it last. The blueprint lives in `foundation.md` — grep it, don't re-read it whole._

**Last updated:** 2026-07-10 (deploys mostly live; provider pivot D10; task 3 code-complete + DB path verified, live poll pending token.)

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

## Travelpayouts review (D12)
Rejected while site was the placeholder ("under construction"). Real landing page now live
→ **resubmit the project for review** once Vercel finishes redeploying. NOTE: the **Data API
token** (for polling) is issued from Developers/API and is NOT gated on this review — grab it
independently. The affiliate/marker (25 programs incl. Trip.com) is what needs the approval.

## Blocking — user actions
1. **Travelpayouts account (DealRadar's OWN — separate from TravelHub)**: sign up at
   travelpayouts.com → Developers → copy API token → put in `.env` as `TRAVELPAYOUTS_TOKEN`.
   Resubmit project for review now that the landing page is real (D12).
2. **Render env fix**: in Render dashboard, delete the 3 fake `AMADEUS_*` vars on both
   cron services, add `TRAVELPAYOUTS_TOKEN` (real). (render.yaml already reflects this for
   future syncs.) Push the updated render.yaml too so the blueprint matches.
3. Push the doc/env/yaml changes from this session to GitHub (not yet committed).

## Task 3 — worker polling — CODE-COMPLETE, live run pending token
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
