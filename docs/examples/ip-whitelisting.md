---
title: Example 4 – IP & CIDR Subnet Whitelisting
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

const s = {
  json: buildSnippet({ lang: 'json', code: `{
  "$schema": "https://raw.githubusercontent.com/routewarden/cli/main/config.schema.json",
  "enabled": true,
  "blockPatterns": [
    "(?i)^/admin(/.*)?$",
    "(?i)^/metrics(/.*)?$"
  ],
  "allowedIps": [
    "10.0.0.0/8",
    "192.168.1.100"
  ],
  "response": {
    "mode": "json",
    "statusCode": 403,
    "body": "{\\"error\\":\\"Forbidden\\",\\"message\\":\\"Restricted to authorized IP/VPN\\"}"
  }
}` }),

  traefik_yaml: buildSnippet({ lang: 'yaml', code: `# dynamic_conf.yml
http:
  middlewares:
    admin-shield:
      plugin:
        routewarden:
          enabled: true
          blockPatterns:
            - '(?i)^/admin(/.*)?$'
            - '(?i)^/metrics(/.*)?$'
          allowedIps:
            - "10.0.0.0/8"
            - "192.168.1.100"
          response:
            mode: json
            statusCode: 403
            body: '{"error":"Forbidden","message":"Restricted to authorized IP/VPN"}'

  routers:
    admin-router:
      rule: "Host(\`admin.localhost\`)"
      entryPoints:
        - web
      middlewares:
        - admin-shield
      service: admin-service` }),

  traefik_toml: buildSnippet({ lang: 'toml', code: `# dynamic_conf.toml
[http.routers.admin-router]
  rule = "Host(\`admin.localhost\`)"
  entryPoints = ["web"]
  middlewares = ["admin-shield"]
  service = "admin-service"

[http.middlewares.admin-shield.plugin.routewarden]
  enabled = true
  blockPatterns = ["(?i)^/admin(/.*)?$", "(?i)^/metrics(/.*)?$"]
  allowedIps = ["10.0.0.0/8", "192.168.1.100"]

[http.middlewares.admin-shield.plugin.routewarden.response]
  mode = "json"
  statusCode = 403
  body = '{"error":"Forbidden","message":"Restricted to authorized IP/VPN"}'` }),

  traefik_labels: buildSnippet({ lang: 'docker', code: `# Docker Compose Labels
- "traefik.enable=true"
- "traefik.http.routers.admin.rule=Host(\`admin.localhost\`)"
- "traefik.http.routers.admin.entrypoints=web"
- "traefik.http.routers.admin.middlewares=admin-shield"
- "traefik.http.middlewares.admin-shield.plugin.routewarden.enabled=true"
- "traefik.http.middlewares.admin-shield.plugin.routewarden.blockPatterns=(?i)^/admin(/.*)?$,(?i)^/metrics(/.*)?$"
- "traefik.http.middlewares.admin-shield.plugin.routewarden.allowedIps=10.0.0.0/8,192.168.1.100"
- "traefik.http.middlewares.admin-shield.plugin.routewarden.response.mode=json"
- "traefik.http.middlewares.admin-shield.plugin.routewarden.response.statusCode=403"
- 'traefik.http.middlewares.admin-shield.plugin.routewarden.response.body={"error":"Forbidden","message":"Restricted to authorized IP/VPN"}'` }),

  caddy: buildSnippet({ lang: 'caddy', code: `# Caddyfile
{
    order route_warden before reverse_proxy
}

admin.localhost {
    route_warden {
        block_patterns "(?i)^/admin(/.*)?$" "(?i)^/metrics(/.*)?$"
        allowed_ips "10.0.0.0/8" "192.168.1.100"
        response {
            mode json
            status_code 403
            body "{\\"error\\":\\"Forbidden\\",\\"message\\":\\"Restricted to authorized IP/VPN\\"}"
        }
    }

    reverse_proxy admin-service:80
}` }),

  nginx: buildSnippet({ lang: 'nginx', code: `# nginx.conf: IP & CIDR Subnet Allowlisting
http {
    lua_package_path "/usr/local/openresty/site/lualib/?.lua;/etc/nginx/lua/lib/?.lua;;";

    init_by_lua_block {
        local routewarden = require("resty.routewarden")

        admin_warden = routewarden.new({
            block_patterns = {
                "(?i)^/admin(/.*)?$",
                "(?i)^/metrics(/.*)?$"
            },
            allowed_ips = {
                "10.0.0.0/8",
                "192.168.1.100"
            },
            response = {
                mode = "json",
                status_code = 403,
                body = '{"error":"Forbidden","message":"Restricted to authorized IP/VPN"}'
            }
        })
    }

    server {
        listen 80;
        server_name admin.localhost;

        access_by_lua_block {
            admin_warden:check()
        }

        location / {
            proxy_pass http://admin-service:80;
        }
    }
}` }),
  docker_traefik: buildSnippet({ lang: 'yaml', code: `services:
  traefik:
    image: traefik:v3.1
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
      - "--experimental.plugins.routewarden.modulename=github.com/routewarden/traefik-warden" # [!code ++]
      - "--experimental.plugins.routewarden.version={{traefik_version}}" # [!code ++]
    ports:
      - "80:80"
    volumes:
      - "/var/run/docker.sock:/var/run/docker.sock:ro"

  admin-service:
    image: nginx:alpine
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.admin.rule=Host(\`admin.localhost\`)"
      - "traefik.http.routers.admin.entrypoints=web"
      - "traefik.http.routers.admin.middlewares=admin-shield" # [!code ++]
      # RouteWarden Configuration with IP Whitelist
      - "traefik.http.middlewares.admin-shield.plugin.routewarden.enabled=true" # [!code ++]
      - "traefik.http.middlewares.admin-shield.plugin.routewarden.blockPatterns=(?i)^/admin(/.*)?$,(?i)^/metrics(/.*)?$" # [!code ++]
      - "traefik.http.middlewares.admin-shield.plugin.routewarden.allowedIps=10.0.0.0/8,192.168.1.100" # [!code ++]
      - "traefik.http.middlewares.admin-shield.plugin.routewarden.response.mode=json" # [!code ++]
      - "traefik.http.middlewares.admin-shield.plugin.routewarden.response.statusCode=403" # [!code ++]` }),

  docker_caddy: buildSnippet({ lang: 'yaml', code: `services:
  caddy:
    image: caddy:2-alpine
    build: # [!code ++]
      context: . # [!code ++]
      dockerfile_inline: | # [!code ++]
        FROM caddy:2-builder AS builder # [!code ++]
        RUN xcaddy build --with github.com/routewarden/caddy-warden@{{caddy_version}} # [!code ++]
        FROM caddy:2-alpine # [!code ++]
        COPY --from=builder /usr/bin/caddy /usr/bin/caddy # [!code ++]
    ports:
      - "80:80"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
    depends_on:
      - admin-service

  admin-service:
    image: nginx:alpine` }),

  docker_nginx: buildSnippet({ lang: 'yaml', code: `services:
  nginx:
    image: openresty/openresty:alpine
    ports:
      - "80:80"
    volumes:
      - ./lib/resty/routewarden:/usr/local/openresty/site/lualib/resty/routewarden:ro # [!code ++]
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - admin-service

  admin-service:
    image: nginx:alpine` }),
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
    { filename: 'routewarden.json', lang: 'json', code: s.json.cleanCode, html: s.json.html, hasDiff: s.json.hasDiff },
  ],
}))

const dockerSnippets = computed(() => ({
  traefik: [{ filename: 'docker-compose.yaml', lang: 'yaml', code: s.docker_traefik.cleanCode, html: s.docker_traefik.html, hasDiff: s.docker_traefik.hasDiff }],
  caddy:   [{ filename: 'docker-compose.yaml', lang: 'yaml', code: s.docker_caddy.cleanCode,   html: s.docker_caddy.html,   hasDiff: s.docker_caddy.hasDiff }],
  nginx:   [{ filename: 'docker-compose.yaml', lang: 'yaml', code: s.docker_nginx.cleanCode,   html: s.docker_nginx.html,   hasDiff: s.docker_nginx.hasDiff }],
}))

const testingCmd = buildSnippet({
  lang: 'bash',
  code: `# Request without whitelisted IP (Blocked)
curl -i -H "Host: admin.localhost" http://localhost/admin
# HTTP/1.1 403 Forbidden

# Request originating from allowed corporate subnet via proxy (Allowed)
curl -i -H "Host: admin.localhost" -H "X-Forwarded-For: 10.5.20.1" http://localhost/admin
# Passes cleanly to upstream container!`,
})

const testingSnippets = computed(() => ({
  traefik: [{ filename: 'Shell(Bash)', lang: 'bash', code: testingCmd.cleanCode, html: testingCmd.html, hasDiff: false }],
}))
</script>

# Example 4: IP & CIDR Subnet Whitelisting

RouteWarden allows you to declare trusted IPs and subnets (`allowedIps`) to bypass path blocking. This is ideal for internal management portals, company VPN gateways, and authorized vulnerability scanners.

---

## How IP Resolution Works

RouteWarden evaluates client IPs in the following priority order:
1. **`X-Forwarded-For`** header (first IP in list)
2. **`X-Real-IP`** header
3. Socket **`RemoteAddr`**

Both exact IPv4/IPv6 addresses (`127.0.0.1`, `2001:db8::1`) and CIDR blocks (`10.0.0.0/8`, `192.168.1.0/24`) are supported.

---

## Configuration Preview

<CodeViewer :snippets="snippets" />

---

## Docker Compose Example

<CodeViewer :snippets="dockerSnippets" />

---

## Testing Verification

<CodeViewer :snippets="testingSnippets" />
