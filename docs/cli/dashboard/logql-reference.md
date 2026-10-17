---
title: Security Event Format & Query Reference — RouteWarden Dashboard
description: Specification of RouteWarden structured security log events, CLI filter flags, and real-time query syntax.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../../.vitepress/theme/composables/useCodeSnippet'

// ─── 1. Structured Log Event Snippet ────────────────────────────────────────
const event_json = buildSnippet({
  lang: 'json',
  code: `{
  "time": "2026-10-17T23:45:10Z",
  "client_ip": "203.0.113.195",
  "verdict": "BLOCK",
  "method": "GET",
  "path": "/.env",
  "rule": "BlockDotEnv",
  "status": 403,
  "latency_ms": 0.42
}`,
})

const query_cmd = buildSnippet({
  lang: 'bash',
  code: `# Filter exclusively for blocked threats
rwarden monitor --verdict BLOCK

# Filter by target path and client IP substring
rwarden monitor --path "/.env" --ip "203.0.113."

# Output raw lines for piping into GoAccess or jq
rwarden monitor --raw | jq 'select(.verdict=="BLOCK")'`,
})

const querySnippets = computed(() => ({
  cli: [
    { filename: 'Security Event JSON', lang: 'json', code: event_json.cleanCode, html: event_json.html, hasDiff: false },
    { filename: 'Filtering Queries', lang: 'bash', code: query_cmd.cleanCode, html: query_cmd.html, hasDiff: false },
  ],
}))
</script>

# Security Event Format & Query Reference

RouteWarden emits structured JSON events from all gateway plugins (Traefik, Caddy, NGINX, and TCP Warden). These events are normalized into Apache/Nginx Combined log format when ingested by the dashboard.

<CodeViewer :snippets="querySnippets" />

---

## Event Schema Specification

| Field | Type | Description |
|:---|:---|:---|
| `time` | string (RFC3339) | Timestamp when the request reached the gateway |
| `client_ip` | string | Offender client IP address (resolved via `trustedProxies`) |
| `verdict` | string | Enforcement action: `BLOCK`, `ALLOW`, or `TARPIT` |
| `method` | string | HTTP method: `GET`, `POST`, `PUT`, `DELETE`, etc. |
| `path` | string | Normalized request path evaluated by the engine |
| `rule` | string | Name or ID of the matched security rule |
| `status` | int | HTTP status code returned to the client (403, 429, 200) |
| `latency_ms` | float | Inspection latency incurred by the RouteWarden plugin |

---

## CLI Filtering Flags

The `rwarden monitor` command supports real-time stream filtering:

| Flag | Argument | Description |
|:---|:---|:---|
| `--verdict` | `BLOCK` / `ALLOW` / `TARPIT` | Show only events matching the verdict |
| `--ip` | `<substring>` | Filter events matching a client IP or subnet |
| `--path` | `<substring>` | Filter events targeting a specific path prefix |
| `--raw` | boolean | Output raw lines for direct Unix piping |
