# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

Waregos is a POS and inventory system for one grocery store (Toko Rabay Orange): sales, restock, stock and cost corrections, customer debt (hutang), daily cash closing, reports, and alerts for low stock, near-expiry and dead stock. There are two roles, `ADMIN` and `CASHIER`.

Code comments, commit context and every user-facing message (API `message` fields, UI text) are in **Bahasa Indonesia**. Keep new strings in Indonesian.

## Hard rules

Production is touched only by Raditya, by hand. These rules override any task instruction.

- Never `git push`, merge into `main`, or deploy anything.
- `main` deploys the production web (Cloudflare Pages) automatically whenever auto-deploy is on, and `main` can be ahead of the production API. Never assume `main` equals production.
- Never run commands that reach production or infrastructure: `railway`, `gh workflow run`, `ssh`, `scp`, `cloudflared tunnel`, `wrangler`, `rclone` against a real remote, `docker` against a remote host or context, or any database connection other than localhost.
- The repo is public. Never write server details (IP addresses, usernames, key names, hostnames) or the cost split into the repo.
- Prisma only against localhost. Before any `prisma migrate`, `db:deploy` or `db:seed`, read the `Datasource` line Prisma prints; if it is not `localhost:5432`, stop and report.
- Never read or write `.env` files. `.env.example` files are fine.
- Never put test data into production. Test locally.
- Restock and purchase records are immutable. Fixes go through stock adjustments or cost corrections, never by editing the original records.
- Cashiers must never see cost data (buy price, unit cost, per-product profit). Keep cost endpoints `adminOnly`.

## Current state (read before planning)

`main` is ahead of production. As of 2026-11-12:

- Production web (Cloudflare Pages) is pinned to the pre-restock deployment `922097cf` (commit `eb02d31`). Automatic production deployments are **off**. Never suggest turning them back on before the VPS cutover.
- Production API (Railway) runs the pre-restock code. `POST /api/stock/adjustments` returns 404 there.
- Production database (Supabase) already has all 14 migrations, including the restock-policy columns.
- Until the VPS cutover, production may only receive catalog data (categories and products). No opening stock, purchases, transactions or debts. Railway ends around 2026-11-14 and is not paid, so catalog entry stops until cutover.
- VPS (shared with TahuHak) is running and hardened (2026-11-10). Compose stack, migrations, DB roles, tunnel and backups are not set up yet. Cutover is gated by working backups and a restore drill.
- Domain `waregos.com` is bought (2026-11-11). `api.` = API via Cloudflare Tunnel, `app.` = web (attached at cutover). No DNS record points at the server IP. See ADR 0005.
- VPS migration work happens on branch `chore/vps-migration`; tickets in `.scratch/vps-migration/`.

Roadmap and next steps: `docs/roadmap.md`. What happened so far and why: `docs/history.md`. Final decisions: `docs/adr/`. Update `docs/roadmap.md` when a stage is finished.

## Environment

- Development is on Windows 11 with PowerShell. In Windows PowerShell 5.1, chain commands with `;`, not `&&`.
- Git prints CRLF/LF warnings. A `.gitattributes` normalization is still pending, so do not reformat whole files just to change line endings.

## Commands

npm workspaces + Turborepo, Node >= 22.

```sh
npm install
npm run dev                          # API on :3001 (tsx watch), web on :3000 (next dev)
npm run build                        # api via tsup -> apps/api/dist, web static export -> apps/web/out
npm run lint

# Verification (run before calling a task done)
npm run typecheck -w @waregos/api
cd apps/web; npx tsc --noEmit; cd ../..
npx tsx apps/api/src/shared/expiry-layers.test.ts   # prints "expiry-layers: semua tes lulus"; throws on failure
npx tsx apps/api/src/shared/trust-proxy.test.ts      # prints "trust-proxy: semua tes lulus"; throws on failure
npx tsx apps/api/src/shared/input-limits.test.ts     # prints "input-limits: semua tes lulus"; throws on failure
npx tsx apps/api/src/shared/body-limit.test.ts       # prints "body-limit: semua tes lulus"; throws on failure
npx tsx apps/web/src/lib/config.test.ts              # prints "config: semua tes lulus"; throws on failure

# Database (packages/database; schema at packages/database/prisma/schema.prisma)
npm run db:migrate  -w @waregos/database   # prisma migrate dev (new migration), localhost only
npm run db:deploy   -w @waregos/database   # apply migrations, LOCALHOST ONLY, check Datasource first
npm run db:generate -w @waregos/database
npm run db:seed     -w @waregos/database   # LOCALHOST ONLY; dev creates sample users, SEED_ADMIN_* only with NODE_ENV=production
npm run db:studio   -w @waregos/database
```

**Env.** Copy `apps/api/.env.example` to `apps/api/.env` and `packages/database/.env.example` to `packages/database/.env` (each example documents its variables; full table in `README.md`). The API exits at startup unless `JWT_SECRET` and `DATABASE_URL` are set. `CORS_ORIGINS` is required in every environment for browser access (dev: `http://localhost:3000`); if it is empty, every browser origin is rejected. In production `JWT_SECRET` must be at least 32 characters. `TRUST_PROXY_CIDRS` (comma-separated CIDRs of trusted proxies, ADR 0008) may stay empty in dev (`trustProxy=false`); in production the API exits at startup when it is empty. Prisma also reads `DIRECT_URL`. The web app reads `NEXT_PUBLIC_API_URL` (default `http://localhost:3001/api`), which is baked in at build time.

**Tests.** There is no test runner yet. `*.test.ts` files are plain `node:assert` scripts run with `npx tsx <file>`.

**Clean-room rehearsal** (empty Postgres, migrate, seed, API, all in Docker, API on :3002):

```sh
docker compose -f docker-compose.rehearsal.yml --env-file .env.rehearsal up --build
```

## Architecture

npm workspaces monorepo: `apps/api` (Fastify 5 REST API, Prisma, JWT, Zod), `apps/web` (Next.js 16 static export, client-only), `packages/database` (Prisma schema, migrations, seed), `packages/types`, `packages/utils`, `deploy/` (VPS stack). Full folder map, request flow, domain rules and deploy diagrams (now vs after cutover): **`docs/architecture.md`**. Domain terms: `GLOSSARY.md`.

Rules agents most often need while coding (details in `docs/architecture.md`):

- API module pattern: `*.route.ts` (auth, Zod `safeParse` → `validationError`, audit log) → `*.service.ts` (class taking `PrismaClient`, throws a module error class) → `*.schema.ts`. Response envelope from `shared/response.ts`; new error codes need an Indonesian `message`.
- Auth: `preHandler: [app.authenticate]` or `[app.adminOnly]`. **The role always comes from the DB, not from the token.** Services take the caller's role and null out cost fields for cashiers.
- Stock changes: inside `prisma.$transaction`, atomic SQL updates (never read-modify-write in JS), a `StockMovement` row, then `ActivityService.log`. Customer debt is an append-only ledger with a per-customer advisory lock.
- Web: everything client-side (no server components, route handlers or `next/image`). Use `lib/api.ts` for requests; the API URL comes only from `lib/config.ts`.

## Conventions

- Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`), scoped like `feat(web):` or `fix(api):`. One branch per feature; Raditya merges into `main`.
- New architecture decisions are recorded as ADRs (see Domain docs below).
- Keep diffs focused. No drive-by refactors or reformatting outside the task.

## Open decisions (ask before changing)

- Whether cashiers may see daily profit (`totalProfit` in `/reports/summary` and `/reports/closing`). Currently they can.
- Box/pcs packaging, tiered pricing and Midtrans QRIS are post-v1. Do not start them.

## Agent skills

### Issue tracker

Issues and specs live as local markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`), recorded as `Status:` lines in issue files. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one root `GLOSSARY.md` + `docs/adr/` (created lazily). See `docs/agents/domain.md`.
