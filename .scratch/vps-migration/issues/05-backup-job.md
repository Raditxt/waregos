# 05 — Backup job (image, script, systemd timer)

Status: ready-for-agent
Type: task
Blocked by: 03, 04, 09 (hanya untuk uji dengan R2 dan healthchecks sungguhan)
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
- [x] Forced failure (wrong password) pings `/fail` and leaves no file anywhere.
- [x] No plaintext dump on any disk path during or after the run.
- [x] `systemd-analyze verify` passes on the unit files (if available locally; otherwise note it for ticket 13).

## Comments

- 2026-11-16 (dari VM-04): `POSTGRES_TAG` sekarang ada di `.env` (dibaca `deploy/compose.yaml`).
  Workflow CI untuk image backup butuh nilai yang sama sebagai build-arg dan tidak bisa membaca
  `.env`. Putuskan sumber tunggalnya di VM-05 (bawa ke PM chat kalau ragu).
- 2026-11-17 (agent): dikerjakan di `chore/vps-migration`. Sumber tunggal tag Postgres untuk CI
  = file `deploy/postgres-tag` (diputuskan Raditya 2026-11-17: tercatat di git dan build bisa
  diulang; variabel GitHub ditolak karena tidak ada riwayatnya). `.env` VPS tetap diisi tangan
  supaya upgrade minor Postgres selalu disengaja (ADR 0006); log tiap backup mencatat versi
  `pg_dump` dan server.
  - Berkas: `deploy/backup/Dockerfile` (base `postgres:${POSTGRES_TAG}`, + age 1.1.1,
    rclone 1.60.1, curl; user `postgres` uid 999), `deploy/backup/backup.sh` (POSIX sh,
    `set -eu`, trap EXIT → `/fail` berisi nama langkah), service `backup` di `compose.yaml`
    (profile `ops`, tmpfs `/work` 128 MB, `read_only`, `cap_drop: ALL`,
    `no-new-privileges`, `mem_limit` 256 MB, tag image = `API_IMAGE_TAG`), job `backup` di
    `images.yml`, `deploy/systemd/waregos-backup.{service,timer}`, README dan `.env.example`.
  - Skrip menolak jalan kalau `/work` bukan tmpfs atau ada variabel yang kosong.
  - Uji lokal (proyek compose terpisah `waregos-vm05`, nilai uji dari variabel shell, tanpa
    file `.env`; DB baru + bootstrap role + 14 migrasi + 1 baris `users`; R2 diganti backend
    `local` rclone, healthchecks diganti server tiruan; semuanya dihapus setelahnya):

    | Run | Hasil | Ping | File di bucket |
    |---|---|---|---|
    | normal | exit 0, `waregos-…Z.dump.age` 37.715 byte, 109 baris daftar isi | `/start`, sukses | +1 |
    | password salah | exit 2, langkah "koneksi database" | `/start`, `/fail` | tetap |
    | `AGE_RECIPIENT` kosong | exit 1, "cek konfigurasi" | `/fail` | tetap |
    | `/work` bukan tmpfs | exit 1, "bukan tmpfs" | `/fail` | tetap |
    | tujuan unggah read-only | exit 1, "unggah ke R2" setelah 3 percobaan | `/start`, `/fail` | tetap |

  - File hasil run normal didekripsi dengan kunci uji di dalam tmpfs container dan di-restore ke
    database kosong: `users=1`, `_prisma_migrations=14`, 14 tabel; satu-satunya error
    `schema "public" already exists`.
  - Plaintext: mount yang bisa ditulis di container hanya `/work` (tmpfs) dan
    `/var/lib/postgresql/data` (`VOLUME` image postgres). Yang kedua ditutup dengan tmpfs 1 MB
    mode 0555, jadi tidak ada lagi volume disk anonim per run (jumlah volume sebelum = sesudah).
  - `systemd-analyze verify` (systemd 252, Debian bookworm, `docker.service` tiruan): lolos tanpa
    peringatan. `OnCalendar` berikutnya: 00:00, 06:00, 12:00, 18:00 waktu server.
  - `compose config`: valid, tidak ada `published` port; workflow YAML ter-parse dan validasi
    `deploy/postgres-tag` menolak `latest`, `17-bookworm`, `17.11`.
  - **Belum:** acceptance 1 (unggah ke bucket R2 uji sungguhan + ping healthchecks sungguhan)
    menunggu tiket 09. Begitu variabel "Backup" di `deploy/.env.local` terisi, cukup jalankan
    perintah di README bagian "Backup di laptop" lalu centang item itu. Hal yang baru teruji di
    R2 sungguhan: `RCLONE_CONFIG_R2_NO_CHECK_BUCKET` dengan token yang hanya boleh menulis objek,
    dan `rclone lsf` dengan token itu.
