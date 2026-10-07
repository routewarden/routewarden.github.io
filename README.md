<p align="center">
  <img src="docs/public/icon.svg" alt="RouteWarden Icon" width="160">
</p>

<p align="center">
  <strong>Unified Edge &amp; L4 Defense for Traefik, Caddy, NGINX &amp; TCP Services</strong>
</p>

<p align="center">
  <a href="https://github.com/routewarden/tcp-warden"><img src="https://img.shields.io/badge/TCP--Warden-L4%20Proxy-orange.svg" alt="TCP Warden L4"></a>
  <a href="https://github.com/routewarden/traefik-warden/actions/workflows/ci.yml"><img src="https://github.com/routewarden/traefik-warden/actions/workflows/ci.yml/badge.svg" alt="Traefik CI Status"></a>
  <a href="https://github.com/routewarden/caddy-warden/actions/workflows/ci.yml"><img src="https://github.com/routewarden/caddy-warden/actions/workflows/ci.yml/badge.svg" alt="Caddy CI Status"></a>
  <a href="https://github.com/routewarden/nginx-warden/actions/workflows/ci.yml"><img src="https://github.com/routewarden/nginx-warden/actions/workflows/ci.yml/badge.svg" alt="NGINX CI Status"></a>
  <a href="https://github.com/routewarden/routewarden.github.io/actions/workflows/deploy-docs.yml"><img src="https://github.com/routewarden/routewarden.github.io/actions/workflows/deploy-docs.yml/badge.svg" alt="Docs Deployment"></a>
  <a href="https://plugins.traefik.io/plugins/6aae41dd5b5ee35d8bd24ca5/route-warden"><img src="https://img.shields.io/badge/Traefik-v2%20%7C%20v3-blue.svg" alt="Traefik v2/v3 Compatible"></a>
  <a href="https://caddyserver.com"><img src="https://img.shields.io/badge/Caddy-v2-22b573.svg" alt="Caddy v2 Compatible"></a>
  <a href="https://openresty.org"><img src="https://img.shields.io/badge/OpenResty-Lua-009900.svg" alt="OpenResty Lua Compatible"></a>
  <a href="https://routewarden.github.io/?playground=open"><img src="https://img.shields.io/badge/Playground-Simulation-blue.svg" alt="Security Playground"></a>
  <a href="https://routewarden.github.io/"><img src="https://img.shields.io/badge/docs-vitepress-6366f1.svg" alt="Documentation Site"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License: MIT"></a>
</p>

---

## RouteWarden Documentation

This repository contains the documentation, deployment guides, examples, and release references for RouteWarden across **[TCP Warden](https://github.com/routewarden/tcp-warden)**, **[Traefik](https://github.com/routewarden/traefik-warden)**, **[Caddy](https://github.com/routewarden/caddy-warden)**, and **[NGINX & OpenResty](https://github.com/routewarden/nginx-warden)**.

- **Documentation Portal**: [https://routewarden.github.io/](https://routewarden.github.io/)
- **Interactive Playground**: [https://routewarden.github.io/?playground=open](https://routewarden.github.io/?playground=open)

---

## Ecosystem Links

| Resource | Link | Description |
|---|---|---|
| **TCP Warden (tcp-warden)** | [github.com/routewarden/tcp-warden](https://github.com/routewarden/tcp-warden) | Protocol-aware Layer 4 reverse proxy, rate limiter, and protocol firewall |
| **Traefik Plugin (traefik-warden)** | [github.com/routewarden/traefik-warden](https://github.com/routewarden/traefik-warden) | Pure Go Traefik plugin with Yaegi compatibility |
| **Caddy Plugin (caddy-warden)** | [github.com/routewarden/caddy-warden](https://github.com/routewarden/caddy-warden) | Official Caddy v2 security module and Caddyfile directive |
| **NGINX Plugin (nginx-warden)** | [github.com/routewarden/nginx-warden](https://github.com/routewarden/nginx-warden) | High-performance Lua security module for NGINX & OpenResty |
| **Interactive Playground** | [routewarden.github.io/?playground=open](https://routewarden.github.io/?playground=open) | Test URLs against normalization rules and generate gateway configs |
| **Traefik Plugin Catalog** | [plugins.traefik.io](https://plugins.traefik.io/plugins/6aae41dd5b5ee35d8bd24ca5/route-warden) | Official Traefik Plugin listing |
| **Documentation Portal** | [routewarden.github.io](https://routewarden.github.io/) | Installation guides, architecture, and configuration options |
| **Examples Cookbook** | [Documentation Examples](https://routewarden.github.io/examples/overview) | Ready-to-use Docker Compose and Kubernetes configurations |
| **Issue Tracker** | [RouteWarden Issues](https://github.com/routewarden/traefik-warden/issues) | Bug reports and feature discussions |

---

## What is RouteWarden?

**RouteWarden** is a lightweight, zero-dependency security middleware for **Traefik**, **Caddy v2**, and **NGINX / OpenResty**. It inspects incoming HTTP requests at the reverse proxy layer and blocks unauthorized attempts to reach sensitive files, hidden directories, or administrative endpoints before requests reach your application containers:

- **Sensitive Path Protection**: Blocks access to `.env`, `.git`, `.aws`, `.ssh`, `.sql`, database dumps, and server configuration files (`enableDefaultPatterns: true` / `enable_default_patterns`).
- **Anti-Evasion Normalization**: Resolves multi-layer URL encoding (`%252e%252e`), semicolon matrix parameters (`/;param/.env`), backslashes (`\`), and null bytes (`%00`) before evaluating rules.
- **IP and Subnet Allowlisting**: Lets corporate VPNs, internal networks, or trusted IP addresses bypass checks using `X-Forwarded-For`, `X-Real-IP`, or client socket addresses.
- **13 Configurable Response Modes**: Returns custom JSON, static HTML error pages, Cloudflare Turnstile / hCaptcha challenges, immediate TCP resets (`silentDrop`), gzip bombs, or honeypot redirects.
- **Interactive Playground**: Test URL patterns, inspect anti-evasion transformations, and generate gateway configurations directly in your browser.

### Interactive Playground Deeplinks

You can test how RouteWarden processes and normalizes requests using these sample links:

- [Double URL-Encoded Traversal (`/%252e%252e/.env`)](https://routewarden.github.io/?playground=open&path=%2F%25252e%25252e%2F.env)
- [Matrix Semicolon Evasion (`/static;p=1/.git/config`)](https://routewarden.github.io/?playground=open&path=%2Fstatic%3Bp%3D1%2F.git%2Fconfig)
- [Allowlist Override (`/robots.txt`)](https://routewarden.github.io/?playground=open&path=%2Frobots.txt)
- [Gzip Bomb Active Response (`/backup.sql`)](https://routewarden.github.io/?playground=open&path=%2Fbackup.sql&mode=gzipBomb&gzipMB=15)
- [IP Allowlist Bypass (`/.env` from `10.5.0.25`)](https://routewarden.github.io/?playground=open&path=%2F.env&ip=10.5.0.25)

### Quick Usage

#### Traefik

```yaml
# traefik.yml (Static Configuration)
experimental:
  plugins:
    routewarden:
      moduleName: github.com/routewarden/traefik-warden
      version: v1.4.1
```

```yaml
# dynamic_conf.yml (Dynamic Configuration)
http:
  middlewares:
    shield:
      plugin:
        routewarden:
          enabled: true
          enableDefaultPatterns: true
          response:
            mode: json
            statusCode: 404
            body: '{"error":"Not Found"}'
```

#### Caddy

Build Caddy with `xcaddy`:
```bash
xcaddy build --with github.com/routewarden/caddy-warden@v1.2.1
```

Configure `Caddyfile`:
```caddyfile
{
    order route_warden before reverse_proxy
}

:80 {
    route_warden {
        enable_default_patterns
        response {
            mode json
            status_code 404
            body "{\"error\":\"Not Found\"}"
        }
    }
    reverse_proxy app:8080
}
```

#### NGINX & OpenResty

Configure `nginx.conf`:
```nginx
http {
    lua_package_path "/usr/local/openresty/site/lualib/?.lua;/etc/nginx/lua/lib/?.lua;;";

    init_by_lua_block {
        local routewarden = require("resty.routewarden")
        warden = routewarden.new({
            enabled = true,
            enable_default_patterns = true,
            response = {
                mode = "json",
                status_code = 404,
                body = '{"error":"Not Found"}'
            }
        })
    }

    server {
        listen 80;

        access_by_lua_block {
            warden:check()
        }

        location / {
            proxy_pass http://app:8080;
        }
    }
}
```

#### TCP Warden (Layer 4 Infrastructure Defense)

Launch with Docker Compose:
```yaml
services:
  tcp-warden:
    image: ghcr.io/routewarden/tcp-warden:latest
    network_mode: host
    volumes:
      - tcp-warden-config:/etc/routewarden
      - tcp-warden-data:/var/lib/routewarden
```

Configure `tcp-warden.yaml`:
```yaml
services:
  ssh:
    listen: ":2222"
    upstream: "127.0.0.1:22"
    protocol: ssh
    max_auth_failures: 3
    ban_duration: 1h

  postgres:
    listen: ":5432"
    upstream: "127.0.0.1:5433"
    protocol: postgres
    max_auth_failures: 5
    ban_duration: 2h
```

---

## Developing Documentation Locally

The documentation is powered by **[VitePress](https://vitepress.dev/)**.

### Prerequisites
- Node.js 18+ (Node.js 22 recommended)
- npm 9+

### Quick Start
```bash
# 1. Clone the docs repository
git clone https://github.com/routewarden/routewarden.github.io.git routewarden-docs
cd routewarden-docs

# 2. Install dependencies
npm install

# 3. Start local development server
npm run docs:dev
```
Open **`http://localhost:5173/`** in your browser.

### Available Scripts

| Command | Description |
|---|---|
| `npm run docs:dev` | Starts the VitePress live-reload development server |
| `npm run docs:build` | Validates markdown links and compiles the static site into `docs/.vitepress/dist` |
| `npm run docs:preview` | Locally previews the compiled production build |
| `npm run sync-version` | Syncs `docs/version.json` with repository `package.json` |
| `npm run docs:release <version>` | Generates a versioned snapshot (e.g. `npm run docs:release v0.3.0`) |
| `npm test` | Runs internal Node.js unit tests for scripts |

---

## Contributing

Contributions to improve RouteWarden's documentation, case studies, and guides are welcomed.

1. Fork this repository.
2. Create your feature branch (`git checkout -b feature/new-case-study`).
3. Validate tests and build locally:
   ```bash
   npm test
   npm run docs:build
   ```
4. Commit your changes and open a Pull Request against `develop`.

---

## License

This documentation and RouteWarden are open-source software licensed under the [MIT License](https://github.com/routewarden/traefik-warden/blob/main/LICENSE).
