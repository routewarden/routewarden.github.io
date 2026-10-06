---
title: Memcached Cache Guard Plugin
description: Protect Memcached distributed memory caching systems with command filtering, administrative purge prevention, and connection velocity control.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../../.vitepress/theme/composables/useCodeSnippet'

// ─── 1. Installation Snippets ───────────────────────────────────────────────
const install_cli = buildSnippet({
  lang: 'bash',
  code: `# Install using short name
tcp-warden plugins install memcached

# Or install via Git repository URL
tcp-warden plugins install https://github.com/routewarden/plugins/memcached`
})

const install_yaml = buildSnippet({
  lang: 'yaml',
  code: `# tcp-warden.yaml
plugins:
  memcached:
    enabled: true
    source: "https://github.com/routewarden/plugins/memcached"`
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
  memcached_guard:
    listen: ":11211"
    upstream: "127.0.0.1:112110"
    protocol: "memcached"
    rate_limit:
      connections_per_minute: 120
      burst: 20
    plugin_config:
      blocked_commands:
        - "flush_all"
        - "shutdown"`
})

const configSnippets = computed(() => ({
  tcp: [
    { filename: 'tcp-warden.yaml', lang: 'yaml', code: config_yaml.cleanCode, html: config_yaml.html, hasDiff: false },
  ]
}))

// ─── 3. Network Architecture Snippets ───────────────────────────────────────
const net_portswap_conf = buildSnippet({
  lang: 'plaintext',
  code: `# /etc/memcached.conf
# Rebind Memcached to loopback on an alternate port
-l 127.0.0.1
-p 112110`
})

const net_portswap_restart = buildSnippet({
  lang: 'bash',
  code: `# Restart Memcached service
sudo systemctl restart memcached`
})

const net_portswap_yaml = buildSnippet({
  lang: 'yaml',
  code: `# tcp-warden.yaml — RouteWarden listens on standard Memcached port
services:
  memcached_guard:
    listen: ":11211"
    upstream: "127.0.0.1:112110"
    protocol: "memcached"`
})

const net_compose = buildSnippet({
  lang: 'yaml',
  code: `services:
  routewarden:
    image: ghcr.io/routewarden/tcp-warden:latest
    ports:
      - "11211:11211"
      - "9091:9091"
    volumes:
      - ./tcp-warden.yaml:/etc/routewarden/tcp-warden.yaml:ro
    depends_on:
      - memcached

  memcached:
    image: memcached:alpine
    # Do NOT publish host ports; keep internal to bridge network`
})

const netPortSwapSnippets = computed(() => ({
  tcp: [
    { filename: '1. memcached.conf', lang: 'plaintext', code: net_portswap_conf.cleanCode, html: net_portswap_conf.html, hasDiff: false },
    { filename: '2. Restart Memcached', lang: 'bash', code: net_portswap_restart.cleanCode, html: net_portswap_restart.html, hasDiff: false },
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
  code: `# Verify legitimate cache operations through RouteWarden
echo -e "set testkey 0 60 5\\r\\nhello\\r\\n" | nc 127.0.0.1 11211
# Returns: STORED
echo -e "get testkey\\r\\n" | nc 127.0.0.1 11211
# Returns: VALUE testkey 0 5 / hello / END`
})

const test_blocked = buildSnippet({
  lang: 'bash',
  code: `# Verify blocked flush_all command
echo -e "flush_all\\r\\n" | nc 127.0.0.1 11211
# Returns: CLIENT_ERROR command 'flush_all' blocked by RouteWarden`
})

const testSnippets = computed(() => ({
  tcp: [
    { filename: '1. Cache Get/Set', lang: 'bash', code: test_legit.cleanCode, html: test_legit.html, hasDiff: false },
    { filename: '2. Blocked Flush', lang: 'bash', code: test_blocked.cleanCode, html: test_blocked.html, hasDiff: false },
  ]
}))
</script>

# Memcached Cache Guard (`memcached`)

The **Memcached Cache Guard** plugin inspects both ASCII text and binary protocol commands directed at Memcached instances. It protects caching layers from accidental or malicious cache wipes (`flush_all`), blocks unauthorized server configuration manipulation, and limits connection velocity to prevent connection table exhaustion.

---

## Capabilities & Threat Defense

| Threat / Attack Vector | Defense Mechanism | Action Taken |
| :--- | :--- | :--- |
| **Complete Cache Purge (`flush_all`)** | Filters commands against `blocked_commands` | Command dropped with synthetic `CLIENT_ERROR` |
| **Server Crash & Probe Exploits** | Blocks `shutdown`, `version`, `quit` tampering | Command intercepted at the proxy layer |
| **Connection Starvation Attacks** | Enforces connection rate limits and burst caps | Connection throttled before reaching Memcached |
| **Heap Exhaustion via Oversized Objects** | Validates `bytes` field on `set`/`add`/`replace`/`append`/`prepend` against `max_value_size` (since v3.4.0) | Storage commands with negative or oversized byte declarations rejected with `CLIENT_ERROR value too large` |

---

## Installation

Install the plugin via CLI or declaratively:

<CodeViewer :snippets="installSnippets" />

---

## Configuration Reference

Add a Memcached guard service to `tcp-warden.yaml`:

<CodeViewer :snippets="configSnippets" />

### Configuration Options

| Field | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `listen` | `string` | `":11211"` | Local proxy listen address and port. |
| `upstream` | `string` | `"127.0.0.1:112110"` | Target Memcached server address and port. |
| `protocol` | `string` | `"memcached"` | Must be set to `"memcached"`. |
| `plugin_config.blocked_commands` | `[]string` | `["flush_all"]` | List of commands blocked by RouteWarden. |
| `plugin_config.max_value_size` | `int` | `1048576` | Maximum permitted `bytes` field value (in bytes) for storage commands (`set`, `add`, `replace`, `append`, `prepend`). Commands declaring a larger or negative size are rejected immediately with `CLIENT_ERROR value too large` to prevent heap exhaustion (since v3.4.0). |

---

## Network & Deployment Architecture

Because Memcached operates on an unprivileged port (`11211`), firewall redirects (`nftables`/`iptables`) are not required. Deploy RouteWarden using either direct reverse proxying or container network isolation:

### Option A: Direct Port Swapping (Bare-Metal / VM)

Rebind Memcached to loopback on an alternate port and expose RouteWarden on standard port `:11211`:

<CodeViewer :snippets="netPortSwapSnippets" />

### Option B: Docker Compose Bridge Isolation

Publish port `11211` on RouteWarden while keeping the Memcached container completely private within the container network:

<CodeViewer :snippets="netComposeSnippets" />

---

## Testing & Verification

Verify cache set/get commands and verify the `flush_all` firewall:

<CodeViewer :snippets="testSnippets" />
