# 04 — Nama toko dan logo di UI kasir (HP)

Status: needs-triage
Type: task
Blocked by: None
Sumber: uji POS dengan Ibu, 2026-11-15

## What

Tampilkan identitas toko, nama "Toko Rabay Orange" dan logonya, di UI kasir saat dibuka di HP,
supaya kasir tahu ini aplikasi tokonya sendiri.

Kondisi kode saat tiket ditulis (2026-11-20): header mobile di `AppShell` sudah menampilkan
"Waregos" dengan "Toko Rabay Orange" sebagai teks kecil, plus ikon toko berupa SVG inline.
Jadi yang perlu dicek dulu:

- apakah teks dan ikon itu benar tampil di HP Ibu (atau terpotong atau tidak terbaca);
- apakah layar POS memakai header itu atau punya tata letak sendiri;
- apakah toko punya logo sendiri, atau ikon storefront yang ada sudah cukup;
- urutan yang diinginkan: nama toko yang menonjol, "Waregos" sebagai keterangan.

## Acceptance

- [ ] Hasil pengecekan di HP (tangkapan layar atau catatan) ada di Comments.
- [ ] Keputusan soal logo dan urutan nama dicatat, lalu tiket diperjelas sampai `ready-for-agent`
      atau ditutup kalau tampilan sekarang sudah cukup.

## Comments
