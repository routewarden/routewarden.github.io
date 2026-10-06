---
title: Case Study – Prometheus & Actuator Observability Cloaking
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

const s = {
  traefik_yaml: buildSnippet({ lang: 'yaml', code: `# dynamic_conf.yml
http:
  middlewares:
    metrics-cloak: # [!code ++]
      plugin: # [!code ++]
        routewarden: # [!code ++]
          enabled: true # [!code ++]
          enableDefaultPatterns: true # [!code ++]
          # Guard metrics, profiling, and actuator endpoints
          blockPatterns: # [!code ++]
            - '(?i)^/(metrics|server-metrics|telemetry)(/.*)?$' # [!code ++]
            - '(?i)^/actuator(/.*)?$' # [!code ++]
            - '(?i)^/debug/(pprof|vars)(/.*)?$' # [!code ++]
          # Allow internal Prometheus scraper & Kubernetes VPC
          allowedIps: # [!code ++]
            - "10.0.0.50/32"    # Dedicated Prometheus server IP # [!code ++]
            - "10.244.0.0/16"   # Internal Kubernetes Pod Network # [!code ++]
            - "127.0.0.1"       # Localhost diagnostic agent # [!code ++]
          response: # [!code ++]
            mode: json # [!code ++]
            statusCode: 404 # [!code ++]
            body: '{"error":"Not Found","message":"The requested URL was not found on this server"}' # [!code ++]

  routers:
    app-router:
      rule: "Host(\`app.example.com\`)"
      entryPoints:
        - websecure
      middlewares:
        - metrics-cloak # [!code ++]
      service: app-service` }),

  traefik_toml: buildSnippet({ lang: 'toml', code: `# dynamic_conf.toml
[http.routers.app-router]
  rule = "Host(\`app.example.com\`)"
  entryPoints = ["websecure"]
  middlewares = ["metrics-cloak"]
  service = "app-service"

[http.middlewares.metrics-cloak.plugin.routewarden] # [!code ++]
  enabled = true # [!code ++]
  enableDefaultPatterns = true # [!code ++]
  blockPatterns = [ # [!code ++]
    "(?i)^/(metrics|server-metrics|telemetry)(/.*)?$", # [!code ++]
    "(?i)^/actuator(/.*)?$", # [!code ++]
    "(?i)^/debug/(pprof|vars)(/.*)?$" # [!code ++]
  ] # [!code ++]
  allowedIps = ["10.0.0.50/32", "10.244.0.0/16", "127.0.0.1"] # [!code ++]

[http.middlewares.metrics-cloak.plugin.routewarden.response] # [!code ++]
  mode = "json" # [!code ++]
  statusCode = 404 # [!code ++]
  body = '{"error":"Not Found","message":"The requested URL was not found on this server"}' # [!code ++]` }),

  traefik_labels: buildSnippet({ lang: 'docker', code: `# Docker Compose Labels
- "traefik.http.routers.app.rule=Host(\`app.example.com\`)"
- "traefik.http.routers.app.middlewares=metrics-cloak" # [!code ++]
- "traefik.http.middlewares.metrics-cloak.plugin.routewarden.enabled=true" # [!code ++]
- "traefik.http.middlewares.metrics-cloak.plugin.routewarden.blockPatterns=(?i)^/(metrics|server-metrics)(/.*)?$,(?i)^/actuator(/.*)?$,(?i)^/debug/pprof(/.*)?$" # [!code ++]
- "traefik.http.middlewares.metrics-cloak.plugin.routewarden.allowedIps=10.0.0.50/32,10.244.0.0/16,127.0.0.1" # [!code ++]
- "traefik.http.middlewares.metrics-cloak.plugin.routewarden.response.mode=json" # [!code ++]
- "traefik.http.middlewares.metrics-cloak.plugin.routewarden.response.statusCode=404" # [!code ++]` }),

  caddy: buildSnippet({ lang: 'caddy', code: `# Caddyfile
{
    order route_warden before reverse_proxy # [!code ++]
}

app.example.com {
    route_warden { # [!code ++]
        enable_default_patterns true # [!code ++]
        block_patterns "(?i)^/(metrics|server-metrics|telemetry)(/.*)?$" "(?i)^/actuator(/.*)?$" "(?i)^/debug/(pprof|vars)(/.*)?$" # [!code ++]
        allowed_ips "10.0.0.50/32" "10.244.0.0/16" "127.0.0.1" # [!code ++]
        response { # [!code ++]
            mode json # [!code ++]
            status_code 404 # [!code ++]
            body "{\\"error\\":\\"Not Found\\",\\"message\\":\\"The requested URL was not found on this server\\"}" # [!code ++]
        } # [!code ++]
    } # [!code ++]

    reverse_proxy app-service:8080
}` }),

  nginx: buildSnippet({ lang: 'nginx', code: `# nginx.conf: Metrics & Actuator Cloaking
http {
    lua_package_path "/usr/local/openresty/site/lualib/?.lua;/etc/nginx/lua/lib/?.lua;;";

    init_by_lua_block {
        local routewarden = require("resty.routewarden") # [!code ++]

        metrics_warden = routewarden.new({ # [!code ++]
            enable_default_patterns = true, # [!code ++]
            block_patterns = { # [!code ++]
                "(?i)^/(metrics|server-metrics|telemetry)(/.*)?$", # [!code ++]
                "(?i)^/actuator(/.*)?$", # [!code ++]
                "(?i)^/debug/(pprof|vars)(/.*)?$" # [!code ++]
            }, # [!code ++]
            allowed_ips = { # [!code ++]
                "10.0.0.50/32", # [!code ++]
                "10.244.0.0/16", # [!code ++]
                "127.0.0.1" # [!code ++]
            }, # [!code ++]
            response = { # [!code ++]
                mode = "json", # [!code ++]
                status_code = 404, # [!code ++]
                body = '{"error":"Not Found","message":"The requested URL was not found on this server"}' # [!code ++]
            } # [!code ++]
        }) # [!code ++]
    }

    server {
        listen 80;
        server_name app.example.com;

        access_by_lua_block {
            metrics_warden:check() # [!code ++]
        }

        location / {
            proxy_pass http://app-service:8080;
        }
    }
}` }),

  cli: buildSnippet({ lang: 'json', code: `// routewarden.json
{
  "$schema": "https://raw.githubusercontent.com/routewarden/cli/main/config.schema.json",
  "enabled": true,
  "enableDefaultPatterns": true,
  "blockPatterns": [
    "(?i)^/(metrics|server-metrics|telemetry)(/.*)?$",
    "(?i)^/actuator(/.*)?$",
    "(?i)^/debug/(pprof|vars)(/.*)?$"
  ],
  "allowedIps": [
    "10.0.0.50/32",
    "10.244.0.0/16",
    "127.0.0.1"
  ],
  "response": {
    "mode": "json",
    "statusCode": 404,
    "body": "{\\"error\\":\\"Not Found\\",\\"message\\":\\"The requested URL was not found on this server\\"}"
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

# Case Study: Prometheus & Actuator Observability Cloaking

This case study demonstrates how to protect internal telemetry, metrics scrapers, and diagnostic dumps from public disclosure while preserving uninterrupted collection by internal monitoring pipelines (Prometheus, Datadog, Grafana).

---

## The Threat Model

Most modern microservices expose operational metrics and health dashboards out-of-the-box:
- **Prometheus Scrape Endpoints**: `/metrics`
- **Spring Boot Actuator**: `/actuator`, `/actuator/env`, `/actuator/heapdump`, `/actuator/loggers`
- **Go Runtime Profiling**: `/debug/pprof`, `/debug/vars`

When exposed to the public internet, these endpoints leak proprietary architecture details, server environment variables, memory layouts, and query patterns to competitive reconnaissance bots and exploit kits.

---

## The Solution: Ingress Masking via RouteWarden

RouteWarden intercepts all requests directed at diagnostic and metrics paths:
- **Public Traffic**: Receives a cloaked `404 Not Found` response.
- **Authorized Scrapers**: Requests originating from the internal monitoring cluster (e.g. Prometheus pod CIDR `10.244.0.0/16` or VPC subnet) bypass the filter and receive live metrics.

---

## Configuration (Traefik, Caddy & NGINX)

<CodeViewer :snippets="snippets" />
