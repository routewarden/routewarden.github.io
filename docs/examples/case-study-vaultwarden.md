---
title: Case Study – Self-Hosted Cloud & Vault Protection
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

const s = {
  traefik_yaml: buildSnippet({ lang: 'yaml', code: `# dynamic_conf.yml
http:
  middlewares:
    vaultwarden-shield: # [!code ++]
      plugin: # [!code ++]
        routewarden: # [!code ++]
          enabled: true # [!code ++]
          enableDefaultPatterns: true # [!code ++]
          # Intercept the administrative console
          pathPatterns: # [!code ++]
            - '(?i)^/admin(/.*)?$' # [!code ++]
          # Allow ONLY internal WireGuard & Tailscale VPN addresses
          allowedIps: # [!code ++]
            - "100.64.0.0/10"   # Tailscale CGNAT range # [!code ++]
            - "10.8.0.0/24"     # WireGuard VPN subnet # [!code ++]
            - "127.0.0.1"       # Localhost # [!code ++]
          response: # [!code ++]
            mode: json # [!code ++]
            statusCode: 404 # [!code ++]
            body: '{"error":"Not Found","message":"The requested resource was not found"}' # [!code ++]

  routers:
    vault-router:
      rule: "Host(\`vault.example.com\`)"
      entryPoints:
        - websecure
      middlewares:
        - vaultwarden-shield # [!code ++]
      service: vault-service` }),

  traefik_toml: buildSnippet({ lang: 'toml', code: `# dynamic_conf.toml
[http.routers.vault-router]
  rule = "Host(\`vault.example.com\`)"
  entryPoints = ["websecure"]
  middlewares = ["vaultwarden-shield"]
  service = "vault-service"

[http.middlewares.vaultwarden-shield.plugin.routewarden] # [!code ++]
  enabled = true # [!code ++]
  enableDefaultPatterns = true # [!code ++]
  pathPatterns = ["(?i)^/admin(/.*)?$"] # [!code ++]
  allowedIps = ["100.64.0.0/10", "10.8.0.0/24", "127.0.0.1"] # [!code ++]

[http.middlewares.vaultwarden-shield.plugin.routewarden.response] # [!code ++]
  mode = "json" # [!code ++]
  statusCode = 404 # [!code ++]
  body = '{"error":"Not Found","message":"The requested resource was not found"}' # [!code ++]` }),

  traefik_labels: buildSnippet({ lang: 'docker', code: `# Docker Compose Labels
- "traefik.http.routers.vault.rule=Host(\`vault.example.com\`)"
- "traefik.http.routers.vault.middlewares=vaultwarden-shield" # [!code ++]
- "traefik.http.middlewares.vaultwarden-shield.plugin.routewarden.enabled=true" # [!code ++]
- "traefik.http.middlewares.vaultwarden-shield.plugin.routewarden.pathPatterns=(?i)^/admin(/.*)?$" # [!code ++]
- "traefik.http.middlewares.vaultwarden-shield.plugin.routewarden.allowedIps=100.64.0.0/10,10.8.0.0/24,127.0.0.1" # [!code ++]
- "traefik.http.middlewares.vaultwarden-shield.plugin.routewarden.response.mode=json" # [!code ++]
- "traefik.http.middlewares.vaultwarden-shield.plugin.routewarden.response.statusCode=404" # [!code ++]` }),

  caddy: buildSnippet({ lang: 'caddy', code: `# Caddyfile
{
    order route_warden before reverse_proxy # [!code ++]
}

vault.example.com {
    route_warden { # [!code ++]
        enable_default_patterns true # [!code ++]
        path_patterns "(?i)^/admin(/.*)?$" # [!code ++]
        allowed_ips "100.64.0.0/10" "10.8.0.0/24" "127.0.0.1" # [!code ++]
        response { # [!code ++]
            mode json # [!code ++]
            status_code 404 # [!code ++]
            body "{\\"error\\":\\"Not Found\\",\\"message\\":\\"The requested resource was not found\\"}" # [!code ++]
        } # [!code ++]
    } # [!code ++]

    reverse_proxy vault-service:80
}` }),

  nginx: buildSnippet({ lang: 'nginx', code: `# nginx.conf: Vaultwarden Admin Lockdown
http {
    lua_package_path "/usr/local/openresty/site/lualib/?.lua;/etc/nginx/lua/lib/?.lua;;";

    init_by_lua_block {
        local routewarden = require("resty.routewarden") # [!code ++]

        vault_warden = routewarden.new({ # [!code ++]
            enable_default_patterns = true, # [!code ++]
            path_patterns = { # [!code ++]
                "(?i)^/admin(/.*)?$" # [!code ++]
            }, # [!code ++]
            allowed_ips = { # [!code ++]
                "100.64.0.0/10", # [!code ++]
                "10.8.0.0/24", # [!code ++]
                "127.0.0.1" # [!code ++]
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
        server_name vault.example.com;

        access_by_lua_block {
            vault_warden:check() # [!code ++]
        }

        location / {
            proxy_pass http://vault-service:80;
        }
    }
}` }),

  cli: buildSnippet({ lang: 'json', code: `// routewarden.json
{
  "$schema": "https://raw.githubusercontent.com/routewarden/cli/main/config.schema.json",
  "enabled": true,
  "enableDefaultPatterns": true,
  "blockPatterns": [
    "(?i)^/admin(/.*)?$"
  ],
  "allowedIps": [
    "100.64.0.0/10",
    "10.8.0.0/24",
    "127.0.0.1"
  ],
  "response": {
    "mode": "json",
    "statusCode": 404,
    "body": "{\\"error\\":\\"Not Found\\",\\"message\\":\\"The requested resource was not found\\"}"
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
</script>

# Case Study: Self-Hosted Cloud & Vault Protection (Vaultwarden & Nextcloud)

This case study demonstrates how to secure critical self-hosted services like **Vaultwarden** (Bitwarden-compatible password manager) and **Nextcloud** without interfering with day-to-day mobile synchronization or public file sharing.

---

## The Threat Model: Vaultwarden

Vaultwarden is one of the most popular self-hosted password managers. To allow mobile apps and browser extensions to sync passwords, the `/api/*` and `/identity/*` endpoints must be reachable over the internet.

However, the `/admin` portal (which allows creating/deleting accounts, viewing server logs, and changing master secrets) represents an existential security risk if probed by external attackers.

### The Objective
1. **Public Traffic**: Can reach `/api/*`, `/identity/*`, and the web vault for ordinary password synchronization.
2. **Admin Portal (`/admin`)**: Fully locked down and invisible (returning `404 Not Found`) unless the connection originates from a trusted internal VPN subnet (e.g., Tailscale `100.64.0.0/10` or WireGuard).

---

## Configuration (Traefik, Caddy & NGINX)

<CodeViewer :snippets="snippets" />

---

## Advanced Architecture: Public Vaultwarden with "Send Only" Allowed

A common security requirement is exposing **only the Bitwarden Send feature** to public recipients while keeping the rest of the vault (user login, vault sync, ciphers, and admin console) strictly private to your VPN.

### The Challenge with Password-Protected Sends
When a recipient unlocks a password-protected Send, the client sends a `POST` request to `/identity/connect/token` with `grant_type=send_access`. A full vault login also targets `/identity/connect/token` with `grant_type=password`.

### Solution with `check_body` and `body_patterns`
Using RouteWarden's request body inspection across Caddy, Traefik, and NGINX:
1. Allow public access to `/api/sends/*` and `/identity/connect/token`.
2. Enable `check_body` (`checkBody`) with `body_patterns` (`checkBodyPatterns`) targeting `(?i)grant_type=password` to block vault logins while allowing `grant_type=send_access`.
3. Restrict administrative and vault sync APIs to your trusted VPN IPs (`allowed_ips` / `allowedIps`).

#### 1. Caddy (`Caddyfile`)

```caddy
{
    order routewarden first
}

vault.example.com {
    routewarden {
        enable_default_patterns true

        # Inspect both GET and POST requests
        methods GET POST

        # 1. Block admin, vault sync, accounts, ciphers, and non-send APIs
        path_patterns "(?i)^/(admin|api/(accounts|ciphers|folders|sync|collections|organizations))"

        # 2. Inspect POST body payloads on /identity/connect/token
        check_body
        body_patterns "(?i)grant_type=password"

        # 3. Trusted VPN / WireGuard / Tailscale subnets bypass all restrictions
        allowed_ips "100.64.0.0/10" "10.8.0.0/24" "127.0.0.1"

        response {
            mode json
            status 404
            body "{\"error\":\"Not Found\",\"message\":\"The requested resource was not found\"}"
        }
    }

    reverse_proxy vaultwarden:80
}
```

#### 2. Traefik (`dynamic.yml`)

```yaml
http:
  middlewares:
    vaultwarden-send-only:
      plugin:
        routewarden:
          enabled: true
          enableDefaultPatterns: true
          methods:
            - GET
            - POST
          pathPatterns:
            - '(?i)^/(admin|api/(accounts|ciphers|folders|sync|collections|organizations))'
          checkBody: true
          checkBodyPatterns:
            - '(?i)grant_type=password'
          allowedIps:
            - "100.64.0.0/10"
            - "10.8.0.0/24"
            - "127.0.0.1"
          response:
            mode: json
            statusCode: 404
            body: '{"error":"Not Found","message":"The requested resource was not found"}'

  routers:
    vault-router:
      rule: "Host(`vault.example.com`)"
      entryPoints:
        - websecure
      middlewares:
        - vaultwarden-send-only
      service: vaultwarden-service
```

#### 3. Docker Compose Labels (Traefik)

```yaml
services:
  vaultwarden:
    image: vaultwarden/server:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.vault.rule=Host(`vault.example.com`)"
      - "traefik.http.routers.vault.entrypoints=websecure"
      - "traefik.http.routers.vault.middlewares=vaultwarden-shield@docker"
      - "traefik.http.middlewares.vaultwarden-shield.plugin.routewarden.enabled=true"
      - "traefik.http.middlewares.vaultwarden-shield.plugin.routewarden.methods=GET,POST"
      - "traefik.http.middlewares.vaultwarden-shield.plugin.routewarden.pathPatterns=(?i)^/(admin|api/(accounts|ciphers|folders|sync|collections|organizations))"
      - "traefik.http.middlewares.vaultwarden-shield.plugin.routewarden.checkBody=true"
      - "traefik.http.middlewares.vaultwarden-shield.plugin.routewarden.checkBodyPatterns=(?i)grant_type=password"
      - "traefik.http.middlewares.vaultwarden-shield.plugin.routewarden.allowedIps=100.64.0.0/10,10.8.0.0/24,127.0.0.1"
      - "traefik.http.middlewares.vaultwarden-shield.plugin.routewarden.response.mode=json"
      - "traefik.http.middlewares.vaultwarden-shield.plugin.routewarden.response.statusCode=404"
      - "traefik.http.middlewares.vaultwarden-shield.plugin.routewarden.response.body={\"error\":\"Not Found\",\"message\":\"The requested resource was not found\"}"
```

#### 4. NGINX / OpenResty (`nginx.conf`)

```nginx
http {
    lua_package_path "/usr/local/openresty/site/lualib/?.lua;;";

    init_by_lua_block {
        local routewarden = require("resty.routewarden")
        vaultwarden_warden = routewarden.new({
            enabled = true,
            methods = { "GET", "POST" },
            path_patterns = {
                "(?i)^/(admin|api/(accounts|ciphers|folders|sync|collections|organizations))"
            },
            check_body = true,
            body_patterns = {
                "(?i)grant_type=password"
            },
            allowed_ips = {
                "100.64.0.0/10",
                "10.8.0.0/24",
                "127.0.0.1"
            },
            response = {
                mode = "json",
                status_code = 404,
                body = '{"error":"Not Found","message":"The requested resource was not found"}'
            }
        })
    }

    server {
        listen 443 ssl;
        server_name vault.example.com;

        access_by_lua_block {
            vaultwarden_warden:check()
        }

        location / {
            proxy_pass http://vaultwarden:80;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
    }
}
```

#### 5. Testing with RouteWarden CLI (`rwarden`)

Validate rules offline before deploying:

```bash
# 1. Test public password-protected Send unlock (Allowed)
rwarden test -c routewarden.json -X POST /identity/connect/token -b "grant_type=send_access"

# 2. Test public vault login attempt (Blocked)
rwarden test -c routewarden.json -X POST /identity/connect/token -b "grant_type=password&username=admin"

# 3. Test VPN client bypassing restriction (Allowed)
rwarden test -c routewarden.json -X POST /identity/connect/token -b "grant_type=password&username=admin" --ip 100.64.1.20
```

#### Verification Matrix

| Action | Path & Method | Payload | Public Client | VPN Client (`allowed_ips`) |
|:---|:---|:---|:---:|:---:|
| **Public Send Access** | `GET /api/sends/{id}` | N/A | ✅ **Allowed** | ✅ **Allowed** |
| **Password Send Unlock** | `POST /identity/connect/token` | `grant_type=send_access` | ✅ **Allowed** | ✅ **Allowed** |
| **User Vault Login Attempt** | `POST /identity/connect/token` | `grant_type=password` | ❌ **Blocked (404)** | ✅ **Allowed** |
| **Vault Sync / Cipher Theft** | `GET /api/sync` | N/A | ❌ **Blocked (404)** | ✅ **Allowed** |
| **Admin Panel Access** | `GET /admin` | N/A | ❌ **Blocked (404)** | ✅ **Allowed** |


