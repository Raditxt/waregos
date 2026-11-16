# 02 — Explicit Fastify `bodyLimit`

Status: ready-for-agent
Type: task
Blocked by: —
Gate: before cutover (vps-migration 14)

## What

Set `bodyLimit` explicitly on the Fastify instance in `apps/api/src/index.ts` (no route sets one today). Size it from the largest real request (a big purchase or checkout) with headroom; raise it per route only if a route really needs more. Oversized requests return 413 through the standard error envelope with an Indonesian message.

## Acceptance

- [ ] Limit documented in a short Indonesian comment with the reasoning.
- [ ] Local check: a body just over the limit → 413 in the `{ success: false, error, message }` envelope; a realistic large purchase still passes.
- [ ] `npm run typecheck -w @waregos/api` passes.

## Comments
