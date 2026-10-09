---
title: Case Study – Media Streaming Defense (Jellyfin & Plex)
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

const s = {
  traefik_yaml: buildSnippet({ lang: 'yaml', code: `# dynamic_conf.yml
http:
  middlewares:
    media-shield: # [!code ++]
      plugin: # [!code ++]
        routewarden: # [!code ++]
          enabled: true # [!code ++]
          methods: # [!code ++]
            - GET # [!code ++]
            - POST # [!code ++]
            - PUT # [!code ++]
            - DELETE # [!code ++]
            - PATCH # [!code ++]
            - HEAD # [!code ++]
          enableDefaultPatterns: true # [!code ++]
          # Shield administrative settings, user provisioning, and plugin managers
          blockPatterns: # [!code ++]
            - '(?i)^/(admin|System|Plugins|Users/New)(/.*)?$' # [!code ++]
            - '(?i)^/web/index\\.html#!/dashboard.*$' # [!code ++]
            - '(?i)^/web/index\\.html#!/apikeys.*$' # [!code ++]
          # Trusted Home LAN and Tailscale / WireGuard VPN subnets
          allowedIps: # [!code ++]
            - "10.0.0.0/8"        # Internal Home LAN # [!code ++]
            - "100.64.0.0/10"      # Tailscale CGNAT range # [!code ++]
            - "192.168.1.0/24"     # Home Office Subnet # [!code ++]
            - "127.0.0.1"         # Localhost # [!code ++]
          response: # [!code ++]
            mode: json # [!code ++]
            statusCode: 404 # [!code ++]
            body: '{"error":"Not Found","message":"The requested resource was not found"}' # [!code ++]

  routers:
    media-router:
      rule: "Host(\`media.example.com\`)"
      entryPoints:
        - websecure
      middlewares:
        - media-shield # [!code ++]
      service: media-service` }),

  traefik_toml: buildSnippet({ lang: 'toml', code: `# dynamic_conf.toml
[http.routers.media-router]
  rule = "Host(\`media.example.com\`)"
  entryPoints = ["websecure"]
  middlewares = ["media-shield"]
  service = "media-service"

[http.middlewares.media-shield.plugin.routewarden] # [!code ++]
  enabled = true # [!code ++]
  methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"] # [!code ++]
  enableDefaultPatterns = true # [!code ++]
  blockPatterns = [ # [!code ++]
    "(?i)^/(admin|System|Plugins|Users/New)(/.*)?$", # [!code ++]
    "(?i)^/web/index\\\\.html#!/dashboard.*$", # [!code ++]
    "(?i)^/web/index\\\\.html#!/apikeys.*$" # [!code ++]
  ] # [!code ++]
  allowedIps = ["10.0.0.0/8", "100.64.0.0/10", "192.168.1.0/24", "127.0.0.1"] # [!code ++]

[http.middlewares.media-shield.plugin.routewarden.response] # [!code ++]
  mode = "json" # [!code ++]
  statusCode = 404 # [!code ++]
  body = '{"error":"Not Found","message":"The requested resource was not found"}' # [!code ++]` }),

  traefik_labels: buildSnippet({ lang: 'docker', code: `# Docker Compose Labels on jellyfin/server container
- "traefik.enable=true"
- "traefik.http.routers.media.rule=Host(\`media.example.com\`)"
- "traefik.http.routers.media.entrypoints=websecure"
- "traefik.http.routers.media.middlewares=media-shield" # [!code ++]
- "traefik.http.middlewares.media-shield.plugin.routewarden.enabled=true" # [!code ++]
- "traefik.http.middlewares.media-shield.plugin.routewarden.methods=GET,POST,PUT,DELETE,PATCH,HEAD" # [!code ++]
- "traefik.http.middlewares.media-shield.plugin.routewarden.blockPatterns=(?i)^/(admin|System|Plugins|Users/New)(/.*)?$,(?i)^/web/index\\.html#!/dashboard.*$,(?i)^/web/index\\.html#!/apikeys.*$" # [!code ++]
- "traefik.http.middlewares.media-shield.plugin.routewarden.allowedIps=10.0.0.0/8,100.64.0.0/10,192.168.1.0/24,127.0.0.1" # [!code ++]
- "traefik.http.middlewares.media-shield.plugin.routewarden.response.mode=json" # [!code ++]
- "traefik.http.middlewares.media-shield.plugin.routewarden.response.statusCode=404" # [!code ++]` }),

  caddy: buildSnippet({ lang: 'caddy', code: `# Caddyfile
{
    order route_warden before reverse_proxy # [!code ++]
}

media.example.com {
    route_warden { # [!code ++]
        methods GET POST PUT DELETE PATCH HEAD # [!code ++]
        enable_default_patterns true # [!code ++]
        block_patterns "(?i)^/(admin|System|Plugins|Users/New)(/.*)?$" "(?i)^/web/index\\.html#!/dashboard.*$" "(?i)^/web/index\\.html#!/apikeys.*$" # [!code ++]
        allowed_ips "10.0.0.0/8" "100.64.0.0/10" "192.168.1.0/24" "127.0.0.1" # [!code ++]
        response { # [!code ++]
            mode json # [!code ++]
            status_code 404 # [!code ++]
            body "{\\"error\\":\\"Not Found\\",\\"message\\":\\"The requested resource was not found\\"}" # [!code ++]
        } # [!code ++]
    } # [!code ++]

    reverse_proxy jellyfin:8096
}` }),

  nginx: buildSnippet({ lang: 'nginx', code: `# nginx.conf: Media Server Defense
http {
    lua_package_path "/usr/local/openresty/site/lualib/?.lua;/etc/nginx/lua/lib/?.lua;;";

    init_by_lua_block {
        local routewarden = require("resty.routewarden") # [!code ++]

        media_warden = routewarden.new({ # [!code ++]
            methods = { "GET", "POST", "PUT", "DELETE", "PATCH", "HEAD" }, # [!code ++]
            enable_default_patterns = true, # [!code ++]
            block_patterns = { # [!code ++]
                "(?i)^/(admin|System|Plugins|Users/New)(/.*)?$", # [!code ++]
                "(?i)^/web/index\\.html#!/dashboard.*$", # [!code ++]
                "(?i)^/web/index\\.html#!/apikeys.*$" # [!code ++]
            }, # [!code ++]
            allowed_ips = { # [!code ++]
                "10.0.0.0/8", "100.64.0.0/10", "192.168.1.0/24", "127.0.0.1" # [!code ++]
            }, # [!code ++]
            response = { # [!code ++]
                mode = "json", # [!code ++]
                status_code = 404, # [!code ++]
                body = '{"error":"Not Found","message":"The requested resource was not found"}' # [!code ++]
            } # [!code ++]
        }) # [!code ++]
    }

    server {
        listen 80;
        server_name media.example.com;

        access_by_lua_block {
            media_warden:check() # [!code ++]
        }

        location / {
            proxy_pass http://jellyfin:8096;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
    }
}` }),

  cli: buildSnippet({ lang: 'json', code: `// routewarden.json
{
  "$schema": "https://raw.githubusercontent.com/routewarden/cli/main/config.schema.json",
  "enabled": true,
  "methods": ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"],
  "enableDefaultPatterns": true,
  "blockPatterns": [
    "(?i)^/(admin|System|Plugins|Users/New)(/.*)?$",
    "(?i)^/web/index\\\\.html#!/dashboard.*$",
    "(?i)^/web/index\\\\.html#!/apikeys.*$"
  ],
  "allowedIps": [
    "10.0.0.0/8",
    "100.64.0.0/10",
    "192.168.1.0/24",
    "127.0.0.1"
  ],
  "response": {
    "mode": "json",
    "statusCode": 404,
    "body": "{\\"error\\":\\"Not Found\\",\\"message\\":\\"The requested resource was not found\\"}"
  }
}` }),
}

const jellyfinSnippets = computed(() => ({
  traefik: [
    { filename: 'traefik.yaml', lang: 'yaml', code: s.traefik_yaml.cleanCode, html: s.traefik_yaml.html, hasDiff: s.traefik_yaml.hasDiff },
    { filename: 'traefik.toml', lang: 'toml', code: s.traefik_toml.cleanCode, html: s.traefik_toml.html, hasDiff: s.traefik_toml.hasDiff },
    { filename: 'docker-compose.yaml', lang: 'docker', code: s.traefik_labels.cleanCode, html: s.traefik_labels.html, hasDiff: s.traefik_labels.hasDiff },
  ],
  caddy: [
    { filename: 'Caddyfile', lang: 'caddy', code: s.caddy.cleanCode, html: s.caddy.html, hasDiff: s.caddy.hasDiff },
  ],
  nginx: [
    { filename: 'nginx.conf', lang: 'nginx', code: s.nginx.cleanCode, html: s.nginx.html, hasDiff: s.nginx.hasDiff },
  ],
  cli: [
    { filename: 'routewarden.json', lang: 'json', code: s.cli.cleanCode, html: s.cli.html, hasDiff: s.cli.hasDiff },
  ],
}))

const plex = {
  traefik_yaml: buildSnippet({ lang: 'yaml', code: `# dynamic_conf.yml - Plex Media Server
http:
  middlewares:
    plex-shield: # [!code ++]
      plugin: # [!code ++]
        routewarden: # [!code ++]
          enabled: true # [!code ++]
          methods: # [!code ++]
            - GET # [!code ++]
            - POST # [!code ++]
            - PUT # [!code ++]
            - DELETE # [!code ++]
            - PATCH # [!code ++]
            - HEAD # [!code ++]
          enableDefaultPatterns: true # [!code ++]
          blockPatterns: # [!code ++]
            - '(?i)^/(system|updater|activities|diagnostics|manage)(/.*)?$' # [!code ++]
            - '(?i)^/web/index\\.html#!/settings.*$' # [!code ++]
            - '(?i)^/servers(/.*)?$' # [!code ++]
          allowedIps: # [!code ++]
            - "10.0.0.0/8" # [!code ++]
            - "100.64.0.0/10" # [!code ++]
            - "192.168.1.0/24" # [!code ++]
            - "127.0.0.1" # [!code ++]
          response: # [!code ++]
            mode: json # [!code ++]
            statusCode: 404 # [!code ++]
            body: '{"error":"Not Found","message":"The requested resource was not found"}' # [!code ++]

  routers:
    plex-router:
      rule: "Host(\`plex.example.com\`)"
      entryPoints:
        - websecure
      middlewares:
        - plex-shield # [!code ++]
      service: plex-service` }),

  traefik_toml: buildSnippet({ lang: 'toml', code: `# dynamic_conf.toml - Plex Media Server
[http.routers.plex-router]
  rule = "Host(\`plex.example.com\`)"
  entryPoints = ["websecure"]
  middlewares = ["plex-shield"]
  service = "plex-service"

[http.middlewares.plex-shield.plugin.routewarden] # [!code ++]
  enabled = true # [!code ++]
  methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"] # [!code ++]
  enableDefaultPatterns = true # [!code ++]
  blockPatterns = [ # [!code ++]
    "(?i)^/(system|updater|activities|diagnostics|manage)(/.*)?$", # [!code ++]
    "(?i)^/web/index\\\\.html#!/settings.*$", # [!code ++]
    "(?i)^/servers(/.*)?$" # [!code ++]
  ] # [!code ++]
  allowedIps = ["10.0.0.0/8", "100.64.0.0/10", "192.168.1.0/24", "127.0.0.1"] # [!code ++]

[http.middlewares.plex-shield.plugin.routewarden.response] # [!code ++]
  mode = "json" # [!code ++]
  statusCode = 404 # [!code ++]
  body = '{"error":"Not Found","message":"The requested resource was not found"}' # [!code ++]` }),

  traefik_labels: buildSnippet({ lang: 'docker', code: `# Docker Compose Labels on plexinc/pms-docker container
- "traefik.enable=true"
- "traefik.http.routers.plex.rule=Host(\`plex.example.com\`)"
- "traefik.http.routers.plex.entrypoints=websecure"
- "traefik.http.routers.plex.middlewares=plex-shield" # [!code ++]
- "traefik.http.middlewares.plex-shield.plugin.routewarden.enabled=true" # [!code ++]
- "traefik.http.middlewares.plex-shield.plugin.routewarden.methods=GET,POST,PUT,DELETE,PATCH,HEAD" # [!code ++]
- "traefik.http.middlewares.plex-shield.plugin.routewarden.blockPatterns=(?i)^/(system|updater|activities|diagnostics|manage)(/.*)?$,(?i)^/web/index\\.html#!/settings.*$,(?i)^/servers(/.*)?$" # [!code ++]
- "traefik.http.middlewares.plex-shield.plugin.routewarden.allowedIps=10.0.0.0/8,100.64.0.0/10,192.168.1.0/24,127.0.0.1" # [!code ++]
- "traefik.http.middlewares.plex-shield.plugin.routewarden.response.mode=json" # [!code ++]
- "traefik.http.middlewares.plex-shield.plugin.routewarden.response.statusCode=404" # [!code ++]` }),

  caddy: buildSnippet({ lang: 'caddy', code: `# Caddyfile - Plex Media Server
{
    order route_warden before reverse_proxy # [!code ++]
}

plex.example.com {
    route_warden { # [!code ++]
        methods GET POST PUT DELETE PATCH HEAD # [!code ++]
        enable_default_patterns true # [!code ++]
        block_patterns "(?i)^/(system|updater|activities|diagnostics|manage)(/.*)?$" "(?i)^/web/index\\.html#!/settings.*$" "(?i)^/servers(/.*)?$" # [!code ++]
        allowed_ips "10.0.0.0/8" "100.64.0.0/10" "192.168.1.0/24" "127.0.0.1" # [!code ++]
        response { # [!code ++]
            mode json # [!code ++]
            status_code 404 # [!code ++]
            body "{\\"error\\":\\"Not Found\\",\\"message\\":\\"The requested resource was not found\\"}" # [!code ++]
        } # [!code ++]
    } # [!code ++]

    reverse_proxy plex:32400
}` }),

  nginx: buildSnippet({ lang: 'nginx', code: `# nginx.conf: Plex Media Server Defense
http {
    lua_package_path "/usr/local/openresty/site/lualib/?.lua;/etc/nginx/lua/lib/?.lua;;";

    init_by_lua_block {
        local routewarden = require("resty.routewarden") # [!code ++]
        plex_warden = routewarden.new({ # [!code ++]
            enabled = true, # [!code ++]
            methods = { "GET", "POST", "PUT", "DELETE", "PATCH", "HEAD" }, # [!code ++]
            enable_default_patterns = true, # [!code ++]
            block_patterns = { # [!code ++]
                "(?i)^/(system|updater|activities|diagnostics|manage)(/.*)?$", # [!code ++]
                "(?i)^/web/index\\.html#!/settings.*$", # [!code ++]
                "(?i)^/servers(/.*)?$", # [!code ++]
            }, # [!code ++]
            allowed_ips = { "10.0.0.0/8", "100.64.0.0/10", "192.168.1.0/24", "127.0.0.1" }, # [!code ++]
            response = { # [!code ++]
                mode = "json", # [!code ++]
                status_code = 404, # [!code ++]
                body = '{"error":"Not Found","message":"The requested resource was not found"}' # [!code ++]
            } # [!code ++]
        }) # [!code ++]
    }

    server {
        listen 443 ssl;
        server_name plex.example.com;

        location / {
            access_by_lua_block { # [!code ++]
                plex_warden:check() # [!code ++]
            } # [!code ++]
            proxy_pass http://plex:32400;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
    }
}` }),

  cli: buildSnippet({ lang: 'json', code: `{
  "$schema": "https://raw.githubusercontent.com/routewarden/cli/main/config.schema.json",
  "enabled": true,
  "methods": ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"],
  "enableDefaultPatterns": true,
  "blockPatterns": [
    "(?i)^/(system|updater|activities|diagnostics|manage)(/.*)?$",
    "(?i)^/web/index\\\\.html#!/settings.*$",
    "(?i)^/servers(/.*)?$"
  ],
  "allowedIps": ["10.0.0.0/8", "100.64.0.0/10", "192.168.1.0/24", "127.0.0.1"],
  "response": {
    "mode": "json",
    "statusCode": 404,
    "body": "{\\"error\\":\\"Not Found\\",\\"message\\":\\"The requested resource was not found\\"}"
  }
}` })
}

const plexSnippets = computed(() => ({
  traefik: [
    { filename: 'traefik.yaml', lang: 'yaml', code: plex.traefik_yaml.cleanCode, html: plex.traefik_yaml.html, hasDiff: plex.traefik_yaml.hasDiff },
    { filename: 'traefik.toml', lang: 'toml', code: plex.traefik_toml.cleanCode, html: plex.traefik_toml.html, hasDiff: plex.traefik_toml.hasDiff },
    { filename: 'docker-compose.yaml', lang: 'docker', code: plex.traefik_labels.cleanCode, html: plex.traefik_labels.html, hasDiff: plex.traefik_labels.hasDiff },
  ],
  caddy: [
    { filename: 'Caddyfile', lang: 'caddy', code: plex.caddy.cleanCode, html: plex.caddy.html, hasDiff: plex.caddy.hasDiff },
  ],
  nginx: [
    { filename: 'nginx.conf', lang: 'nginx', code: plex.nginx.cleanCode, html: plex.nginx.html, hasDiff: plex.nginx.hasDiff },
  ],
  cli: [
    { filename: 'routewarden.json', lang: 'json', code: plex.cli.cleanCode, html: plex.cli.html, hasDiff: plex.cli.hasDiff },
  ],
}))

const curlTests = buildSnippet({
  lang: 'bash',
  code: `# 1. Public Media Playback / Cover Art (Allowed Traffic)
curl -i https://media.example.com/Items/abc12345/Images/Primary
# Response: HTTP/2 200 OK (Content-Type: image/jpeg)

# 2. Public Administrative Probe (Blocked & Cloaked)
curl -i https://media.example.com/System/Configuration
# Response: HTTP/2 404 Not Found
# {"error":"Not Found","message":"The requested resource was not found"}

# 3. Public User Registration Probe (Blocked)
curl -i -X POST https://media.example.com/Users/New \\
  -H "Content-Type: application/json" \\
  -d '{"Name":"hacker","Password":"password123"}'
# Response: HTTP/2 404 Not Found

# 4. VPN / Internal LAN Administration (Allowed Bypass)
curl -i https://media.example.com/System/Configuration
# When connecting from 100.64.0.0/10 or 192.168.1.0/24:
# Response: HTTP/2 200 OK`
})

const rwardenTests = buildSnippet({
  lang: 'bash',
  code: `# Offline verification with the RouteWarden CLI (rwarden)

# 1. Verify public stream or image access passes cleanly
rwarden test -c routewarden.json -X GET /Items/123/Images/Primary

# 2. Verify public system configuration probe is cloaked (404)
rwarden test -c routewarden.json -X GET /System/Configuration

# 3. Verify public POST user creation is blocked (404)
rwarden test -c routewarden.json -X POST /Users/New -b '{"Name":"badactor"}'

# 4. Verify admin connecting from Tailscale VPN IP bypasses filter
rwarden test -c routewarden.json -X GET /System/Configuration --ip 100.64.1.25`
})

const caddyOrder = buildSnippet({
  lang: 'caddy',
  code: `# Caddyfile Global Options
{
    order route_warden before reverse_proxy
}`
})

const caddyOrderSnippets = computed(() => ({
  caddy: [
    { filename: 'Caddyfile', lang: 'caddy', code: caddyOrder.cleanCode, html: caddyOrder.html, hasDiff: false },
  ],
}))

const verificationSnippets = computed(() => ({
  traefik: [
    { filename: 'curl-tests.sh', lang: 'bash', code: curlTests.cleanCode, html: curlTests.html, hasDiff: false },
    { filename: 'rwarden-offline-test.sh', lang: 'bash', code: rwardenTests.cleanCode, html: rwardenTests.html, hasDiff: false },
  ],
}))

const snippets = jellyfinSnippets
</script>

# Case Study: Media Streaming Defense (Jellyfin & Plex)

This case study demonstrates how to safely expose self-hosted media servers (**Jellyfin**, **Plex**, or **Emby**) to friends, family, and mobile clients over the public internet while shielding critical administrative dashboards, API keys, and user management interfaces from internet scanners.

---

## The Threat Model

Self-hosted media servers offer native streaming apps across iOS, Android, Apple TV, Roku, and modern smart TVs. To enable seamless playback outside your home, the media server port must be accessible over the internet (e.g. `media.example.com`).

However, exposing media servers directly creates substantial risk:
1. **Administrative Console Exposure**: Jellyfin exposes `/admin`, `/System/Configuration`, `/Plugins`, and API key generation portals (`/web/index.html#!/apikeys.html`).
2. **Unauthorized User Creation**: Probing bots attempt to register new accounts via `/Users/New`.
3. **API Key Extraction & Enumeration**: Vulnerability scanners target unauthenticated metadata and server status endpoints.
4. **Credential Brute-Forcing**: Attackers launch dictionary attacks against `/Users/AuthenticateByName`.

### The Objective

1. **Public Streaming Traffic**: Friends, family, and TV apps can stream audio and video, browse libraries, and load album art (`/Videos/*`, `/Items/*`, `/Images/*`, `/Audio/*`, `/Sessions/Playing`).
2. **Administrative Lockdown**: Administrative, user creation, and plugin management APIs are strictly blocked and cloaked with **`404 Not Found`** for all public clients.
3. **Internal / VPN Bypass**: You maintain full unrestricted administration when connected through your internal LAN, Tailscale (`100.64.0.0/10`), or WireGuard VPN.

---

## 1. Jellyfin Configuration (Port 8096)

Select your gateway below to inspect the Jellyfin production configuration. Diff highlights show RouteWarden rules:

<CodeViewer :snippets="jellyfinSnippets" />

---

## 2. Plex Configuration (Port 32400)

Select your gateway below to inspect the Plex Media Server production configuration. Diff highlights show RouteWarden rules:

<CodeViewer :snippets="plexSnippets" />

---

## Crucial Implementation Notes

### 1. HTTP Methods: Why `methods` is Mandatory

By default, RouteWarden inspects only `GET` requests (`methods: ["GET"]`).

However, administrative operations in Jellyfin and Plex—such as creating users (`POST /Users/New`), installing plugins (`POST /Plugins/*`), and updating system configurations—are submitted via **`POST`** and **`PUT`**. Without declaring `methods`, external bots could issue `POST` requests directly to backend administration handlers. Always include `methods GET POST PUT DELETE PATCH HEAD`.

### 2. Response Mode Recommendation

Always use **`mode: json`** (or **`mode: html`**) with **`statusCode: 404`** for public media ingress.

> [!WARNING]
> If your reverse proxy is placed behind an edge proxy or CDN (such as Cloudflare, Traefik edge, AWS ALB, or an NGINX reverse proxy), avoid using `mode: silentDrop`. 
>
> Abruptly terminating the TCP connection under `silentDrop` causes edge proxies to return an **`HTTP 502 Bad Gateway`** error page to clients. Using `mode: json` with `statusCode: 404` cleanly cloaks administrative routes as non-existent.

### 3. Caddy Directive Ordering

When using Caddy, you must register RouteWarden before Caddy's built-in `reverse_proxy` directive in the global options block:

<CodeViewer :snippets="caddyOrderSnippets" />

### 4. Architectural Note: Selective Shielding vs. Zero-Trust Allowlisting

In architectures like **[Immich](/examples/case-study-immich)** (where external visitors only need `/share/*`) or **[Home Assistant](/examples/case-study-home-assistant)** (where only `/api/webhook/*` is exposed), public access is strictly bounded to a few discrete paths. In those scenarios, **Zero-Trust Allowlisting (`blockPatterns: ['(?i)^/.*$']`)** is recommended to completely eliminate root `/` redirect bypasses.

However, self-hosted media servers (**Jellyfin** and **Plex**) are designed for full interactive multi-device streaming:
- Media players across Smart TVs (Apple TV, Roku, Android TV), gaming consoles, and mobile apps communicate across dozens of dynamic APIs (`/Items`, `/Videos`, `/Audio`, `/Images`, `/Sessions`, `/DisplayPreferences`, `/Branding`, `/web/*`).
- Enforcing a default-deny catch-all (`blockPatterns: ['(?i)^/.*$']`) would break device playback and subtitle streaming unless hundreds of application routes were continuously maintained.

For media streaming servers, **Selective Administrative Shielding** (`blockPatterns` targeting `/admin`, `/System`, `/Plugins`, `/Users/New`) paired with VPN bypass (`allowedIps`) provides the ideal balance: public users enjoy seamless media playback while privileged controls remain strictly invisible to the internet.

---

## Verification Matrix & Curl Tests

Inspect live curl verification commands and offline RouteWarden CLI tests:

<CodeViewer :snippets="verificationSnippets" />

| Route & Intent | Path & Method | Public Internet | Home LAN / VPN (`allowedIps`) |
|:---|:---|:---:|:---:|
| **Media Playback** | `GET /Videos/{id}/stream` | ✅ **Allowed** | ✅ **Allowed** |
| **Cover Art & Thumbnails** | `GET /Items/{id}/Images/*` | ✅ **Allowed** | ✅ **Allowed** |
| **Playback Session Sync** | `POST /Sessions/Playing` | ✅ **Allowed** | ✅ **Allowed** |
| **System Configuration** | `GET /System/Configuration` | ❌ **Blocked (404)** | ✅ **Allowed** |
| **User Creation** | `POST /Users/New` | ❌ **Blocked (404)** | ✅ **Allowed** |
| **Plugin Management** | `POST /Plugins/*` | ❌ **Blocked (404)** | ✅ **Allowed** |
