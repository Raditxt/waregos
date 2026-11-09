# 4. Web is the only client

Status: accepted (2026-11-02)

## Context

A Flutter Android app existed alongside the web dashboard. Both the admin and the cashier can use a responsive web app, and maintaining two clients doubled the work.

## Decision

- The Flutter app is removed from the repository. Tag `mobile-archive` keeps it.
- The API's mDNS broadcast (`bonjour-service`) is removed; it only served the LAN-based mobile app.
- The web is a static export (`output: 'export'`) on Cloudflare Pages.

## Consequences

- The POS screen must be tested on the cashier's real device before go-live.
- Features kept from the mobile era (checkout idempotency key, `lowStock=true` filter) stay because the web uses them too.
