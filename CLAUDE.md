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

# Database (packages/database; schema at packages/database/prisma/schema.prisma)
npm run db:migrate  -w @waregos/database   # prisma migrate dev (new migration), localhost only
npm run db:deploy   -w @waregos/database   # apply migrations, LOCALHOST ONLY, check Datasource first
npm run db:generate -w @waregos/database
npm run db:seed     -w @waregos/database   # LOCALHOST ONLY; needs SEED_ADMIN_USERNAME / SEED_ADMIN_PASSWORD
npm run db:studio   -w @waregos/database
```

**Env.** Copy `apps/api/.env.example` to `apps/api/.env`. The API exits at startup unless `JWT_SECRET` and `DATABASE_URL` are set. `CORS_ORIGINS` is required in every environment for browser access (dev: `http://localhost:3000`); if it is empty, every browser origin is rejected. In production `JWT_SECRET` must be at least 32 characters. Prisma also reads `DIRECT_URL`. The web app reads `NEXT_PUBLIC_API_URL` (default `http://localhost:3001/api`), which is baked in at build time.

**Tests.** There is no test runner yet. `*.test.ts` files are plain `node:assert` scripts run with `npx tsx <file>`.

**Clean-room rehearsal** (empty Postgres, migrate, seed, API, all in Docker, API on :3002):

```sh
docker compose -f docker-compose.rehearsal.yml --env-file .env.rehearsal up --build
```

## Architecture

```
apps/api           Fastify 5 REST API (Prisma, JWT, Zod)
apps/web           Next.js 16 / React 19 client-only dashboard, `output: 'export'` (static, Cloudflare Pages)
packages/database  Prisma schema, migrations, seed
packages/types     Shared DTOs / JwtPayload between api and web
packages/utils     Shared helpers (shop-timezone date boundaries, invoice numbers)
```

The workspace packages ship raw TypeScript (`main: ./src/index.ts`) and are never built on their own. tsup bundles `@waregos/*` into `apps/api/dist/index.js` (`noExternal`), and Next compiles them for the web app.

Deployment today: the API runs from `apps/api/Dockerfile` on Railway (`railway.json`, healthcheck `GET /health`), the database is on Supabase, and a daily encrypted backup runs in `.github/workflows/db-backup.yml`. Moving the API and Postgres to a VPS (Docker Compose + Cloudflare Tunnel) is planned before v1 go-live; see `docs/adr/0005-vps-colocated-postgres-cloudflare-tunnel.md`.

### API (`apps/api/src`)

- `index.ts` validates env first, then registers plugins (`prisma`, helmet, `jwt`, `cors`, rate-limit with `global: false`), then mounts each module under `/api/<name>`.
- `modules/<name>/` follows `*.route.ts` (HTTP, auth, Zod parse, audit log) -> `*.service.ts` (a class taking `PrismaClient`, holding the business logic) -> `*.schema.ts` (Zod). Routes call `schema.safeParse` and return `validationError(...)` on failure. Services throw a module-specific error class (e.g. `StockError`, `PurchaseError`), which the route maps to a 400 with a specific error code. Anything else goes to `shared/error-handler.ts`.
- Response envelope (`shared/response.ts`): `{ success: true, data, message? }`, `{ success: true, data, meta }` for paginated results, `{ success: false, error: CODE, message }` for errors. The web `getErrorMessage` in `apps/web/src/lib/api.ts` shows the backend `message` first, then falls back to its own error-code map, so new error codes need a good Indonesian `message`.
- Auth (`plugins/jwt.ts`): use `preHandler: [app.authenticate]` or `[app.adminOnly]`. Every request re-reads the user from the DB. The token is rejected when the account is inactive or `tokenVersion` no longer matches the token's `tv` claim (bumping it revokes sessions after a password change or reset). **The role always comes from the DB, not from the token.**
- Cost visibility: services take the caller's role (e.g. `new ProductsService(prisma, payload.role)`) and null out `buyPrice` and cost-derived fields for non-admins. Purchases, stock movements, top products, dead stock, price history and purchase history are `adminOnly`.
- Stock changes run inside `prisma.$transaction`, update stock atomically in SQL (never read-modify-write in JS), and write a `StockMovement` row with `stockBefore`, `stockAfter` and, for restocks and adjustments, `unitCost`. Routes then write an `ActivityLog` entry through `ActivityService.log`.
- Restock costing is a moving weighted average computed in one SQL `UPDATE`. Purchases have a `kind`: `PURCHASE` (real spending) or `OPENING` (opening stock, not counted as spending).
- Expiry is tracked per purchase line. `shared/expiry-layers.ts` allocates current stock across batches newest-first (oldest sold first); stock not covered by any batch is reported as `untracked`.
- Customer debt (`shared/debt-ledger.ts`) is an append-only ledger. The balance is the signed sum of `DEBT` (+), `PAYMENT` (-) and `CANCEL` (-, a reversing entry) rows, keyed by the normalized, case-insensitive customer name. Writes take `pg_advisory_xact_lock` on that customer inside the transaction.

### Web (`apps/web/src`)

- App Router with one folder per screen (`pos`, `products`, `purchases`, `debts`, `closing`, `reports`, `audit`, `users`, `dashboard`). Each screen's `layout.tsx` wraps it in `AppShell`. Everything renders client-side because of the static export: no server components, route handlers or `next/image` optimization.
- `lib/api.ts` is the shared axios instance. It attaches the bearer token from `localStorage` (`waregos_token`) and handles 401 globally (toast and redirect to login). `lib/store.ts` is the zustand auth store.
- UI is shadcn/ui (`components/ui`) + Tailwind v4, Recharts for charts, sonner for toasts. The sidebar hides admin screens via `user.role === 'ADMIN'`, but the real enforcement is server-side.

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
