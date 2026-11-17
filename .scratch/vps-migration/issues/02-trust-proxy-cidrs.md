# 02 — Trust proxy from `TRUST_PROXY_CIDRS`

Status: resolved
Type: task
Blocked by: —
Stage: 4 (code merged to `main` before the stage-4 image is built)
ADR: 0008
Branch: shared with `.scratch/api-hardening/` 01–03 (one PR, separate commits, `/tdd`)

## What

Replace the hardcoded Railway CIDR list in `apps/api/src/index.ts` with an env-driven list.

- New env `TRUST_PROXY_CIDRS` (comma-separated CIDRs). Production value: `10.89.10.0/24`.
- Remove `TRUST_PROXY` and `TRUST_PROXY_HOPS` and the hardcoded list (`10/8`, `100/8`, `152.233/16`, ...).
- Empty → `trustProxy=false`, allowed only outside production.
- `NODE_ENV=production` and empty `TRUST_PROXY_CIDRS` → API exits at startup with a clear Indonesian message, in the same place and style as the `JWT_SECRET` check.
- Update `apps/api/.env.example` and the env paragraph in `CLAUDE.md`.

## Acceptance

- [x] Plain `node:assert` test runnable with `npx tsx` (no test runner): app built with `TRUST_PROXY_CIDRS=10.89.10.0/24`, `app.inject` with `remoteAddress` inside that subnet and `X-Forwarded-For: 203.0.113.9, 198.51.100.7` → `request.ip === '198.51.100.7'`. Same request from a remote address outside the subnet → `request.ip` is that remote address.
- [x] Startup fails in production with empty `TRUST_PROXY_CIDRS`; dev starts with `trustProxy=false`.
- [x] `npm run typecheck -w @waregos/api` passes.
- [x] If the inject test cannot be made to pass, stop and report: the fallback (`getClientIp` + `CF-Connecting-IP`, ADR 0008) needs Raditya's go-ahead.

## Comments

- 2026-11-17 (agent): selesai di branch `chore/api-hardening` (dari `main`), test-first.
  - `apps/api/src/shared/trust-proxy.ts`: `trustProxyFromEnv(env)` → daftar CIDR, `false`
    (kosong di luar produksi), atau melempar Error (kosong di produksi). `index.ts` memanggilnya
    di blok validasi env setelah cek `JWT_SECRET` dan keluar dengan `❌ FATAL: ...`.
    `TRUST_PROXY`, `TRUST_PROXY_HOPS` dan daftar CIDR Railway dihapus.
  - Tes `npx tsx apps/api/src/shared/trust-proxy.test.ts` → "trust-proxy: semua tes lulus".
    Lewat Fastify sungguhan + `app.inject`, `TRUST_PROXY_CIDRS=10.89.10.0/24`,
    `X-Forwarded-For: 203.0.113.9, 198.51.100.7`: remote `10.89.10.5` → `request.ip` =
    `198.51.100.7`; remote `10.89.11.5` dan `203.0.113.50` → alamat remote itu sendiri.
    Produksi + kosong (`undefined`, `''`, spasi, `' , '`) melempar; non-produksi + kosong → `false`.
    Fallback `CF-Connecting-IP` tidak diperlukan.
  - Smoke manual `index.ts` (env dummy, tanpa `.env`): produksi + kosong → exit 1 dengan pesan
    "TRUST_PROXY_CIDRS wajib diisi di produksi ..."; produksi + terisi dan dev + kosong lolos
    validasi env (berhenti di DB dummy, disengaja).
  - `npm run typecheck -w @waregos/api` lulus.
  - Di luar daftar tiket: `docker-compose.rehearsal.yml` menjalankan API dengan
    `NODE_ENV=production`, jadi diberi `TRUST_PROXY_CIDRS: 127.0.0.1/32` supaya rehearsal tetap
    bisa start. Rehearsal Docker-nya sendiri belum dijalankan ulang.
  - Bukti 2 dan 3 di ADR 0008 (observasi lewat tunnel, retest rate limit) tetap bagian VM-12.
- 2026-11-17 (agent, susulan): stack rehearsal sudah dijalankan dari branch ini (nama proyek
  terpisah, lalu dihapus). API start sebagai produksi dengan `TRUST_PROXY_CIDRS: 127.0.0.1/32`
  dan `/health` 200. Dengan `X-Forwarded-For` palsu yang berganti-ganti, percobaan login
  ke-6 tetap 429. Ini cek lokal; bukti 2 dan 3 ADR 0008 lewat tunnel tetap di VM-12.
