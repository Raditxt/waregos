# 02 — Split the products, purchases and POS pages into components

Status: needs-triage
Type: task
Blocked by: —
Gate: after v1 (decision 2026-11-24). Do not start before the parallel run passes.

## Context

Three screens hold most of the web code in one file each (line counts on 2026-11-24):

| File | Lines |
|---|---|
| `apps/web/src/app/products/page.tsx` | 1425 |
| `apps/web/src/app/purchases/page.tsx` | 1044 |
| `apps/web/src/app/pos/page.tsx` | 824 |

They mix data fetching, dialogs, tables and form state, which makes changes slow to review and easy to break.

## Scope

- One page per branch/commit, starting with whichever page the next post-v1 feature touches (box/pcs packaging touches products and POS).
- Colocate components under `apps/web/src/app/<screen>/_components/` (the `_` prefix keeps them out of routing). `products/category-manager.tsx` moves there too.
- Move shared response types next to the page (`_types.ts`); do not touch `packages/types` here (separate post-v1 decision).
- No visual or behaviour changes. No new dependencies.

## Acceptance

- [ ] `page.tsx` of each split screen is under ~300 lines and only composes components and page-level state.
- [ ] `cd apps/web; npx tsc --noEmit`, `npm run lint -w @waregos/web` and `npm run build -w @waregos/web` pass.
- [ ] Clicked through by hand on the laptop for each split screen (admin and cashier), including the POS on a phone-width viewport.

## Comments
