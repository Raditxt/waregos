# VPS migration (stages 2–7)

Move the API and Postgres from Railway + Supabase to the shared VPS, with backups that are proven before cutover.

Decisions: [ADR 0005](../../docs/adr/0005-vps-colocated-postgres-cloudflare-tunnel.md) (hosting), [ADR 0006](../../docs/adr/0006-vps-deploy-stack.md) (deploy stack), [ADR 0007](../../docs/adr/0007-backup-and-restore.md) (backups), [ADR 0008](../../docs/adr/0008-client-ip-behind-tunnel.md) (client IP). Stages and dates: `docs/roadmap.md`. Grilling session: 2026-11-13.

## Rules for every ticket

- Agents write files and run things on **localhost only**. Everything on the VPS, Cloudflare, R2, GHCR settings, healthchecks.io, Supabase and UptimeRobot is done by Raditya (`ready-for-human`).
- No server details (IP, usernames, key names, hostnames other than `*.waregos.com`) and no cost split in any file here. The repo is public.
- Code PRs go to `main` per phase. Production only runs images built from `main`.
- Cutover (ticket 14) is also gated by `.scratch/api-hardening/`.

## Order

```
01 freeze dump ─────────────────────────────────────────┐
02 trust proxy ─┐                                       │
03 image CI ────┼─ 04 compose ─ 05 backup job ─ 06 drill script ─ 08 local rehearsal ─┐
07 disk check ──┘                                       │                             │
09 cloud accounts (any time) ───────────────────────────┼─────────────────────────────┤
                                                        └─ 10 VPS up ─ 11 restore ─ 12 API live ─ 13 backups live ─ 14 cutover ─ 15 retire
```

## Tickets

| # | Ticket | Stage | Who |
|---|---|---|---|
| 01 | Freeze dump from Supabase | 3 | human, **14–15 Nov** |
| 02 | Trust proxy from `TRUST_PROXY_CIDRS` | 4 | agent |
| 03 | Image build workflow (API) | 2 | agent |
| 04 | Compose stack, role bootstrap, migrate profile | 2 | agent |
| 05 | Backup job (image, script, systemd timer) | 5 | agent |
| 06 | Restore drill script and runbook | 5 | agent |
| 07 | Host disk check | 2 | agent |
| 08 | Local rehearsal of the full stack | 2 | human |
| 09 | Cloud accounts: R2, healthchecks.io, tunnel, GHCR | 2–5 | human |
| 10 | Bring up the stack on the VPS | 2 | human |
| 11 | Restore the freeze dump on the VPS | 3 | human |
| 12 | API live on `api.waregos.com` | 4 | human |
| 13 | Backups live and first restore drill | 5 | human |
| 14 | Cutover | 6 | human |
| 15 | Retire Railway and Supabase | 7 | human |
