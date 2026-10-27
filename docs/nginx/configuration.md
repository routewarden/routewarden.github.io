---
title: NGINX Configuration Reference
description: "Configuration reference and Lua table options for Routewarden OpenResty / NGINX module."
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
    -- Load base configuration from shared JSON policy file (optional)
    config_file = "/etc/routewarden/routewarden.json", -- [!code ++]

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

    -- ASN Allowlist & Offline Routing DB
    allowed_asns = { "AS13335", "64500" },
    asn_db = "/etc/routewarden/asn.json",
    trusted_proxies = { "10.0.0.0/8" },

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

// ─── 4. Config File Snippets ────────────────────────────────────────────────
const cfg_nginx = buildSnippet({
  lang: 'nginx',
  code: `http {
    init_by_lua_block {
        local routewarden = require("resty.routewarden")

        -- Load base policy from shared file with inline overrides
        warden = routewarden.new({ # [!code ++]
            config_file = "/etc/routewarden/routewarden.json", # [!code ++]
            # Override response mode just for this NGINX instance: # [!code ++]
            mode = "tarpit" # [!code ++]
        }) # [!code ++]
    }
}`,
})

const cfg_json = buildSnippet({
  lang: 'json',
  code: `{
  "enableDefaultPatterns": true,
  "enableDefaultAllowPatterns": true,
  "methods": ["GET", "POST"],
  "blockPatterns": [
    "(?i)^/admin(/.*)?$",
    "(?i)^/internal(/.*)?$"
  ],
  "allowedIps": ["10.0.0.0/8"],
  "response": {
    "mode": "json",
    "statusCode": 403
  }
}`,
})

const configFileSnippets = computed(() => ({
  nginx: [
    { filename: 'nginx.conf', lang: 'nginx', code: cfg_nginx.cleanCode, html: cfg_nginx.html, hasDiff: cfg_nginx.hasDiff },
    { filename: 'routewarden.json', lang: 'json', code: cfg_json.cleanCode, html: cfg_json.html, hasDiff: false },
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

Initialize Routewarden using `routewarden.new(config)` within NGINX's `init_by_lua_block` or `init_worker_by_lua_block`. The returned instance is re-entrant and shared across request worker threads:

<CodeViewer :snippets="initSnippets" />

---

## 2. Complete Configuration Options

<CodeViewer :snippets="fullConfigSnippets" />

---

## 3. Options Reference Table

| Key | Type | Default | Description |
|---|---|---|---|
| `config_file` | `string` | `nil` | Path to a `routewarden.json` base configuration file. Inline Lua table options override file settings. |
| `enabled` | `boolean` | `true` | Enables or disables Routewarden inspection. |
| `debug` | `boolean` | `false` | When true, logs normalization transformations and rule matching details. |
| `security_log` | `boolean` | `false` | Emits single-line structured JSON security events on stdout for CrowdSec and SIEM auto-ban. |
| `enable_default_patterns` | `boolean` | `true` | Intercepts common exposure targets (`.env`, `.git`, `.aws`, database dumps, actuator, debug files). |
| `enable_default_allow_patterns` | `boolean` | `true` | Permits standard discovery files (`/robots.txt`, `/sitemap*.xml`, `/.well-known/*`, `/security.txt`). |
| `check_query` | `boolean` | `false` | Inspects raw and URL-decoded query string parameters for sensitive targets. |
| `methods` | `table` | `{"GET"}` | Array of HTTP verbs to inspect. Verbs outside this list bypass inspection. |
| `allowed_ips` | `table` | `{}` | Array of IPv4/IPv6 addresses or CIDR subnets allowed to bypass path inspection. |
| `allowed_asns` | `table` | `{}` | Array of Autonomous System Numbers (`"AS64500"`, `"64500"`) allowed to bypass inspection. |
| `asn_db` | `string` | `nil` | Path to local JSON ASN routing snapshot file. |
| `trusted_proxies` | `table` | `{}` | Array of trusted upstream proxy CIDRs for real client IP extraction. |
| `block_patterns` | `table` | `{}` | Array of custom PCRE regular expressions to block. |
| `allow_patterns` | `table` | `{}` | Array of custom PCRE regular expressions to exempt from blocking. |
| `response` | `table` | `{ mode = "json", status_code = 403 }` | Response execution table. |

---

## 4. Config File (`config_file`)

Instead of writing all rules inline inside NGINX configuration blocks, point Routewarden at a shared `routewarden.json` file. Inline Lua table fields override file values, so you can maintain a single shared security policy and customize behavior per virtual host:

<CodeViewer :snippets="configFileSnippets" />

The `routewarden.json` file uses the standard Routewarden JSON schema (view it with `rwarden schema` or the [CLI Schema](/cli/schema)):

### Merge Semantics

| Priority | Source |
|---|---|
| **1 (wins)** | Inline Lua options in `routewarden.new({ ... })` |
| **2 (base)** | Fields from `config_file` (`routewarden.json`) |

- **Non-nil inline values override** corresponding file values.
- **Empty/omitted inline directives defer to the file** — you don't need to duplicate `block_patterns` just to change the response mode.
- A **missing or malformed file causes an immediate startup error**, preventing silent fallback to insecure defaults.

> [!TIP]
> Mount `routewarden.json` into your OpenResty container as a volume or Kubernetes ConfigMap to share uniform security rules across multiple NGINX instances.

---

## 5. ASN Allowlisting (`allowed_asns` & `asn_db`)

NGINX Warden supports Autonomous System Number (ASN) based allowlisting using an offline JSON routing snapshot compiled via `scripts/build-asn-db.py`:

```lua
http {
    init_by_lua_block {
        local routewarden = require("resty.routewarden")

        warden = routewarden.new({
            allowed_asns = { "AS13335", "64500" },
            asn_db = "/etc/routewarden/asn.json",
            trusted_proxies = { "10.0.0.0/8" },
            response = {
                mode = "json",
                status_code = 403
            }
        })
    }
}
```

- **In-Memory Performance**: Parsed into a longest-prefix radix table during worker initialization with zero runtime network/DNS overhead.
- **Strict Peer Resolution**: Client-supplied ASN headers are never trusted; only the TCP socket address or sanitized IP from `trusted_proxies` is evaluated.
- For complete snapshot instructions and architecture details, see the **[ASN Filtering Guide](/core/asn-filtering)**.

---

## 6. Response Modes Table

Routewarden for NGINX supports 13 response modes matching the core engine:

| Mode | Key Settings | Action |
|---|---|---|
| `json` | `status_code`, `body` | Sends structured JSON with `application/json` header. |
| `html` | `status_code`, `body` | Serves custom HTML error page. |
| `text` | `status_code`, `body` | Returns plain text with `text/plain`. |
| `xml` | `status_code`, `body` | Serves XML payload with `application/xml`. |
| `redirect` | `status_code`, `redirect_url` | Redirects client via HTTP 301, 302, or 307. |
| `captcha` | `captcha.provider`, `captcha.site_key` | Serves interactive Cloudflare Turnstile, hCaptcha, or reCAPTCHA page. |
| `silentDrop` | None | Terminates TCP connection immediately via NGINX `HTTP 444`. |
| `gzipBomb` | `gzip_bomb_mb` | Delivers highly compressed zero-byte gzip stream that expands in client RAM (supports fractional sizes e.g. `0.5`). |
| `tarpit` | `tarpit_delay_ms`, `tarpit_max_duration_seconds` | Trickles bytes slowly to tie up bot sockets and worker pools. |
| `fakeSuccess` | `status_code` (200), `body` (optional) | Deceptive honeypot returning realistic `.env`, `.git/HEAD`, or Spring Actuator mock data. |
| `rateLimitChallenge` | `retry_after_seconds` (300) | Returns HTTP 429 with standard `Retry-After` header. |
| `proxy` | `proxy_url` | Transparently proxies request to an internal canary or forensic honeypot container. |
| `infiniteStream` | `stream_size_mb` (100) | Streams high-speed random characters to exhaust scanner storage and buffers. |

---

## 7. Client IP Resolution

Routewarden evaluates client addresses using the following priority:
1. `X-Forwarded-For` header (first non-internal IP)
2. `X-Real-IP` header
3. Socket address `ngx.var.remote_addr`

When deploying behind Cloudflare, AWS ALB, or an outer proxy, set standard NGINX real-ip directives:

<CodeViewer :snippets="ipSnippets" />
