---
title: Plugin Development Overview & Quick Start
description: Build, test, and integrate custom Layer 4 protocol plugins for TCP Warden.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../../.vitepress/theme/composables/useCodeSnippet'

// ─── Scaffolding Snippet ────────────────────────────────────────────────────
const scaffold_cmd = buildSnippet({
  lang: 'bash',
  code: `# Scaffold a new custom protocol inspector plugin (Unified CLI)
rwarden tcp plugins create echo_guard \\
  --protocol echo_guard \\
  --listen ":9000" \\
  --upstream "127.0.0.1:9001"

# Or using standalone binary:
# tcp-warden plugins create echo_guard --protocol echo_guard --listen ":9000" --upstream "127.0.0.1:9001"`,
})

const scaffoldSnippets = computed(() => ({
  tcp: [
    { filename: 'Terminal', lang: 'bash', code: scaffold_cmd.cleanCode, html: scaffold_cmd.html, hasDiff: false },
  ]
}))

// ─── 4-Step Validation Pipeline Snippet ─────────────────────────────────────
const pipeline_log = buildSnippet({
  lang: 'bash',
  code: `$ rwarden tcp plugins install ./echo_guard
[1/4] Validating manifest for plugin 'echo_guard'...
[2/4] Checking manifest compatibility (manifest_version 1.0.0)...
[3/4] Compiling plugin 'echo_guard'...
[4/4] Running tests for plugin 'echo_guard'...
✓ Successfully installed plugin 'echo_guard' (version 1.1.0)`,
})

const pipelineSnippets = computed(() => ({
  tcp: [
    { filename: 'Verification Pipeline', lang: 'bash', code: pipeline_log.cleanCode, html: pipeline_log.html, hasDiff: false },
  ]
}))
</script>

# Plugin Development

<p class="tagline" style="font-size: 1.25rem; color: var(--vp-c-text-2); margin-bottom: 1.5rem;">
Build, test, and package custom Layer 4 protocol inspectors for TCP Warden using Go.
</p>

TCP Warden is built on a modular plugin architecture. While the core daemon handles high-throughput Layer 4 transparent proxying, all protocol-specific inspectors (SSH, PostgreSQL, MySQL, Redis, MongoDB, SMTP, etc.) are independent plugins implementing the **RouteWarden Plugin SDK** (`github.com/routewarden/cli/proxy/plugins/sdk`).

---

## What is a TCP Warden Plugin?

Think of a plugin as a **security guard** stationed between incoming client sockets and your upstream backend servers:

1. **Protocol Handshake Inspection**: The plugin inspects bytes arriving on the TCP socket before forwarding them.
2. **Threat Mitigation**: If malicious payloads, unauthorized commands, or failed passwords are detected, the plugin rejects the connection and notifies TCP Warden to track or ban the attacker IP.
3. **Wire-Speed Forwarding**: Once the connection is verified, the plugin hands off the socket to TCP Warden's zero-copy bidirectional proxy engine.

```
[ Inbound TCP Client ] ──► [ Plugin Inspector.Run() ] ──► [ Upstream Server ]
                                     │
                  ┌──────────────────┴──────────────────┐
                  ▼                                     ▼
         ctx.OnAuthFailure()                   ctx.OnSecurityEvent()
   (Tracks failures & auto-bans)             (Emits JSONL audit log)
```

---

## 2-Minute Quick Start: Scaffolding a Plugin

The easiest way to start developing a plugin is using the built-in CLI command (`rwarden tcp plugins create` or `tcp-warden plugins create`):

<CodeViewer :snippets="scaffoldSnippets" />

This automatically scaffolds a fully functional, self-testing plugin directory:

```
echo_guard/
├── plugin.yaml          # Metadata, manifest schema, and default configuration
├── plugin.go            # Plugin lifecycle, validation, and embedded manifest
├── inspector.go         # Active wire protocol inspection and proxy loop
├── plugin_test.go       # In-memory unit tests using net.Pipe()
└── README.md            # Documentation and usage instructions
```

---

## The 4-Step Safety Verification Pipeline

Whenever a plugin is installed via `rwarden tcp plugins install <source>` (or `tcp-warden plugins install <source>`), TCP Warden automatically runs a strict **4-step safety verification pipeline** to ensure the plugin will never crash your proxy or cause concurrency deadlocks:

<CodeViewer :snippets="pipelineSnippets" />

| Step | Check Name | What It Validates |
| :--- | :--- | :--- |
| **1/4** | **Manifest Validation** | Confirms `plugin.yaml` exists, parses valid YAML, and has required fields (`name`, `version`, `manifest_version`, `protocols`). |
| **2/4** | **SDK Compatibility** | Verifies that `manifest_version` matches the supported format (`1.0.0`). |
| **3/4** | **Code Compilation** | Runs Go compiler checks to ensure there are no syntax errors, missing packages, or type mismatches. |
| **4/4** | **Test Execution** | Runs `go test -v -race -count=1 ./...`. If any unit test fails or a multithreading race condition is detected, installation is safely aborted. |

---

## Detailed Development Guides

Explore the focused deep-dive guides below to learn how to build, test, and publish your plugin:

| Guide | Description |
| :--- | :--- |
| 🔌 **[SDK Interfaces & Lifecycle](./sdk-lifecycle)** | Understanding `sdk.Plugin`, `sdk.Inspector`, `plugin.yaml`, and auth failure tracking. |
| 🧪 **[In-Memory Testing & QA](./testing)** | Testing protocol handshakes with zero open ports using `net.Pipe()` and the Go race detector. |
| 📦 **[Packaging & Publishing](./publishing)** | Local testing, Git distribution, versioning helper scripts, and the developer checklist. |
