# 02 — Explicit Fastify `bodyLimit`

Status: resolved
Type: task
Blocked by: —
Gate: before cutover (vps-migration 14)

## What

Set `bodyLimit` explicitly on the Fastify instance in `apps/api/src/index.ts` (no route sets one today). Size it from the largest real request (a big purchase or checkout) with headroom; raise it per route only if a route really needs more. Oversized requests return 413 through the standard error envelope with an Indonesian message.

## Acceptance

- [x] Limit documented in a short Indonesian comment with the reasoning.
- [x] Local check: a body just over the limit → 413 in the `{ success: false, error, message }` envelope; a realistic large purchase still passes.
- [x] `npm run typecheck -w @waregos/api` passes.

## Comments

- 2026-11-17 (agent): selesai di branch `chore/api-hardening`, test-first.
  - `apps/api/src/shared/body-limit.ts`: `BODY_LIMIT_BYTES = 64 * 1024`, dengan komentar
    alasannya. Dipasang di `Fastify({ bodyLimit })` di `index.ts`. Tidak ada route yang
    menaikkan batasnya.
  - Ukuran: nota pembelian terbesar yang sah (200 baris, semua kolom terisi penuh) = 25.223
    byte; checkout 200 produk = 20.134 byte. 64 KiB = lebih dari 2,5 kalinya.
  - Temuan: sebelum ini badan yang melebihi batas (bawaan 1 MiB) dijawab **500** "gangguan
    pada server", karena `globalErrorHandler` tidak mengenal 413. Sekarang 413 dengan
    `{ success: false, error: 'PAYLOAD_TOO_LARGE', message: 'Data yang dikirim terlalu besar.
    Kurangi isinya atau pecah menjadi beberapa bagian.' }`.
  - Tes `npx tsx apps/api/src/shared/body-limit.test.ts` (Fastify + `globalErrorHandler` +
    `app.inject`): 65.537 byte → 413 envelope di atas; tepat 65.536 byte tidak kena 413;
    nota 200 baris terbesar → 200 dan lolos `createPurchaseSchema`. Kepekaan dicek dengan
    mengubah konstanta sementara ke 16 KiB dan 1 MiB: tesnya gagal di kedua arah.
  - Cek lokal di image sungguhan (stack rehearsal dengan nama proyek terpisah, `NODE_ENV=production`,
    lalu dihapus lagi): `/health` 200; `POST /api/auth/login` 65.537 byte → 413 envelope;
    password 73 karakter → 400 "Password maksimal 72 karakter"; username 51 karakter → 400.
    Dengan `X-Forwarded-For` palsu yang berganti-ganti, percobaan login ke-6 tetap 429
    (tanpa proxy tepercaya, rate limit memakai alamat soket).
  - `npm run typecheck -w @waregos/api` lulus.
