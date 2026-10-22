---
title: MySQL & MariaDB Protocol Guard Plugin
description: Protect MySQL and MariaDB databases with wire protocol parsing, handshake SSL negotiation, and automated bans on ER_ACCESS_DENIED_ERROR (1045).
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../../.vitepress/theme/composables/useCodeSnippet'

// ─── 1. Installation Snippets ───────────────────────────────────────────────
const install_cli = buildSnippet({
  lang: 'bash',
  code: `# Install via RouteWarden CLI
rwarden tcp plugins install mysql

# Or standalone binary
tcp-warden plugins install mysql

# Or install via Git repository URL
rwarden tcp plugins install https://github.com/routewarden/plugins/mysql`
})

const install_yaml = buildSnippet({
  lang: 'yaml',
  code: `# tcp-warden.yaml
plugins:
  mysql:
    enabled: true
    source: "https://github.com/routewarden/plugins/mysql"`
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
  mysql_bastion:
    listen: ":3306"
    upstream: "127.0.0.1:33060"
    protocol: "mysql"
    rate_limit:
      connections_per_minute: 60
      burst: 10
    max_auth_failures: 3
    ban_after_failures: 3
    ban_duration: "2h"
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
  code: `# tcp-warden.yaml — RouteWarden binds to standard port 3306
services:
  mysql_bastion:
    listen: ":3306"
    upstream: "127.0.0.1:33060" # Or private backend "10.0.0.20:3306"
    protocol: "mysql"`
})

const net_proxy_cnf = buildSnippet({
  lang: 'plaintext',
  code: `# /etc/mysql/mariadb.conf.d/50-server.cnf or /etc/my.cnf
# Bind MySQL to loopback on an alternate port
[mysqld]
bind-address = 127.0.0.1
port = 33060`
})

const net_compose = buildSnippet({
  lang: 'yaml',
  code: `services:
  routewarden:
    image: ghcr.io/routewarden/tcp-warden:latest
    ports:
      - "3306:3306"
      - "9091:9091"
    volumes:
      - ./tcp-warden.yaml:/etc/routewarden/tcp-warden.yaml:ro
    depends_on:
      - db

  db:
    image: mariadb:11
    environment:
      MYSQL_ROOT_PASSWORD: securepassword
    # Do NOT publish host ports; keep internal to bridge network`
})

const netProxySnippets = computed(() => ({
  tcp: [
    { filename: '1. tcp-warden.yaml', lang: 'yaml', code: net_proxy_yaml.cleanCode, html: net_proxy_yaml.html, hasDiff: false },
    { filename: '2. my.cnf', lang: 'plaintext', code: net_proxy_cnf.cleanCode, html: net_proxy_cnf.html, hasDiff: false },
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
  code: `# Verify legitimate login through RouteWarden
mysql -h 127.0.0.1 -P 3306 -u root -p`
})

const test_brute = buildSnippet({
  lang: 'bash',
  code: `# Trigger credential brute-force detection
mysql -h 127.0.0.1 -P 3306 -u root --password=invalidpass`
})

const test_bans = buildSnippet({
  lang: 'bash',
  code: `# Check ban status via RouteWarden API
curl -s http://127.0.0.1:9091/api/v1/bans | jq .`
})

const testSnippets = computed(() => ({
  tcp: [
    { filename: '1. Legitimate Login', lang: 'bash', code: test_legit.cleanCode, html: test_legit.html, hasDiff: false },
    { filename: '2. Failed Attempt', lang: 'bash', code: test_brute.cleanCode, html: test_brute.html, hasDiff: false },
    { filename: '3. Check Ban Status', lang: 'bash', code: test_bans.cleanCode, html: test_bans.html, hasDiff: false },
  ]
}))
</script>

# MySQL & MariaDB Protocol Guard (`mysql`)

The **MySQL Protocol Guard** plugin inspects MySQL and MariaDB client/server handshake packets. It monitors the initial server greeting, transparently handles SSL client requests, and checks response packets for error `0xFF` with error code `1045` (`ER_ACCESS_DENIED_ERROR`) to stop credential stuffing attacks in real time.

---

## Capabilities & Threat Defense

| Threat / Attack Vector | Defense Mechanism | Action Taken |
| :--- | :--- | :--- |
| **Credential Stuffing & Brute-Force** | Intercepts Error Packet `0xFF` code `1045` (`ER_ACCESS_DENIED_ERROR`) | IP automatically banned after `max_auth_failures` |
| **Connection Exhaustion (Too many connections)** | Enforces rate limits per minute and burst caps | Connection dropped or throttled before reaching MySQL |
| **SSL Handshake Handling** | Transparently detects SSL request packets | Seamless TLS encryption forwarding |

---

## Installation

Install the plugin via CLI or declaratively:

<CodeViewer :snippets="installSnippets" />

---

## Configuration Reference

Add a MySQL guard service to `tcp-warden.yaml`:

<CodeViewer :snippets="configSnippets" />

### Configuration Options

| Field | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `listen` | `string` | `":3306"` | Local proxy listen address and port. |
| `upstream` | `string` | `"127.0.0.1:33060"` | Target MySQL or MariaDB server address and port. |
| `protocol` | `string` | `"mysql"` | Must be set to `"mysql"` or `"mariadb"`. |
| `max_auth_failures` | `int` | `3` | Failed login attempts before the client IP is banned. |
| `ban_duration` | `string` | `"2h"` | Duration of the automated IP ban (`"30m"`, `"2h"`, `"24h"`). |

---

## Network & Deployment Architecture

Because MySQL operates on an unprivileged port (`3306`), kernel packet redirection (`nftables`/`iptables`) is not required. Deploy RouteWarden using either direct reverse proxying or container network isolation:

### Option A: Direct Reverse Proxy (Bare-Metal / VM)

Bind RouteWarden to `:3306`, with MySQL listening on loopback on an alternate port or private subnet IP:

<CodeViewer :snippets="netProxySnippets" />

### Option B: Docker Compose Bridge Isolation

In containerized environments, publish port `3306` on RouteWarden while keeping the MySQL container completely internal:

<CodeViewer :snippets="netComposeSnippets" />

---

## Testing & Verification

Verify legitimate logins, simulate credential errors, and check the ban list:

<CodeViewer :snippets="testSnippets" />
