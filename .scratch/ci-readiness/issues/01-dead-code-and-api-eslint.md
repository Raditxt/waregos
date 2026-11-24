# 01 — Remove dead code and make `npm run lint` pass for the API

Status: ready-for-agent
Type: task
Blocked by: —
Gate: roadmap stage 8, CI (typecheck + build) and branch protection on `main` (15–21 Dec). CI can only run lint once it passes.
Branch: `chore/dead-code` (one commit, not pushed by the agent)

## Context

Found in the structure audit on 2026-11-24. `npm run lint` fails today because `apps/api` runs `eslint src` but has no `eslint.config.*` and no eslint dependency:

```
ESLint couldn't find an eslint.config.(js|mjs|cjs) file.
```

## Scope

1. **API eslint.** Add `apps/api/eslint.config.mjs` (flat config, `typescript-eslint` recommended, no style rules; Prettier is not enforced yet) and the dev dependencies in `apps/api/package.json`. Fix only what the recommended rules flag as real errors; anything larger is a follow-up ticket, not a drive-by refactor.
2. **Dead code** (each verified unused with `git grep` on 2026-11-24; re-check before deleting):
   - `apps/api/src/shared/index.ts`: barrel that nothing imports.
   - `packages/utils/src/index.ts` → `getPaginationParams`: unused, duplicates `apps/api/src/shared/pagination.ts::parsePagination`.
   - `packages/database/package.json`: `main` / `types` point at `./src/index.ts`, which does not exist. Nothing imports `@waregos/database`.
   - `apps/web/src/components/ui/`: `badge`, `card`, `confirm-dialog`, `dropdown-menu`, `input`, `label`, `select`, `separator`, `table`, `tabs` are not imported anywhere (they can be regenerated with the shadcn CLI).
   - `turbo.json`: `test` task with no `test` script in any package. Either remove it or add `test` scripts that run the `*.test.ts` files; pick whichever the CI ticket needs.

## Out of scope

- `packages/types` unused exports and the web's local DTO copies: deferred until after v1 (decision 2026-11-24).
- `PORT` fallback in `apps/api/src/index.ts` and `railway.json`: removed with vps-migration 15 (retire old hosting).

## Acceptance

- [ ] `npm run lint` passes from the repo root (api and web).
- [ ] Every removed item re-checked with `git grep` before removal; none referenced.
- [ ] `npm run typecheck -w @waregos/api`, `cd apps/web; npx tsc --noEmit`, `npm run build` and all `*.test.ts` scripts listed in `CLAUDE.md` pass.

## Comments
