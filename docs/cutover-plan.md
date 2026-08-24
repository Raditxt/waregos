# 📋 Cutover Plan — Waregos

Dokumen ini adalah rencana perpindahan dari buku tulis ke sistem Waregos.

---

## Checklist Sebelum Cutover

### Teknis
- [ ] Semua produk sudah diinput ke sistem
- [ ] Stok awal sudah sesuai dengan stok fisik
- [ ] Kategori dan satuan sudah lengkap
- [ ] HP ibu sudah terinstall aplikasi Waregos
- [ ] Login ibu (username: `ibu`) sudah dicoba dan berhasil
- [ ] Transaksi test sudah dilakukan
- [ ] Backup pertama sudah dibuat

### Operasional
- [ ] Ibu sudah paham cara buka aplikasi
- [ ] Ibu sudah paham cara transaksi POS
- [ ] Ibu sudah paham cara catat hutang
- [ ] Panduan darurat sudah dicetak dan ditempel
- [ ] Nomor darurat sudah tersimpan di HP ibu

---

## Hari H — Cutover

**Tanggal cutover: _______________**

### Pagi Sebelum Toko Buka
1. Nyalakan sistem (`.\start.ps1`)
2. Cek semua halaman berfungsi normal
3. Pastikan stok sudah sesuai
4. Pastikan HP ibu bisa connect

### Saat Toko Buka
1. Mulai semua transaksi via sistem
2. Buku tulis **ditutup** — tidak dipakai lagi
3. Semua hutang dicatat via sistem

### Akhir Hari Pertama
1. Lakukan closing harian di sistem
2. Hitung kas fisik dan bandingkan dengan sistem
3. Catat selisih (kalau ada)
4. Backup database

---

## Periode Transisi (Minggu 1-2)

- Kamu standby untuk membantu ibu
- Catat semua kebingungan/masalah yang ditemui
- Fix issues yang ditemukan

---

## Evaluasi (Setelah 1 Bulan)

- [ ] Apakah ibu nyaman dengan sistem?
- [ ] Apakah ada fitur yang kurang?
- [ ] Apakah data akurat?
- [ ] Apakah backup berjalan rutin?