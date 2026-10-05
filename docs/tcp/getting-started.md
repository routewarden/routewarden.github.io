---
title: Getting Started with TCP Warden
description: Install and deploy TCP Warden via standalone binary or Docker Compose with persistent volume mounts.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

// ─── Deployment Snippets ────────────────────────────────────────────────────
const compose_file = buildSnippet({
  lang: 'yaml',
  code: `services:
  tcp-warden:
    image: ghcr.io/routewarden/tcp-warden:latest
    container_name: tcp-warden
    restart: unless-stopped
    # Linux: 'network_mode: host' for raw socket IP visibility.
    # macOS/Windows: use 'ports:' (e.g. "9091:9091", "2222:2222") instead.
    network_mode: host
    environment:
      - AUTO_INSTALL_PLUGINS=ssh postgres # Optional: auto-install plugins on boot
    volumes:
      - tcp-warden-config:/etc/routewarden
      - tcp-warden-data:/var/lib/routewarden
      - tcp-warden-logs:/var/log/routewarden

volumes:
  tcp-warden-config:
  tcp-warden-data:
  tcp-warden-logs:`
})

const compose_launch = buildSnippet({
  lang: 'bash',
  code: `# Start the daemon
docker compose up -d

# Tail daemon logs
docker compose logs -f tcp-warden

# Check health endpoint
curl -s http://127.0.0.1:9091/health`
})

const binary_install = buildSnippet({
  lang: 'bash',
  code: `# Clone and build from source
git clone https://github.com/routewarden/tcp-warden.git
cd tcp-warden
go build -o tcp-warden .

# Run daemon
./tcp-warden run --config tcp-warden.yaml`
})

const deploySnippets = computed(() => ({
  tcp: [
    { filename: 'docker-compose.yml', lang: 'yaml', code: compose_file.cleanCode, html: compose_file.html, hasDiff: false },
    { filename: 'Docker CLI', lang: 'bash', code: compose_launch.cleanCode, html: compose_launch.html, hasDiff: false },
    { filename: 'Binary (Go)', lang: 'bash', code: binary_install.cleanCode, html: binary_install.html, hasDiff: false },
  ]
}))

// ─── Verification Snippets ──────────────────────────────────────────────────
const verify_health = buildSnippet({
  lang: 'bash',
  code: `# Health check
curl -s http://127.0.0.1:9091/health
# {"status":"ok","version":"3.3.0"}

# Active service stats
curl -s http://127.0.0.1:9091/stats

# Query service status
./tcp-warden status --api http://127.0.0.1:9091`
})

const verify_events = buildSnippet({
  lang: 'bash',
  code: `# Stream real-time connection events (Server-Sent Events)
curl -N http://127.0.0.1:9091/events

# Sample output:
# data: {"service":"ssh","client_ip":"198.51.100.22","country":"CN","action":"auth_failure","reason":"attempt 1/3","timestamp":"2026-09-25T21:45:00Z"}`
})

const verifySnippets = computed(() => ({
  tcp: [
    { filename: 'Health & Stats', lang: 'bash', code: verify_health.cleanCode, html: verify_health.html, hasDiff: verify_health.hasDiff },
    { filename: 'Live Events (SSE)', lang: 'bash', code: verify_events.cleanCode, html: verify_events.html, hasDiff: verify_events.hasDiff },
  ]
}))
</script>

# Getting Started with TCP Warden

TCP Warden is distributed as a single static binary and as a multi-arch container image (`ghcr.io/routewarden/tcp-warden:latest`).

---

## Deployment Options

### Option 1: Docker Compose (Recommended)

Docker Compose provides automated persistent storage for configuration files, modular plugins, and audit logs.

<CodeViewer :snippets="deploySnippets" />

::: tip First-Run Template Auto-Creation
On initial boot, if `/etc/routewarden/tcp-warden.yaml` does not exist, TCP Warden automatically creates a fully-commented default configuration template in the `tcp-warden-config` volume.
:::

::: info Optional: CrowdSec Integration
CrowdSec integration is completely optional. If you want to connect TCP Warden to CrowdSec LAPI for collaborative threat intelligence, automated bouncers, and shared decision lists, follow the dedicated [CrowdSec Integration Guide](./crowdsec).
:::

---

## Verifying the Daemon

TCP Warden exposes an HTTP management endpoint on port `9091` (configurable via `api.listen`):

<CodeViewer :snippets="verifySnippets" />

Output of `./tcp-warden status`:
```
🛡️  TCP Warden Daemon Status (http://127.0.0.1:9091)
----------------------------------------------------------------------
SERVICE        PROTOCOL   ACTIVE CONNS   TOTAL ALLOWED   TOTAL BLOCKED
----------------------------------------------------------------------
ssh            ssh        0              12              1
smtp           smtp       0              5               0
```

---

## Directory & Volume Layout

When deployed in production, TCP Warden organizes files across dedicated paths:

| Path | Volume | What it stores |
| :--- | :--- | :--- |
| `/etc/routewarden/tcp-warden.yaml` | `tcp-warden-config` | Main configuration file (auto-generated on first boot). |
| `/var/lib/routewarden` | `tcp-warden-data` | Persistent runtime state: SQLite `bans.db`, installed plugins, and recompiled binary. |
| `/var/log/routewarden/tcp-warden.jsonl` | `tcp-warden-logs` | Structured audit log file recording all connection and security events. |

---

## Next Steps

- Explore [Configuration Reference](./configuration) to configure proxy listeners, rate limits, and GeoIP rules.
- Review [Modular Protocol Plugins](./plugins) to enable database and IoT protocol inspection.
- Optionally set up collaborative community threat defense with [CrowdSec Integration (Optional)](./crowdsec).
- Query health and stream events via [Management API & SSE](./api).

