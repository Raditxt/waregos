# 14 — Cutover

Status: ready-for-human
Type: task
Blocked by: 12, 13, 07 (disk check live), `.scratch/api-hardening/` 01 and 02
Stage: 6 (8–14 Dec 2026)
ADR: 0005, 0006

## Steps

As in `docs/roadmap.md` stage 6:

1. Attach `app.waregos.com` to Cloudflare Pages.
2. Set `NEXT_PUBLIC_API_URL=https://api.waregos.com/api` for the Pages build; set `CORS_ORIGINS=https://app.waregos.com,https://waregos.pages.dev` on the API.
3. Re-enable production auto-deploy, retry deployment `38117c5` (or the current `main`), smoke test both origins.
4. Move/confirm UptimeRobot for the web.

## Acceptance

- [ ] ADR 0008 verification repeated right before cutover: no `ports:` on `api`/`db` in `docker compose config`, nothing on 3001/5432 in `ss -tlnp`, only Waregos containers on the internal network.
- [ ] Admin and cashier flows work from `app.waregos.com`; cashier sees no cost data.
- [ ] Roadmap and `CLAUDE.md` "Current state" updated.

## Comments
