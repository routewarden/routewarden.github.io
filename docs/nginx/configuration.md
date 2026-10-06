---
title: NGINX Configuration Reference
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

// ─── 1. Lua Module Initialization ─────────────────────────────────────────────
const init_http = buildSnippet({
  lang: 'nginx',
  code: `http {
    lua_package_path "/usr/local/openresty/site/lualib/?.lua;/etc/nginx/lua/lib/?.lua;/etc/nginx/lua/lib/?/init.lua;;";

    init_by_lua_block { # [!code ++]
        local routewarden = require("resty.routewarden") # [!code ++]
        warden = routewarden.new({ # [!code ++]
            -- Configuration options go here # [!code ++]
        }) # [!code ++]
    } # [!code ++]
}`,
})

const init_access = buildSnippet({
  lang: 'nginx',
  code: `server {
    listen 80;

    access_by_lua_block { # [!code ++]
        warden:check() # [!code ++]
    } # [!code ++]
    
    # ...
}`,
})

const initSnippets = computed(() => ({
  nginx: [
    { filename: 'init_by_lua_block (Worker Init)', lang: 'nginx', code: init_http.cleanCode, html: init_http.html, hasDiff: init_http.hasDiff },
    { filename: 'access_by_lua_block (Request Filter)', lang: 'nginx', code: init_access.cleanCode, html: init_access.html, hasDiff: init_access.hasDiff },
  ],
}))

// ─── 2. Complete Configuration Options ────────────────────────────────────────
const full_config = buildSnippet({
  lang: 'lua',
  code: `warden = routewarden.new({
    -- Master toggle
    enabled = true,                        -- Default: true
    debug = false,                         -- Default: false (outputs trace logs via ngx.log)
    security_log = true,                   -- Default: false (emits JSON security events for CrowdSec/SIEM)

    -- Built-in rules
    enable_default_patterns = true,        -- Default: true (blocks .env, .git, .aws, dumps, actuator)
    enable_default_allow_patterns = true,  -- Default: true (permits /robots.txt, /sitemap*.xml, /.well-known/*)

    -- Deep inspection
    check_query = false,                   -- Default: false (evaluates unescaped query string)
    check_headers = {                      -- Default: {} (inspects forwarded headers for path smuggling)
        "X-Forwarded-Uri",
        "X-Rewrite-URL"
    },

    -- HTTP Method filtering
    methods = { "GET", "HEAD" },           -- Default: { "GET" } (non-matching methods bypass checks)

    -- IP / CIDR Subnet Allowlist
    allowed_ips = {
        "127.0.0.1",
        "10.0.0.0/8",
        "192.168.1.0/24",
        "::1"
    },

    -- Custom regular expressions (PCRE-compatible)
    block_patterns = {
        "(?i)^/admin(/.*)?$",
        "(?i)^/api/internal(/.*)?$"
    },

    -- Safe pattern exemptions (takes precedence over block patterns)
    allow_patterns = {
        "(?i)^/api/internal/health$"
    },

    -- Response action configuration
    response = {
        mode = "json",                     -- Options: json, html, text, xml, redirect, captcha,
                                           -- silentDrop, gzipBomb, tarpit, fakeSuccess,
                                           -- rateLimitChallenge, proxy, infiniteStream
        status_code = 403,
        body = '{"error":"Access Denied"}',
        headers = {
            ["X-Frame-Options"] = "DENY"
        },
        redirect_url = "https://example.com/blocked",
        proxy_url = "http://127.0.0.1:9999/canary",
        gzip_bomb_mb = 10,
        retry_after_seconds = 300,
        tarpit_delay_ms = 1000,
        tarpit_max_duration_seconds = 60,
        stream_size_mb = 100,
        captcha = {
            provider = "turnstile",        -- Options: turnstile, hcaptcha, recaptcha
            site_key = "0x4AAAAAAAxxyyzz",
            title = "Security Verification"
        }
    }
})`,
})

const fullConfigSnippets = computed(() => ({
  nginx: [
    { filename: 'routewarden-config.lua', lang: 'lua', code: full_config.cleanCode, html: full_config.html, hasDiff: false },
  ],
}))

// ─── 5. Client IP Resolution ──────────────────────────────────────────────────
const ip_resolution = buildSnippet({
  lang: 'nginx',
  code: `set_real_ip_from 10.0.0.0/8;
set_real_ip_from 172.16.0.0/12;
set_real_ip_from 192.168.0.0/16;
real_ip_header X-Forwarded-For;
real_ip_recursive on;`,
})

const ipSnippets = computed(() => ({
  nginx: [
    { filename: 'real_ip.conf', lang: 'nginx', code: ip_resolution.cleanCode, html: ip_resolution.html, hasDiff: false },
  ],
}))
</script>

# NGINX Configuration Reference

Configuration schema, options, and parameters for **NGINX Warden** (`github.com/routewarden/nginx-warden`).

---

## 1. Lua Module Initialization

Initialize RouteWarden using `routewarden.new(config)` within NGINX's `init_by_lua_block` or `init_worker_by_lua_block`. The returned instance is re-entrant and shared across request worker threads:

<CodeViewer :snippets="initSnippets" />

---

## 2. Complete Configuration Options

<CodeViewer :snippets="fullConfigSnippets" />

---

## 3. Options Reference Table

| Key | Type | Default | Description |
|---|---|---|---|
| `enabled` | `boolean` | `true` | Enables or disables RouteWarden inspection. |
| `debug` | `boolean` | `false` | When true, logs normalization transformations and rule matching details. |
| `security_log` | `boolean` | `false` | Emits single-line structured JSON security events on stdout for CrowdSec and SIEM auto-ban. |
| `enable_default_patterns` | `boolean` | `true` | Intercepts common exposure targets (`.env`, `.git`, `.aws`, database dumps, actuator, debug files). |
| `enable_default_allow_patterns` | `boolean` | `true` | Permits standard discovery files (`/robots.txt`, `/sitemap*.xml`, `/.well-known/*`, `/security.txt`). |
| `check_query` | `boolean` | `false` | Inspects raw and URL-decoded query string parameters for sensitive targets. |
| `methods` | `table` | `{"GET"}` | Array of HTTP verbs to inspect. Verbs outside this list bypass inspection. |
| `allowed_ips` | `table` | `{}` | Array of IPv4/IPv6 addresses or CIDR subnets allowed to bypass path inspection. |
| `block_patterns` | `table` | `{}` | Array of custom PCRE regular expressions to block. |
| `allow_patterns` | `table` | `{}` | Array of custom PCRE regular expressions to exempt from blocking. |
| `response` | `table` | `{ mode = "json", status_code = 403 }` | Response execution table. |

---

## 4. Response Modes Table

RouteWarden for NGINX supports 13 response modes matching the core engine:

| Mode | Key Settings | Action |
|---|---|---|
| `json` | `status_code`, `body` | Sends structured JSON with `application/json` header. |
| `html` | `status_code`, `body` | Serves custom HTML error page. |
| `text` | `status_code`, `body` | Returns plain text with `text/plain`. |
| `xml` | `status_code`, `body` | Serves XML payload with `application/xml`. |
| `redirect` | `status_code`, `redirect_url` | Redirects client via HTTP 301, 302, or 307. |
| `captcha` | `captcha.provider`, `captcha.site_key` | Serves interactive Cloudflare Turnstile, hCaptcha, or reCAPTCHA page. |
| `silentDrop` | None | Terminates TCP connection immediately via NGINX `HTTP 444`. |
| `gzipBomb` | `gzip_bomb_mb` | Delivers highly compressed zero-byte gzip stream that expands in client RAM. |
| `tarpit` | `tarpit_delay_ms`, `tarpit_max_duration_seconds` | Trickles bytes slowly to tie up bot sockets and worker pools. |
| `fakeSuccess` | `status_code` (200), `body` (optional) | Deceptive honeypot returning realistic `.env`, `.git/HEAD`, or Spring Actuator mock data. |
| `rateLimitChallenge` | `retry_after_seconds` (300) | Returns HTTP 429 with standard `Retry-After` header. |
| `proxy` | `proxy_url` | Transparently proxies request to an internal canary or forensic honeypot container. |
| `infiniteStream` | `stream_size_mb` (100) | Streams high-speed random characters to exhaust scanner storage and buffers. |

---

## 5. Client IP Resolution

RouteWarden evaluates client addresses using the following priority:
1. `X-Forwarded-For` header (first non-internal IP)
2. `X-Real-IP` header
3. Socket address `ngx.var.remote_addr`

When deploying behind Cloudflare, AWS ALB, or an outer proxy, set standard NGINX real-ip directives:

<CodeViewer :snippets="ipSnippets" />
