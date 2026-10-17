---
title: Real-Time Security Dashboard (GoAccess) — RouteWarden CLI
description: Ultra-lightweight real-time security dashboard powered by GoAccess (~15MB RAM) with WebSocket streaming for Traefik, Caddy, NGINX, and TCP Warden.
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

    subgraph Engine ["Live Analytics & WebSocket"]
        G["GoAccess Engine\\n(In-Memory Threat Matrix)"]
    end

    subgraph UI ["Real-Time Dashboard"]
        W["Web UI (http://localhost:7890)\\n(Real-Time WebSocket Stream)"]
    end

    T -->|stdout/stderr| M
    C -->|stdout/stderr| M
    N -->|stdout/stderr| M
    TCP -->|stdout/stderr| M

    M -->|Combined Log Stream| G
    G -->|WebSocket & HTML| W`

const arch_graph_svg = `<div class="rw-graph-container" style="padding:20px;text-align:center;">
  <p style="color:#a1a1aa;">Real-time GoAccess Architecture: Gateways &rarr; rwarden monitor &rarr; GoAccess Engine &rarr; Web UI (http://localhost:7890)</p>
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

# 2. Start on a custom port without auto-opening the browser
rwarden dashboard up --port 8080 --no-open

# 3. Monitor a specific container
rwarden dashboard --container traefik

# 4. Monitor an NGINX or Apache access log file
rwarden dashboard --file /var/log/nginx/access.log`,
})

const dashboard_status = buildSnippet({
  lang: 'bash',
  code: `# View running status of dashboard
rwarden dashboard status`,
})

const dashboard_down = buildSnippet({
  lang: 'bash',
  code: `# Stop the dashboard
rwarden dashboard down`,
})

const dashboard_export = buildSnippet({
  lang: 'bash',
  code: `# Export docker-compose.yml, goaccess.conf, and README.md to a local directory
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
const compose_yaml = buildSnippet({
  lang: 'yaml',
  code: `services:
  goaccess:
    image: allinurl/goaccess:latest
    container_name: routewarden-dashboard
    restart: unless-stopped
    ports:
      - "\${PORT:-7890}:7890"
    environment:
      - TZ=UTC
    volumes:
      - ./goaccess.conf:/etc/goaccess/goaccess.conf:ro
      - ./data:/srv/data:ro
      - ./report:/srv/report
    command: >
      goaccess /srv/data/access.log
      --config-file=/etc/goaccess/goaccess.conf
      --real-time-html
      --port=7890
      --addr=0.0.0.0
      -o /srv/report/index.html`,
})

const composeSnippets = computed(() => ({
  cli: [
    { filename: 'docker-compose.yml', lang: 'yaml', code: compose_yaml.cleanCode, html: compose_yaml.html, hasDiff: false },
  ],
}))
</script>

# Real-Time Security Dashboard (`dashboard`)

RouteWarden includes a turnkey, ultra-lightweight real-time security dashboard powered by [GoAccess](https://goaccess.io/) and `rwarden monitor`.

It replaces heavy multi-container monitoring stacks (Grafana + Loki + Alloy) with an in-memory dashboard consuming only **~15MB of RAM**.

---

## Why GoAccess Instead of Grafana?

| Metric | Grafana + Loki + Alloy Stack | RouteWarden GoAccess Dashboard |
|:---|:---|:---|
| **Memory Footprint** | ~500 MB – 1.2 GB RAM | **~15 MB – 25 MB RAM** |
| **Containers Required** | 3 containers (`grafana`, `loki`, `alloy`) | **0 containers** (or 1 optional 10MB container) |
| **Startup Time** | 15–30 seconds | **Instant (< 100ms)** |
| **Real-time Updates** | Polling intervals (5s–10s) | **Real-time WebSockets (< 50ms)** |
| **Storage Overhead** | Persistent chunks & index volumes | **In-memory** / zero disk clutter |
| **Configuration** | Complex LogQL, Alloy river configs | **Zero configuration** |

---

## Architecture Overview

<CodeViewer :snippets="archSnippets" />

---

## Quick Start CLI Management (`rwarden dashboard`)

The RouteWarden CLI embeds all GoAccess configuration and Docker Compose templates directly in the binary. You can launch, inspect, and stop the dashboard with single commands:

<CodeViewer :snippets="cliSnippets" />

When launched, `rwarden dashboard` starts an internal HTTP server and WebSocket proxy on:
👉 **`http://localhost:7890`**

---

## How Container Discovery Works

`rwarden dashboard` automatically inspects running Docker containers via `/var/run/docker.sock` and auto-tails any container labeled with:

```yaml
labels:
  - "routewarden=true"
```

Containers with `routewarden.logs=true` are also automatically recognized. If multiple containers are discovered (e.g. `traefik`, `caddy`, and `nginx`), their log streams are multiplexed concurrently into the dashboard in real time.

---

## Standalone Docker Compose Deployment

If you prefer deploying the dashboard without the CLI binary, export the configuration:

```bash
rwarden dashboard export ./dashboard
cd ./dashboard
docker compose up -d
```

<CodeViewer :snippets="composeSnippets" />

---

## Command Reference

| Subcommand / Flag | Type | Default | Description |
|:---|:---|:---|:---|
| `up` | subcommand | — | Launch GoAccess real-time security dashboard (default) |
| `down` | subcommand | — | Stop and tear down running dashboard containers |
| `status` | subcommand | — | Display status of dashboard |
| `export [dir]` | subcommand | `./dashboard` | Export compose and GoAccess configs to disk |
| `--port` | int | `7890` | Port for GoAccess dashboard UI and WebSocket |
| `-f`, `--file` | string | `""` | Log file to monitor (default: auto-discovered Docker containers) |
| `-c`, `--container` | string | `""` | Tail a specific Docker container by name or ID |
| `-l`, `--label` | string | `"routewarden=true"` | Docker label to filter containers |
| `--dir` | string | `~/.routewarden/dashboard` | Working directory storing dashboard files |
| `--no-open` | bool | `false` | Do not automatically launch the browser upon startup |
