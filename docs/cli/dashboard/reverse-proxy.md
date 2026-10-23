---
title: Reverse Proxy Setup — Routewarden Dashboard
description: Production guide for exposing Routewarden's real-time SOC security dashboard behind Traefik, Caddy, and NGINX with SSL/TLS and real-time SSE streaming.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../../.vitepress/theme/composables/useCodeSnippet'

// ─── 1. Traefik Snippets ────────────────────────────────────────────────────
const traefik_compose = buildSnippet({
  lang: 'yaml',
  code: `services:
  dashboard:
    image: ghcr.io/routewarden/dashboard:latest
    container_name: routewarden-dashboard
    restart: unless-stopped
    command: up --port 7890 --no-open
    networks:
      - proxy-net
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ~/.routewarden/dashboard:/root/.routewarden/dashboard
    labels:
      - "traefik.enable=true"
      # Match your dashboard domain
      - "traefik.http.routers.routewarden.rule=Host(\`soc.example.com\`)"
      - "traefik.http.routers.routewarden.entrypoints=websecure"
      - "traefik.http.routers.routewarden.tls=true"
      - "traefik.http.routers.routewarden.tls.certresolver=letsencrypt"
      - "traefik.http.services.routewarden.loadbalancer.server.port=7890"
      # Disable response buffering for zero-latency SSE streaming
      - "traefik.http.middlewares.routewarden-buffering.buffering.maxResponseBodyBytes=0"
      - "traefik.http.routers.routewarden.middlewares=routewarden-buffering"

networks:
  proxy-net:
    external: true`,
})

const traefik_file = buildSnippet({
  lang: 'yaml',
  code: `# dynamic-conf.yaml (File Provider)
http:
  routers:
    routewarden:
      rule: "Host(\`soc.example.com\`)"
      entryPoints:
        - "websecure"
      service: "routewarden-svc"
      tls:
        certResolver: "letsencrypt"

  services:
    routewarden-svc:
      loadBalancer:
        servers:
          - url: "http://127.0.0.1:7890"
        responseForwarding:
          flushInterval: "10ms"`,
})

const traefikSnippets = computed(() => ({
  cli: [
    { filename: 'Docker Compose (Labels)', lang: 'yaml', code: traefik_compose.cleanCode, html: traefik_compose.html, hasDiff: false },
    { filename: 'Dynamic File Provider', lang: 'yaml', code: traefik_file.cleanCode, html: traefik_file.html, hasDiff: false },
  ],
}))

// ─── 2. Caddy Snippets ──────────────────────────────────────────────────────
const caddy_subdomain = buildSnippet({
  lang: 'caddy',
  code: `# Caddyfile (Subdomain with Automatic Let's Encrypt TLS)
soc.example.com {
    # Reverse proxy to local Routewarden dashboard
    reverse_proxy localhost:7890 {
        # Flush SSE chunks immediately for real-time telemetry (< 10ms)
        flush_interval -1
    }

    # Optional: Enable compression for static assets
    encode zstd gzip
}`,
})

const caddy_subpath = buildSnippet({
  lang: 'caddy',
  code: `# Caddyfile (Subpath on existing domain: https://example.com/routewarden)
example.com {
    # Route dashboard under /routewarden subpath
    handle_path /routewarden* {
        reverse_proxy localhost:7890 {
            flush_interval -1
        }
    }
}`,
})

const caddySnippets = computed(() => ({
  cli: [
    { filename: 'Dedicated Subdomain', lang: 'caddy', code: caddy_subdomain.cleanCode, html: caddy_subdomain.html, hasDiff: false },
    { filename: 'Subpath Routing', lang: 'caddy', code: caddy_subpath.cleanCode, html: caddy_subpath.html, hasDiff: false },
  ],
}))

// ─── 3. NGINX Snippets ──────────────────────────────────────────────────────
const nginx_conf = buildSnippet({
  lang: 'nginx',
  code: `# /etc/nginx/sites-available/soc.example.com
server {
    listen 80;
    server_name soc.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name soc.example.com;

    ssl_certificate     /etc/letsencrypt/live/soc.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/soc.example.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    # Allow edge node log shipments up to 10MB
    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:7890;
        proxy_http_version 1.1;

        # Forward real client identity headers
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # CRITICAL: Disable buffering for Server-Sent Events (SSE)
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding off;

        # Prevent connection drops during quiet intervals
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}`,
})

const nginx_subpath = buildSnippet({
  lang: 'nginx',
  code: `# Subpath configuration inside an existing server block
location /routewarden/ {
    proxy_pass http://127.0.0.1:7890/;
    proxy_http_version 1.1;

    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # SSE live streaming configuration
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 86400s;
}`,
})

const nginxSnippets = computed(() => ({
  cli: [
    { filename: 'nginx.conf (Subdomain)', lang: 'nginx', code: nginx_conf.cleanCode, html: nginx_conf.html, hasDiff: false },
    { filename: 'Subpath (/routewarden/)', lang: 'nginx', code: nginx_subpath.cleanCode, html: nginx_subpath.html, hasDiff: false },
  ],
}))

// ─── 4. Launch & Bind Snippets ──────────────────────────────────────────────
const bind_cli = buildSnippet({
  lang: 'bash',
  code: `# Bind dashboard to localhost only so it cannot be accessed directly from WAN:
rwarden dashboard up --host 127.0.0.1 --port 7890 --no-open --detach

# Verify it is bound only to 127.0.0.1
rwarden dashboard status`,
})

const bind_compose = buildSnippet({
  lang: 'yaml',
  code: `services:
  dashboard:
    image: ghcr.io/routewarden/dashboard:latest
    container_name: routewarden-dashboard
    restart: unless-stopped
    command: up --port 7890 --no-open
    # Bind to 127.0.0.1 on the host to prevent direct public access
    ports:
      - "127.0.0.1:7890:7890"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ~/.routewarden/dashboard:/root/.routewarden/dashboard`,
})

const bindSnippets = computed(() => ({
  cli: [
    { filename: 'CLI Host Binding', lang: 'bash', code: bind_cli.cleanCode, html: bind_cli.html, hasDiff: false },
    { filename: 'Docker Compose Port Binding', lang: 'yaml', code: bind_compose.cleanCode, html: bind_compose.html, hasDiff: false },
  ],
}))

// ─── 5. Edge Shipping Snippets ──────────────────────────────────────────────
const edge_connect_cmd = buildSnippet({
  lang: 'bash',
  code: `# Register remote edge server with central dashboard reverse proxy URL
rwarden register --url https://soc.example.com --key rw_sec_8f9a2b4c1e0d3f7a9b2c4e6f8a0d1c3e4f5a6b7c8d9e0f1a

# Stream encrypted logs from containers or access logs in detached mode
rwarden push -d`,
})

const edge_direct_cmd = buildSnippet({
  lang: 'bash',
  code: `# Push directly without prior registration
rwarden push \\
  --url https://soc.example.com \\
  --key rw_sec_8f9a2b4c1e0d3f7a9b2c4e6f8a0d1c3e4f5a6b7c8d9e0f1a \\
  --docker \\
  --detach`,
})

const edgeConnectSnippets = computed(() => ({
  cli: [
    { filename: 'Register & Push', lang: 'bash', code: edge_connect_cmd.cleanCode, html: edge_connect_cmd.html, hasDiff: false },
    { filename: 'Direct Push Command', lang: 'bash', code: edge_direct_cmd.cleanCode, html: edge_direct_cmd.html, hasDiff: false },
  ],
}))

const edge_nginx_whitelist = buildSnippet({
  lang: 'nginx',
  code: `# NGINX: Whitelist API ingestion for remote nodes while protecting the UI
location /api/v1/ {
    proxy_pass http://127.0.0.1:7890;
    proxy_http_version 1.1;
    proxy_buffering off;
    client_max_body_size 10M;
    # No HTTP Basic Auth required here — agents authenticate via cryptographic tokens
}

location / {
    # Protect dashboard UI with corporate IP restriction or auth
    allow 192.168.1.0/24;
    allow 10.0.0.0/8;
    deny all;

    proxy_pass http://127.0.0.1:7890;
    proxy_buffering off;
}`,
})

const edge_caddy_whitelist = buildSnippet({
  lang: 'caddy',
  code: `# Caddyfile: Whitelist /api/v1/* for edge shipping while protecting UI
soc.example.com {
    # Allow agent cryptographic ingestion without basic auth
    handle /api/v1/* {
        reverse_proxy localhost:7890 {
            flush_interval -1
        }
    }

    # Protect dashboard UI with basic auth or remote IP filter
    handle {
        basic_auth {
            admin $2a$14$Zkx19XLiW6VYouLHR5NmfOFU0z2GTNmpkT/5qqR78M4VzG/YwKq2C
        }
        reverse_proxy localhost:7890 {
            flush_interval -1
        }
    }
}`,
})

const edge_traefik_whitelist = buildSnippet({
  lang: 'yaml',
  code: `# Traefik Labels: Separate routers for public API ingestion vs protected UI
services:
  dashboard:
    image: ghcr.io/routewarden/dashboard:latest
    labels:
      - "traefik.enable=true"
      # Router 1: Open ingestion endpoint for remote edge agents
      - "traefik.http.routers.rw-ingest.rule=Host(\`soc.example.com\`) && PathPrefix(\`/api/v1\`)"
      - "traefik.http.routers.rw-ingest.entrypoints=websecure"
      - "traefik.http.routers.rw-ingest.tls=true"
      - "traefik.http.routers.rw-ingest.service=routewarden"

      # Router 2: UI protected by IP allowlist middleware
      - "traefik.http.routers.rw-ui.rule=Host(\`soc.example.com\`)"
      - "traefik.http.routers.rw-ui.entrypoints=websecure"
      - "traefik.http.routers.rw-ui.tls=true"
      - "traefik.http.routers.rw-ui.middlewares=corporate-ip-whitelist"
      - "traefik.http.routers.rw-ui.service=routewarden"`,
})

const edgeProxySnippets = computed(() => ({
  cli: [
    { filename: 'NGINX Whitelist', lang: 'nginx', code: edge_nginx_whitelist.cleanCode, html: edge_nginx_whitelist.html, hasDiff: false },
    { filename: 'Caddyfile Whitelist', lang: 'caddy', code: edge_caddy_whitelist.cleanCode, html: edge_caddy_whitelist.html, hasDiff: false },
    { filename: 'Traefik Docker Labels', lang: 'yaml', code: edge_traefik_whitelist.cleanCode, html: edge_traefik_whitelist.html, hasDiff: false },
  ],
}))

// ─── 6. Verification Snippets ───────────────────────────────────────────────
const verify_curl_cmd = buildSnippet({
  lang: 'bash',
  code: `# 1. Check edge node connectivity to ingestion endpoint
curl -I https://soc.example.com/api/v1/heartbeat
# Expected: HTTP/2 401 Unauthorized (proves endpoint is reachable & token-protected)

# 2. Inspect live SSE streaming connection
curl -N -H "Accept: text/event-stream" https://soc.example.com/api/stream

# 3. Test API stats endpoint
curl -s https://soc.example.com/api/stats | jq .total_events`,
})

const verifySnippets = computed(() => ({
  cli: [
    { filename: 'Verification Commands', lang: 'bash', code: verify_curl_cmd.cleanCode, html: verify_curl_cmd.html, hasDiff: false },
  ],
}))

// ─── 7. Environment Variable Snippets ───────────────────────────────────────
const env_file_snippet = buildSnippet({
  lang: 'bash',
  code: `# .env — Production Environment Configuration for Routewarden
# ─────────────────────────────────────────────────────────────
# Domain and Network
DOMAIN=soc.example.com
PORT=7890
RW_DASHBOARD_HOST=127.0.0.1
TZ=UTC

# Cyber Auth Screen Credentials (user:password or separate user/pass)
RW_DASHBOARD_AUTH=admin:SuperSecretPassphrase2026!
# Or individually:
# RW_DASHBOARD_USER=admin
# RW_DASHBOARD_PASSWORD=SuperSecretPassphrase2026!

# MaxMind GeoIP Database (Optional custom path)
# GEOIP_DB=/root/.routewarden/dashboard/GeoLite2-Country.mmdb

# Traefik / ACME SSL Notification Email
LETSENCRYPT_EMAIL=security@example.com`,
})

const compose_env_snippet = buildSnippet({
  lang: 'yaml',
  code: `# docker-compose.yml with .env file and variable expansion
services:
  dashboard:
    image: ghcr.io/routewarden/dashboard:latest
    container_name: routewarden-dashboard
    restart: unless-stopped
    command: up --no-open
    env_file:
      - .env
    environment:
      # Pass through or provide default values
      - PORT=\${PORT:-7890}
      - RW_DASHBOARD_HOST=\${RW_DASHBOARD_HOST:-127.0.0.1}
      - RW_DASHBOARD_AUTH=\${RW_DASHBOARD_AUTH}
      - TZ=\${TZ:-UTC}
    ports:
      # Bind only to the host IP defined in .env (127.0.0.1)
      - "\${RW_DASHBOARD_HOST:-127.0.0.1}:\${PORT:-7890}:7890"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ~/.routewarden/dashboard:/root/.routewarden/dashboard
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.routewarden.rule=Host(\`\${DOMAIN}\`)"
      - "traefik.http.routers.routewarden.entrypoints=websecure"
      - "traefik.http.routers.routewarden.tls=true"
      - "traefik.http.routers.routewarden.tls.certresolver=letsencrypt"
      - "traefik.http.services.routewarden.loadbalancer.server.port=7890"`,
})

const cli_env_snippet = buildSnippet({
  lang: 'bash',
  code: `# Option A: Inline environment variables with rwarden binary
RW_DASHBOARD_AUTH="admin:MySecretKey!" \\
RW_DASHBOARD_HOST="127.0.0.1" \\
rwarden dashboard -d

# Option B: Load from .env file before launching
set -a
source /etc/routewarden/.env
set +a
rwarden dashboard up --detach

# Option C: Systemd service (/etc/systemd/system/rwarden-dashboard.service)
# [Unit]
# Description=Routewarden Real-Time SOC Security Dashboard
# After=network.target
#
# [Service]
# Type=simple
# User=routewarden
# EnvironmentFile=/etc/routewarden/.env
# ExecStart=/usr/local/bin/rwarden dashboard up --no-open
# Restart=always
#
# [Install]
# WantedBy=multi-user.target`,
})

const envSnippets = computed(() => ({
  cli: [
    { filename: '.env File', lang: 'bash', code: env_file_snippet.cleanCode, html: env_file_snippet.html, hasDiff: false },
    { filename: 'docker-compose.yml', lang: 'yaml', code: compose_env_snippet.cleanCode, html: compose_env_snippet.html, hasDiff: false },
    { filename: 'CLI & Systemd', lang: 'bash', code: cli_env_snippet.cleanCode, html: cli_env_snippet.html, hasDiff: false },
  ],
}))
</script>

# Reverse Proxy Setup for Routewarden Dashboard

When deploying Routewarden's security dashboard in production, placing it behind a reverse proxy provides:

- **HTTPS / TLS Encryption**: Automated certificate renewal with Let's Encrypt or ZeroSSL.
- **Custom Domain Routing**: Expose the dashboard under `soc.example.com` or a subpath like `/routewarden`.
- **IP Allowlisting & Zero Trust**: Restrict access to corporate VPNs, Tailscale, or Cloudflare Access while keeping edge ingestion endpoints accessible.
- **Secure Host Isolation**: Bind Routewarden internally to `127.0.0.1:7890` so the raw HTTP port is never exposed to the public internet.

---

## Critical Requirements for Live SSE Streaming

Routewarden streams real-time threat telemetry, KPIs, and live event rows to the browser using **Server-Sent Events (SSE)** at `/api/stream`.

When routing through any reverse proxy, two settings are essential:

1. **Disable Proxy Buffering**: By default, proxies like NGINX buffer HTTP responses until a buffer (4KB–16KB) fills up before sending it downstream. For SSE streams, this causes events to lag or appear in bursts. Disabling buffering ensures immediate event delivery.
2. **Long Read Timeouts**: SSE maintains a persistent, open HTTP connection. Standard reverse proxies timeout idle connections after 60 seconds unless `proxy_read_timeout` is extended (e.g. `86400s` or `24h`).

---

## 1. Localhost Isolation (Recommended)

Before configuring your reverse proxy, ensure Routewarden only listens on `127.0.0.1` so external users cannot bypass your proxy:

<CodeViewer :snippets="bindSnippets" />

---

## 2. Traefik Configuration

Traefik natively supports HTTP/2 and SSE streaming. Set the response buffering middleware to `maxResponseBodyBytes: 0` to ensure zero-latency telemetry delivery.

<CodeViewer :snippets="traefikSnippets" />

### Key Traefik Directives:
- **`loadbalancer.server.port=7890`**: Directs traffic to Routewarden's internal HTTP server.
- **`responseForwarding.flushInterval: "10ms"`** / **`maxResponseBodyBytes: 0`**: Ensures SSE messages are flushed downstream immediately upon receipt.

---

## 3. Caddy Configuration

Caddy automatically provisions TLS certificates and handles HTTP/2 connection multiplexing. Adding `flush_interval -1` forces immediate SSE streaming flushes.

<CodeViewer :snippets="caddySnippets" />

### Key Caddy Directives:
- **`flush_interval -1`**: Disables output buffering in Caddy's `reverse_proxy`, flushing each SSE event packet immediately to the client.
- **`handle_path`**: Strips the `/routewarden` prefix when routing to subpaths.

---

## 4. NGINX Configuration

NGINX is one of the most common production reverse proxies. For Routewarden, disabling buffering and setting long connection timeouts is crucial:

<CodeViewer :snippets="nginxSnippets" />

### Critical NGINX Directives Explained:

| Directive | Value | Purpose |
|:---|:---|:---|
| `proxy_buffering` | `off` | **Mandatory for SSE**. Disables response caching and ensures security events arrive immediately. |
| `proxy_cache` | `off` | Prevents NGINX from caching live stream chunks. |
| `chunked_transfer_encoding` | `off` | Prevents chunk framing overhead on persistent SSE streams. |
| `proxy_read_timeout` | `86400s` | Extends timeout to 24 hours so quiet periods do not disconnect the dashboard stream. |
| `client_max_body_size` | `10M` | Allows encrypted batch log deliveries from remote edge nodes (`/api/v1/events`). |
| `X-Real-IP` & `X-Forwarded-For` | `$remote_addr` | Preserves original visitor and remote agent client IPs for threat dossier attribution. |

---

## 5. Reverse Proxy with Remote Edge Nodes (`rwarden push`)

If you are using Routewarden's distributed log shipping (`rwarden push`), remote agents connect to the dashboard URL:

<CodeViewer :snippets="edgeConnectSnippets" />

### Ingestion Security Architecture:
- Remote edge nodes send encrypted batches to **`POST /api/v1/events`** and health pings to **`POST /api/v1/heartbeat`**.
- All payloads are encrypted using **ECDH (Curve25519) + AES-GCM-256** using the server's public key.
- If you protect the web UI with reverse proxy basic auth or IP allowlisting, ensure `/api/v1/` endpoints remain accessible to edge nodes:

<CodeViewer :snippets="edgeProxySnippets" />

::: tip Built-In Cyber Auth
Routewarden includes its own built-in cyber authentication screen via `--auth <user:password>`. When using Routewarden's built-in auth, the `/api/v1/*` endpoints and static assets are automatically whitelisted, so you do not need complex reverse proxy location blocks.
:::

---

## 6. Verification & Troubleshooting

Once your reverse proxy is active, verify that SSE streaming and event ingestion are functioning correctly:

1. **Test Web Dashboard**:
   Open `https://soc.example.com` in your browser. Verify the green **🟢 LIVE** badge appears in the topbar.
2. **Inspect SSE Stream in DevTools**:
   Open Developer Tools &rarr; Network tab &rarr; Filter by `stream` (`/api/stream`).
   - The connection should remain in `Pending` state with status `200 OK`.
   - In the **EventStream** tab, new events should appear in real time without delay.
3. **Check Edge Node Connectivity & Streaming**:
<CodeViewer :snippets="verifySnippets" />

---

## 7. Environment Variables & `.env` Configuration

To avoid exposing passwords, domain names, or secrets in shell history or version-controlled Compose files, Routewarden reads configuration directly from environment variables.

### Environment Variable Reference

| Variable | CLI Flag Equivalent | Default | Description |
|:---|:---|:---|:---|
| `RW_DASHBOARD_AUTH` | `-a`, `--auth` | `""` | HTTP Basic Auth credentials in `user:password` format for the cyber auth screen. |
| `RW_DASHBOARD_USER` | `--user` | `""` | Optional Basic Auth username (combined with `RW_DASHBOARD_PASSWORD`). |
| `RW_DASHBOARD_PASSWORD` / `RW_DASHBOARD_PASS` | `--password` | `""` | Optional Basic Auth password. |
| `RW_DASHBOARD_HOST` | `--host` | `""` | Host interface to bind (e.g. `127.0.0.1` for local reverse proxy isolation). |
| `PORT` | `--port` | `7890` | TCP port for the dashboard HTTP server and SSE stream. |
| `GEOIP_DB` / `MAXMIND_DB` | `--geoip-db` | `Auto` | Optional path to custom MaxMind `GeoLite2-Country.mmdb` or `GeoLite2-City.mmdb`. |
| `TZ` | — | `UTC` | Timezone used for formatted timestamps and timeline aggregation. |
| `RWARDEN_MONITOR_WAIT` | `-w`, `--wait` | `false` | When set to `true`, waits and retries if no matching containers are found initially. |

### Configuration Examples (`.env`, Compose, Systemd)

<CodeViewer :snippets="envSnippets" />

::: tip Environment Precedence
CLI flags always take precedence over environment variables. For example, passing `--auth admin:cli-pass` overrides any `RW_DASHBOARD_AUTH` environment variable.
:::


