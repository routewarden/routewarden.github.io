---
title: PostgreSQL Protocol Guard Plugin
description: Protect PostgreSQL database servers with wire-protocol inspection, SSL negotiation passthrough, and automated bans on SQLSTATE 28P01 authentication failures.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../../.vitepress/theme/composables/useCodeSnippet'

// ─── 1. Installation Snippets ───────────────────────────────────────────────
const install_cli = buildSnippet({
  lang: 'bash',
  code: `# Install via RouteWarden CLI
rwarden tcp plugins install postgres

# Or standalone binary
tcp-warden plugins install postgres

# Or install via Git repository URL
rwarden tcp plugins install https://github.com/routewarden/plugins/postgres`
})

const install_yaml = buildSnippet({
  lang: 'yaml',
  code: `# tcp-warden.yaml
plugins:
  postgres:
    enabled: true
    source: "https://github.com/routewarden/plugins/postgres"`
})

const installSnippets = computed(() => ({
  tcp: [
    { filename: 'RouteWarden CLI', lang: 'bash', code: install_cli.cleanCode, html: install_cli.html, hasDiff: false },
    { filename: 'tcp-warden.yaml', lang: 'yaml', code: install_yaml.cleanCode, html: install_yaml.html, hasDiff: false },
  ]
}))

// ─── 2. Configuration Snippets ──────────────────────────────────────────────
const config_yaml = buildSnippet({
  lang: 'yaml',
  code: `services:
  pg_bastion:
    listen: ":5432"
    upstream: "127.0.0.1:54320"
    protocol: "postgres"
    rate_limit:
      connections_per_minute: 60
      burst: 15
    max_auth_failures: 3
    ban_after_failures: 3
    ban_duration: "4h"
    plugin_config:
      max_auth_failures: 3`
})

const configSnippets = computed(() => ({
  tcp: [
    { filename: 'tcp-warden.yaml', lang: 'yaml', code: config_yaml.cleanCode, html: config_yaml.html, hasDiff: false },
  ]
}))

// ─── 3. Network Architecture Snippets ───────────────────────────────────────
const net_proxy_yaml = buildSnippet({
  lang: 'yaml',
  code: `# tcp-warden.yaml — RouteWarden binds to standard port 5432
services:
  pg_bastion:
    listen: ":5432"
    upstream: "127.0.0.1:54320" # Or private backend "10.0.0.15:5432"
    protocol: "postgres"`
})

const net_proxy_conf = buildSnippet({
  lang: 'plaintext',
  code: `# /etc/postgresql/16/main/postgresql.conf
# Bind Postgres to loopback on an alternate port
listen_addresses = '127.0.0.1'
port = 54320`
})

const net_compose = buildSnippet({
  lang: 'yaml',
  code: `services:
  routewarden:
    image: ghcr.io/routewarden/tcp-warden:latest
    ports:
      - "5432:5432"
      - "9091:9091"
    volumes:
      - ./tcp-warden.yaml:/etc/routewarden/tcp-warden.yaml:ro
    depends_on:
      - db

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: supersecretpassword
    # Do NOT publish host ports; keep internal to bridge network`
})

const netProxySnippets = computed(() => ({
  tcp: [
    { filename: '1. tcp-warden.yaml', lang: 'yaml', code: net_proxy_yaml.cleanCode, html: net_proxy_yaml.html, hasDiff: false },
    { filename: '2. postgresql.conf', lang: 'plaintext', code: net_proxy_conf.cleanCode, html: net_proxy_conf.html, hasDiff: false },
  ]
}))

const netComposeSnippets = computed(() => ({
  tcp: [
    { filename: 'docker-compose.yml', lang: 'yaml', code: net_compose.cleanCode, html: net_compose.html, hasDiff: false },
  ]
}))

// ─── 4. Testing & Verification Snippets ─────────────────────────────────────
const test_valid = buildSnippet({
  lang: 'bash',
  code: `# Test valid database connection through RouteWarden
psql -h 127.0.0.1 -p 5432 -U postgres -d postgres`
})

const test_wrong = buildSnippet({
  lang: 'bash',
  code: `# Simulate authentication failure with incorrect credentials
PGPASSWORD="wrongpassword" psql -h 127.0.0.1 -p 5432 -U postgres -d postgres`
})

const test_bans = buildSnippet({
  lang: 'bash',
  code: `# Query active bans via RouteWarden API
curl -s http://127.0.0.1:9091/api/v1/bans | jq .`
})

const testSnippets = computed(() => ({
  tcp: [
    { filename: '1. Valid Login', lang: 'bash', code: test_valid.cleanCode, html: test_valid.html, hasDiff: false },
    { filename: '2. Failed Attempt', lang: 'bash', code: test_wrong.cleanCode, html: test_wrong.html, hasDiff: false },
    { filename: '3. Check Ban Status', lang: 'bash', code: test_bans.cleanCode, html: test_bans.html, hasDiff: false },
  ]
}))
</script>

# PostgreSQL Protocol Guard (`postgres`)

The **PostgreSQL Protocol Guard** plugin inspects native PostgreSQL frontend/backend wire protocol traffic (PostgreSQL 3.0 protocol). It parses frontend startup packets, transparently negotiates SSL handshakes (`SSLRequest`), and inspects backend error responses for SQLSTATE `28P01` (`password authentication failed`) to automatically ban credential stuffing bots before they saturate database connection pools.

---

## Capabilities & Threat Defense

| Threat / Attack Vector | Defense Mechanism | Action Taken |
| :--- | :--- | :--- |
| **Credential Stuffing & Brute-Force** | Intercepts Backend Error Packet (`E`) with SQLSTATE `28P01` | IP banned after `max_auth_failures` threshold |
| **Connection Starvation Attacks** | Enforces connection rate limits and burst caps | Excess connections throttled or dropped |
| **Insecure Connection Probes** | Handles native `SSLRequest` negotiation | Pass-through or enforcement based on config |
| **Connection Leaks** | Transparent full-duplex socket forwarding | Cleans up socket handles immediately on termination |

---

## Installation

Install the plugin via CLI or declaratively:

<CodeViewer :snippets="installSnippets" />

---

## Configuration Reference

Add a PostgreSQL guard service to `tcp-warden.yaml`:

<CodeViewer :snippets="configSnippets" />

### Configuration Options

| Field | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `listen` | `string` | `":5432"` | Local proxy listen address and port. |
| `upstream` | `string` | `"127.0.0.1:54320"` | Target PostgreSQL server address and port. |
| `protocol` | `string` | `"postgres"` | Must be set to `"postgres"` or `"postgresql"`. |
| `max_auth_failures` | `int` | `3` | Failed login attempts before the client IP is banned. |
| `ban_duration` | `string` | `"4h"` | Ban duration for abusive client IPs (`"1h"`, `"4h"`, `"24h"`). |

---

## Network & Deployment Architecture

Because PostgreSQL operates on an unprivileged port (`5432`), firewall redirects (`nftables`/`iptables`) are unnecessary. You can deploy RouteWarden as a direct reverse proxy or via container networking:

### Option A: Direct Reverse Proxy (Bare-Metal / VM)

Bind RouteWarden directly to standard port `5432`, and run PostgreSQL on an internal loopback port or private subnet IP:

<CodeViewer :snippets="netProxySnippets" />

### Option B: Docker Compose Bridge Network

In containerized stacks, expose only RouteWarden on the host, keeping the PostgreSQL container private within the internal Docker bridge network:

<CodeViewer :snippets="netComposeSnippets" />

---

## Testing & Verification

Verify query execution, credential failure detection, and API ban status:

<CodeViewer :snippets="testSnippets" />
