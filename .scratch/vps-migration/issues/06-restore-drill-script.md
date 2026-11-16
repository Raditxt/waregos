# 06 — Restore drill script and runbook

Status: ready-for-agent
Type: task
Blocked by: 05
Stage: 5
ADR: 0007

## What

- Adapt `scripts/pull-latest-backup.ps1` (Windows PowerShell 5.1) to pull the newest object from R2 with a **read-only** token. Keep the GitHub-artifact path working until stage 7, or split into a second script.
- Runbook `docs/restore-drill.md` (Indonesian): decrypt with the offline key, restore into the pinned `postgres:17.<n>` as `waregos_owner` (bootstrap SQL first), row counts per table, `prisma migrate status`, start the API image at the production tag against it, log in. How to record the result in `docs/history.md`. Schedule: before cutover, monthly, after a Postgres major upgrade.

## Acceptance

- [ ] Script tested locally against the test bucket.
- [ ] Runbook followed end to end once on the laptop against a test-bucket dump.
- [ ] No bucket names that reveal anything beyond the project, no account IDs, no server details in the repo.

## Comments
