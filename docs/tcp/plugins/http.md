---
title: HTTP & WebSocket Protocol Guard Plugin
description: Protect web services with Host header validation, User-Agent blocking, regex path scanning defense, and transparent WebSocket pass-through.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../../.vitepress/theme/composables/useCodeSnippet'

// ─── 1. Installation Snippets ───────────────────────────────────────────────
const install_cli = buildSnippet({
  lang: 'bash',
  code: `# Install via Routewarden CLI
rwarden tcp plugins install http

# Or standalone binary
tcp-warden plugins install http

# Or install via Git repository URL
rwarden tcp plugins install https://github.com/routewarden/plugins/http`
})

const install_yaml = buildSnippet({
  lang: 'yaml',
  code: `# tcp-warden.yaml
plugins:
  http:
    enabled: true
    source: "https://github.com/routewarden/plugins/http"`
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
  web_guard:
    listen: ":8081"
    upstream: "127.0.0.1:80"
    protocol: "http"
    rate_limit:
      connections_per_minute: 120
      burst: 20
    plugin_config:
      allowed_hosts:
        - "api.example.com"
        - "app.example.com"
      blocked_paths:
        - "^/admin(/.*)?$"
        - "\\.(env|git|bak|sql|config)$"
        - "/wp-admin"
      blocked_headers:
        User-Agent: "(?i)(sqlmap|nikto|acunetix|masscan|zgrab)"
        X-Forwarded-Host: ".*"`
})

const configSnippets = computed(() => ({
  tcp: [
    { filename: 'tcp-warden.yaml', lang: 'yaml', code: config_yaml.cleanCode, html: config_yaml.html, hasDiff: false },
  ]
}))

const net_nftables = buildSnippet({
  lang: 'bash',
  code: `# Redirect incoming external traffic on port 80 to Routewarden port 8081
sudo nft add rule ip routewarden_nat prerouting iifname "eth0" tcp dport 80 redirect to :8081`
})

const net_iptables = buildSnippet({
  lang: 'bash',
  code: `# 1. Redirect incoming external port 80 to Routewarden port 8081
sudo iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 80 -j REDIRECT --to-port 8081

# 2. Persist rules across reboots (Debian/Ubuntu)
sudo netfilter-persistent save`
})

const net_compose = buildSnippet({
  lang: 'yaml',
  code: `services:
  routewarden:
    image: ghcr.io/routewarden/tcp-warden:latest
    ports:
      - "80:8081"   # Map host HTTP port 80 to Routewarden
      - "443:8443"  # Map host HTTPS port 443 to Routewarden
      - "9091:9091" # Management API
    volumes:
      - ./tcp-warden.yaml:/etc/routewarden/tcp-warden.yaml:ro
    depends_on:
      - web

  web:
    image: nginx:alpine
    # Do NOT publish host ports (80/443); keep internal to bridge network`
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
const test_legit = buildSnippet({
  lang: 'bash',
  code: `# Verify legitimate HTTP request
curl -I -H "Host: api.example.com" http://127.0.0.1:8081/health
# Returns: HTTP/1.1 200 OK`
})

const test_scanner = buildSnippet({
  lang: 'bash',
  code: `# Verify scanner blocked by User-Agent regex
curl -I -A "sqlmap/1.5" http://127.0.0.1:8081/
# Returns: HTTP/1.1 403 Forbidden`
})

const test_path = buildSnippet({
  lang: 'bash',
  code: `# Verify blocked sensitive path
curl -I http://127.0.0.1:8081/.env
# Returns: HTTP/1.1 403 Forbidden`
})

const testSnippets = computed(() => ({
  tcp: [
    { filename: '1. Legitimate Request', lang: 'bash', code: test_legit.cleanCode, html: test_legit.html, hasDiff: false },
    { filename: '2. Scanner Block', lang: 'bash', code: test_scanner.cleanCode, html: test_scanner.html, hasDiff: false },
    { filename: '3. Sensitive Path Block', lang: 'bash', code: test_path.cleanCode, html: test_path.html, hasDiff: false },
  ]
}))
</script>

# HTTP & WebSocket Protocol Guard (`http`)

The **HTTP Protocol Guard** plugin provides high-performance Layer 7 request inspection for HTTP/1.x streams. It validates the Host header, filters malicious vulnerability scanners via User-Agent patterns, blocks sensitive path traversal and file probing (`.env`, `.git`, `/admin`), and seamlessly upgrades connections to full-duplex transparent proxying when WebSocket headers (`Upgrade: websocket`) are detected.

---

## Capabilities & Threat Defense

| Threat / Attack Vector | Defense Mechanism | Action Taken |
| :--- | :--- | :--- |
| **Vulnerability Scanners** | Regex matching on `User-Agent` (`sqlmap`, `nikto`, `masscan`) | Connection terminated with `403 Forbidden` |
| **Sensitive File Probing** | Regex path inspection (`\.(env|git|bak|sql)$`, `^/admin`) | Immediate `403 Forbidden` response |
| **Host Header Injection** | Host header whitelist validation | Rejection with `400 Bad Request` |
| **WebSocket Connections** | Detects `Upgrade: websocket` and `101 Switching Protocols` | Upgrades stream to zero-copy bidirectional pipe |

---

## Installation

Install the plugin via CLI or declaratively:

<CodeViewer :snippets="installSnippets" />

---

## Configuration Reference

Add an HTTP guard service to `tcp-warden.yaml`:

<CodeViewer :snippets="configSnippets" />

### Configuration Options

| Field | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `listen` | `string` | `":8081"` | Local proxy listen address and port. |
| `upstream` | `string` | `"127.0.0.1:80"` | Target HTTP server address and port. |
| `protocol` | `string` | `"http"` | Must be set to `"http"`. |
| `plugin_config.allowed_hosts` | `[]string` | `[]` | Optional list of allowed `Host` headers. If set, unlisted hosts are rejected. |
| `plugin_config.blocked_paths` | `[]string` | `[...]` | List of regular expressions matching forbidden request URIs. |
| `plugin_config.blocked_headers` | `map[string]string` | `{...}` | Map of header names to regex patterns that trigger instant rejection. |

---

## Network & Deployment Architecture

### Option A: Kernel Firewall Redirection (nftables / iptables)

Redirect incoming external traffic on port `80` to Routewarden port `8081`:

<CodeViewer :snippets="netFirewallSnippets" />

### Option B: Docker Compose Network Isolation

Run the web server inside an isolated container network, exposing web traffic (HTTP `:80` and HTTPS `:443`) only through Routewarden:

<CodeViewer :snippets="netComposeSnippets" />

---

## Testing & Verification

Verify requests, check User-Agent filtering, and test path protection:

<CodeViewer :snippets="testSnippets" />
