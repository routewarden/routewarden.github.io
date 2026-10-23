---
title: Caddyfile Directive & JSON Reference
---
<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

// ─── 1. Directive Ordering ──────────────────────────────────────────────────
const order_handle = buildSnippet({
  lang: 'caddy',
  code: `{
    # Recommended when site definitions use handle or handle_path
    order routewarden before handle # [!code ++]
}`,
})

const order_basicauth = buildSnippet({
  lang: 'caddy',
  code: `{
    order routewarden before basicauth # [!code ++]
}`,
})

const order_reverse_proxy = buildSnippet({
  lang: 'caddy',
  code: `{
    order routewarden before reverse_proxy # [!code ++]
}`,
})

const order_route_block = buildSnippet({
  lang: 'caddy',
  code: `example.com {
    # Directives placed inside a route block evaluate strictly in order
    route { # [!code ++]
        routewarden { # [!code ++]
            # configuration # [!code ++]
        } # [!code ++]
        reverse_proxy backend:8080
    }
}`,
})

const orderingSnippets = computed(() => ({
  caddy: [
    { filename: 'Before Handle (Recommended)', lang: 'caddy', code: order_handle.cleanCode, html: order_handle.html, hasDiff: order_handle.hasDiff },
    { filename: 'Before Reverse Proxy', lang: 'caddy', code: order_reverse_proxy.cleanCode, html: order_reverse_proxy.html, hasDiff: order_reverse_proxy.hasDiff },
    { filename: 'Before Basicauth', lang: 'caddy', code: order_basicauth.cleanCode, html: order_basicauth.html, hasDiff: order_basicauth.hasDiff },
    { filename: 'Inside Route Block', lang: 'caddy', code: order_route_block.cleanCode, html: order_route_block.html, hasDiff: order_route_block.hasDiff },
  ],
}))

// ─── 2. Complete Caddyfile Schema ───────────────────────────────────────────
const schema_code = buildSnippet({
  lang: 'caddy',
  code: `routewarden {
    # Load base config from a shared JSON file (inline fields override file values)
    config_file <path>                              # e.g. /etc/routewarden/routewarden.json

    # Boolean Flags
    enabled <true|false>                        # Default: true
    debug <true|false>                          # Default: false (verbose diagnostic logs)
    security_log <true|false>                   # Default: true (emit structured JSON audit events on stdout)
    enable_default_patterns <true|false>        # Default: true (.env, .git, backups, keys, etc.)
    enable_default_allow_patterns <true|false>  # Default: true (/robots.txt, /favicon.ico, etc.)
    check_query <true|false>                    # Default: false (inspect URI query strings)
    check_headers <headers...>                  # Optional: inspect forwarded headers (e.g. X-Forwarded-Uri X-Rewrite-URL)

    # Path Patterns to Block or Challenge (Go RE2 Regular Expressions)
    block_patterns <regex...>

    # Safe Whitelist Patterns (Overrides blocking)
    allow_patterns <regex...>

    # IP / CIDR Subnet Allowlist (Bypasses all checks)
    allowed_ips <ip_or_cidr...>

    # HTTP Methods to Inspect (Default: GET)
    methods <methods...>

    # Response Actions
    response {
        mode <json|html|text|xml|redirect|captcha|silent_drop|gzip_bomb|tarpit|fake_success|ratelimit|proxy|infinite_stream>
        status_code <int>
        body <string>
        redirect_url <url>
        proxy_url <url>
        gzip_bomb_mb <number>
        retry_after_seconds <int>
        tarpit_delay_ms <int>
        stream_size_mb <int>

        captcha {
            provider <turnstile|hcaptcha|recaptcha>
            site_key <key>
        }
    }
}`,
})

const schemaSnippets = computed(() => ({
  caddy: [
    { filename: 'Caddyfile Schema', lang: 'caddy', code: schema_code.cleanCode, html: schema_code.html, hasDiff: false },
  ],
}))

// ─── 4. Config File Snippets ───────────────────────────────────────────────
const config_file_caddy = buildSnippet({
  lang: 'caddy',
  code: `example.com {
    route {
        routewarden {
            config_file /etc/routewarden/routewarden.json # [!code ++]
            # Override just the response mode for this site:
            mode tarpit # [!code ++]
        }
        reverse_proxy backend:8080
    }
}`,
})

const config_file_json = buildSnippet({
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
  caddy: [
    { filename: 'Caddyfile', lang: 'caddy', code: config_file_caddy.cleanCode, html: config_file_caddy.html, hasDiff: config_file_caddy.hasDiff },
    { filename: 'routewarden.json', lang: 'json', code: config_file_json.cleanCode, html: config_file_json.html, hasDiff: false },
  ],
}))

// ─── 5. JSON Configuration (Caddy REST API) ─────────────────────────────────
const api_code = buildSnippet({
  lang: 'json',
  code: `{
  "handler": "routewarden", // [!code ++]
  "config_file": "/etc/routewarden/routewarden.json", // [!code ++]
  "enabled": true, // [!code ++]
  "enable_default_patterns": true, // [!code ++]
  "allowed_ips": ["10.0.0.0/8", "192.168.1.50"], // [!code ++]
  "methods": ["GET", "POST"], // [!code ++]
  "block_patterns": ["(?i)^/admin(/.*)?$"], // [!code ++]
  "allow_patterns": ["(?i)^/admin/health$"], // [!code ++]
  "response": { // [!code ++]
    "mode": "json", // [!code ++]
    "status_code": 403, // [!code ++]
    "body": "{\\"error\\":\\"Forbidden: Authorized Access Only\\"}" // [!code ++]
  } // [!code ++]
}`,
})

const apiSnippets = computed(() => ({
  caddy: [
    { filename: 'caddy-api.json', lang: 'json', code: api_code.cleanCode, html: api_code.html, hasDiff: api_code.hasDiff },
  ],
}))

const order_error = buildSnippet({
  lang: 'text',
  code: `directive 'routewarden' is not an ordered HTTP handler, so it cannot be used here - try placing within a route block or using the order global option`,
})

const orderErrorSnippets = computed(() => ({
  caddy: [
    { filename: 'caddy.log', lang: 'text', code: order_error.cleanCode, html: order_error.html, hasDiff: false },
  ],
}))
</script>

# Caddy Warden: Caddyfile Reference

Comprehensive syntax and configuration options for **Caddy Warden** (`github.com/routewarden/caddy-warden`).

---

## 1. Directive Ordering

Caddy evaluates HTTP handler directives strictly according to an internal order. Custom third-party directives like `routewarden` (or `route_warden`) do not have a hardcoded position in Caddy's directive list. If placed alongside handlers like `reverse_proxy` without ordering, Caddy fails at startup with:

<CodeViewer :snippets="orderErrorSnippets" />

To resolve this, declare directive ordering in your Caddyfile's global options block:

<CodeViewer :snippets="orderingSnippets" />

> [!TIP]
> **Using a `route` Block**: Alternatively, select the **Inside Route Block** tab in the CodeViewer above. Encapsulating RouteWarden and your upstream proxy inside a `route { ... }` block instructs Caddy to execute directives strictly in the order they are written, eliminating the need for global options.

> [!IMPORTANT]
> **Using `handle` or `handle_path` Blocks?**
> In Caddy, `handle` blocks take routing priority over standard handlers. If your site blocks encapsulate `reverse_proxy` inside a `handle` block, use **`order routewarden before handle`** or wrap your site inside a `route { ... }` block to prevent requests from bypassing RouteWarden. See the [Caddy Warden FAQ](./faq) for detailed examples.

---

## 2. Complete Caddyfile Schema

<CodeViewer :snippets="schemaSnippets" />

---

## 3. Configuration Properties

| Directive | Type | Default | Description |
|---|---|---|---|
| `config_file` | `string` | `""` | Path to a `routewarden.json` file loaded as the base config. Inline Caddyfile fields take precedence over the file. |
| `enabled` | `bool` | `true` | Enables or disables RouteWarden inspection. |
| `debug` | `bool` | `false` | Enables verbose diagnostic logging in Caddy's logger. |
| `security_log` | `bool` | `true` | Emits single-line structured JSON security events on stdout for CrowdSec, SIEMs, or log aggregators on blocked requests. |
| `enable_default_patterns` | `bool` | `true` | Blocks high-risk files (`.env`, `.git`, `.aws`, `.ssh`, `.sql`, `.bak`, etc.). |
| `enable_default_allow_patterns` | `bool` | `true` | Whitelists standard files like `/robots.txt`, `/favicon.ico`, `/sitemap.xml`. |
| `check_query` | `bool` | `false` | When enabled, also evaluates query parameters for sensitive file targets. |
| `block_patterns` | `list` | `[]` | Additional regex patterns to intercept. |
| `allow_patterns` | `list` | `[]` | Regex patterns that should always be allowed through. |
| `allowed_ips` | `list` | `[]` | IPv4, IPv6, or CIDR blocks exempted from checks. |
| `methods` | `list` | `["GET"]` | HTTP verbs to inspect (e.g. `methods GET POST`). Non-matching verbs bypass inspection. |

> [!IMPORTANT]
> **Inspecting Non-GET Methods (`methods`)**: By default, RouteWarden only inspects `GET` requests (`methods GET`). If you are blocking API endpoints, authentication routes (e.g. `POST /api/auth/login`), or administrative actions that accept `POST`, `PUT`, `DELETE`, or `PATCH`, you **must** configure `methods` to include them (e.g. `methods GET POST PUT DELETE PATCH HEAD`). Unlisted HTTP verbs bypass RouteWarden entirely and flow straight to the backend.

> [!TIP]
> **CrowdSec Integration**: For automated attacker remediation using `security_log`, see the **[CrowdSec Integration Guide](/examples/crowdsec)**.

---

## 4. Config File (`config_file`)

Instead of inlining every option in your Caddyfile, point RouteWarden at a shared `routewarden.json` file. Inline Caddyfile fields always override file values, so you can keep a single shared policy file and customize per-site behaviour in the Caddyfile.

<CodeViewer :snippets="configFileSnippets" />

The `routewarden.json` file uses the standard RouteWarden JSON schema (view it with `rwarden schema` or the [CLI Schema](/cli/schema)):

### Merge Semantics

| Priority | Source |
|---|---|
| **1 (wins)** | Inline `Caddyfile` / JSON API fields |
| **2 (base)** | Fields from `config_file` |

- Empty/omitted Caddyfile directives defer to the file — you don't need to re-specify `block_patterns` just to change `mode`.
- A missing or malformed file causes a **hard startup error**.

> [!TIP]
> Mount `routewarden.json` as a Docker volume or Kubernetes ConfigMap and reference it from each virtual host's Caddyfile block for consistent policy across all services.

---

## 5. Built-in Default Patterns

### Default Block Patterns (`enable_default_patterns true`)

When enabled (default), Caddy Warden intercepts requests matching these compiled regular expressions:

| Target Category | Compiled Regex | Intercepted Examples |
|---|---|---|
| **Environment & Configs** | `(?i)(^|/)(\.env.*|.*\.(txt|log|bak|backup|sql|conf|config|ini|yaml|yml))$` | `/.env`, `/.env.production`, `/app.config`, `/dump.sql`, `/debug.log`, `/app.ini` |
| **VCS & Hidden Metadata** | `(?i)(^|/)\.(git|svn|hg|bzr|cvs)(/.*|$)` | `/.git/config`, `/.git/HEAD`, `/.svn/entries` |
| **Cloud & Shell Credentials** | `(?i)(^|/)\.(aws|ssh|kube|docker)(/.*|$)` | `/.aws/credentials`, `/.ssh/id_rsa`, `/.kube/config` |
| **Archives & DB Dumps** | `(?i).*\.(tar|tar\.gz|tgz|zip|rar|7z|gz|bz2|iso|dump|sqlite|sqlite3|db)$` | `/backup.tar.gz`, `/site.zip`, `/users.dump`, `/data.sqlite3` |
| **Sensitive Admin & Metrics** | `(?i)(^|/)(phpinfo\.php|info\.php|server-status|server-info|actuator(/.*)?|metrics|heapdump|trace|env)$` | `/phpinfo.php`, `/server-status`, `/actuator/health`, `/metrics` |
| **Package Managers & Locks** | `(?i)(^|/)(composer\.(json|lock)|package-lock\.json|yarn\.lock|pnpm-lock\.yaml|Pipfile|Pipfile\.lock|requirements\.txt)$` | `/package-lock.json`, `/yarn.lock`, `/composer.lock`, `/requirements.txt` |

### Default Allow Patterns (`enable_default_allow_patterns true`)

When enabled (default), Caddy Warden immediately allows standard public resources through without checking block rules:

| Target Resource | Compiled Regex | Purpose |
|---|---|---|
| **Crawler Indexing Directives** | `(?i)^/robots\.txt$` | Search engine bot crawling policy |
| **Search Engine XML Sitemaps** | `(?i)^/sitemap.*\.xml$` | Public sitemaps (`/sitemap.xml`, `/sitemap_index.xml`) |
| **Digital Ad Transparency** | `(?i)^/ads\.txt$` | Authorized digital advertising sellers verification |
| **Security Disclosure Policies** | `(?i)^/security\.txt$` | RFC 9116 security researcher reporting endpoint |
| **ACME & Web Standards** | `(?i)^/\.well-known(/.*)?$` | TLS certificate challenges & discovery (`/.well-known/*`) |

---

## 6. Response Modes Matrix

| Mode | Options | Typical Use Case |
|---|---|---|
| `json` | `status_code`, `body` | REST API protection with clean JSON error |
| `html` | `status_code`, `body` | Custom branded 404 or 403 error page |
| `text` | `status_code`, `body` | Minimal plain-text rejection |
| `redirect` | `status_code`, `redirect_url` | Deflect scanners to honeypot or warning page |
| `captcha` | `captcha.provider`, `captcha.site_key` | Challenge suspicious visits via Cloudflare Turnstile/hCaptcha |
| `silent_drop` | None | Reset TCP connection immediately (`conn.Close()`) |
| `gzip_bomb` | `status_code`, `gzip_bomb_mb` | Active defense memory-exhaustion trap |
| `tarpit` | `tarpit_delay_ms` | Slowloris defense trickling bytes to tie up scanner concurrency |
| `ratelimit` | `status_code`, `retry_after_seconds` | 429 Too Many Requests response |
| `proxy` | `proxy_url` | Transparent canary/forensics honeypot mirror |
| `fake_success` | `status_code`, `body` | Synthetic decoy responses (`wp-login`, fake `.env`) |

> [!WARNING]
> **`silent_drop` Behind Edge Proxies / CDNs (502 Bad Gateway)**:
> In `silent_drop` mode, RouteWarden terminates the TCP socket immediately without sending an HTTP status line. If Caddy is deployed behind **Cloudflare, AWS ALB, NGINX, Traefik, or any reverse proxy / CDN**, the edge proxy detects an abrupt connection termination and presents a **`502 Bad Gateway`** error to the client.
> 
> When debugging unexpected 502 errors or when clean client responses are required, switch to `mode json` or `mode html` with `status_code 403` or `404`.

---

## 7. JSON Configuration (Caddy REST API)

For zero-downtime environments configured via Caddy's dynamic API:

<CodeViewer :snippets="apiSnippets" />
