# Changelog Directory

Release notes for the RouteWarden security ecosystem are maintained independently for each component. Please refer to the dedicated changelog for your specific gateway or service:

| Component | Target Runtime / Technology | Latest Version | Dedicated Changelog |
| :--- | :--- | :--- | :--- |
| **Traefik Warden** | Traefik v2 / v3 Middleware Plugin (Go) | `{{traefik_version}}` | [Traefik Changelog](/traefik/changelog) |
| **Caddy Warden** | Caddy v2 HTTP Module (Go) | `{{caddy_version}}` | [Caddy Changelog](/caddy/changelog) |
| **NGINX Warden** | NGINX / OpenResty Module (Lua) | `{{nginx_version}}` | [NGINX Changelog](/nginx/changelog) |
| **TCP Warden** | L4 TCP/UDP Reverse Proxy & Shield (Go) | Integrated in CLI (`{{cli_version}}`) | [TCP Warden Changelog](/tcp/changelog) |
| **RouteWarden CLI** | Policy Compiler & Generator (`rwarden`) | `{{cli_version}}` | [CLI Changelog](/cli/changelog) |

---

## Component Changelogs

### [Traefik Warden Changelog](/traefik/changelog)
Covers all versions and changes for the Traefik v2/v3 Yaegi middleware plugin, including query inspection, IP filtering, response actions, honeypots, and Docker / Kubernetes deployments.

👉 [View Traefik Warden Changelog](/traefik/changelog)

---

### [Caddy Warden Changelog](/caddy/changelog)
Covers releases for the native Caddy v2 HTTP handler module, Caddyfile directives, JSON configurations, xcaddy builds, and anti-evasion filtering.

👉 [View Caddy Warden Changelog](/caddy/changelog)

---

### [NGINX Warden Changelog](/nginx/changelog)
Covers releases for the OpenResty / NGINX Lua security handler, LuaRocks packages, `access_by_lua_block` configurations, PCRE regex engines, and pure-Lua fallback implementations.

👉 [View NGINX Warden Changelog](/nginx/changelog)

---

### [TCP Warden Changelog](/tcp/changelog)
Covers releases for the high-performance L4 proxy daemon, including v3.0.0 UDP proxying with session tracking and connection throttling, plugins (CrowdSec, GeoIP, IP Whitelist, Connection Limiter), and metrics.

👉 [View TCP Warden Changelog](/tcp/changelog)

---

### [RouteWarden CLI Changelog](/cli/changelog)
Covers releases for the `rwarden` command-line tool, supporting multi-target generation (Traefik YAML/TOML/Labels, Caddyfile, NGINX Lua), policy validation, and simulation.

👉 [View CLI Release Notes](/cli/changelog)

---

## Versioning Policy

RouteWarden components follow [Semantic Versioning (SemVer)](https://semver.org/):
- **Major (`X.0.0`)**: Breaking configuration changes, architectural rewrites, or API deprecations.
- **Minor (`x.Y.0`)**: New security plugins, supported proxy targets, or backwards-compatible functionality additions.
- **Patch (`x.y.Z`)**: Security patches, bug fixes, performance enhancements, and documentation updates.
