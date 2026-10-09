---
title: Container Discovery & Opt-In Logging — RouteWarden Dashboard
description: How RouteWarden discovers reverse proxies and daemons using pure opt-in Docker labels, extracts structured security events, and handles UDP logs.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../../.vitepress/theme/composables/useCodeSnippet'

// ─── 1. Opt-In Container Logging Snippets ──────────────────────────────────
const optin_compose = buildSnippet({
  lang: 'yaml',
  code: `services:
  traefik:
    image: traefik:latest
    container_name: traefik
    labels:
      - "routewarden.logs=true"

  caddy:
    image: caddy:2-alpine
    container_name: caddy
    labels:
      - "routewarden.logs=true"

  nginx:
    image: openresty/openresty:alpine
    container_name: nginx
    labels:
      - "routewarden.logs=true"

  tcp-warden:
    image: ghcr.io/routewarden/tcp-warden:latest
    container_name: tcp-warden
    labels:
      - "routewarden.logs=true"`,
})

const optin_cli = buildSnippet({
  lang: 'bash',
  code: `# Run Traefik with RouteWarden logging enabled
docker run -d \\
  --name my-gateway \\
  --label routewarden.logs=true \\
  -p 80:80 \\
  traefik:latest

# Run TCP Warden daemon with RouteWarden logging enabled
docker run -d \\
  --name my-tcp-warden \\
  --label routewarden.logs=true \\
  -p 2222:2222 \\
  ghcr.io/routewarden/tcp-warden:latest`,
})

const optinSnippets = computed(() => ({
  cli: [
    { filename: 'Docker Compose', lang: 'yaml', code: optin_compose.cleanCode, html: optin_compose.html, hasDiff: false },
    { filename: 'Docker CLI', lang: 'bash', code: optin_cli.cleanCode, html: optin_cli.html, hasDiff: false },
  ],
}))

// ─── 2. UDP Log Support Snippets ────────────────────────────────────────────
const udp_event_json = buildSnippet({
  lang: 'json',
  code: `{
  "timestamp": "2026-10-01T15:30:00Z",
  "plugin": "tcp-warden",
  "service": "dns",
  "protocol": "dns",
  "transport": "udp",
  "client_ip": "198.51.100.22",
  "action": "blocked",
  "reason": "blocked_domain"
}`,
})

const udp_syslog_cmd = buildSnippet({
  lang: 'bash',
  code: `# Stream raw JSON security log directly over network UDP (port 1514)
echo '{"verdict":"BLOCK","client_ip":"203.0.113.195","path":"/.env","gateway":"traefik"}' | nc -u -w0 127.0.0.1 1514`,
})

const udpSnippets = computed(() => ({
  cli: [
    { filename: 'Layer 4 UDP Event', lang: 'json', code: udp_event_json.cleanCode, html: udp_event_json.html, hasDiff: false },
    { filename: 'Send UDP Syslog', lang: 'bash', code: udp_syslog_cmd.cleanCode, html: udp_syslog_cmd.html, hasDiff: false },
  ],
}))
</script>

# Container Discovery & Opt-In Logging

RouteWarden Observability uses **Grafana Alloy** to discover Docker containers via `/var/run/docker.sock`. It operates on a **pure opt-in model** to eliminate log noise, avoid guessing based on container names, and ensure the observability stack never logs itself or unrelated containers on your host.

---

## How to Enable Logging for a Container

To send security logs from any gateway container (**Traefik**, **Caddy**, **NGINX**, or **TCP Warden**) to RouteWarden's dashboard, add the label `routewarden.logs=true` (or `routewarden=true`) to the container:

<CodeViewer :snippets="optinSnippets" />

Whenever a container carries `routewarden.logs=true`, Alloy's `discovery.relabel` pipeline attaches the container target to `loki.source.docker`, immediately streaming stdout/stderr logs into RouteWarden's normalization engine.

---

## Why Pure Opt-In?

Relying on container name patterns (e.g. `traefik*`, `nginx*`) is fragile in real-world deployments where containers are dynamically provisioned, clustered, or renamed. The pure opt-in label approach provides four distinct advantages:

1. **Zero Self-Logging**: Observability stack containers (`routewarden-loki`, `routewarden-alloy`, `routewarden-grafana`) are never scraped because they do not carry the opt-in label.
2. **Zero Host Pollution**: Other containers running on the Docker host (PostgreSQL, Redis, background workers, or unrelated web services) are completely ignored by default.
3. **No Brittle Name Pattern Matching**: Container naming conventions (`my-nginx`, `staging-proxy`, `prod-traefik`) do not matter—only containers you explicitly designate with `routewarden.logs=true` are ingested.
4. **Secondary Security Log Filter (`stage.drop`)**: Even within opted-in containers, non-security noise (such as container startup banners or plain-text health probes) that lacks structured RouteWarden security fields (`verdict` or `action`) is safely discarded before reaching Loki.

---

## UDP Log Support

RouteWarden handles UDP logs across two key dimensions:

### 1. Layer 4 UDP Protocol Security Events

**TCP Warden** guards Layer 4 UDP protocols such as:
- **DNS** on port 53 (detecting domain tunneling, high-frequency query flood, and blacklisted domains)
- **BitTorrent DHT/uTP**
- **Custom UDP services**

When a datagram is dropped, rate-limited, or blocked, TCP Warden emits a structured JSON event. Alloy automatically extracts `transport="udp"`, `protocol="dns"`, and normalizes `action="blocked"` into `verdict="BLOCK"`, seamlessly integrating Layer 4 UDP defenses into your Grafana security panels alongside Layer 7 HTTP events.

### 2. Network UDP Syslog Ingestion

Grafana Alloy listens on **UDP port 1514** (`0.0.0.0:1514/udp`) via `loki.source.syslog`. You can stream raw syslog or JSON events directly over network UDP from external proxies, routers, and firewalls into Loki:

<CodeViewer :snippets="udpSnippets" />

---

## Structured Log Normalization

When security events are ingested, Alloy's `loki.process` pipeline normalizes diverse fields across different gateways into a unified schema:

| Ingested Field | Normalized Stream Label | Description |
|:---|:---|:---|
| `verdict` / `action` | `verdict="BLOCK\|ALLOW\|THROTTLED"` | Primary filter for security dashboards |
| `type="routewarden_block"` | `verdict="BLOCK"` | Traefik HTTP security block event |
| `type="routewarden_allow"` | `verdict="ALLOW"` | Whitelisted or permitted traffic |
| `gateway` / `plugin` | `gateway="traefik\|caddy\|nginx\|tcp-warden"` | Gateway or reverse proxy identifier |
| `level` | `level="warn\|info\|error"` | Event severity |
| `protocol` / `transport` | `protocol="dns\|ssh\|http"` | Protocol and transport layer |
| `country_code` | `country_code="US\|DE\|LAN"` | GeoIP origin identifier |
| `client_ip` / `ip` | `client_ip` (Structured Metadata) | IP address for high-cardinality indexing |
| `path` | `path` (Structured Metadata) | Target URL or endpoint probed |
| `matched_pattern` | `matched_pattern` (Structured Metadata) | Specific defense signature triggered |
| `rule_id` | `rule_id` (Structured Metadata) | Unique rule identifier |

By storing high-cardinality values (`client_ip`, `path`, `matched_pattern`) as **structured metadata** rather than indexed stream labels, RouteWarden ensures Loki index performance remains blazing fast without index bloat.
