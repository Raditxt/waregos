# 03 — Image build workflow (API)

Status: resolved
Type: task
Blocked by: —
Stage: 2
ADR: 0006

## What

New GitHub Actions workflow that builds `apps/api/Dockerfile` and pushes it to GHCR.

- Triggers: push to `main`, `workflow_dispatch`.
- Tag: full commit SHA only. No `latest`.
- Actions pinned by SHA (style of `db-backup.yml`). Top-level `permissions: {}`; `packages: write` + `contents: read` only on the push job.
- No build-args carrying secrets.
- Leave a clear place for the backup image (ticket 05) to be added to the same workflow.

## Acceptance

- [x] `.dockerignore` excludes `.env*` (keep `.env.example` files out of the image too, unless something needs them).
- [x] Local `docker build` succeeds; `docker history --no-trunc` shows no secrets.
- [x] Workflow YAML is valid (e.g. `actionlint` if available). The agent does **not** trigger it (`gh workflow run` is forbidden); Raditya runs it.
- [x] Note for Raditya in Comments: make the GHCR package public after the first push.

## Comments

- 2026-11-17 (agent): `.github/workflows/images.yml` dibuat. Job `api`: checkout → buildx →
  login GHCR → build-push `apps/api/Dockerfile` ke `ghcr.io/raditxt/waregos-api:<sha>`
  (`linux/amd64`, cache GHA, label `org.opencontainers.image.source`/`revision`, tanpa build-arg).
  Action di-pin SHA: checkout v7.0.1, setup-buildx v4.4.1, login v4.8.0, build-push v7.4.0.
  Ada blok komentar di bawah job `api` sebagai tempat job `backup` (VM-05).
- `.dockerignore`: pengecualian `!**/.env.example` dihapus; Dockerfile tidak butuh file itu.
- Validasi: YAML lolos parse (js-yaml). `actionlint` belum dijalankan (tidak terpasang).
- **Untuk Raditya:** setelah push pertama ke GHCR, buka package `waregos-api` →
  Package settings → Change visibility → **Public** (ADR 0006, VPS tanpa kredensial registry).
- 2026-11-17 (agent, bukti): Docker 29.6.2 lokal, `docker build -f apps/api/Dockerfile .` sukses
  (uji asap: "OK: 11 prod dependensi bisa di-resolve"). `docker history --no-trunc`: 22 layer,
  tidak ada build-arg atau nilai rahasia (hanya `ARCH=` dari layer image dasar `node`).
  `find / -name ".env*"` di dalam image: kosong. `Config.Env` hanya PATH, NODE_VERSION,
  YARN_VERSION, NODE_ENV=production. Image uji sudah dihapus. Validitas YAML dicek dengan
  parser (js-yaml); `actionlint` tidak tersedia, jadi kesalahan semantik workflow baru terlihat
  saat Raditya menjalankannya pertama kali.
