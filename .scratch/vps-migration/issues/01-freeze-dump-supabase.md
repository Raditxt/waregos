# 01 — Freeze dump from Supabase

Status: ready-for-human
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

- [ ] Encrypted dump exists in two places, plaintext deleted.
- [ ] Row counts per table recorded.
- [ ] Short note in `docs/history.md` (date, that it was taken, where the counts are kept; no server details).

## Comments
