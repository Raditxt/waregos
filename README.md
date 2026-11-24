# Waregos

> 🚧 **Masih dalam pengerjaan.** Belum go-live. Saat ini sedang pindah hosting ke VPS sebelum rilis v1.

Sistem kasir dan manajemen stok untuk toko kelontong, dibuat untuk dan dipakai langsung di
**Toko Rabay Orange**, toko keluarga saya.

Tujuannya bukan cuma mencatat penjualan. Di toko kecil, kerugian paling sering justru tidak
kelihatan: barang kedaluwarsa di rak, barang yang tidak laku berbulan-bulan, dan selisih kas di
akhir hari. Waregos dibuat untuk menangkap tiga hal itu.

## Fitur

Sudah ada di `main`:

- **Kasir (POS)** dengan pembayaran tunai, QRIS (konfirmasi manual), dan hutang
- **Restock** dengan harga pokok rata-rata bergerak (*moving average*) dan tanggal kedaluwarsa per batch
- **Koreksi stok dan koreksi biaya** dengan alasan wajib. Data restock tidak bisa diedit atau dihapus, jadi jejak audit tetap utuh
- **Peringatan** stok menipis, mendekati kedaluwarsa, dan *dead stock*
- **Hutang pelanggan** yang terhubung dengan kasir (buku besar *append-only*)
- **Closing harian** untuk mencocokkan kas fisik dengan catatan
- **Laporan** penjualan dan laba, plus log aktivitas
- **Dua peran**: Admin dan Kasir. Kasir tidak bisa melihat harga beli atau laba per produk

Direncanakan setelah v1: laporan nilai kerugian barang dibuang, penjualan per dus/pcs, harga
bertingkat, dan QRIS dinamis lewat Midtrans.

## Tech stack

| Bagian    | Teknologi |
|-----------|-----------|
| API       | Node.js 22, Fastify 5, Prisma 6, Zod, JWT |
| Database  | PostgreSQL |
| Web       | Next.js 16 (static export), React 19, Tailwind CSS 4, shadcn/ui, Zustand, Recharts |
| Monorepo  | Turborepo + npm workspaces |
| Infra     | Docker, Cloudflare Pages, GitHub Actions (backup database terenkripsi harian) |

## Struktur

```
apps/
  api/         REST API (Fastify)
  web/         Dashboard web responsif (Next.js, static export)
packages/
  database/    Schema Prisma, migrasi, seed
  types/       Tipe bersama API ↔ web
  utils/       Utilitas bersama (batas hari zona waktu toko, nomor invoice, batas input)
deploy/        Stack produksi di VPS (Compose, job backup, systemd)
docs/          Roadmap, riwayat, arsitektur, dan ADR
```

Penjelasan lengkap (alur request, aturan domain, diagram deploy) ada di
[`docs/architecture.md`](docs/architecture.md). Istilah domain ada di [`GLOSSARY.md`](GLOSSARY.md).

## Menjalankan secara lokal

Prasyarat: Node.js 22+, PostgreSQL lokal, npm.

```sh
npm install

# 1. Salin contoh env, lalu isi (komentar di tiap file menjelaskan variabelnya)
cp apps/api/.env.example apps/api/.env                     # DATABASE_URL, JWT_SECRET, CORS_ORIGINS
cp packages/database/.env.example packages/database/.env   # DATABASE_URL, DIRECT_URL
# apps/web/.env.example hanya perlu disalin ke apps/web/.env.local kalau API tidak di localhost:3001

# 2. Database (hanya localhost: pastikan baris "Datasource" yang dicetak Prisma = localhost:5432)
npm run db:deploy -w @waregos/database
npm run db:seed   -w @waregos/database

# 3. Jalankan API + web
npm run dev
```

API berjalan di `http://localhost:3001`, web di `http://localhost:3000`. Seed dev membuat akun
contoh `admin` / `admin123` (Admin) dan `ibu` / `kasir123` (Kasir).

### Variabel env

| Variabel | File | Wajib | Fungsi |
|---|---|---|---|
| `DATABASE_URL` | api, database | ya | Koneksi Postgres |
| `DIRECT_URL` | database | ya | Koneksi langsung untuk migrasi Prisma |
| `JWT_SECRET` | api | ya | Rahasia token login (produksi: minimal 32 karakter) |
| `CORS_ORIGINS` | api | ya | Origin web yang boleh memanggil API, dipisah koma |
| `TRUST_PROXY_CIDRS` | api | produksi | CIDR proxy tepercaya untuk IP klien (ADR 0008) |
| `API_PORT`, `API_HOST`, `NODE_ENV` | api | tidak | Default `3001`, `0.0.0.0`, `development` |
| `SEED_ADMIN_USERNAME`, `SEED_ADMIN_PASSWORD` | database | seed produksi | Akun admin awal saat `NODE_ENV=production` |
| `NEXT_PUBLIC_API_URL` | web | tidak | Base URL API, ditanam saat build. Default `http://localhost:3001/api` |

Variabel stack VPS (image, password role database, tunnel, backup R2) ada di
[`deploy/.env.example`](deploy/.env.example), dan untuk gladi bersih di `.env.rehearsal.example`.

### Verifikasi

Jalankan sebelum menganggap perubahan selesai:

```sh
npm run typecheck -w @waregos/api
cd apps/web; npx tsc --noEmit; cd ../..
npx tsx apps/api/src/shared/expiry-layers.test.ts
npx tsx apps/api/src/shared/trust-proxy.test.ts
npx tsx apps/api/src/shared/input-limits.test.ts
npx tsx apps/api/src/shared/body-limit.test.ts
```

Belum ada test runner. Tiap `*.test.ts` adalah skrip `node:assert` yang mencetak "semua tes lulus".

Gladi bersih dengan Docker (database kosong → migrasi → seed → API di port 3002):

```sh
docker compose -f docker-compose.rehearsal.yml --env-file .env.rehearsal up --build
```

## Status

| Tahap | Status |
|---|---|
| Fitur inti (POS, stok, hutang, closing, laporan) | ✅ selesai |
| Kebijakan restock (harga rata-rata, saldo awal, kedaluwarsa per batch) | ✅ selesai, di `main` |
| Hardening auth, backup terenkripsi harian, uji restore | ✅ selesai |
| Pindah API dan database ke VPS | 🔄 sedang dikerjakan |
| Input katalog produk asli | 🔄 sedang dikerjakan |
| Go-live dan uji paralel dengan buku catatan (1–2 minggu) | ⏳ belum |

v1 dianggap selesai kalau uji paralel lolos: selisih kas dan stok kecil, dan kasir sudah bisa
memakai POS tanpa buku catatan. Detail lengkap ada di [`docs/roadmap.md`](docs/roadmap.md).

## Dokumentasi

- [`docs/roadmap.md`](docs/roadmap.md): tahapan menuju v1 dan setelahnya
- [`docs/history.md`](docs/history.md): apa yang sudah terjadi dan pelajarannya
- [`docs/architecture.md`](docs/architecture.md): peta folder, alur request, aturan domain, diagram deploy
- [`GLOSSARY.md`](GLOSSARY.md): istilah domain (Saldo Awal, hutang, closing, dead stock, ...)
- [`deploy/README.md`](deploy/README.md): menjalankan stack produksi di VPS
- [`docs/adr/`](docs/adr/): *Architecture Decision Records*, alasan di balik keputusan teknis

## Konvensi

- Commit mengikuti [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`)
- Satu branch per fitur, digabung ke `main`
- Keputusan arsitektur baru ditulis sebagai ADR

## Lisensi

Belum ditentukan. Selama belum ada file `LICENSE`, seluruh hak cipta tetap pada pemilik repo.