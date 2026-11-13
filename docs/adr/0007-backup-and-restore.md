# 7. Backups and restore drills on the VPS

Status: accepted (2026-11-13). Settles the backup details left open in ADR 0005 and the roadmap.

## Context

With Postgres on one VPS (ADR 0005), losing the server without a working backup means losing the shop's data. GitHub Actions cannot reach the database without opening a way in, so the existing `db-backup.yml` model (Actions pulls a dump from Supabase) does not carry over. Working backups and a passed restore drill are the gate for cutover.

## Decision

### Runner and schedule

- Backups run **on the VPS**. A **systemd timer on the host** runs `docker compose run --rm backup` every 6 hours with `Persistent=true` and `RandomizedDelaySec`. No cron inside a container.
- The `backup` service uses its own image (Postgres client of the same tag as `db`, `age`, `rclone`; ADR 0006). Nothing is installed at run time.
- `pg_dump` runs as `waregos_backup` with the same flags as today: `--format=custom --no-owner --no-acl --schema=public`.

### Verify, encrypt, ship

- The plaintext dump exists **only in a tmpfs inside the container**, never on disk.
- Before encryption, `pg_restore --list` runs on the plaintext dump, and the job checks that `users` and `_prisma_migrations` table data are present (same checks as `db-backup.yml`).
- The dump is encrypted with `age` to the **existing recipient** used by `db-backup.yml`, whose private key has already passed a restore drill.
- The encrypted file is uploaded to Cloudflare R2 and then removed. **No local copy on the VPS**; the provider's snapshots are only an extra layer.

### Keys

- The `age` **private key is never on the VPS**. At least one copy in the cloud and one truly offline copy (paper or USB stick). Where they are is not written in the repo.
- R2 token on the VPS: Object Read & Write, scoped to the one bucket. The laptop uses a separate read-only token for drills.

### Retention

- Every 6-hourly dump is kept **30 days**.
- R2 **bucket lock of 30 days**, so a compromised VPS cannot delete recent backups. Lifecycle rule deletes objects after 35 days.

### Alarm

- healthchecks.io: success ping on a verified upload, `/fail` ping on any failure. Period 6 h, grace 2 h (covers `RandomizedDelaySec`).
- Notifications: Telegram and email.

### Restore drill

- On the **laptop**: pull the latest dump from R2 with the read-only token, decrypt, restore into the same pinned `postgres:17.<n>` as `waregos_owner`, compare row counts per table and `prisma migrate status`, then start the API image at the production tag against it and log in.
- `scripts/pull-latest-backup.ps1` is adapted to R2.
- When: once before cutover (gate), then **monthly**, and after every Postgres major upgrade. Each drill is written down in `docs/history.md`.

### Transition

- `db-backup.yml` (Supabase) keeps running until stage 7.

## Considered options

- **GitHub Actions as the runner**: needs an inbound path to Postgres; rejected.
- **Cron inside the container**: a dead container silently stops backups, and missed runs are not caught up. The host timer with `Persistent=true` is simpler to inspect.
- **Local copies on the VPS**: the 60 GB disk is shared, and a copy on the same server does not survive losing the server.
- **New `age` key pair**: no gain; the existing one is already drilled.

## Consequences

- A missed or failed run alarms within about 8 hours.
- Deleting backups early (for example after a mistake) is not possible within 30 days, by design.
- Restoring needs the offline private key, so the drill also checks that the key is still reachable.
