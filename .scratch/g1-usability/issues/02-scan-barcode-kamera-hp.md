# 02 — Scan barcode lewat kamera HP di POS

Status: needs-triage
Type: feature
Blocked by: HTTPS untuk web (`app.waregos.com`, `.scratch/vps-migration/issues/14-cutover.md`)
Sumber: uji POS dengan Ibu, 2026-11-15

## What

Kasir yang memakai HP ingin menambah barang ke keranjang POS dengan memindai barcode lewat
kamera, bukan mengetik atau mencari nama produk.

Browser hanya memberi akses kamera di konteks aman (HTTPS atau localhost), jadi fitur ini
baru bisa diuji di HP setelah web jalan di `app.waregos.com`.

Belum siap dikerjakan. Perlu `/grilling` dulu, misalnya untuk:

- library pemindai (API `BarcodeDetector` bawaan browser atau library JS) dan dukungan di HP Ibu;
- apa yang terjadi kalau barcode tidak dikenal (cari manual, tambah produk baru, atau abaikan);
- satu kali scan per barang atau mode scan terus-menerus;
- apakah semua produk sudah punya barcode di katalog.

## Acceptance

- [ ] Hasil `/grilling` dicatat di Comments, lalu tiket ini dipecah atau diperjelas sampai
      `ready-for-agent`.

## Comments
