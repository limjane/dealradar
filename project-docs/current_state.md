# Current State — DealRadar (placeholder name)

_Read this first each session; update it last. The blueprint lives in `foundation.md` — grep it, don't re-read it whole._

**Last updated:** 2026-07-08 (task 2 scaffold BUILT + verified locally — D9. Deploys
pending user accounts. Mascot-eye bug still with Sonnet session.)

## Phase
**BUILD.** Task 2 (scaffold) code-complete and committed (git repo initialized at
`dealradar/`, branch `main`, conventional commits). Monorepo: `apps/web` (Next 15.5,
TS strict, Tailwind v4, Drizzle schema + initial migration, security headers) +
`worker/` (Python 3.12, uv, poll/score/alert cron stubs, Pydantic models, JSON logs) +
`render.yaml` + GitHub Actions CI. All local gates green; placeholder page + headers
verified in browser preview. See D9 for choices.

## Task 2 exit criteria — remaining (blocked on user accounts)
"Deploys green on Vercel+Render with placeholder page" needs (README has exact steps):
1. **GitHub**: create repo, push `dealradar/` (`git remote add origin … && git push -u origin main`)
2. **Neon**: create project → set `DATABASE_URL` → run `pnpm db:migrate` once
3. **Vercel**: import repo, Root Directory `apps/web`, env `DATABASE_URL`
4. **Render**: Blueprints → connect repo (reads `render.yaml`) → set env vars
Next session verifies deploys, then marks task 2 DONE and starts task 3 (worker polling
— START EARLY: verdicts need ≥14 days of history by launch).

## What's locked (see decisions.md)
- D1 affiliate link-out · D2 price-intelligence wedge · D3 stack · D4 search-first,
  flights only · D5 specific-flights list · D6–D8 design + "Radar" mascot (v2 mockup =
  build reference) · D9 scaffold choices (monorepo, pnpm, versions, CSP posture)
- Blueprint: `foundation.md` · Mockup: `mockups/v2-fun-travel.html`

## Still open (non-blocking)
- Seed market confirmation (assumed SG/SEA outbound), product name + domain
- Task 0 user actions: domain+email, Travelpayouts signup, Amadeus key confirmation

## Open bug — mockup (assigned to a fresh Sonnet session)
`mockups/v2-fun-travel.html`, hero: FLYING mascot's eye pupil not visible (perched pose
fine). Structure: `<g class="flip">` wraps `<use href="#bird-base"/>` + pupil (84,48 r6)
+ highlight + blink-lid (opacity 0 + SMIL). Tried: lid opacity 0, bigger pupil. Suspects:
`.flip` transform-box/fill-box animation vs child rendering; `<use>` sibling paint order
in animateMotion group; goggle-strap overdraw at flying scale. Fix eye only.

## Next session
Verify deploys (user does account steps above first) → task 2 DONE → task 3: worker
Amadeus polling → `price_snapshots` for 10 test routes. Read this file + grep
foundation.md §2/§3 (providers + data flow). Local dev note: pnpm via
`corepack pnpm@9.15.0 …` (no global pnpm); uv via `python -m uv …`.
