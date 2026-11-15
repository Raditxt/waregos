# 01 — Freeze dump from Supabase

Status: resolved
Type: task
Blocked by: —
Stage: 3 (moved forward: **14–15 Nov 2026**, right after Railway stops)
ADR: 0006, 0007

## Why

Once Railway stops, nothing writes to Supabase, so the data is frozen. Taking the move dump right then removes the risk of the Supabase free project auto-pausing before stage 3.

## Steps

1. Confirm Railway has stopped (no API writes possible). Pause the API monitor in UptimeRobot.
2. From the laptop, dump with the read-only `waregos_backup` role through the **session pooler (port 5432)**, never the transaction pooler (6543). Client: `postgres:17` image. Flags as in `db-backup.yml`: `--format=custom --no-owner --no-acl --schema=public`.
3. `pg_restore --list` on the dump: `users` and `_prisma_migrations` table data present.
4. Record the row count per table in `public` (query on Supabase). Keep the list next to the dump, outside the repo.
5. Encrypt with `age` to the existing recipient. Delete the plaintext.
6. Keep the encrypted file on the laptop **and** one cloud copy (R2 may not be ready yet; any private cloud storage is fine).

## Acceptance

- [x] Encrypted dump exists in two places, plaintext deleted.
- [x] Row counts per table recorded.
- [ ] Short note in `docs/history.md` (date, that it was taken, where the counts are kept; no server details).

## Comments

- 2026-11-15: freeze dump diambil via session pooler dengan client `postgres:17.11`
  (`-Fc`, `--schema=public`, `--no-owner`, `--no-privileges`). Data beku sejak
  2026-11-13 (Railway trial habis, 0/1 service online).
- Restore uji ke `postgres:17.11` kosong: users 1, categories 9, units 7,
  products 18, activity_logs 77, _prisma_migrations 14 (sama dengan Supabase).
  Satu error yang diharapkan: `schema "public" already exists`.
- Terenkripsi age (recipient sama dengan `AGE_RECIPIENT` backup harian),
  uji dekripsi hash cocok. SHA256 `.age`: `6899896E86079F7FA0501BE4FBD259B6EFAF753B4367CAFBB8821DDC53A5F270`.
  Plaintext dihapus. Disimpan di laptop + satu cloud privat.
