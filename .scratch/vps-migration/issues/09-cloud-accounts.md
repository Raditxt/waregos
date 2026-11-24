# 09 — Cloud accounts: R2, healthchecks.io, tunnel, GHCR

Status: resolved
Type: task
Blocked by: — (GHCR visibility needs the first push from ticket 03)
Stage: 2–5
ADR: 0006, 0007

## Steps

- **R2**: production bucket with a **30-day bucket lock** and a lifecycle rule deleting after 35 days; a separate test bucket without lock. Tokens: VPS = Object Read & Write on the production bucket only; laptop = read-only; test = read/write on the test bucket.
- **healthchecks.io**: check `waregos-backup` (period 6 h, grace 2 h), check `waregos-disk` (daily), a test check for ticket 08. Notifications: email only (Telegram dropped 2026-11-24, see Comments).
- **Cloudflare Tunnel**: remotely-managed tunnel for Waregos (separate from TahuHak), public hostname `api.waregos.com → http://api:3001`. Keep the token for `/srv/waregos/.env`.
- **GHCR**: set the API and backup packages to public after their first push.
- **age**: confirm the private key exists in one cloud copy **and** one offline copy (paper or USB stick).

## Acceptance

- [x] All of the above exist; nothing about them (account IDs, tokens, bucket URLs) is written in the repo.
- [x] Bucket lock verified: deleting a fresh test object in the production bucket is refused.

## Comments

- 2026-11-24 (Raditya): blok 1 selesai.
  - R2: bucket uji (tanpa lock) dan token uji (Object Read & Write, hanya bucket uji) dibuat.
  - healthchecks.io: check uji dibuat dan sudah menerima ping dari uji VM-05.
  - Notifikasi diputuskan **email saja**; Telegram tidak dipakai. Ada filter Gmail supaya
    email healthchecks tidak masuk spam.
  - Sisanya selesai di komentar berikut (2026-11-24, lanjutan).
- 2026-11-24 (Raditya, lanjutan): semua langkah selesai; tiket ditutup.
  - GHCR: `waregos-api` dan `waregos-backup` sudah public (otomatis lewat label
    `org.opencontainers.image.source`). `docker pull` tag SHA `332f2f6…` dari VPS tanpa login
    berhasil; history dan env image backup bersih dari rahasia.
  - R2 produksi: bucket lock 30 hari + lifecycle hapus setelah 35 hari (abort multipart 1 hari).
    Token VPS = Object Read & Write, hanya bucket produksi; token laptop = Object Read only,
    hanya bucket produksi.
    - Uji: menghapus objek baru dengan token VPS ditolak (409 `ObjectLockedByBucketPolicy`);
      token laptop bisa list dan baca, menulis ditolak (403).
    - Objek uji `lock-test.txt` dibiarkan; terhapus oleh lifecycle setelah 35 hari.
  - healthchecks.io: check `waregos-backup` (periode 6 jam, grace 2 jam) dan `waregos-disk`
    (periode 1 hari, grace 6 jam), notifikasi email. Keduanya berstatus "new" sampai VPS live.
  - Cloudflare Tunnel: tunnel remotely-managed "waregos" (terpisah dari TahuHak), route
    `api.waregos.com -> http://api:3001`, record DNS dibuat otomatis (proxied). Statusnya
    inactive sampai `cloudflared` jalan di VM-10.
  - age: salinan kedua kunci privat ada di disk lokal laptop, di luar folder yang disinkron;
    kunci publiknya cocok dengan `AGE_RECIPIENT`. **Penyimpangan dari Steps:** salinan offline
    (kertas/USB) tidak dibuat, keputusan Raditya 2026-11-24.
  - Semua rahasia (token, account ID, URL ping, token tunnel) disimpan di luar repo.
