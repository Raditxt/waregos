# 12 — API live on `api.waregos.com`

Status: ready-for-human
Type: task
Blocked by: 11
Stage: 4
ADR: 0006, 0008

## Steps

1. `docker compose up -d api cloudflared`.
2. `GET https://api.waregos.com/health` OK; log in, list products.
3. ADR 0008 proof 2: one request with a spoofed `X-Forwarded-For` through the tunnel, raw header and `request.ip` logged **temporarily** (test image from a branch; logging removed before merge). `request.ip` must be the real client IP. If not: stop, open the `getClientIp` + `CF-Connecting-IP` fallback.
4. ADR 0008 proof 3: login rate limit with spoofed `X-Forwarded-For`, attempt 6 → 429.
5. `scripts/security-suite.ps1` against `https://api.waregos.com`.
6. UptimeRobot: monitor `https://api.waregos.com/health`.

## Acceptance

- [ ] All steps pass; results in `docs/history.md`.
- [ ] Production runs an image built from `main`.

## Comments
