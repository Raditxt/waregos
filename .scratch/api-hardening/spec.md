# API hardening before going public

The API becomes publicly reachable at `api.waregos.com` (ADR 0005). These tickets do not touch deployment, but they are a **cutover gate**: both must be merged to `main` and running in production before `.scratch/vps-migration/issues/14-cutover.md`.

Origin: noted 2026-11-11 (`docs/history.md`), scoped in the grilling session of 2026-11-13.

| # | Ticket | Who |
|---|---|---|
| 01 | `.max()` limits on Zod string and array inputs | agent |
| 02 | Explicit Fastify `bodyLimit` | agent |
