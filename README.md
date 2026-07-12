# DealRadar

<!-- Test branch for staging/QA setup verification (2026-07-12) -->

Flight search with price-intelligence verdicts. Monorepo:

- `apps/web` — Next.js 15 (App Router, TS strict) on **Vercel**. Pages, `/api`, `/go` redirect. Owns the DB schema (Drizzle).
- `worker/` — Python 3.12 cron jobs on **Render** (`poll.py`, `score.py`, `alert.py`). `uv` + `ruff` + Pydantic.
- Both connect to one **Neon Postgres**.

Blueprint: `project-docs/foundation.md` · state: `project-docs/current_state.md` · decisions: `project-docs/decisions.md`.

## Local dev

```bash
corepack enable                      # once, or install pnpm globally
pnpm install
cp .env.example apps/web/.env.local  # fill DATABASE_URL (Neon dev branch)
pnpm dev                             # web on :3000
pnpm typecheck && pnpm lint          # what CI runs

cd worker
uv sync
uv run pytest
uv run python poll.py                # needs DATABASE_URL in env
```

## DB migrations (Drizzle — never edit DB by hand)

```bash
# edit apps/web/lib/db/schema.ts, then:
pnpm db:generate     # writes SQL to apps/web/drizzle/ — commit it
pnpm db:migrate      # applies to $DATABASE_URL
```

Schema changes must update `worker/models.py` in the same commit.

## Deploy (git push = deploy; no manual deploys)

| Piece | Where | Setup |
|---|---|---|
| Web | Vercel | Import repo → Root Directory `apps/web` → env `DATABASE_URL` |
| Worker | Render | Blueprints → connect repo (reads `render.yaml`) → set env vars |
| DB | Neon | Create project → run `pnpm db:migrate` once → use pooled URL |

CI (GitHub Actions) gates every push: typecheck + lint + build (web), ruff + pytest (worker).
