# 01 — `.max()` limits on login body and item arrays

Status: resolved
Type: task
Blocked by: —
Gate: before cutover (vps-migration 14)
Branch: shared with vps-migration 02 and api-hardening 02/03 (one PR, separate commits, `/tdd`)

## Scope (narrowed in PM review 2026-11-13)

- Login body: `username` and `password` get explicit `.max()` (password stays within the bcrypt 72-byte rule).
- Every `items` array in request schemas, at least checkout (transactions) and purchases, gets `.max()` sized from real use with headroom.
- Other strings are out of scope for v1.

Over-limit input returns the existing `validationError` with an Indonesian message.

## Acceptance

- [x] Plain `node:assert` tests (run with `npx tsx`) for each limit, written first: at the limit passes, one over fails.
- [x] The web does not let users build a cart or purchase larger than the limit without a clear message.
- [x] `npm run typecheck -w @waregos/api` and `cd apps/web; npx tsc --noEmit` pass.

## Comments

- 2026-11-17 (agent): selesai di branch `chore/api-hardening`, test-first
  (`npx tsx apps/api/src/shared/input-limits.test.ts` → "input-limits: semua tes lulus").
  Tiap batas diuji lewat `schema.safeParse`: tepat di batas lolos, satu di atasnya gagal dengan
  pesan Indonesia sebagai error pertama (yang dikirim route lewat `validationError`).

  | Input | Sebelum | Sesudah | Pesan |
  |---|---|---|---|
  | Login `username` | `.max(50)`, pesan Inggris | 50 | Username maksimal 50 karakter |
  | Login `password` | `.max(128)`, pesan Inggris | 72 | Password maksimal 72 karakter |
  | Checkout `items` | tanpa batas | 200 | Satu transaksi maksimal 200 produk |
  | Pembelian/saldo awal `items` | `.max(200)`, pesan Inggris | 200 | Satu nota maksimal 200 baris |
  | Hutang manual `items` (opsional) | tanpa batas | 200 | Rincian hutang maksimal 200 barang |

  - Angka 200: keranjang toko kelontong jarang lebih dari beberapa puluh produk, dan 200 baris
    hanya sekitar 20 KB. Konstanta `MAX_TRANSACTION_ITEMS` / `MAX_PURCHASE_ITEMS` ada di
    `@waregos/utils`, dipakai API dan web. Saldo awal lebih dari 200 baris dipecah jadi
    beberapa nota (perilaku lama, sekarang pesannya jelas).
  - Login password 128 → 72: password yang dibuat lewat aplikasi tidak pernah lebih dari 72
    karakter. Hanya `SEED_ADMIN_PASSWORD` yang tidak dibatasi; kalau admin produksi dibuat
    dengan password lebih dari 72 karakter, login cukup memakai 72 karakter pertamanya
    (bcrypt memang hanya membaca 72 byte pertama).
  - Skema hutang dipindah dari `debt.route.ts` ke `debt.schema.ts` (isi sama, plus batas
    `items`) supaya bisa diuji dan mengikuti pola modul lain.
  - Web: POS menolak produk ke-201 dan form pembelian menolak baris ke-201 (tambah produk
    maupun tambah batch) dengan toast yang menyuruh menyelesaikan/menyimpan dulu.
    Diverifikasi dengan `npx tsc --noEmit` dan `npm run build -w @waregos/web` (lolos,
    impor runtime `@waregos/utils` terkompilasi). **Belum diklik manual di browser** dengan
    keranjang 200 produk.
  - `npm run typecheck -w @waregos/api` dan `cd apps/web; npx tsc --noEmit` lulus.
  - Di luar cakupan, dicatat saja: `catalog.route.ts` (satuan) membaca `request.body`
    tanpa Zod; string lain tanpa `.max()` (nama pelanggan, catatan transaksi/hutang).
