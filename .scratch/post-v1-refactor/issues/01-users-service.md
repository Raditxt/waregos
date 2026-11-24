# 01 — Move user management into `users.service.ts` and `users.schema.ts`

Status: needs-triage
Type: task
Blocked by: —
Gate: after v1 (decision 2026-11-24). Do not start before the parallel run passes.

## Context

Every API module follows `*.route.ts` → `*.service.ts` → `*.schema.ts`, except `apps/api/src/modules/users/`, which only has `users.route.ts` (172 lines) with Prisma calls and Zod schemas inside the route handlers. That makes the logic hard to test with plain `node:assert` scripts and breaks the pattern in `docs/architecture.md`.

## Scope

- `users.schema.ts`: the request schemas, unchanged in behaviour (same limits, same Indonesian messages).
- `users.service.ts`: a `UsersService` class taking `PrismaClient`, throwing a `UserError` that the route maps to a 400 with a specific code (same codes as today).
- `users.route.ts`: HTTP, `adminOnly`, `safeParse` → `validationError`, audit log. No behaviour change: same endpoints, status codes, response shapes and `tokenVersion` bumps (deactivation and password reset).

## Acceptance

- [ ] Responses for every `/api/users` endpoint are identical before and after (compare by hand or with a small script against a local API).
- [ ] Schema tests (at limit passes, one over fails) as a `node:assert` script.
- [ ] Typecheck, web `tsc --noEmit` and all `*.test.ts` scripts pass.

## Comments
