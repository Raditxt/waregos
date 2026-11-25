# @waregos/api

REST API Waregos: Fastify 5, Prisma, JWT, Zod. Di-bundle dengan tsup ke `dist/index.js`.

Alur request lengkap, format respons, dan aturan domain (peran, stok, biaya, hutang) ada di
[`docs/architecture.md`](../../docs/architecture.md). README ini hanya ringkasan untuk mulai.

## Menjalankan

Dari root repo (lihat juga [`README.md`](../../README.md) untuk setup database):

```sh
cp apps/api/.env.example apps/api/.env   # isi DATABASE_URL, JWT_SECRET, CORS_ORIGINS
npm run dev                              # API di http://localhost:3001 (tsx watch), web ikut jalan
```

API berhenti saat start kalau `JWT_SECRET` atau `DATABASE_URL` kosong. `CORS_ORIGINS` wajib
diisi agar browser bisa memanggil API (dev: `http://localhost:3000`). Arti tiap variabel ada di
komentar [`.env.example`](.env.example).

| Perintah (`-w @waregos/api`) | Fungsi |
|---|---|
| `npm run dev` | `tsx watch src/index.ts` |
| `npm run build` | bundle dengan tsup ke `dist/` |
| `npm run start` | jalankan `dist/index.js` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |

## Struktur

```
src/
  index.ts          validasi env, plugin, pemasangan modul, GET /health
  plugins/          prisma, jwt (authenticate / adminOnly), cors
  modules/<nama>/   satu folder per area domain
  shared/           response envelope, error handler, logger, pagination,
                    expiry layers, debt ledger, trust proxy, body limit (+ *.test.ts)
Dockerfile          image produksi (dibangun di GitHub Actions)
```

Setiap modul mengikuti pola yang sama:

- **`*.route.ts`**: auth (`preHandler: [app.authenticate]` atau `[app.adminOnly]`), validasi
  Zod `safeParse`, lalu log audit.
- **`*.service.ts`**: logika bisnis, class yang menerima `PrismaClient`. Melempar error class
  milik modulnya.
- **`*.schema.ts`**: skema Zod.

| Modul | Prefix |
|---|---|
| `auth` | `/api/auth` |
| `users` | `/api/users` |
| `catalog` | `/api/catalog` |
| `products` | `/api/products` |
| `stock` (pembelian) | `/api/purchases` |
| `stock` (koreksi) | `/api/stock` |
| `transactions` | `/api/transactions` |
| `debt` | `/api/debts` |
| `reports` | `/api/reports` |
| `audit` | `/api/audit` |

## Aturan yang wajib diikuti saat mengubah kode

- Peran pengguna selalu dibaca dari database, bukan dari token.
- Kasir tidak boleh melihat data biaya. Endpoint biaya tetap `adminOnly`, dan service
  mengosongkan field biaya untuk kasir.
- Perubahan stok: di dalam `prisma.$transaction`, `UPDATE` atomik di SQL, satu baris
  `StockMovement`, lalu `ActivityService.log`.
- Data pembelian tidak pernah diubah atau dihapus.
- Kode error baru butuh `message` dalam Bahasa Indonesia, karena web menampilkannya ke pengguna.

## Tes

Belum ada test runner. Tiap `*.test.ts` adalah skrip `node:assert`:

```sh
npm run typecheck -w @waregos/api
npx tsx apps/api/src/shared/expiry-layers.test.ts   # "expiry-layers: semua tes lulus"
npx tsx apps/api/src/shared/trust-proxy.test.ts
npx tsx apps/api/src/shared/input-limits.test.ts
npx tsx apps/api/src/shared/body-limit.test.ts
```
