---
title: IMAP4 Mail Guard Plugin
description: Protect IMAP mailboxes (Dovecot, Cyrus) with tag-based authentication tracking, brute-force mitigation, and STARTTLS transparent handover.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../../.vitepress/theme/composables/useCodeSnippet'

// ─── 1. Installation Snippets ───────────────────────────────────────────────
const install_cli = buildSnippet({
  lang: 'bash',
  code: `# Install using short name
tcp-warden plugins install imap

# Or install via Git repository URL
tcp-warden plugins install https://github.com/routewarden/plugins/imap`
})

const install_yaml = buildSnippet({
  lang: 'yaml',
  code: `# tcp-warden.yaml
plugins:
  imap:
    enabled: true
    source: "https://github.com/routewarden/plugins/imap"`
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
  imap_guard:
    listen: ":1143"
    upstream: "127.0.0.1:143"
    protocol: "imap"
    rate_limit:
      connections_per_minute: 20
      burst: 5
    max_auth_failures: 3
    ban_after_failures: 3
    ban_duration: "1h"
    plugin_config:
      banner: "* OK RouteWarden IMAP4rev1 Ready"`
})

const configSnippets = computed(() => ({
  tcp: [
    { filename: 'tcp-warden.yaml', lang: 'yaml', code: config_yaml.cleanCode, html: config_yaml.html, hasDiff: false },
  ]
}))

// ─── 3. Network Architecture Snippets ───────────────────────────────────────
const net_nftables = buildSnippet({
  lang: 'bash',
  code: `# Redirect incoming external traffic on port 143 to RouteWarden port 1143
sudo nft add rule ip routewarden_nat prerouting iifname "eth0" tcp dport 143 redirect to :1143`
})

const net_iptables = buildSnippet({
  lang: 'bash',
  code: `# 1. Redirect incoming external port 143 to RouteWarden port 1143
sudo iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 143 -j REDIRECT --to-port 1143

# 2. Persist rules across reboots (Debian/Ubuntu)
sudo netfilter-persistent save`
})

const net_imaps = buildSnippet({
  lang: 'yaml',
  code: `# Explicit IMAPS (port 993 over TLS)
services:
  imaps_guard:
    listen: ":9930"
    upstream: "127.0.0.1:993"
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
      - "143:1143"  # Map host IMAP port 143 to RouteWarden
      - "993:9930"  # Map host IMAPS port 993 to RouteWarden
      - "9091:9091" # Management API
    volumes:
      - ./tcp-warden.yaml:/etc/routewarden/tcp-warden.yaml:ro
    depends_on:
      - dovecot

  dovecot:
    image: mailserver/docker-mailserver:latest
    environment:
      - ENABLE_IMAP=1
    # Do NOT publish host ports (143/993); keep internal to bridge network`
})

const netImapsSnippets = computed(() => ({
  tcp: [
    { filename: 'tcp-warden.yaml (IMAPS)', lang: 'yaml', code: net_imaps.cleanCode, html: net_imaps.html, hasDiff: false },
  ]
}))

const netComposeSnippets = computed(() => ({
  tcp: [
    { filename: 'docker-compose.yml', lang: 'yaml', code: net_compose.cleanCode, html: net_compose.html, hasDiff: false },
  ]
}))

// ─── 4. Testing & Verification Snippets ─────────────────────────────────────
const test_interactive = buildSnippet({
  lang: 'imap',
  code: `# Connect via netcat
$ nc 127.0.0.1 1143
* OK Dovecot ready.
a001 LOGIN testuser wrongpassword
a001 NO [AUTHENTICATIONFAILED] Authentication failed.
a002 LOGOUT`
})

const test_netcat = buildSnippet({
  lang: 'bash',
  code: `# Connect to IMAP service using netcat
nc 127.0.0.1 1143

# Or test encrypted IMAPS / STARTTLS
openssl s_client -connect 127.0.0.1:1143 -starttls imap`
})

const test_ban = buildSnippet({
  lang: 'bash',
  code: `# Check active bans after exceeding max_auth_failures (3)
curl -s http://127.0.0.1:9091/api/banlist | jq .`
})

const testSnippets = computed(() => ({
  tcp: [
    { filename: '1. IMAP Protocol Session', lang: 'imap', code: test_interactive.cleanCode, html: test_interactive.html, hasDiff: false },
    { filename: '2. Netcat CLI', lang: 'bash', code: test_netcat.cleanCode, html: test_netcat.html, hasDiff: false },
    { filename: '3. Ban Verification', lang: 'bash', code: test_ban.cleanCode, html: test_ban.html, hasDiff: false },
  ]
}))
</script>

# IMAP4 Mail Guard (`imap`)

The **IMAP4 Mail Guard** plugin monitors Internet Message Access Protocol version 4rev1 (RFC 3501) connections. It tracks client request tags and inspects server responses to detect failed authentication exchanges (`NO` or `BAD [AUTHENTICATIONFAILED]`), automatically banning credential stuffers before mail storage engines are impacted.

---

## Capabilities & Threat Defense

| Threat / Attack Vector | Defense Mechanism | Action Taken |
| :--- | :--- | :--- |
| **Credential Stuffing & Password Spraying** | Tracks tagged `NO` / `BAD` authentication responses; enforces connection close with `* BYE Too many auth failures` when cap is reached (since v3.4.0) | Client IP banned after `max_auth_failures` threshold; connection terminated immediately |
| **Connection Exhaustion** | Enforces connection rate limits and burst caps | New connections throttled at the proxy layer |
| **STARTTLS Handover** | Detects tagged `OK Begin TLS negotiation now` | Transparently transitions to encrypted bidirectional pipe |

---

## Installation

Install the plugin via CLI or declaratively:

<CodeViewer :snippets="installSnippets" />

---

## Configuration Reference

Add an IMAP guard service to `tcp-warden.yaml`:

<CodeViewer :snippets="configSnippets" />

### Configuration Options

| Field | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `listen` | `string` | `":1143"` | Local proxy listen address and port. |
| `upstream` | `string` | `"127.0.0.1:143"` | Target IMAP server (e.g. Dovecot) address and port. |
| `protocol` | `string` | `"imap"` | Must be set to `"imap"`. |
| `max_auth_failures` | `int` | `3` | Number of failed authentication attempts before banning. Since v3.4.0 the connection is actively closed with `* BYE Too many auth failures` when the cap is reached, and scanner-style infinite retry loops are prevented. |
| `ban_duration` | `string` | `"1h"` | Duration of the automated IP ban (`"30m"`, `"1h"`, `"24h"`). |
| `plugin_config.banner` | `string` | `""` | Optional synthetic greeting banner returned to clients. |

---

## Network & Deployment Architecture

### Option A: Kernel Firewall Redirection (nftables / iptables)

Redirect incoming external traffic on port `143` to RouteWarden port `1143`:

<CodeViewer :snippets="netFirewallSnippets" />

### Option B: IMAPS Direct Proxying (Port 993)

For explicit IMAPS (IMAP over TLS), RouteWarden can operate in front of the IMAPS service:

<CodeViewer :snippets="netImapsSnippets" />

### Option C: Docker Compose Network Isolation

Run the IMAP server inside an isolated container network, exposing both IMAP (`143`) and IMAPS (`993`) services only through RouteWarden:

<CodeViewer :snippets="netComposeSnippets" />

---

## Testing & Verification

Track tagged response codes during authentication:

<CodeViewer :snippets="testSnippets" />
