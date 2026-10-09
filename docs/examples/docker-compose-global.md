---
title: Example 2 – Global EntryPoint Shield
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

const s = {
  json: buildSnippet({ lang: 'json', code: `// routewarden.json
// Generate Traefik dynamic.yml:
//   CLI:    rwarden generate --target traefik-yaml --config routewarden.json > dynamic_conf.yml
//   Docker: docker run --rm -v $(pwd)/routewarden.json:/routewarden.json ghcr.io/routewarden/cli:latest generate --target traefik-yaml --config /routewarden.json > dynamic_conf.yml
{
  "$schema": "https://routewarden.github.io/schema.json",
  "enabled": true,
  "enableDefaultPatterns": true,
  "allowedIps": [
    "127.0.0.1",
    "10.0.0.0/8"
  ],
  "response": {
    "mode": "json",
    "statusCode": 403,
    "body": "{\\"error\\":\\"Forbidden\\",\\"scope\\":\\"global-shield\\"}"
  }
}` }),

  traefik_yaml: buildSnippet({ lang: 'yaml', code: `# traefik.yml (Static EntryPoint Attachment)
entryPoints:
  web:
    address: ":80"
    http:
      middlewares:
        - global-warden@file

# dynamic_conf.yml (Middleware Definition)
http:
  middlewares:
    global-warden:
      plugin:
        routewarden:
          enabled: true
          enableDefaultPatterns: true
          allowedIps:
            - "127.0.0.1"
            - "10.0.0.0/8"
          response:
            mode: json
            statusCode: 403
            body: '{"error":"Forbidden","scope":"global-shield"}'` }),

  traefik_toml: buildSnippet({ lang: 'toml', code: `# traefik.toml (Static EntryPoint Attachment)
[entryPoints.web]
  address = ":80"

[entryPoints.web.http]
  middlewares = ["global-warden@file"]

# dynamic_conf.toml (Middleware Definition)
[http.middlewares.global-warden.plugin.routewarden]
  enabled = true
  enableDefaultPatterns = true
  allowedIps = ["127.0.0.1", "10.0.0.0/8"]

[http.middlewares.global-warden.plugin.routewarden.response]
  mode = "json"
  statusCode = 403
  body = '{"error":"Forbidden","scope":"global-shield"}'` }),

  traefik_labels: buildSnippet({ lang: 'docker', code: `# Docker Compose Labels (on traefik service)
- "traefik.enable=true"
- "traefik.http.middlewares.global-warden.plugin.routewarden.enabled=true"
- "traefik.http.middlewares.global-warden.plugin.routewarden.enableDefaultPatterns=true"
- "traefik.http.middlewares.global-warden.plugin.routewarden.allowedIps=127.0.0.1,10.0.0.0/8"
- "traefik.http.middlewares.global-warden.plugin.routewarden.response.mode=json"
- "traefik.http.middlewares.global-warden.plugin.routewarden.response.statusCode=403"
- 'traefik.http.middlewares.global-warden.plugin.routewarden.response.body={"error":"Forbidden","scope":"global-shield"}'` }),

  traefik_cli: buildSnippet({ lang: 'bash', code: `# CLI / Traefik Arguments
traefik \\
  --entrypoints.web.address=:80 \\
  --entrypoints.web.http.middlewares=global-warden@docker \\
  --experimental.plugins.routewarden.modulename=github.com/routewarden/traefik-warden \\
  --experimental.plugins.routewarden.version={{traefik_version}}` }),

  caddy: buildSnippet({ lang: 'caddy', code: `# Caddyfile: Global RouteWarden Snippet applied across all sites
(global_warden_shield) {
    route_warden {
        enable_default_patterns true
        allowed_ips "127.0.0.1" "10.0.0.0/8"
        response {
            mode json
            status_code 403
            body "{\\"error\\":\\"Forbidden\\",\\"scope\\":\\"global-shield\\"}"
        }
    }
}

{
    order route_warden before reverse_proxy
}

frontend.localhost {
    import global_warden_shield
    reverse_proxy frontend:80
}

api.localhost {
    import global_warden_shield
    reverse_proxy backend:80
}` }),

  nginx: buildSnippet({ lang: 'nginx', code: `# nginx.conf: Global RouteWarden Shield across all server blocks
http {
    lua_package_path "/usr/local/openresty/site/lualib/?.lua;/etc/nginx/lua/lib/?.lua;;";

    init_by_lua_block {
        local routewarden = require("resty.routewarden")

        global_warden = routewarden.new({
            enable_default_patterns = true,
            allowed_ips = {
                "127.0.0.1",
                "10.0.0.0/8"
            },
            response = {
                mode = "json",
                status_code = 403,
                body = '{"error":"Forbidden","scope":"global-shield"}'
            }
        })
    }

    server {
        listen 80;
        server_name frontend.localhost;

        access_by_lua_block { global_warden:check() }

        location / { proxy_pass http://frontend:80; }
    }

    server {
        listen 80;
        server_name api.localhost;

        access_by_lua_block { global_warden:check() }

        location / { proxy_pass http://backend:80; }
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
      - "--entrypoints.web.http.middlewares=global-warden@docker" # [!code ++]
    ports:
      - "80:80"
      - "8080:8080"
    volumes:
      - "/var/run/docker.sock:/var/run/docker.sock:ro"
    labels:
      - "traefik.enable=true"
      - "traefik.http.middlewares.global-warden.plugin.routewarden.enabled=true" # [!code ++]
      - "traefik.http.middlewares.global-warden.plugin.routewarden.enableDefaultPatterns=true" # [!code ++]
      - "traefik.http.middlewares.global-warden.plugin.routewarden.allowedIps=127.0.0.1,10.0.0.0/8" # [!code ++]
      - "traefik.http.middlewares.global-warden.plugin.routewarden.response.mode=json" # [!code ++]
      - "traefik.http.middlewares.global-warden.plugin.routewarden.response.statusCode=403" # [!code ++]

  service-frontend:
    image: nginx:alpine
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.frontend.rule=Host(\`frontend.localhost\`)"
      - "traefik.http.routers.frontend.entrypoints=web"

  service-backend:
    image: nginx:alpine
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.backend.rule=Host(\`api.localhost\`)"
      - "traefik.http.routers.backend.entrypoints=web"` }),

  docker_caddy: buildSnippet({ lang: 'yaml', code: `services:
  caddy:
    image: caddy:2-alpine
    build:
      context: .
      dockerfile_inline: |
        FROM caddy:2-builder AS builder
        RUN xcaddy build --with github.com/routewarden/caddy-warden@{{caddy_version}} # [!code ++]
        FROM caddy:2-alpine
        COPY --from=builder /usr/bin/caddy /usr/bin/caddy
    ports:
      - "80:80"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
    depends_on:
      - service-frontend
      - service-backend

  service-frontend:
    image: nginx:alpine

  service-backend:
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
      - service-frontend
      - service-backend

  service-frontend:
    image: nginx:alpine

  service-backend:
    image: nginx:alpine` }),
}

const snippets = computed(() => ({
  traefik: [
    { filename: 'traefik.yaml', lang: 'yaml', code: s.traefik_yaml.cleanCode, html: s.traefik_yaml.html, hasDiff: s.traefik_yaml.hasDiff },
    { filename: 'traefik.toml', lang: 'toml', code: s.traefik_toml.cleanCode, html: s.traefik_toml.html, hasDiff: s.traefik_toml.hasDiff },
    { filename: 'docker-compose.yaml', lang: 'docker', code: s.traefik_labels.cleanCode, html: s.traefik_labels.html, hasDiff: s.traefik_labels.hasDiff },
    { filename: 'traefik.cli', lang: 'bash', code: s.traefik_cli.cleanCode, html: s.traefik_cli.html, hasDiff: s.traefik_cli.hasDiff },
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
</script>

# Example 2: Global EntryPoint Shield

Attaching RouteWarden directly to Traefik's entrypoint provides unified, cluster-wide protection across all services without requiring repetitive labels on individual containers.

---

## Configuration Preview

<CodeViewer :snippets="snippets" />

---

## Docker Compose Example

<CodeViewer :snippets="dockerSnippets" />

Both `frontend.localhost` and `api.localhost` are guarded immediately across all incoming entrypoints.
