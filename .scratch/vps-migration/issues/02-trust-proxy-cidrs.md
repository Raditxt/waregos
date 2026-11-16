# 02 — Trust proxy from `TRUST_PROXY_CIDRS`

Status: ready-for-agent
Type: task
Blocked by: —
Stage: 4 (code merged to `main` before the stage-4 image is built)
ADR: 0008
Branch: shared with `.scratch/api-hardening/` 01–03 (one PR, separate commits, `/tdd`)

## What

Replace the hardcoded Railway CIDR list in `apps/api/src/index.ts` with an env-driven list.

- New env `TRUST_PROXY_CIDRS` (comma-separated CIDRs). Production value: `10.89.10.0/24`.
- Remove `TRUST_PROXY` and `TRUST_PROXY_HOPS` and the hardcoded list (`10/8`, `100/8`, `152.233/16`, ...).
- Empty → `trustProxy=false`, allowed only outside production.
- `NODE_ENV=production` and empty `TRUST_PROXY_CIDRS` → API exits at startup with a clear Indonesian message, in the same place and style as the `JWT_SECRET` check.
- Update `apps/api/.env.example` and the env paragraph in `CLAUDE.md`.

## Acceptance

- [ ] Plain `node:assert` test runnable with `npx tsx` (no test runner): app built with `TRUST_PROXY_CIDRS=10.89.10.0/24`, `app.inject` with `remoteAddress` inside that subnet and `X-Forwarded-For: 203.0.113.9, 198.51.100.7` → `request.ip === '198.51.100.7'`. Same request from a remote address outside the subnet → `request.ip` is that remote address.
- [ ] Startup fails in production with empty `TRUST_PROXY_CIDRS`; dev starts with `trustProxy=false`.
- [ ] `npm run typecheck -w @waregos/api` passes.
- [ ] If the inject test cannot be made to pass, stop and report: the fallback (`getClientIp` + `CF-Connecting-IP`, ADR 0008) needs Raditya's go-ahead.

## Comments
