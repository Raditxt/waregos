# 6. Deploy stack on the VPS

Status: accepted (2026-11-13). Builds on ADR 0005. Backups are in ADR 0007, client IP in ADR 0008.

## Context

ADR 0005 chose a shared VPS with Postgres, the API and `cloudflared` in one Compose project. This ADR fixes how that stack is built, shipped, migrated and rolled back, so that production stays a manual, repeatable step done only by Raditya.

## Decision

### Images

- Images are built in GitHub Actions and pushed to **GHCR as public packages**. The code is public already; a public image means the VPS needs no registry credentials.
- Tags are the **full commit SHA**. No `latest`.
- Build runs on push to `main` and on `workflow_dispatch`. Actions are pinned by SHA; `packages: write` only on the job that pushes.
- **Production only runs images built from `main`.** Images from `workflow_dispatch` on other branches are for testing.
- Code PRs are merged to `main` per phase, not held back until the whole migration is done. Web auto-deploy stays off, so merging does not release the web.
- No secrets in images: `.dockerignore` excludes `.env*`, no secret is passed as a build-arg, checked with `docker history`.
- The backup job has its own small image (Postgres client + `age` + `rclone`, ADR 0007), built by the same workflow. Its base is the **same Postgres tag as the `db` service**, set through one build-arg/variable.

### Postgres

- Image pinned to a minor tag, `postgres:17.<n>-bookworm`, at least 17.11 (Supabase production is 17.11). Minor upgrades by hand after a backup. Major 18 only after v1.
- Postgres has no published port; it is reachable only on the internal Compose network.
- Starting values, reviewed after one week of real use: `shared_buffers=192MB`, `max_connections=30`.

### Layout on the VPS

- Compose files live in the repo under `deploy/`. The VPS has a read-only clone (no deploy key) at `/srv/waregos/repo`.
- **The checkout is always at the same commit as the API image tag** (`git checkout <sha>`), never "latest `main`".
- Secrets and data live in `/srv/waregos`, outside the checkout. Compose runs with `-f repo/deploy/compose.yaml --env-file .env`.
- The internal network has a fixed subnet, `10.89.10.0/24`, outside Docker's default pool (`172.17–31`) so it cannot collide with TahuHak's networks. ADR 0008 depends on it.
- No `logging:` in Compose: the Docker daemon on the VPS already uses the `local` driver, 10 MB × 3.

### Memory limits (starting values)

| Service | Limit | Notes |
|---|---|---|
| `db` | 768 MB | settings above |
| `api` | 384 MB | `--max-old-space-size=256` |
| `cloudflared` | 128 MB | |
| `backup` | 256 MB | runs only during a backup |

The upgrade rule from the roadmap applies (memory steadily above 70% or regular swap use means a bigger plan, not tighter limits).

### Database roles

- `postgres` (superuser): bootstrap only.
- `waregos_owner`: owns the schema and all objects, runs migrations and restores.
- `waregos_app`: DML only, used by the API.
- `waregos_backup`: read-only (`USAGE` on schema, `SELECT` on tables and sequences).
- `ALTER DEFAULT PRIVILEGES FOR ROLE waregos_owner` grants new tables and sequences to `waregos_app` and `waregos_backup`, so migrations and restores need no manual grants.
- Restores run **as `waregos_owner`**, never as `postgres`, so object ownership is right.
- The bootstrap SQL is in the repo **without passwords**. Raditya sets the passwords by hand.

### Migrations and seed

- A one-shot `migrate` service under the Compose profile `ops` runs `prisma migrate deploy` as `waregos_owner`. It is never part of a normal `up`. The runtime image must still contain the Prisma CLI.
- The seed never runs on the VPS. Users come from the Supabase dump.

### Release and rollback

1. Manual backup (`docker compose run --rm backup`).
2. `migrate` (if the release has migrations).
3. Change `API_IMAGE_TAG` in `.env`, keeping the previous tag as a comment, `git checkout <sha>` in the repo, `docker compose pull && docker compose up -d`.

- Migrations must stay **compatible with the previous image** (expand/contract), so rollback is "put the old tag back".
- When a migration cannot be made compatible, the manual backup is mandatory and **rollback means restore**.
- There is no automatic deploy: no SSH from Actions, no Watchtower.

### Tunnel

- `cloudflared` runs a **remotely-managed** tunnel: the token is in `.env`, the single ingress rule `api.waregos.com → http://api:3001` is set in the Cloudflare dashboard.

### Host checks

- A daily systemd timer on the host checks disk usage and pings a separate healthchecks.io check, failing above 80%. This is a cutover gate.
- Memory and swap checks may follow after cutover.
- UptimeRobot watches `https://api.waregos.com/health` from stage 4.

### Rehearsal first

`deploy/compose.yaml` must run on the laptop with a local `.env` (bootstrap roles, restore the latest backup, API up, one backup to a **test** R2 bucket, restore from it) before it is used on the VPS. `docker-compose.rehearsal.yml` stays as it is.

## Considered options

- **Private GHCR image**: needs a PAT on the VPS for no real gain, since the source is public.
- **Automatic deploy (SSH from Actions, Watchtower)**: rejected; production is touched only by Raditya, by hand.
- **Locally-managed tunnel** (`config.yml` + credentials file): more secret files on the server for a one-line ingress.
- **Compose files only on the VPS**: not versioned, and drifts from the repo.

## Consequences

- Every release is a short manual checklist. Skipping the manual backup before a migration removes the only rollback for incompatible migrations.
- Changing the internal subnet means changing `TRUST_PROXY_CIDRS` at the same time (ADR 0008).
