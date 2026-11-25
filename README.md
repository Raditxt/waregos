# Waregos

> 🚧 **Masih dalam pengerjaan, belum go-live.** Fitur aplikasi sudah jadi dan sudah diuji di laptop.
> Saat ini hosting sedang dipindah ke VPS. Target v1 selesai: pertengahan Januari 2027.

Sistem kasir (POS) dan manajemen stok berbasis web untuk toko kelontong. Dibuat untuk dan akan
dipakai langsung di **Toko Rabay Orange**, toko keluarga saya.

*English summary for recruiters: [jump to "In English"](#in-english).*

---

## Untuk siapa README ini

| Kalau Anda... | Baca bagian |
|---|---|
| Ingin tahu aplikasi ini untuk apa (tanpa istilah teknis) | [Masalah yang diselesaikan](#masalah-yang-diselesaikan), [Sehari di toko](#sehari-di-toko-dengan-waregos) |
| Recruiter atau reviewer | [Sorotan teknis](#sorotan-teknis), [Progres](#progres-sejauh-ini) |
| Programmer yang ingin menjalankan kodenya | [Menjalankan secara lokal](#menjalankan-secara-lokal) |

## Masalah yang diselesaikan

Di toko kecil, kerugian paling sering justru tidak kelihatan:

1. **Barang kedaluwarsa di rak.** Baru ketahuan saat pembeli komplain atau saat bersih-bersih.
2. **Barang yang tidak laku berbulan-bulan** (*dead stock*). Uang tertahan di barang yang diam.
3. **Selisih kas di akhir hari.** Uang di laci tidak cocok dengan penjualan, dan sulit dilacak sebabnya.

Selama ini semua dicatat di buku tulis. Waregos menggantikan buku itu dan memberi peringatan
untuk ketiga hal di atas.

## Sehari di toko dengan Waregos

Ada dua peran: **Admin** (pemilik toko) dan **Kasir**.

- **Pagi, barang datang.** Admin mencatat pembelian: jumlah, harga beli, dan tanggal
  kedaluwarsa per kiriman. Stok bertambah, dan harga pokok dihitung ulang otomatis.
- **Siang, melayani pembeli.** Kasir memakai layar POS: pilih atau scan barang, lalu bayar
  tunai, QRIS (dikonfirmasi manual), atau **hutang** (dicatat atas nama pelanggan).
- **Kapan saja, cek peringatan.** Dashboard menampilkan stok yang menipis, barang yang mendekati
  kedaluwarsa, dan barang yang tidak laku 30 hari atau lebih.
- **Kalau ada yang salah,** misalnya barang rusak, hilang, atau salah hitung, Admin membuat
  **koreksi stok** dengan alasan. Catatan lama tidak pernah dihapus, jadi selalu bisa ditelusuri.
- **Malam, tutup toko.** **Closing harian** merangkum penjualan per metode bayar, supaya uang
  fisik di laci bisa dicocokkan dengan catatan.
- **Akhir bulan,** Admin melihat laporan penjualan dan laba.

Kasir **tidak bisa** melihat harga beli atau laba per produk. Itu hanya untuk Admin.

## Fitur

Sudah jadi di branch `main` (diuji di laptop, belum dipakai di toko):

- **Kasir (POS)** dengan pembayaran tunai, QRIS (konfirmasi manual), dan hutang, plus cari produk atau scan barcode
- **Pembelian / restock** dengan harga pokok rata-rata bergerak (*moving average*) dan tanggal
  kedaluwarsa per batch
- **Saldo awal**: mencatat barang yang sudah ada di rak saat sistem mulai dipakai, tanpa
  dihitung sebagai pengeluaran
- **Koreksi stok dan koreksi biaya** dengan alasan wajib. Data pembelian tidak bisa diedit atau
  dihapus, jadi jejak audit tetap utuh
- **Peringatan** stok menipis, mendekati kedaluwarsa, dan *dead stock*
- **Hutang pelanggan** yang terhubung dengan kasir
- **Closing harian** untuk mencocokkan kas fisik dengan catatan
- **Laporan** penjualan dan laba, plus log aktivitas (siapa melakukan apa, kapan)
- **Manajemen pengguna** dan dua peran: Admin dan Kasir
- Tampilan responsif (bisa dibuka dari HP), tema terang dan gelap

Uji kegunaan pertama (G1, 2026-11-15) dengan kasir sungguhan memakai data contoh **lolos**.
Masukannya sudah menjadi tiket perbaikan (kecepatan simpan produk, scan barcode lewat kamera HP,
tampilan yang lebih ramah).

Direncanakan **setelah** v1: penjualan per dus/pcs, harga bertingkat, dan QRIS dinamis lewat
Midtrans.

## Sorotan teknis

Hal-hal yang menurut saya paling menarik dari sisi engineering. Alasan lengkap tiap keputusan ada
di [`docs/adr/`](docs/adr/).

**Integritas data**

- Perubahan stok selalu di dalam transaksi database dengan `UPDATE` atomik di SQL (tidak pernah
  baca-ubah-tulis di JavaScript), ditambah constraint `CHECK (stock >= 0)`. Dua kasir yang
  menjual barang terakhir bersamaan tidak bisa membuat stok minus.
- Setiap perubahan stok menulis satu baris `StockMovement` (stok sebelum dan sesudah).
- Harga pokok rata-rata bergerak dihitung dalam satu `UPDATE` SQL (ADR 0001). Setiap item
  penjualan menyimpan harga pokoknya sendiri, jadi koreksi biaya hanya berlaku ke depan.
- Data pembelian tidak bisa diubah. Kesalahan diperbaiki lewat koreksi yang tercatat di log audit.
- Hutang pelanggan berupa buku besar *append-only* (`DEBT`, `PAYMENT`, `CANCEL`) dengan
  *advisory lock* Postgres per pelanggan.
- Checkout memakai *idempotency key*, jadi klik dua kali tidak membuat transaksi ganda.
- Kedaluwarsa per batch tanpa tabel batch: stok dialokasikan ke baris pembelian saat dibaca,
  dan stok yang tidak tercakup ditandai `untracked`, bukan ditebak (ADR 0003). Logika ini punya
  tes tersendiri.
- Batas hari (laporan, closing, nomor invoice) memakai zona waktu toko (WITA), bukan zona
  waktu server.

**Keamanan**

- Peran pengguna selalu dibaca dari database di setiap request, bukan dari token. Menonaktifkan
  akun atau mengganti password langsung mencabut semua sesi (`tokenVersion`).
- Data biaya disembunyikan dari kasir **di server**, bukan hanya di tampilan.
- Rate limit login, bcrypt, helmet, CORS allowlist, validasi semua input dengan Zod (dengan
  batas panjang), dan batas ukuran body 64 KiB.
- IP klien hanya dipercaya dari subnet proxy yang ditentukan (ADR 0008), dengan tes otomatis.
- Repo dibuat publik setelah seluruh riwayat git dipindai `gitleaks` dan bersih.

**Operasional** (sebagian sudah jalan, sebagian sedang disiapkan, lihat [Progres](#progres-sejauh-ini))

- Image Docker dibangun di GitHub Actions, diberi tag SHA commit, dan dirilis manual (ADR 0006).
- Backup database dienkripsi dengan `age` sebelum keluar dari server, dikirim ke Cloudflare R2
  dengan *bucket lock* 30 hari, dan dipantau healthchecks.io (ADR 0007).
- Cutover ke server baru baru boleh dilakukan setelah **restore drill** lolos: backup sungguhan
  dipulihkan ke database kosong, lalu API dijalankan dan dicoba login di atasnya.
- Server tanpa port web terbuka; API diakses lewat Cloudflare Tunnel (ADR 0005).

**Cara kerja**

- Setiap keputusan penting ditulis sebagai ADR (8 sejauh ini), dan riwayat proyek beserta
  pelajarannya di [`docs/history.md`](docs/history.md), termasuk kesalahan dan cara
  memperbaikinya.

## Arsitektur singkat

```
Browser (admin / kasir, laptop atau HP)
   │
   ├──▶ Web: Next.js, static export (hanya HTML/JS/CSS, tanpa server)
   │
   └──▶ API: Fastify (Node.js) ──▶ PostgreSQL
```

- **Saat ini:** web di Cloudflare Pages, API di Railway, database di Supabase. Produksi masih
  menjalankan versi sebelum fitur restock, dan hanya berisi data katalog.
- **Setelah cutover (sedang dikerjakan):** API dan PostgreSQL di satu VPS dengan Docker Compose,
  diakses lewat Cloudflare Tunnel di `api.waregos.com`; web di `app.waregos.com`.

Diagram lengkap, alur request, dan aturan domain: [`docs/architecture.md`](docs/architecture.md).

## Tech stack

| Bagian    | Teknologi |
|-----------|-----------|
| API       | Node.js 22, Fastify 5, Prisma 6, Zod, JWT |
| Database  | PostgreSQL 17 |
| Web       | Next.js 16 (static export), React 19, Tailwind CSS 4, shadcn/ui, Zustand, Recharts |
| Monorepo  | Turborepo + npm workspaces, TypeScript |
| Infra     | Docker Compose, Cloudflare Pages, Cloudflare Tunnel, Cloudflare R2, GitHub Actions, GHCR, healthchecks.io |

## Progres sejauh ini

| Tahap | Status |
|---|---|
| Fitur inti (POS, stok, hutang, closing, laporan) | ✅ selesai |
| Kebijakan restock (harga rata-rata, saldo awal, kedaluwarsa per batch) | ✅ selesai, di `main` |
| Hardening keamanan API | ✅ selesai |
| Uji kegunaan pertama dengan kasir (G1) | ✅ lolos, perbaikan jadi tiket |
| Beli VPS dan domain, hardening server | ✅ selesai |
| Stack Docker Compose, job backup, restore drill (diuji di laptop dan bucket uji) | ✅ selesai |
| Pasang stack di VPS, pindahkan data, API live, backup live | 🔄 sedang dikerjakan |
| Cutover (web dan API pindah ke domain baru) | ⏳ target 8–14 Des 2026 |
| Input stok awal dan uji paralel dengan buku catatan (1–2 minggu) | ⏳ Des 2026–Jan 2027 |

Input katalog produk asli ke produksi berhenti sementara sampai cutover, karena hosting API lama
sudah berakhir.

v1 dianggap selesai kalau **uji paralel** lolos: selisih kas dan stok kecil, dan kasir sudah bisa
memakai POS tanpa buku catatan. Rincian per tahap: [`docs/roadmap.md`](docs/roadmap.md).

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
contoh `admin` / `admin123` (Admin) dan `ibu` / `kasir123` (Kasir). Akun ini hanya untuk lokal.

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
npx tsx apps/web/src/lib/config.test.ts
```

Belum ada test runner. Tiap `*.test.ts` adalah skrip `node:assert` yang mencetak "semua tes lulus".

Gladi bersih dengan Docker (database kosong → migrasi → seed → API di port 3002):

```sh
docker compose -f docker-compose.rehearsal.yml --env-file .env.rehearsal up --build
```

## Struktur folder

```
apps/
  api/         REST API (Fastify)
  web/         Dashboard web responsif (Next.js, static export)
packages/
  database/    Schema Prisma, migrasi, seed
  types/       Tipe bersama API ↔ web
  utils/       Utilitas bersama (batas hari zona waktu toko, nomor invoice, batas input)
deploy/        Stack produksi di VPS (Compose, job backup, systemd, role database)
scripts/       Skrip bantu (tarik backup terbaru, restore drill)
docs/          Roadmap, riwayat, arsitektur, runbook, dan ADR
```

## Dokumentasi

- [`docs/roadmap.md`](docs/roadmap.md): tahapan menuju v1 dan setelahnya
- [`docs/history.md`](docs/history.md): apa yang sudah terjadi dan pelajarannya
- [`docs/architecture.md`](docs/architecture.md): peta folder, alur request, aturan domain, diagram deploy
- [`GLOSSARY.md`](GLOSSARY.md): istilah domain (Saldo Awal, hutang, closing, dead stock, ...)
- [`docs/adr/`](docs/adr/): *Architecture Decision Records*, alasan di balik keputusan teknis
- [`deploy/README.md`](deploy/README.md): menjalankan stack produksi di VPS
- [`docs/restore-drill.md`](docs/restore-drill.md): runbook menguji pemulihan backup

## Konvensi

- Commit mengikuti [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`)
- Satu branch per fitur, digabung ke `main` lewat pull request
- Keputusan arsitektur baru ditulis sebagai ADR
- Teks antarmuka dan pesan API dalam Bahasa Indonesia

## In English

**Waregos** is a web-based point-of-sale and inventory system for a single family-run grocery
store in Indonesia. It is a personal project, built for real use and **not live yet**: the features
are done and tested locally, and the hosting is being moved to a VPS before the v1 go-live
(target: mid-January 2027).

- **Problem:** small shops lose money in ways nobody sees: expired goods on the shelf, stock
  that hasn't sold in months, and cash that doesn't match sales at the end of the day.
- **What it does:** POS (cash, manual QRIS, customer credit), purchases with
  moving-average cost and per-batch expiry, stock and cost corrections with a full audit trail,
  low-stock / near-expiry / dead-stock alerts, daily cash closing, reports, and two roles where
  cashiers never see cost data.
- **Stack:** TypeScript monorepo (Turborepo). Fastify 5 + Prisma 6 + PostgreSQL 17 API,
  Next.js 16 static-export frontend, Docker Compose, Cloudflare (Pages, Tunnel, R2).
- **Engineering highlights:** atomic SQL stock updates with a non-negative constraint,
  immutable purchase records, an append-only customer-debt ledger with Postgres advisory locks,
  idempotent checkout, role checks against the database on every request, server-side cost
  hiding, `age`-encrypted offsite backups with a restore drill as the gate for go-live, and
  eight written Architecture Decision Records.

The code comments, UI and most docs are in Indonesian; `docs/architecture.md`,
`docs/history.md`, `docs/roadmap.md`, `GLOSSARY.md` and the ADRs are in English.

## Lisensi

Belum ditentukan. Selama belum ada file `LICENSE`, seluruh hak cipta tetap pada pemilik repo.
