# 13 — Backups live and first restore drill

Status: ready-for-human
Type: task
Blocked by: 11, 06
Stage: 5 (**cutover gate**)
ADR: 0007

## Steps

1. Install `waregos-backup.timer` and `waregos-diskcheck.timer`, enable, `systemctl list-timers`.
2. Manual run once; check the object in R2 and the success ping.
3. Wait for at least two scheduled runs; confirm healthchecks shows them on time.
4. Test the alarm: stop the timer past period + grace (or force `/fail`) → Telegram and email arrive. Re-enable.
5. Restore drill on the laptop from a **production** R2 object (runbook from ticket 06).

## Acceptance

- [ ] Scheduled runs on time, alarm proven on both channels.
- [ ] Drill passed: row counts match the VPS, migrations 14/14, API logs in.
- [ ] Drill recorded in `docs/history.md`; roadmap stage 5 marked done.

## Comments
