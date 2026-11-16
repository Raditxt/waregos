# 13 — Backups live and first restore drill

Status: ready-for-human
Type: task
Blocked by: 11, 06
Stage: 5 (**cutover gate**)
ADR: 0007

## Steps

1. Install `waregos-backup.timer` and `waregos-diskcheck.timer`, enable, `systemctl list-timers`.
2. Manual run once; check the object in R2 and the success ping.
3. Let the timer run: **at least 4 consecutive scheduled runs (about 24 h)**, all on time in healthchecks.io.
4. Prove the alarm: make one run fail on purpose (e.g. wrong backup password for one run, or force `/fail`) → the **Telegram** notification arrives (email too). Restore the setting and confirm the next run is green.
5. Restore drill on the laptop from a **production** R2 object (runbook from ticket 06).

## Acceptance

- [ ] ≥ 4 consecutive scheduled runs succeeded.
- [ ] Deliberate failure produced a Telegram notification.
- [ ] Drill passed: row counts match the VPS, migrations 14/14, API logs in.
- [ ] Drill recorded in `docs/history.md`; roadmap stage 5 marked done.

## Comments
