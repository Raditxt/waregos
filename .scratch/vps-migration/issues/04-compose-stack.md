# 04 — Compose stack, role bootstrap, migrate profile

Status: ready-for-agent
Type: task
Blocked by: 02
Stage: 2
ADR: 0006, 0008

## What

Create `deploy/` (first files there; allowed from this ticket on).

- `deploy/compose.yaml`, project name `waregos`:
  - `db`: `postgres:17.<n>-bookworm` (≥ 17.11, tag in one variable shared with ticket 05), no published port, `shared_buffers=192MB`, `max_connections=30`, `mem_limit` 768 MB, healthcheck, data volume.
  - `api`: `ghcr.io/<owner>/<image>:${API_IMAGE_TAG}`, **no published port**, `mem_limit` 384 MB, `NODE_OPTIONS=--max-old-space-size=256`, `TRUST_PROXY_CIDRS=10.89.10.0/24`, `DATABASE_URL` as `waregos_app`, healthcheck on `/health` (as in the rehearsal file).
  - `cloudflared`: remotely-managed tunnel, token from env, `mem_limit` 128 MB.
  - `migrate` under profile `ops`: same API image, `prisma migrate deploy` as `waregos_owner`. No seed.
  - Network with fixed subnet `10.89.10.0/24`.
  - **No `logging:` key** (the daemon config handles it).
- `deploy/.env.example`: every variable with a placeholder and an Indonesian comment, including `API_IMAGE_TAG` with a commented "previous tag" line.
- `deploy/sql/bootstrap-roles.sql`: roles `waregos_owner`, `waregos_app`, `waregos_backup`, **no passwords** (set with `\password` by hand); `waregos_owner` owns the database/schema; `waregos_backup` gets `USAGE` on schema + `SELECT` on tables and sequences; `ALTER DEFAULT PRIVILEGES FOR ROLE waregos_owner` for app (DML on tables, usage on sequences) and backup (select).
- `deploy/README.md` (Indonesian): layout on the VPS (`/srv/waregos/.env`, `/srv/waregos/repo` checked out at the image SHA), release checklist (manual backup → migrate → change tag → `pull && up -d`), rollback rule (expand/contract; otherwise rollback = restore). No server details.

## Acceptance

- [ ] On the laptop with a local `.env`: `db` up, bootstrap SQL applied, latest backup (decrypted) restored **as `waregos_owner`**, `migrate` profile reports 14 applied, `api` healthy using a locally built image tag.
- [ ] As `waregos_app`: SELECT/INSERT work, `CREATE TABLE` and `DROP` fail.
- [ ] As `waregos_backup`: SELECT works, INSERT fails.
- [ ] A table created by `waregos_owner` after bootstrap is readable by app and backup without extra grants.
- [ ] `docker compose config` shows no published ports for `db` and `api`.
- [ ] Prisma CLI runs inside the runtime image.
- [ ] Datasource line of every Prisma command checked to be local.

## Comments
