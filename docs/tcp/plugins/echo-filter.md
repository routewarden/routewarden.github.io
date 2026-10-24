---
title: Echo Stream Filter Plugin
description: Real-time bidirectional streaming text filter scanning client payloads for banned exploit keywords and malware signatures.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../../.vitepress/theme/composables/useCodeSnippet'

// ─── 1. Installation Snippets ───────────────────────────────────────────────
const install_cli = buildSnippet({
  lang: 'bash',
  code: `# Install via Routewarden CLI
rwarden tcp plugins install echo_filter

# Or standalone binary
tcp-warden plugins install echo_filter

# Or install via Git repository URL
rwarden tcp plugins install https://github.com/routewarden/plugins/echo_filter`
})

const install_yaml = buildSnippet({
  lang: 'yaml',
  code: `# tcp-warden.yaml
plugins:
  echo_filter:
    enabled: true
    source: "https://github.com/routewarden/plugins/echo_filter"`
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
  filter_proxy:
    listen: ":7001"
    upstream: "127.0.0.1:7000"
    protocol: "echo" # Or "echo_filter", "text_filter"
    rate_limit:
      connections_per_minute: 60
      burst: 10
    plugin_config:
      banned_keywords:
        - "EXPLOIT"
        - "DROP TABLE"
        - "MALWARE"
        - "RCE_TEST"`
})

const configSnippets = computed(() => ({
  tcp: [
    { filename: 'tcp-warden.yaml', lang: 'yaml', code: config_yaml.cleanCode, html: config_yaml.html, hasDiff: false },
  ]
}))

// ─── 3. Testing & Verification Snippets ─────────────────────────────────────
const test_listener = buildSnippet({
  lang: 'bash',
  code: `# 1. Start a mock upstream echo listener on target port
nc -l 7000`
})

const test_safe = buildSnippet({
  lang: 'bash',
  code: `# 2. Send safe text through Routewarden proxy
echo "Hello Routewarden" | nc 127.0.0.1 7001
# Upstream receives: Hello Routewarden`
})

const test_banned = buildSnippet({
  lang: 'bash',
  code: `# 3. Send banned exploit keyword
echo "Testing EXPLOIT payload" | nc 127.0.0.1 7001
# Connection immediately closed by Routewarden proxy`
})

const testSnippets = computed(() => ({
  tcp: [
    { filename: '1. Mock Upstream', lang: 'bash', code: test_listener.cleanCode, html: test_listener.html, hasDiff: false },
    { filename: '2. Safe Stream', lang: 'bash', code: test_safe.cleanCode, html: test_safe.html, hasDiff: false },
    { filename: '3. Exploit Intercept', lang: 'bash', code: test_banned.cleanCode, html: test_banned.html, hasDiff: false },
  ]
}))
</script>

# Echo Stream Filter (`echo_filter`)

The **Echo Stream Filter** plugin is a reference and demonstration plugin showcasing Routewarden's capability for deep real-time stream inspection. It scans bidirectional raw TCP byte streams for banned exploit keywords, SQL injection signatures, or malicious payloads, dropping or tarpitting connections before bad data reaches the destination.

---

## Capabilities & Threat Defense

| Threat / Attack Vector | Defense Mechanism | Action Taken |
| :--- | :--- | :--- |
| **Malicious Exploit Signatures** | Inspects raw byte chunks against `banned_keywords` | Connection immediately severed |
| **SQL Injection Probing on Raw Streams** | Detects prohibited text keywords (`DROP TABLE`) | Stream terminated |
| **Stream Floods** | Enforces rate limits per minute and burst caps | Connection throttled at the proxy layer |

---

## Installation

Install the plugin either via the command line or declaratively in your configuration file:

<CodeViewer :snippets="installSnippets" />

---

## Configuration Reference

Add an Echo Filter service to `tcp-warden.yaml`:

<CodeViewer :snippets="configSnippets" />

### Configuration Options

| Field | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `listen` | `string` | `":7001"` | Local proxy listen address and port. |
| `upstream` | `string` | `"127.0.0.1:7000"` | Target backend service address and port. |
| `protocol` | `string` | `"echo"` | Set to `"echo"`, `"echo_filter"`, or `"text_filter"`. |
| `plugin_config.banned_keywords` | `[]string` | `[...]` | List of sensitive or exploit words that trigger instant termination. |

---

## Testing & Verification

Verify filtering and keyword detection using netcat:

<CodeViewer :snippets="testSnippets" />
