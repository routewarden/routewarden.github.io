---
title: POP3 Mail Guard Plugin
description: Protect POP3 mailboxes (Dovecot, Courier) with authentication brute-force defense, -ERR failure tracking, and STLS transparent handover.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../../.vitepress/theme/composables/useCodeSnippet'

// ─── 1. Installation Snippets ───────────────────────────────────────────────
const install_cli = buildSnippet({
  lang: 'bash',
  code: `# Install using short name
tcp-warden plugins install pop3

# Or install via Git repository URL
tcp-warden plugins install https://github.com/routewarden/plugins/pop3`
})

const install_yaml = buildSnippet({
  lang: 'yaml',
  code: `# tcp-warden.yaml
plugins:
  pop3:
    enabled: true
    source: "https://github.com/routewarden/plugins/pop3"`
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
  pop3_guard:
    listen: ":1110"
    upstream: "127.0.0.1:110"
    protocol: "pop3"
    rate_limit:
      connections_per_minute: 20
      burst: 5
    max_auth_failures: 3
    ban_after_failures: 3
    ban_duration: "1h"
    plugin_config:
      banner: "+OK RouteWarden POP3 Proxy Ready"`
})

const configSnippets = computed(() => ({
  tcp: [
    { filename: 'tcp-warden.yaml', lang: 'yaml', code: config_yaml.cleanCode, html: config_yaml.html, hasDiff: false },
  ]
}))

// ─── 3. Network Architecture Snippets ───────────────────────────────────────
const net_nftables = buildSnippet({
  lang: 'bash',
  code: `# Redirect incoming external traffic on port 110 to RouteWarden port 1110
sudo nft add rule ip routewarden_nat prerouting iifname "eth0" tcp dport 110 redirect to :1110`
})

const net_iptables = buildSnippet({
  lang: 'bash',
  code: `# 1. Redirect incoming external port 110 to RouteWarden port 1110
sudo iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 110 -j REDIRECT --to-port 1110

# 2. Persist rules across reboots (Debian/Ubuntu)
sudo netfilter-persistent save`
})

const net_pop3s = buildSnippet({
  lang: 'yaml',
  code: `# Explicit POP3S (port 995 over TLS)
services:
  pop3s_guard:
    listen: ":9950"
    upstream: "127.0.0.1:995"
    protocol: "generic" # L4 transparent proxy for direct TLS
    rate_limit:
      connections_per_minute: 20
      burst: 5`
})

const netFirewallSnippets = computed(() => ({
  tcp: [
    { filename: 'nftables (Modern Linux)', lang: 'bash', code: net_nftables.cleanCode, html: net_nftables.html, hasDiff: false },
    { filename: 'iptables (Legacy / Cloud VMs)', lang: 'bash', code: net_iptables.cleanCode, html: net_iptables.html, hasDiff: false },
  ]
}))

const net_compose = buildSnippet({
  lang: 'yaml',
  code: `services:
  routewarden:
    image: ghcr.io/routewarden/tcp-warden:latest
    ports:
      - "110:1110"  # Map host POP3 port 110 to RouteWarden
      - "995:9950"  # Map host POP3S port 995 to RouteWarden
      - "9091:9091" # Management API
    volumes:
      - ./tcp-warden.yaml:/etc/routewarden/tcp-warden.yaml:ro
    depends_on:
      - dovecot

  dovecot:
    image: mailserver/docker-mailserver:latest
    environment:
      - ENABLE_POP3=1
    # Do NOT publish host ports (110/995); keep internal to bridge network`
})

const netPop3sSnippets = computed(() => ({
  tcp: [
    { filename: 'tcp-warden.yaml (POP3S)', lang: 'yaml', code: net_pop3s.cleanCode, html: net_pop3s.html, hasDiff: false },
  ]
}))

const netComposeSnippets = computed(() => ({
  tcp: [
    { filename: 'docker-compose.yml', lang: 'yaml', code: net_compose.cleanCode, html: net_compose.html, hasDiff: false },
  ]
}))

// ─── 4. Testing & Verification Snippets ─────────────────────────────────────
const test_interactive = buildSnippet({
  lang: 'pop3',
  code: `# Connect via netcat
$ nc 127.0.0.1 1110
+OK Dovecot ready.
USER testuser
+OK Send password
PASS wrongpassword
-ERR [AUTH] Authentication failed.
QUIT
+OK Logging out.`
})

const test_netcat = buildSnippet({
  lang: 'bash',
  code: `# Connect to POP3 service using netcat
nc 127.0.0.1 1110

# Or test encrypted POP3S / STLS upgrade
openssl s_client -connect 127.0.0.1:1110 -starttls pop3`
})

const test_ban = buildSnippet({
  lang: 'bash',
  code: `# Check active bans after exceeding max_auth_failures (3)
curl -s http://127.0.0.1:9091/api/banlist | jq .`
})

const testSnippets = computed(() => ({
  tcp: [
    { filename: '1. POP3 Protocol Session', lang: 'pop3', code: test_interactive.cleanCode, html: test_interactive.html, hasDiff: false },
    { filename: '2. Netcat CLI', lang: 'bash', code: test_netcat.cleanCode, html: test_netcat.html, hasDiff: false },
    { filename: '3. Ban Verification', lang: 'bash', code: test_ban.cleanCode, html: test_ban.html, hasDiff: false },
  ]
}))
</script>

# POP3 Mail Guard (`pop3`)

The **POP3 Mail Guard** plugin monitors Post Office Protocol 3 (RFC 1939) client/server exchanges. It tracks authentication commands (`USER` and `PASS`) and intercepts negative server responses (`-ERR`) to ban brute-force attacks against user mailboxes while seamlessly supporting `STLS` TLS upgrades.

---

## Capabilities & Threat Defense

| Threat / Attack Vector | Defense Mechanism | Action Taken |
| :--- | :--- | :--- |
| **Mailbox Password Spraying** | Tracks `-ERR [AUTH]` responses on `PASS` commands; enforces connection close with `-ERR Too many auth failures` when cap is reached (since v3.4.0) | Client IP banned after `max_auth_failures`; connection terminated immediately |
| **Session Flooding** | Enforces connection rate limits and burst caps | New connections throttled at the proxy layer |
| **STLS TLS Handover** | Detects successful `+OK Begin TLS negotiation` | Transparently transitions to encrypted bidirectional pipe |

---

## Installation

Install the plugin via CLI or declaratively:

<CodeViewer :snippets="installSnippets" />

---

## Configuration Reference

Add a POP3 guard service to `tcp-warden.yaml`:

<CodeViewer :snippets="configSnippets" />

### Configuration Options

| Field | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `listen` | `string` | `":1110"` | Local proxy listen address and port. |
| `upstream` | `string` | `"127.0.0.1:110"` | Target POP3 server (e.g. Dovecot) address and port. |
| `protocol` | `string` | `"pop3"` | Must be set to `"pop3"`. |
| `max_auth_failures` | `int` | `3` | Failed login attempts before banning. Since v3.4.0 the connection is actively closed with `-ERR Too many auth failures` when the cap is reached, preventing brute-force tools from retrying indefinitely. |
| `ban_duration` | `string` | `"1h"` | Duration of the automated IP ban (`"30m"`, `"1h"`, `"24h"`). |
| `plugin_config.banner` | `string` | `""` | Optional synthetic greeting banner returned to clients. |

---

## Network & Deployment Architecture

### Option A: Kernel Firewall Redirection (nftables / iptables)

Redirect incoming external traffic on port `110` to RouteWarden port `1110`:

<CodeViewer :snippets="netFirewallSnippets" />

### Option B: POP3S Direct Proxying (Port 995)

For explicit POP3S (POP3 over TLS), RouteWarden can operate in front of the POP3S service:

<CodeViewer :snippets="netPop3sSnippets" />

### Option C: Docker Compose Network Isolation

Run the POP3 server inside an isolated container network, exposing both POP3 (`110`) and POP3S (`995`) services only through RouteWarden:

<CodeViewer :snippets="netComposeSnippets" />

---

## Testing & Verification

Simulate authentication failures and observe `-ERR` tracking:

<CodeViewer :snippets="testSnippets" />
