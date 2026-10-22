---
title: TCP Warden — Protocol-Aware L4 Security Proxy & Firewall
description: High-performance Layer 4 reverse proxy, rate limiter, protocol firewall, and honeypot for non-HTTP infrastructure services.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

const quick_compose = buildSnippet({
  lang: 'yaml',
  code: `services:
  tcp-warden:
    image: ghcr.io/routewarden/tcp-warden:latest
    container_name: tcp-warden
    restart: unless-stopped
    network_mode: host
    volumes:
      - tcp-warden-config:/etc/routewarden
      - tcp-warden-data:/var/lib/routewarden
      - tcp-warden-logs:/var/log/routewarden

volumes:
  tcp-warden-config:
  tcp-warden-data:
  tcp-warden-logs:`
})

const quick_yaml = buildSnippet({
  lang: 'yaml',
  code: `# yaml-language-server: $schema=https://routewarden.github.io/tcp-warden/tcp-warden.schema.json
global:
  max_connections: 10000
  log_file: /var/log/routewarden/tcp-warden.jsonl
  data_dir: /var/lib/routewarden

services:
  # Built-in generic Layer 4 TCP proxy
  bastion:
    listen: ":15432"
    upstream: "127.0.0.1:5432"
    protocol: tcp
    rate_limit:
      connections_per_minute: 60
      burst: 10

  # Protocol inspection via plugin (install: rwarden tcp plugins install ssh)
  ssh-guard:
    listen: ":2222"
    upstream: "127.0.0.1:22"
    protocol: ssh
    max_auth_failures: 3
    ban_after_failures: 3
    ban_duration: 1h`
})

const quick_rwarden = buildSnippet({
  lang: 'bash',
  code: `# 1. Start TCP/UDP proxy in background (auto-loads tcp-warden.yaml)
rwarden tcp up -d

# 2. Check running status and active connections
rwarden tcp status

# 3. Reload configuration with zero downtime
rwarden tcp reload

# 4. Stream real-time connection security events (SSE)
curl -N http://127.0.0.1:9091/events`
})

const quick_cli = buildSnippet({
  lang: 'bash',
  code: `# 1. Start daemon in Docker Compose
docker compose up -d

# 2. Check service status and active connections
docker compose exec tcp-warden tcp-warden status

# 3. Install Postgres protocol inspector plugin on demand
docker compose exec tcp-warden tcp-warden plugins install postgres

# 4. Stream real-time connection events
curl -N http://127.0.0.1:9091/events`
})

const quickStartSnippets = computed(() => ({
  tcp: [
    { filename: 'rwarden tcp (CLI)', lang: 'bash', code: quick_rwarden.cleanCode, html: quick_rwarden.html, hasDiff: false },
    { filename: 'tcp-warden.yaml', lang: 'yaml', code: quick_yaml.cleanCode, html: quick_yaml.html, hasDiff: false },
    { filename: 'docker-compose.yml', lang: 'yaml', code: quick_compose.cleanCode, html: quick_compose.html, hasDiff: false },
    { filename: 'Docker CLI', lang: 'bash', code: quick_cli.cleanCode, html: quick_cli.html, hasDiff: false },
  ]
}))
</script>

# TCP Warden

<p class="tagline" style="font-size: 1.25rem; color: var(--vp-c-text-2); margin-bottom: 1.5rem;">
A lightweight, protocol-aware security proxy and firewall for non-HTTP services across TCP and UDP.
</p>

::: tip Built into RouteWarden CLI
TCP Warden is natively integrated into the RouteWarden suite via the `rwarden tcp` command tree. You can also run it as a standalone binary (`tcp-warden`) or lightweight Alpine container (`ghcr.io/routewarden/tcp-warden:latest`).
:::

Most reverse proxies (like Traefik, Caddy, or NGINX) are built to protect web traffic (HTTP/HTTPS). But what protects your databases, SSH servers, DNS resolvers, message queues, and cache layers?

**TCP Warden** sits between the internet and your backend services. It intercepts raw TCP and UDP traffic, inspects protocol handshakes and datagrams, blocks brute-force attackers, rate-limits abusive clients, and optionally integrates with **CrowdSec**—all before malicious packets ever reach your servers.

---

## What Does TCP Warden Do?

<div class="attack-grid">
  <div class="attack-card">
    <h4>🛡️ Stop Brute-Force Logins</h4>
    <p>Automatically tracks authentication failures across SSH, databases, and mail servers. Abusive IPs are banned instantly.</p>
  </div>
  <div class="attack-card">
    <h4>⚡ Smooth Connection Spikes</h4>
    <p>Applies token-bucket rate limiting and global connection limits so sudden traffic bursts or DoS attempts never exhaust server memory.</p>
  </div>
  <div class="attack-card">
    <h4>🔍 Deep Protocol Inspection</h4>
    <p>Decodes and validates protocols like PostgreSQL, MySQL, Redis, MongoDB, and SSH rather than treating them as blind byte streams.</p>
  </div>
  <div class="attack-card">
    <h4>🌍 Restrict by IP & Geo-Location</h4>
    <p>Allow only your team's VPN or specific countries to reach sensitive administrative and database ports using MaxMind GeoIP.</p>
  </div>
  <div class="attack-card">
    <h4>🤝 Community Threat Defense <span style="font-size: 0.8em; opacity: 0.8;">(Optional)</span></h4>
    <p>Optional native CrowdSec integration pulls community-wide IP blocklists in real time and reports local attacks back to the network.</p>
  </div>
  <div class="attack-card">
    <h4>📊 Live Alerts & Observability</h4>
    <p>Stream security events live over Server-Sent Events (SSE) or query REST metrics on port <code>:9091</code> for zero-blindspot monitoring.</p>
  </div>
</div>

---

## How It Works: The 8-Stage Pipeline

Whenever a client connects, TCP Warden passes the socket through an **8-stage security pipeline**. If a connection violates any rule, it is dropped or redirected to a high-latency tarpit before consuming backend resources:

```
[ Inbound Client Connection ]
               │
               ▼
[ Stage 1: Connection Limits ] ────► Drops if service is over capacity
               │
               ▼
[ Stage 2: Failure Tracker   ] ────► Drops or tarpits banned brute-force IPs
               │
               ▼
[ Stage 3: CrowdSec Sync (Opt) ] ────► Blocks globally known malicious IPs (if enabled)
               │
               ▼
[ Stage 4: Subnet Filtering  ] ────► Enforces allow / deny CIDR lists (e.g. VPN only)
               │
               ▼
[ Stage 5: Geo-Blocking      ] ────► Blocks traffic from restricted countries
               │
               ▼
[ Stage 6: Rate Limiting     ] ────► Throttles connection bursts per client IP
               │
               ▼
[ Stage 7: Protocol Engine   ] ────► Inspects protocol payloads & commands
               │                     (SSH, SMTP, Postgres, Redis, etc.)
               ▼
[ Stage 8: Audit Log & SSE   ] ────► Emits structured JSONL logs & live alerts
               │
               ▼
[ Forward to Upstream Server ]
```

### Pipeline Stages Explained

| Stage | Security Layer | What It Does In Plain English |
| :--- | :--- | :--- |
| **Stage 1** | **Connection Limits** | Caps total open connections to prevent memory exhaustion and denial-of-service attacks. |
| **Stage 2** | **Failure Tracker** | Automatically bans client IPs that fail authentication repeatedly within a configurable time window. |
| **Stage 3** | **CrowdSec Sync** *(Optional)* | Checks CrowdSec's local cache in real time to immediately drop IPs flagged across the global threat network (when enabled). |
| **Stage 4** | **IP Filtering** | Restricts access to trusted subnets or blocks specific bad actors (e.g., allow office IPs only). |
| **Stage 5** | **Geo-Blocking** | Blocks or allows connections based on client country code using MaxMind GeoIP databases. |
| **Stage 6** | **Rate Limiting** | Uses a token-bucket algorithm to throttle rapid connection bursts and automated scanners. |
| **Stage 7** | **Protocol Inspection** | Decodes protocol handshakes (e.g., verifying SSH protocol versions or inspecting database commands). |
| **Stage 8** | **Audit Logging & SSE** | Writes structured JSONL audit logs and streams real-time connection events over HTTP Server-Sent Events. |

---

## Supported Protocols

TCP Warden provides a high-performance Layer 4 transparent proxy core, plus on-demand modular plugins for deep protocol inspection:

- **Built-in Core Protocol (`generic` / `tcp`)**:
  - Universal Layer 4 transparent bastion for any TCP socket or proprietary protocol.
  - Token-bucket rate limiting, CIDR allow/deny filtering, GeoIP country blocking, max connection capping, tarpitting, and SQLite ban tracking without extra plugins.
- **Modular Protocol Plugins (Installed via `rwarden tcp plugins install <name>` or `AUTO_INSTALL_PLUGINS`)**:
  - **DNS & P2P Protocols**: DNS Guard (`dns` over UDP/TCP), BitTorrent Guard (`bittorrent` over TCP/DHT/uTP).
  - **Remote Access & Mail**: SSH, SMTP, POP3, IMAP, FTP, VNC.
  - **Databases & Caches**: PostgreSQL, MySQL / MariaDB, Redis / Valkey, MongoDB, Memcached.
  - **Messaging & Directory**: AMQP (RabbitMQ), MQTT, LDAP / Active Directory.
  - **Web & Game Protection**: HTTP & WebSocket Guard, TLS SNI Router, Minecraft.

---

## 30-Second Quick Start

Deploy and configure TCP Warden in three simple steps:

1. **Launch with Docker Compose**: Use host networking so TCP Warden can bind directly to your designated ports.
2. **Configure `tcp-warden.yaml`**: Define the services you want to protect and their upstream targets.
3. **Verify and Monitor**: Inspect connection health and watch live events with the CLI.

<CodeViewer :snippets="quickStartSnippets" />

---

## Explore the Documentation

| Guide | Description |
| :--- | :--- |
| 🚀 **[Getting Started & Docker](./getting-started)** | Step-by-step setup with Docker Compose, named volumes, and first-run verification. |
| ⚙️ **[Configuration Reference](./configuration)** | Complete reference for `tcp-warden.yaml`, service definitions, and rate limits. |
| 🌐 **[Network & Firewall Integrations](./network-integrations)** | Production deployment topologies, iptables/nftables PREROUTING, Docker bridge, and port-swapping. |
| 🔌 **[Modular Protocol Plugins](./plugins)** | Browse, install, and configure official plugins for Postgres, Redis, MongoDB, and more. |
| 🛠️ **[Plugin Development Guide](./plugin-development/)** | Learn how to build, test, and package custom Layer 4 protocol inspectors in Go. |
| 🛡️ **[CrowdSec Integration (Optional)](./crowdsec)** | Connect TCP Warden with CrowdSec LAPI for automated, community-driven threat remediation. |
| ❓ **[FAQ & Comparisons](./faq)** | Plain-English answers, comparisons with CrowdSec, Fail2ban, and iptables, and synergy breakdown. |
| 📡 **[Management API & SSE](./api)** | Query health status, view active bans, and stream live security alerts over HTTP. |
| 💻 **[CLI Reference](./cli)** | Full reference for `run`, `validate`, `plugins`, `ban`, and `status` commands. |
