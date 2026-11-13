# 10b — Rehearsal on the VPS with dummy data

Status: ready-for-human
Type: task
Blocked by: 10, 06
Stage: 2 (gate before ticket 11)
Estimate: 1.5 h
ADR: 0006, 0007

## Why

The full backup round trip is proven on the real server before real data lands there. Moved here from the laptop rehearsal (ticket 08) during the PM review of 2026-11-13.

## Steps

1. In a throwaway database on the VPS stack: `migrate` (14 migrations) + seed with dummy data (`TEST ` prefixes, dummy admin). Real data never enters this database.
2. `docker compose run --rm backup` against it, to the **test** R2 bucket.
3. On the laptop: restore drill from that object (ticket 06 runbook), row counts per table match the VPS.
4. Drop the throwaway database and its data; confirm nothing of it is left before ticket 11.

## Acceptance

- [ ] Backup → restore → row counts match.
- [ ] Throwaway database removed; the production database is still empty.

## Comments
