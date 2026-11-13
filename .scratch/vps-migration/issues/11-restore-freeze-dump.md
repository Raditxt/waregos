# 11 — Restore the freeze dump on the VPS

Status: ready-for-human
Type: task
Blocked by: 01, 10
Stage: 3
ADR: 0006

## Steps

1. Copy the **encrypted** freeze dump from ticket 01 to the VPS, decrypt on the laptop side or in a tmpfs only. The private key never stays on the VPS.
2. `pg_restore` into the empty database **as `waregos_owner`**, `--no-owner --no-acl`. No `migrate deploy` beforehand.
3. Remove every plaintext copy.

## Acceptance

- [ ] `migrate` profile (`prisma migrate status`) reports 14 applied, none pending.
- [ ] Row count per table equals the counts recorded in ticket 01.
- [ ] `waregos_app` and `waregos_backup` can read every table without manual grants.
- [ ] Note in `docs/history.md`.

## Comments
