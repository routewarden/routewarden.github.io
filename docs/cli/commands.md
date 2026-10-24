---
title: Commands Reference — Routewarden CLI
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

# Test against a custom Routewarden config file (-c or --config)
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
  code: `# Launch real-time SOC security dashboard (opens http://localhost:7890)
rwarden dashboard
rwarden dashboard up

# Launch in background (detached daemon mode)
rwarden dashboard -d
# or
rwarden dashboard up --detach

# Launch with password protection (HTTP Basic Auth)
rwarden dashboard up --auth admin:supersecret

# Launch on a custom host/port without auto-opening browser
rwarden dashboard up --host 127.0.0.1 --port 8080 --no-open

# Monitor a specific container by name
rwarden dashboard --container traefik

# Check status of running dashboard
rwarden dashboard status
# or
rwarden status dashboard

# Stop background dashboard daemon
rwarden dashboard stop
# or
rwarden stop dashboard

# Configure automated data retention, event row cap, and log rotation
rwarden dashboard up --retention 30d --max-events 100000 --prune-interval 1h --max-log-size 50MB

# Export standalone Docker Compose and configuration files to disk
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

# Stream raw unformatted logs for external processing or jq
rwarden monitor --raw | jq .

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
  code: `# One-time registration with Routewarden Central Dashboard
rwarden register --url http://198.51.100.10:7890 --key rw_sec_8f9a2b4c1e0d3f7a...

# Register with flag aliases (-u and -k)
rwarden register -u http://dashboard.internal:7890 -k rw_sec_8f9a...

# Register and persist default filtering modes into agent.json
rwarden register -u http://dashboard.internal:7890 -k rw_sec_8f9a... --status "400-599, 301"

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

# Run in background (detached daemon mode)
rwarden push -d
# or
rwarden push --detach

# Check status of running background shipper
rwarden push status
# or
rwarden status push

# Stop background shipper daemon
rwarden push stop
# or
rwarden stop push

# Auto-discover and stream all containers with label 'routewarden=true'
rwarden push --docker

# Stream multiple log files concurrently (repeatable -f, comma-separated, or globs)
rwarden push -f /var/log/nginx/access.log -f /var/log/caddy/access.log
rwarden push --file "/var/log/nginx/*.log"

# Concurrent hybrid streaming: monitor files AND auto-discover Docker containers
rwarden push --docker -f /var/log/nginx/access.log -f /var/log/syslog

# Tail multiple specific containers and files concurrently
rwarden push -c traefik,api-gateway -f /var/log/nginx/access.log

# Push directly with URL and key flags (skipping registration)
rwarden push --url http://198.51.100.10:7890 --key rw_sec_... --docker

# Manually push one or more specific events directly (one-shot)
rwarden push -e '{"client_ip":"198.51.100.1","path":"/.env","verdict":"BLOCK"}'
rwarden push -e "event1" -e "event2"

# Pipe events line-by-line via STDIN (or -f -)
cat access.log | rwarden push --stdin
echo '{"client_ip":"198.51.100.1","path":"/.env","verdict":"BLOCK"}' | rwarden push -f -

# Forward HTTP requests matching status codes or ranges (e.g. 400-599, 301, 4xx, 5xx)
rwarden push --status "400-599, 301"
# Shorthand:
rwarden push -s 400-599,301

# Stream all HTTP access traffic including 200 OK
rwarden push --all-traffic

# Configure offline queue capacity and disconnect drop timeout
rwarden push --queue-size 20000 --disconnect-timeout 10m`,
})

const pushSnippets = computed(() => ({
  cli: [
    { filename: 'rwarden push', lang: 'bash', code: push_cmd.cleanCode, html: push_cmd.html, hasDiff: false },
  ],
}))

// ─── 18. Daemon Management (status, stop) ────────────────────────────────────
const daemon_cmd = buildSnippet({
  lang: 'bash',
  code: `# Check status of all running daemons (dashboard, shipper, tcp)
rwarden status

# Check status of a specific daemon
rwarden status dashboard
rwarden status push
rwarden status tcp

# Stop all running background daemons
rwarden stop

# Stop a specific background daemon
rwarden stop dashboard
rwarden stop push
rwarden stop tcp`,
})

const daemonSnippets = computed(() => ({
  cli: [
    { filename: 'rwarden status / stop', lang: 'bash', code: daemon_cmd.cleanCode, html: daemon_cmd.html, hasDiff: false },
  ],
}))

// ─── 19. L4 TCP/UDP Reverse Proxy (tcp) ─────────────────────────────────────
const tcp_cmd = buildSnippet({
  lang: 'bash',
  code: `# Start TCP/UDP proxy in foreground (auto-loads tcp-warden.yaml)
rwarden tcp
rwarden tcp up

# Start proxy in background (detached daemon mode)
rwarden tcp up -d
# or with custom config
rwarden tcp up -c /etc/routewarden/tcp-warden.yaml --detach

# Check status of running TCP proxy daemon
rwarden tcp status
# or
rwarden status tcp

# Reload configuration on running daemon without dropping live connections (zero-downtime)
rwarden tcp reload

# Stop background TCP proxy daemon
rwarden tcp stop
# or
rwarden stop tcp

# Validate TCP proxy configuration file syntax and protocol rules
rwarden tcp validate -c tcp-warden.yaml

# Check TCP proxy engine version
rwarden tcp version

# List registered L4 protocol inspection plugins
rwarden tcp plugins list

# Run self-tests on registered plugins
rwarden tcp plugins test

# Install a modular protocol plugin from Git
rwarden tcp plugins install github.com/routewarden/plugin-redis`,
})

const tcp_docker = buildSnippet({
  lang: 'bash',
  code: `# Run standalone minimal L4 proxy container (<15MB)
docker run -d --name tcp-warden \\
  -p 5432:5432 -p 6379:6379 \\
  -v $(pwd)/tcp-warden.yaml:/etc/tcp-warden/tcp-warden.yaml:ro \\
  ghcr.io/routewarden/tcp-warden:latest`,
})

const tcpSnippets = computed(() => ({
  cli: [
    { filename: 'rwarden tcp', lang: 'bash', code: tcp_cmd.cleanCode, html: tcp_cmd.html, hasDiff: false },
    { filename: 'Docker (Standalone)', lang: 'bash', code: tcp_docker.cleanCode, html: tcp_docker.html, hasDiff: false },
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

Validate a Routewarden JSON or TCP Warden YAML configuration file before deploying:

<CodeViewer :snippets="validateSnippets" />

### Example Output

<CodeViewer :snippets="validateOutputSnippets" />

---

## 3. Output JSON Schema (`schema`)

Output the official Routewarden JSON Schemas directly to stdout:

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

Stop and remove all running or detached Routewarden sandbox test containers:

<CodeViewer :snippets="cleanupSnippets" />

---

## 7. Version Information (`version`)

Check installed binary version:

<CodeViewer :snippets="versionSnippets" />

---

## 8. Security Dashboard (`dashboard`)

Launch and manage an ultra-lightweight, real-time security dashboard powered by Routewarden's embedded SOC engine and SQLite persistence. It replaces heavy multi-container monitoring stacks with an in-memory dashboard consuming only **~8MB of RAM**:

<CodeViewer :snippets="dashboardSnippets" />

### Subcommands & Flags

| Subcommand / Flag | Type | Default | Description |
|:---|:---|:---|:---|
| `up`, `start` | subcommand | — | Spin up real-time SOC security dashboard (default) |
| `down`, `stop` | subcommand | — | Stop running background dashboard daemon |
| `status`, `ps` | subcommand | — | Check running status, PID, and dashboard URL |
| `export [dir]` | subcommand | `./dashboard` | Export compose and configuration assets to disk |
| `-d`, `--detach` | bool | `false` | Run dashboard in background (detached) daemon mode |
| `-a`, `--auth` | string | `""` | Require HTTP Basic Auth (`user:pass`) for dashboard UI and APIs |
| `--user` | string | `""` | Dashboard authentication username |
| `--password` | string | `""` | Dashboard authentication password |
| `--host` | string | `""` | Host interface to bind server (`127.0.0.1`, `0.0.0.0`) |
| `--port` | int | `7890` | Port for SOC dashboard UI and SSE stream |
| `-f`, `--file` | string | `""` | Log file to monitor (default: auto-discovered Docker containers) |
| `-c`, `--container` | string | `""` | Tail a specific Docker container by name or ID |
| `-l`, `--label` | string | `"routewarden=true"` | Docker label to filter containers |
| `--dir` | string | `~/.routewarden/dashboard` | Working directory storing SQLite `events.db` and keys |
| `--no-open` | bool | `false` | Do not launch system default browser |
| `--retention` | string | `"30d"` | Data retention window (`30d`, `7d`, `48h`, or `0` for unlimited) |
| `--max-events` | int | `100000` | Maximum event row capacity before pruning (`0` = unlimited) |
| `--prune-interval` | duration | `"1h"` | Background automated pruning frequency (`1h`, `30m`) |
| `--max-log-size` | string | `"50MB"` | Maximum access.log size before rotating to `access.log.1` |

---

## 9. Policy Static Analyzer & Linter (`audit`)

Perform deep static analysis and linting on a Routewarden policy file to catch ReDoS vulnerabilities, unescaped dots, universal wildcard traps, and header spoofing risks before deployment:

<CodeViewer :snippets="auditSnippets" />

### Flags

| Flag | Type | Default | Description |
|:---|:---|:---|:---|
| `[file]` | string | `"routewarden.json"` | Configuration file to audit (or `-` for stdin) |
| `-f`, `--format` | string | `"text"` | Output format: `text` (default), `json`, or `sarif` |
| `-s`, `--strict` | bool | `false` | Strict mode: exit code 1 on warnings as well as critical flaws |

---

## 10. Policy Diffing (`diff`)

Compare two Routewarden policy files and evaluate the security posture delta (e.g. relaxed, hardened, or neutral):

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

::: tip Turnkey Live Web Dashboard
To view live reverse proxy telemetry with a real-time web UI, world map, and threat intelligence, run `rwarden dashboard` directly.
:::

<CodeViewer :snippets="monitorSnippets" />

### Flags

| Flag | Shorthand | Type | Default | Description |
|:---|:---|:---|:---|:---|
| `--file` | `-f` | string | `""` | Log file to read from (default: stdin or auto-discovered docker) |
| `--follow` | `-F` | bool | `false` | Continuously follow log file for new changes (auto-detects rotation and truncation) |
| `--out` | `-o` | string | `""` | Output file to append monitored security events to (Combined log format) |
| `--docker` | — | bool | `false` | Explicitly enable Docker container auto-discovery |
| `--container` | `-c` | string | `""` | Tail a specific Docker container by name or ID |
| `--label` | `-l` | string | `""` | Docker label to filter containers (default: `routewarden=true`) |
| `--wait` | `-w` | bool | `false` | Wait and retry if no matching containers are running initially |
| `--tail` | — | string | `"50"` | Initial lines to tail from Docker container(s) or file |
| `--raw` | — | bool | `false` | Output raw unformatted log lines (ideal for piping into analyzers or jq) |
| `--verdict` | — | string | `""` | Filter events by verdict (`BLOCK`, `ALLOW`, `TARPIT`) |
| `--ip` | — | string | `""` | Filter events by client IP substring |
| `--path` | — | string | `""` | Filter events by request path substring |

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

Manage distributed enrollment keys for remote log shippers. When running a central Routewarden security dashboard, use `rwarden keys` to create and revoke credentials:

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

Enroll a remote node with a central Routewarden dashboard. This one-time handshake validates the agent token, downloads the central server's X25519 public key, and saves configuration to `~/.routewarden/agent.json`:

<CodeViewer :snippets="registerSnippets" />

### Flags

| Flag | Shorthand | Type | Required | Description |
|:---|:---|:---|:---|:---|
| `--url` | `-u` | string | **Yes** | Routewarden Central Dashboard URL (e.g. `http://dashboard.internal:7890`) |
| `--key` | `-k` | string | **Yes** | Remote agent authentication key (`rw_sec_...`) |
| `--config` | — | string | No | Custom path to store agent configuration (default: `~/.routewarden/agent.json`) |
| `--status` | `-s` | string | No | Forward HTTP requests matching status codes or ranges (e.g. `'400-599, 301'`, `'4xx, 5xx'`) |
| `--include-failed` | `-F` | bool | No | Legacy alias: persist setting to ship all failed HTTP requests (status >= 400) |
| `--all-traffic` | — | bool | No | Persist default setting to ship all HTTP access traffic |

---

## 17. Distributed Log Shipper (`push`)

Stream live security events and gateway access logs from remote edge nodes, cloud servers, or local containers to the central Routewarden dashboard with end-to-end asymmetric encryption (X25519 ECDH + AES-256-GCM):

<CodeViewer :snippets="pushSnippets" />

### Subcommands & Flags

| Command / Flag | Shorthand | Type | Default | Description |
|:---|:---|:---|:---|:---|
| `status`, `ps` | — | subcommand | — | Check running status, PID, and target URL of background shipper |
| `stop`, `down` | — | subcommand | — | Gracefully stop running background shipper daemon |
| `--detach` | `-d` | bool | `false` | Run shipper in background (detached) daemon mode |
| `--docker` | — | bool | `false` | Auto-discover and tail Docker containers. Can run concurrently with `--file` and `--container` |
| `--container` | `-c` | string | `""` | Tail specific Docker container(s) by name or ID (repeatable or comma-separated) |
| `--file` | `-f` | string | `""` | Tail and ship events from log file(s) (repeatable, comma-separated, or glob pattern `*.log`) |
| `--label` | `-l` | string | `"routewarden=true"` | Custom Docker label filter |
| `--tail` | — | string | `"50"` | Initial lines to tail from Docker container(s) and log file(s) |
| `--batch-size` | — | int | `50` | Maximum events to buffer in memory before flushing |
| `--flush-interval` | — | duration | `1s` | Maximum duration before flushing partial buffer |
| `--queue-size` | — | int | `10000` | Maximum events to buffer in memory while disconnected from dashboard |
| `--disconnect-timeout` | — | duration | `5m` | Duration disconnected from dashboard before dropping stale events |
| `--ping-interval` | — | duration | `10s` | Interval between connection health pings when connected |
| `--status` | `-s` | string | `""` | Forward HTTP requests matching status codes or ranges (e.g. `'400-599, 301'`, `'4xx, 5xx'`) across Caddy, Traefik, and NGINX |
| `--include-failed` | `-F` | bool | `false` | Legacy alias: ship all failed HTTP requests (status >= 400, equivalent to `--status 400-599`) |
| `--all-traffic` | — | bool | `false` | Ship all HTTP access traffic including successful 200 OK responses |
| `--all-logs` | — | bool | `false` | Ship all raw container lines without filtering (default filters for Routewarden events & security blocks) |
| `--url` | `-u` | string | `""` | Override central dashboard URL from registered config |
| `--key` | `-k` | string | `""` | Override agent authentication key from registered config |
| `--config` | — | string | `~/.routewarden/agent.json` | Custom path to agent configuration file |

---

## 18. Daemon Process Management (`status`, `stop`)

Manage background daemons spawned with `--detach` (`-d`). Routewarden manages daemon state via PID files in `~/.routewarden/*.pid` and redirects detached logs to `~/.routewarden/*.log`:

<CodeViewer :snippets="daemonSnippets" />

### Daemon Subsystems & Files

| Subsystem | PID File | Detached Log File | Description |
|:---|:---|:---|:---|
| `dashboard` | `~/.routewarden/dashboard.pid` | `~/.routewarden/dashboard.log` | Central SOC Security Dashboard web server and SSE stream |
| `push` | `~/.routewarden/push.pid` | `~/.routewarden/push.log` | Background remote log shipper daemon |
| `tcp` | `~/.routewarden/tcp.pid` | `~/.routewarden/tcp.log` | High-performance L4 TCP/UDP security proxy daemon |

---

## 19. L4 TCP/UDP Reverse Proxy (`tcp`)

Routewarden CLI natively integrates an ultra-high performance Layer 4 reverse proxy with protocol-aware inspection (HTTP, TLS SNI, SSH, Redis, PostgreSQL, MySQL), geo-fencing, IP ban persistence, rate limiting, and CrowdSec remediation:

<CodeViewer :snippets="tcpSnippets" />

### Subcommands & Flags

| Command / Flag | Shorthand | Type | Default | Description |
|:---|:---|:---|:---|:---|
| `up`, `start` | — | subcommand | — | Start TCP/UDP proxy (default action when omitting subcommand) |
| `down`, `stop` | — | subcommand | — | Gracefully stop running background proxy daemon |
| `status`, `ps` | — | subcommand | — | Check running status, PID, and uptime of background proxy daemon |
| `reload` | — | subcommand | — | Reload configuration file on running daemon without dropping live connections (`SIGHUP`) |
| `validate` | — | subcommand | — | Validate proxy configuration YAML syntax and protocol definitions |
| `plugins` | — | subcommand | — | Manage protocol inspection plugins (`list`, `test`, `install`) |
| `version` | `-v` | subcommand | — | Display TCP proxy engine version (`rwarden tcp version`) |
| `--config` | `-c` | string | `tcp-warden.yaml` | Path to YAML configuration file (falls back to `ROUTEWARDEN_CONFIG`) |
| `--detach` | `-d` | bool | `false` | Run proxy in background (detached) daemon mode |
| `--verbose` | `-v` | bool | `false` | Enable verbose operational logging |

### Standalone Binary & Container

For edge architectures where only L4 proxying is desired, a dedicated standalone binary (`tcp-warden`), native Linux packages (`.deb`, `.rpm`, `.apk`), Homebrew Cask (`brew install routewarden/tap/tcp-warden`), and minimal Alpine container (`ghcr.io/routewarden/tcp-warden:latest`, &lt;15MB) are provided alongside the unified `rwarden` binary. See [Getting Started with TCP Warden](/tcp/getting-started) and [Installation Guide](/cli/installation) for full installation instructions.




