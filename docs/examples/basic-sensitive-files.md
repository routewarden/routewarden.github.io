---
title: Example 1 – Basic Sensitive File Blocking
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

const s = {
  json: buildSnippet({ lang: 'json', code: `{
  "$schema": "https://raw.githubusercontent.com/routewarden/cli/main/config.schema.json",
  "enabled": true,
  "enableDefaultPatterns": true,
  "response": {
    "mode": "json",
    "statusCode": 403,
    "body": "{\\"error\\":\\"Forbidden\\",\\"message\\":\\"Sensitive path blocked by RouteWarden\\"}"
  }
}` }),

  traefik_yaml: buildSnippet({ lang: 'yaml', code: `# dynamic_conf.yml
http:
  middlewares:
    warden-shield:
      plugin:
        routewarden:
          enabled: true
          enableDefaultPatterns: true
          response:
            mode: json
            statusCode: 403
            body: '{"error":"Forbidden","message":"Sensitive path blocked by RouteWarden"}'

  routers:
    webapp-router:
      rule: "Host(\`localhost\`)"
      entryPoints:
        - web
      middlewares:
        - warden-shield
      service: webapp-service

  services:
    webapp-service:
      loadBalancer:
        servers:
          - url: "http://webapp:80"` }),

  traefik_toml: buildSnippet({ lang: 'toml', code: `# dynamic_conf.toml
[http.routers.webapp-router]
  rule = "Host(\`localhost\`)"
  entryPoints = ["web"]
  middlewares = ["warden-shield"]
  service = "webapp-service"

[http.services.webapp-service.loadBalancer]
  [[http.services.webapp-service.loadBalancer.servers]]
    url = "http://webapp:80"

[http.middlewares.warden-shield.plugin.routewarden]
  enabled = true
  enableDefaultPatterns = true

[http.middlewares.warden-shield.plugin.routewarden.response]
  mode = "json"
  statusCode = 403
  body = '{"error":"Forbidden","message":"Sensitive path blocked by RouteWarden"}'` }),

  traefik_labels: buildSnippet({ lang: 'docker', code: `# Docker Compose Labels
- "traefik.enable=true"
- "traefik.http.routers.webapp.rule=Host(\`localhost\`)"
- "traefik.http.routers.webapp.entrypoints=web"
- "traefik.http.routers.webapp.middlewares=warden-shield"
- "traefik.http.middlewares.warden-shield.plugin.routewarden.enabled=true"
- "traefik.http.middlewares.warden-shield.plugin.routewarden.enableDefaultPatterns=true"
- "traefik.http.middlewares.warden-shield.plugin.routewarden.response.mode=json"
- "traefik.http.middlewares.warden-shield.plugin.routewarden.response.statusCode=403"
- 'traefik.http.middlewares.warden-shield.plugin.routewarden.response.body={"error":"Forbidden","message":"Sensitive path blocked by RouteWarden"}'` }),

  caddy: buildSnippet({ lang: 'caddy', code: `# Caddyfile
{
    order route_warden before reverse_proxy
}

localhost {
    route_warden {
        enable_default_patterns true
        response {
            mode json
            status_code 403
            body "{\\"error\\":\\"Forbidden\\",\\"message\\":\\"Sensitive path blocked by RouteWarden\\"}"
        }
    }

    reverse_proxy webapp:80
}` }),

  nginx: buildSnippet({ lang: 'nginx', code: `# nginx.conf: Basic Sensitive File Shield
http {
    lua_package_path "/usr/local/openresty/site/lualib/?.lua;/etc/nginx/lua/lib/?.lua;;";

    init_by_lua_block {
        local routewarden = require("resty.routewarden")

        warden = routewarden.new({
            enable_default_patterns = true,
            response = {
                mode = "json",
                status_code = 403,
                body = '{"error":"Forbidden","message":"Sensitive path blocked by RouteWarden"}'
            }
        })
    }

    server {
        listen 80;
        server_name localhost;

        access_by_lua_block {
            warden:check()
        }

        location / {
            proxy_pass http://webapp:80;
        }
    }
}` }),
  docker_traefik: buildSnippet({ lang: 'yaml', code: `services:
  traefik:
    image: traefik:latest
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--experimental.plugins.routewarden.modulename=github.com/routewarden/traefik-warden" # [!code ++]
      - "--experimental.plugins.routewarden.version={{traefik_version}}" # [!code ++]
    ports:
      - "80:80"
      - "8080:8080"
    volumes:
      - "/var/run/docker.sock:/var/run/docker.sock:ro"

  webapp:
    image: nginx:alpine
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.webapp.rule=Host(\`localhost\`)"
      - "traefik.http.routers.webapp.entrypoints=web"
      - "traefik.http.routers.webapp.middlewares=warden-shield" # [!code ++]
      # RouteWarden Setup
      - "traefik.http.middlewares.warden-shield.plugin.routewarden.enabled=true" # [!code ++]
      - "traefik.http.middlewares.warden-shield.plugin.routewarden.enableDefaultPatterns=true" # [!code ++]
      - "traefik.http.middlewares.warden-shield.plugin.routewarden.response.mode=json" # [!code ++]
      - "traefik.http.middlewares.warden-shield.plugin.routewarden.response.statusCode=403" # [!code ++]` }),

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
      - webapp

  webapp:
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
      - webapp

  webapp:
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

const verificationCmd = buildSnippet({
  lang: 'bash',
  code: `# Legitimate homepage access (Allowed)
curl -I http://localhost/
# Output: HTTP/1.1 200 OK

# Probing for environment secrets (Blocked)
curl -i http://localhost/.env
# Output: HTTP/1.1 403 Forbidden
# {"error":"Forbidden","message":"Sensitive path blocked by RouteWarden"}

# Probing for Git repository details (Blocked)
curl -i http://localhost/.git/config
# Output: HTTP/1.1 403 Forbidden`,
})

const verificationSnippets = computed(() => ({
  traefik: [{ filename: 'Shell(Bash)', lang: 'bash', code: verificationCmd.cleanCode, html: verificationCmd.html, hasDiff: false }],
}))
</script>

# Example 1: Basic Sensitive File Blocking

This scenario protects a web application against reconnaissance and exposure of critical infrastructure files using RouteWarden's built-in rule dictionary.

---

## Configuration Preview

<CodeViewer :snippets="snippets" />

---

## Docker Compose Example

<CodeViewer :snippets="dockerSnippets" />

---

## Verification Commands

<CodeViewer :snippets="verificationSnippets" />
