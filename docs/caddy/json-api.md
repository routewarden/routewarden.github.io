---
title: "Caddy Warden: JSON API Reference"
---
<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

// ─── 1. Module Handler Identification ───────────────────────────────────────
const module_id = buildSnippet({
  lang: 'plaintext',
  code: `caddy.http.handlers.route_warden`,
})

const moduleIdSnippets = computed(() => ({
  caddy: [
    { filename: 'Handler ID', lang: 'plaintext', code: module_id.cleanCode, html: module_id.html, hasDiff: false },
  ],
}))

// ─── 2. Complete JSON Schema ────────────────────────────────────────────────
const schema_json = buildSnippet({
  lang: 'json',
  code: `{
  "handler": "route_warden",
  "enabled": true,
  "debug": false,
  "security_log": true,
  "enable_default_patterns": true,
  "enable_default_allow_patterns": true,
  "check_query": false,
  "block_patterns": [
    "(?i)^/admin(/.*)?$",
    "(?i)^/api/internal(/.*)?$"
  ],
  "allow_patterns": [
    "(?i)^/api/internal/health$",
    "(?i)^/robots\\\\.txt$"
  ],
  "allowed_ips": [
    "10.0.0.0/8",
    "192.168.1.100"
  ],
  "methods": [
    "GET",
    "POST"
  ],
  "response": {
    "mode": "json",
    "status_code": 403,
    "body": "{\\"error\\":\\"Forbidden: Internal Network Only\\"}",
    "redirect_url": "",
    "proxy_url": "",
    "gzip_bomb_mb": 10,
    "retry_after_seconds": 60,
    "tarpit_delay_ms": 1000,
    "stream_size_mb": 5,
    "captcha": {
      "provider": "turnstile",
      "site_key": "0x4AAAAAAAxxyyzz"
    }
  }
}`,
})

const schemaSnippets = computed(() => ({
  caddy: [
    { filename: 'caddy.json', lang: 'json', code: schema_json.cleanCode, html: schema_json.html, hasDiff: false },
  ],
}))

// ─── 3. Dynamic Runtime Update (cURL Example) ───────────────────────────────
const update_curl = buildSnippet({
  lang: 'bash',
  code: `curl -X POST http://localhost:2019/config/apps/http/servers/srv0/routes/0/handle/0 \\
  -H "Content-Type: application/json" \\
  -d '{
    "handler": "route_warden",
    "enabled": true,
    "security_log": true,
    "enable_default_patterns": true,
    "allowed_ips": ["10.0.0.0/8"],
    "methods": ["GET", "POST"],
    "response": {
      "mode": "json",
      "status_code": 404,
      "body": "{\\"error\\":\\"Not Found\\"}"
    }
  }'`,
})

const updateSnippets = computed(() => ({
  caddy: [
    { filename: 'cURL', lang: 'bash', code: update_curl.cleanCode, html: update_curl.html, hasDiff: false },
  ],
}))
</script>

# Caddy Warden: JSON API Reference

Caddy features a dynamic REST API that allows updating configuration at runtime with zero downtime.

---

## 1. Module Handler Identification

Caddy Warden registers itself in Caddy's HTTP middleware system under the ID:

<CodeViewer :snippets="moduleIdSnippets" />

When building routes via JSON, specify `"handler": "route_warden"` in your route handler list.

---

## 2. Complete JSON Schema

<CodeViewer :snippets="schemaSnippets" />

---

## 3. Dynamic Runtime Update (cURL Example)

Push a new security policy into a running Caddy instance without restarting the daemon:

<CodeViewer :snippets="updateSnippets" />
