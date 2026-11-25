# 06 — Restore drill script and runbook

Status: ready-for-human
Type: task
Blocked by: 05
Stage: 5
ADR: 0007

## What

- Adapt `scripts/pull-latest-backup.ps1` (Windows PowerShell 5.1) to pull the newest object from R2 with a **read-only** token. Keep the GitHub-artifact path working until stage 7, or split into a second script.
- Runbook `docs/restore-drill.md` (Indonesian): decrypt with the offline key, restore into the pinned `postgres:17.<n>` as `waregos_owner` (bootstrap SQL first), row counts per table, `prisma migrate status`, start the API image at the production tag against it, log in. How to record the result in `docs/history.md`. Schedule: before cutover, monthly, after a Postgres major upgrade.

## Acceptance

- [ ] Script tested locally against the test bucket.
- [ ] Runbook followed end to end once on the laptop against a test-bucket dump.
- [ ] No bucket names that reveal anything beyond the project, no account IDs, no server details in the repo.

## Comments
- 2026-11-24: bloker 05 sudah resolved, jadi tiket ini tidak terblokir lagi.
- 2026-11-25 (agent): dikerjakan di `chore/vps-migration`.
  - `scripts/pull-latest-backup.ps1`: parameter `-Sumber R2` (default) / `-Sumber GitHub`
    (jalur artifact `db-backup.yml` lama, tidak diubah, dipakai sampai tahap 7). Jalur R2:
    rclone di container `rclone/rclone:1.68.2` (tidak perlu instal rclone), kredensial dari
    variabel sesi `R2_ENDPOINT`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` dan
    diteruskan ke docker sebagai `-e NAMA` tanpa nilai (tidak muncul di baris perintah). Pilih
    `waregos-YYYYMMDD-HHMMSSZ.dump.age` terbaru dari nama, peringatan kalau umurnya > 8 jam,
    unduh ke `D:\Waregos-Backup\r2\`, cek ukuran sama dengan di bucket.
  - `docs/restore-drill.md` (runbook), `scripts/row-counts.sql` (jumlah baris persis per tabel,
    bisa dipakai juga di VPS), `scripts/restore-drill-login.js` (login + `/api/auth/me` dari dalam
    container `api`, kredensial dari env). Tautan dari `deploy/README.md`.
  - Keputusan runbook: tanpa file `.env` (semua variabel di sesi PowerShell, password DB acak
    sekali pakai); dekripsi + `pg_restore` jalan di container `backup` (tmpfs `/work`), jadi
    plaintext tidak pernah ke disk laptop; project compose terpisah `waregos-drill`.
  - Uji lokal (S3 tiruan = `rclone serve s3 --read-only`, meniru token read-only; dump uji dari
    Postgres 17.11 + 14 migrasi + 2 user + 5 kategori, flag `pg_dump` sama dengan `backup.sh`,
    dienkripsi ke kunci `age` uji; semua dihapus setelahnya):
    - Script: unduh terbaru (objek lama dan `lock-test.txt` diabaikan), jalan kedua "Sudah ada",
      bucket basi memberi peringatan, secret salah / variabel kosong / bucket tanpa backup gagal
      dengan pesan jelas, tidak ada variabel `RCLONE_*` tertinggal di sesi.
    - Runbook langkah 0–7 dijalankan persis dengan image `332f2f6…`: 109 baris daftar isi, satu
      error yang diharapkan, `migrate status` 14 migrasi up to date, 14 tabel sama persis dengan
      sumber, `api` healthy, login admin OK dan password salah 401, `down -v` tanpa sisa volume.
    - Temuan: `dc stop` stack lokal tidak cukup (network `10.89.10.0/24` tetap ada, error
      `Pool overlaps`); runbook sekarang meminta `dc down`.
  - **Belum (perlu Raditya):** acceptance 1 dan 2 dengan bucket R2 **uji sungguhan** dan kunci
    `age` asli: isi variabel R2 dengan token uji, jalankan runbook dari langkah 0. Dump di bucket
    uji dari uji VM-05 dienkripsi ke kunci produksi, jadi langkah 3 sekalian membuktikan kunci
    privat masih bisa dijangkau. Pembanding langkah 5 = database lokal sumber dump VM-05 (kalau
    sudah dibuang, cukup `users` > 0 dan `_prisma_migrations` = 14).
