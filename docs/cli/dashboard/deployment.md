---
title: Standalone Docker Compose Deployment — Routewarden Dashboard
description: Deploy Routewarden's native SOC security dashboard in production using standalone Docker Compose.
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

# 2. Launch native SOC dashboard with Docker Compose
docker compose up -d

# 3. View live dashboard in browser
# 👉 http://localhost:7890`,
})

const export_cmd_docker = buildSnippet({
  lang: 'bash',
  code: `# Export configs using the Routewarden CLI container image
# (no local rwarden binary required)
docker run --rm \\
  -v "$(pwd)/dashboard:/data" \\
  ghcr.io/routewarden/cli:latest \\
  dashboard export /data

# The exported directory contains:
#  dashboard/
#  ├── docker-compose.yml
#  └── README.md

# Bring the dashboard up with Docker Compose
cd dashboard
docker compose up -d

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
  dashboard:
    image: ghcr.io/routewarden/cli:latest
    container_name: routewarden-dashboard
    restart: unless-stopped
    command: dashboard --port 7890 --no-open
    ports:
      - "\${PORT:-7890}:7890"
    volumes:
      # Mount Docker socket for automatic reverse proxy log discovery
      - /var/run/docker.sock:/var/run/docker.sock:ro
      # Persist SQLite telemetry database across container restarts
      - routewarden-data:/root/.routewarden/dashboard
    environment:
      - TZ=UTC

volumes:
  routewarden-data:
    name: routewarden-dashboard-data`,
})

const composeSnippets = computed(() => ({
  cli: [
    { filename: 'docker-compose.yml', lang: 'yaml', code: compose_full.cleanCode, html: compose_full.html, hasDiff: false },
  ],
}))

// ─── 3. Multi-Node Compose Snippet ──────────────────────────────────────────
const compose_multi = buildSnippet({
  lang: 'yaml',
  code: `services:
  # Central SOC Dashboard
  dashboard:
    image: ghcr.io/routewarden/cli:latest
    container_name: routewarden-dashboard
    restart: unless-stopped
    command: dashboard --port 7890 --no-open
    ports:
      - "\${PORT:-7890}:7890"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - routewarden-data:/root/.routewarden/dashboard
    environment:
      - TZ=UTC

  # Edge Node / Remote Proxy Streamer (Optional Companion)
  streamer:
    image: ghcr.io/routewarden/cli:latest
    container_name: routewarden-streamer
    restart: unless-stopped
    command: monitor --raw --stream-to http://dashboard:7890 --agent-id edge-us-east
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    depends_on:
      - dashboard

volumes:
  routewarden-data:`,
})

const multiSnippets = computed(() => ({
  cli: [
    { filename: 'docker-compose.yml', lang: 'yaml', code: compose_multi.cleanCode, html: compose_multi.html, hasDiff: false },
  ],
}))
</script>

# Standalone Docker Compose Deployment

Routewarden allows you to export and deploy the native real-time security dashboard as a standalone **Docker Compose** service without needing the `rwarden` binary installed on your production servers.

---

## 1. Export the Stack

Export the embedded configuration files to any target directory:

<CodeViewer :snippets="exportSnippets" />

---

## 2. Docker Compose Configuration

The exported `docker-compose.yml` runs Routewarden's native SOC dashboard consuming **~8MB of RAM** with zero external dependencies:

<CodeViewer :snippets="composeSnippets" />

---

## 3. Distributed / Multi-Container Setup

For environments where proxy ingress logs originate across multiple microservice containers or edge instances, stream telemetry directly into the central dashboard:

<CodeViewer :snippets="multiSnippets" />

---

## 4. Telemetry Persistence & Storage

The native dashboard automatically initializes an embedded **SQLite** database (`events.db`) with Write-Ahead Logging (WAL) enabled:

- **Storage Location**: Inside the container at `/root/.routewarden/dashboard/events.db` (persisted via the `routewarden-data` Docker volume).
- **Zero-Latency Ingestion**: Asynchronous batch writes flushed every 200ms or 100 events.
- **30-Day Auto-Pruning**: Built-in pruning engine automatically removes events older than 30 days, capping disk usage to ~10–30 MB.
- **Restart Survival**: On container restart, all historical metrics, threat classifications, and active attacker hotspots are preserved.

---

## 5. Environment Variables & Options

| Variable / Flag | Default | Description |
|:---|:---|:---|
| `PORT` / `--port` | `7890` | Host port exposed for web UI, SSE streams, and REST API |
| `TZ` | `UTC` | Timezone for log timestamps and reporting |
| `GEOIP_DB` / `--geoip-db` | `Auto` | Optional path to custom MaxMind `GeoLite2-City.mmdb` or `GeoLite2-Country.mmdb` |
| `--no-open` | `false` | Disable automatic local browser launch (always set in Docker) |
