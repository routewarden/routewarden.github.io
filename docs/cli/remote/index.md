---
title: Remote Monitoring & Log Streaming
description: Centralized, encrypted multi-node security event shipping from remote edge nodes, cloud VMs, and container clusters to RouteWarden.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../../.vitepress/theme/composables/useCodeSnippet'

// ─── Quickstart Snippets ──────────────────────────────────────────────────────
const step1_cmd = buildSnippet({
  lang: 'bash',
  code: `rwarden keys create prod-edge-01`,
})

const step1Snippets = computed(() => ({
  cli: [
    { filename: 'Central Server', lang: 'bash', code: step1_cmd.cleanCode, html: step1_cmd.html, hasDiff: false },
  ],
}))

const step1_output = buildSnippet({
  lang: 'plaintext',
  code: `🔑 Agent Key Created Successfully!
─────────────────────────────────────────────────────────────
  Agent Name:   prod-edge-01
  Agent ID:     agent_8f9a2b4c1e0d3f7a
  Token:        rw_sec_8f9a2b4c1e0d3f7a9b2c4e6f8a0d1c3e4f5a6b7c8d9e0f1a
─────────────────────────────────────────────────────────────`,
})

const step1OutputSnippets = computed(() => ({
  cli: [
    { filename: 'Generated Credentials', lang: 'plaintext', code: step1_output.cleanCode, html: step1_output.html, hasDiff: false },
  ],
}))

const step2_cmd = buildSnippet({
  lang: 'bash',
  code: `rwarden register --url http://<central-ip>:7890 --key rw_sec_8f9a2b4c1e0d...`,
})

const step2Snippets = computed(() => ({
  cli: [
    { filename: 'Remote Node Handshake', lang: 'bash', code: step2_cmd.cleanCode, html: step2_cmd.html, hasDiff: false },
  ],
}))

const step3_cmd = buildSnippet({
  lang: 'bash',
  code: `# Start background log shipping (reads ~/.routewarden/agent.json)
rwarden push`,
})

const step3Snippets = computed(() => ({
  cli: [
    { filename: 'Remote Node Shipper', lang: 'bash', code: step3_cmd.cleanCode, html: step3_cmd.html, hasDiff: false },
  ],
}))
</script>

# Remote Monitoring & Log Streaming

RouteWarden features a distributed agent model inspired by CrowdSec. Rather than requiring heavy collectors (like Fluentd, Vector, or Logstash) that consume 200MB+ RAM and wear out edge flash storage, `rwarden` provides a native, ultra-lightweight distributed telemetry pipeline:

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
    │  • Appends events to RouteWarden SOC engine & SSE stream                    │
    │  • Live Header Status Ribbon:                                               │
    │    🟢 [🐳 local-gateway] [🌐 edge-prod-01 (198.51.100.4)] [🌐 cloud-node]  │
    └─────────────────────────────────────────────────────────────────────────────┘
```

---

## Why Distributed RouteWarden Monitoring?

| Feature | RouteWarden (`rwarden push`) | Traditional Log Stacks (Loki/ELK) | CrowdSec Agent |
|:---|:---|:---|:---|
| **RAM Footprint** | **~2MB to ~15MB** | 350MB – 1.5GB+ | ~30MB – 60MB |
| **Disk Wear** | **Zero** (In-memory ring buffer) | Heavy SQLite / WAL disk buffering | Moderate |
| **Encryption** | **Asymmetric (X25519 + AES-GCM)** | TLS / Plain HTTP | HTTPS / mTLS |
| **Dependencies** | **Zero** (Single static binary) | JVM / Rust / Python runtimes | Go daemon |
| **Edge Container Discovery**| **Automatic** via `/var/run/docker.sock`| Complex daemonset or file regex | System log parsing |
| **Configuration** | **Zero-flag** (`rwarden push`) | Multi-page YAML / Promtail | Multi-file YAML configs |

---

## Core Pillars of the Architecture

### 1. Asymmetric End-to-End Cryptography
The central dashboard generates and holds a master **X25519 private key** (`server.key`). Remote shippers only hold the server's public key. For every batch of events pushed, the shipper generates an ephemeral X25519 keypair, derives a one-time session secret via **SHA-256 HKDF**, and encrypts the payload using **AES-256-GCM**. Intermediate proxies, load balancers, or CDN hops cannot decrypt, read, or tamper with your security events.

### 2. In-Memory Ring Buffer
Remote agents buffer up to **2,000 security events** in memory. On low-cost edge nodes, VPSs, and embedded appliances, this prevents thousands of daily disk writes that degrade flash memory.

### 3. Automated Container & File Discovery
`rwarden push` monitors Docker sockets for containers with the label `routewarden=true` or `routewarden.logs=true`. When new containers spin up or restart, `rwarden` attaches and streams their logs automatically. You can also tail standard log files (`--file /var/log/nginx/access.log`).

### 4. Live Multi-Agent Status Ribbon
The central SOC dashboard automatically displays a real-time status ribbon in the view. Connected remote agents appear with animated status pulses:
- 🟢 **Online** (Pulsing green dot, active in the last 60 seconds)
- 🟡 **Idle** (Amber dot, active between 1 and 5 minutes ago)
- ⚪ **Offline** (Gray dot, no heartbeat received in >5 minutes)

---

## 3-Step Quick Start

### Step 1: Create an Agent Key (on Central Server)
On the machine running `rwarden dashboard`:

<CodeViewer :snippets="step1Snippets" />

<CodeViewer :snippets="step1OutputSnippets" />

### Step 2: Register the Remote Node (One-Time Handshake)
On your remote edge or cloud server:

<CodeViewer :snippets="step2Snippets" />

The agent connects to the central dashboard, retrieves the server's X25519 public key, and persists its configuration to `~/.routewarden/agent.json` with strict `0600` permissions.

### Step 3: Start the Shipper
On the remote server, simply run:

<CodeViewer :snippets="step3Snippets" />

`rwarden push` reads the registered configuration, auto-discovers your reverse proxy containers, and streams encrypted security logs directly to your central dashboard.

---

## Explore the Remote Monitoring Guide

- [**Key Management (`rwarden keys`)**](/cli/remote/keys) — Generate, list, and revoke remote agent credentials.
- [**Agent Registration (`rwarden register`)**](/cli/remote/registration) — One-time handshake and credential persistence.
- [**Remote Shipper Daemon (`rwarden push`)**](/cli/remote/shipper) — Auto-discovery, batching, ring buffer tuning, and retry backoff.
- [**End-to-End Cryptography**](/cli/remote/encryption) — Cryptographic specification (X25519 ECDH + AES-256-GCM).
- [**Multi-Node & Docker Compose Deployment**](/cli/remote/multi-node) — Production Docker Compose snippets, companion setups, and systemd services.
