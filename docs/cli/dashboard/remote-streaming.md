---
title: Distributed Remote Streaming
description: Ship encrypted security events from multiple remote edge and cloud nodes to a central RouteWarden dashboard.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../../.vitepress/theme/composables/useCodeSnippet'

// ─── Step 1 Snippets ─────────────────────────────────────────────────────────
const step1_cmd = buildSnippet({
  lang: 'bash',
  code: `rwarden keys create prod-edge-01`,
})

const step1Snippets = computed(() => ({
  cli: [
    { filename: 'rwarden keys create', lang: 'bash', code: step1_cmd.cleanCode, html: step1_cmd.html, hasDiff: false },
  ],
}))

const step1_output = buildSnippet({
  lang: 'plaintext',
  code: `🔑 Agent Key Created Successfully!
─────────────────────────────────────────────────────────────
  Agent Name:   prod-edge-01
  Agent ID:     agent_8f9a2b4c1e0d3f7a
  Token:        rw_sec_8f9a2b4c1e0d3f7a9b2c4e6f8a0d1c3e4f5a6b7c8d9e0f1a
─────────────────────────────────────────────────────────────
💡 To connect a remote server, run this on the remote host:
   rwarden register --url http://<dashboard-ip>:7890 --key rw_sec_8f9a...

   rwarden push`,
})

const step1OutputSnippets = computed(() => ({
  cli: [
    { filename: 'Generated Token Output', lang: 'plaintext', code: step1_output.cleanCode, html: step1_output.html, hasDiff: false },
  ],
}))

const step1_mgmt_cmd = buildSnippet({
  lang: 'bash',
  code: `# List registered agents
rwarden keys list

# Revoke an agent key
rwarden keys revoke prod-edge-01`,
})

const step1MgmtSnippets = computed(() => ({
  cli: [
    { filename: 'Manage Keys', lang: 'bash', code: step1_mgmt_cmd.cleanCode, html: step1_mgmt_cmd.html, hasDiff: false },
  ],
}))

// ─── Step 2 Snippets ─────────────────────────────────────────────────────────
const step2_cmd = buildSnippet({
  lang: 'bash',
  code: `rwarden register --url http://<dashboard-ip>:7890 --key rw_sec_8f9a2b4c1e0d...`,
})

const step2Snippets = computed(() => ({
  cli: [
    { filename: 'rwarden register', lang: 'bash', code: step2_cmd.cleanCode, html: step2_cmd.html, hasDiff: false },
  ],
}))

const step2_output = buildSnippet({
  lang: 'plaintext',
  code: `⏳ Connecting to RouteWarden Central Dashboard at http://198.51.100.10:7890...
✅ Successfully registered with RouteWarden Central Dashboard!
─────────────────────────────────────────────────────────────
  Dashboard URL:     http://198.51.100.10:7890
  Agent Name:        prod-edge-01
  Agent ID:          agent_8f9a2b4c1e0d3f7a
  Server Public Key: xJ9+4kL2vM8...
  Config Saved:      ~/.routewarden/agent.json
─────────────────────────────────────────────────────────────
🚀 You are ready to stream! Start pushing logs with:
   rwarden push`,
})

const step2OutputSnippets = computed(() => ({
  cli: [
    { filename: 'Registration Output', lang: 'plaintext', code: step2_output.cleanCode, html: step2_output.html, hasDiff: false },
  ],
}))

// ─── Step 3 Snippets ─────────────────────────────────────────────────────────
const push_auto = buildSnippet({
  lang: 'bash',
  code: `# Auto-discover all local gateway containers labeled routewarden=true
rwarden push

# Run in background (detached daemon mode)
rwarden push -d

# Check daemon status or stop
rwarden push status
rwarden push stop`,
})

const push_container = buildSnippet({
  lang: 'bash',
  code: `# Tail a specific container by name
rwarden push --container traefik`,
})

const push_file = buildSnippet({
  lang: 'bash',
  code: `# Stream from an existing access log file
rwarden push --file /var/log/nginx/access.log`,
})

const pushSnippets = computed(() => ({
  cli: [
    { filename: 'Auto-Discovery & Daemon', lang: 'bash', code: push_auto.cleanCode, html: push_auto.html, hasDiff: false },
    { filename: 'Specific Container', lang: 'bash', code: push_container.cleanCode, html: push_container.html, hasDiff: false },
    { filename: 'Log File', lang: 'bash', code: push_file.cleanCode, html: push_file.html, hasDiff: false },
  ],
}))

// ─── Step 4 Compose Snippet ──────────────────────────────────────────────────
const compose_companion = buildSnippet({
  lang: 'yaml',
  code: `services:
  traefik:
    image: traefik:v3.1
    labels:
      - "routewarden=true"
    # ... your existing traefik config ...

  routewarden-shipper:
    # Dedicated lean shipper micro-image (~6MB) or full toolkit ghcr.io/routewarden/cli:latest
    image: ghcr.io/routewarden/shipper:latest
    container_name: routewarden-shipper
    restart: unless-stopped
    environment:
      - RW_DASHBOARD_URL=http://198.51.100.10:7890
      - RW_AGENT_KEY=rw_sec_a8f9c2d1e4b7...
      - TZ=Asia/Kolkata
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    # Or mount registered profile if preferred:
    # volumes:
    #   - /var/run/docker.sock:/var/run/docker.sock:ro
    #   - ~/.routewarden:/root/.routewarden:ro
    command: ["--docker"]`,
})

const composeCompanionSnippets = computed(() => ({
  cli: [
    { filename: 'docker-compose.yml (Remote Edge Companion)', lang: 'yaml', code: compose_companion.cleanCode, html: compose_companion.html, hasDiff: false },
  ],
}))

const arch_diagram = buildSnippet({
  lang: 'text',
  code: `┌──────────────────────────────────────┐       ┌──────────────────────────────────────┐
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
    │  • Appends events to RouteWarden SOC engine & SSE stream                    │
    │  • Live Header Status Ribbon:                                               │
    │    🟢 [🐳 local-gateway] [🌐 edge-prod-01 (198.51.100.4)] [🌐 cloud-node]  │
    └─────────────────────────────────────────────────────────────────────────────┘`,
})

const archDiagramSnippets = computed(() => ({
  cli: [
    { filename: 'Streaming Topology', lang: 'text', code: arch_diagram.cleanCode, html: arch_diagram.html, hasDiff: false },
  ],
}))
</script>

# Distributed Remote Streaming

RouteWarden supports a distributed agent model inspired by CrowdSec. You can deploy reverse proxies (Traefik, Caddy, NGINX) across multiple edge nodes, cloud virtual machines, and Kubernetes clusters, and stream their live security telemetry to a central RouteWarden dashboard.

> [!TIP]
> **Dedicated Guide Available**: For the comprehensive multi-page guide covering architecture, key generation, enrollment, daemons, and cryptography, visit the [Remote Monitoring & Log Streaming Guide](/cli/remote/).

---

## Architecture Overview

<CodeViewer :snippets="archDiagramSnippets" />

### Key Security Features
1. **Asymmetric End-to-End Encryption**: The central server holds the master X25519 private key. Each batch is encrypted by the client using an ephemeral X25519 keypair and AES-256-GCM. Logs cannot be inspected by intermediate proxies or network observers.
2. **One-Time Registration**: The client registers its credentials once (`rwarden register`) and saves its encrypted profile to `~/.routewarden/agent.json`.
3. **In-Memory Ring Buffer**: Remote agents buffer up to 2,000 events in memory (~2MB max RAM) with zero disk wear on edge SSDs.
4. **Resilient Retry & Backoff**: Automatic exponential backoff retry on network drops, plus a 30-second heartbeat ping.

---

## Step 1: Generate an Agent Key on Central Server

On your central server running `rwarden dashboard`:

<CodeViewer :snippets="step1Snippets" />

Output:

<CodeViewer :snippets="step1OutputSnippets" />

You can view or revoke keys at any time:

<CodeViewer :snippets="step1MgmtSnippets" />

---

## Step 2: Register the Remote Server Once

On the remote edge or cloud server, register with the central dashboard:

<CodeViewer :snippets="step2Snippets" />

Output:

<CodeViewer :snippets="step2OutputSnippets" />

---

## Step 3: Stream Logs (`rwarden push`)

Stream live logs using container auto-discovery, targeted containers, or local log files:

<CodeViewer :snippets="pushSnippets" />

---

## Running as a Docker Companion on Remote Nodes

You can run `rwarden push` as a lightweight background companion service in your remote `docker-compose.yml`:

<CodeViewer :snippets="composeCompanionSnippets" />
