# 03 — Triage Dependabot critical/high alerts in the API runtime

Status: resolved
Type: task
Blocked by: —
Gate: before API live (vps-migration 12)
Estimate: 0.5 h
Branch: shared with vps-migration 02 and api-hardening 01/02

## What

- List open Dependabot alerts with severity critical or high (read-only, e.g. `gh api` on the alerts endpoint).
- Keep only packages that end up in the **API runtime** (production dependencies of `apps/api` and the `@waregos/*` packages bundled into it). Alerts only in `apps/web` (static export) or dev tooling are out of scope here; note them for `chore/deps`.
- For each in-scope alert: fixed by a non-breaking update → fix in this branch as its own commit; not fixable without a breaking change → write it down with the reason and the exposure.
- Never `npm audit fix --force`.

## Acceptance

- [x] Triage table in Comments: package, severity, runtime or not, action.
- [x] No open critical/high alert left in the API runtime without a written reason.
- [x] `npm run typecheck -w @waregos/api` passes; the API image still builds and its smoke test passes.

## Comments

- 2026-11-17 (agent): triage dari `gh api .../dependabot/alerts?state=open` (baca saja).
  71 alert terbuka: 10 critical, 23 high, 29 medium, 9 low. Yang critical/high menyangkut
  8 paket. "Runtime API" dicek dengan
  `npm ls <paket> --all --omit=dev -w @waregos/api -w @waregos/database -w @waregos/types -w @waregos/utils`.

  | Paket (terpasang) | Severity | Runtime API? | Tindakan |
  |---|---|---|---|
  | `zod` 3.25.76 | high (GHSA-mrhx-c7xc-m3w5) | **ya**, dependensi langsung | Tidak bisa diperbaiki tanpa breaking: patch hanya di 4.6.6, 3.25.76 sudah 3.x terakhir. Dimitigasi, lihat di bawah. Migrasi Zod 4 = `chore/deps` langkah 5. |
  | `deepmerge-ts` 7.1.5 | high (GHSA-ggr8-5vv4-36mx) | **ya**, lewat `prisma` CLI → `@prisma/config` | Tidak bisa diperbaiki tanpa breaking: patch di 8.0.0, `@prisma/config` 6.19.3 (6.x terakhir) mengunci 7.1.5. Tidak terpapar, lihat di bawah. Hilang saat naik Prisma 7. |
  | `next` 16.2.9 | 10 critical, 12 high | tidak (web) | `chore/deps` langkah 4 (≥ 16.4.1). Semua advisory menyerang server Next (Image Optimization, Server Actions, `use cache`, middleware); produksi hanya static export di Cloudflare Pages. |
  | `sharp` 0.34.5 | 3 high | tidak (lewat `next`) | Ikut upgrade Next. Optimasi gambar tidak dipakai (`images.unoptimized`). |
  | `postcss` 8.4.31 | 2 high | tidak (salinan di dalam `next`; build saja) | Ikut upgrade Next. Salinan root sudah 8.5.30. |
  | `body-parser` 2.3.0 | high | tidak (lewat CLI `shadcn`) | `chore/deps` langkah 1 (pindahkan `shadcn` ke devDependencies), lalu `npm audit fix`. |
  | `systeminformation` 5.33.15 | high | tidak (lewat CLI `shadcn`) | Sama seperti di atas. |
  | `follow-redirects` 1.16.1 | high | tidak (lewat `axios` di web) | `npm audit fix` tanpa `--force` (1.16.2). Hanya dipakai adapter Node milik axios, bukan di browser. |

  **`zod`, alasan dan paparan.** Advisory: array besar membuat Zod menumpuk satu issue per
  elemen yang gagal sampai kehabisan memori. `.max()` saja tidak menghentikannya (Zod 3 tetap
  memeriksa semua elemen), jadi mitigasinya adalah `bodyLimit` 64 KiB dari tiket 02. Diukur
  dengan badan terburuk terhadap tiga skema yang punya array (checkout, pembelian, hutang):

  | Ukuran badan | Elemen | Waktu parse | Tambahan heap |
  |---|---|---|---|
  | 64 KiB (batas sekarang) | ± 22–33 ribu | 44–81 ms | 14–19 MB |
  | 1 MiB (bawaan Fastify, sebelum tiket 02) | ± 350–524 ribu | 0,5–1,7 detik | 161–224 MB |

  Ketiga endpoint itu butuh login (pembelian khusus admin); skema login tidak punya array.
  Sisa risiko yang diterima: pengguna yang sudah login bisa mengirim banyak request 64 KiB
  sekaligus (± 19 MB sementara per request, tidak ada rate limit di endpoint itu).

  **`deepmerge-ts`, alasan dan paparan.** Hanya crash kalau diberi objek yang menunjuk ke
  dirinya sendiri. Di image ia hanya dipakai Prisma CLI untuk membaca konfigurasi lokal saat
  `migrate` dijalankan dengan tangan; `@prisma/client` (yang dipakai proses API) tidak
  memakainya, dan JSON dari request tidak bisa membentuk objek seperti itu. Tidak ada jalur
  dari request ke paket ini.

  - Tidak ada perubahan dependensi di tiket ini, jadi tidak ada commit perbaikan terpisah.
    `npm audit fix --force` tidak dijalankan.
  - `npm run typecheck -w @waregos/api` lulus. Image API dibangun dari branch ini (stack
    rehearsal, nama proyek terpisah) dan uji asap di Dockerfile lolos; `/health` 200.
