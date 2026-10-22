---
title: MongoDB Wire Protocol Guard Plugin
description: Protect MongoDB clusters with OP_MSG wire protocol inspection, destructive command blocking, and automated auth brute-force defense.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../../.vitepress/theme/composables/useCodeSnippet'

// ─── 1. Installation Snippets ───────────────────────────────────────────────
const install_cli = buildSnippet({
  lang: 'bash',
  code: `# Install via RouteWarden CLI
rwarden tcp plugins install mongodb

# Or standalone binary
tcp-warden plugins install mongodb

# Or install via Git repository URL
rwarden tcp plugins install https://github.com/routewarden/plugins/mongodb`
})

const install_yaml = buildSnippet({
  lang: 'yaml',
  code: `# tcp-warden.yaml
plugins:
  mongodb:
    enabled: true
    source: "https://github.com/routewarden/plugins/mongodb"`
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
  mongo_bastion:
    listen: ":27017"
    upstream: "127.0.0.1:270170"
    protocol: "mongodb"
    rate_limit:
      connections_per_minute: 60
      burst: 10
    max_auth_failures: 3
    ban_after_failures: 3
    ban_duration: "2h"
    plugin_config:
      blocked_ops:
        - "dropDatabase"
        - "drop"
        - "shutdown"
        - "repairDatabase"`
})

const configSnippets = computed(() => ({
  tcp: [
    { filename: 'tcp-warden.yaml', lang: 'yaml', code: config_yaml.cleanCode, html: config_yaml.html, hasDiff: false },
  ]
}))

// ─── 3. Network Architecture Snippets ───────────────────────────────────────
const net_proxy_yaml = buildSnippet({
  lang: 'yaml',
  code: `# tcp-warden.yaml — RouteWarden binds to standard MongoDB port 27017
services:
  mongo_bastion:
    listen: ":27017"
    upstream: "127.0.0.1:270170" # Or private host "10.0.0.25:27017"
    protocol: "mongodb"`
})

const net_proxy_conf = buildSnippet({
  lang: 'yaml',
  code: `# /etc/mongod.conf
# Bind mongod to loopback on an alternate port
net:
  port: 270170
  bindIp: 127.0.0.1`
})

const net_compose = buildSnippet({
  lang: 'yaml',
  code: `services:
  routewarden:
    image: ghcr.io/routewarden/tcp-warden:latest
    ports:
      - "27017:27017"
      - "9091:9091"
    volumes:
      - ./tcp-warden.yaml:/etc/routewarden/tcp-warden.yaml:ro
    depends_on:
      - mongo

  mongo:
    image: mongo:7.0
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: secretpassword
    # Do NOT publish host ports; keep internal to bridge network`
})

const netProxySnippets = computed(() => ({
  tcp: [
    { filename: '1. tcp-warden.yaml', lang: 'yaml', code: net_proxy_yaml.cleanCode, html: net_proxy_yaml.html, hasDiff: false },
    { filename: '2. mongod.conf', lang: 'yaml', code: net_proxy_conf.cleanCode, html: net_proxy_conf.html, hasDiff: false },
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
  code: `# Verify legitimate query
mongosh --port 27017 --eval "db.serverStatus()"`
})

const test_blocked = buildSnippet({
  lang: 'bash',
  code: `# Verify destructive operation block
mongosh --port 27017 --eval "db.dropDatabase()"`
})

const test_brute = buildSnippet({
  lang: 'bash',
  code: `# Simulate authentication failure with wrong credentials
mongosh --port 27017 -u admin -p wrongpassword --authenticationDatabase admin`
})

const testSnippets = computed(() => ({
  tcp: [
    { filename: '1. Legitimate Query', lang: 'bash', code: test_legit.cleanCode, html: test_legit.html, hasDiff: false },
    { filename: '2. Blocked Operation', lang: 'bash', code: test_blocked.cleanCode, html: test_blocked.html, hasDiff: false },
    { filename: '3. Failed Auth', lang: 'bash', code: test_brute.cleanCode, html: test_brute.html, hasDiff: false },
  ]
}))
</script>

# MongoDB Wire Protocol Guard (`mongodb`)

The **MongoDB Protocol Guard** plugin intercepts native MongoDB wire protocol messages (`OP_MSG` and legacy `OP_QUERY`). It enforces command policy restrictions directly on the wire, blocking catastrophic commands (`dropDatabase`, `drop`, `shutdown`) and tracking authentication error responses (error code `18` `AuthenticationFailed`) to eliminate credential brute-forcing attacks.

---

## Capabilities & Threat Defense

| Threat / Attack Vector | Defense Mechanism | Action Taken |
| :--- | :--- | :--- |
| **Accidental or Malicious Database Drop** | Filters wire commands against `blocked_ops` | Command rejected with synthetic error before reaching `mongod` |
| **Credential Stuffing** | Tracks `AuthenticationFailed` (code 18) responses | Abusive IP banned after threshold |
| **Server Shutdown Exploits** | Blocks `shutdown` administrative command | Blocked at proxy layer |
| **Connection Flooding** | Enforces IP connection velocity limits | Excess connection attempts dropped |

---

## Installation

Install the plugin via CLI or declaratively:

<CodeViewer :snippets="installSnippets" />

---

## Configuration Reference

Add a MongoDB guard service to `tcp-warden.yaml`:

<CodeViewer :snippets="configSnippets" />

### Configuration Options

| Field | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `listen` | `string` | `":27017"` | Local proxy listen address and port. |
| `upstream` | `string` | `"127.0.0.1:270170"` | Target `mongod` instance address and port. |
| `protocol` | `string` | `"mongodb"` | Must be set to `"mongodb"` or `"mongo"`. |
| `max_auth_failures` | `int` | `3` | Number of failed authentication attempts before banning. |
| `ban_duration` | `string` | `"2h"` | Ban duration for offending IPs (`"30m"`, `"2h"`, `"24h"`). |
| `plugin_config.blocked_ops` | `[]string` | `["dropDatabase", ...]` | MongoDB operation names blocked by the wire filter. |

---

## Network & Deployment Architecture

Because MongoDB operates on an unprivileged port (`27017`), firewall redirection rules (`nftables`/`iptables`) are not required. Deploy RouteWarden using either direct reverse proxying or container network isolation:

### Option A: Direct Reverse Proxy (Bare-Metal / VM)

Bind RouteWarden to `:27017`, and run `mongod` on an internal loopback port or private subnet IP:

<CodeViewer :snippets="netProxySnippets" />

### Option B: Docker Compose Network Isolation

Publish port `27017` on RouteWarden while keeping the MongoDB container completely private:

<CodeViewer :snippets="netComposeSnippets" />

---

## Testing & Verification

Verify queries, test blocked operations, and simulate authentication failures:

<CodeViewer :snippets="testSnippets" />
