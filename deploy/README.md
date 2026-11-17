# deploy/

Stack produksi Waregos di VPS: Postgres, API, Cloudflare Tunnel (ADR 0006, 0007, 0008).
Semua langkah di sini dijalankan Raditya dengan tangan. Tidak ada deploy otomatis.

## Isi

| File | Fungsi |
|---|---|
| `compose.yaml` | Service `db`, `api`, `cloudflared`, serta `migrate` dan `backup` (profile `ops`) |
| `.env.example` | Semua variabel, tanpa rahasia |
| `sql/bootstrap-roles.sql` | Role `waregos_owner`, `waregos_app`, `waregos_backup`, tanpa password |
| `postgres-tag` | Tag image Postgres untuk base image backup. Harus sama dengan `POSTGRES_TAG` di `.env` |
| `backup/` | Image dan skrip job backup (ADR 0007) |
| `systemd/` | Timer host yang menjalankan backup tiap 6 jam |

## Tata letak di VPS

```
/srv/waregos/
  .env        # rahasia, chmod 600, dari deploy/.env.example
  repo/       # clone read-only, di-checkout ke SHA yang sama dengan API_IMAGE_TAG
```

Semua perintah dijalankan dari `/srv/waregos`. Singkatnya:

```sh
alias dc='docker compose -f repo/deploy/compose.yaml --env-file .env'
```

## Pertama kali (database kosong)

```sh
dc up -d db
dc cp repo/deploy/sql/bootstrap-roles.sql db:/tmp/bootstrap.sql
dc exec db psql -U postgres -d waregos -v ON_ERROR_STOP=1 -f /tmp/bootstrap.sql
dc exec db rm /tmp/bootstrap.sql
dc exec db psql -U postgres -d waregos   # lalu:
#   \password waregos_owner
#   \password waregos_app
#   \password waregos_backup
# Isinya harus sama persis dengan .env.
```

Lalu salah satu:

- **Data dari dump** (tiket 11): restore **sebagai `waregos_owner`**, bukan `postgres`.
  Error yang boleh muncul hanya satu: `schema "public" already exists`. Error lain berarti restore gagal.
  Dump sudah membawa `_prisma_migrations`, jadi `migrate` setelahnya harus melapor tidak ada yang perlu diterapkan.
- **Database baru tanpa data**: `dc --profile ops run --rm migrate`.

Seed **tidak pernah** dijalankan di VPS.

Lalu `dc up -d api` (dan `cloudflared` setelah tunnel siap).

## Rilis

1. Backup manual dulu (setelah tiket 05 ada).
2. Kalau rilis membawa migrasi: `dc --profile ops run --rm migrate`.
3. Di `.env`, ubah `API_IMAGE_TAG` ke SHA baru dan simpan SHA lama sebagai komentar.
   `git -C repo fetch && git -C repo checkout <sha>`.
4. `dc pull && dc up -d`.

## Backup (ADR 0007)

Tiap 6 jam timer systemd di host menjalankan service `backup`: `pg_dump` sebagai `waregos_backup`
ke tmpfs, cek daftar isi dump, enkripsi `age`, unggah ke R2, cek ukuran di R2, lalu ping
healthchecks.io (`/fail` kalau ada langkah yang gagal). Tidak ada salinan di VPS. Image-nya
`ghcr.io/raditxt/waregos-backup:<API_IMAGE_TAG>`, dibangun workflow `images` bersama image API.

Isi variabel bagian "Backup" di `.env` dulu (tiket 09). Backup manual:

```sh
dc --profile ops run --rm --no-deps backup
# berhasil: "OK: waregos-<waktu>.dump.age (<n> byte, ...)" dan exit 0
```

Pasang timer (sekali):

```sh
sudo install -m 0644 repo/deploy/systemd/waregos-backup.service repo/deploy/systemd/waregos-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now waregos-backup.timer
systemctl list-timers waregos-backup.timer   # jadwal berikutnya
journalctl -u waregos-backup.service -n 50   # log run terakhir
```

Setelah unit di `repo/deploy/systemd/` berubah, ulangi `install` dan `daemon-reload`.

Naik versi minor Postgres: backup manual dulu, ubah `deploy/postgres-tag` lewat commit (image
backup ikut dibangun ulang), lalu samakan `POSTGRES_TAG` di `.env` dan `dc up -d db`. Log tiap
backup mencatat versi `pg_dump` dan server, jadi selisihnya terlihat.

## Rollback

- Migrasi dibuat **kompatibel dengan image sebelumnya** (expand/contract), jadi rollback = kembalikan
  `API_IMAGE_TAG` lama, `git -C repo checkout <sha-lama>`, lalu `dc pull && dc up -d`.
- Kalau migrasi tidak bisa dibuat kompatibel, backup manual di langkah 1 wajib dan **rollback = restore**.

## Cek setelah mengubah `compose.yaml` (ADR 0008)

Docker menulis aturan iptables sendiri dan melewati UFW, jadi cek langsung:

```sh
dc config | grep -n 'published' || echo "tidak ada port"   # harus: tidak ada port
ss -tlnp | grep -E ':3001|:5432' || echo "aman"              # harus: aman
docker network inspect waregos_internal --format '{{range .Containers}}{{.Name}} {{end}}'
```

Network `internal` hanya boleh berisi `db`, `api`, `backup`, dan `cloudflared`. Container
`backup` hanya muncul selama backup berjalan.
Subnetnya `10.89.10.0/24`. Kalau subnet diubah, `TRUST_PROXY_CIDRS` ikut diubah.

## Uji di laptop

Pakai `deploy/.env.local` (tidak di-commit) dan image API yang dibangun lokal.
Di PowerShell, dari root repo:

```powershell
function dc { docker compose -f deploy/compose.yaml --env-file deploy/.env.local @args }
docker build -f apps/api/Dockerfile -t ghcr.io/raditxt/waregos-api:local .
# di .env.local: API_IMAGE_TAG=local
dc up -d db
```

**Jangan pipe ke `dc`** (`Get-Content x | dc exec -T ...` atau `<`): stdin tidak diteruskan
ke fungsi PowerShell dan perintahnya menggantung. Salin file ke container dengan `dc cp`,
lalu jalankan dengan `-f` (bootstrap) atau path file di container (restore).

Bootstrap role dan password sama seperti bagian "Pertama kali", dengan path `deploy/sql/bootstrap-roles.sql`.

Restore dump yang sudah didekripsi, **sebagai `waregos_owner`**:

```powershell
dc cp <dump-plaintext> db:/tmp/restore.dump
dc exec db pg_restore -U waregos_owner -d waregos --no-owner --no-acl /tmp/restore.dump
# Harus tepat satu error: schema "public" already exists
dc exec db rm /tmp/restore.dump
Remove-Item <dump-plaintext>   # plaintext jangan tertinggal di laptop
dc --profile ops run --rm migrate   # harus: no pending migrations
dc up -d api
```

`api` tidak punya port di host. Cek dengan `dc ps` (status `healthy`).

### Backup di laptop

Build image backup lokal (tag `local`, sama dengan `API_IMAGE_TAG=local`), lalu isi variabel
"Backup" di `.env.local` dengan **bucket R2 uji** dan **check healthchecks uji** (tiket 09):

```powershell
docker build -f deploy/backup/Dockerfile --build-arg POSTGRES_TAG=$(Get-Content deploy/postgres-tag) -t ghcr.io/raditxt/waregos-backup:local deploy/backup
dc --profile ops run --rm --no-deps backup
```

