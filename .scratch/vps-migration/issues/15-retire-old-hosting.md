# 15 — Retire Railway and Supabase

Status: ready-for-human
Type: task
Blocked by: 14, plus a few stable days after cutover
Stage: 7
ADR: 0005, 0007

## Steps

1. Disable `db-backup.yml` (Supabase); keep the last artifact until it expires.
2. Remove `pull-latest-backup.ps1`'s GitHub-artifact path if ticket 06 kept it.
3. Stop the Railway project; delete the Supabase project.
4. Remove `railway.json` and Railway/Supabase mentions that are no longer true (`CLAUDE.md`, README).

## Acceptance

- [ ] Nothing in production depends on Railway or Supabase.
- [ ] Roadmap stage 7 marked done.

## Comments
