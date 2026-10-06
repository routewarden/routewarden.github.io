---
title: NGINX Cookbook & Recipes
---
<script setup>
import { computed, onMounted } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'
import { useGatewaySelection } from '../.vitepress/theme/composables/useGatewaySelection'

const { activeGateway } = useGatewaySelection()
onMounted(() => {
  activeGateway.value = 'nginx'
})

// ─── 1. Zero-Trust Admin & API Cloaking ───────────────────────────────────────
const r1_json = buildSnippet({
  lang: 'json',
  code: `{
  "$schema": "https://raw.githubusercontent.com/routewarden/cli/main/config.schema.json",
  "enabled": true,
  "enableDefaultPatterns": true,
  "blockPatterns": [
    "(?i)^/admin(/.*)?$",
    "(?i)^/metrics$"
  ],
  "allowPatterns": [
    "(?i)^/admin/health$"
  ],
  "allowedIps": [
    "10.0.0.0/8",
    "192.168.1.100"
  ],
  "methods": [
    "GET",
    "POST"
  ],
  "response": {
    "mode": "json",
    "statusCode": 404,
    "body": "{\\"error\\":\\"Not Found\\"}"
  }
}`,
})

const r1_nginx = buildSnippet({
  lang: 'nginx',
  code: `http {
    lua_package_path "/usr/local/openresty/site/lualib/?.lua;/etc/nginx/lua/lib/?.lua;/etc/nginx/lua/lib/?/init.lua;;";

    init_by_lua_block { # [!code ++]
        local routewarden = require("resty.routewarden") # [!code ++]
 # [!code ++]
        warden = routewarden.new({ # [!code ++]
            enable_default_patterns = true, # [!code ++]
            block_patterns = { # [!code ++]
                "(?i)^/admin(/.*)?$", # [!code ++]
                "(?i)^/metrics$" # [!code ++]
            }, # [!code ++]
            allow_patterns = { # [!code ++]
                "(?i)^/admin/health$" # [!code ++]
            }, # [!code ++]
            allowed_ips = { # [!code ++]
                "10.0.0.0/8", # [!code ++]
                "192.168.1.100" # [!code ++]
            }, # [!code ++]
            methods = { "GET", "POST" }, # [!code ++]
            response = { # [!code ++]
                mode = "json", # [!code ++]
                status_code = 404, # [!code ++]
                body = '{"error":"Not Found"}' # [!code ++]
            } # [!code ++]
        }) # [!code ++]
    } # [!code ++]

    server {
        listen 80;
        server_name app.example.com;

        access_by_lua_block { # [!code ++]
            warden:check() # [!code ++]
        } # [!code ++]

        location / {
            proxy_pass http://backend_app:8080;
        }
    }
}`,
})

const r1Snippets = computed(() => ({
  nginx: [
    { filename: 'nginx.conf', lang: 'nginx', code: r1_nginx.cleanCode, html: r1_nginx.html, hasDiff: r1_nginx.hasDiff },
  ],
  cli: [
    { filename: 'routewarden.json', lang: 'json', code: r1_json.cleanCode, html: r1_json.html, hasDiff: false },
  ],
}))

// ─── 2. Interactive Cloudflare Turnstile Challenge ────────────────────────────
const r2_json = buildSnippet({
  lang: 'json',
  code: `{
  "$schema": "https://raw.githubusercontent.com/routewarden/cli/main/config.schema.json",
  "enabled": true,
  "blockPatterns": [
    "(?i)^/portal/sensitive(/.*)?$"
  ],
  "response": {
    "mode": "captcha",
    "statusCode": 403,
    "captcha": {
      "provider": "turnstile",
      "siteKey": "0x4AAAAAAAxxyyzz",
      "title": "Security Verification"
    }
  }
}`,
})

const r2_nginx = buildSnippet({
  lang: 'nginx',
  code: `init_by_lua_block { # [!code ++]
    local routewarden = require("resty.routewarden") # [!code ++]
 # [!code ++]
    warden = routewarden.new({ # [!code ++]
        block_patterns = { # [!code ++]
            "(?i)^/portal/sensitive(/.*)?$" # [!code ++]
        }, # [!code ++]
        response = { # [!code ++]
            mode = "captcha", # [!code ++]
            captcha = { # [!code ++]
                provider = "turnstile", # [!code ++]
                site_key = "0x4AAAAAAAxxyyzz", # [!code ++]
                title = "Security Verification" # [!code ++]
            } # [!code ++]
        } # [!code ++]
    }) # [!code ++]
} # [!code ++]

server {
    listen 80;
    server_name portal.example.com;

    access_by_lua_block { # [!code ++]
        warden:check() # [!code ++]
    } # [!code ++]

    location / {
        proxy_pass http://portal_backend:3000;
    }
}`,
})

const r2Snippets = computed(() => ({
  nginx: [
    { filename: 'nginx.conf', lang: 'nginx', code: r2_nginx.cleanCode, html: r2_nginx.html, hasDiff: r2_nginx.hasDiff },
  ],
  cli: [
    { filename: 'routewarden.json', lang: 'json', code: r2_json.cleanCode, html: r2_json.html, hasDiff: false },
  ],
}))

// ─── 3. Honeypot Deception for Automated Scanners ─────────────────────────────
const r3_json = buildSnippet({
  lang: 'json',
  code: `{
  "$schema": "https://raw.githubusercontent.com/routewarden/cli/main/config.schema.json",
  "enabled": true,
  "enableDefaultPatterns": true,
  "response": {
    "mode": "fakeSuccess",
    "statusCode": 200
  }
}`,
})

const r3_nginx = buildSnippet({
  lang: 'nginx',
  code: `init_by_lua_block { # [!code ++]
    local routewarden = require("resty.routewarden") # [!code ++]
 # [!code ++]
    warden = routewarden.new({ # [!code ++]
        enable_default_patterns = true, # [!code ++]
        response = { # [!code ++]
            mode = "fakeSuccess", # [!code ++]
            status_code = 200 # [!code ++]
        } # [!code ++]
    }) # [!code ++]
} # [!code ++]

server {
    listen 80;
    server_name example.com;

    access_by_lua_block { # [!code ++]
        warden:check() # [!code ++]
    } # [!code ++]

    location / {
        proxy_pass http://upstream_service:8080;
    }
}`,
})

const r3Snippets = computed(() => ({
  nginx: [
    { filename: 'nginx.conf', lang: 'nginx', code: r3_nginx.cleanCode, html: r3_nginx.html, hasDiff: r3_nginx.hasDiff },
  ],
  cli: [
    { filename: 'routewarden.json', lang: 'json', code: r3_json.cleanCode, html: r3_json.html, hasDiff: false },
  ],
}))

// ─── 4. Gzip Bomb Active Defense ──────────────────────────────────────────────
const r4_json = buildSnippet({
  lang: 'json',
  code: `{
  "$schema": "https://raw.githubusercontent.com/routewarden/cli/main/config.schema.json",
  "enabled": true,
  "blockPatterns": [
    "(?i)^/.*\\\\.(sql|dump|bak|tar\\\\.gz)$"
  ],
  "response": {
    "mode": "gzipBomb",
    "statusCode": 200,
    "gzipBombMB": 10
  }
}`,
})

const r4_nginx = buildSnippet({
  lang: 'nginx',
  code: `init_by_lua_block { # [!code ++]
    local routewarden = require("resty.routewarden") # [!code ++]
 # [!code ++]
    warden = routewarden.new({ # [!code ++]
        block_patterns = { # [!code ++]
            "(?i)^/.*\\\\.(sql|dump|bak|tar\\\\.gz)$" # [!code ++]
        }, # [!code ++]
        response = { # [!code ++]
            mode = "gzipBomb", # [!code ++]
            gzip_bomb_mb = 10 # [!code ++]
        } # [!code ++]
    }) # [!code ++]
} # [!code ++]

server {
    listen 80;
    server_name example.com;

    access_by_lua_block { # [!code ++]
        warden:check() # [!code ++]
    } # [!code ++]

    location / {
        proxy_pass http://upstream_service:8080;
    }
}`,
})

const r4Snippets = computed(() => ({
  nginx: [
    { filename: 'nginx.conf', lang: 'nginx', code: r4_nginx.cleanCode, html: r4_nginx.html, hasDiff: r4_nginx.hasDiff },
  ],
  cli: [
    { filename: 'routewarden.json', lang: 'json', code: r4_json.cleanCode, html: r4_json.html, hasDiff: false },
  ],
}))

// ─── 5. Silent Connection Drop (HTTP 444) ─────────────────────────────────────
const r5_json = buildSnippet({
  lang: 'json',
  code: `{
  "$schema": "https://raw.githubusercontent.com/routewarden/cli/main/config.schema.json",
  "enabled": true,
  "blockPatterns": [
    "(?i)^/wp-admin(/.*)?$",
    "(?i)^/xmlrpc\\\\.php$"
  ],
  "response": {
    "mode": "silentDrop"
  }
}`,
})

const r5_nginx = buildSnippet({
  lang: 'nginx',
  code: `init_by_lua_block { # [!code ++]
    local routewarden = require("resty.routewarden") # [!code ++]
 # [!code ++]
    warden = routewarden.new({ # [!code ++]
        block_patterns = { # [!code ++]
            "(?i)^/wp-admin(/.*)?$", # [!code ++]
            "(?i)^/xmlrpc\\\\.php$" # [!code ++]
        }, # [!code ++]
        response = { # [!code ++]
            mode = "silentDrop" # [!code ++]
        } # [!code ++]
    }) # [!code ++]
} # [!code ++]

server {
    listen 80;
    server_name example.com;

    access_by_lua_block { # [!code ++]
        warden:check() # [!code ++]
    } # [!code ++]

    location / {
        proxy_pass http://upstream_service:8080;
    }
}`,
})

const r5Snippets = computed(() => ({
  nginx: [
    { filename: 'nginx.conf', lang: 'nginx', code: r5_nginx.cleanCode, html: r5_nginx.html, hasDiff: r5_nginx.hasDiff },
  ],
  cli: [
    { filename: 'routewarden.json', lang: 'json', code: r5_json.cleanCode, html: r5_json.html, hasDiff: false },
  ],
}))
</script>

# NGINX Cookbook & Recipes

Production patterns and ready-to-run configurations for deploying **NGINX Warden** on NGINX & OpenResty.

---

## 1. Zero-Trust Admin & API Cloaking

Allow corporate VPN (`10.0.0.0/8`) and office IP (`192.168.1.100`) access to `/admin` and `/metrics` while returning a stealth 404 to public crawlers:

<CodeViewer :snippets="r1Snippets" />

---

## 2. Interactive Cloudflare Turnstile Challenge

Protect sensitive administrative or registration paths by presenting an interactive Cloudflare Turnstile challenge:

<CodeViewer :snippets="r2Snippets" />

---

## 3. Honeypot Deception for Automated Scanners

Deceive vulnerability scanners targeting `.env` files and `.git` repositories by returning realistic synthetic mock data with HTTP 200 OK:

<CodeViewer :snippets="r3Snippets" />

---

## 4. Gzip Bomb Active Defense

Neutralize aggressive scrapers and crawlers probing for backup archives or database dumps by delivering a 10MB gzip bomb that expands to ~10GB in client memory:

<CodeViewer :snippets="r4Snippets" />

---

## 5. Silent Connection Drop (HTTP 444)

Reset TCP connections immediately for high-risk intrusion attempts without returning any HTTP headers:

<CodeViewer :snippets="r5Snippets" />
