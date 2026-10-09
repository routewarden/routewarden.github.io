---
title: Case Study – Smart Home Mobile Ingress (Home Assistant)
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

const s = {
  traefik_yaml: buildSnippet({ lang: 'yaml', code: `# dynamic_conf.yml
http:
  middlewares:
    homeassistant-shield: # [!code ++]
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
          # 1. Zero-Trust Allowlist: permit strictly mobile companion app webhook callbacks # [!code ++]
          allowPatterns: # [!code ++]
            - '(?i)^/api/webhook/[a-zA-Z0-9_-]+$' # [!code ++]
          # 2. Catch-all: default-deny all other routes (blocks root Lovelace UI, login, states) # [!code ++]
          blockPatterns: # [!code ++]
            - '(?i)^/.*$' # [!code ++]
          # 3. Trusted Home LAN and Tailscale / WireGuard VPN subnets bypass all blocks
          allowedIps: # [!code ++]
            - "10.0.0.0/8"        # Internal Home LAN # [!code ++]
            - "100.64.0.0/10"      # Tailscale CGNAT subnet # [!code ++]
            - "192.168.1.0/24"     # Home Wi-Fi subnet # [!code ++]
            - "127.0.0.1"         # Localhost # [!code ++]
          response: # [!code ++]
            mode: json # [!code ++]
            statusCode: 404 # [!code ++]
            body: '{"error":"Not Found","message":"Endpoint unavailable on public router"}' # [!code ++]

  routers:
    hass-router:
      rule: "Host(\`home.example.com\`)"
      entryPoints:
        - websecure
      middlewares:
        - homeassistant-shield # [!code ++]
      service: hass-service` }),

  traefik_toml: buildSnippet({ lang: 'toml', code: `# dynamic_conf.toml
[http.routers.hass-router]
  rule = "Host(\`home.example.com\`)"
  entryPoints = ["websecure"]
  middlewares = ["homeassistant-shield"]
  service = "hass-service"

[http.middlewares.homeassistant-shield.plugin.routewarden] # [!code ++]
  enabled = true # [!code ++]
  methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"] # [!code ++]
  enableDefaultPatterns = true # [!code ++]
  # Zero-Trust Allowlist: permit strictly mobile companion app webhook callbacks # [!code ++]
  allowPatterns = [ # [!code ++]
    "(?i)^/api/webhook/[a-zA-Z0-9_-]+$" # [!code ++]
  ] # [!code ++]
  # Catch-all: default-deny all other routes # [!code ++]
  blockPatterns = [ # [!code ++]
    "(?i)^/.*$" # [!code ++]
  ] # [!code ++]
  allowedIps = ["10.0.0.0/8", "100.64.0.0/10", "192.168.1.0/24", "127.0.0.1"] # [!code ++]

[http.middlewares.homeassistant-shield.plugin.routewarden.response] # [!code ++]
  mode = "json" # [!code ++]
  statusCode = 404 # [!code ++]
  body = '{"error":"Not Found","message":"Endpoint unavailable on public router"}' # [!code ++]` }),

  traefik_labels: buildSnippet({ lang: 'docker', code: `# Docker Compose Labels on homeassistant container
- "traefik.enable=true"
- "traefik.http.routers.hass.rule=Host(\`home.example.com\`)"
- "traefik.http.routers.hass.entrypoints=websecure"
- "traefik.http.routers.hass.middlewares=homeassistant-shield" # [!code ++]
- "traefik.http.middlewares.homeassistant-shield.plugin.routewarden.enabled=true" # [!code ++]
- "traefik.http.middlewares.homeassistant-shield.plugin.routewarden.methods=GET,POST,PUT,DELETE,PATCH,HEAD" # [!code ++]
- "traefik.http.middlewares.homeassistant-shield.plugin.routewarden.allowPatterns=(?i)^/api/webhook/[a-zA-Z0-9_-]+$" # [!code ++]
- "traefik.http.middlewares.homeassistant-shield.plugin.routewarden.blockPatterns=(?i)^/.*$" # [!code ++]
- "traefik.http.middlewares.homeassistant-shield.plugin.routewarden.allowedIps=10.0.0.0/8,100.64.0.0/10,192.168.1.0/24,127.0.0.1" # [!code ++]
- "traefik.http.middlewares.homeassistant-shield.plugin.routewarden.response.mode=json" # [!code ++]
- "traefik.http.middlewares.homeassistant-shield.plugin.routewarden.response.statusCode=404" # [!code ++]` }),

  caddy: buildSnippet({ lang: 'caddy', code: `# Caddyfile
{
    order route_warden before reverse_proxy # [!code ++]
}

home.example.com {
    route_warden { # [!code ++]
        methods GET POST PUT DELETE PATCH HEAD # [!code ++]
        enable_default_patterns true # [!code ++]
        # Zero-Trust Allowlist: permit strictly mobile companion app webhook callbacks # [!code ++]
        allow_patterns "(?i)^/api/webhook/[a-zA-Z0-9_-]+$" # [!code ++]
        # Catch-all: default-deny all other routes # [!code ++]
        block_patterns "(?i)^/.*$" # [!code ++]
        allowed_ips "10.0.0.0/8" "100.64.0.0/10" "192.168.1.0/24" "127.0.0.1" # [!code ++]
        response { # [!code ++]
            mode json # [!code ++]
            status_code 404 # [!code ++]
            body "{\\"error\\":\\"Not Found\\",\\"message\\":\\"Endpoint unavailable on public router\\"}" # [!code ++]
        } # [!code ++]
    } # [!code ++]

    reverse_proxy homeassistant:8123
} ` }),

  nginx: buildSnippet({ lang: 'nginx', code: `# nginx.conf: Home Assistant Mobile Ingress Protection
http {
    lua_package_path "/usr/local/openresty/site/lualib/?.lua;/etc/nginx/lua/lib/?.lua;;";

    init_by_lua_block {
        local routewarden = require("resty.routewarden") # [!code ++]

        hass_warden = routewarden.new({ # [!code ++]
            methods = { "GET", "POST", "PUT", "DELETE", "PATCH", "HEAD" }, # [!code ++]
            enable_default_patterns = true, # [!code ++]
            -- Zero-Trust Allowlist: permit strictly mobile companion app webhook callbacks # [!code ++]
            allow_patterns = { # [!code ++]
                "(?i)^/api/webhook/[a-zA-Z0-9_-]+$" # [!code ++]
            }, # [!code ++]
            -- Catch-all: default-deny all other routes # [!code ++]
            block_patterns = { # [!code ++]
                "(?i)^/.*$" # [!code ++]
            }, # [!code ++]
            allowed_ips = { # [!code ++]
                "10.0.0.0/8", "100.64.0.0/10", "192.168.1.0/24", "127.0.0.1" # [!code ++]
            }, # [!code ++]
            response = { # [!code ++]
                mode = "json", # [!code ++]
                status_code = 404, # [!code ++]
                body = '{"error":"Not Found","message":"Endpoint unavailable on public router"}' # [!code ++]
            } # [!code ++]
        }) # [!code ++]
    }

    server {
        listen 80;
        server_name home.example.com;

        access_by_lua_block {
            hass_warden:check() # [!code ++]
        }

        location / {
            proxy_pass http://homeassistant:8123;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }
    }
}` }),

  cli: buildSnippet({ lang: 'json', code: `// routewarden.json
{
  "$schema": "https://raw.githubusercontent.com/routewarden/cli/main/config.schema.json",
  "enabled": true,
  "methods": ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"],
  "enableDefaultPatterns": true,
  "allowPatterns": [
    "(?i)^/api/webhook/[a-zA-Z0-9_-]+$"
  ],
  "blockPatterns": [
    "(?i)^/.*$"
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
    "body": "{\\"error\\":\\"Not Found\\",\\"message\\":\\"Endpoint unavailable on public router\\"}"
  }
}` }),
}

const snippets = computed(() => ({
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

const caddyOrder = buildSnippet({
  lang: 'caddy',
  code: `# Caddyfile Global Options
{
    order route_warden before reverse_proxy
}`
})

const caddyOrderSnippets = computed(() => ({
  caddy: [
    { filename: 'Caddyfile', lang: 'caddy', code: caddyOrder.cleanCode, html: caddyOrder.html, hasDiff: false }
  ]
}))

const webhookTokenPattern = buildSnippet({
  lang: 'regex',
  code: `(?i)^/api/webhook/[a-zA-Z0-9_-]+$`
})

const webhookTokenSnippets = computed(() => ({
  traefik: [
    { filename: 'allow_patterns.regex', lang: 'regex', code: webhookTokenPattern.cleanCode, html: webhookTokenPattern.html, hasDiff: false }
  ]
}))

const haHttpConfig = buildSnippet({
  lang: 'yaml',
  code: `# /config/configuration.yaml in Home Assistant
# Required when placing Home Assistant behind any reverse proxy
http:
  use_x_forwarded_for: true # [!code ++]
  trusted_proxies: # [!code ++]
    - 172.16.0.0/12      # Docker default bridge network # [!code ++]
    - 10.0.0.0/8         # Internal home container/pod subnet # [!code ++]
    - 127.0.0.1          # Localhost # [!code ++]`
})

const haConfigSnippets = computed(() => ({
  traefik: [
    { filename: 'configuration.yaml', lang: 'yaml', code: haHttpConfig.cleanCode, html: haHttpConfig.html, hasDiff: haHttpConfig.hasDiff }
  ]
}))

const haCurlTests = buildSnippet({
  lang: 'bash',
  code: `# 1. Test Mobile Companion Webhook (Allowed)
# Mobile Companion App submits device sensor or location beacon
curl -i -X POST https://home.example.com/api/webhook/d8f76e5a4b3c2d1e0f \\
  -H "Content-Type: application/json" \\
  -d '{"type":"update_location","data":{"gps":[37.7749,-122.4194],"battery":85}}'
# Response: HTTP/2 200 OK (Content-Type: application/json)

# 2. Test Root Web UI & Lovelace Dashboard Probe (Blocked & Cloaked)
# External visitor or scanner visits home root URL
curl -i https://home.example.com/
# Response: HTTP/2 404 Not Found (Zero-trust default-deny blocks root before Lovelace UI or login redirect)

# 3. Test Public Login Attempt (Blocked)
# External attacker probes authentication endpoint
curl -i -X POST https://home.example.com/auth/token \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "grant_type=password&username=admin&password=password123"
# Response: HTTP/2 404 Not Found ({"error":"Not Found","message":"Endpoint unavailable on public router"})

# 4. Test Public Service Manipulation Attempt (Blocked)
# External bot probes service execution to unlock a smart door lock
curl -i -X POST https://home.example.com/api/services/lock/unlock \\
  -H "Content-Type: application/json" \\
  -d '{"entity_id":"lock.front_door"}'
# Response: HTTP/2 404 Not Found

# 5. Test Home LAN / VPN Access (Allowed)
# Administrator connects from Tailscale (100.64.0.15) or Home Wi-Fi
curl -i -X POST https://home.example.com/auth/token \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "grant_type=password&username=admin&password=secret"
# Response: HTTP/2 200 OK (Access token granted)`
})

const haRwardenTests = buildSnippet({
  lang: 'bash',
  code: `# Offline verification with the RouteWarden CLI (rwarden)

# 1. Test mobile GPS webhook passes through cleanly
rwarden test -c routewarden.json -X POST /api/webhook/d8f76e5a4b3c2d1e0f -b '{"gps":[37.77,-122.41]}'

# 2. Test root path is blocked by default-deny catch-all
rwarden test -c routewarden.json -X GET /

# 3. Test public login endpoint is cloaked with 404
rwarden test -c routewarden.json -X POST /auth/token -b 'grant_type=password'

# 4. Test unauthorized entity control service call is blocked
rwarden test -c routewarden.json -X POST /api/services/lock/unlock -b '{"entity_id":"lock.door"}'

# 5. Test home LAN / Tailscale admin bypasses all blocks
rwarden test -c routewarden.json -X POST /auth/token --ip 100.64.0.15`
})

const verificationSnippets = computed(() => ({
  traefik: [
    { filename: 'curl-tests.sh', lang: 'bash', code: haCurlTests.cleanCode, html: haCurlTests.html, hasDiff: false },
    { filename: 'rwarden-offline-test.sh', lang: 'bash', code: haRwardenTests.cleanCode, html: haRwardenTests.html, hasDiff: false },
  ],
}))
</script>

# Case Study: Smart Home Mobile Ingress (Home Assistant)

This case study demonstrates how to securely configure **Home Assistant** for external mobile companion access (location updates, push notifications, and automation triggers) while completely cloaking smart door locks, alarm controls, and login panels from public internet exposure using **Zero-Trust Allowlisting**.

---

## The Threat Model

Home Assistant controls the physical perimeter of modern smart homes: smart deadbolts, garage doors, surveillance cameras, alarm panels, and automated relays.

To support mobile presence detection and automation, the official **Home Assistant Companion App** requires external ingress:
- Sending GPS location and geofencing beacons (`/api/webhook/<token>`).
- Submitting battery level, pedometer, and device sensor state.
- Responding to actionable push notifications.

However, exposing Home Assistant directly over the internet (`home.example.com`) introduces existential physical risks:
1. **Root Path Lovelace & UI Exposure**: Visiting `/` serves the Lovelace web UI or triggers a redirect to `/auth/login_flow`. If not shielded by a default-deny policy, public visitors load the entire frontend application.
2. **Credential Stuffing & Login Probing**: Scanners continuously attempt dictionary attacks on `/auth/token`, `/auth/authorize`, and `/auth/login_flow`.
3. **Unauthorized Entity Manipulation**: Attackers could probe `/api/services/lock/unlock` or `/api/services/cover/open_cover` to compromise physical security.
4. **Supervisor & Configuration Dumps**: Automated vulnerability tools scan for `/api/hassio/*`, `/api/config`, and YAML secret backups.

### The Objective

1. **Mobile Ingress (Public Internet)**: Allow the mobile companion app to deliver device webhooks (`/api/webhook/*`) seamlessly without requiring an always-on VPN connection on your phone.
2. **Zero-Trust Entity & Admin Shield**: Enforce a strict **Default-Deny (`blockPatterns: ['(?i)^/.*$']`)** policy so that every unlisted endpoint—including the root path `/`, Lovelace UI, authentication (`/auth/*`), and internal APIs—is cloaked with **`404 Not Found`**.
3. **Home LAN & VPN Whitelist**: Full web dashboard, lovelace cards, and configuration settings are accessible when connected to home Wi-Fi or via **Tailscale / WireGuard** VPN (`allowedIps`).

---

## Configuration (Traefik, Caddy & NGINX)

Select your gateway below to inspect the production configuration:

<CodeViewer :snippets="snippets" />

---

## Crucial Implementation Notes

### 1. HTTP Methods: Why `methods` is Mandatory

Mobile companion app webhooks transmit location updates and sensor payloads exclusively via **`POST`** requests.

Because RouteWarden inspects only `GET` requests by default, omitting `methods` would mean inbound webhook traffic would not be evaluated against your `allowPatterns` and `blockPatterns`. Explicitly defining `methods GET POST PUT DELETE PATCH HEAD` ensures full coverage.

### 2. Secret Webhook Tokens

Home Assistant automatically generates a cryptographically random webhook ID for each mobile integration (e.g. `/api/webhook/019283a4b5c6d7e8...`).

Our `allowPatterns` rule permits mobile webhook calls to reach Home Assistant while blocking access to `/api/config`, `/api/services/*`, and all administrative controls:

<CodeViewer :snippets="webhookTokenSnippets" />

### 3. Response Mode: Cloaking as 404 Not Found

We recommend **`mode: json`** with **`statusCode: 404`**.

> [!WARNING]
> If your reverse proxy is placed behind an edge proxy or CDN (such as Cloudflare, Traefik edge, AWS ALB, or an NGINX reverse proxy), avoid using `mode: silentDrop`. 
>
> Abruptly terminating the TCP connection under `silentDrop` causes edge proxies to display an **`HTTP 502 Bad Gateway`** error page to clients. Using `mode: json` with `statusCode: 404` returns a natural not-found response that gives attackers zero indication that Home Assistant is running.

### 4. Caddy Directive Ordering

When configuring RouteWarden in Caddy, ensure the module is registered before Caddy's built-in `reverse_proxy` directive in the global options block:

<CodeViewer :snippets="caddyOrderSnippets" />

### 5. Home Assistant Reverse Proxy Trust (`configuration.yaml`)

Whenever Home Assistant runs behind Traefik, Caddy, or NGINX, Home Assistant's internal security layer requires explicit authorization to accept `X-Forwarded-For` headers from your proxy container. Add the following to your `/config/configuration.yaml`:

<CodeViewer :snippets="haConfigSnippets" />

### 6. Why Zero-Trust Allowlisting Prevents Root Lovelace & Redirect Bypasses

Home Assistant has no standalone public landing page; visiting `https://home.example.com/` serves the Lovelace web application or redirects visitors to `/auth/login_flow`.

Traditional denylists (blocklists) targeting `/auth` or `/api/config` fail because the initial `GET /` request does not match the blocklist, allowing internet scanners to load the web interface and confirm that Home Assistant is running.

By inverting to **Zero-Trust Allowlisting (Default-Deny)**:
- **`blockPatterns: ['(?i)^/.*$']`**: Intercepts all inbound traffic at the reverse proxy. Requests to `/`, `/lovelace`, and administrative APIs never reach the Home Assistant container.
- **`allowPatterns: ['(?i)^/api/webhook/[a-zA-Z0-9_-]+$']`**: Because RouteWarden evaluates `allowPatterns` *before* `blockPatterns`, valid mobile companion webhooks pass through seamlessly.
- **`allowedIps`**: Your internal LAN and Tailscale/WireGuard subnets bypass the catch-all block, preserving complete administrative control for trusted devices.

---

## Verification Matrix & Curl Tests

Inspect live curl verification commands and offline RouteWarden CLI tests:

<CodeViewer :snippets="verificationSnippets" />

| Route & Intent | Path & Method | Public Internet | Home LAN / VPN (`allowedIps`) |
|:---|:---|:---:|:---:|
| **Mobile Geolocation Webhook** | `POST /api/webhook/{token}` | ✅ **Allowed** | ✅ **Allowed** |
| **Mobile Push Notification Ack** | `POST /api/webhook/{token}` | ✅ **Allowed** | ✅ **Allowed** |
| **Root Web UI & Lovelace Dashboard** | `GET /` | ❌ **Blocked (404)** | ✅ **Allowed** |
| **Web UI Authentication** | `POST /auth/token` | ❌ **Blocked (404)** | ✅ **Allowed** |
| **Service Execution (Smart Locks)** | `POST /api/services/*` | ❌ **Blocked (404)** | ✅ **Allowed** |
| **Supervisor API** | `GET /api/hassio/*` | ❌ **Blocked (404)** | ✅ **Allowed** |
| **Configuration Dumps** | `GET /api/config` | ❌ **Blocked (404)** | ✅ **Allowed** |
