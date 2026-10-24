---
title: VNC Remote Desktop Guard Plugin
description: Protect VNC and RFB remote desktop servers (TigerVNC, RealVNC, x11vnc) with security handshake inspection and automated brute-force bans.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../../.vitepress/theme/composables/useCodeSnippet'

// ─── 1. Installation Snippets ───────────────────────────────────────────────
const install_cli = buildSnippet({
  lang: 'bash',
  code: `# Install via Routewarden CLI
rwarden tcp plugins install vnc

# Or standalone binary
tcp-warden plugins install vnc

# Or install via Git repository URL
rwarden tcp plugins install https://github.com/routewarden/plugins/vnc`
})

const install_yaml = buildSnippet({
  lang: 'yaml',
  code: `# tcp-warden.yaml
plugins:
  vnc:
    enabled: true
    source: "https://github.com/routewarden/plugins/vnc"`
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
  vnc_bastion:
    listen: ":5900"
    upstream: "127.0.0.1:59000"
    protocol: "vnc"
    rate_limit:
      connections_per_minute: 30
      burst: 5
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
  code: `# tcp-warden.yaml — Routewarden binds to standard VNC port 5900
services:
  vnc_bastion:
    listen: ":5900"
    upstream: "127.0.0.1:59000" # Or private host "10.0.0.50:5900"
    protocol: "vnc"`
})

const net_compose = buildSnippet({
  lang: 'yaml',
  code: `services:
  routewarden:
    image: ghcr.io/routewarden/tcp-warden:latest
    ports:
      - "5900:5900"
      - "9091:9091"
    volumes:
      - ./tcp-warden.yaml:/etc/routewarden/tcp-warden.yaml:ro
    depends_on:
      - vnc-server

  vnc-server:
    image: dorowu/ubuntu-desktop-lxde-vnc
    # Do NOT publish host ports; keep internal to bridge network`
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
const test_banner = buildSnippet({
  lang: 'bash',
  code: `# Inspect RFB protocol banner through Routewarden
nc 127.0.0.1 5900
# Server returns: RFB 003.008`
})

const test_client = buildSnippet({
  lang: 'bash',
  code: `# Connect via standard VNC client
vncviewer 127.0.0.1:5900`
})

const testSnippets = computed(() => ({
  tcp: [
    { filename: '1. Banner Inspection', lang: 'bash', code: test_banner.cleanCode, html: test_banner.html, hasDiff: false },
    { filename: '2. Client Connection', lang: 'bash', code: test_client.cleanCode, html: test_client.html, hasDiff: false },
  ]
}))
</script>

# VNC Remote Desktop Guard (`vnc`)

The **VNC Remote Desktop Guard** plugin inspects Remote Framebuffer (RFB 003.003 - 003.008) protocols used by VNC servers. It parses the initial version exchange, tracks security type negotiation, and intercepts `SecurityResult` authentication failures (status `1 = failed`) to automatically ban remote desktop credential stuffers.

---

## Capabilities & Threat Defense

| Threat / Attack Vector | Defense Mechanism | Action Taken |
| :--- | :--- | :--- |
| **VNC Password Brute-Force** | Intercepts RFB `SecurityResult` failure code (`1`) | IP automatically banned after `max_auth_failures` |
| **Obsolete RFB Client Probing** | Enforces protocol version sanity checks | Incompatible clients cleanly rejected |
| **Connection Flooding** | Enforces rate limits per minute and burst caps | Connection throttled before reaching VNC server |

---

## Installation

Install the plugin via CLI or declaratively:

<CodeViewer :snippets="installSnippets" />

---

## Configuration Reference

Add a VNC guard service to `tcp-warden.yaml`:

<CodeViewer :snippets="configSnippets" />

### Configuration Options

| Field | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `listen` | `string` | `":5900"` | Local proxy listen address and port. |
| `upstream` | `string` | `"127.0.0.1:59000"` | Target VNC server address and port. |
| `protocol` | `string` | `"vnc"` | Must be set to `"vnc"` or `"rfb"`. |
| `max_auth_failures` | `int` | `3` | Number of failed authentication attempts before banning. |
| `ban_duration` | `string` | `"2h"` | Duration of the automated IP ban (`"30m"`, `"2h"`, `"24h"`). |

---

## Network & Deployment Architecture

Because VNC operates on an unprivileged port (`5900`), firewall redirects (`nftables`/`iptables`) are not required. Deploy Routewarden using direct reverse proxying or container isolation:

### Option A: Direct Port Swapping (Bare-Metal / VM)

Rebind your VNC server (e.g., `x11vnc` or `tigervnc`) to listen strictly on loopback port `59000`, and configure Routewarden `listen: ":5900"` and `upstream: "127.0.0.1:59000"`:

<CodeViewer :snippets="netProxySnippets" />

### Option B: Docker Compose Bridge Network

Publish port `5900` on Routewarden while keeping the desktop container private:

<CodeViewer :snippets="netComposeSnippets" />

---

## Testing & Verification

Verify the RFB banner and test connection via a VNC client:

<CodeViewer :snippets="testSnippets" />
