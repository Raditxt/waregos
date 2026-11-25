# @waregos/web

Dashboard web Waregos: Next.js 16, React 19, Tailwind CSS 4, shadcn/ui, Zustand, Recharts.
Satu-satunya client untuk Admin dan Kasir (ADR 0004), responsif sehingga bisa dibuka dari HP.

Gambaran sistem dan diagram deploy ada di [`docs/architecture.md`](../../docs/architecture.md).

## Static export, tanpa kode server

[`next.config.ts`](next.config.ts) memakai `output: 'export'`. Hasil build berupa HTML/JS/CSS
statis di `out/` yang di-host di Cloudflare Pages. Akibatnya:

- Tidak ada server component, route handler, atau optimasi `next/image`. Semua dirender di browser.
- Semua data diambil dari API lewat [`src/lib/api.ts`](src/lib/api.ts) (axios). Token login disimpan
  di `localStorage` dan respons 401 ditangani di satu tempat.

## URL API

URL API dibaca **hanya** di [`src/lib/config.ts`](src/lib/config.ts), dari `NEXT_PUBLIC_API_URL`.
Defaultnya `http://localhost:3001/api`, jadi untuk dev lokal tidak perlu file env.

Nilai ini **ditanam saat build**. Mengganti URL API berarti build ulang. Lihat
[`.env.example`](.env.example).

## Menjalankan

Dari root repo:

```sh
npm run dev                          # web di http://localhost:3000, API ikut jalan
npm run build                        # static export ke apps/web/out
cd apps/web; npx tsc --noEmit; cd ../..
npx tsx apps/web/src/lib/config.test.ts   # "config: semua tes lulus"
```

## Layar

Satu folder per layar di `src/app/`. Setiap `layout.tsx` membungkus `AppShell`.

| Layar | Folder | Peran |
|---|---|---|
| Login | `login/` | semua |
| Dashboard | `dashboard/` | Admin, Kasir |
| Kasir / POS | `pos/` | Admin, Kasir |
| Produk | `products/` | Admin, Kasir |
| Closing | `closing/` | Admin, Kasir |
| Hutang | `debts/` | Admin, Kasir |
| Pembelian | `purchases/` | Admin |
| Laporan | `reports/` | Admin |
| Users | `users/` | Admin |
| Audit Log | `audit/` | Admin |

Menyembunyikan layar Admin di web hanya untuk kenyamanan. Pembatasan sebenarnya ada di API.

## Konvensi

- Semua teks antarmuka dalam Bahasa Indonesia.
- Pesan error ditampilkan dari `message` API dulu, lalu dari peta kode error di `lib/api.ts`.
- Komponen UI dari shadcn/ui di `src/components/ui/`, layout (AppShell, Sidebar) di
  `src/components/layout/`.
