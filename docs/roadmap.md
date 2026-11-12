# Roadmap

Last updated: 2026-11-12. Owner: Raditya. Update this file when a stage finishes.

## Where we are

- Restock policy (M1) is finished, tested locally and merged to `main` (`38117c5`, 2026-11-02).
- Production database (Supabase) has all 14 migrations. Production API (Railway) and web (Cloudflare Pages) still run the pre-restock code; web auto-deploy is off.
- VPS (Biznet Gio NEO Lite MS 4.2, Ubuntu 24.04, shared with TahuHak) is running since 2026-11-09. Hardening finished 2026-11-10 (stage 2, first half). Compose stack, migrations, DB roles, tunnel and backups are not done yet.
- Domain `waregos.com` bought 2026-11-11 at Cloudflare Registrar. Subdomains and the no-DNS-to-IP rule are in ADR 0005.
- Railway's credit ends around **2026-11-14** and will **not** be paid. Catalog entry stops until cutover. Data stays in Supabase and the daily backup keeps running.
- Cutover is gated by working R2 backups and a passed restore drill (stage 5), not by the domain.
- Target: v1 done mid-January 2027, at about 5 hours of work per week.
- Work happens on branch `chore/vps-migration`; tickets in `.scratch/vps-migration/`.
- Next action: Compose stack on the VPS, move data, API live (stages 2–4).

## Stages

| # | Stage | Contents | Target | Status |
|---|---|---|---|---|
| A | Catalog entry | Categories and products in production (name, unit, barcode, sell price, estimated buy price, min stock). No opening stock, expiry, purchases, transactions or debts | until Railway stops (~2026-11-14), resumes after cutover | in progress |
| B | Try new features | Opening stock, stock and cost corrections, expiry layers, on the laptop only | any time | open |
| 1 | Buy VPS and domain | Biznet MS 4.2, Ubuntu 24.04 LTS (plain), SSH key login, neutral hostname; one `.com` domain for Waregos with DNS on Cloudflare | 2026-11-09/11 | done |
| 2 | Server setup | Hardening (non-root user, key-only SSH, firewall, unattended upgrades, swap 2 GB) — done 2026-11-10; Docker; `/srv/waregos` with Compose: Postgres (internal network only), API, `cloudflared`; memory limits per container; small Postgres settings; 14 migrations; roles (owner, `waregos_app`, read-only backup) | 17–23 Nov | in progress |
| 3 | Move data | Dump `public` from Supabase, restore to the VPS, compare row counts per table | 17–23 Nov | open |
| 4 | API live | `api.waregos.com` through the tunnel, `/health`, smoke tests, `scripts/security-suite.ps1`, client-IP and rate-limit retest behind the tunnel (spoofed XFF must get 429 on attempt 6) | 17–23 Nov | open |
| 5 | Backups | Every 6 h, `age`-encrypted, offsite to Cloudflare R2, alarm when a run is missed (e.g. healthchecks.io), restore drill. **Gate for cutover** | 24–30 Nov | open |
| 6 | Cutover | Attach `app.waregos.com` to Cloudflare Pages, set `NEXT_PUBLIC_API_URL` and `CORS_ORIGINS` (`https://app.waregos.com`, keep `https://waregos.pages.dev` until stable), re-enable Cloudflare production auto-deploy, retry deployment `38117c5`, smoke test, move UptimeRobot | 1–7 Dec | open |
| 7 | Retire old hosting | Disable `db-backup.yml` for Supabase, stop Railway, delete the Supabase project after the VPS has been stable for a few days | ~1 week after cutover | open |
| 8 | Go-live prep | Cashier account for the shop with a strong password; POS test on the cashier's real device; `docs/panduan-darurat.md` and `docs/disaster-recovery.md` for the VPS; CSP headers (`apps/web/public/_headers`); CI (typecheck + build) and branch protection on `main`; `chore/deps`; `.gitattributes` normalization; `LICENSE` for the public repo | 8–21 Dec | open |
| 9 | Cutover day | Count physical stock, record **opening stock** (Saldo Awal) with expiry per batch | 22–28 Dec | open |
| 10 | Parallel run | System and paper notebook side by side for 1–2 weeks, reconcile via daily closing | 29 Dec–11 Jan (may stretch over Christmas/New Year) | open |

**v1 is done** when the parallel run passes: cash and stock differences are small, and the cashier uses the POS without the notebook. Target: mid-January 2027.

## Risks being watched

- **Time.** About 5 hours per week. When something has to slip, cut scope elsewhere; backups and the missed-run alarm are never cut.
- **Gap after Railway stops.** Pause the API monitor in UptimeRobot so it does not alarm for nothing. Supabase free projects can pause after 7 days without activity; if that happens, restore the project from the Supabase dashboard before taking the dump.
- **Year-end holidays.** Christmas and New Year fall inside stages 9–10; the parallel run may need to be extended.
- **Cashier adoption.** The cashier has to actually use the POS instead of the notebook; the parallel run is where this shows.

## Shared VPS rules (Waregos + TahuHak)

- Each project has its own Compose folder (`/srv/waregos`, `/srv/tahuhak`), its own Postgres, its own Cloudflare Tunnel and its own domain.
- Every container has a memory limit. Waregos has priority: if memory is short, TahuHak is the one that gets limited.
- Images are built in GitHub Actions, never on the VPS.
- Upgrade rule: memory steadily above 70% or swap used regularly means upgrading the plan, not squeezing limits.
- Cost split: split between the shop and the other project; the details are kept outside the repo.

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
- Backup details (target, runner, retention, alarm), to be decided in a `/grilling` session.
- License for the public repo.
