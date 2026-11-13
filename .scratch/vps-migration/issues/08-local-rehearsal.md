# 08 — Local rehearsal of the full stack

Status: ready-for-human
Type: task
Blocked by: 04, 05, 06, 09 (test bucket and test check only)
Stage: 2 (gate before touching the VPS)
ADR: 0006, 0007

## What

Raditya runs `deploy/compose.yaml` on the laptop end to end with a local `.env` and test credentials. The image comes from a `workflow_dispatch` build on `chore/vps-migration` (test only).

## Acceptance

- [ ] Bootstrap roles → restore latest backup as `waregos_owner` → `migrate` (no pending) → `api` healthy → log in from the local web.
- [ ] One `backup` run to the **test** R2 bucket, success ping received.
- [ ] Restore drill (ticket 06 runbook) from that test-bucket file passes.
- [ ] Notes on anything that differed from the README, fixed in the repo before ticket 10.

## Comments
