# 5. VPS with co-located Postgres behind Cloudflare Tunnel

Status: accepted (2026-11-02), revised 2026-11-09 (provider and size), revised 2026-11-11 (domain and subdomains). Implementation in progress.

Details: deploy stack in [ADR 0006](0006-vps-deploy-stack.md), backups and restore drills in [ADR 0007](0007-backup-and-restore.md), client IP behind the tunnel in [ADR 0008](0008-client-ip-behind-tunnel.md).

## Context

- Railway is not on a paid plan and runs out around 2026-11-14.
- The Supabase project is in India (`ap-south-1`). One sale runs several queries in sequence inside one transaction, so every millisecond between API and database is multiplied.
- Supabase free projects pause after a week without activity.
- A VPS for a single shop felt wasteful. Raditya's second project, TahuHak (legal-search web app: Next.js with SSR, Postgres, Drizzle), will share the server, which makes one VPS cheaper per project than separate managed services.
- Waregos may later be sold to other shops, so one copyable deployment unit is valuable.

## Decision

- Provider: **Biznet Gio NEO Lite MS 4.2** (2 vCPU, 4 GB RAM, 60 GB disk, 1 IPv4, billed monthly, Rp139.000 + VAT). Ubuntu 24.04 LTS.
  - Hostinger KVM 1 was dropped because its low price requires paying 12–24 months upfront.
  - A 2 GB plan was rejected: OS + Waregos + TahuHak under load was estimated at 1.2–2.35 GB, leaving no room for `pg_dump`, image pulls or upgrades.
- Waregos runs in its own Docker Compose project: Postgres (internal Docker network only), the API, and `cloudflared`.
- No inbound web ports. Cloudflare Tunnel publishes `api.waregos.com`; HTTPS is handled by Cloudflare. Only SSH (key-only) is reachable.
- Domain: `waregos.com`, registered at Cloudflare Registrar (DNSSEC on, WHOIS privacy, auto-renew on). Subdomains:
  - `api.` — the API, through Cloudflare Tunnel.
  - `app.` — the web, as a Cloudflare Pages custom domain, attached at cutover.
  - root and `www.` — an explainer website, later.
  - `demo.` — a demo system, after v1.
- No DNS record ever points at the server's IP address. Everything public goes through the tunnel or Cloudflare Pages.
- CORS at cutover: `CORS_ORIGINS=https://app.waregos.com`, with `https://waregos.pages.dev` kept in the list until the new domain is stable.
- Web stays on Cloudflare Pages.
- Database roles stay as today: owner (migrations), `waregos_app` (DML only), read-only backup role.
- Backups every 6 hours, `age`-encrypted, shipped off the server (Cloudflare R2 by default), with an alarm when a run is missed, and a periodic restore drill. The provider's snapshots are only an extra layer.
- Images are built in GitHub Actions, never on the VPS.
- Sharing rules: each project has its own Compose folder, its own Postgres, its own tunnel and domain, and memory limits per container. Waregos never shares a Postgres instance with another project and has priority when memory is short. Swap 2 GB as a safety net.
- Railway is not paid as a bridge. The shop does not sell through the system yet, so a gap after Railway stops only pauses catalog entry.

## Consequences

- Raditya operates the server: security updates, disk, alerts, Postgres upgrades.
- Losing the VPS without a working backup means losing data, so backup alerts and restore drills are mandatory before go-live.
- A problem in TahuHak can affect the shop; memory limits and separate databases contain most of it.
- Trust-proxy settings in `apps/api/src/index.ts` were made for Railway and must be redone for the tunnel; client-IP and rate-limit tests must be repeated.
- Cost: split between the shop and the other project; the details are kept outside the repo.
- Moving providers later is a rebuild plus restore, not a rewrite.
