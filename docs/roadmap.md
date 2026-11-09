# Roadmap

Last updated: 2026-11-09. Owner: Raditya. Update this file when a stage finishes.

## Where we are

- Restock policy (M1) is finished, tested locally and merged to `main` (`38117c5`, 2026-11-02).
- Production database (Supabase) has all 14 migrations. Production API (Railway) and web (Cloudflare Pages) still run the pre-restock code; web auto-deploy is off.
- Hosting decided (ADR 0005, revised 2026-11-09): Biznet Gio NEO Lite MS 4.2 (2 vCPU, 4 GB, 60 GB, billed monthly), shared with the TahuHak project.
- Railway's credit ends around **2026-11-14**. It will **not** be paid as a bridge: the shop is not selling through the system yet, so if the move slips past that date only catalog entry pauses. Data stays in Supabase and the daily backup keeps running.
- Next action: buy the VPS and the Waregos domain (stage 1).

## Stages

| # | Stage | Contents | Target | Status |
|---|---|---|---|---|
| A | Catalog entry | Categories and products in production (name, unit, barcode, sell price, estimated buy price, min stock). No opening stock, expiry, purchases, transactions or debts | until Railway stops | in progress |
| B | Try new features | Opening stock, stock and cost corrections, expiry layers, on the laptop only | any time | open |
| 1 | Buy VPS and domain | Biznet MS 4.2, Ubuntu 24.04 LTS (plain), SSH key login, neutral hostname; one `.com` domain for Waregos with DNS on Cloudflare | 2026-11-09/10 | open |
| 2 | Server setup | Hardening (non-root user, key-only SSH, firewall, unattended upgrades, swap 2 GB); Docker; `/srv/waregos` with Compose: Postgres (internal network only), API, `cloudflared`; memory limits per container; small Postgres settings; 14 migrations; roles (owner, `waregos_app`, read-only backup) | 1 session | open |
| 3 | Move data | Dump `public` from Supabase, restore to the VPS, compare row counts per table | same session | open |
| 4 | API live | `api.<domain>` through the tunnel, `/health`, smoke tests, `scripts/security-suite.ps1`, client-IP and rate-limit retest behind the tunnel (spoofed XFF must get 429 on attempt 6) | 1 session | open |
| 5 | Backups | Every 6 h, `age`-encrypted, offsite to Cloudflare R2, alarm when a run is missed (e.g. healthchecks.io), restore drill | 1 session | open |
| 6 | Cutover | Set `NEXT_PUBLIC_API_URL` and `CORS_ORIGINS`, re-enable Cloudflare production auto-deploy, retry deployment `38117c5`, smoke test, move UptimeRobot | as soon as 2–5 pass | open |
| 7 | Retire old hosting | Disable `db-backup.yml` for Supabase, stop Railway, delete the Supabase project after the VPS has been stable for a few days | ~1 week after cutover | open |
| 8 | Go-live prep | Cashier account for the shop with a strong password; POS test on the cashier's real device; `docs/panduan-darurat.md` and `docs/disaster-recovery.md` for the VPS; CSP headers (`apps/web/public/_headers`); CI (typecheck + build) and branch protection on `main`; `chore/deps`; `.gitattributes` normalization | after cutover | open |
| 9 | Cutover day | Count physical stock, record **opening stock** (Saldo Awal) with expiry per batch | one day | open |
| 10 | Parallel run | System and paper notebook side by side for 1–2 weeks, reconcile via daily closing | 1–2 weeks | open |

**v1 is done** when the parallel run passes: cash and stock differences are small, and the cashier uses the POS without the notebook.

## Shared VPS rules (Waregos + TahuHak)

- Each project has its own Compose folder (`/srv/waregos`, `/srv/tahuhak`), its own Postgres, its own Cloudflare Tunnel and its own domain.
- Every container has a memory limit. Waregos has priority: if memory is short, TahuHak is the one that gets limited.
- Images are built in GitHub Actions, never on the VPS.
- Upgrade rule: memory steadily above 70% or swap used regularly means upgrading the plan, not squeezing limits.
- Cost split: the shop pays the Waregos half (about Rp77.000/month incl. VAT) plus the Waregos domain; TahuHak's half is paid personally.

## Rules until cutover

- Cloudflare production auto-deploy stays off.
- Production gets catalog data only. Prefix any test product with `TEST `.
- Daily backup workflow and UptimeRobot stay on.
- If something wrong lands in production, note what and when. Do not "fix" it with a counter-entry; it is cleaned up with SQL later.

## `chore/deps` (after cutover, one step at a time)

Verified 2026-11-02 that nothing in `npm audit --omit=dev` blocks the release.

1. Move `shadcn` to `devDependencies`.
2. `npm audit fix` without `--force`.
3. Update the `fast-uri` override.
4. Upgrade Next to a patched 16.x and rebuild all static pages.
5. Zod 4 migration as its own branch.

Never run `npm audit fix --force`.

## After v1

1. Loss-value report for written-off stock (slice 7 of the restock policy).
2. Box/pcs packaging (M2), tiered pricing.
3. Midtrans dynamic QRIS.
4. Demo system, public repo under a source-available non-commercial license, explainer website.
5. Business plan (selling Waregos as a service).

## Open decisions

- Whether cashiers may see daily profit (`totalProfit` in `/reports/summary` and `/reports/closing`). Currently they can.
- Backup target: Cloudflare R2 (default) or Backblaze B2.
- Waregos domain name.
