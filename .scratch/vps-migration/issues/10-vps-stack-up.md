# 10 — Bring up the stack on the VPS

Status: ready-for-human
Type: task
Blocked by: 08, 09; tickets 02–07 merged to `main` and the image built from `main`
Stage: 2
ADR: 0006

## Steps

1. Read-only clone at `/srv/waregos/repo`, `git checkout <sha>` = the API image tag.
2. `/srv/waregos/.env` from `deploy/.env.example` (strong, letters-and-digits DB passwords).
3. `docker compose up -d db`, apply `bootstrap-roles.sql`, set role passwords by hand.
4. Do **not** run `migrate` yet: the data comes with its own `_prisma_migrations` in ticket 11.

## Acceptance

- [ ] `db` healthy, no published ports (`ss -tlnp` shows only SSH from the outside).
- [ ] Memory after start noted (baseline for the 70% rule).

## Comments
