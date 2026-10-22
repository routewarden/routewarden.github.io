---
title: TCP Warden CLI Reference
description: Complete command-line interface documentation for tcp-warden subcommands and flags.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

// ─── Global Syntax ───────────────────────────────────────────────────────────
const syntax_rwarden = buildSnippet({
  lang: 'bash',
  code: `rwarden tcp [command] [flags]
rwarden status tcp
rwarden stop tcp`
})

const syntax_standalone = buildSnippet({
  lang: 'bash',
  code: `tcp-warden [command] [flags]`
})

const globalSyntaxSnippets = computed(() => ({
  tcp: [
    { filename: 'Unified CLI (rwarden tcp)', lang: 'bash', code: syntax_rwarden.cleanCode, html: syntax_rwarden.html, hasDiff: false },
    { filename: 'Standalone (tcp-warden)', lang: 'bash', code: syntax_standalone.cleanCode, html: syntax_standalone.html, hasDiff: false },
  ]
}))

// ─── run (Default) ───────────────────────────────────────────────────────────
const run_rwarden = buildSnippet({
  lang: 'bash',
  code: `# Run in foreground (auto-resolves tcp-warden.yaml)
rwarden tcp up

# Run in background daemon mode (detached)
rwarden tcp up -d

# Run with custom config file and verbose logging
rwarden tcp up -c /etc/routewarden/custom.yaml -v -d

# Reload configuration on running daemon without dropping connections (zero-downtime)
rwarden tcp reload

# Stop running background proxy daemon
rwarden tcp stop`
})

const run_standalone = buildSnippet({
  lang: 'bash',
  code: `# Run with default config (auto-resolves ./tcp-warden.yaml or /etc/routewarden/tcp-warden.yaml)
tcp-warden run

# Run with custom configuration file
tcp-warden run --config /etc/routewarden/custom.yaml`
})

const runSnippets = computed(() => ({
  tcp: [
    { filename: 'Unified CLI (rwarden tcp)', lang: 'bash', code: run_rwarden.cleanCode, html: run_rwarden.html, hasDiff: false },
    { filename: 'Standalone (tcp-warden)', lang: 'bash', code: run_standalone.cleanCode, html: run_standalone.html, hasDiff: false },
  ]
}))

// ─── validate ────────────────────────────────────────────────────────────────
const validate_rwarden = buildSnippet({
  lang: 'bash',
  code: `# Validate TCP Warden configuration YAML
rwarden tcp validate -c tcp-warden.yaml

# or universal validate
rwarden validate tcp-warden.yaml`
})

const validate_standalone = buildSnippet({
  lang: 'bash',
  code: `tcp-warden validate --config /etc/routewarden/tcp-warden.yaml`
})

const validateSnippets = computed(() => ({
  tcp: [
    { filename: 'Unified CLI (rwarden tcp)', lang: 'bash', code: validate_rwarden.cleanCode, html: validate_rwarden.html, hasDiff: false },
    { filename: 'Standalone (tcp-warden)', lang: 'bash', code: validate_standalone.cleanCode, html: validate_standalone.html, hasDiff: false },
  ]
}))

// ─── plugins list ────────────────────────────────────────────────────────────
const plugins_list_rwarden = buildSnippet({
  lang: 'bash',
  code: `rwarden tcp plugins list`
})

const plugins_list_standalone = buildSnippet({
  lang: 'bash',
  code: `tcp-warden plugins list`
})

const pluginsListSnippets = computed(() => ({
  tcp: [
    { filename: 'Unified CLI (rwarden tcp)', lang: 'bash', code: plugins_list_rwarden.cleanCode, html: plugins_list_rwarden.html, hasDiff: false },
    { filename: 'Standalone (tcp-warden)', lang: 'bash', code: plugins_list_standalone.cleanCode, html: plugins_list_standalone.html, hasDiff: false },
  ]
}))

// ─── plugins install ─────────────────────────────────────────────────────────
const install_rwarden = buildSnippet({
  lang: 'bash',
  code: `# Install official plugin by short name or repository
rwarden tcp plugins install http
rwarden tcp plugins install redis
rwarden tcp plugins install postgres
rwarden tcp plugins install https://github.com/routewarden/plugins/postgres`
})

const install_short = buildSnippet({
  lang: 'bash',
  code: `tcp-warden plugins install http
tcp-warden plugins install redis
tcp-warden plugins install postgres`
})

const install_git = buildSnippet({
  lang: 'bash',
  code: `tcp-warden plugins install https://github.com/routewarden/plugins/postgres`
})

const install_local = buildSnippet({
  lang: 'bash',
  code: `tcp-warden plugins install ../plugins/redis`
})

const install_force = buildSnippet({
  lang: 'bash',
  code: `tcp-warden plugins install mysql --force`
})

const pluginsInstallSnippets = computed(() => ({
  tcp: [
    { filename: 'Unified CLI (rwarden tcp)', lang: 'bash', code: install_rwarden.cleanCode, html: install_rwarden.html, hasDiff: false },
    { filename: 'Official Short Name', lang: 'bash', code: install_short.cleanCode, html: install_short.html, hasDiff: false },
    { filename: 'Git Repository', lang: 'bash', code: install_git.cleanCode, html: install_git.html, hasDiff: false },
    { filename: 'Local Source', lang: 'bash', code: install_local.cleanCode, html: install_local.html, hasDiff: false },
    { filename: 'Force Overwrite', lang: 'bash', code: install_force.cleanCode, html: install_force.html, hasDiff: false },
  ]
}))

// ─── plugins enable ──────────────────────────────────────────────────────────
const plugins_enable = buildSnippet({
  lang: 'bash',
  code: `tcp-warden plugins enable postgres`
})

const pluginsEnableSnippets = computed(() => ({
  tcp: [
    { filename: 'Terminal', lang: 'bash', code: plugins_enable.cleanCode, html: plugins_enable.html, hasDiff: false },
  ]
}))

// ─── plugins disable ─────────────────────────────────────────────────────────
const plugins_disable = buildSnippet({
  lang: 'bash',
  code: `tcp-warden plugins disable postgres`
})

const pluginsDisableSnippets = computed(() => ({
  tcp: [
    { filename: 'Terminal', lang: 'bash', code: plugins_disable.cleanCode, html: plugins_disable.html, hasDiff: false },
  ]
}))

// ─── plugins test ────────────────────────────────────────────────────────────
const plugins_test_rwarden = buildSnippet({
  lang: 'bash',
  code: `rwarden tcp plugins test`
})

const plugins_test_standalone = buildSnippet({
  lang: 'bash',
  code: `tcp-warden plugins test`
})

const pluginsTestSnippets = computed(() => ({
  tcp: [
    { filename: 'Unified CLI (rwarden tcp)', lang: 'bash', code: plugins_test_rwarden.cleanCode, html: plugins_test_rwarden.html, hasDiff: false },
    { filename: 'Standalone (tcp-warden)', lang: 'bash', code: plugins_test_standalone.cleanCode, html: plugins_test_standalone.html, hasDiff: false },
  ]
}))

// ─── plugins create ──────────────────────────────────────────────────────────
const plugins_create = buildSnippet({
  lang: 'bash',
  code: `# Scaffold a new custom protocol plugin with manifest, tests, and auto-registration
tcp-warden plugins create custom_guard --protocol custom --listen :9500 --upstream 127.0.0.1:9000`
})

const pluginsCreateSnippets = computed(() => ({
  tcp: [
    { filename: 'Terminal', lang: 'bash', code: plugins_create.cleanCode, html: plugins_create.html, hasDiff: false },
  ]
}))

// ─── plugins uninstall ───────────────────────────────────────────────────────
const plugins_uninstall = buildSnippet({
  lang: 'bash',
  code: `tcp-warden plugins uninstall postgres`
})

const pluginsUninstallSnippets = computed(() => ({
  tcp: [
    { filename: 'Terminal', lang: 'bash', code: plugins_uninstall.cleanCode, html: plugins_uninstall.html, hasDiff: false },
  ]
}))

// ─── status ──────────────────────────────────────────────────────────────────
const status_rwarden = buildSnippet({
  lang: 'bash',
  code: `# Check running proxy daemon status
rwarden tcp status
# or
rwarden status tcp`
})

const status_standalone = buildSnippet({
  lang: 'bash',
  code: `tcp-warden status --api http://127.0.0.1:9091`
})

const statusSnippets = computed(() => ({
  tcp: [
    { filename: 'Unified CLI (rwarden tcp)', lang: 'bash', code: status_rwarden.cleanCode, html: status_rwarden.html, hasDiff: false },
    { filename: 'Standalone (tcp-warden)', lang: 'bash', code: status_standalone.cleanCode, html: status_standalone.html, hasDiff: false },
  ]
}))

// ─── banlist ─────────────────────────────────────────────────────────────────
const banlist_cmd = buildSnippet({
  lang: 'bash',
  code: `tcp-warden banlist --api http://127.0.0.1:9091`
})

const banlistSnippets = computed(() => ({
  tcp: [
    { filename: 'Terminal', lang: 'bash', code: banlist_cmd.cleanCode, html: banlist_cmd.html, hasDiff: false },
  ]
}))

// ─── ban ─────────────────────────────────────────────────────────────────────
const ban_cmd = buildSnippet({
  lang: 'bash',
  code: `tcp-warden ban 198.51.100.55 --duration 24h --reason "manual audit block"`
})

const banSnippets = computed(() => ({
  tcp: [
    { filename: 'Terminal', lang: 'bash', code: ban_cmd.cleanCode, html: ban_cmd.html, hasDiff: false },
  ]
}))

// ─── unban ───────────────────────────────────────────────────────────────────
const unban_cmd = buildSnippet({
  lang: 'bash',
  code: `tcp-warden unban 198.51.100.55`
})

const unbanSnippets = computed(() => ({
  tcp: [
    { filename: 'Terminal', lang: 'bash', code: unban_cmd.cleanCode, html: unban_cmd.html, hasDiff: false },
  ]
}))

// ─── version ─────────────────────────────────────────────────────────────────
const version_rwarden = buildSnippet({
  lang: 'bash',
  code: `rwarden tcp version`
})

const version_standalone = buildSnippet({
  lang: 'bash',
  code: `tcp-warden version`
})

const versionSnippets = computed(() => ({
  tcp: [
    { filename: 'Unified CLI (rwarden tcp)', lang: 'bash', code: version_rwarden.cleanCode, html: version_rwarden.html, hasDiff: false },
    { filename: 'Standalone (tcp-warden)', lang: 'bash', code: version_standalone.cleanCode, html: version_standalone.html, hasDiff: false },
  ]
}))
</script>

# CLI Reference

The `tcp-warden` binary provides built-in subcommands for starting the proxy, validating YAML configuration, installing modular protocol plugins, and managing active IP bans.

::: tip Unified CLI Available
All commands documented below can be executed directly using either the standalone `tcp-warden` binary or via the unified RouteWarden CLI as `rwarden tcp <subcommand>` (e.g. `rwarden tcp up`, `rwarden tcp reload`, `rwarden tcp plugins list`).
:::

---

## Global Syntax

<CodeViewer :snippets="globalSyntaxSnippets" />

---

## Commands

### `run` (Default)

Starts the TCP proxy daemon and binds configured service listeners.

<CodeViewer :snippets="runSnippets" />

| Flag | Shorthand | Description | Default |
| :--- | :--- | :--- | :--- |
| `--config` | `-c` | Path to YAML configuration file | `tcp-warden.yaml` |

---

### `validate`

Validates YAML syntax, port collisions, CIDR format, and protocol dependencies without starting listeners.

<CodeViewer :snippets="validateSnippets" />

**Exit Codes**:
* `0`: Configuration is valid.
* `1`: Syntax or rule validation error (details printed to `stderr`).

---

### `plugins`

Subcommands for discovering, installing, testing, and managing modular protocol inspectors.

#### `plugins list`
Displays all installed modular plugins, versions, protocols, and current activation status:

<CodeViewer :snippets="pluginsListSnippets" />

#### `plugins install`
Pulls a plugin from a Git repository or local folder, runs pre-flight tests, and registers the plugin:

<CodeViewer :snippets="pluginsInstallSnippets" />

| Flag | Description | Default |
| :--- | :--- | :--- |
| `--force` | Overwrite existing installation and purge cache | `false` |
| `--no-build` | Skip rebuilding the `tcp-warden` binary | `false` |
| `--cache-dir` | Path to plugin cache directory | `$ROUTEWARDEN_PLUGINS_CACHE` |

#### `plugins enable`
Tests the plugin using synthetic net.Pipe self-tests and enables it in `tcp-warden.yaml`:

<CodeViewer :snippets="pluginsEnableSnippets" />

#### `plugins disable`
Disables an active plugin and sets `enabled: false` in `tcp-warden.yaml`:

<CodeViewer :snippets="pluginsDisableSnippets" />

#### `plugins test`
Executes in-memory self-tests across all registered plugins:

<CodeViewer :snippets="pluginsTestSnippets" />

#### `plugins create`
Scaffolds a new custom protocol inspector plugin with manifest (`plugin.yaml`), lifecycle code (`plugin.go`), unit tests, and automatic registration in `plugins/all/all.go`:

<CodeViewer :snippets="pluginsCreateSnippets" />

| Flag | Description | Default |
| :--- | :--- | :--- |
| `--protocol` | Target protocol name | `<plugin-name>` |
| `--listen` | Default ingress port | `""` |
| `--upstream` | Default upstream target | `""` |
| `--dir` | Destination directory | `plugins/<plugin-name>` |
| `--no-service` | Skip adding default service to `tcp-warden.yaml` | `false` |

#### `plugins uninstall`
Removes plugin source, unregisters import, and rebuilds the binary:

<CodeViewer :snippets="pluginsUninstallSnippets" />

---

### `status`

Queries metrics from a running daemon via the management API:

<CodeViewer :snippets="statusSnippets" />

---

### `banlist`

Displays active IP bans, offending services, and remaining expiration times:

<CodeViewer :snippets="banlistSnippets" />

---

### `ban`

Manually ban an IP address across all services:

<CodeViewer :snippets="banSnippets" />

| Flag | Description | Default |
| :--- | :--- | :--- |
| `--duration` | Ban expiration duration (e.g. `1h`, `24h`, `7d`) | `1h` |
| `--reason` | Human-readable reason for the ban | `manual ban` |
| `--api` | Management API base URL | `http://127.0.0.1:9091` |

---

### `unban`

Removes an active ban for a specific IP address:

<CodeViewer :snippets="unbanSnippets" />

---

### `version`

Displays the compiled version, Git commit hash, and build timestamp:

<CodeViewer :snippets="versionSnippets" />

