---
title: Example 3 – Service-Level Docker Compose
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

const s = {
  json: buildSnippet({ lang: 'json', code: `// routewarden.json
// Generate Traefik dynamic.yml or labels:
//   CLI:    rwarden generate --target [traefik-yaml|traefik-toml|traefik-labels] --config routewarden.json
//   Docker: docker run --rm -v $(pwd)/routewarden.json:/routewarden.json ghcr.io/routewarden/cli:latest generate --target [traefik-yaml|traefik-toml|traefik-labels] --config /routewarden.json
{
  "$schema": "https://routewarden.github.io/schema.json",
  "enabled": true,
  "enableDefaultPatterns": true,
  "checkQuery": true,
  "blockPatterns": [
    "(?i)^/admin(/.*)?$",
    "(?i)^/api/internal(/.*)?$"
  ],
  "allowPatterns": [
    "(?i)^/robots\\\\.txt$",
    "(?i)^/\\\\.well-known(/.*)?$"
  ],
  "allowedIps": [
    "192.168.1.0/24",
    "10.10.0.0/16"
  ],
  "response": {
    "mode": "json",
    "statusCode": 403,
    "body": "{\\"error\\":\\"access_denied\\",\\"service\\":\\"web\\"}",
    "headers": {
      "X-Protected-By": "RouteWarden"
    }
  }
}` }),

  traefik_yaml: buildSnippet({ lang: 'yaml', code: `# dynamic_conf.yml
http:
  middlewares:
    service-warden:
      plugin:
        routewarden:
          enabled: true
          enableDefaultPatterns: true
          checkQuery: true
          blockPatterns:
            - '(?i)^/admin(/.*)?$'
            - '(?i)^/api/internal(/.*)?$'
          allowPatterns:
            - '(?i)^/robots\\.txt$'
            - '(?i)^/\\.well-known(/.*)?$'
          allowedIps:
            - "192.168.1.0/24"
            - "10.10.0.0/16"
          response:
            mode: json
            statusCode: 403
            body: '{"error":"access_denied","service":"web"}'
            headers:
              X-Protected-By: "RouteWarden"

  routers:
    web-router:
      rule: "Host(\`example.com\`)"
      entryPoints:
        - web
      middlewares:
        - service-warden
      service: web-service` }),

  traefik_toml: buildSnippet({ lang: 'toml', code: `# dynamic_conf.toml
[http.routers.web-router]
  rule = "Host(\`example.com\`)"
  entryPoints = ["web"]
  middlewares = ["service-warden"]
  service = "web-service"

[http.middlewares.service-warden.plugin.routewarden]
  enabled = true
  enableDefaultPatterns = true
  checkQuery = true
  blockPatterns = ["(?i)^/admin(/.*)?$", "(?i)^/api/internal(/.*)?$"]
  allowPatterns = ["(?i)^/robots\\\\.txt$", "(?i)^/\\\\.well-known(/.*)?$"]
  allowedIps = ["192.168.1.0/24", "10.10.0.0/16"]

[http.middlewares.service-warden.plugin.routewarden.response]
  mode = "json"
  statusCode = 403
  body = '{"error":"access_denied","service":"web"}'

[http.middlewares.service-warden.plugin.routewarden.response.headers]
  X-Protected-By = "RouteWarden"` }),

  traefik_labels: buildSnippet({ lang: 'docker', code: `# Docker Compose Labels
- "traefik.enable=true"
- "traefik.http.routers.web.rule=Host(\`example.com\`)"
- "traefik.http.routers.web.entrypoints=web"
- "traefik.http.routers.web.middlewares=service-warden"
- "traefik.http.middlewares.service-warden.plugin.routewarden.enabled=true"
- "traefik.http.middlewares.service-warden.plugin.routewarden.enableDefaultPatterns=true"
- "traefik.http.middlewares.service-warden.plugin.routewarden.checkQuery=true"
- "traefik.http.middlewares.service-warden.plugin.routewarden.blockPatterns=(?i)^/admin(/.*)?$,(?i)^/api/internal(/.*)?$"
- "traefik.http.middlewares.service-warden.plugin.routewarden.allowPatterns=(?i)^/robots\\\\.txt$,(?i)^/\\\\.well-known(/.*)?$"
- "traefik.http.middlewares.service-warden.plugin.routewarden.allowedIps=192.168.1.0/24,10.10.0.0/16"
- "traefik.http.middlewares.service-warden.plugin.routewarden.response.mode=json"
- "traefik.http.middlewares.service-warden.plugin.routewarden.response.statusCode=403"
- 'traefik.http.middlewares.service-warden.plugin.routewarden.response.body={"error":"access_denied","service":"web"}'
- "traefik.http.middlewares.service-warden.plugin.routewarden.response.headers.X-Protected-By=RouteWarden"` }),

  caddy: buildSnippet({ lang: 'caddy', code: `# Caddyfile: Service-specific custom rules and allowlist exceptions
{
    order route_warden before reverse_proxy
}

example.com {
    route_warden {
        enable_default_patterns true
        check_query true
        block_patterns "(?i)^/admin(/.*)?$" "(?i)^/api/internal(/.*)?$"
        allow_patterns "(?i)^/robots\\.txt$" "(?i)^/\\.well-known(/.*)?$"
        allowed_ips "192.168.1.0/24" "10.10.0.0/16"
        response {
            mode json
            status_code 403
            body "{\\"error\\":\\"access_denied\\",\\"service\\":\\"web\\"}"
        }
    }

    reverse_proxy web:80
}` }),

  nginx: buildSnippet({ lang: 'nginx', code: `# nginx.conf: Service-Level Custom Rules & Query Inspection
http {
    lua_package_path "/usr/local/openresty/site/lualib/?.lua;/etc/nginx/lua/lib/?.lua;;";

    init_by_lua_block {
        local routewarden = require("resty.routewarden")

        service_warden = routewarden.new({
            enable_default_patterns = true,
            check_query = true,
            block_patterns = {
                "(?i)^/admin(/.*)?$",
                "(?i)^/api/internal(/.*)?$"
            },
            allow_patterns = {
                "(?i)^/robots\\\\.txt$",
                "(?i)^/\\\\.well-known(/.*)?$"
            },
            allowed_ips = {
                "192.168.1.0/24",
                "10.10.0.0/16"
            },
            response = {
                mode = "json",
                status_code = 403,
                body = '{"error":"access_denied","service":"web"}',
                headers = { ["X-Protected-By"] = "RouteWarden" }
            }
        })
    }

    server {
        listen 80;
        server_name example.com;

        access_by_lua_block {
            service_warden:check()
        }

        location / {
            proxy_pass http://web:80;
        }
    }
}` }),

  docker_traefik: buildSnippet({ lang: 'yaml', code: `services:
  web:
    image: my-web-app:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.web.rule=Host(\`example.com\`)"
      - "traefik.http.routers.web.entrypoints=web"
      - "traefik.http.routers.web.middlewares=service-warden" # [!code ++]
      - "traefik.http.middlewares.service-warden.plugin.routewarden.enabled=true" # [!code ++]
      - "traefik.http.middlewares.service-warden.plugin.routewarden.enableDefaultPatterns=true" # [!code ++]
      - "traefik.http.middlewares.service-warden.plugin.routewarden.checkQuery=true" # [!code ++]
      - "traefik.http.middlewares.service-warden.plugin.routewarden.blockPatterns=(?i)^/admin(/.*)?$,(?i)^/api/internal(/.*)?$" # [!code ++]
      - "traefik.http.middlewares.service-warden.plugin.routewarden.allowPatterns=(?i)^/robots\\\\.txt$,(?i)^/\\\\.well-known(/.*)?$" # [!code ++]
      - "traefik.http.middlewares.service-warden.plugin.routewarden.allowedIps=192.168.1.0/24,10.10.0.0/16" # [!code ++]
      - "traefik.http.middlewares.service-warden.plugin.routewarden.response.mode=json" # [!code ++]
      - "traefik.http.middlewares.service-warden.plugin.routewarden.response.statusCode=403" # [!code ++]
      - "traefik.http.middlewares.service-warden.plugin.routewarden.response.headers.X-Protected-By=RouteWarden" # [!code ++]` }),

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
      - web

  web:
    image: my-web-app:latest` }),

  docker_nginx: buildSnippet({ lang: 'yaml', code: `services:
  nginx:
    image: openresty/openresty:alpine
    ports:
      - "80:80"
    volumes:
      - ./lib/resty/routewarden:/usr/local/openresty/site/lualib/resty/routewarden:ro # [!code ++]
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - web

  web:
    image: my-web-app:latest` }),
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
</script>

# Example 3: Service-Level Docker Compose

When individual microservices require custom regex rules, sensitive directory exceptions, query inspection, or dedicated error payloads, configure RouteWarden at the service router level.

---

## Configuration Preview

<CodeViewer :snippets="snippets" />

---

## Docker Compose Example

<CodeViewer :snippets="dockerSnippets" />
