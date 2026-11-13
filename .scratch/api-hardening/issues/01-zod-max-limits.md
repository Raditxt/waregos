# 01 — `.max()` limits on login body and item arrays

Status: ready-for-agent
Type: task
Blocked by: —
Gate: before cutover (vps-migration 14)
Branch: shared with vps-migration 02 and api-hardening 02/03 (one PR, separate commits, `/tdd`)

## Scope (narrowed in PM review 2026-11-13)

- Login body: `username` and `password` get explicit `.max()` (password stays within the bcrypt 72-byte rule).
- Every `items` array in request schemas, at least checkout (transactions) and purchases, gets `.max()` sized from real use with headroom.
- Other strings are out of scope for v1.

Over-limit input returns the existing `validationError` with an Indonesian message.

## Acceptance

- [ ] Plain `node:assert` tests (run with `npx tsx`) for each limit, written first: at the limit passes, one over fails.
- [ ] The web does not let users build a cart or purchase larger than the limit without a clear message.
- [ ] `npm run typecheck -w @waregos/api` and `cd apps/web; npx tsc --noEmit` pass.

## Comments
