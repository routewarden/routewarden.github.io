---
title: Redis & Valkey Protocol Guard Plugin
description: Protect Redis, Valkey, and KeyDB caches with RESP2/RESP3 command firewalling, dangerous command blocking, and brute-force ban defense.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../../.vitepress/theme/composables/useCodeSnippet'

// ─── 1. Installation Snippets ───────────────────────────────────────────────
const install_cli = buildSnippet({
  lang: 'bash',
  code: `# Install via RouteWarden CLI
rwarden tcp plugins install redis

# Or standalone binary
tcp-warden plugins install redis

# Or install via Git repository URL
rwarden tcp plugins install https://github.com/routewarden/plugins/redis`
})

const install_yaml = buildSnippet({
  lang: 'yaml',
  code: `# tcp-warden.yaml
plugins:
  redis:
    enabled: true
    source: "https://github.com/routewarden/plugins/redis"`
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
  redis_firewall:
    listen: ":6379"
    upstream: "127.0.0.1:63790"
    protocol: "redis"
    rate_limit:
      connections_per_minute: 120
      burst: 20
    max_auth_failures: 5
    ban_after_failures: 5
    ban_duration: "1h"
    plugin_config:
      blocked_commands:
        - "FLUSHALL"
        - "FLUSHDB"
        - "CONFIG"
        - "SHUTDOWN"
        - "DEBUG"
        - "KEYS"
        - "MODULE"
        - "REPLICAOF"
        - "SLAVEOF"`
})

const configSnippets = computed(() => ({
  tcp: [
    { filename: 'tcp-warden.yaml', lang: 'yaml', code: config_yaml.cleanCode, html: config_yaml.html, hasDiff: false },
  ]
}))

// ─── 3. Network Architecture Snippets ───────────────────────────────────────
const net_portswap_conf = buildSnippet({
  lang: 'plaintext',
  code: `# /etc/redis/redis.conf
# Rebind Redis to loopback on an alternate port
bind 127.0.0.1
port 63790`
})

const net_portswap_restart = buildSnippet({
  lang: 'bash',
  code: `# Restart Redis service
sudo systemctl restart redis-server`
})

const net_portswap_yaml = buildSnippet({
  lang: 'yaml',
  code: `# tcp-warden.yaml — RouteWarden listens on standard Redis port
services:
  redis_firewall:
    listen: ":6379"
    upstream: "127.0.0.1:63790"
    protocol: "redis"`
})

const net_compose = buildSnippet({
  lang: 'yaml',
  code: `services:
  routewarden:
    image: ghcr.io/routewarden/tcp-warden:latest
    ports:
      - "6379:6379"
      - "9091:9091"
    volumes:
      - ./tcp-warden.yaml:/etc/routewarden/tcp-warden.yaml:ro
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass supersecretpass
    # Do NOT publish host ports; keep internal to bridge network`
})

const netPortSwapSnippets = computed(() => ({
  tcp: [
    { filename: '1. redis.conf', lang: 'plaintext', code: net_portswap_conf.cleanCode, html: net_portswap_conf.html, hasDiff: false },
    { filename: '2. Restart Redis', lang: 'bash', code: net_portswap_restart.cleanCode, html: net_portswap_restart.html, hasDiff: false },
    { filename: '3. tcp-warden.yaml', lang: 'yaml', code: net_portswap_yaml.cleanCode, html: net_portswap_yaml.html, hasDiff: false },
  ]
}))

const netComposeSnippets = computed(() => ({
  tcp: [
    { filename: 'docker-compose.yml', lang: 'yaml', code: net_compose.cleanCode, html: net_compose.html, hasDiff: false },
  ]
}))

// ─── 4. Testing & Verification Snippets ─────────────────────────────────────
const test_legit = buildSnippet({
  lang: 'bash',
  code: `# Verify legitimate cache commands succeed
redis-cli -p 6379 SET test_key "hello"
redis-cli -p 6379 GET test_key`
})

const test_blocked = buildSnippet({
  lang: 'bash',
  code: `# Verify blocked dangerous command is intercepted
redis-cli -p 6379 FLUSHALL
# Output: (error) ERR command 'FLUSHALL' blocked by RouteWarden`
})

const test_brute = buildSnippet({
  lang: 'bash',
  code: `# Trigger auth brute-force ban
redis-cli -p 6379 -a invalidpassword PING`
})

const testSnippets = computed(() => ({
  tcp: [
    { filename: '1. Valid Commands', lang: 'bash', code: test_legit.cleanCode, html: test_legit.html, hasDiff: false },
    { filename: '2. Blocked Command', lang: 'bash', code: test_blocked.cleanCode, html: test_blocked.html, hasDiff: false },
    { filename: '3. Brute-Force Ban', lang: 'bash', code: test_brute.cleanCode, html: test_brute.html, hasDiff: false },
  ]
}))
</script>

# Redis & Valkey Protocol Guard (`redis`)

The **Redis Protocol Guard** plugin implements an in-line command firewall for Redis Serialization Protocol (RESP2 and RESP3). It parses incoming client commands, blocks destructive administrative commands (`FLUSHALL`, `CONFIG`, `SHUTDOWN`, `DEBUG`) before they reach your cache, and monitors upstream responses for authentication failures (`-WRONGPASS`, `-NOAUTH`) to ban brute-force bots.

---

## Capabilities & Threat Defense

| Threat / Attack Vector | Defense Mechanism | Action Taken |
| :--- | :--- | :--- |
| **Data Wipe & Sabotage** | Blocks destructive commands (`FLUSHALL`, `FLUSHDB`) | Drops command and returns `-ERR command blocked by RouteWarden` |
| **Remote Code Execution & Probing** | Blocks configuration manipulation (`CONFIG`, `DEBUG`, `MODULE`) | Drops command with immediate synthetic error |
| **Password Brute-Force** | Tracks upstream `-WRONGPASS` and `-NOAUTH` replies | IP banned after `max_auth_failures` threshold |
| **Connection Starvation** | Token bucket rate limiting per IP | Excess connection attempts throttled |

---

## Installation

Install the plugin via CLI or declaratively:

<CodeViewer :snippets="installSnippets" />

---

## Configuration Reference

Add a Redis guard service to `tcp-warden.yaml`:

<CodeViewer :snippets="configSnippets" />

### Configuration Options

| Field | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `listen` | `string` | `":6379"` | Local proxy listen address and port. |
| `upstream` | `string` | `"127.0.0.1:63790"` | Target Redis, Valkey, or KeyDB server address and port. |
| `protocol` | `string` | `"redis"` | Must be set to `"redis"`. |
| `max_auth_failures` | `int` | `5` | Failed `AUTH` attempts before IP is banned. |
| `ban_duration` | `string` | `"1h"` | Duration of the automated IP ban (`"30m"`, `"1h"`, `"24h"`). |
| `plugin_config.blocked_commands` | `[]string` | `["FLUSHALL", ...]` | List of uppercase command names rejected by RouteWarden. |

---

## Network & Deployment Architecture

Because Redis operates on an unprivileged port (`6379`), kernel firewall redirects (`nftables`/`iptables`) are not required. Deploy RouteWarden using either direct reverse proxying or container network isolation:

### Option A: Direct Port Swapping (Bare-Metal / VM)

Rebind Redis to loopback on an alternate port and expose RouteWarden on `:6379`:

<CodeViewer :snippets="netPortSwapSnippets" />

### Option B: Docker Compose Bridge Isolation

Publish port `6379` on RouteWarden while keeping Redis private to the internal container bridge network:

<CodeViewer :snippets="netComposeSnippets" />

---

## Testing & Verification

Verify cache operations, test blocked administrative commands, and trigger authentication failure bans:

<CodeViewer :snippets="testSnippets" />
