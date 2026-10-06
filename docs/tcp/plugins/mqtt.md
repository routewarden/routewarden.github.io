---
title: MQTT IoT Broker Guard Plugin
description: Protect MQTT brokers (Mosquitto, EMQX) with CONNECT packet inspection, client ID allowlists/blocklists, and connection flood mitigation.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../../.vitepress/theme/composables/useCodeSnippet'

// ─── 1. Installation Snippets ───────────────────────────────────────────────
const install_cli = buildSnippet({
  lang: 'bash',
  code: `# Install using short name
tcp-warden plugins install mqtt

# Or install via Git repository URL
tcp-warden plugins install https://github.com/routewarden/plugins/mqtt`
})

const install_yaml = buildSnippet({
  lang: 'yaml',
  code: `# tcp-warden.yaml
plugins:
  mqtt:
    enabled: true
    source: "https://github.com/routewarden/plugins/mqtt"`
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
  mqtt_broker_guard:
    listen: ":1883"
    upstream: "127.0.0.1:18830"
    protocol: "mqtt"
    rate_limit:
      connections_per_minute: 60
      burst: 15
    plugin_config:
      blocked_client_id_prefixes:
        - "bot-"
        - "scanner-"
        - "shodan"
        - "censys"
      max_client_id_len: 64`
})

const configSnippets = computed(() => ({
  tcp: [
    { filename: 'tcp-warden.yaml', lang: 'yaml', code: config_yaml.cleanCode, html: config_yaml.html, hasDiff: false },
  ]
}))

// ─── 3. Network Architecture Snippets ───────────────────────────────────────
const net_proxy_yaml = buildSnippet({
  lang: 'yaml',
  code: `# tcp-warden.yaml — RouteWarden binds to standard MQTT port 1883
services:
  mqtt_broker_guard:
    listen: ":1883"
    upstream: "127.0.0.1:18830" # Or private backend "10.0.0.40:1883"
    protocol: "mqtt"`
})

const net_proxy_conf = buildSnippet({
  lang: 'plaintext',
  code: `# /etc/mosquitto/mosquitto.conf
# Bind Mosquitto to loopback on an alternate port
listener 18830 127.0.0.1`
})

const net_compose = buildSnippet({
  lang: 'yaml',
  code: `services:
  routewarden:
    image: ghcr.io/routewarden/tcp-warden:latest
    ports:
      - "1883:1883"
      - "9091:9091"
    volumes:
      - ./tcp-warden.yaml:/etc/routewarden/tcp-warden.yaml:ro
    depends_on:
      - mosquitto

  mosquitto:
    image: eclipse-mosquitto:2
    # Do NOT publish host ports; keep internal to bridge network`
})

const netProxySnippets = computed(() => ({
  tcp: [
    { filename: '1. tcp-warden.yaml', lang: 'yaml', code: net_proxy_yaml.cleanCode, html: net_proxy_yaml.html, hasDiff: false },
    { filename: '2. mosquitto.conf', lang: 'plaintext', code: net_proxy_conf.cleanCode, html: net_proxy_conf.html, hasDiff: false },
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
  code: `# Connect legitimate MQTT client through RouteWarden
mosquitto_sub -h 127.0.0.1 -p 1883 -i "device-001" -t "sensors/#" -v`
})

const test_blocked = buildSnippet({
  lang: 'bash',
  code: `# Test blocked scanner prefix (connection immediately rejected)
mosquitto_sub -h 127.0.0.1 -p 1883 -i "shodan-scanner-test" -t "sensors/#"`
})

const testSnippets = computed(() => ({
  tcp: [
    { filename: '1. Legitimate Client', lang: 'bash', code: test_legit.cleanCode, html: test_legit.html, hasDiff: false },
    { filename: '2. Scanner Rejection', lang: 'bash', code: test_blocked.cleanCode, html: test_blocked.html, hasDiff: false },
  ]
}))
</script>

# MQTT IoT Broker Guard (`mqtt`)

The **MQTT Broker Guard** plugin inspects Message Queuing Telemetry Transport protocols (MQTT 3.1.1 and MQTT 5.0). It inspects initial client `CONNECT` packets, validates Client Identifiers against prefix rules and maximum length constraints, blocks scanner botnets (e.g., Shodan and automated IoT probes), and shields brokers from connection storms.

---

## Capabilities & Threat Defense

| Threat / Attack Vector | Defense Mechanism | Action Taken |
| :--- | :--- | :--- |
| **IoT Scanner & Botnet Probing** | Filters Client Identifier against `blocked_client_id_prefixes` | Connection terminated immediately with CONNACK refusal |
| **Malformed Client ID Exploits** | Enforces `max_client_id_len` length caps; sends MQTT `CONNACK 0x02` (Identifier Rejected) before closing connection (since v3.4.0) | Client receives spec-compliant rejection; compliant clients will not retry indefinitely |
| **Broker Connection Exhaustion** | Enforces connection velocity limits and burst caps | Connection throttled at the proxy layer |

---

## Installation

Install the plugin via CLI or declaratively:

<CodeViewer :snippets="installSnippets" />

---

## Configuration Reference

Add an MQTT guard service to `tcp-warden.yaml`:

<CodeViewer :snippets="configSnippets" />

### Configuration Options

| Field | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `listen` | `string` | `":1883"` | Local proxy listen address and port. |
| `upstream` | `string` | `"127.0.0.1:18830"` | Target MQTT broker (Mosquitto, EMQX, HiveMQ) address. |
| `protocol` | `string` | `"mqtt"` | Must be set to `"mqtt"`. |
| `plugin_config.blocked_client_id_prefixes` | `[]string` | `[...]` | List of client ID prefixes blocked on connection attempt. |
| `plugin_config.max_client_id_len` | `int` | `64` | Maximum allowable length for the MQTT Client Identifier. When exceeded, a well-formed MQTT `CONNACK` response with return code `0x02` (Identifier Rejected) is sent before the connection is closed, per MQTT 3.1.1 specification (since v3.4.0). |

---

## Network & Deployment Architecture

Because MQTT operates on an unprivileged port (`1883`), packet redirection rules (`nftables`/`iptables`) are not required. Deploy RouteWarden using either direct reverse proxying or container network isolation:

### Option A: Direct Reverse Proxy (Bare-Metal / VM)

Bind RouteWarden to `:1883`, with Mosquitto listening on loopback on an alternate port or private subnet IP:

<CodeViewer :snippets="netProxySnippets" />

### Option B: Docker Compose Bridge Network

In containerized stacks, publish port `1883` on RouteWarden while keeping Mosquitto private to the internal Docker network:

<CodeViewer :snippets="netComposeSnippets" />

---

## Testing & Verification

Verify legitimate connections and test blocked scanner client prefixes:

<CodeViewer :snippets="testSnippets" />
