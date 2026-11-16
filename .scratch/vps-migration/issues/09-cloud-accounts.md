# 09 — Cloud accounts: R2, healthchecks.io, tunnel, GHCR

Status: ready-for-human
Type: task
Blocked by: — (GHCR visibility needs the first push from ticket 03)
Stage: 2–5
ADR: 0006, 0007

## Steps

- **R2**: production bucket with a **30-day bucket lock** and a lifecycle rule deleting after 35 days; a separate test bucket without lock. Tokens: VPS = Object Read & Write on the production bucket only; laptop = read-only; test = read/write on the test bucket.
- **healthchecks.io**: check `waregos-backup` (period 6 h, grace 2 h), check `waregos-disk` (daily), a test check for ticket 08. Notifications: Telegram + email.
- **Cloudflare Tunnel**: remotely-managed tunnel for Waregos (separate from TahuHak), public hostname `api.waregos.com → http://api:3001`. Keep the token for `/srv/waregos/.env`.
- **GHCR**: set the API and backup packages to public after their first push.
- **age**: confirm the private key exists in one cloud copy **and** one offline copy (paper or USB stick).

## Acceptance

- [ ] All of the above exist; nothing about them (account IDs, tokens, bucket URLs) is written in the repo.
- [ ] Bucket lock verified: deleting a fresh test object in the production bucket is refused.

## Comments
