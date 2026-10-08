# Examples & Cookbook Overview

Browse ready-to-run configurations and production blueprints for RouteWarden across different deployment targets.

---

## Scenario Index

| Scenario | Description | Target |
|---|---|---|
| [1. Basic Sensitive Files](/examples/basic-sensitive-files) | Shield `.env`, `.git`, backups, and configs with custom JSON errors. | Traefik, Caddy & NGINX |
| [2. Global EntryPoint Shield](/examples/docker-compose-global) | Protect all microservices and routes automatically at the proxy gateway. | Traefik, Caddy & NGINX |
| [3. Service-Level Docker Compose](/examples/docker-compose-service) | Tailor rules, custom regexes, and safe allowlists per service. | Traefik, Caddy & NGINX |
| [4. IP / Subnet Whitelisting](/examples/ip-whitelisting) | Allow internal corporate VPNs, office IPs, and developer subnets. | Traefik, Caddy & NGINX |
| [5. Captcha Verification Challenge](/examples/captcha) | Challenge clients via Cloudflare Turnstile or hCaptcha on sensitive routes. | Traefik, Caddy & NGINX |
| [6. Kubernetes IngressRoute](/examples/kubernetes) | Production Ingress and Middleware setups for Traefik CRDs, Caddy & NGINX Ingress. | Kubernetes (Traefik, Caddy & NGINX) |
| [7. CrowdSec Integration & Security Logging](/examples/crowdsec) | Connect RouteWarden to CrowdSec for instant 1-strike attacker auto-bans. | Traefik, Caddy & NGINX + CrowdSec |

---

## Production Case Studies

| Case Study | Focus & Threat Model | Protection Pattern |
|---|---|---|
| [1. Immich Dual-Router Shield](/examples/case-study-immich) | Public photo/video sharing without exposing login/admin APIs. | Dual Traefik Routers + 404 Masking |
| [2. Zero-Trust Webhooks](/examples/case-study-webhooks) | Secure Stripe/GitHub webhook ingress from unauthorized HTTP injection. | Provider CIDR Whitelisting + Silent Drop |
| [3. Observability & Metrics Cloaking](/examples/case-study-observability) | Prevent public harvesting of Prometheus `/metrics` and `/actuator`. | VPC / Internal Scraper IP Exemption |
| [4. CMS & WordPress Brute-Force Shield](/examples/case-study-cms-shield) | Eliminate credential-stuffing on `wp-login.php`, `xmlrpc.php`, and `/admin`. | Cloudflare Turnstile / hCaptcha Challenge |
| [5. Password Vaults (Vaultwarden)](/examples/case-study-vaultwarden) | Public mobile password sync while restricting `/admin` to Tailscale/WireGuard. | VPN Subnet Filter + 404 Error Cloaking |
| [6. Honeypots & Staging Cloaking](/examples/case-study-honeypot-staging) | Neutralize scanning bots and hide pull-request preview clusters from crawlers. | TCP RST (`silentDrop`) & 307 Deflection |
| [7. Media Streaming (Jellyfin & Plex)](/examples/case-study-media) | Secure media playback over the web while cloaking admin consoles. | Selective Endpoint Masking + VPN Bypass |
| [8. Smart Home (Home Assistant)](/examples/case-study-home-assistant) | Allow mobile GPS/sensor webhooks while shielding smart locks and auth. | Webhook Regex Allowlist + Admin Cloaking |

---

## Technical References

| Reference | Description | Target |
|---|---|---|
| [Custom Paths & Regex Guide](/reference/custom-paths) | Regex patterns, wildcard rules, and sensitive route catalog. | Traefik, Caddy & NGINX |
| [Response Modes Reference](/reference/response-modes) | All 13 defense action modes, headers, and payload behaviors. | Traefik, Caddy & NGINX |
| [Anti-Evasion Security Engine](/reference/anti-evasion) | URL normalization, recursive decoders, and directory traversal mitigation. | Traefik, Caddy & NGINX |

---

## In-Repo Runnable Code

All examples are checked directly into the [`examples/`](https://github.com/routewarden/traefik-warden/tree/main/examples) directory of the RouteWarden GitHub repository. You can clone the repo and run any scenario in seconds:

```bash
git clone https://github.com/routewarden/traefik-warden.git
cd routewarden/examples/01-basic-sensitive-files
docker compose up -d
```
