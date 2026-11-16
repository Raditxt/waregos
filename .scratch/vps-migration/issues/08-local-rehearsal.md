# 08 — Local smoke test of the stack

Status: ready-for-human
Type: task
Blocked by: 04, 05, 09 (test bucket and test check only)
Stage: 2
Estimate: ~45 min
ADR: 0006, 0007

## What

Raditya runs `deploy/compose.yaml` on the laptop with a local `.env` and test credentials. The image comes from a `workflow_dispatch` build on `chore/vps-migration` (test only). This is a smoke test; the full backup → restore round trip happens on the VPS in ticket 10b.

## Acceptance

- [ ] `compose up` → bootstrap roles → `migrate` → `api` healthy → log in from the local web.
- [ ] One `backup` run to the **test** R2 bucket, success ping received.
- [ ] Anything that differed from `deploy/README.md` is fixed in the repo before ticket 10.

## Comments
