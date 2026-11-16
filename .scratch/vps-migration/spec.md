# VPS migration (stages 2–7)

Move the API and Postgres from Railway + Supabase to the shared VPS, with backups that are proven before cutover.

Decisions: [ADR 0005](../../docs/adr/0005-vps-colocated-postgres-cloudflare-tunnel.md) (hosting), [ADR 0006](../../docs/adr/0006-vps-deploy-stack.md) (deploy stack), [ADR 0007](../../docs/adr/0007-backup-and-restore.md) (backups), [ADR 0008](../../docs/adr/0008-client-ip-behind-tunnel.md) (client IP). Stages and dates: `docs/roadmap.md`. Grilling session and PM review: 2026-11-13.

## Rules for every ticket

- Agents write files and run things on **localhost only**. Everything on the VPS, Cloudflare, R2, GHCR settings, healthchecks.io, Supabase and UptimeRobot is done by Raditya (`ready-for-human`).
- No server details (IP, usernames, key names, hostnames other than `*.waregos.com`) and no cost split in any file here. The repo is public.
- Code PRs go to `main` per phase. Production only runs images built from `main`.
- VM-02 and `.scratch/api-hardening/` 01–03 share one branch: separate commits, one PR, test-first (`/tdd`).

## Order (agreed in PM review)

1. VM-01 freeze dump (Raditya, 14–15 Nov), in parallel with everything else.
2. VM-04 `deploy/` → VM-03 GHCR → VM-02 trust proxy (+ AH-01/02/03 in the same PR).
3. VM-05 backup → VM-06 drill script → VM-07 disk check.
4. Wizard part 1: VM-09 cloud accounts, VM-08 laptop smoke test.
5. Wizard part 2: VM-10 → VM-10b → VM-11 → VM-12 → VM-13 → VM-14.

## Tickets

Estimates are Raditya's hours (for agent tickets: review, local check, merge).

| # | Ticket | Who | Blocked by | Estimate |
|---|---|---|---|---|
| 01 | Freeze dump from Supabase (14–15 Nov) | human | — | 1.5 h |
| 02 | Trust proxy from `TRUST_PROXY_CIDRS` | agent | — | 1 h |
| 03 | Image build workflow (API) | agent | — | 1 h |
| 04 | Compose stack, role bootstrap, migrate profile | agent | — | 2 h |
| 05 | Backup job (image, script, systemd timer) | agent | 03, 04 | 2 h |
| 06 | Restore drill script and runbook | agent | 05 | 1.5 h |
| 07 | Host disk check | agent | — | 0.5 h |
| 08 | Laptop smoke test of the stack | human | 04, 05, 09 | 0.75 h |
| 09 | Cloud accounts: R2, healthchecks.io, tunnel, GHCR | human | — | 2 h |
| 10 | Bring up the stack on the VPS | human | 08, 09, 02–07 merged | 1.5 h |
| 10b | Rehearsal on the VPS with dummy data | human | 10, 06 | 1.5 h |
| 11 | Restore the freeze dump on the VPS | human | 01, 10, 10b | 1.5 h |
| 12 | API live on `api.waregos.com` | human | 11, 02, AH-03 | 2.5 h |
| 13 | Backups live (≥ 4 runs) and first restore drill | human | 11, 06 | 2 h + ~24 h waiting |
| 14 | Cutover (8–14 Dec) | human | 12, 13, 07, AH-01, AH-02 | 2 h |
| 15 | Retire Railway and Supabase | human | 14 + a few stable days | 1 h |

About 25 h to cutover including `.scratch/api-hardening/`. Real hours are compared against this at the end of the sprint (22 Nov).
