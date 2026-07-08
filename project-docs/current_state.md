# Current State — DealRadar (placeholder name)

_Read this first each session; update it last. The blueprint lives in `foundation.md` — grep it, don't re-read it whole._

**Last updated:** 2026-07-08 (mockup v2 + mascot SIGNED OFF — D7+D8. One open bug:
flying mascot eye, Sonnet session assigned. Next: task 2 scaffold in a fresh session.)

## Phase
**BUILD** (entered 2026-07-08, D6). Foundation + stack + v2 design + mascot all signed
off (D1–D8). Build reference: `mockups/v2-fun-travel.html`.
No code yet — next task is #2 (scaffold) in foundation.md §7.
Separate product from TravelHub — flight search with "is this price good?" verdicts,
affiliate revenue.

## What's locked (see decisions.md)
- D1 affiliate link-out · D2 price-intelligence wedge, 4–6 wk MVP · D3 stack
  (Next.js/Vercel + Python worker/Render + Neon PG + Resend) · D4 search-first hybrid,
  flights only · D5 specific-flights list in results · D6 mockup v1 signed off ·
  D7+D8 v2 design + "Radar" mascot signed off (v2 is the build reference)
- Blueprint: `foundation.md` · Mockups: `mockups/v2-fun-travel.html` (current, D7 pending)
  · `mockups/v1-search-verdict.html` (superseded styling)

## Still open (non-blocking for scaffold)
- Seed market confirmation (assumed SG/SEA outbound), product name + domain

## Blocking revenue (user actions — task 0)
1. Buy domain + set up you@domain email (credibility for affiliate applications)
2. Travelpayouts signup NOW (covers Trip.com, Aviasales, Kiwi, Booking; no traffic
   minimum, pre-launch OK) — then request Trip.com/Aviasales/Kiwi programs inside it
3. Confirm Amadeus key is live (shared with TravelHub; watch quota)
Skyscanner/Booking-direct/Expedia: apply POST-launch only (they reject empty sites).

## Open bug — mockup (assigned to a fresh Sonnet session)
`mockups/v2-fun-travel.html`, hero section: the FLYING mascot's eye pupil is not visible
(perched pose eye is fine). Structure: `<g class="flip">` wraps `<use href="#bird-base"/>`
+ pupil circle (84,48 r6 #231a4f) + highlight + blink-lid circle (80,46 r12.5 #ff7a5c,
opacity="0" + SMIL blink). Already tried: lid base opacity 0, bigger pupil — user reports
still not visible. Suspects to check: `.flip` CSS animation (transform-box:fill-box) on the
group interacting with child rendering; `<use>` + sibling paint order inside animateMotion
group; or the symbol's goggle-strap/wing overdraw at flying scale. Fix the eye only —
don't restyle. Verify with text-based DOM checks; user confirms visually in preview.

## Next session
Task 2 — scaffold: Next.js repo + Python worker, CI, envs, security headers, Neon DB +
drizzle schema, deploys green on Vercel + Render. Read this file + grep foundation.md
§3/§5 only. Will need user accounts: Vercel, Render, Neon, GitHub repo(s).
(Eye-fix Sonnet session can run independently — it only touches the mockup file.)
