# 8. Client IP behind Cloudflare Tunnel

Status: accepted (2026-11-13). Depends on ADR 0005 (no inbound ports) and ADR 0006 (fixed internal subnet).

## Context

The client IP feeds the login rate limit and the audit log (`request.ip`). The current trust-proxy list in `apps/api/src/index.ts` was made for Railway and trusts wide ranges (`10.0.0.0/8`, `100.0.0.0/8`, `152.233.0.0/16`, ...). Part of `100.0.0.0/8` is real public address space, so a real client there would be skipped and a spoofed `X-Forwarded-For` entry would be used instead.

Behind the tunnel, every request reaches the API from `cloudflared` on the internal network, and Cloudflare appends the real client IP to `X-Forwarded-For`.

## Invariant

1. **The API has no published port. The only path to it is through `cloudflared` on the internal Compose network.**
2. **The internal network holds only Waregos services: `db`, `api`, `backup`, `cloudflared`.** No other container (TahuHak or anything else) may join it, because every address on it is trusted as a proxy and could set `X-Forwarded-For` freely.

Everything below is safe only while both hold. Publishing the API port, putting another proxy in front of it, or attaching another container to the network breaks this ADR and must reopen it.

### Verification

Docker publishes ports by writing its own iptables rules, which **bypass UFW**, so "UFW only allows SSH" proves nothing here. The invariant is verified directly:

- `docker compose config` shows no `ports:` on `api` and `db`.
- `ss -tlnp` on the host shows nothing listening on 3001 or 5432.
- `docker network inspect` on the internal network lists only the four Waregos containers.

These checks are part of the acceptance of bringing the stack up on the VPS and of cutover, and are repeated after any change to `deploy/compose.yaml`.

## Decision

- Trust-proxy comes from env: `TRUST_PROXY_CIDRS`, set to the internal Docker subnet only (`10.89.10.0/24`). All Railway ranges are removed, and `TRUST_PROXY` / `TRUST_PROXY_HOPS` go away.
- Fastify takes the right-most untrusted address in `X-Forwarded-For`, which is the one Cloudflare appended.
- Empty `TRUST_PROXY_CIDRS` means `trustProxy=false`, **in development only**. With `NODE_ENV=production` the API refuses to start when it is empty, like the `JWT_SECRET` check. Otherwise every request would carry `cloudflared`'s IP and the rate limit would hit everyone at once.
- `CF-Connecting-IP` is **not** used, unless the proof below fails. In that case the fallback is one `getClientIp` helper, used by both the rate limit and the audit log, falling back to the socket IP.

## Proof required

1. An `app.inject` test: a request from a remote address inside the Docker subnet with `X-Forwarded-For: <spoofed>, <real>` must give `request.ip === <real>`.
2. One manual observation in stage 4 through the real tunnel: send a spoofed `X-Forwarded-For`, temporarily log the raw header and `request.ip`, and confirm `request.ip` is the real client IP. The temporary logging is removed before merge.
3. The login rate-limit retest: with a spoofed `X-Forwarded-For`, attempt 6 must get 429.

## Considered options

- **`CF-Connecting-IP` from the start**: also safe under the invariant, but it needs new code in two places and drops Fastify's standard behaviour. Kept as the fallback.
- **Keep the CIDR list but narrow it in code**: hardcodes the subnet and keeps Railway leftovers around.

## Consequences

- Changing the Compose subnet requires changing `TRUST_PROXY_CIDRS` at the same time.
- The rate limit keys on the full client address. For IPv6 that is one `/128`, so a client holding a whole IPv6 prefix can rotate addresses and get a fresh limit each time. Accepted for a single shop's login form; grouping by `/64` can be added later if it is ever abused.
- Local development without a proxy keeps working, since the empty value is allowed outside production.
