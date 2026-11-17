// Batas ukuran badan request untuk seluruh API (opsi `bodyLimit` Fastify).
// Request terbesar yang sah adalah nota pembelian 200 baris (MAX_PURCHASE_ITEMS) dengan
// semua kolom terisi penuh: sekitar 25 KB (checkout 200 produk sekitar 20 KB). 64 KiB
// memberi ruang lebih dari dua kalinya, dan jauh di bawah bawaan Fastify (1 MiB).
// Kalau suatu route benar-benar butuh lebih, naikkan di route itu saja.
export const BODY_LIMIT_BYTES = 64 * 1024
