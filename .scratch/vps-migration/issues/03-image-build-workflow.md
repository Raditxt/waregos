# 03 — Image build workflow (API)

Status: ready-for-agent
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

- [ ] `.dockerignore` excludes `.env*` (keep `.env.example` files out of the image too, unless something needs them).
- [ ] Local `docker build` succeeds; `docker history --no-trunc` shows no secrets.
- [ ] Workflow YAML is valid (e.g. `actionlint` if available). The agent does **not** trigger it (`gh workflow run` is forbidden); Raditya runs it.
- [ ] Note for Raditya in Comments: make the GHCR package public after the first push.

## Comments
