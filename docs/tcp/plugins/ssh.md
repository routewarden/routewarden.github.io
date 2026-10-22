---
title: SSH Protocol Guard Plugin
description: Protect OpenSSH servers with protocol banner validation, SSH-1 rejection, and automatic banning on SSH_MSG_USERAUTH_FAILURE brute-force attempts.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../../.vitepress/theme/composables/useCodeSnippet'

// ─── 1. Installation Snippets ───────────────────────────────────────────────
const install_cli = buildSnippet({
  lang: 'bash',
  code: `# Install via RouteWarden CLI
rwarden tcp plugins install ssh

# Or standalone binary
tcp-warden plugins install ssh

# Or install via Git repository URL
rwarden tcp plugins install https://github.com/routewarden/plugins/ssh`
})

const install_yaml = buildSnippet({
  lang: 'yaml',
  code: `# tcp-warden.yaml
plugins:
  ssh:
    enabled: true
    source: "https://github.com/routewarden/plugins/ssh"`
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
  ssh_bastion:
    listen: ":2222"
    upstream: "127.0.0.1:22"
    protocol: "ssh"
    rate_limit:
      connections_per_minute: 20
      burst: 5
    max_auth_failures: 3
    ban_after_failures: 3
    ban_duration: "2h"
    plugin_config:
      banner: "RouteWarden SSH Guard"
      max_auth_tries: 3`
})

const configSnippets = computed(() => ({
  tcp: [
    { filename: 'tcp-warden.yaml', lang: 'yaml', code: config_yaml.cleanCode, html: config_yaml.html, hasDiff: false },
  ]
}))

// ─── 3. Network Architecture Snippets ───────────────────────────────────────
const net_nftables = buildSnippet({
  lang: 'bash',
  code: `# 1. Create RouteWarden NAT table
sudo nft add table ip routewarden_nat

# 2. Add prerouting hook
sudo nft add chain ip routewarden_nat prerouting '{ type nat hook prerouting priority dstnat; policy accept; }'

# 3. Redirect external port 22 to RouteWarden port 2222
sudo nft add rule ip routewarden_nat prerouting iifname "eth0" tcp dport 22 redirect to :2222`
})

const net_iptables = buildSnippet({
  lang: 'bash',
  code: `# 1. Redirect incoming external port 22 to RouteWarden port 2222
sudo iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 22 -j REDIRECT --to-port 2222

# 2. Persist rules across reboots (Debian/Ubuntu)
sudo netfilter-persistent save`
})

const net_portswap_sshd = buildSnippet({
  lang: 'plaintext',
  code: `# /etc/ssh/sshd_config
Port 22222
ListenAddress 127.0.0.1`
})

const net_portswap_restart = buildSnippet({
  lang: 'bash',
  code: `# Restart OpenSSH daemon
sudo systemctl restart sshd`
})

const net_portswap_yaml = buildSnippet({
  lang: 'yaml',
  code: `# tcp-warden.yaml
services:
  ssh_bastion:
    listen: ":22"
    upstream: "127.0.0.1:22222"
    protocol: "ssh"`
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
      - "22:2222"   # Map host SSH port 22 to RouteWarden port 2222
      - "9091:9091" # Management API
    volumes:
      - ./tcp-warden.yaml:/etc/routewarden/tcp-warden.yaml:ro
    depends_on:
      - ssh-server

  ssh-server:
    image: linuxserver/openssh-server:latest
    environment:
      - PUID=1000
      - PGID=1000
      - PASSWORD_ACCESS=true
      - USER_PASSWORD=securepassword
      - USER_NAME=sshuser
    # Do NOT publish host ports; keep internal to bridge network`
})

const netPortSwapSnippets = computed(() => ({
  tcp: [
    { filename: '1. sshd_config', lang: 'plaintext', code: net_portswap_sshd.cleanCode, html: net_portswap_sshd.html, hasDiff: false },
    { filename: '2. Restart sshd', lang: 'bash', code: net_portswap_restart.cleanCode, html: net_portswap_restart.html, hasDiff: false },
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
  code: `# Connect legitimately to OpenSSH through RouteWarden
ssh -p 2222 user@127.0.0.1`
})

const test_brute = buildSnippet({
  lang: 'bash',
  code: `# Trigger authentication failure detection (attempt 3 times)
ssh -p 2222 -o PreferredAuthentications=password -o PubkeyAuthentication=no wronguser@127.0.0.1`
})

const test_bans = buildSnippet({
  lang: 'bash',
  code: `# Inspect active IP bans via RouteWarden API
curl -s http://127.0.0.1:9091/api/v1/bans | jq .`
})

const testSnippets = computed(() => ({
  tcp: [
    { filename: '1. Legitimate Access', lang: 'bash', code: test_legit.cleanCode, html: test_legit.html, hasDiff: false },
    { filename: '2. Brute-Force Trigger', lang: 'bash', code: test_brute.cleanCode, html: test_brute.html, hasDiff: false },
    { filename: '3. Check Ban Status', lang: 'bash', code: test_bans.cleanCode, html: test_bans.html, hasDiff: false },
  ]
}))
</script>

# SSH Protocol Guard (`ssh`)

The **SSH Protocol Guard** plugin extends RouteWarden with deep Layer 4 and Layer 7 inspection for Secure Shell connections (RFC 4253). It validates client identification strings, terminates outdated or vulnerable SSH-1.x clients before cryptographic key exchange, and passively monitors upstream responses for authentication failures to automatically ban dictionary brute-force bots.

---

## Capabilities & Threat Defense

| Threat / Attack Vector | Defense Mechanism | Action Taken |
| :--- | :--- | :--- |
| **SSH Dictionary Attacks** | Intercepts `SSH_MSG_USERAUTH_FAILURE` (type 51) | IP automatically banned after `max_auth_failures` |
| **Obsolete SSH-1 Clients** | Parses client identification string | Immediate disconnect with RFC-compliant error |
| **Connection Flooding** | Token bucket rate limiting | Connections delayed or dropped at proxy layer |
| **Service Probing / Scanners** | Synthetic custom protocol banner | Masks true OpenSSH daemon version |

---

## Installation

Install the plugin either via the command line or declaratively in your configuration file:

<CodeViewer :snippets="installSnippets" />

RouteWarden will verify, download, and register the plugin automatically during boot.

---

## Configuration Reference

Add an SSH guard service to `tcp-warden.yaml` under `services`:

<CodeViewer :snippets="configSnippets" />

### Configuration Options

| Field | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `listen` | `string` | `":2222"` | Local address and port for RouteWarden to bind. |
| `upstream` | `string` | `"127.0.0.1:22"` | Target OpenSSH server address and port. |
| `protocol` | `string` | `"ssh"` | Must be set to `"ssh"`. |
| `max_auth_failures` | `int` | `3` | Number of failed authentication packets (`type 51`) before banning. |
| `ban_duration` | `string` | `"2h"` | How long an offending IP address remains banned (`"30m"`, `"2h"`, `"24h"`). |
| `plugin_config.banner` | `string` | `"RouteWarden SSH Guard"` | Optional custom identification string returned during initial handshake. |
| `plugin_config.max_auth_tries` | `int` | `3` | Max auth attempts permitted per single connection. |

---

## Network & Deployment Architecture

### Option A: Kernel Firewall Redirection (nftables / iptables)

Leave OpenSSH listening on standard port `22` on `127.0.0.1`. Redirect external traffic arriving on your public interface (`eth0`) to RouteWarden port `2222`:

<CodeViewer :snippets="netFirewallSnippets" />

### Option B: Port Swapping (Native OpenSSH Config)

Bind OpenSSH to internal port `22222` on loopback, and let RouteWarden bind to `:22`:

<CodeViewer :snippets="netPortSwapSnippets" />

### Option C: Docker Compose Network Isolation

Run the SSH server inside an isolated container network, exposing port `22` only through RouteWarden:

<CodeViewer :snippets="netComposeSnippets" />

---

## Testing & Verification

Verify legitimate connections, simulate password brute-forcing, and query the active ban table:

<CodeViewer :snippets="testSnippets" />
