---
title: FTP Control Guard Plugin
description: Protect FTP servers (vsftpd, ProFTPD) with control channel inspection, anonymous login policy enforcement, and authentication brute-force bans.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../../.vitepress/theme/composables/useCodeSnippet'

// ─── 1. Installation Snippets ───────────────────────────────────────────────
const install_cli = buildSnippet({
  lang: 'bash',
  code: `# Install using short name
tcp-warden plugins install ftp

# Or install via Git repository URL
tcp-warden plugins install https://github.com/routewarden/plugins/ftp`
})

const install_yaml = buildSnippet({
  lang: 'yaml',
  code: `# tcp-warden.yaml
plugins:
  ftp:
    enabled: true
    source: "https://github.com/routewarden/plugins/ftp"`
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
  ftp_guard:
    listen: ":2121"
    upstream: "127.0.0.1:21"
    protocol: "ftp"
    rate_limit:
      connections_per_minute: 30
      burst: 5
    max_auth_failures: 5
    ban_after_failures: 5
    ban_duration: "2h"
    plugin_config:
      allow_anonymous: false
      max_auth_failures: 5`
})

const configSnippets = computed(() => ({
  tcp: [
    { filename: 'tcp-warden.yaml', lang: 'yaml', code: config_yaml.cleanCode, html: config_yaml.html, hasDiff: false },
  ]
}))

const net_nftables = buildSnippet({
  lang: 'bash',
  code: `# Redirect external traffic destined for port 21 to RouteWarden port 2121
sudo nft add rule ip routewarden_nat prerouting iifname "eth0" tcp dport 21 redirect to :2121`
})

const net_iptables = buildSnippet({
  lang: 'bash',
  code: `# 1. Redirect incoming external port 21 to RouteWarden port 2121
sudo iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 21 -j REDIRECT --to-port 2121

# 2. Persist rules across reboots (Debian/Ubuntu)
sudo netfilter-persistent save`
})

const net_compose = buildSnippet({
  lang: 'yaml',
  code: `services:
  routewarden:
    image: ghcr.io/routewarden/tcp-warden:latest
    ports:
      - "21:2121"   # Map host FTP control port 21 to RouteWarden
      - "9091:9091" # Management API
    volumes:
      - ./tcp-warden.yaml:/etc/routewarden/tcp-warden.yaml:ro
    depends_on:
      - ftp-server

  ftp-server:
    image: fauria/vsftpd:latest
    environment:
      - FTP_USER=ftpuser
      - FTP_PASS=secretpassword
      - PASV_ENABLE=YES
    # Do NOT publish port 21 to host; keep internal to bridge network`
})

const netFirewallSnippets = computed(() => ({
  tcp: [
    { filename: 'nftables (Modern Linux)', lang: 'bash', code: net_nftables.cleanCode, html: net_nftables.html, hasDiff: false },
    { filename: 'iptables (Legacy / Cloud VMs)', lang: 'bash', code: net_iptables.cleanCode, html: net_iptables.html, hasDiff: false },
  ]
}))

const netComposeSnippets = computed(() => ({
  tcp: [
    { filename: 'docker-compose.yml', lang: 'yaml', code: net_compose.cleanCode, html: net_compose.html, hasDiff: false },
  ]
}))

// ─── 4. Testing & Verification Snippets ─────────────────────────────────────
const test_anonymous = buildSnippet({
  lang: 'ftp',
  code: `# Connect to FTP control port via standard CLI client
$ ftp -n 127.0.0.1 2121
Connected to 127.0.0.1.
220 (vsFTPd 3.0.3)
ftp> quote USER anonymous
530 Anonymous access disabled by RouteWarden
ftp> quit
221 Goodbye.`
})

const test_failed = buildSnippet({
  lang: 'ftp',
  code: `# Attempting invalid credentials
$ ftp -n 127.0.0.1 2121
Connected to 127.0.0.1.
220 (vsFTPd 3.0.3)
ftp> quote USER testuser
331 Please specify the password.
ftp> quote PASS wrongpassword
530 Login incorrect.
ftp> quit
221 Goodbye.`
})

const test_bans = buildSnippet({
  lang: 'bash',
  code: `# Check active bans after exceeding max_auth_failures (3)
curl -s http://127.0.0.1:9091/api/banlist | jq .`
})

const testSnippets = computed(() => ({
  tcp: [
    { filename: '1. Anonymous Rejection', lang: 'ftp', code: test_anonymous.cleanCode, html: test_anonymous.html, hasDiff: false },
    { filename: '2. Failed Password', lang: 'ftp', code: test_failed.cleanCode, html: test_failed.html, hasDiff: false },
    { filename: '3. Ban Status', lang: 'bash', code: test_bans.cleanCode, html: test_bans.html, hasDiff: false },
  ]
}))
</script>

# FTP Control Guard (`ftp`)

The **FTP Control Guard** plugin inspects File Transfer Protocol control connections (RFC 959). It validates command syntax, optionally restricts anonymous logins, tracks authentication failures (`530 Login incorrect`), and supports transparent `AUTH TLS` encryption handovers.

---

## Capabilities & Threat Defense

| Threat / Attack Vector | Defense Mechanism | Action Taken |
| :--- | :--- | :--- |
| **Credential Brute-Force & Spraying** | Intercepts `530 Login incorrect` response codes; enforces connection close with `421 Too many auth failures` when cap is reached (since v3.4.0) | Client IP banned after `max_auth_failures` threshold; connection terminated immediately |
| **Anonymous Login Abuse** | Intercepts `USER anonymous` / `USER ftp` | Command blocked with `530 Anonymous access disabled` |
| **Connection Flooding** | Enforces rate limits per minute and burst caps | Connection throttled at the proxy layer |
| **AUTH TLS Handover** | Detects `234 Proceed with negotiation` | Transitions to bidirectional TLS pipe |

---

## Installation

Install the plugin via CLI or declaratively:

<CodeViewer :snippets="installSnippets" />

---

## Configuration Reference

Add an FTP guard service to `tcp-warden.yaml`:

<CodeViewer :snippets="configSnippets" />

### Configuration Options

| Field | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `listen` | `string` | `":2121"` | Local proxy listen address and port. |
| `upstream` | `string` | `"127.0.0.1:21"` | Target FTP server (e.g. vsftpd) address and port. |
| `protocol` | `string` | `"ftp"` | Must be set to `"ftp"`. |
| `max_auth_failures` | `int` | `5` | Number of failed login attempts before IP is banned. Since v3.4.0 the connection is actively closed with a `421 Too many auth failures` response when the cap is reached, and individual lines from clients are bounded to prevent heap exhaustion. |
| `ban_duration` | `string` | `"2h"` | Duration of the automated IP ban (`"30m"`, `"2h"`, `"24h"`). |
| `plugin_config.allow_anonymous` | `bool` | `true` | When `false`, blocks `USER anonymous` or `USER ftp` commands. |

---

## Network & Deployment Architecture

### Option A: Kernel Firewall Redirection (nftables / iptables)

Redirect external traffic destined for port `21` to RouteWarden port `2121`:

<CodeViewer :snippets="netFirewallSnippets" />
 
> **Note on Passive FTP (PASV):** The FTP plugin inspects and protects the **control channel** (port 21). Passive data connections flow directly or via RouteWarden's generic port range listeners.

### Option B: Docker Compose Network Isolation

Run the FTP server inside an isolated container network, exposing control port `21` only through RouteWarden:

<CodeViewer :snippets="netComposeSnippets" />

---

## Testing & Verification

Verify anonymous access rejection and authentication failure tracking:

<CodeViewer :snippets="testSnippets" />
