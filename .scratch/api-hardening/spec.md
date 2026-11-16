# API hardening before going public

The API becomes publicly reachable at `api.waregos.com` (ADR 0005). These tickets do not touch deployment, but they are gates: 03 before the API goes live (`.scratch/vps-migration/issues/12-api-live.md`), 01 and 02 before cutover (`14-cutover.md`).

Origin: noted 2026-11-11 (`docs/history.md`), scoped in the grilling session and PM review of 2026-11-13.

How: one branch with vps-migration 02, separate commits per ticket, one PR, test-first (`/tdd`).

| # | Ticket | Who | Gate | Estimate |
|---|---|---|---|---|
| 01 | `.max()` on login body and item arrays | agent | VM-14 | 1 h |
| 02 | Explicit Fastify `bodyLimit` | agent | VM-14 | 0.5 h |
| 03 | Dependabot critical/high triage, API runtime only | agent | VM-12 | 0.5 h |
