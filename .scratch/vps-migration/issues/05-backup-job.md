# 05 — Backup job (image, script, systemd timer)

Status: ready-for-agent
Type: task
Blocked by: 03, 04
Stage: 5
ADR: 0007

## What

- `deploy/backup/Dockerfile`: base = the **same Postgres tag as `db`** (one build-arg), plus `age` and `rclone`. Non-root user.
- `deploy/backup/backup.sh` (POSIX sh, `set -eu`):
  1. `pg_dump` as `waregos_backup`, `--format=custom --no-owner --no-acl --schema=public`, written to a **tmpfs** path only.
  2. `pg_restore --list` on the plaintext; require `TABLE DATA public users` and `TABLE DATA public _prisma_migrations`, and more than 40 TOC lines (as `db-backup.yml`).
  3. `age -r "$AGE_RECIPIENT"`; name `waregos-YYYYMMDD-HHMMSSZ.dump.age`.
  4. `rclone` upload to the R2 bucket (config from env, no config file with secrets on disk), check the uploaded size.
  5. Success → ping healthchecks; any failure (trap) → ping `/fail`.
- `backup` service in `deploy/compose.yaml`: profile `ops`, `mem_limit` 256 MB, tmpfs mount, `waregos_backup` connection, env for R2/age/healthchecks.
- Add the backup image to the workflow from ticket 03 (SHA tag).
- `deploy/systemd/waregos-backup.service` + `.timer`: every 6 h, `Persistent=true`, `RandomizedDelaySec` (≤ 30 min), runs `docker compose ... run --rm backup` from `/srv/waregos`.
- Extend `deploy/README.md`: install the timer, run a manual backup.

## Acceptance

- [ ] Locally, against the stack from ticket 04: a run uploads one encrypted file to the **test** R2 bucket and pings healthchecks (Raditya supplies the test credentials in the local `.env`; the agent never reads `.env`).
- [ ] Forced failure (wrong password) pings `/fail` and leaves no file anywhere.
- [ ] No plaintext dump on any disk path during or after the run.
- [ ] `systemd-analyze verify` passes on the unit files (if available locally; otherwise note it for ticket 13).

## Comments
