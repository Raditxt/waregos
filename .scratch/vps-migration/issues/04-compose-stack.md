# 04 — Compose stack, role bootstrap, migrate profile

Status: resolved
Type: task
Blocked by: —
Stage: 2
ADR: 0006, 0008

## What

Create `deploy/` (first files there; allowed from this ticket on).

- `deploy/compose.yaml`, project name `waregos`:
  - `db`: `postgres:17.<n>-bookworm` (≥ 17.11, tag in one variable shared with ticket 05), no published port, `shared_buffers=192MB`, `max_connections=30`, `mem_limit` 768 MB, healthcheck, data volume.
  - `api`: `ghcr.io/<owner>/<image>:${API_IMAGE_TAG}`, **no published port**, `mem_limit` 384 MB, `NODE_OPTIONS=--max-old-space-size=256`, `TRUST_PROXY_CIDRS=10.89.10.0/24`, `DATABASE_URL` as `waregos_app`, healthcheck on `/health` (as in the rehearsal file).
  - `cloudflared`: remotely-managed tunnel, token from env, `mem_limit` 128 MB.
  - `migrate` under profile `ops`: same API image, `prisma migrate deploy` as `waregos_owner`. No seed.
  - Network with fixed subnet `10.89.10.0/24`, joined only by `db`, `api`, `backup`, `cloudflared` (ADR 0008 invariant 2).
  - `TRUST_PROXY_CIDRS` is set already; the current API image ignores it until ticket 02 lands, so the stack can be built and rehearsed before 02.
  - **No `logging:` key** (the daemon config handles it).
- `deploy/.env.example`: every variable with a placeholder and an Indonesian comment, including `API_IMAGE_TAG` with a commented "previous tag" line.
- `deploy/sql/bootstrap-roles.sql`: roles `waregos_owner`, `waregos_app`, `waregos_backup`, **no passwords** (set with `\password` by hand); `waregos_owner` owns the database/schema; `waregos_backup` gets `USAGE` on schema + `SELECT` on tables and sequences; `ALTER DEFAULT PRIVILEGES FOR ROLE waregos_owner` for app (DML on tables, usage on sequences) and backup (select).
- `deploy/README.md` (Indonesian): layout on the VPS (`/srv/waregos/.env`, `/srv/waregos/repo` checked out at the image SHA), release checklist (manual backup → migrate → change tag → `pull && up -d`), rollback rule (expand/contract; otherwise rollback = restore). No server details.

## Acceptance

- [x] On the laptop with a local `.env`: `db` up, bootstrap SQL applied, latest backup (decrypted) restored **as `waregos_owner`**, `migrate` profile reports 14 applied, `api` healthy using a locally built image tag.
- [x] As `waregos_app`: SELECT/INSERT work, `CREATE TABLE` and `DROP` fail.
- [x] As `waregos_backup`: SELECT works, INSERT fails.
- [x] A table created by `waregos_owner` after bootstrap is readable by app and backup without extra grants.
- [x] `docker compose config` shows no published ports for `db` and `api`.
- [x] Prisma CLI runs inside the runtime image.
- [x] Datasource line of every Prisma command checked to be local.

## Comments

- 2026-11-15 (dari VM-01): restore dump (`--schema=public`) ke database kosong harus
  menerima **tepat satu** error, `schema "public" already exists`; error lain berarti
  restore gagal. Bootstrap role wajib `GRANT CREATE ON SCHEMA public TO waregos_owner`,
  kalau tidak restore sebagai `waregos_owner` gagal membuat tabel.
- 2026-11-16 (selesai): diuji manual oleh Raditya di laptop, Docker Desktop,
  `postgres:17.11-bookworm`, image API dibangun lokal. Hasil:
  - `bootstrap-roles.sql` jalan tanpa error; role `waregos_owner`/`waregos_app`/`waregos_backup`
    tanpa atribut khusus.
  - Restore freeze dump VM-01 sebagai `waregos_owner`: tepat satu error,
    `schema "public" already exists`.
  - Hitung baris sebagai `waregos_backup` (tabel dibuat owner setelah bootstrap, terbaca tanpa
    grant tambahan): users 1, categories 9, units 7, products 18, activity_logs 77,
    _prisma_migrations 14. Sama dengan Supabase.
  - `--profile ops run --rm migrate`: Datasource `db:5432`, 14 migrations, no pending. Ini
    membuktikan Prisma CLI ada di image runtime dan password owner benar.
  - `api` healthy (`/health` menjalankan `SELECT 1`, jadi password `waregos_app` benar).
  - `waregos_app` CREATE TABLE: `permission denied for schema public`.
  - `waregos_backup` DELETE: `permission denied for table units`.
  - `docker compose config` tidak memuat `published`; PORTS hanya `3001/tcp` dan `5432/tcp`
    (port container, tidak dipublikasikan ke host).
  - `cloudflared` di-pin lewat `CLOUDFLARED_TAG` di `.env` (dipakai 2026.10.7), bukan di repo.
  - `cloudflared` `depends_on` `api` healthy. Tambahan, tidak diatur ADR.
  - Di PowerShell pakai `dc cp` + `psql -f` / path file di container, bukan pipe: stdin yang
    di-pipe ke fungsi PowerShell `dc` menggantung. README sudah diperbarui.
  - Commit: `8dda3d4`, `c50c637`, `7452e38`. `.gitignore` sekarang mengecualikan
    `deploy/sql/bootstrap-roles.sql` dari aturan `*.sql`.
- 2026-11-16 (uji tambahan di laptop, Postgres 17.11):
  - `waregos_app` INSERT (di-rollback): berhasil.
  - `waregos_app` DROP TABLE: `must be owner`.
  - `waregos_backup` INSERT: `permission denied`.
  - Ketiga kriteria itu kini terbukti di laptop, bukan hanya di PG16 di workspace Claude.
