---
title: Real-Time Security Dashboard — RouteWarden CLI
description: Ultra-lightweight real-time SOC security dashboard powered by embedded SQLite (~8MB RAM) with SSE streaming for Traefik, Caddy, NGINX, and TCP Warden.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

// ─── 0. Architecture Overview Mermaid & Diagram Snippet ─────────────────────
const mermaid_raw = `flowchart LR
    subgraph Gateways ["RouteWarden Gateways"]
        T["Traefik (routewarden=true)"]
        C["Caddy (routewarden=true)"]
        N["NGINX (routewarden=true)"]
        TCP["TCP Warden (routewarden=true)"]
    end

    subgraph Monitor ["Log Discovery & Multiplexer"]
        M["rwarden monitor\\n(Docker Socket Discovery)"]
    end

    subgraph Engine ["Live Analytics & SQLite Engine"]
        G["RouteWarden SOC Engine\\n(Embedded SQLite + SSE Stream)"]
    end

    subgraph UI ["Real-Time Dashboard"]
        W["Web UI (http://localhost:7890)\\n(Live SSE Telemetry Stream)"]
    end

    T -->|stdout/stderr| M
    C -->|stdout/stderr| M
    N -->|stdout/stderr| M
    TCP -->|stdout/stderr| M

    M -->|Structured Log Stream| G
    G -->|SSE & HTML| W`

const arch_graph_svg = `<div class="rw-graph-container" style="padding:20px;text-align:center;">
  <p style="color:#a1a1aa;">Real-time SOC Architecture: Gateways &rarr; rwarden monitor &rarr; RouteWarden SOC Engine &rarr; Web UI (http://localhost:7890)</p>
</div>`

const archSnippets = computed(() => ({
  cli: [
    { filename: 'Architecture Graph', lang: 'mermaid', code: mermaid_raw, html: arch_graph_svg, hasDiff: false },
  ],
}))

// ─── 1. CLI Management Snippets ─────────────────────────────────────────────
const dashboard_up = buildSnippet({
  lang: 'bash',
  code: `# 1. Start the security dashboard (auto-discovers labeled containers & opens http://localhost:7890)
rwarden dashboard

# 2. Launch in background (detached daemon mode)
rwarden dashboard -d
# or
rwarden dashboard up --detach

# 3. Launch with optional HTTP Basic Auth protection
rwarden dashboard up --auth admin:supersecret

# 4. Start on a custom port and bind to localhost only without opening browser
rwarden dashboard up --port 8080 --host 127.0.0.1 --no-open

# 5. Monitor a specific container by name or ID
rwarden dashboard --container traefik

# 6. Monitor an NGINX or Apache access log file
rwarden dashboard --file /var/log/nginx/access.log`,
})

const dashboard_status = buildSnippet({
  lang: 'bash',
  code: `# View running status of dashboard
rwarden dashboard status
# or
rwarden status dashboard`,
})

const dashboard_down = buildSnippet({
  lang: 'bash',
  code: `# Stop the running dashboard daemon
rwarden dashboard stop
# or
rwarden stop dashboard`,
})

const dashboard_export = buildSnippet({
  lang: 'bash',
  code: `# Export docker-compose.yml and configuration assets to a local directory
rwarden dashboard export ./deploy/dashboard`,
})

const cliSnippets = computed(() => ({
  cli: [
    { filename: 'Launch Dashboard', lang: 'bash', code: dashboard_up.cleanCode, html: dashboard_up.html, hasDiff: false },
    { filename: 'Check Status', lang: 'bash', code: dashboard_status.cleanCode, html: dashboard_status.html, hasDiff: false },
    { filename: 'Stop Dashboard', lang: 'bash', code: dashboard_down.cleanCode, html: dashboard_down.html, hasDiff: false },
    { filename: 'Export Configs', lang: 'bash', code: dashboard_export.cleanCode, html: dashboard_export.html, hasDiff: false },
  ],
}))

// ─── 2. Compose Snippet ─────────────────────────────────────────────────────
const export_cmd = buildSnippet({
  lang: 'bash',
  code: `# Export dashboard configuration to local directory
rwarden dashboard export ./dashboard
cd ./dashboard

# Launch standalone SOC dashboard with Docker Compose
docker compose up -d`,
})

const compose_yaml = buildSnippet({
  lang: 'yaml',
  code: `services:
  dashboard:
    # Dedicated lightweight dashboard image (~11MB) or full toolkit ghcr.io/routewarden/cli:latest
    image: ghcr.io/routewarden/dashboard:latest
    container_name: routewarden-dashboard
    restart: unless-stopped
    command: up --port 7890 --no-open
    ports:
      - "\${PORT:-7890}:7890"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ~/.routewarden/dashboard:/root/.routewarden/dashboard`,
})

const composeSnippets = computed(() => ({
  cli: [
    { filename: 'Export & Launch Commands', lang: 'bash', code: export_cmd.cleanCode, html: export_cmd.html, hasDiff: false },
    { filename: 'docker-compose.yml', lang: 'yaml', code: compose_yaml.cleanCode, html: compose_yaml.html, hasDiff: false },
  ],
}))

// ─── 3. Container Discovery Snippets ─────────────────────────────────────────
const discovery_compose = buildSnippet({
  lang: 'yaml',
  code: `services:
  traefik:
    image: traefik:v3.1
    labels:
      # Opt-in for RouteWarden auto-discovery
      - "routewarden=true"

  caddy:
    image: caddy:2-alpine
    labels:
      - "routewarden.logs=true"

  nginx:
    image: openresty/openresty:alpine
    labels:
      - "routewarden=true"`,
})

const discovery_cli = buildSnippet({
  lang: 'bash',
  code: `# Tag container on creation with Docker CLI
docker run -d \\
  --name traefik-edge \\
  --label routewarden=true \\
  -p 80:80 -p 443:443 \\
  traefik:v3.1

# Or tail a container directly without labels
rwarden dashboard --container traefik-edge`,
})

const discoverySnippets = computed(() => ({
  cli: [
    { filename: 'Docker Compose (Opt-In Labels)', lang: 'yaml', code: discovery_compose.cleanCode, html: discovery_compose.html, hasDiff: false },
    { filename: 'Docker CLI & Direct Target', lang: 'bash', code: discovery_cli.cleanCode, html: discovery_cli.html, hasDiff: false },
  ],
}))
</script>

# Real-Time Security Dashboard (`dashboard`)

RouteWarden includes a turnkey, ultra-lightweight real-time security dashboard powered by RouteWarden's embedded Go server and SQLite persistence.

It provides an ultra-fast, live executive SOC dashboard consuming only **~8MB of RAM** with zero external dependencies.

---

## Performance & Resource Efficiency

| Metric | Traditional Monitoring Stacks | RouteWarden SOC Dashboard |
|:---|:---|:---|
| **Memory Footprint** | ~500 MB – 1.2 GB RAM | **~8 MB RAM** |
| **Containers Required** | Multiple heavy containers | **0 containers** (runs in single binary) |
| **Startup Time** | 15–30 seconds | **Instant (< 50ms)** |
| **Real-time Updates** | Polling intervals (5s–10s) | **Real-time SSE (< 10ms)** |
| **Storage Overhead** | Heavy time-series volumes | **Embedded SQLite WAL** (with 30-day auto-prune) |
| **Configuration** | Complex multi-file configs | **Zero configuration** |

---

## Architecture Overview

<CodeViewer :snippets="archSnippets" />

---

## Key SOC Capabilities

### 1. Embedded SQLite Telemetry Persistence
- Logs and security events are buffered and asynchronously written to `~/.routewarden/dashboard/events.db` in WAL mode every 200ms or 100 events.
- **Restart Survival**: Historical metrics, threat breakdown ratios, and top attacking IPs persist across dashboard restarts.
- **Auto-Pruning**: Telemetry older than 30 days is automatically pruned to keep disk usage lean (~10–30 MB).

### 2. Live SOC Stream, Pagination & Stream Controls
- **Verdict Tabs**: Filter stream instantly by `ALL`, `BLOCK` (🛑), `TARPIT` (⏳), or `ALLOW` (🛡️).
- **Connected Node & Source Filtering**: Dedicated `📡 All Nodes` matrix dropdown and interactive badges in the `🌐 MONITORED NODES` ribbon with active glow states to isolate events by container, remote agent, or log file.
- **Server-Backed Pagination**: High-throughput SQLite pagination with selectable page sizes (`25`, `50`, `100`, `250`), direct page jump, First / Prev / Next / Last buttons, and keyboard controls (<kbd>[</kbd> / <kbd>]</kbd> or Left/Right arrows).
- **Time Range Selector**: Rolling time windows (`1m`, `5m`, `15m`, `30m`, `1h`, `6h`, `24h`, `Custom Date Range`) querying SQLite directly via `GET /api/logs`.
- **Stream Pause / Resume**: Freeze table updates with **⏸ Pause** or <kbd>Space</kbd> to inspect active security events; incoming logs are buffered with a counter badge (`⏸ PAUSED (+N new)`).

### 3. Password Protection & Custom Auth Screen (`--auth`)
- **Dedicated Cyber Auth Screen**: When `--auth <user:password>` is enabled, browser visits to `http://localhost:7890` are presented with a sleek, cyber-themed authentication screen (`/login`) complete with the RouteWarden shield logo, operator ID & access key inputs, password visibility toggle, and error messaging.
- **Session Cookie & Sign Out**: Successful login issues a secure session cookie (`routewarden_auth`) with 30-day persistence. Operators can sign out at any time via the **🚪 Sign Out** button in the dashboard header.
- **Protected Endpoints**: Protects `GET /`, `/api/logs`, `/api/stream`, `/api/stats`, `/api/sources`, and `/api/ip-lookup`.
- **Flexible Auth Channels**: Supports standard HTTP Basic Auth (`Authorization: Basic`), `Authorization: Bearer <token>`, session cookies, and query parameters (`?auth=` / `?token=`).
- **Whitelisted Endpoints**: Static branding assets (`/favicon.ico`, `/icon.svg`) and cryptographic agent ingestion (`/api/v1/*`) remain open so remote edge agents can push without knowing dashboard passwords.
- **HUD Indicator**: Active cyan `🔒 AUTH: <username>` badge in the sticky topbar.

### 4. Mobile & Tablet Optimization
- **Responsive Layout (< 768px & < 480px)**: Complete mobile optimization with touch-friendly 36–44px controls and viewport-fit formatting.
- **Compact 2-Column KPI Grid**: Displays all critical security indicators (Blocks, Tarpits, Total Events, EPS) in a neat 2-column layout instead of oversized vertical scrolling cards.
- **Mobile Cyber Hero**: Automatically replaces the large raw ASCII banner with a clean, branded mobile hero header on smaller screens to prevent horizontal overflow.
- **Touch-Optimized Filters & Search**: Full-width search bar and grid-based filter dropdowns with 16px inputs that prevent iOS auto-zooming.
- **Mobile Bottom-Sheet Modals**: IP Threat Dossiers and Event Detail inspectors transition to native-feeling bottom sheets on mobile devices.
- **Auto-Hiding Desktop Shortcuts**: The fixed bottom keyboard shortcut bar automatically hides on touch devices to maximize screen real estate.

### 5. Threat Intelligence Dossier
- Inspect top attacking client IPs and click any row to reveal autonomous systems (ASN), reverse DNS, origin country, CIDR prefix, and one-click AbuseIPDB lookup.

### 6. Keyboard Shortcuts (Desktop)
- <kbd>Space</kbd> — Stream Pause / Resume
- <kbd>T</kbd> — Toggle Theme (Auto / Light / Dark)
- <kbd>W</kbd> — Focus Time Range filter
- <kbd>/</kbd> — Focus Search / Grep filter
- <kbd>F</kbd> — Focus Country filter
- <kbd>[</kbd> / <kbd>]</kbd> (or <kbd>&larr;</kbd> / <kbd>&rarr;</kbd>) — Previous / Next Page in log stream
- <kbd>R</kbd> — Reset all active filters
- <kbd>ESC</kbd> — Close active modal dialog

---

## Quick Start CLI Management (`rwarden dashboard`)

The RouteWarden CLI embeds all dashboard assets, SQLite migrations, and templates directly in the binary. You can launch, inspect, and stop the dashboard with single commands:

<CodeViewer :snippets="cliSnippets" />

When launched, `rwarden dashboard` starts an internal HTTP server and SSE stream on:
👉 **`http://localhost:7890`**

---

## How Container Discovery Works

`rwarden dashboard` automatically inspects running Docker containers via `/var/run/docker.sock` and auto-tails any container labeled with `routewarden=true` or `routewarden.logs=true`:

<CodeViewer :snippets="discoverySnippets" />

Containers with `routewarden.logs=true` are also automatically recognized. If multiple containers are discovered (e.g. `traefik`, `caddy`, and `nginx`), their log streams are multiplexed concurrently into the dashboard in real time with individual node attribution.

---

## Standalone Docker Compose Deployment

If you prefer deploying the dashboard without the CLI binary, export the configuration and run with Docker Compose:

<CodeViewer :snippets="composeSnippets" />

---

## Command Reference

| Subcommand / Flag | Type | Default | Description |
|:---|:---|:---|:---|
| `up`, `start` | subcommand | — | Launch real-time SOC security dashboard (default) |
| `down`, `stop` | subcommand | — | Stop running background dashboard daemon |
| `status`, `ps` | subcommand | — | Display running status, PID, and URL of dashboard |
| `export [dir]` | subcommand | `./dashboard` | Export compose and configuration assets to disk |
| `-d`, `--detach` | bool | `false` | Run dashboard in background (detached) daemon mode |
| `-a`, `--auth` | string | `""` | Optional HTTP Basic Auth credentials (`user:password` or `RW_DASHBOARD_AUTH`) |
| `--user` | string | `""` | Optional Basic Auth username (used with `--password`) |
| `--password` | string | `""` | Optional Basic Auth password (used with `--user`) |
| `--host` | string | `""` | Host IP interface to bind (e.g. `127.0.0.1` or `0.0.0.0`, default: all interfaces) |
| `--port` | int | `7890` | Port for SOC dashboard UI and SSE stream |
| `-f`, `--file` | string | `""` | Log file to monitor (default: auto-discovered Docker containers) |
| `-c`, `--container` | string | `""` | Tail a specific Docker container by name or ID |
| `-l`, `--label` | string | `"routewarden=true"` | Docker label to filter containers |
| `--dir` | string | `~/.routewarden/dashboard` | Working directory storing dashboard files |
| `--no-open` | bool | `false` | Do not automatically launch the browser upon startup |
