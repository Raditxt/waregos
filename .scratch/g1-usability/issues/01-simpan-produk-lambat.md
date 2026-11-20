# 01 — Simpan produk baru terasa lambat (3–5 detik)

Status: ready-for-agent
Type: bug
Blocked by: None (bisa mulai sekarang)
Sumber: uji POS dengan Ibu, 2026-11-15 (laptop, data dummy, akses via HP)

## What

Saat uji G1, menyimpan produk baru butuh 3–5 detik sampai dialog tertutup. Uji itu jalan di
mode dev (`next dev` + `tsx watch`), jadi lambatnya bisa saja karena kompilasi on-demand,
bukan karena API atau database.

Ukur dulu di build produksi lokal sebelum mendiagnosis apa pun:

1. API lokal (`npm run build`, lalu jalankan `apps/api/dist`), database localhost.
2. Web: `next build` lalu sajikan hasil static export (`apps/web/out`) atau `next start`.
3. Buka DevTools → Network, simpan produk baru beberapa kali (minimal 5), catat waktu
   `POST /api/products` dan waktu total sampai dialog tertutup.

## Acceptance

- [ ] Waktu `POST /api/products` (minimal 5 kali) tercatat di Comments, beserta cara build dan
      perangkat yang dipakai.
- [ ] Kalau semua < 1 detik: tutup sebagai artefak mode dev (`Status: resolved`, alasan di Comments).
- [ ] Kalau tidak: jalankan `/diagnosing-bugs` dan catat temuannya di Comments.

## Comments
