---
title: TLS SNI Router & Filter Plugin
description: Zero-decryption Layer 4 TLS ClientHello inspector extracting Server Name Indication (SNI) to allow, block, and route domains without certificates.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../../.vitepress/theme/composables/useCodeSnippet'

// ─── 1. Installation Snippets ───────────────────────────────────────────────
const install_cli = buildSnippet({
  lang: 'bash',
  code: `# Install via Routewarden CLI
rwarden tcp plugins install tls_sni

# Or standalone binary
tcp-warden plugins install tls_sni

# Or install via Git repository URL
rwarden tcp plugins install https://github.com/routewarden/plugins/tls_sni`
})

const install_yaml = buildSnippet({
  lang: 'yaml',
  code: `# tcp-warden.yaml
plugins:
  tls_sni:
    enabled: true
    source: "https://github.com/routewarden/plugins/tls_sni"`
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
  tls_proxy:
    listen: ":8443"
    upstream: "127.0.0.1:443"
    protocol: "tls"
    rate_limit:
      connections_per_minute: 120
      burst: 20
    plugin_config:
      allowed_domains:
        - "*.routewarden.io"
        - "routewarden.io"
        - "api.internal"
      blocked_domains:
        - "*.malware.example"
        - "c2.threat.org"`
})

const configSnippets = computed(() => ({
  tcp: [
    { filename: 'tcp-warden.yaml', lang: 'yaml', code: config_yaml.cleanCode, html: config_yaml.html, hasDiff: false },
  ]
}))

const net_nftables = buildSnippet({
  lang: 'bash',
  code: `# Redirect incoming external HTTPS/TLS traffic on port 443 to Routewarden port 8443
sudo nft add rule ip routewarden_nat prerouting iifname "eth0" tcp dport 443 redirect to :8443`
})

const net_iptables = buildSnippet({
  lang: 'bash',
  code: `# 1. Redirect incoming external port 443 to Routewarden port 8443
sudo iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 443 -j REDIRECT --to-port 8443

# 2. Persist rules across reboots (Debian/Ubuntu)
sudo netfilter-persistent save`
})

const net_compose = buildSnippet({
  lang: 'yaml',
  code: `services:
  routewarden:
    image: ghcr.io/routewarden/tcp-warden:latest
    ports:
      - "443:8443"  # Map host HTTPS/TLS port 443 to Routewarden
      - "9091:9091" # Management API
    volumes:
      - ./tcp-warden.yaml:/etc/routewarden/tcp-warden.yaml:ro
    depends_on:
      - web-tls

  web-tls:
    image: caddy:alpine
    # Do NOT publish host ports; Routewarden transparently routes TLS SNI upstream`
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
const test_allowed = buildSnippet({
  lang: 'bash',
  code: `# Test allowed domain through SNI proxy
curl -vk --resolve routewarden.io:8443:127.0.0.1 https://routewarden.io:8443/`
})

const test_blocked = buildSnippet({
  lang: 'bash',
  code: `# Test blocked domain (connection terminated before TLS handshake)
curl -vk --resolve malware.example:8443:127.0.0.1 https://malware.example:8443/`
})

const test_nontls = buildSnippet({
  lang: 'bash',
  code: `# Verify non-TLS plaintext payload is dropped immediately
echo "PLAIN TEXT INJECTION" | nc 127.0.0.1 8443`
})

const testSnippets = computed(() => ({
  tcp: [
    { filename: '1. Allowed Domain', lang: 'bash', code: test_allowed.cleanCode, html: test_allowed.html, hasDiff: false },
    { filename: '2. Blocked Domain', lang: 'bash', code: test_blocked.cleanCode, html: test_blocked.html, hasDiff: false },
    { filename: '3. Non-TLS Drop', lang: 'bash', code: test_nontls.cleanCode, html: test_nontls.html, hasDiff: false },
  ]
}))
</script>

# TLS SNI Router & Filter (`tls_sni`)

The **TLS SNI Plugin** extracts the Server Name Indication (SNI) extension from raw TLS `ClientHello` packets at Layer 4 without decrypting or terminating TLS certificates. This enables operators to enforce domain allowlists/blocklists, prevent malware command-and-control access, and route encrypted traffic to backends with zero cryptographic overhead and zero access to private keys.

---

## Capabilities & Threat Defense

| Threat / Attack Vector | Defense Mechanism | Action Taken |
| :--- | :--- | :--- |
| **Unauthorized Domain Probing** | Inspects TLS `ClientHello` SNI extension | Connection dropped before TLS handshake completes |
| **Malicious Outbound / C2 Connections** | Filters SNI against `blocked_domains` | Connection terminated immediately |
| **Unencrypted Traffic on TLS Port** | Validates TLS record header (`0x16 0x03`) | Non-TLS traffic immediately rejected |
| **Private Key Exposure** | Pure zero-decryption Layer 4 inspection | Never requires certificates or private keys |

---

## Installation

Install the plugin via CLI or declaratively:

<CodeViewer :snippets="installSnippets" />

---

## Configuration Reference

Add a TLS SNI guard service to `tcp-warden.yaml`:

<CodeViewer :snippets="configSnippets" />

### Configuration Options

| Field | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `listen` | `string` | `":8443"` | Local proxy listen address and port. |
| `upstream` | `string` | `"127.0.0.1:443"` | Target TLS service or downstream reverse proxy. |
| `protocol` | `string` | `"tls"` | Must be set to `"tls"`, `"tls-sni"`, or `"sni"`. |
| `plugin_config.allowed_domains` | `[]string` | `[]` | List of allowed domain patterns (supports wildcards `*.domain.com`). If empty, all unblocked domains are allowed. |
| `plugin_config.blocked_domains` | `[]string` | `[]` | List of explicitly blocked domain patterns. |

---

## Network & Deployment Architecture

### Option A: Kernel Firewall Redirection (nftables / iptables)

Redirect incoming external HTTPS/TLS traffic on port `443` to Routewarden port `8443`:

<CodeViewer :snippets="netFirewallSnippets" />

### Option B: Docker Compose Network Isolation

Route encrypted TLS traffic to an internal TLS-terminating container without exposing the backend directly:

<CodeViewer :snippets="netComposeSnippets" />

---

## Testing & Verification

Verify allowed domains, test blocked domains, and verify immediate drop of non-TLS connections:

<CodeViewer :snippets="testSnippets" />
