---
title: Standalone Docker Compose Deployment — RouteWarden Dashboard
description: Deploy RouteWarden's GoAccess real-time security dashboard in production using standalone Docker Compose.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../../.vitepress/theme/composables/useCodeSnippet'

// ─── 1. Export Snippets ─────────────────────────────────────────────────────
const export_cmd = buildSnippet({
  lang: 'bash',
  code: `# 1. Export dashboard configuration to local directory
rwarden dashboard export ./dashboard
cd ./dashboard

# 2. Option A: Launch dashboard reading an existing log file
docker compose up -d

# 2. Option B: Launch dashboard AND auto-fetch logs from Docker containers
docker compose --profile monitor up -d`,
})

const export_cmd_docker = buildSnippet({
  lang: 'bash',
  code: `# Export configs using the RouteWarden CLI container image
# (no local rwarden binary required)
docker run --rm \\
  -v "$(pwd)/dashboard:/data" \\
  ghcr.io/routewarden/cli:latest \\
  dashboard export /data

# The exported directory contains:
#  dashboard/
#  ├── docker-compose.yml
#  ├── goaccess.conf
#  └── README.md

# Bring the dashboard up with Docker Compose (auto-fetching Docker logs)
cd dashboard
docker compose --profile monitor up -d

# Check live logs
docker compose logs -f

# Tear down
docker compose down`,
})

const exportSnippets = computed(() => ({
  cli: [
    { filename: 'Using rwarden CLI', lang: 'bash', code: export_cmd.cleanCode, html: export_cmd.html, hasDiff: false },
    { filename: 'Using Docker Image', lang: 'bash', code: export_cmd_docker.cleanCode, html: export_cmd_docker.html, hasDiff: false },
  ],
}))

// ─── 2. Compose File Snippet ────────────────────────────────────────────────
const compose_full = buildSnippet({
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
      - ./data:/srv/data
      - ./report:/srv/report
    entrypoint:
      - /bin/sh
      - -c
      - |
        mkdir -p /srv/data
        touch /srv/data/access.log
        exec goaccess /srv/data/access.log \\
          --config-file=/etc/goaccess/goaccess.conf \\
          --real-time-html \\
          --port=7890 \\
          --addr=0.0.0.0 \\
          -o /srv/report/index.html

  # Optional companion service: automatically discovers and tails reverse proxy containers labeled 'routewarden=true'
  # Usage: docker compose --profile monitor up -d
  monitor:
    image: ghcr.io/routewarden/cli:latest
    container_name: routewarden-monitor
    restart: unless-stopped
    profiles:
      - monitor
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./data:/data
    entrypoint:
      - /bin/sh
      - -c
      - |
        mkdir -p /data
        touch /data/access.log
        exec rwarden monitor --raw --wait --out=/data/access.log`,
})

const composeSnippets = computed(() => ({
  cli: [
    { filename: 'docker-compose.yml', lang: 'yaml', code: compose_full.cleanCode, html: compose_full.html, hasDiff: false },
  ],
}))

// ─── 3. GoAccess Config Snippet ─────────────────────────────────────────────
const conf_snippet = buildSnippet({
  lang: 'properties',
  code: `# RouteWarden — GoAccess Security Dashboard Configuration
log-format COMBINED
date-format %d/%b/%Y
time-format %H:%M:%S

real-time-html true
port 7890
addr 0.0.0.0
ws-url ws://localhost:7890/ws

agent-list false
with-output-resolver true
keep-last 10000

html-report-title RouteWarden — Threat & Security Intelligence
html-refresh 2
html-prefs {"theme":"darkGray","perPage":25,"autoHideTables":true}`,
})

const confSnippets = computed(() => ({
  cli: [
    { filename: 'goaccess.conf', lang: 'properties', code: conf_snippet.cleanCode, html: conf_snippet.html, hasDiff: false },
  ],
}))
</script>

# Standalone Docker Compose Deployment

RouteWarden allows you to export and deploy the GoAccess security dashboard as a standalone **Docker Compose** service without needing the `rwarden` binary installed on your production servers.

---

## 1. Export the Stack

Export the embedded configuration files to any target directory:

<CodeViewer :snippets="exportSnippets" />

---

## 2. Docker Compose Configuration

The exported `docker-compose.yml` runs the official `allinurl/goaccess` image consuming **~15MB of RAM**:

<CodeViewer :snippets="composeSnippets" />

---

## 3. GoAccess Configuration

The `goaccess.conf` file pre-configures real-time WebSocket streaming, dark mode theme, and Apache/Nginx Combined log parsing:

<CodeViewer :snippets="confSnippets" />

---

## 4. Environment Variables

| Variable | Default | Description |
|:---|:---|:---|
| `PORT` | `7890` | Port exposed on the host for the web UI and WebSocket |
| `TZ` | `UTC` | Timezone for log timestamps and reporting |
