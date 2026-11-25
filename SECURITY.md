# Kebijakan keamanan

Waregos adalah sistem kasir dan stok untuk satu toko, dan berisi data keuangan toko. Laporan
celah keamanan sangat dihargai.

## Cara melapor

**Jangan laporkan celah keamanan lewat issue publik, pull request, atau diskusi.**

Gunakan fitur **private vulnerability reporting** GitHub:

1. Buka tab **Security** di repo ini.
2. Klik **Report a vulnerability**.
3. Jelaskan celahnya, langkah untuk mereproduksi, dan dampaknya.

Laporan ini hanya bisa dilihat oleh pemilik repo. Repo ini dikelola satu orang, jadi respons
bisa memakan waktu beberapa hari.

## Cakupan

- Kode di repo ini: API (`apps/api`), web (`apps/web`), schema database (`packages/database`),
  dan konfigurasi deploy (`deploy/`).
- Contoh yang relevan: kasir bisa melihat data biaya, melewati pemeriksaan peran, mengubah stok
  atau data pembelian di luar alur yang diizinkan, atau membocorkan rahasia.

Tolong **jangan** menguji langsung ke sistem produksi toko. Jalankan secara lokal dengan data
contoh (lihat [`README.md`](README.md)).

## Reporting in English

Please do not open a public issue for security problems. Use GitHub's private vulnerability
reporting instead: **Security** tab → **Report a vulnerability**. Do not test against the
production system; run the project locally with sample data.
