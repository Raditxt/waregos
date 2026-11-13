# History

What has happened in this project and what we learned. Newest at the bottom. Decisions with lasting impact are also recorded in `docs/adr/`.

## Phases 0–6 (Sep–Oct 2026)

- Monorepo (Turborepo + npm workspaces), Prisma schema, Fastify REST API, Next.js dashboard.
- JWT auth, login rate limit (5/min), role filtering (cashier never sees buy price), route guards, margin alert.
- Expiry alerts, daily closing with cash reconciliation, activity log, dead-stock detection, price history, customer debt (hutang) integrated in POS.
- Refactor: modules (`audit`, `debt`, `users`, ...), shared response helpers, logger, typed Prisma results, no `any`.
- UI redesign (orange `#f97316` + amber `#f59e0b`, dark/light theme, hover-pin sidebar).
- A Flutter Android app was built in this period and later removed (see 2026-11-02).

## Pre-deploy integrity work (Oct 2026)

- Atomic stock updates in SQL (`updateMany where stock >= qty`), stable product ordering in transactions, idempotency key on checkout, `CHECK (stock >= 0)`.
- Debt ledger rewritten as append-only with `DEBT` / `PAYMENT` / `CANCEL` and a per-customer advisory lock.
- `tokenVersion` on users: deactivate, reset and change-password revoke all sessions. Constant-time login, bcrypt cost 12, passwords 8–72 chars.
- Shop-timezone (WITA, UTC+8) day boundaries in `packages/utils`.

## First production deploy (Oct 2026)

- Database: Supabase (region India, `ap-south-1`), app role `waregos_app` with DML only, `anon`/`authenticated` access revoked.
- API: Railway Hobby, `apps/api/Dockerfile` (3-stage, smoke test at build).
- Web: static export on Cloudflare Pages (`https://waregos.pages.dev`), connected to GitHub.
- Backups: GitHub Actions `db-backup.yml`, daily, read-only `waregos_backup` role, `age` encryption, 90-day retention. Restore drill passed.
- Security: `@fastify/helmet`, CORS allowlist from `CORS_ORIGINS`, trust-proxy as a CIDR list (not `true`) after a VPN test showed a proxy hop being logged as the client IP. 16-check `scripts/security-suite.ps1` all OK. UptimeRobot on `/health` and the web.
- 2026-10-21 Railway security incident: rotated the Supabase DB password, `JWT_SECRET` and the `waregos_app` password, bumped `tokenVersion` for all users, revoked Railway's GitHub App access, 2FA on GitHub, Supabase, Cloudflare and Railway.

## Restock policy, M1 (2026-10-26 to 2026-11-02)

Branch `feat/restock-policy`, merged to `main` as `38117c5`.

- Slice 1: migration `restock_policy_fields` (`PurchaseKind`, `StockAdjustmentReason`, `purchases.kind`, `purchases.supplier_ref`, `purchase_items.expiry_date`, `stock_movements.reason`, `stock_movements.unit_cost`). `prisma migrate dev --create-only` ran twice, so there are two folders with that name; the first (`20261026083052`) is empty. Keep both.
- Slice 2: moving-average cost in one atomic `UPDATE`, opening stock (`OPENING`), expiry per line (`YYYY-MM` = last day of month), supplier by name, supplier reference; purchases admin-only. 21/21 API checks.
- Slice 3: `POST /api/stock/adjustments` (reason + unit cost, never below zero) and `POST /api/stock/cost-corrections` (reason required, writes price history and audit log). Product edit can no longer change stock or buy price. 22/22 checks.
- Slice 4: expiry layers derived from purchase lines (`shared/expiry-layers.ts`), warnings per layer. Pure-function tests plus 12 API checks.
- Slice 5: web — new Purchases page (opening-stock mode, batches, cost/margin preview), stock and cost correction dialogs, expiry chips with write-off, dashboard fetch loop fixed, stock-movement labels fixed. Manual checks 1–9 passed.
- Security fixes found on the way: purchases, dead-stock, purchase-history, stock-movements and top-products are now `adminOnly` (they leaked cost data to cashiers); report query params are validated. 11/11 checks.

## 2026-11-02: mobile app removed

- The Flutter app and the API's mDNS broadcast (`bonjour-service`) were removed. Web is the only client. Tag `mobile-archive` keeps the old code.
- Lesson: `git add -A` after `git rm -r apps/mobile` swept in untracked Flutter build output (162 files, one 75 MB). Use `git add -u` for deletions.
- Lesson: the folder would not delete while Dart, Gradle (java) and adb processes held it.

## 2026-11-02: production migration and accidental web release

- Manual backup run `41410478927` succeeded before touching production.
- First `prisma migrate status` attempts silently hit `localhost:5432` because the connection-string variable was empty and Prisma fell back to `.env`. Lesson: always read the `Datasource` line.
- Applied migrations 13 and 14 to Supabase; verified 14 rows in `_prisma_migrations`, 5 new columns, 2 new enum types.
- Merging `feat/restock-policy` to `main` auto-deployed the new web to Cloudflare while the API was still old. Rolled production back to `922097cf` and turned automatic production deployments off. Lesson: `main` is not production; merging is a release.
- Local CORS failed because `CORS_ORIGINS` was missing from the local API `.env`.
- `npm audit --omit=dev`: nothing that blocks release; plan in `docs/roadmap.md` (`chore/deps`).

## 2026-11-02: hosting decision

- Railway is not on a paid plan; about 12 days of credit left.
- Decided: Hostinger VPS (KVM 1, Indonesia) for the API **and** Postgres, Cloudflare Tunnel instead of open ports, web stays on Cloudflare Pages. See ADR 0005. Dalang.io was considered and rejected for Waregos (shared IPv4 with only port 80, unclear SSH and virtualization), but may host experiments.
- One domain per project; Waregos gets its own domain.
- Until cutover, production receives catalog data only.

## 2026-11-03: moving to Claude Code

- Work moves from chat to Claude Code with the Matt Pocock and Karpathy skill sets. `CLAUDE.md` holds the rules; this file, `docs/roadmap.md` and `docs/adr/` hold the context.

## 2026-11-09: VPS provider and size

- Hostinger dropped: its cheap price needs 12–24 months paid upfront.
- Considered skipping the VPS (wasteful for one project). Decided to share one VPS with TahuHak instead, which makes it cheaper per project than Railway.
- TahuHak's own review showed a 2 GB plan cannot hold both projects safely. Chose Biznet Gio NEO Lite MS 4.2 (2 vCPU, 4 GB, 60 GB, Rp154.290/month incl. VAT). ADR 0005 revised.
- Cost is split between the shop and the other project; details are kept outside the repo.
- No Railway bridge: if the move slips past ~2026-11-14, only catalog entry pauses.

## 2026-11-10: server hardening, repo goes public

- VPS active since 2026-11-09 (Ubuntu 24.04), shared with TahuHak.
- Hardening done: UFW allowing SSH only and enabled at boot, key-only SSH with root login disabled, fail2ban, unattended-upgrades, 2 GB swap, Docker + Compose from Docker's official repository. Compose stack, migrations, DB roles, tunnel and backups are still to do.
- The repo was made public after a `gitleaks` scan of the full history came back clean. From now on no server details (IP, usernames, key names) and no cost split go into the repo.
- README rewritten (UTF-8, WIP status, fixed links).
- Backup workflow artifact retention reduced to 7 days (`9a554d6`); the artifacts are `age`-encrypted, but a public repo should keep as few as possible.

## 2026-11-11: domain and migration plan

- Bought `waregos.com` at Cloudflare Registrar (DNSSEC, WHOIS privacy, auto-renew on). Why `.com`: it renews at the same price every year ($11.17); the cheaper `.app` and `.org` offers were first-year promos only.
- Subdomains: `api.` for the API through Cloudflare Tunnel, `app.` for the web (Cloudflare Pages custom domain, attached at cutover), root and `www.` for an explainer website later, `demo.` for a demo system after v1. No DNS record points at the server's IP. ADR 0005 revised.
- Migration flow: Compose stack on the VPS → dump `public` from Supabase and restore → API live on `api.waregos.com` → backups to R2 with alarm and restore drill → cutover (web on `app.waregos.com`, `CORS_ORIGINS=https://app.waregos.com`, `waregos.pages.dev` kept until stable).
- Extra tickets: `.max()` limits on Zod string/array inputs and an explicit Fastify `bodyLimit`.
- Cutover is gated by working backups and a passed restore drill, not by the domain. Target v1: mid-January 2027, at about 5 hours of work per week. Dates per stage in `docs/roadmap.md`.

## 2026-11-13: deploy, backup and client-IP decisions

- Grilling session (docs only, no `deploy/` files yet). Production Supabase is PostgreSQL 17.11; the VPS pins `postgres:17.<n>` at or above it.
- ADR 0006 (deploy stack): public GHCR images tagged by commit SHA, built from `main`; manual release (backup, migrate, change tag) with expand/contract migrations, otherwise rollback = restore; VPS checkout at the image SHA; four DB roles with default privileges; fixed internal subnet outside Docker's default pool.
- ADR 0007 (backups): host systemd timer every 6 h, plaintext only in tmpfs, existing `age` key, R2 with 30-day bucket lock, healthchecks.io alarm, monthly restore drill on the laptop.
- ADR 0008 (client IP): trust only the internal subnet via `TRUST_PROXY_CIDRS`, production refuses to start without it; `CF-Connecting-IP` only if the proofs fail. Rests on the invariant that the API has no published port.
- Freeze dump moved to 14–15 Nov, right after Railway stops, to avoid Supabase auto-pause.
- Code PRs now go to `main` per phase. `.max()` limits and `bodyLimit` became `.scratch/api-hardening/`, a cutover gate.
