---
title: HTTP Management API & Live Events
description: Simple REST endpoints and live Server-Sent Events (SSE) stream for monitoring and managing TCP Warden.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'



// ─── 1. Health Check (GET /health) ───────────────────────────────────────────
const health_curl = buildSnippet({
  lang: 'bash',
  code: `curl -s http://127.0.0.1:9091/health`
})

const health_res = buildSnippet({
  lang: 'json',
  code: `{
  "status": "ok",
  "version": "3.4.0"
}`
})

const healthSnippets = computed(() => ({
  tcp: [
    { filename: 'cURL Request', lang: 'bash', code: health_curl.cleanCode, html: health_curl.html, hasDiff: false },
    { filename: 'Response (200 OK)', lang: 'json', code: health_res.cleanCode, html: health_res.html, hasDiff: false },
  ]
}))

// ─── 2. Traffic & Connection Stats (GET /stats) ──────────────────────────────
const stats_curl = buildSnippet({
  lang: 'bash',
  code: `curl -s http://127.0.0.1:9091/stats`
})

const stats_res = buildSnippet({
  lang: 'json',
  code: `{
  "services": {
    "ssh": {
      "active_connections": 1,
      "total_allowed": 142,
      "total_blocked": 8,
      "bytes_in": 1048576,
      "bytes_out": 4194304
    },
    "postgres": {
      "active_connections": 5,
      "total_allowed": 2340,
      "total_blocked": 0,
      "bytes_in": 52428800,
      "bytes_out": 104857600
    }
  },
  "uptime_seconds": 3600
}`
})

const statsSnippets = computed(() => ({
  tcp: [
    { filename: 'cURL Request', lang: 'bash', code: stats_curl.cleanCode, html: stats_curl.html, hasDiff: false },
    { filename: 'Response (200 OK)', lang: 'json', code: stats_res.cleanCode, html: stats_res.html, hasDiff: false },
  ]
}))

// ─── 3. Configured Services (GET /services) ─────────────────────────────────
const services_curl = buildSnippet({
  lang: 'bash',
  code: `curl -s http://127.0.0.1:9091/services`
})

const services_res = buildSnippet({
  lang: 'json',
  code: `[
  {
    "name": "ssh",
    "protocol": "ssh",
    "listen": ":2222",
    "upstream": "127.0.0.1:22",
    "enabled": true
  },
  {
    "name": "postgres",
    "protocol": "postgres",
    "listen": ":5433",
    "upstream": "127.0.0.1:5432",
    "enabled": true
  }
]`
})

const servicesSnippets = computed(() => ({
  tcp: [
    { filename: 'cURL Request', lang: 'bash', code: services_curl.cleanCode, html: services_curl.html, hasDiff: false },
    { filename: 'Response (200 OK)', lang: 'json', code: services_res.cleanCode, html: services_res.html, hasDiff: false },
  ]
}))

// ─── 4. View Banned IPs (GET /banlist) ───────────────────────────────────────
const banlist_curl = buildSnippet({
  lang: 'bash',
  code: `curl -s http://127.0.0.1:9091/banlist`
})

const banlist_res = buildSnippet({
  lang: 'json',
  code: `{
  "bans": [
    {
      "ip": "198.51.100.45",
      "reason": "max_auth_failures_exceeded (3)",
      "service": "ssh",
      "banned_at": "2026-09-25T21:30:00Z",
      "expires_at": "2026-09-25T22:30:00Z",
      "remaining": "45m0s"
    }
  ]
}`
})

const banlistSnippets = computed(() => ({
  tcp: [
    { filename: 'cURL Request', lang: 'bash', code: banlist_curl.cleanCode, html: banlist_curl.html, hasDiff: false },
    { filename: 'Response (200 OK)', lang: 'json', code: banlist_res.cleanCode, html: banlist_res.html, hasDiff: false },
  ]
}))

// ─── 5. Manually Ban an IP (POST /ban) ──────────────────────────────────────
const ban_curl = buildSnippet({
  lang: 'bash',
  code: `curl -X POST http://127.0.0.1:9091/ban \\
  -H "Content-Type: application/json" \\
  -d '{"ip": "203.0.113.50", "duration": "24h", "reason": "suspicious port scan"}'`
})

const ban_payload = buildSnippet({
  lang: 'json',
  code: `{
  "ip": "203.0.113.50",
  "duration": "24h",
  "reason": "suspicious port scan"
}`
})

const banSnippets = computed(() => ({
  tcp: [
    { filename: 'cURL Command', lang: 'bash', code: ban_curl.cleanCode, html: ban_curl.html, hasDiff: false },
    { filename: 'Payload (JSON)', lang: 'json', code: ban_payload.cleanCode, html: ban_payload.html, hasDiff: false },
  ]
}))

// ─── 6. Unban an IP (POST /unban) ───────────────────────────────────────────
const unban_curl = buildSnippet({
  lang: 'bash',
  code: `curl -X POST http://127.0.0.1:9091/unban \\
  -H "Content-Type: application/json" \\
  -d '{"ip": "203.0.113.50"}'`
})

const unban_payload = buildSnippet({
  lang: 'json',
  code: `{
  "ip": "203.0.113.50"
}`
})

const unbanSnippets = computed(() => ({
  tcp: [
    { filename: 'cURL Command', lang: 'bash', code: unban_curl.cleanCode, html: unban_curl.html, hasDiff: false },
    { filename: 'Payload (JSON)', lang: 'json', code: unban_payload.cleanCode, html: unban_payload.html, hasDiff: false },
  ]
}))

// ─── 7. Live Security Events Stream (GET /events) ───────────────────────────
const events_curl = buildSnippet({
  lang: 'bash',
  code: `curl -N http://127.0.0.1:9091/events`
})

const events_output = buildSnippet({
  lang: 'sse',
  code: `event: security_event
data: {"service":"ssh","client_ip":"198.51.100.80","country":"CN","action":"auth_failure","reason":"failed login attempt 1/3","timestamp":"2026-09-25T21:55:01Z"}

event: security_event
data: {"service":"ssh","client_ip":"198.51.100.80","country":"CN","action":"banned","reason":"max failures exceeded","timestamp":"2026-09-25T21:55:04Z"}

event: security_event
data: {"service":"http","client_ip":"203.0.113.12","country":"US","action":"blocked","reason":"blocked_path_/.env","timestamp":"2026-09-25T21:55:10Z"}`
})

const eventsSnippets = computed(() => ({
  tcp: [
    { filename: 'cURL Stream', lang: 'bash', code: events_curl.cleanCode, html: events_curl.html, hasDiff: false },
    { filename: 'Live Output (SSE)', lang: 'sse', code: events_output.cleanCode, html: events_output.html, hasDiff: false },
  ]
}))
</script>

# HTTP API & Live Events

TCP Warden includes a built-in HTTP server listening on port `9091` (configurable via `api.listen` or `ROUTEWARDEN_API_LISTEN`) and optionally an IPC Unix domain socket (e.g. `/var/run/routewarden/tcp-warden.sock` via `api.socket` or `ROUTEWARDEN_API_SOCKET`).

Use it to:
- Check daemon health and uptime (`/health`, `/ping`).
- List configured services and protocols (`/api/services`).
- View real-time traffic and connection counts per service (`/stats` or `/api/stats`).
- View, add, or remove active IP bans (`/banlist`, `/ban`, `/unban`).
- Stream live security events directly in your terminal (`/events` or `/api/events`).

::: tip Unix Domain Socket Support
For secure local IPC without exposing TCP ports, query the daemon directly via Unix domain socket:
```bash
curl --unix-socket /var/run/routewarden/tcp-warden.sock http://localhost/stats
curl -N --unix-socket /var/run/routewarden/tcp-warden.sock http://localhost/events
```
:::

::: info Dual Route Prefixes
All endpoints are available both at the root (e.g. `/stats`, `/banlist`, `/events`) and under the `/api/` prefix (e.g. `/api/stats`, `/api/banlist`, `/api/events`).
:::

## Endpoints

### 1. Health Check (`GET /health`)

A quick check to confirm the daemon is up and running. Perfect for Docker health checks or Kubernetes probes.

<CodeViewer :snippets="healthSnippets" />

---

### 2. Traffic & Connection Stats (`GET /stats`)

Shows how many connections are active, total allowed and blocked requests, and bytes transferred for each service.

<CodeViewer :snippets="statsSnippets" />

---

### 3. Configured Services List (`GET /services`)

Lists all active services, their protocol inspectors, listening ports, and upstream destinations.

<CodeViewer :snippets="servicesSnippets" />

---

### 4. View Banned IPs (`GET /banlist`)

Lists all currently banned IPs, why they were banned, and when the ban expires.

<CodeViewer :snippets="banlistSnippets" />

---

### 5. Manually Ban an IP (`POST /ban`)

Block an offending IP address across all services:

<CodeViewer :snippets="banSnippets" />

---

### 6. Unban an IP (`POST /unban`)

Remove a ban immediately if an IP was blocked by mistake:

<CodeViewer :snippets="unbanSnippets" />

---

### 7. Live Security Events Stream (`GET /events`)

Watch security decisions live as they happen using **Server-Sent Events (SSE)**. You can pipe this into monitoring tools, Slack bots, or simply watch in your terminal:

<CodeViewer :snippets="eventsSnippets" />

