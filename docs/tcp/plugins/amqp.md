---
title: AMQP & RabbitMQ Guard Plugin
description: Protect RabbitMQ and AMQP 0-9-1 message brokers with connection framing inspection, virtual host access control, and authentication brute-force bans.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../../.vitepress/theme/composables/useCodeSnippet'

// ─── 1. Installation Snippets ───────────────────────────────────────────────
const install_cli = buildSnippet({
  lang: 'bash',
  code: `# Install using short name
tcp-warden plugins install amqp

# Or install via Git repository URL
tcp-warden plugins install https://github.com/routewarden/plugins/amqp`
})

const install_yaml = buildSnippet({
  lang: 'yaml',
  code: `# tcp-warden.yaml
plugins:
  amqp:
    enabled: true
    source: "https://github.com/routewarden/plugins/amqp"`
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
  rabbitmq_bastion:
    listen: ":5672"
    upstream: "127.0.0.1:56720"
    protocol: "amqp"
    rate_limit:
      connections_per_minute: 60
      burst: 10
    max_auth_failures: 3
    ban_after_failures: 3
    ban_duration: "2h"
    plugin_config:
      blocked_vhosts:
        - "internal-admin"
        - "production-critical"`
})

const configSnippets = computed(() => ({
  tcp: [
    { filename: 'tcp-warden.yaml', lang: 'yaml', code: config_yaml.cleanCode, html: config_yaml.html, hasDiff: false },
  ]
}))

// ─── 3. Network Architecture Snippets ───────────────────────────────────────
const net_proxy_yaml = buildSnippet({
  lang: 'yaml',
  code: `# tcp-warden.yaml — RouteWarden binds to standard AMQP port 5672
services:
  rabbitmq_bastion:
    listen: ":5672"
    upstream: "127.0.0.1:56720" # Or private backend "10.0.0.30:5672"
    protocol: "amqp"`
})

const net_proxy_conf = buildSnippet({
  lang: 'plaintext',
  code: `# /etc/rabbitmq/rabbitmq.conf
# Bind RabbitMQ listener to loopback on an alternate port
listeners.tcp.default = 127.0.0.1:56720`
})

const net_compose = buildSnippet({
  lang: 'yaml',
  code: `services:
  routewarden:
    image: ghcr.io/routewarden/tcp-warden:latest
    ports:
      - "5672:5672"
      - "9091:9091"
    volumes:
      - ./tcp-warden.yaml:/etc/routewarden/tcp-warden.yaml:ro
    depends_on:
      - rabbitmq

  rabbitmq:
    image: rabbitmq:3-management-alpine
    # Do NOT publish host port 5672 directly`
})

const netProxySnippets = computed(() => ({
  tcp: [
    { filename: '1. tcp-warden.yaml', lang: 'yaml', code: net_proxy_yaml.cleanCode, html: net_proxy_yaml.html, hasDiff: false },
    { filename: '2. rabbitmq.conf', lang: 'plaintext', code: net_proxy_conf.cleanCode, html: net_proxy_conf.html, hasDiff: false },
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
  code: `# Verify valid connection using amqp-declare-queue
amqp-declare-queue --url=amqp://guest:guest@127.0.0.1:5672/ -q test-queue`
})

const test_brute = buildSnippet({
  lang: 'bash',
  code: `# Trigger authentication failure ban
amqp-declare-queue --url=amqp://guest:wrongpassword@127.0.0.1:5672/ -q test-queue`
})

const test_bans = buildSnippet({
  lang: 'bash',
  code: `# Verify ban status via RouteWarden API
curl -s http://127.0.0.1:9091/api/v1/bans | jq .`
})

const testSnippets = computed(() => ({
  tcp: [
    { filename: '1. Valid Connection', lang: 'bash', code: test_valid.cleanCode, html: test_valid.html, hasDiff: false },
    { filename: '2. Failed Attempt', lang: 'bash', code: test_brute.cleanCode, html: test_brute.html, hasDiff: false },
    { filename: '3. Ban Status', lang: 'bash', code: test_bans.cleanCode, html: test_bans.html, hasDiff: false },
  ]
}))
</script>

# AMQP & RabbitMQ Guard (`amqp`)

The **AMQP Guard** plugin inspects Advanced Message Queuing Protocol (AMQP 0-9-1) connection negotiation frames. It parses client `Connection.StartOk` and `Connection.Open` requests, monitors broker `Connection.Close` frames for authentication errors (`403 ACCESS_REFUSED`, `320 CONNECTION_FORCED`), and enforces virtual host (`vhost`) access controls to safeguard RabbitMQ brokers.

---

## Capabilities & Threat Defense

| Threat / Attack Vector | Defense Mechanism | Action Taken |
| :--- | :--- | :--- |
| **Credential Stuffing & Unauthorized Access** | Detects broker `Connection.Close` with code `403` | IP banned after `max_auth_failures` threshold |
| **Unauthorized Virtual Host Scanning** | Filters `vhost` in `Connection.Open` frames; zero-length vhost normalized to `"/"` before allowlist check (since v3.4.0) | Connection dropped before broker processes request |
| **Zero-Length VHost Allowlist Bypass** | `extractVHost` treats an empty `vhost` field as the default `"/"` vhost (since v3.4.0) | Prevents evasion when the AMQP default vhost is included in an allowlist |
| **Broker Connection Exhaustion** | Enforces rate limits per minute and burst caps | Connection throttled at the proxy layer |

---

## Installation

Install the plugin via CLI or declaratively:

<CodeViewer :snippets="installSnippets" />

---

## Configuration Reference

Add an AMQP guard service to `tcp-warden.yaml`:

<CodeViewer :snippets="configSnippets" />

### Configuration Options

| Field | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `listen` | `string` | `":5672"` | Local proxy listen address and port. |
| `upstream` | `string` | `"127.0.0.1:56720"` | Target RabbitMQ server address and port. |
| `protocol` | `string` | `"amqp"` | Must be set to `"amqp"` or `"rabbitmq"`. |
| `max_auth_failures` | `int` | `3` | Failed login attempts before banning. |
| `ban_duration` | `string` | `"2h"` | Duration of the automated IP ban (`"30m"`, `"2h"`, `"24h"`). |
| `plugin_config.blocked_vhosts` | `[]string` | `[]` | List of virtual host names prohibited through this proxy interface. A zero-length vhost in the AMQP `Connection.Open` frame is normalized to `"/"` (the AMQP default vhost) before evaluation (since v3.4.0). |

---

## Network & Deployment Architecture

Because AMQP operates on an unprivileged port (`5672`), packet redirection rules (`nftables`/`iptables`) are not required. Deploy RouteWarden using either direct reverse proxying or container network isolation:

### Option A: Direct Reverse Proxy (Bare-Metal / VM)

Bind RouteWarden directly to `:5672`, with RabbitMQ listening on loopback on an alternate port or private subnet IP:

<CodeViewer :snippets="netProxySnippets" />

### Option B: Docker Compose Network Isolation

Publish port `5672` on RouteWarden while keeping the RabbitMQ container completely private:

<CodeViewer :snippets="netComposeSnippets" />

---

## Testing & Verification

Verify AMQP connections, test authentication error handling, and inspect ban tables:

<CodeViewer :snippets="testSnippets" />
