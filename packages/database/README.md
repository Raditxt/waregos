# @waregos/database

Schema Prisma, migrasi, dan seed untuk PostgreSQL. Schema ada di
[`prisma/schema.prisma`](prisma/schema.prisma), migrasi di [`prisma/migrations/`](prisma/migrations/).
Aturan domain yang dijaga database (stok tidak boleh minus, data pembelian tidak diubah, dan lain-lain)
dijelaskan di [`docs/architecture.md`](../../docs/architecture.md).

## ⚠️ Hanya localhost

Semua perintah migrasi dan seed **hanya boleh dijalankan ke database lokal.**

Sebelum `db:migrate`, `db:deploy` atau `db:seed`, baca baris `Datasource` yang dicetak Prisma:

```
Datasource "db": PostgreSQL database "waregos", schema "public" at "localhost:5432"
```

Kalau isinya **bukan** `localhost:5432`, hentikan. Prisma membaca `.env` di folder paket ini, dan
kalau variabel koneksi di sesi kosong, Prisma diam-diam memakai isi file itu. Kejadian ini pernah
terjadi (lihat [`docs/history.md`](../../docs/history.md), 2026-11-02).

Migrasi ke server produksi bukan lewat perintah di sini, tapi lewat service `migrate` di stack VPS
(lihat [`deploy/README.md`](../../deploy/README.md)) dan hanya dijalankan pemilik repo.

## Setup

```sh
cp packages/database/.env.example packages/database/.env   # isi DATABASE_URL dan DIRECT_URL
```

File ini terpisah dari `apps/api/.env` karena Prisma CLI membaca `.env` dari folder paket ini.
File `.env` asli tidak pernah masuk repo.

## Perintah

Dijalankan dari root repo:

```sh
npm run db:generate -w @waregos/database   # buat ulang Prisma Client setelah schema berubah
npm run db:migrate  -w @waregos/database   # prisma migrate dev: buat migrasi baru (localhost)
npm run db:deploy   -w @waregos/database   # prisma migrate deploy: terapkan migrasi (localhost)
npm run db:seed     -w @waregos/database   # isi data awal (localhost)
npm run db:studio   -w @waregos/database   # Prisma Studio untuk melihat data
```

## Seed

[`prisma/seed.ts`](prisma/seed.ts) punya dua mode:

| Mode | Pengguna | Kategori | Satuan |
|---|---|---|---|
| Dev (default) | `admin` / `admin123` (Admin) dan `ibu` / `kasir123` (Kasir) | 7 contoh | 7 (`pcs`, `btl`, `bks`, `dus`, `kg`, `gr`, `ltr`) |
| `NODE_ENV=production` | satu admin dari `SEED_ADMIN_USERNAME` dan `SEED_ADMIN_PASSWORD` (minimal 12 karakter) | tidak dibuat | 7 |

Akun dev hanya untuk lokal. Seed memakai `upsert`, jadi aman dijalankan ulang dan tidak menimpa
data yang sudah ada.

## ⚠️ Jangan hapus folder migrasi yang kosong

`prisma/migrations/20261026083052_restock_policy_fields/` **sengaja kosong** (isinya hanya
`-- This is an empty migration.`). `prisma migrate dev --create-only` sempat jalan dua kali, jadi ada
dua folder bernama `restock_policy_fields`; isi sebenarnya ada di `20261026083337_restock_policy_fields`.

Folder kosong itu sudah tercatat di tabel `_prisma_migrations` di database produksi. Kalau dihapus,
riwayat migrasi di repo tidak cocok lagi dengan database. **Biarkan keduanya.** Konteks lengkap di
[`docs/history.md`](../../docs/history.md) bagian "Restock policy, M1".

Jumlah migrasi saat ini: 14 (termasuk folder kosong itu). Angka ini dipakai sebagai patokan di
[`docs/restore-drill.md`](../../docs/restore-drill.md).
