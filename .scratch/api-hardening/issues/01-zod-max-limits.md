# 01 — `.max()` limits on Zod inputs

Status: ready-for-agent
Type: task
Blocked by: —
Gate: before cutover (vps-migration 14)

## What

Every `z.string()` and `z.array()` in `apps/api/src/modules/*/*.schema.ts` (and any other request schema) gets an explicit `.max()`. Pick limits from the data: names, barcodes, notes, usernames, passwords (bcrypt limit 72 is already enforced), cart lines per transaction, purchase lines. Over-limit input returns the existing `validationError` with an Indonesian message.

## Acceptance

- [ ] No unbounded string or array in request schemas (grep shows none).
- [ ] The web forms do not allow input the API now rejects (add `maxLength` where needed), so users see the limit before submitting.
- [ ] `npm run typecheck -w @waregos/api` and `cd apps/web; npx tsc --noEmit` pass.
- [ ] Local manual check: one over-limit request per module returns 400 with a readable message.

## Comments
