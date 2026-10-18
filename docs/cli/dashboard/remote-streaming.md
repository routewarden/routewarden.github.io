---
title: Distributed Remote Streaming
description: Ship encrypted security events from multiple remote edge and cloud nodes to a central RouteWarden dashboard.
---

# Distributed Remote Streaming

RouteWarden supports a distributed agent model inspired by CrowdSec. You can deploy reverse proxies (Traefik, Caddy, NGINX) across multiple edge nodes, cloud virtual machines, and Kubernetes clusters, and stream their live security telemetry to a central RouteWarden dashboard.

---

## Architecture Overview

```text
┌──────────────────────────────────────┐       ┌──────────────────────────────────────┐
│        Remote Server A (Edge)        │       │        Remote Server B (Cloud)       │
│  [Traefik / Caddy / NGINX Container] │       │  [Traefik / Caddy / NGINX Container] │
│                   │                  │       │                   │                  │
│             rwarden push             │       │             rwarden push             │
└───────────────────┬──────────────────┘       └───────────────────┬──────────────────┘
                    │                                              │
                    │      X25519 ECDH + AES-256-GCM Encrypted     │
                    │        POST /api/v1/events (Bearer Key)      │
                    ▼                                              ▼
    ┌─────────────────────────────────────────────────────────────────────────────┐
    │                 RouteWarden Central Dashboard & Ingestion Hub               │
    │                                                                             │
    │  • Validates API Keys from ~/.routewarden/dashboard/api_keys.json           │
    │  • Decrypts payloads using master X25519 server private key                 │
    │  • Appends events to GoAccess real-time engine & WebSocket stream           │
    │  • Live Header Status Ribbon:                                               │
    │    🟢 [🐳 local-gateway] [🌐 edge-prod-01 (198.51.100.4)] [🌐 cloud-node]  │
    └─────────────────────────────────────────────────────────────────────────────┘
```

### Key Security Features
1. **Asymmetric End-to-End Encryption**: The central server holds the master X25519 private key. Each batch is encrypted by the client using an ephemeral X25519 keypair and AES-256-GCM. Logs cannot be inspected by intermediate proxies or network observers.
2. **One-Time Registration**: The client registers its credentials once (`rwarden register`) and saves its encrypted profile to `~/.routewarden/agent.json`.
3. **In-Memory Ring Buffer**: Remote agents buffer up to 2,000 events in memory (~2MB max RAM) with zero disk wear on edge SSDs.
4. **Resilient Retry & Backoff**: Automatic exponential backoff retry on network drops, plus a 30-second heartbeat ping.

---

## Step 1: Generate an Agent Key on Central Server

On your central server running `rwarden dashboard`:

```bash
rwarden keys create prod-edge-01
```

**Output**:
```text
🔑 Agent Key Created Successfully!
─────────────────────────────────────────────────────────────
  Agent Name:   prod-edge-01
  Agent ID:     agent_8f9a2b4c1e0d3f7a
  Token:        rw_sec_8f9a2b4c1e0d3f7a9b2c4e6f8a0d1c3e4f5a6b7c8d9e0f1a
─────────────────────────────────────────────────────────────
💡 To connect a remote server, run this on the remote host:
   rwarden register --url http://<dashboard-ip>:7890 --key rw_sec_8f9a...

   rwarden push
```

You can view or revoke keys at any time:
```bash
# List registered agents
rwarden keys list

# Revoke an agent key
rwarden keys revoke prod-edge-01
```

---

## Step 2: Register the Remote Server Once

On the remote edge or cloud server, register with the central dashboard:

```bash
rwarden register --url http://<dashboard-ip>:7890 --key rw_sec_8f9a2b4c1e0d...
```

**Output**:
```text
⏳ Connecting to RouteWarden Central Dashboard at http://198.51.100.10:7890...
✅ Successfully registered with RouteWarden Central Dashboard!
─────────────────────────────────────────────────────────────
  Dashboard URL:     http://198.51.100.10:7890
  Agent Name:        prod-edge-01
  Agent ID:          agent_8f9a2b4c1e0d3f7a
  Server Public Key: xJ9+4kL2vM8...
  Config Saved:      ~/.routewarden/agent.json
─────────────────────────────────────────────────────────────
🚀 You are ready to stream! Start pushing logs with:
   rwarden push
```

---

## Step 3: Stream Logs (`rwarden push`)

### Option A: Auto-Discover Local Docker Containers
To auto-tail all local gateway containers with label `routewarden=true`:

```bash
rwarden push
```

### Option B: Tail a Specific Container
```bash
rwarden push --container traefik
```

### Option C: Monitor a Log File
```bash
rwarden push --file /var/log/nginx/access.log
```

---

## Running as a Docker Companion on Remote Nodes

You can run `rwarden push` as a lightweight background companion service in your remote `docker-compose.yml`:

```yaml
services:
  traefik:
    image: traefik:v3.1
    labels:
      - "routewarden=true"
    # ... your existing traefik config ...

  routewarden-shipper:
    image: ghcr.io/routewarden/cli:latest
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ~/.routewarden:/root/.routewarden:ro
    command: ["push", "--docker"]
```
