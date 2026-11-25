# Restore drill

Membuktikan bahwa backup di R2 bisa dipulihkan menjadi database yang dipakai API (ADR 0007).
Dijalankan Raditya di **laptop** (Windows PowerShell 5.1, Docker Desktop). Tidak menyentuh VPS
kecuali satu query hitung baris pembanding (langkah 5). Waktu: sekitar 20 menit.

## Kapan

- **Sekali sebelum cutover.** Ini gerbang cutover: belum lolos = belum cutover.
- **Tiap bulan** setelah itu.
- **Setelah setiap naik versi major Postgres** (mis. 17 ke 18), di versi yang baru.
- Boleh juga kapan saja setelah mengubah `deploy/backup/` atau `deploy/sql/`.

## Yang disiapkan

| Apa | Dari mana |
|---|---|
| Docker Desktop jalan | — |
| `age` (`winget install FiloSottile.age`) | — |
| Kunci privat `age` | Salinan di laptop atau cloud. Drill ini sekalian membuktikan kunci masih bisa dijangkau |
| Token R2 **laptop** (Object Read only, bucket produksi): endpoint, nama bucket, access key ID, secret | Pengelola password. Untuk uji script: token bucket **uji** |
| `API_IMAGE_TAG` yang sedang jalan di VPS | `.env` di VPS (SHA penuh) |
| Username + password satu akun admin produksi | Raditya |

Image yang dipakai: `ghcr.io/raditxt/waregos-api:<API_IMAGE_TAG>` dan
`ghcr.io/raditxt/waregos-backup:<API_IMAGE_TAG>` (public, tanpa login).

**Plaintext dump tidak pernah ditulis ke disk laptop.** Dekripsi dan `pg_restore` jalan di
container `backup` yang menulis hanya ke tmpfs, sama seperti di VPS.

## 0. Sesi PowerShell baru

Semua nilai di bawah hanya hidup di sesi ini dan hilang saat jendela ditutup. **Tidak ada
file `.env`.** Password database dibuat acak dan dibuang setelah drill; bukan password produksi.

Turunkan dulu stack lokal lain yang memakai `deploy/compose.yaml` dengan
`docker compose -p waregos down` (data di volume tetap aman; di laptop tidak ada alias `dc`).
Network `10.89.10.0/24` hanya bisa dipakai satu project sekaligus, dan `stop` tidak cukup
karena network-nya tetap ada; gejalanya `Pool overlaps with other one on this address space`
di langkah 2.

Branch yang di-switch harus berisi kode drill (`compose.yaml`, `bootstrap-roles.sql` dan
`scripts/` yang dipakai di bawah). Biasanya `main`; selama kode drill belum di-merge ke `main`,
pakai branch tempat kode itu berada.

```powershell
cd D:\Kuroya\Project\waregos
git switch main; git pull --ff-only   # atau branch yang berisi kode drill, lihat di atas

$env:API_IMAGE_TAG = '<sha-penuh-dari-.env-VPS>'
$env:POSTGRES_TAG  = (Get-Content deploy/postgres-tag)   # harus sama dengan POSTGRES_TAG di .env VPS
$env:POSTGRES_SUPERUSER_PASSWORD = [guid]::NewGuid().ToString('N')
$env:WAREGOS_OWNER_PASSWORD      = [guid]::NewGuid().ToString('N')
$env:WAREGOS_APP_PASSWORD        = [guid]::NewGuid().ToString('N')
$env:JWT_SECRET    = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
$env:CORS_ORIGINS  = 'http://localhost:3000'
$env:CLOUDFLARED_TAG = 'tidak-dipakai'   # wajib terisi untuk compose; cloudflared tidak dinyalakan

$drillDir = 'D:\Waregos-Backup\drill'
New-Item -ItemType Directory -Force $drillDir | Out-Null
function drill { docker compose -p waregos-drill -f deploy/compose.yaml --env-file deploy/.env.example @args }
# Rahasia diketik tanpa tampil di layar; nilainya tetap hanya hidup di sesi ini.
function Read-Secret($prompt) { [Net.NetworkCredential]::new('', (Read-Host $prompt -AsSecureString)).Password }
```

`--env-file deploy/.env.example` sengaja: semua variabel yang dipakai sudah diisi di sesi, dan
nilai di sesi selalu menang atas isi file. Tanpa `--env-file`, compose diam-diam membaca
`deploy/.env` kalau ada.

## 1. Tarik backup terbaru dari R2

```powershell
$env:R2_ENDPOINT          = Read-Host 'R2 endpoint'
$env:R2_BUCKET            = Read-Host 'R2 bucket'
$env:R2_ACCESS_KEY_ID     = Read-Host 'R2 access key ID (token laptop)'
$env:R2_SECRET_ACCESS_KEY = Read-Secret 'R2 secret (token laptop)'
.\scripts\pull-latest-backup.ps1
Remove-Item Env:R2_*
$backup = Get-ChildItem D:\Waregos-Backup\r2\waregos-*.dump.age | Sort-Object Name -Descending | Select-Object -First 1
$backup.Name
```

- Peringatan "berumur > 8 jam" saat drill produksi = backup di VPS berhenti. Hentikan drill
  dan periksa healthchecks dan `journalctl -u waregos-backup.service` di VPS.
- Catat nama file: waktunya (UTC) adalah titik data yang dipulihkan.

## 2. Database kosong dan role

```powershell
drill up -d db
drill ps db        # tunggu STATUS (healthy)
drill cp deploy/sql/bootstrap-roles.sql db:/tmp/bootstrap.sql
drill exec db psql -U postgres -d waregos -v ON_ERROR_STOP=1 -f /tmp/bootstrap.sql
drill exec db rm /tmp/bootstrap.sql
drill exec db psql -U postgres -d waregos -c "ALTER ROLE waregos_owner PASSWORD '$env:WAREGOS_OWNER_PASSWORD'"
drill exec db psql -U postgres -d waregos -c "ALTER ROLE waregos_app PASSWORD '$env:WAREGOS_APP_PASSWORD'"
```

Bootstrap harus selesai tanpa `ERROR`.

## 3. Dekripsi dan restore sebagai `waregos_owner`

```powershell
$kunci = Read-Host 'Path file kunci privat age'
$env:PGUSER = 'waregos_owner'; $env:PGPASSWORD = $env:WAREGOS_OWNER_PASSWORD
drill --profile ops run --rm --no-deps -e PGUSER -e PGPASSWORD `
  -v "$($backup.FullName):/in/backup.age:ro" -v "${kunci}:/in/kunci.txt:ro" `
  --entrypoint sh backup -c 'age -d -i /in/kunci.txt -o /work/db.dump /in/backup.age && pg_restore --list /work/db.dump | wc -l && pg_restore --no-owner --no-acl -d waregos /work/db.dump; echo pg_restore exit $?'
Remove-Item Env:PGUSER, Env:PGPASSWORD
```

Hasil yang benar, berurutan:

1. Satu angka: jumlah baris daftar isi dump (patokan: **109** untuk 14 migrasi).
2. Tepat **satu** error: `schema "public" already exists`, lalu `errors ignored on restore: 1`.
3. `pg_restore exit 1` (exit 1 karena error di atas).

Kalau `age` gagal (`no identity matched`), kuncinya salah atau rusak: **ini temuan serius**,
hentikan dan catat. Error lain dari `pg_restore` = drill gagal.

## 4. Status migrasi

```powershell
drill --profile ops run --rm migrate /app/node_modules/.bin/prisma migrate status --schema prisma/schema.prisma
```

Harus: `Datasource "db": PostgreSQL database "waregos", schema "public" at "db:5432"`,
`<n> migrations found in prisma/migrations` dan `Database schema is up to date!`
(`<n>` = jumlah folder di `packages/database/prisma/migrations` pada SHA itu).

## 5. Jumlah baris per tabel

```powershell
drill cp scripts/row-counts.sql db:/tmp/row-counts.sql
drill exec db psql -U postgres -d waregos -X -A -F ' ' -t -f /tmp/row-counts.sql | Tee-Object "$drillDir\$($backup.BaseName)-laptop.txt"
```

Pembanding dari VPS, dijalankan Raditya **di VPS** sesegera mungkin (bash, dari `/srv/waregos`):

```sh
dc exec -T db psql -U postgres -d waregos -X -A -F ' ' -t < repo/scripts/row-counts.sql
```

Lolos kalau:

- Daftar tabelnya sama persis.
- `users` > 0 dan `_prisma_migrations` = `<n>` dari langkah 4.
- Tiap tabel di laptop **≤** VPS, dan selisihnya masuk akal untuk aktivitas toko sejak jam di
  nama file backup (transaksi, `stock_movements`, `activity_logs`, ...). Tabel yang tidak
  berubah sejak backup (mis. `units`, `categories` saat katalog diam) harus sama persis.

Sebelum VPS live (uji dengan bucket uji), pembandingnya adalah database sumber dump uji.

## 6. API di atas database hasil restore

```powershell
drill up -d api
drill ps api       # tunggu STATUS (healthy); /health menjalankan SELECT 1 sebagai waregos_app
drill cp scripts/restore-drill-login.js api:/tmp/login.js
$env:DRILL_USERNAME = Read-Host 'Username admin'
$env:DRILL_PASSWORD = Read-Secret 'Password admin'
drill exec -e DRILL_USERNAME -e DRILL_PASSWORD api node /tmp/login.js
Remove-Item Env:DRILL_USERNAME, Env:DRILL_PASSWORD
```

Harus: `OK login: <username> (ADMIN), /api/auth/me HTTP 200`. Ini membuktikan hash password,
JWT dan baca data jalan dengan image produksi. `api` tidak punya port di host (ADR 0008),
jadi login dilakukan dari dalam container.

## 7. Bersihkan

```powershell
drill down -v                       # -v: hapus volume berisi salinan data produksi
docker volume ls -q | Select-String waregos-drill   # harus kosong
Remove-Item $backup.FullName        # file terenkripsi; aslinya tetap di R2
```

Lalu **tutup jendela PowerShell** supaya semua variabel sesi hilang.

## 8. Catat di `docs/history.md`

Satu bagian per drill, tanpa detail server, nama bucket atau account ID:

```markdown
## 2026-MM-DD: Restore drill (lolos | GAGAL)

- Backup: `waregos-YYYYMMDD-HHMMSSZ.dump.age` (<ukuran> byte, umur <n> jam saat ditarik).
- Image: API dan backup `<sha pendek>`, Postgres `<POSTGRES_TAG>`.
- Restore sebagai `waregos_owner`: <baris daftar isi> baris daftar isi, satu error yang diharapkan.
- `prisma migrate status`: <n> migrasi, up to date.
- Jumlah baris: <n> tabel, laptop <= VPS, selisih terbesar <tabel> (+<n>, aktivitas sejak backup).
- Login admin lewat API: OK.
- Waktu total: <n> menit. Catatan: <apa pun yang beda dari runbook ini; runbook ikut diperbaiki>.
```

Drill yang gagal juga dicatat, beserta tiket perbaikannya. Sebelum cutover, drill yang gagal
berarti cutover ditunda.
