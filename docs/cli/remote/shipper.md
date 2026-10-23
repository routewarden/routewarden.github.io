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
rwarden push

# Run in background (detached daemon mode)
rwarden push -d
# or
rwarden push --detach`,
})

const pushSnippets = computed(() => ({
  cli: [
    { filename: 'rwarden push', lang: 'bash', code: push_cmd.cleanCode, html: push_cmd.html, hasDiff: false },
  ],
}))

const push_output = buildSnippet({
  lang: 'plaintext',
  code: `🚀 Routewarden Remote Shipper Starting...
─────────────────────────────────────────────────────────────
  Dashboard URL:   http://198.51.100.10:7890
  Agent Name:      edge-frankfurt-01
  Encryption:      🔒 End-to-End Encrypted (X25519 + AES-256-GCM)
  Batch Settings:  Size=50, Interval=1s
  Offline Queue:   Max=10000, Timeout=5m0s
  Auto-Discovery:  Watching Docker containers with label 'routewarden=true'
─────────────────────────────────────────────────────────────
[15:04:05] 🟢 Connected to Routewarden dashboard (http://198.51.100.10:7890)
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
  code: `🚀 Routewarden Remote Shipper Starting...
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

// ─── 4. Telemetry Filtering Snippets ──────────────────────────────────────────
const filtering_cmd = buildSnippet({
  lang: 'bash',
  code: `# Default: push only security events (BLOCK, TARPIT, HONEYPOT, 403, 429)
rwarden push --docker

# Ship all failed API calls (status >= 400) across Caddy, Traefik, and NGINX
rwarden push --include-failed
# Shorthand:
rwarden push -F

# Ship all HTTP access traffic including successful 200 OK responses
rwarden push --all-traffic

# Ship all raw container lines without Routewarden filtering
rwarden push --all-logs`,
})

const filteringSnippets = computed(() => ({
  cli: [
    { filename: 'Filtering Flags', lang: 'bash', code: filtering_cmd.cleanCode, html: filtering_cmd.html, hasDiff: false },
  ],
}))

const one_off_cmd = buildSnippet({
  lang: 'bash',
  code: `# Push directly without pre-saving config
rwarden push \
  --url http://198.51.100.10:7890 \
  --key rw_sec_8f9a2b4c1e0d3f7a... \
  --docker -f /var/log/nginx/access.log`,
})

const oneOffSnippets = computed(() => ({
  cli: [
    { filename: 'Direct Push Flags', lang: 'bash', code: one_off_cmd.cleanCode, html: one_off_cmd.html, hasDiff: false },
  ],
}))

// ─── 5. Daemon Management Snippets ───────────────────────────────────────────
const daemon_push_cmd = buildSnippet({
  lang: 'bash',
  code: `# Launch shipper in detached background mode
rwarden push -d

# Inspect status of running shipper daemon
rwarden push status
# or
rwarden status push

# Stop running background shipper daemon
rwarden push stop
# or
rwarden stop push`,
})

const daemonPushSnippets = computed(() => ({
  cli: [
    { filename: 'Daemon Management', lang: 'bash', code: daemon_push_cmd.cleanCode, html: daemon_push_cmd.html, hasDiff: false },
  ],
}))

// ─── 6. Lean Micro-Docker Image ──────────────────────────────────────────────
const shipper_compose_docker = buildSnippet({
  lang: 'yaml',
  code: `services:
  routewarden-shipper:
    image: ghcr.io/routewarden/shipper:latest
    container_name: routewarden-shipper
    restart: unless-stopped
    environment:
      - RW_DASHBOARD_URL=https://soc.example.com
      - RW_AGENT_KEY=rw_sec_your_agent_key_here
      - TZ=Asia/Kolkata
    volumes:
      # Auto-discover Docker containers with label routewarden=true
      - /var/run/docker.sock:/var/run/docker.sock:ro`,
})

const shipper_compose_files = buildSnippet({
  lang: 'yaml',
  code: `services:
  routewarden-shipper:
    image: ghcr.io/routewarden/shipper:latest
    container_name: routewarden-shipper
    restart: unless-stopped
    environment:
      - RW_DASHBOARD_URL=https://soc.example.com
      - RW_AGENT_KEY=rw_sec_your_agent_key_here
      - TZ=Asia/Kolkata
    volumes:
      # Mount host log directories read-only
      - /var/log/nginx:/var/log/nginx:ro
      - /var/log/caddy:/var/log/caddy:ro
    # Stream multiple access log files concurrently
    command:
      - "-f"
      - "/var/log/nginx/access.log"
      - "-f"
      - "/var/log/caddy/access.log"`,
})

const shipper_compose_hybrid = buildSnippet({
  lang: 'yaml',
  code: `services:
  routewarden-shipper:
    image: ghcr.io/routewarden/shipper:latest
    container_name: routewarden-shipper
    restart: unless-stopped
    environment:
      - RW_DASHBOARD_URL=https://soc.example.com
      - RW_AGENT_KEY=rw_sec_your_agent_key_here
      - TZ=Asia/Kolkata
    volumes:
      # Watch Docker containers
      - /var/run/docker.sock:/var/run/docker.sock:ro
      # Mount host log directory
      - /var/log:/var/log:ro
    # Concurrently auto-discover containers AND tail multiple log files
    command:
      - "--docker"
      - "-f"
      - "/var/log/nginx/access.log"
      - "-f"
      - "/var/log/syslog"`,
})

const shipper_mounted_compose = buildSnippet({
  lang: 'yaml',
  code: `services:
  routewarden-shipper:
    image: ghcr.io/routewarden/shipper:latest
    container_name: routewarden-shipper
    restart: unless-stopped
    volumes:
      # Auto-discover Docker containers
      - /var/run/docker.sock:/var/run/docker.sock:ro
      # Mount pre-registered agent profile from host
      - ~/.routewarden:/root/.routewarden:ro
    command: ["--docker"]`,
})

const shipper_run_cmd = buildSnippet({
  lang: 'bash',
  code: `# Auto-discover Docker containers with zero-touch environment variables
docker run -d \\
  --name routewarden-shipper \\
  --restart unless-stopped \\
  -v /var/run/docker.sock:/var/run/docker.sock:ro \\
  -e RW_DASHBOARD_URL="https://soc.example.com" \\
  -e RW_AGENT_KEY="rw_sec_your_agent_key_here" \\
  -e TZ="Asia/Kolkata" \\
  ghcr.io/routewarden/shipper:latest

# Tail multiple host log files with zero-touch environment variables
docker run -d \\
  --name routewarden-shipper-files \\
  --restart unless-stopped \\
  -v /var/log/nginx:/var/log/nginx:ro \\
  -v /var/log/caddy:/var/log/caddy:ro \\
  -e RW_DASHBOARD_URL="https://soc.example.com" \\
  -e RW_AGENT_KEY="rw_sec_your_agent_key_here" \\
  -e TZ="Asia/Kolkata" \\
  ghcr.io/routewarden/shipper:latest \\
  -f /var/log/nginx/access.log -f /var/log/caddy/access.log`,
})

const shipperComposeSnippets = computed(() => ({
  cli: [
    { filename: 'Docker Auto-Discovery (Compose)', lang: 'yaml', code: shipper_compose_docker.cleanCode, html: shipper_compose_docker.html, hasDiff: false },
    { filename: 'Multiple Log Files (Compose)', lang: 'yaml', code: shipper_compose_files.cleanCode, html: shipper_compose_files.html, hasDiff: false },
    { filename: 'Hybrid (Docker + Files)', lang: 'yaml', code: shipper_compose_hybrid.cleanCode, html: shipper_compose_hybrid.html, hasDiff: false },
    { filename: 'Mounted Profile (~/.routewarden)', lang: 'yaml', code: shipper_mounted_compose.cleanCode, html: shipper_mounted_compose.html, hasDiff: false },
    { filename: 'Docker Run (CLI)', lang: 'bash', code: shipper_run_cmd.cleanCode, html: shipper_run_cmd.html, hasDiff: false },
  ],
}))
</script>

# Remote Log Shipper (`rwarden push`)

The `rwarden push` command is the core data shipper for distributed Routewarden deployments. It tails your reverse proxy containers or log files, batches events in an in-memory ring buffer, encrypts them using X25519 ECDH + AES-256-GCM, and streams them to the central dashboard.

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

## 3. In-Memory Ring Buffer & Offline Queueing

Unlike traditional shippers that write heavy WAL journals to disk, `rwarden push` uses zero-disk, memory-buffered streaming:
- **Collector Ring Buffer**: Ingests up to **2,000 events** from log streams and Docker pipes before backpressure throttling (~2MB RAM).
- **Offline Event Queue (`--queue-size`)**: In-memory buffer holding up to **10,000 events** (configurable) when the dashboard is unreachable, restarting, or disconnected.
- **Edge Storage Protection**: Prevents millions of daily disk write cycles, preserving SSD life on edge hardware, Raspberry Pis, and low-cost VPS instances.
- **Stale Event Protection (`--disconnect-timeout`)**: If the dashboard remains disconnected longer than 5 minutes (default), stale events are gradually pruned with throttled warnings to protect node memory from unbounded growth.

---

## 4. Tuning Batching & Flush Intervals

You can tune batching parameters to match high-traffic or low-latency environments:

<CodeViewer :snippets="tuningSnippets" />

| Parameter | Default | Description |
|:---|:---|:---|
| `--batch-size` | `50` | Maximum number of events to buffer before triggering an immediate flush. |
| `--flush-interval` | `1s` | Maximum time to wait before flushing partial batches to the server. |
| `--queue-size` | `10000` | Maximum events to queue in memory while disconnected from dashboard. |
| `--disconnect-timeout` | `5m` | Duration disconnected from dashboard before dropping stale events to protect memory. |
| `--ping-interval` | `10s` | Interval between connection health pings when connected. |
| `--tail` | `50` | Number of existing lines to replay when attaching to a container or file. |
| `--include-failed`, `-F` | `false` | Ship all failed HTTP requests (status >= 400: 4xx, 5xx) across Caddy, Traefik, and NGINX even without a blocking rule. |
| `--all-traffic` | `false` | Ship all HTTP access traffic including successful 200 OK responses. |
| `--all-logs` | `false` | Ship all raw container lines unconditionally without Routewarden filtering. |

---

## 5. Telemetry Filtering & Shipping Modes

By default, `rwarden push` optimizes edge bandwidth and central dashboard storage by shipping only **security events**:
- Explicit Routewarden plugin actions (`BLOCK`, `TARPIT`, `HONEYPOT`, threat rule matches).
- Security status codes (`403 Forbidden`, `429 Too Many Requests`).
- Successful `200 OK` access logs are automatically filtered out.

You can customize telemetry filtering using flags, environment variables, or `agent.json`:

<CodeViewer :snippets="filteringSnippets" />

### Available Modes:

1. **Security Events Only (Default)**:
   - Forwards threat mitigations and security rejections.
   - Drops benign access traffic, keeping the dashboard focused on actionable incidents while reducing database size.

2. **Failed API Requests (`--include-failed` / `-F`)**:
   - Forwards all failed HTTP calls where status code is $\ge 400$ (all `4xx` client errors such as 404 Not Found, 400 Bad Request, and all `5xx` server/gateway errors like 500 Internal Server Error, 502 Bad Gateway, 503 Service Unavailable).
   - Works across **Caddy** (`logger: "http.log.access"`), **Traefik** (JSON / Combined), and **NGINX** (JSON / Combined access logs).
   - Failed requests that did not match a Routewarden block rule are categorized as `FAILED` on the central dashboard (with rule `HTTP <status>`), giving SOC teams visibility into reconnaissance probing and upstream outages without polluting stats as `ALLOW`.
   - Also configurable via environment variable `RW_INCLUDE_FAILED=true` or `"include_failed": true` in `agent.json`.

3. **Full HTTP Access Traffic (`--all-traffic`)**:
   - Forwards all reverse proxy access logs including clean `200 OK` traffic.
   - Useful when centralizing full access auditing into the dashboard.
   - Also configurable via `RW_ALL_TRAFFIC=true` or `"all_traffic": true` in `agent.json`.

4. **Raw Unfiltered Logs (`--all-logs`)**:
   - Disables all filters and forwards every raw stdout/stderr line emitted by the monitored container or file.
   - Configurable via `RW_ALL_LOGS=true` or `"all_logs": true` in `agent.json`.

---

## 6. Resilience, Active Health Supervisor & Auto-Reconnect

`rwarden push` includes robust network failure recovery and zero-event-loss failover:

1. **Active Connection Health Supervisor (`/api/v1/ping`)**:
   - When connected, sends health pings every `--ping-interval` (`10s` default) to `/api/v1/ping`. This refreshes the agent's last-seen status on the dashboard and verifies end-to-end reachability.
   - When disconnected, automatically switches to **fast-polling mode (2-second interval)** to detect when the dashboard returns online immediately after reboots.
2. **Zero-Drop Offline Queueing & Backlog Drain**:
   - If the dashboard server restarts or connectivity drops, events are seamlessly held in the offline queue buffer.
   - Upon reconnection, `rwarden push` detects the online state, logs `🚀 Dashboard reconnected! Flushing <N> queued offline event(s)...`, and instantly drains the backlog in batches to the dashboard without dropping telemetry.
3. **Encryption Key Rotation Auto-Recovery**:
   - If the dashboard restarts and rotates or regenerates its encryption keypair, the client automatically receives the new public key, re-encrypts the current payload, updates its cached server key, and retries the batch immediately.
4. **Exponential Backoff**: If the central dashboard is temporarily unreachable, `sendBatchWithRetry` retries in-flight requests with backoff before queueing them offline.
5. **Graceful Shutdown**: Listens for `SIGINT` (Ctrl+C) and `SIGTERM`, flushes remaining buffered events, and terminates cleanly.

---

## 7. One-Off Push (Without Saved Config)

For ephemeral test environments or CI/CD pipelines, you can push directly by supplying flags without running `rwarden register`:

<CodeViewer :snippets="oneOffSnippets" />

---

## 8. Background Daemon Execution (`-d`, `status`, `stop`)

Run the shipper as an unprivileged, detached background daemon without needing systemd or nohup:

<CodeViewer :snippets="daemonPushSnippets" />

### How Background Mode Operates:
- **Process ID Tracking**: The daemon writes its process ID to `~/.routewarden/push.pid`.
- **Detached Log Redirection**: All diagnostic outputs, gateway attachments, and connection logs are safely redirected to `~/.routewarden/push.log`.
- **Status & Health**: Running `rwarden push status` (or `rwarden status push`) reads the PID file and confirms that the background process is alive and active.
- **Graceful Teardown**: Running `rwarden push stop` (or `rwarden stop push`) delivers a graceful termination signal, flushes remaining telemetry in memory, and cleans up the PID file.

---

## 9. Ultra-Lean Micro-Container (`ghcr.io/routewarden/shipper:latest`)

For Docker and containerized edge hosts, Routewarden publishes a dedicated, stripped-down shipper container image:

<CodeViewer :snippets="shipperComposeSnippets" />

### Zero-Touch Environment Variables (Recommended)

When deploying via Docker or Docker Compose, you do not need to run `rwarden register` on the host or mount configuration files. Pass `RW_DASHBOARD_URL` and `RW_AGENT_KEY` directly as environment variables:

| Environment Variable | Shorthand Alias | Description | Example |
|:---|:---|:---|:---|
| `RW_DASHBOARD_URL` | `RW_URL` | Central Routewarden dashboard address | `https://soc.example.com` or `http://198.51.100.10:7890` |
| `RW_AGENT_KEY` | `RW_KEY` | 24-byte secret agent token created via `rwarden keys create` | `rw_sec_a8f9c2d1e4b7...` |
| `RW_INCLUDE_FAILED` | — | Ship all failed HTTP calls (status >= 400: 4xx, 5xx) across Caddy, Traefik, and NGINX | `true` or `false` |
| `RW_ALL_TRAFFIC` | — | Ship all HTTP access traffic including 200 OK responses | `true` or `false` |
| `RW_ALL_LOGS` | — | Ship all raw container lines without Routewarden filtering | `true` or `false` |
| `TZ` | — | IANA Time Zone identifier for log timestamp normalization | `Asia/Kolkata`, `UTC`, `America/New_York` |

> [!TIP]
> **Dynamic Public Key Auto-Discovery**: When `RW_DASHBOARD_URL` and `RW_AGENT_KEY` are provided, `rwarden-shipper` automatically queries `/api/v1/pubkey` from the central dashboard on startup to derive the ephemeral shared secret (X25519 ECDH + AES-256-GCM). Full asymmetric end-to-end encryption is established immediately without any manual key exchanges or mounted config volumes.

### Deployment Options:
1. **Zero-Touch Environment Variables**: Ideal for Docker Compose and automated cluster rollouts. Set `RW_DASHBOARD_URL` and `RW_AGENT_KEY` in `environment:`, mount `/var/run/docker.sock` (or host log directories), and the shipper connects automatically.
2. **Mounted Host Profile**: If the node has already been enrolled via `rwarden register`, mount the host directory `-v ~/.routewarden:/root/.routewarden:ro` to reuse the saved agent identity.

### Container Highlights:
- **Binary Size**: Only **~6.2 MB** (stripped of all SQLite, embedded Web UI assets, HTML/JS/CSS, and MaxMind GeoIP code).
- **Multiple Ingestion Modes**: Stream multiple host access log files (`-f /var/log/nginx/access.log -f /var/log/caddy/access.log`), auto-discover labeled Docker containers (`--docker`), or run both concurrently in hybrid mode.
- **Zero Configuration**: Defaults to `rwarden push --docker` out-of-the-box when run without command flags.
- **Memory Footprint**: Consumes under **~10 MB RAM** on low-cost VPS instances and IoT edge gateways.


