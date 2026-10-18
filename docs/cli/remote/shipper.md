---
title: Remote Log Shipper (rwarden push)
description: Stream encrypted security logs from Docker containers or files with zero disk wear, in-memory buffering, and automatic failover retries.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../../.vitepress/theme/composables/useCodeSnippet'

// ─── 1. Zero-Flag Snippet ────────────────────────────────────────────────────
const push_cmd = buildSnippet({
  lang: 'bash',
  code: `# Zero-flag execution (reads ~/.routewarden/agent.json and auto-discovers containers)
rwarden push`,
})

const pushSnippets = computed(() => ({
  cli: [
    { filename: 'rwarden push', lang: 'bash', code: push_cmd.cleanCode, html: push_cmd.html, hasDiff: false },
  ],
}))

const push_output = buildSnippet({
  lang: 'plaintext',
  code: `🚀 RouteWarden Remote Shipper Starting...
─────────────────────────────────────────────────────────────
  Dashboard URL:   http://198.51.100.10:7890
  Agent Name:      edge-frankfurt-01
  Encryption:      🔒 End-to-End Encrypted (X25519 + AES-256-GCM)
  Auto-Discovery:  Watching Docker containers with label 'routewarden=true'
─────────────────────────────────────────────────────────────
Press Ctrl+C to stop.
🐳 [Docker] Attached to container: edge-traefik (4b7e89a1c2d3)`,
})

const pushOutputSnippets = computed(() => ({
  cli: [
    { filename: 'Shipper Startup Output', lang: 'plaintext', code: push_output.cleanCode, html: push_output.html, hasDiff: false },
  ],
}))

// ─── 2. Modes Snippets ───────────────────────────────────────────────────────
const mode_a_cmd = buildSnippet({
  lang: 'bash',
  code: `# Auto-discover all containers labeled routewarden=true
rwarden push --docker

# Or with custom discovery label
rwarden push --label "security.monitor=true"`,
})

const mode_a_yaml = buildSnippet({
  lang: 'yaml',
  code: `services:
  traefik:
    image: traefik:v3.1
    labels:
      - "routewarden=true"`,
})

const modeASnippets = computed(() => ({
  cli: [
    { filename: 'CLI Command', lang: 'bash', code: mode_a_cmd.cleanCode, html: mode_a_cmd.html, hasDiff: false },
    { filename: 'docker-compose.yml', lang: 'yaml', code: mode_a_yaml.cleanCode, html: mode_a_yaml.html, hasDiff: false },
  ],
}))

const mode_b_cmd = buildSnippet({
  lang: 'bash',
  code: `# Tail specific container by name
rwarden push --container traefik

# Or using shorthand alias (-c)
rwarden push -c edge-gateway

# Tail multiple specific containers (repeatable or comma-separated)
rwarden push -c traefik -c api-gateway
rwarden push -c "traefik,api-gateway,auth-service"`,
})

const modeBSnippets = computed(() => ({
  cli: [
    { filename: 'rwarden push --container', lang: 'bash', code: mode_b_cmd.cleanCode, html: mode_b_cmd.html, hasDiff: false },
  ],
}))

const mode_c_cmd = buildSnippet({
  lang: 'bash',
  code: `# Stream events from a single access log file
rwarden push --file /var/log/nginx/access.log

# Stream multiple files using repeatable flags (-f / --file)
rwarden push -f /var/log/nginx/access.log -f /var/log/caddy/access.log

# Comma-separated paths
rwarden push --file /var/log/nginx/access.log,/var/log/traefik/access.log

# Glob pattern wildcard expansion (all matching files)
rwarden push --file "/var/log/nginx/*.log"

# Positional file arguments
rwarden push /var/log/nginx/access.log /var/log/auth.log`,
})

const modeCSnippets = computed(() => ({
  cli: [
    { filename: 'rwarden push --file', lang: 'bash', code: mode_c_cmd.cleanCode, html: mode_c_cmd.html, hasDiff: false },
  ],
}))

const mode_d_cmd = buildSnippet({
  lang: 'bash',
  code: `# Monitor multiple log files AND auto-discover Docker containers concurrently
rwarden push --docker -f /var/log/nginx/access.log -f /var/log/syslog

# Tail specific container(s) AND multiple log files simultaneously
rwarden push -c custom-gateway,api-proxy -f /var/log/auth.log

# Full hybrid: labeled Docker auto-discovery + specific container + wildcard files
rwarden push --docker -c auth-service -f "/var/log/nginx/*.log"`,
})

const mode_d_output = buildSnippet({
  lang: 'plaintext',
  code: `🚀 RouteWarden Remote Shipper Starting...
─────────────────────────────────────────────────────────────
  Dashboard URL:   http://198.51.100.10:7890
  Agent Name:      edge-frankfurt-01
  Encryption:      🔒 End-to-End Encrypted (X25519 + AES-256-GCM)
  Monitoring File: /var/log/nginx/access.log
  Monitoring File: /var/log/syslog
  Container:       custom-gateway
  Auto-Discovery:  Watching Docker containers with label 'routewarden=true'
─────────────────────────────────────────────────────────────
Press Ctrl+C to stop.
🐳 [Docker] Attached to container: custom-gateway (9f8e7d6c5b4a)
🐳 [Docker] Attached to container: edge-traefik (4b7e89a1c2d3)`,
})

const modeDSnippets = computed(() => ({
  cli: [
    { filename: 'Hybrid Push Command', lang: 'bash', code: mode_d_cmd.cleanCode, html: mode_d_cmd.html, hasDiff: false },
    { filename: 'Shipper Startup Output', lang: 'plaintext', code: mode_d_output.cleanCode, html: mode_d_output.html, hasDiff: false },
  ],
}))

// ─── 3. Tuning Snippets ──────────────────────────────────────────────────────
const tuning_cmd = buildSnippet({
  lang: 'bash',
  code: `# High-volume cluster: larger batch size
rwarden push --batch-size 200 --flush-interval 2s

# Low-latency testing: flush immediately
rwarden push --batch-size 10 --flush-interval 500ms`,
})

const tuningSnippets = computed(() => ({
  cli: [
    { filename: 'Batching Flags', lang: 'bash', code: tuning_cmd.cleanCode, html: tuning_cmd.html, hasDiff: false },
  ],
}))

// ─── 4. One-Off Snippet ──────────────────────────────────────────────────────
const one_off_cmd = buildSnippet({
  lang: 'bash',
  code: `# Push directly without pre-saving config
rwarden push \\
  --url http://198.51.100.10:7890 \\
  --key rw_sec_8f9a2b4c1e0d3f7a... \\
  --docker -f /var/log/nginx/access.log`,
})

const oneOffSnippets = computed(() => ({
  cli: [
    { filename: 'Direct Push Flags', lang: 'bash', code: one_off_cmd.cleanCode, html: one_off_cmd.html, hasDiff: false },
  ],
}))
</script>

# Remote Log Shipper (`rwarden push`)

The `rwarden push` command is the core data shipper for distributed RouteWarden deployments. It tails your reverse proxy containers or log files, batches events in an in-memory ring buffer, encrypts them using X25519 ECDH + AES-256-GCM, and streams them to the central dashboard.

---

## 1. Zero-Flag Execution

Once registered, you can start streaming by simply running:

<CodeViewer :snippets="pushSnippets" />

### What Happens Automatically:
1. **Profile Loading**: Reads `~/.routewarden/agent.json` to load your dashboard URL, agent authentication token, and server public key.
2. **Auto-Discovery**: Automatically inspects the Docker daemon via `/var/run/docker.sock` and tails all running containers labeled `routewarden=true` or `routewarden.logs=true`.
3. **Heartbeat Startup**: Launches a background routine sending health heartbeats every 30 seconds to the central dashboard.
4. **Encrypted Batching**: Collects log events into an in-memory ring buffer (up to 2,000 events) and flushes encrypted batches every 1 second or whenever 50 events accumulate.

### Startup Output

<CodeViewer :snippets="pushOutputSnippets" />

---

## 2. Modes of Operation

### Mode A: Auto-Discovery (Default)
Tails all gateway containers dynamically as they start and stop:

<CodeViewer :snippets="modeASnippets" />

### Mode B: Tail Specific Container(s)
Tail one or more target containers by name or ID using repeatable `-c` or comma-separated names:

<CodeViewer :snippets="modeBSnippets" />

### Mode C: Monitor Multiple Log Files
Stream events from host log files using repeatable flags (`-f`), comma-separated paths, glob patterns (`*.log`), or positional arguments:

<CodeViewer :snippets="modeCSnippets" />

`rwarden push` uses non-blocking tailing (`tail -F`), ensuring that log rotations (`logrotate`) are handled seamlessly without losing telemetry across multiple log files.

### Mode D: Concurrent Hybrid Streaming (Files + Docker)
Stream multiple log files and Docker containers simultaneously. Both files and Docker streams feed into the unified in-memory ring buffer for encrypted shipping:

<CodeViewer :snippets="modeDSnippets" />

---

## 3. In-Memory Ring Buffer & Performance

Unlike traditional shippers that write WAL journals to disk, `rwarden push` uses an in-memory ring buffer:
- **Maximum Buffer**: **2,000 events** (~2MB max RAM allocation).
- **Edge Storage Protection**: Prevents millions of daily disk write cycles, preserving SSD life on edge hardware, Raspberry Pis, and low-cost VPS instances.
- **Backpressure Handling**: If network connectivity drops, events buffer safely up to 2,000 events before safely dropping oldest events rather than crashing the process or exhausting system memory.

---

## 4. Tuning Batching & Flush Intervals

You can tune batching parameters to match high-traffic or low-latency environments:

<CodeViewer :snippets="tuningSnippets" />

| Parameter | Default | Description |
|:---|:---|:---|
| `--batch-size` | `50` | Maximum number of events to buffer before triggering an immediate flush. |
| `--flush-interval` | `1s` | Maximum time to wait before flushing partial batches to the server. |
| `--tail` | `50` | Number of existing lines to replay when attaching to a container. |

---

## 5. Resilience & Automated Retries

`rwarden push` includes robust network failure recovery:

1. **Automated Heartbeats**: Every 30 seconds, a background ping is sent to `/api/v1/heartbeat`. This keeps the agent marked **online** in the dashboard status ribbon even during periods of zero web traffic.
2. **Exponential Backoff**: If the central dashboard is temporarily unreachable (e.g. during a deployment or transient network drop), `sendBatchWithRetry` retries automatically:
   - Attempt 1: immediate
   - Attempt 2: after 500ms
   - Attempt 3: after 1,000ms
3. **Graceful Shutdown**: Listens for `SIGINT` (Ctrl+C) and `SIGTERM`, drains remaining buffered events, and terminates cleanly.

---

## 6. One-Off Push (Without Saved Config)

For ephemeral test environments or CI/CD pipelines, you can push directly by supplying flags without running `rwarden register`:

<CodeViewer :snippets="oneOffSnippets" />
