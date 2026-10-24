---
title: Generic Layer 4 Proxy & Firewall Plugin
description: Universal Layer 4 transparent security proxy with rate limiting, CIDR allow/deny filtering, geo-blocking, and tarpitting for arbitrary TCP protocols.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../../.vitepress/theme/composables/useCodeSnippet'

// ─── 1. Installation Snippets ───────────────────────────────────────────────
const install_cli = buildSnippet({
  lang: 'bash',
  code: `# Install via Routewarden CLI
rwarden tcp plugins install generic

# Or standalone binary
tcp-warden plugins install generic

# Or install via Git repository URL
rwarden tcp plugins install https://github.com/routewarden/plugins/generic`
})

const install_yaml = buildSnippet({
  lang: 'yaml',
  code: `# tcp-warden.yaml
plugins:
  generic:
    enabled: true
    source: "https://github.com/routewarden/plugins/generic"`
})

const installSnippets = computed(() => ({
  tcp: [
    { filename: 'Routewarden CLI', lang: 'bash', code: install_cli.cleanCode, html: install_cli.html, hasDiff: false },
    { filename: 'tcp-warden.yaml', lang: 'yaml', code: install_yaml.cleanCode, html: install_yaml.html, hasDiff: false },
  ]
}))

// ─── 2. Configuration Snippets ──────────────────────────────────────────────
const config_yaml = buildSnippet({
  lang: 'yaml',
  code: `services:
  custom_tcp_guard:
    listen: ":15432"
    upstream: "127.0.0.1:5432"
    protocol: "tcp" # Or "generic", "raw"
    rate_limit:
      connections_per_minute: 120
      burst: 30
    tarpit:
      enabled: false
      initial_delay: "5s"
      max_delay: "30s"
    ip_filtering:
      allowed_cidrs:
        - "10.0.0.0/8"
        - "192.168.0.0/16"
      blocked_cidrs:
        - "198.51.100.0/24"`
})

const configSnippets = computed(() => ({
  tcp: [
    { filename: 'tcp-warden.yaml', lang: 'yaml', code: config_yaml.cleanCode, html: config_yaml.html, hasDiff: false },
  ]
}))

// ─── 3. Network Architecture Snippets ───────────────────────────────────────
const net_proxy_yaml = buildSnippet({
  lang: 'yaml',
  code: `# Direct reverse proxy configuration
services:
  custom_app:
    listen: ":9000"
    upstream: "127.0.0.1:9001" # Or remote host "10.0.0.100:9000"
    protocol: "tcp"`
})

const net_compose = buildSnippet({
  lang: 'yaml',
  code: `services:
  tcp-warden:
    image: ghcr.io/routewarden/tcp-warden:latest
    container_name: tcp-warden
    network_mode: host
    restart: unless-stopped
    volumes:
      - ./tcp-warden.yaml:/etc/routewarden/tcp-warden.yaml:ro`
})

const netProxySnippets = computed(() => ({
  tcp: [
    { filename: 'tcp-warden.yaml', lang: 'yaml', code: net_proxy_yaml.cleanCode, html: net_proxy_yaml.html, hasDiff: false },
  ]
}))

const netComposeSnippets = computed(() => ({
  tcp: [
    { filename: 'docker-compose.yml', lang: 'yaml', code: net_compose.cleanCode, html: net_compose.html, hasDiff: false },
  ]
}))

// ─── 4. Testing & Verification Snippets ─────────────────────────────────────
const test_connectivity = buildSnippet({
  lang: 'bash',
  code: `# Verify connectivity through generic proxy
nc -zv 127.0.0.1 15432
# Connection to 127.0.0.1 15432 port [tcp/*] succeeded!`
})

const test_rate = buildSnippet({
  lang: 'bash',
  code: `# Test rate limiting with rapid burst
for i in {1..50}; do nc -zv 127.0.0.1 15432 & done
# Connections exceeding burst limit are rejected`
})

const testSnippets = computed(() => ({
  tcp: [
    { filename: '1. Port Check', lang: 'bash', code: test_connectivity.cleanCode, html: test_connectivity.html, hasDiff: false },
    { filename: '2. Rate Limit Burst', lang: 'bash', code: test_rate.cleanCode, html: test_rate.html, hasDiff: false },
  ]
}))
</script>

# Generic Layer 4 Proxy & Firewall (`generic`)

The **Generic Layer 4 Plugin** provides universal, protocol-agnostic TCP proxying and firewall capabilities. It protects custom services, proprietary TCP protocols, and raw sockets with high-performance connection rate limiting, CIDR allowlists and denylists, geo-IP filtering, automated tarpitting, and zero-copy byte piping.

---

## Capabilities & Threat Defense

| Threat / Attack Vector | Defense Mechanism | Action Taken |
| :--- | :--- | :--- |
| **TCP SYN Floods & Connection Spam** | Token bucket rate limiting per client IP | Excess connections throttled or dropped |
| **Port Scanners & Hostile Networks** | CIDR allowlist / denylist filtering | Unauthorized networks rejected on `Accept()` |
| **Automated Crawlers & Scrapers** | TCP Tarpitting (`tarpit`) | Holds socket open with delayed bytes to burn attacker resources |
| **Geographic Threat Actors** | Geo-IP lookup and country filtering | Non-permitted countries blocked before proxying |

---

## Installation

The `generic` protocol handler is built into Routewarden core and also available as a standalone plugin from the official repository:

<CodeViewer :snippets="installSnippets" />

---

## Configuration Reference

Add a generic TCP proxy service to `tcp-warden.yaml`:

<CodeViewer :snippets="configSnippets" />

### Configuration Options

| Field | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `listen` | `string` | Required | Local proxy listen address and port (`":15432"`). |
| `upstream` | `string` | Required | Target backend server address and port (`"127.0.0.1:5432"`). |
| `protocol` | `string` | `"tcp"` | Set to `"tcp"`, `"generic"`, or `"raw"`. |
| `rate_limit.connections_per_minute` | `int` | `0` | Max new connections allowed per minute per IP (`0` = disabled). |
| `rate_limit.burst` | `int` | `0` | Maximum burst capacity above the sustained limit. |
| `tarpit.enabled` | `bool` | `false` | When true, delays responses to suspicious clients. |
| `ip_filtering.allowed_cidrs` | `[]string` | `[]` | List of allowed IP ranges. If set, unlisted IPs are dropped. |
| `ip_filtering.blocked_cidrs` | `[]string` | `[]` | List of explicitly blocked IP ranges. |

---

## Network & Deployment Architecture

For non-privileged TCP ports (`> 1024`), Routewarden simply acts as a standard Layer 4 reverse proxy or container gateway:

### Option A: Direct Reverse Proxy

Direct clients to connect to Routewarden's listen port, which inspects and forwards traffic to the backend target:

<CodeViewer :snippets="netProxySnippets" />

### Option B: Docker Host Network Proxy

Run Routewarden in `network_mode: host` to transparently guard backends running directly on the host or inside containers:

<CodeViewer :snippets="netComposeSnippets" />

---

## Testing & Verification

Verify TCP socket reachability and rate-limiting enforcement:

<CodeViewer :snippets="testSnippets" />
