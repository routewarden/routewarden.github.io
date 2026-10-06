---
title: Minecraft Java Edition Game Guard Plugin
description: Protect Minecraft Java Edition game servers from Server List Ping (SLP) floods, malformed handshake exploits, and connection storms.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../../.vitepress/theme/composables/useCodeSnippet'

// ─── 1. Installation Snippets ───────────────────────────────────────────────
const install_cli = buildSnippet({
  lang: 'bash',
  code: `# Install using short name
tcp-warden plugins install minecraft

# Or install via Git repository URL
tcp-warden plugins install https://github.com/routewarden/plugins/minecraft`
})

const install_yaml = buildSnippet({
  lang: 'yaml',
  code: `# tcp-warden.yaml
plugins:
  minecraft:
    enabled: true
    source: "https://github.com/routewarden/plugins/minecraft"`
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
  mc_guard:
    listen: ":25565"
    upstream: "127.0.0.1:255650"
    protocol: "minecraft"
    rate_limit:
      connections_per_minute: 30
      burst: 5
    plugin_config:
      max_connections_per_sec: 10`
})

const configSnippets = computed(() => ({
  tcp: [
    { filename: 'tcp-warden.yaml', lang: 'yaml', code: config_yaml.cleanCode, html: config_yaml.html, hasDiff: false },
  ]
}))

// ─── 3. Network Architecture Snippets ───────────────────────────────────────
const net_proxy_yaml = buildSnippet({
  lang: 'yaml',
  code: `# tcp-warden.yaml — RouteWarden binds to standard Minecraft port 25565
services:
  mc_guard:
    listen: ":25565"
    upstream: "127.0.0.1:255650" # Or private host "10.0.0.60:25565"
    protocol: "minecraft"`
})

const net_proxy_prop = buildSnippet({
  lang: 'plaintext',
  code: `# server.properties
# Rebind Paper / Purpur / Spigot to loopback on an alternate port
server-ip=127.0.0.1
server-port=255650`
})

const net_compose = buildSnippet({
  lang: 'yaml',
  code: `services:
  routewarden:
    image: ghcr.io/routewarden/tcp-warden:latest
    ports:
      - "25565:25565"
      - "9091:9091"
    volumes:
      - ./tcp-warden.yaml:/etc/routewarden/tcp-warden.yaml:ro
    depends_on:
      - paper

  paper:
    image: itzg/minecraft-server:latest
    environment:
      EULA: "TRUE"
      TYPE: "PAPER"
    # Do NOT publish host port 25565 directly`
})

const netProxySnippets = computed(() => ({
  tcp: [
    { filename: '1. tcp-warden.yaml', lang: 'yaml', code: net_proxy_yaml.cleanCode, html: net_proxy_yaml.html, hasDiff: false },
    { filename: '2. server.properties', lang: 'plaintext', code: net_proxy_prop.cleanCode, html: net_proxy_prop.html, hasDiff: false },
  ]
}))

const netComposeSnippets = computed(() => ({
  tcp: [
    { filename: 'docker-compose.yml', lang: 'yaml', code: net_compose.cleanCode, html: net_compose.html, hasDiff: false },
  ]
}))

// ─── 4. Testing & Verification Snippets ─────────────────────────────────────
const test_slp = buildSnippet({
  lang: 'bash',
  code: `# Query server status and ping through RouteWarden
mcstatus 127.0.0.1:25565 status`
})

const testSnippets = computed(() => ({
  tcp: [
    { filename: 'SLP Status Ping', lang: 'bash', code: test_slp.cleanCode, html: test_slp.html, hasDiff: false },
  ]
}))
</script>

# Minecraft Game Guard (`minecraft`)

The **Minecraft Game Guard** plugin inspects Minecraft Java Edition protocol handshakes and Server List Ping (SLP) frames. It mitigates SLP ping floods, validates protocol version identifiers, drops malformed handshake packets before they hit Netty network threads, and enforces strict rate limits to protect server tick rates (TPS).

---

## Capabilities & Threat Defense

| Threat / Attack Vector | Defense Mechanism | Action Taken |
| :--- | :--- | :--- |
| **Server List Ping (SLP) Floods** | Inspects SLP request intent (status vs login) | Excess status pings throttled per client IP |
| **Malformed Handshake Exploits** | Validates VarInt framing and packet boundaries | Malformed packets dropped at the proxy layer |
| **Connection Table Exhaustion** | Enforces rate limits per minute and burst caps | Spammed connections dropped before reaching Paper/Spigot |
| **TCP Fragmentation Bypass** | Stream accumulation loop ensures complete handshake is buffered before inspection (since v3.4.0) | Fragmented multi-segment handshakes are fully reassembled before `blocked_protocol_versions` is evaluated |
| **Non-Handshake Packet Spoofing** | Packet ID `!= 0` detected and rejected immediately (since v3.4.0) | Non-handshake packets dropped before upstream forwarding |

---

## Installation

Install the plugin via CLI or declaratively:

<CodeViewer :snippets="installSnippets" />

---

## Configuration Reference

Add a Minecraft guard service to `tcp-warden.yaml`:

<CodeViewer :snippets="configSnippets" />

### Configuration Options

| Field | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `listen` | `string` | `":25565"` | Local proxy listen address and port. |
| `upstream` | `string` | `"127.0.0.1:255650"` | Target Minecraft game server address and port. |
| `protocol` | `string` | `"minecraft"` | Must be set to `"minecraft"` or `"mc"`. |
| `plugin_config.max_connections_per_sec` | `int` | `10` | Maximum new connections per second permitted per client IP. |
| `plugin_config.blocked_protocol_versions` | `[]int` | `[]` | List of Minecraft Java Edition protocol version integers to block (e.g. `[47]` for 1.8, `[340]` for 1.12.2, `[760]` for 1.19.2). Connections from clients advertising a blocked version are rejected at the handshake layer. Version inspection is robust against TCP segment fragmentation (since v3.4.0). |

---

## Network & Deployment Architecture

Because Minecraft Java Edition operates on an unprivileged port (`25565`), firewall redirects (`nftables`/`iptables`) are not required. Deploy RouteWarden using either direct reverse proxying or container isolation:

### Option A: Direct Port Swapping (Bare-Metal / VM)

Keep Paper/Purpur listening on loopback on an alternate port, and expose RouteWarden on standard port `:25565`:

<CodeViewer :snippets="netProxySnippets" />

### Option B: Docker Compose Bridge Network

In container stacks, publish port `25565` on RouteWarden while keeping the game server container private:

<CodeViewer :snippets="netComposeSnippets" />

---

## Testing & Verification

Query server latency and status using `mcstatus`:

<CodeViewer :snippets="testSnippets" />
