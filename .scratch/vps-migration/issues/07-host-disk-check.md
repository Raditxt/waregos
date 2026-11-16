# 07 — Host disk check

Status: ready-for-agent
Type: task
Blocked by: —
Stage: 2 (cutover gate)
ADR: 0006

## What

- `deploy/systemd/waregos-diskcheck.sh`: checks usage of `/` (and the Docker data root if separate). Above 80% → ping `${HC_DISK_URL}/fail` with the numbers in the body; otherwise ping success.
- `deploy/systemd/waregos-diskcheck.service` + `.timer`: daily, `Persistent=true`.
- Ping URL from an env file in `/srv/waregos`, not from the repo.
- Memory and swap checks are out of scope (may follow after cutover).

## Acceptance

- [ ] Script tested locally with a fake threshold (e.g. env override) to hit both paths.
- [ ] Install steps added to `deploy/README.md`.

## Comments
