# DealRadar — Foundation Document

_Authored by Fable 5, 2026-07-08. This is the expert blueprint. Build sessions (Opus/Sonnet)
read `current_state.md` first, then grep THIS file for the relevant section only — never re-read it whole._

Working name **DealRadar** is a placeholder (like "TravelHub" was). Rebrand pre-launch.

---

## 1. STRATEGY

**Positioning:** "Search anywhere else, check here before you pay." **Search-first hybrid**
(pivoted 2026-07-08, D4): customer searches a route/dates → we return live prices across
providers ranked by total price, each with a **verdict badge** ("18% below normal — grab it"
/ "high right now — set an alert") computed from our own price-history data. Deals feed and
email alerts are secondary surfaces feeding the retention loop. Monetized via affiliate
link-out. We do NOT compete with Trip.com on breadth — we beat every metasearch on one
question they can't answer: *is this price actually good?*

**The flywheel:** every user search also writes a price snapshot → our history dataset
grows with traffic → verdicts get sharper → more reason to check here first. Routes with
<14 days of history show "not enough history yet — watch this route" → email capture.

**Why this wins vs Trip.com/Skyscanner:**
- OTAs are transactional (visit → book → leave). A deals engine is habitual (daily feed,
  email alerts) — repeat traffic without paid acquisition.
- Deals are inherently shareable → organic/viral distribution.
- Price-history pages are programmatic-SEO gold: thousands of indexable route pages
  ("Singapore to Tokyo flight price history") that OTAs don't build well.

**Revenue model:** Affiliate commissions on click-out. Every outbound link carries our
affiliate ID. Revenue metrics: EPC (earnings per click), click-out rate, email list size.

**Relationship to TravelHub (complementary, keep separate products):**
- Shared asset #1: the **price-snapshot dataset** this product collects daily is exactly
  what TravelHub's Price Guardian and buy-or-wait meters need. Same Postgres schema family.
- Shared asset #2: same Amadeus account/key (watch quota), same stack knowledge, same
  Render/Vercel ops.
- Later: cross-promotion (DealRadar email list → TravelHub launch audience, and vice versa).
- Do NOT merge codebases. Two repos, shared learnings only. Merging would slow both.

**MVP scope — IN (4–6 weeks):**
1. **Search (the core):** origin/destination/dates → live prices (cached, see §3) →
   route-level verdict badge on top + **specific-flights list** (airline, flight no.,
   times, stops; direct-only filter; sort by price/duration) → affiliate deep links out.
   Per-itinerary cross-provider price comparison (true Skyscanner parity) is phase 2 —
   at MVP each flight links out at its quoted total price.
2. Route pages with 60-day price-history chart + "is now cheap?" verdict (SEO surface).
3. Flight deals feed: scored, ranked, auto-expiring deals on ~50 seed routes (secondary).
4. Email alerts: double opt-in, daily digest + instant alert + "watch this route" capture.
5. Affiliate link-out with click tracking (our own click log = revenue accounting).

**MVP scope — OUT (explicitly deferred):**
- Hotels (phase 2 — flight prices are more volatile, better verdict content).
- Car rentals (phase 3 or never — lowest commission and volume of the three; revisit on data).
- User accounts (email address only; magic-link accounts in phase 2).
- Payments/bookings, mobile app, i18n, AI features (phase 2: AI deal write-ups).

**Open strategy items (user to confirm, non-blocking to start scaffold):**
- Home market → seed route list (assumed SG/SEA outbound; confirm).
- Real product name + domain.

---

## 2. DATA PROVIDERS & AFFILIATES  ⚠ verify current terms at build time (my knowledge is early-2025)

| Purpose | Primary | Notes |
|---|---|---|
| Flight price polling | Amadeus Self-Service API | Free tier; same account as TravelHub — monitor shared quota; upgrade to pay-as-you-go if polling 50 routes×daily exceeds it |
| Affiliate deep links | Travelpayouts network | Aggregates Trip.com, Aviasales, Kiwi, Booking et al; one signup, many programs; instant-ish approval |
| Secondary affiliates | Skyscanner (via Impact), Booking direct, Expedia | Apply POST-launch only — they reject empty/new sites. Travelpayouts covers MVP revenue alone |
| Email | Resend | Generous free tier, first-class DX, React email templates |

**Rule:** all provider calls go through one `providers/` adapter layer (interface per
capability: `PriceSource`, `DeepLinkBuilder`). Swapping Amadeus→Travelpayouts data API later
must touch only the adapter.

---

## 3. ARCHITECTURE

**Proposed stack (needs user sign-off — see decisions.md D3):**

```
┌─ Vercel ──────────────────────────┐   ┌─ Render ─────────────────┐
│ Next.js 15 (App Router, TS)       │   │ Python worker (no HTTP)  │
│ • all pages (RSC, mostly static)  │   │ • price polling (cron)   │
│ • /api: search, subscribe, /go    │   │ • deal scoring            │
│   click-tracking redirect         │   │ • alert dispatch → Resend │
└──────────────┬────────────────────┘   └────────────┬─────────────┘
               └───────────► Neon Postgres ◄─────────┘
```

- **Next.js on Vercel** — one deployable for everything user-facing. Route pages are
  statically generated + ISR (revalidate hourly): near-zero cost, instant loads, SEO-perfect.
- **Python worker on Render** (background worker, not a web service) — polling 50+ routes,
  scoring, sending alerts. Long-running jobs don't fit Vercel's serverless limits.
  Python because it mirrors TravelHub's FastAPI skills and Amadeus SDK use.
- **Neon Postgres** — serverless PG, generous free tier, branching for dev. Single DB,
  both apps connect. (Alternative: Render PG to keep one vendor; Neon preferred for
  branching + scale-to-zero.)
- **No queue/Redis/microservices at MVP.** A cron loop + Postgres is enough. Add a queue
  only when alert volume demands it.

**Data flow (search path — the core):** user searches → check `search_cache` (TTL 30–60 min
per route+dates) → on miss, live Amadeus call → results ranked by total price + verdict badge
computed against `price_snapshots` rolling median → every live result ALSO written to
`price_snapshots` (search traffic feeds the flywheel) → click `/go/:id` logs + 302s to
affiliate URL. **Caching is a cost control, not an optimization** — uncached search traffic
burns paid quota linearly; the cache + snapshot reuse keeps unit economics sane.

**Data flow (background path):** worker polls seed routes daily → `price_snapshots` →
scorer vs rolling median → upserts `deals` → feed/route pages via ISR → alert emails.

**Core schema (drizzle-managed, final naming at build):**
- `routes` (origin, destination, active, seed_priority)
- `price_snapshots` (route_id, travel_month, cabin, price, currency, source, fetched_at)
  — append-only; partition by month if it grows
- `deals` (route_id, price, baseline_median, discount_pct, score, deep_link_params,
  status: active/expired, first_seen, expires_at)
- `search_cache` (route_id, dates, results_json, fetched_at) — short-TTL; prune nightly
- `subscribers` (email, status: pending/confirmed/unsubscribed, routes_filter, tokens)
- `clicks` (deal_id nullable, target, subscriber_id nullable, ts, ua_hash) — revenue accounting

**Deal scoring v1 (keep dumb, tune later):**
`discount_pct = (median_60d − current) / median_60d` per route+travel-month.
Publish ≥15%, instant-alert ≥30%, require ≥14 days of history first, expire when price
rebounds above 10% or after 48h unrefreshed. Log every scoring decision (explainability
+ future ML training data).

---

## 4. SECURITY (proportional — no payments, minimal PII)

1. **Secrets:** env vars only (Vercel/Render dashboards). `.env` gitignored, `.env.example`
   committed. Never in code or docs.
2. **Input validation at every boundary:** Zod on all API routes and forms (Next),
   Pydantic on worker inputs. Reject, don't sanitize.
3. **The `/go` redirect is the #1 abuse surface:** never redirect to arbitrary URLs —
   only to server-built affiliate URLs looked up by deal/route ID. Prevents open-redirect
   phishing that would also poison SEO.
4. **Email compliance (PDPA/GDPR):** double opt-in mandatory, one-click unsubscribe in
   every email, store consent timestamp. Email is our only PII — treat the subscribers
   table as the crown jewels; no PII in logs.
5. **Rate limiting:** on subscribe + search APIs (Vercel-friendly: `@upstash/ratelimit`
   or simple PG-based counter at MVP). Stops list-bombing and quota burn.
6. **Headers:** CSP, HSTS, X-Frame-Options via `next.config` — one-time setup, do in scaffold.
7. **Supply chain:** Dependabot on, lockfiles committed, no packages with <1k weekly
   downloads without a stated reason in decisions.md.
8. **DB:** least-privilege roles (site = read-mostly + subscribe/click writes; worker =
   write). Parameterized queries only (ORM enforces this).

---

## 5. CODING STANDARDS & BEST PRACTICES (binding for build sessions)

**TypeScript/Next:**
- `strict: true`. Server Components by default; `"use client"` only for interactivity
  (chart, search form). Zero client-side data fetching for page content.
- Zod schemas in `lib/schemas/` are the single source of types (`z.infer`) — one
  definition for validation + typing.
- Drizzle ORM + migrations committed to repo. Never edit DB by hand.
- UI: Tailwind + shadcn/ui. No custom design system, no CSS files. Mockup sign-off
  before UI code (standing rule).

**Python worker:**
- One entrypoint per job (`poll.py`, `score.py`, `alert.py`), pure functions inside,
  orchestrated by Render cron. `uv` for deps, `ruff` for lint+format, type hints + Pydantic
  models mirroring the DB schema.

**Both:**
- Small modules by domain (`deals/`, `providers/`, `email/`) not by layer.
- Structured logging (JSON) from day one; every worker run logs a summary line
  (routes polled, snapshots written, deals created/expired, alerts sent) — this IS the ops
  dashboard at MVP.
- Testing strategy: few high-value tests, not coverage theater. Must-test: deal scoring
  (pure function — table-driven tests), `/go` redirect safety, subscribe flow validation,
  provider adapters against recorded fixtures. Skip: UI snapshot tests.
- CI: GitHub Actions — typecheck + lint + tests on every push. Deploy = git push
  (Vercel/Render auto-deploy from main). No manual deploys.
- Conventional commits; `decisions.md` append for anything deviating from this doc.

**Token-discipline build protocol (how Opus/Sonnet must work):**
1. Read `current_state.md` + grep this file for the one relevant section.
2. One build-plan task per session (see §7). Update `current_state.md` + `decisions.md`
   at session end. Stop.
3. Verify in real browser preview (text-based checks, no screenshots) before claiming done.

---

## 6. DESIGN DIRECTION (mockup before code, per standing rule)

- **Home page = search box, front and center** (Google-simple). Results answer-first, like
  TravelHub's signed-off v2 style: verdict badge leads ("$312 — 38% below normal, grab it"),
  then price-history sparkline, then providers ranked by total price, then CTA.
- Routes without enough history: honest "no verdict yet" + "watch this route" email capture.
- Feed = single column, mobile-first (deal browsing is a phone habit). Route pages =
  chart + verdict + live prices + FAQ block (SEO).
- Fast over fancy: static-first pages, system fonts, no hero animations. Lighthouse ≥95
  is a launch gate — speed is an SEO ranking factor and a positioning statement.
- First build task includes an HTML mockup (feed + route page + email template) for
  sign-off before any app code.

---

## 7. BUILD PLAN — one session each, in order

| # | Task | Exit criteria |
|---|---|---|
| 0 | User actions (parallel, start NOW) | Travelpayouts + Skyscanner affiliate applications submitted; Amadeus key confirmed; name/domain chosen; seed market confirmed |
| 1 | HTML mockup: search + results w/ verdict badges, route page, feed, alert email | User sign-off recorded in decisions.md |
| 2 | Scaffold: Next repo + worker repo(s), CI, envs, security headers, Neon DB + drizzle schema | Deploys green on Vercel+Render with placeholder page |
| 3 | Worker: Amadeus polling → `price_snapshots` for 10 test routes — **start early; verdicts need ≥14 days of history by launch** | Snapshots visible in DB two consecutive days |
| 4 | Worker: scoring + verdict function (shared by search & feed; table-driven tests pass) | Deals appear/expire correctly on test data |
| 5 | **Search (core):** search page → cached live prices → verdict badge + specific-flights list (airline/times/stops, direct-only filter, price/duration sort) → `/go` click-tracked redirect | Real search→verdict→flight list→click-out verified in browser; redirects only to whitelisted builders; cache hit-rate logged |
| 6 | Site: route pages + price-history chart, sitemap | 50 routes statically generated, indexed-ready |
| 7 | Site: deals feed page (ISR) from `deals` | Live feed renders real deals, Lighthouse ≥95 |
| 8 | Email: double opt-in + "watch this route" + daily digest + instant alerts via Resend | Full loop tested to a real inbox |
| 9 | Launch pass: analytics (Plausible), OG images, robots/meta, error monitoring (Sentry), legal pages (privacy, terms, affiliate disclosure — required by affiliate programs), seed all 50 routes | Public launch checklist green; then apply to Skyscanner/Impact + Booking direct (they reject pre-launch sites) |

Phase 2 backlog (post-revenue): hotels vertical (Hotellook/Booking affiliates),
per-itinerary cross-provider price comparison (Travelpayouts data API — true Skyscanner
parity), AI deal write-ups (Anthropic key), magic-link accounts + per-route watchlists,
fare-error detection, TravelHub cross-promo, social auto-posting of top deals.
Phase 3 (data-dependent): car rentals.

---

## 8. RISKS

1. **Affiliate approval lag** — the only revenue blocker. Mitigation: task 0 today.
2. **Amadeus free-tier quota shared with TravelHub** — monitor from task 3; budget for
   pay-as-you-go (~cheap) rather than engineering around it.
3. **SEO takes months** — expected. Email list + shareable deals are the interim growth
   loop; judge MVP on click-outs and list growth, not organic traffic.
4. **Price display accuracy** — always timestamp prices ("as of 2h ago") and verify on
   click-through page; stale-price complaints kill trust fastest.
5. **This is a known, crowded playbook** (Going, Secret Flying) — our edge is regional
   focus (SEA seed routes) + route-level price-history pages, which most deal sites lack.
