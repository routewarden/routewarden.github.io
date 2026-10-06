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
  code: `# Launch Grafana, Loki, and Alloy stack via Docker Compose (default: port 3000)
rwarden dashboard
rwarden dashboard up

# Check status of running observability stack containers
rwarden dashboard status

# Stop and tear down the observability stack
rwarden dashboard down

# Export Docker Compose, Alloy, and Grafana config files to disk
rwarden dashboard export ./observability`,
})

const dashboardSnippets = computed(() => ({
  cli: [
    { filename: 'rwarden dashboard', lang: 'bash', code: dashboard_cmd.cleanCode, html: dashboard_cmd.html, hasDiff: false },
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
| `caddy` | `caddyfile` | Native Caddyfile `route_warden` directive block |
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

## 8. Observability Stack (`dashboard`)

Launch and manage a turnkey cloud-native observability stack (Grafana, Grafana Loki, and Grafana Alloy) using Docker Compose to visualize real-time blocked threats, attack rates, and top offender IPs:

<CodeViewer :snippets="dashboardSnippets" />

### Subcommands & Flags

| Subcommand / Flag | Type | Default | Description |
|:---|:---|:---|:---|
| `up`, `start` | subcommand | — | Spin up Grafana, Loki, and Alloy stack (default) |
| `down`, `stop` | subcommand | — | Stop and tear down running stack containers |
| `status`, `ps` | subcommand | — | Check container health and service URLs |
| `export [dir]` | subcommand | `./observability` | Export compose, Alloy, and Grafana assets to disk |
| `--port` | int | `3000` | Port for Grafana dashboard UI |
| `--loki-port` | int | `3100` | Port for Loki log engine |
| `--dir` | string | `~/.routewarden/observability` | Working directory storing stack files |
| `--no-open` | bool | `false` | Do not launch system default browser |

👉 For full configuration, LogQL query cheat sheets, and custom alerts, see the [Security Observability Stack Guide](/cli/dashboard).
