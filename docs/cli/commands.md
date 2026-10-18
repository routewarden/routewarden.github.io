---
title: Commands Reference — RouteWarden CLI
description: Full CLI command reference for rwarden test, validate, schema, generate, and sandbox.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

// ─── 1. Test Command ────────────────────────────────────────────────────────
const test_cli = buildSnippet({
  lang: 'bash',
  code: `# Test a sensitive file path (positional or --path)
rwarden test /.env
rwarden test --path "/.env"

# Test double URL encoding anti-evasion
rwarden test "/static/%252e%252e/.env"

# Test query string inspection (-q or --query)
rwarden test -q "file=secret.conf" /search

# Test custom HTTP methods (-X, -m, or --method)
rwarden test -X POST /wp-config.php

# Test custom HTTP headers (-H or --header, repeatable)
rwarden test -H "X-Forwarded-Uri: /.env" /api

# Test against a custom RouteWarden config file (-c or --config)
rwarden test -c routewarden.json /admin/dashboard

# Test client IP whitelisting
rwarden test -c routewarden.json --ip "10.0.0.1" /admin

# Test request body payload inspection (-b or --body)
rwarden test -X POST -b "grant_type=password&user=admin" --check-body /identity/token

# Pipe configuration via stdin
cat routewarden.json | rwarden test -c - /admin`,
})

const test_docker = buildSnippet({
  lang: 'bash',
  code: `# Test a sensitive path
docker run --rm ghcr.io/routewarden/cli:latest test /.env

# Test double URL encoding anti-evasion
docker run --rm ghcr.io/routewarden/cli:latest test "/static/%252e%252e/.env"

# Test evasion via query inspection
docker run --rm ghcr.io/routewarden/cli:latest test -q "file=secret.conf" /search

# Test against custom config file
docker run --rm -v $(pwd)/routewarden.json:/routewarden.json ghcr.io/routewarden/cli:latest test -c /routewarden.json --ip "10.0.0.1" /admin`,
})

const testSnippets = computed(() => ({
  cli: [
    { filename: 'CLI', lang: 'bash', code: test_cli.cleanCode, html: test_cli.html, hasDiff: false },
    { filename: 'Docker', lang: 'bash', code: test_docker.cleanCode, html: test_docker.html, hasDiff: false },
  ],
}))

const test_output = buildSnippet({
  lang: 'plaintext',
  code: `🔍 Testing: GET /static/%252e%252e/.env
  Candidate paths extracted (2):
    - /static/%252e%252e/.env
    - /.env

Result: 🛑 BLOCKED (HTTP Status 403)
  Reason:  block_pattern_match
  Target:  /.env
  Pattern: (?i)\\.env`,
})

const testOutputSnippets = computed(() => ({
  cli: [
    { filename: 'Simulation Output', lang: 'plaintext', code: test_output.cleanCode, html: test_output.html, hasDiff: false },
  ],
}))

// ─── 2. Validate Command ────────────────────────────────────────────────────
const validate_cli = buildSnippet({
  lang: 'bash',
  code: `# Validate routewarden.json directly (positional or --config)
rwarden validate routewarden.json
rwarden validate -c routewarden.json

# Auto-detects routewarden.json in current directory if omitted
rwarden validate

# Validate tcp-warden.yaml configuration
rwarden validate tcp-warden.yaml

# Validate piped config via stdin
cat routewarden.json | rwarden validate -c -`,
})

const validate_docker = buildSnippet({
  lang: 'bash',
  code: `# Validate mounted config file
docker run --rm -v $(pwd)/routewarden.json:/routewarden.json ghcr.io/routewarden/cli:latest validate --config /routewarden.json

# Validate mounted tcp-warden.yaml file
docker run --rm -v $(pwd)/tcp-warden.yaml:/tcp-warden.yaml ghcr.io/routewarden/cli:latest validate --config /tcp-warden.yaml`,
})

const validateSnippets = computed(() => ({
  cli: [
    { filename: 'CLI', lang: 'bash', code: validate_cli.cleanCode, html: validate_cli.html, hasDiff: false },
    { filename: 'Docker', lang: 'bash', code: validate_docker.cleanCode, html: validate_docker.html, hasDiff: false },
  ],
}))

const validate_output = buildSnippet({
  lang: 'plaintext',
  code: `✔ Schema validation passed: routewarden.json is valid!
  - 14 built-in block patterns active
  - 5 allow rules configured
  - Response mode: json (HTTP 403)
  - 3 allowed IP CIDR blocks evaluated`,
})

const validateOutputSnippets = computed(() => ({
  cli: [
    { filename: 'Validation Output', lang: 'plaintext', code: validate_output.cleanCode, html: validate_output.html, hasDiff: false },
  ],
}))

// ─── 3. Schema Command ──────────────────────────────────────────────────────
const schema_cli = buildSnippet({
  lang: 'bash',
  code: `# Output HTTP Gateway Schema (routewarden.json)
rwarden schema > routewarden.schema.json

# Output TCP Warden L4 Proxy Schema (tcp-warden.yaml)
rwarden schema --tcp > tcp-warden.schema.json`,
})

const schema_docker = buildSnippet({
  lang: 'bash',
  code: `docker run --rm ghcr.io/routewarden/cli:latest schema > routewarden.schema.json`,
})

const schemaSnippets = computed(() => ({
  cli: [
    { filename: 'CLI', lang: 'bash', code: schema_cli.cleanCode, html: schema_cli.html, hasDiff: false },
    { filename: 'Docker', lang: 'bash', code: schema_docker.cleanCode, html: schema_docker.html, hasDiff: false },
  ],
}))

// ─── 4. Generate Command ────────────────────────────────────────────────────
const generate_cli = buildSnippet({
  lang: 'bash',
  code: `# Traefik: dynamic YAML middleware definition
rwarden generate traefik-yaml routewarden.json > traefik-middleware.yaml

# Traefik: dynamic TOML middleware definition
rwarden generate traefik-toml routewarden.json > traefik-middleware.toml

# Traefik: Docker Compose labels block
rwarden generate traefik-labels routewarden.json

# Caddy: Caddyfile directive block
rwarden generate caddy routewarden.json

# NGINX / OpenResty: Lua init table for nginx.conf
rwarden generate nginx routewarden.json

# TCP Warden: tcp-warden.yaml configuration
rwarden generate tcp-warden routewarden.json > tcp-warden.yaml`,
})

const generate_docker = buildSnippet({
  lang: 'bash',
  code: `docker run --rm -v $(pwd)/routewarden.json:/routewarden.json ghcr.io/routewarden/cli:latest generate traefik-yaml /routewarden.json`,
})

const generateSnippets = computed(() => ({
  cli: [
    { filename: 'CLI', lang: 'bash', code: generate_cli.cleanCode, html: generate_cli.html, hasDiff: false },
    { filename: 'Docker', lang: 'bash', code: generate_docker.cleanCode, html: generate_docker.html, hasDiff: false },
  ],
}))

// ─── 5. Sandbox Command ─────────────────────────────────────────────────────
const sandbox_cli = buildSnippet({
  lang: 'bash',
  code: `# Start a Traefik sandbox on localhost:8080
rwarden sandbox traefik routewarden.json

# Start a Caddy sandbox with automatic test suite execution
rwarden sandbox caddy routewarden.json --test

# Start an NGINX sandbox in detached background mode
rwarden sandbox nginx routewarden.json --detach

# Dry-run: view generated container command without launching
rwarden sandbox traefik routewarden.json --dry-run`,
})

const sandboxSnippets = computed(() => ({
  cli: [
    { filename: 'rwarden sandbox', lang: 'bash', code: sandbox_cli.cleanCode, html: sandbox_cli.html, hasDiff: false },
  ],
}))

const sandbox_probes = buildSnippet({
  lang: 'bash',
  code: `# Sensitive file attack (should return 403 Forbidden)
curl -i http://localhost:8080/.env

# Directory traversal attempt (should return 403 Forbidden)
curl -i "http://localhost:8080/static/..%2f.env"

# Safe RFC endpoint (should return 200 or upstream response)
curl -i http://localhost:8080/robots.txt`,
})

const sandboxProbesSnippets = computed(() => ({
  cli: [
    { filename: 'HTTP Test Probes', lang: 'bash', code: sandbox_probes.cleanCode, html: sandbox_probes.html, hasDiff: false },
  ],
}))

// ─── 6. Cleanup Command ─────────────────────────────────────────────────────
const cleanup_cmd = buildSnippet({
  lang: 'bash',
  code: `rwarden cleanup`,
})

const cleanupSnippets = computed(() => ({
  cli: [
    { filename: 'rwarden cleanup', lang: 'bash', code: cleanup_cmd.cleanCode, html: cleanup_cmd.html, hasDiff: false },
  ],
}))

// ─── 7. Version Command ─────────────────────────────────────────────────────
const version_cmd = buildSnippet({
  lang: 'bash',
  code: `rwarden version`,
})

const versionSnippets = computed(() => ({
  cli: [
    { filename: 'rwarden version', lang: 'bash', code: version_cmd.cleanCode, html: version_cmd.html, hasDiff: false },
  ],
}))

// ─── 8. Dashboard Command ───────────────────────────────────────────────────
const dashboard_cmd = buildSnippet({
  lang: 'bash',
  code: `# Launch GoAccess real-time security dashboard (opens http://localhost:7890)
rwarden dashboard
rwarden dashboard up

# Launch on a custom port without auto-opening browser
rwarden dashboard up --port 8080 --no-open

# Monitor a specific container by name
rwarden dashboard --container traefik

# Check status of running dashboard
rwarden dashboard status

# Stop background dashboard containers
rwarden dashboard down

# Export standalone Docker Compose and GoAccess config files to disk
rwarden dashboard export ./dashboard`,
})

const dashboardSnippets = computed(() => ({
  cli: [
    { filename: 'rwarden dashboard', lang: 'bash', code: dashboard_cmd.cleanCode, html: dashboard_cmd.html, hasDiff: false },
  ],
}))

// ─── 9. Audit Command ────────────────────────────────────────────────────────
const audit_cmd = buildSnippet({
  lang: 'bash',
  code: `# Audit default routewarden.json
rwarden audit

# Audit custom configuration file
rwarden audit ./config/routewarden.json

# Strict mode: fail on warnings as well as critical flaws
rwarden audit --strict routewarden.json

# Output as JSON
rwarden audit --format json routewarden.json

# Output in OASIS SARIF v2.1.0 format for GitHub Code Scanning
rwarden audit --format sarif routewarden.json > results.sarif`,
})

const auditSnippets = computed(() => ({
  cli: [
    { filename: 'rwarden audit', lang: 'bash', code: audit_cmd.cleanCode, html: audit_cmd.html, hasDiff: false },
  ],
}))

// ─── 10. Diff Command ────────────────────────────────────────────────────────
const diff_cmd = buildSnippet({
  lang: 'bash',
  code: `# Compare production policy against candidate update
rwarden diff prod.json candidate.json

# Output diff as machine-readable JSON
rwarden diff --format json prod.json candidate.json

# Fail with exit code 1 if differences exist, or code 2 if security posture is relaxed
rwarden diff --exit-code prod.json candidate.json`,
})

const diffSnippets = computed(() => ({
  cli: [
    { filename: 'rwarden diff', lang: 'bash', code: diff_cmd.cleanCode, html: diff_cmd.html, hasDiff: false },
  ],
}))

// ─── 11. Monitor Command ─────────────────────────────────────────────────────
const monitor_compose = buildSnippet({
  lang: 'yaml',
  code: `services:
  traefik:
    image: traefik:v3.1
    labels:
      - "routewarden=true"
  nginx:
    image: openresty/openresty:alpine
    labels:
      - "routewarden=true"`,
})

const monitor_cmd = buildSnippet({
  lang: 'bash',
  code: `# Auto-discover & multiplex all containers labeled routewarden=true
rwarden monitor

# Tail a specific container by name or ID
rwarden monitor --container traefik

# Filter by custom Docker label
rwarden monitor --label "env=production"

# Pipe into GoAccess for a lightweight, real-time HTML dashboard
rwarden monitor --raw | goaccess -o /var/www/html/security.html --real-time-html --port=7890 -

# Tail an NGINX or Apache access log file
rwarden monitor --file /var/log/nginx/access.log

# Filter exclusively for blocked threats or specific IP / path
rwarden monitor --verdict BLOCK
rwarden monitor --path "/.env" --ip "192.168.1."`,
})

const monitorSnippets = computed(() => ({
  cli: [
    { filename: 'rwarden monitor', lang: 'bash', code: monitor_cmd.cleanCode, html: monitor_cmd.html, hasDiff: false },
    { filename: 'docker-compose.yaml', lang: 'yaml', code: monitor_compose.cleanCode, html: monitor_compose.html, hasDiff: false },
  ],
}))

// ─── 12. TUI Command ─────────────────────────────────────────────────────────
const tui_cmd = buildSnippet({
  lang: 'bash',
  code: `# Launch interactive terminal simulator
rwarden tui

# Or with alias
rwarden interactive

# Pre-load custom policy configuration
rwarden tui ./routewarden.json`,
})

const tuiSnippets = computed(() => ({
  cli: [
    { filename: 'rwarden tui', lang: 'bash', code: tui_cmd.cleanCode, html: tui_cmd.html, hasDiff: false },
  ],
}))

// ─── 13. Completion Command ──────────────────────────────────────────────────
const completion_cmd = buildSnippet({
  lang: 'bash',
  code: `# Bash
source <(rwarden completion bash)

# Zsh
rwarden completion zsh > ~/.zsh/completion/_rwarden

# Fish
rwarden completion fish | source

# PowerShell
rwarden completion powershell | Out-String | Invoke-Expression`,
})

const completionSnippets = computed(() => ({
  cli: [
    { filename: 'rwarden completion', lang: 'bash', code: completion_cmd.cleanCode, html: completion_cmd.html, hasDiff: false },
  ],
}))

// ─── 14. Manpage Command ─────────────────────────────────────────────────────
const man_cmd = buildSnippet({
  lang: 'bash',
  code: `# View system manual page directly in terminal
rwarden man | man -l -

# Save manual page to system directory
sudo rwarden man -o /usr/share/man/man1/rwarden.1`,
})

const manSnippets = computed(() => ({
  cli: [
    { filename: 'rwarden man', lang: 'bash', code: man_cmd.cleanCode, html: man_cmd.html, hasDiff: false },
  ],
}))

// ─── 15. Keys Command ────────────────────────────────────────────────────────
const keys_cmd = buildSnippet({
  lang: 'bash',
  code: `# Generate a new remote agent authentication key
rwarden keys create edge-node-01

# List all registered remote agent keys and their status
rwarden keys list

# Revoke an agent key by name or ID
rwarden keys revoke edge-node-01
rwarden keys revoke agent_8f9a2b4c1e0d3f7a

# Specify a custom dashboard storage directory
rwarden keys list --dir /data/routewarden`,
})

const keysSnippets = computed(() => ({
  cli: [
    { filename: 'rwarden keys', lang: 'bash', code: keys_cmd.cleanCode, html: keys_cmd.html, hasDiff: false },
  ],
}))

// ─── 16. Register Command ────────────────────────────────────────────────────
const register_cmd = buildSnippet({
  lang: 'bash',
  code: `# One-time registration with RouteWarden Central Dashboard
rwarden register --url http://198.51.100.10:7890 --key rw_sec_8f9a2b4c1e0d3f7a...

# Register with flag aliases (-u and -k)
rwarden register -u http://dashboard.internal:7890 -k rw_sec_8f9a...

# Store configuration in a custom file
rwarden register --url http://dashboard.internal:7890 --key rw_sec_... --config /etc/routewarden/agent.json`,
})

const registerSnippets = computed(() => ({
  cli: [
    { filename: 'rwarden register', lang: 'bash', code: register_cmd.cleanCode, html: register_cmd.html, hasDiff: false },
  ],
}))

// ─── 17. Push Command ────────────────────────────────────────────────────────
const push_cmd = buildSnippet({
  lang: 'bash',
  code: `# Zero-flag push: reads ~/.routewarden/agent.json and auto-discovers containers
rwarden push

# Auto-discover and stream all containers with label 'routewarden=true'
rwarden push --docker

# Monitor and push a specific log file
rwarden push --file /var/log/nginx/access.log

# Stream logs from a specific Docker container
rwarden push --container traefik

# Push directly with URL and key flags (skipping registration)
rwarden push --url http://198.51.100.10:7890 --key rw_sec_... --docker

# Tune in-memory batching buffer and flush interval
rwarden push --batch-size 100 --flush-interval 2s`,
})

const pushSnippets = computed(() => ({
  cli: [
    { filename: 'rwarden push', lang: 'bash', code: push_cmd.cleanCode, html: push_cmd.html, hasDiff: false },
  ],
}))
</script>

# Commands Reference

`rwarden` provides a unified command-line interface for path testing, configuration verification, schema export, and gateway generation.

---

## 1. Test URL Paths & Queries (`test`)

Simulate candidate path extraction, normalization, and pattern matching on an arbitrary path without starting Traefik, Caddy, or NGINX:

<CodeViewer :snippets="testSnippets" />

### Flags

| Flag | Type | Default | Description |
|:---|:---|:---|:---|
| `[path]`, `--path` | string | `""` | Request path to evaluate (e.g. `/.env` or `/api/v1`) |
| `-c`, `--config` | string | `""` | Path to `routewarden.json` (or `-` for stdin) |
| `-q`, `--query` | string | `""` | Query string to evaluate for path evasion payloads |
| `-b`, `--body` | string | `""` | Request body payload to evaluate for hostile content |
| `-X`, `-m`, `--method` | string | `"GET"` | HTTP method (e.g. `GET`, `POST`, `HEAD`) |
| `-H`, `--header` | string | `""` | Optional header in `Key:Value` format (repeatable) |
| `--ip` | string | `""` | Client IP address to evaluate against `allowedIps` |
| `--check-query` | bool | `true` | Enable or disable query string inspection |
| `--check-body` | bool | `false` | Enable or disable request body payload inspection |

### Example Output

<CodeViewer :snippets="testOutputSnippets" />

---

## 2. Validate Configurations (`validate`)

Validate a RouteWarden JSON or TCP Warden YAML configuration file before deploying:

<CodeViewer :snippets="validateSnippets" />

### Example Output

<CodeViewer :snippets="validateOutputSnippets" />

---

## 3. Output JSON Schema (`schema`)

Output the official RouteWarden JSON Schemas directly to stdout:

<CodeViewer :snippets="schemaSnippets" />

---

## 4. Generate Gateway Configs (`generate`)

Compile a universal `routewarden.json` policy into target reverse proxy syntax:

<CodeViewer :snippets="generateSnippets" />

### Supported Targets

| Target | Alias | Description |
|:---|:---|:---|
| `traefik-yaml` | `traefik`, `yaml` | Traefik Dynamic File Provider YAML |
| `traefik-toml` | `toml` | Traefik Dynamic File Provider TOML |
| `traefik-labels` | `labels`, `compose` | Docker Compose container label syntax |
| `caddy` | `caddyfile` | Native Caddyfile `routewarden` directive block |
| `nginx` | `openresty`, `lua` | OpenResty `init_by_lua_block` Lua table |
| `tcp-warden` | `tcp`, `l4` | TCP Warden daemon YAML configuration |

---

## 5. Live Gateway Sandbox (`sandbox`)

Spin up an ephemeral, isolated container running Traefik, Caddy, or NGINX loaded with your security policy for live testing:

<CodeViewer :snippets="sandboxSnippets" />

### Sandbox Testing Probes

When running in sandbox mode, you can execute HTTP requests against `http://localhost:8080`:

<CodeViewer :snippets="sandboxProbesSnippets" />

---

## 6. Cleanup Sandbox Containers (`cleanup`)

Stop and remove all running or detached RouteWarden sandbox test containers:

<CodeViewer :snippets="cleanupSnippets" />

---

## 7. Version Information (`version`)

Check installed binary version:

<CodeViewer :snippets="versionSnippets" />

---

## 8. Security Dashboard (`dashboard`)

Launch and manage an ultra-lightweight, real-time security dashboard powered by [GoAccess](https://goaccess.io/) and `rwarden monitor`. It replaces heavy multi-container monitoring stacks with an in-memory dashboard consuming only **~15MB of RAM**:

<CodeViewer :snippets="dashboardSnippets" />

### Subcommands & Flags

| Subcommand / Flag | Type | Default | Description |
|:---|:---|:---|:---|
| `up`, `start` | subcommand | — | Spin up GoAccess security dashboard (default) |
| `down`, `stop` | subcommand | — | Stop running dashboard containers |
| `status`, `ps` | subcommand | — | Check container health and service URLs |
| `export [dir]` | subcommand | `./dashboard` | Export compose and GoAccess assets to disk |
| `--port` | int | `7890` | Port for GoAccess dashboard UI and WebSocket |
| `-f`, `--file` | string | `""` | Log file to monitor (default: auto-discovered Docker containers) |
| `-c`, `--container` | string | `""` | Tail a specific Docker container by name or ID |
| `-l`, `--label` | string | `"routewarden=true"` | Docker label to filter containers |
| `--dir` | string | `~/.routewarden/dashboard` | Working directory storing dashboard files |
| `--no-open` | bool | `false` | Do not launch system default browser |

---

## 9. Policy Static Analyzer & Linter (`audit`)

Perform deep static analysis and linting on a RouteWarden policy file to catch ReDoS vulnerabilities, unescaped dots, universal wildcard traps, and header spoofing risks before deployment:

<CodeViewer :snippets="auditSnippets" />

### Flags

| Flag | Type | Default | Description |
|:---|:---|:---|:---|
| `[file]` | string | `"routewarden.json"` | Configuration file to audit (or `-` for stdin) |
| `-f`, `--format` | string | `"text"` | Output format: `text` (default), `json`, or `sarif` |
| `-s`, `--strict` | bool | `false` | Strict mode: exit code 1 on warnings as well as critical flaws |

---

## 10. Policy Diffing (`diff`)

Compare two RouteWarden policy files and evaluate the security posture delta (e.g. relaxed, hardened, or neutral):

<CodeViewer :snippets="diffSnippets" />

### Flags

| Flag | Type | Default | Description |
|:---|:---|:---|:---|
| `<base.json>` | string | — | Baseline policy file |
| `<candidate.json>` | string | — | Candidate policy file to evaluate against base |
| `-f`, `--format` | string | `"text"` | Output format: `text` (default) or `json` |
| `--exit-code` | bool | `false` | Exit code 1 if differences exist, 2 if posture is relaxed |

---

## 11. Live Terminal Threat Monitoring (`monitor`)

Tail, multiplex, and colorize live reverse proxy security events directly in the terminal from Docker containers, log files, or standard input.

When invoked without `--file` or a pipe, `rwarden monitor` automatically discovers running Docker containers tagged with `routewarden=true` (or `routewarden.logs=true`) and streams them simultaneously with container attribution tags (`[traefik]`, `[nginx]`, etc.).

::: tip Lightweight Web UI with GoAccess
For live terminal visualization or real-time web graphs, run `rwarden monitor --raw` and pipe cleanly into [GoAccess](https://goaccess.io/) for a live web dashboard:
```bash
rwarden monitor --raw | goaccess -o /var/www/html/security.html --real-time-html --port=7890 -
```
:::

<CodeViewer :snippets="monitorSnippets" />

### Flags

| Flag | Type | Default | Description |
|:---|:---|:---|:---|
| `-f`, `--file` | string | `""` | Log file to read from (default: stdin or auto-discovered docker) |
| `--docker` | bool | `false` | Explicitly enable Docker container auto-discovery |
| `-c`, `--container` | string | `""` | Tail a specific Docker container by name or ID |
| `-l`, `--label` | string | `""` | Docker label to filter containers (default: `routewarden=true`) |
| `--tail` | string | `"50"` | Initial lines to tail from Docker container(s) |
| `--raw` | bool | `false` | Output raw unformatted log lines (ideal for piping into GoAccess or jq) |
| `--verdict` | string | `""` | Filter events by verdict (`BLOCK`, `ALLOW`, `TARPIT`) |
| `--ip` | string | `""` | Filter events by client IP substring |
| `--path` | string | `""` | Filter events by request path substring |

---

## 12. Interactive Terminal REPL (`tui`)

Launch an interactive terminal simulator to experiment with paths, query strings, headers, and client IPs in real time:

<CodeViewer :snippets="tuiSnippets" />

### Interactive Commands

| Command | Description |
|:---|:---|
| `<path>` | Evaluate path directly (e.g. `/.env` or `/api/v1/health?token=abc`) |
| `:method <METHOD>` | Switch active HTTP method (`GET`, `POST`, `PUT`, `DELETE`, etc.) |
| `:ip <address>` | Set client IP for allowlist / trusted proxy checks |
| `:query <querystring>` | Set default query string |
| `:body <payload>` | Set request body for body inspection tests |
| `:header Key: Value` | Set or add custom request header |
| `:clear-headers` | Clear all custom headers |
| `:load <file.json>` | Load a custom `routewarden.json` policy |
| `:status` | Display current test environment state |
| `:clear` | Clear terminal screen |
| `:exit` / `quit` | Exit interactive mode |

---

## 13. Shell Autocompletion (`completion`)

Generate autocompletion scripts for subcommands, flags, and targets:

<CodeViewer :snippets="completionSnippets" />

### Supported Shells
- **Bash**: `source <(rwarden completion bash)`
- **Zsh**: `rwarden completion zsh > "${fpath[1]}/_rwarden"`
- **Fish**: `rwarden completion fish | source`
- **PowerShell**: `rwarden completion powershell | Out-String | Invoke-Expression`

---

## 14. System Manpage (`man`)

Output the standard system manual page formatted in roff/troff:

<CodeViewer :snippets="manSnippets" />

---

## 15. Manage Remote Agent API Keys (`keys`)

Manage distributed enrollment keys for remote log shippers. When running a central RouteWarden security dashboard, use `rwarden keys` to create and revoke credentials:

<CodeViewer :snippets="keysSnippets" />

### Subcommands

| Subcommand | Aliases | Description |
|:---|:---|:---|
| `create <name>` | `new`, `add` | Generate a new remote agent authentication token (`rw_sec_...`) |
| `list` | `ls` | List all registered agent keys, token prefixes, status, and last seen |
| `revoke <id>` | `rm`, `delete` | Revoke access for a specific agent by ID or name |

### Flags

| Flag | Type | Default | Description |
|:---|:---|:---|:---|
| `--dir` | string | `~/.routewarden/dashboard` | Dashboard storage directory holding `server.key` and `api_keys.json` |

---

## 16. Remote Agent Enrollment (`register`)

Enroll a remote node with a central RouteWarden dashboard. This one-time handshake validates the agent token, downloads the central server's X25519 public key, and saves configuration to `~/.routewarden/agent.json`:

<CodeViewer :snippets="registerSnippets" />

### Flags

| Flag | Shorthand | Type | Required | Description |
|:---|:---|:---|:---|:---|
| `--url` | `-u` | string | **Yes** | RouteWarden Central Dashboard URL (e.g. `http://dashboard.internal:7890`) |
| `--key` | `-k` | string | **Yes** | Remote agent authentication key (`rw_sec_...`) |
| `--config` | — | string | No | Custom path to store agent configuration (default: `~/.routewarden/agent.json`) |

---

## 17. Distributed Log Shipper (`push`)

Stream live security events and gateway access logs from remote edge nodes, cloud servers, or local containers to the central RouteWarden dashboard with end-to-end asymmetric encryption (X25519 ECDH + AES-256-GCM):

<CodeViewer :snippets="pushSnippets" />

### Flags & Options

| Flag | Shorthand | Type | Default | Description |
|:---|:---|:---|:---|:---|
| `--docker` | — | bool | `false` | Auto-discover and tail Docker containers with label `routewarden=true` |
| `--container` | `-c` | string | `""` | Tail a specific Docker container by name or ID |
| `--file` | `-f` | string | `""` | Tail and ship events from a specific log file |
| `--label` | `-l` | string | `"routewarden=true"` | Custom Docker label filter |
| `--tail` | — | string | `"50"` | Initial lines to tail from Docker container(s) |
| `--batch-size` | — | int | `50` | Maximum events to buffer in memory before flushing |
| `--flush-interval` | — | duration | `1s` | Maximum duration before flushing partial buffer |
| `--url` | `-u` | string | `""` | Override central dashboard URL from registered config |
| `--key` | `-k` | string | `""` | Override agent authentication key from registered config |
| `--config` | — | string | `~/.routewarden/agent.json` | Custom path to agent configuration file |


