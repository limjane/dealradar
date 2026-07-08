# Decisions — DealRadar (append-only)

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
