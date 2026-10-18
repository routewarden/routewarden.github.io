---
title: Remote Log Shipper (rwarden push)
description: Stream encrypted security logs from Docker containers or files with zero disk wear, in-memory buffering, and automatic failover retries.
---

# Remote Log Shipper (`rwarden push`)

The `rwarden push` command is the core data shipper for distributed RouteWarden deployments. It tails your reverse proxy containers or log files, batches events in an in-memory ring buffer, encrypts them using X25519 ECDH + AES-256-GCM, and streams them to the central dashboard.

---

## 1. Zero-Flag Execution

Once registered, you can start streaming by simply running:

```bash
rwarden push
```

### What Happens Automatically:
1. **Profile Loading**: Reads `~/.routewarden/agent.json` to load your dashboard URL, agent authentication token, and server public key.
2. **Auto-Discovery**: Automatically inspects the Docker daemon via `/var/run/docker.sock` and tails all running containers labeled `routewarden=true` or `routewarden.logs=true`.
3. **Heartbeat Startup**: Launches a background routine sending health heartbeats every 30 seconds to the central dashboard.
4. **Encrypted Batching**: Collects log events into an in-memory ring buffer (up to 2,000 events) and flushes encrypted batches every 1 second or whenever 50 events accumulate.

### Startup Output

```text
🚀 RouteWarden Remote Shipper Starting...
─────────────────────────────────────────────────────────────
  Dashboard URL:   http://198.51.100.10:7890
  Agent Name:      edge-frankfurt-01
  Encryption:      🔒 End-to-End Encrypted (X25519 + AES-256-GCM)
  Auto-Discovery:  Watching Docker containers with label 'routewarden=true'
─────────────────────────────────────────────────────────────
Press Ctrl+C to stop.
🐳 [Docker] Attached to container: edge-traefik (4b7e89a1c2d3)
```

---

## 2. Modes of Operation

### Mode A: Auto-Discovery (Default)
Tails all gateway containers dynamically as they start and stop:

```bash
rwarden push
# Or explicitly:
rwarden push --docker
```

Label your containers in Docker Compose:
```yaml
services:
  traefik:
    image: traefik:v3.1
    labels:
      - "routewarden=true"
```

To use a custom label filter:
```bash
rwarden push --label "security.monitor=true"
```

### Mode B: Tail a Specific Container
Tail a single target container by name or ID:

```bash
rwarden push --container traefik
# Or using shorthand:
rwarden push -c edge-gateway
```

### Mode C: Monitor a Log File
Stream events from an access log file on the host filesystem:

```bash
rwarden push --file /var/log/nginx/access.log
# Or using shorthand:
rwarden push -f /var/log/caddy/access.log
```

`rwarden push` uses non-blocking tailing (`tail -F`), ensuring that log rotations (`logrotate`) are handled seamlessly without losing telemetry.

---

## 3. In-Memory Ring Buffer & Performance

Unlike traditional shippers that write WAL journals to disk, `rwarden push` uses an in-memory ring buffer:
- **Maximum Buffer**: **2,000 events** (~2MB max RAM allocation).
- **Edge Storage Protection**: Prevents millions of daily disk write cycles, preserving SSD life on edge hardware, Raspberry Pis, and low-cost VPS instances.
- **Backpressure Handling**: If network connectivity drops, events buffer safely up to 2,000 events before safely dropping oldest events rather than crashing the process or exhausting system memory.

---

## 4. Tuning Batching & Flush Intervals

You can tune batching parameters to match high-traffic or low-latency environments:

```bash
# High-volume cluster: larger batch size
rwarden push --batch-size 200 --flush-interval 2s

# Low-latency testing: flush immediately
rwarden push --batch-size 10 --flush-interval 500ms
```

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

```bash
rwarden push \
  --url http://198.51.100.10:7890 \
  --key rw_sec_8f9a2b4c1e0d3f7a... \
  --docker
```
