# 03 — Triage Dependabot critical/high alerts in the API runtime

Status: ready-for-agent
Type: task
Blocked by: —
Gate: before API live (vps-migration 12)
Estimate: 0.5 h
Branch: shared with vps-migration 02 and api-hardening 01/02

## What

- List open Dependabot alerts with severity critical or high (read-only, e.g. `gh api` on the alerts endpoint).
- Keep only packages that end up in the **API runtime** (production dependencies of `apps/api` and the `@waregos/*` packages bundled into it). Alerts only in `apps/web` (static export) or dev tooling are out of scope here; note them for `chore/deps`.
- For each in-scope alert: fixed by a non-breaking update → fix in this branch as its own commit; not fixable without a breaking change → write it down with the reason and the exposure.
- Never `npm audit fix --force`.

## Acceptance

- [ ] Triage table in Comments: package, severity, runtime or not, action.
- [ ] No open critical/high alert left in the API runtime without a written reason.
- [ ] `npm run typecheck -w @waregos/api` passes; the API image still builds and its smoke test passes.

## Comments
