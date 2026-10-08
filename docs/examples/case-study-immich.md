---
title: Case Study – Dual-Router Security for Immich
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

// ─── Traefik files ───────────────────────────────────────────────────────────

const traefikYaml = buildSnippet({
  lang: 'yaml',
  code: `# dynamic_conf.yml
http:
  middlewares:
    # RouteWarden shield applied ONLY to the public-facing router
    immich-public-shield: # [!code ++]
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
          enableDefaultPatterns: true # Blocks .env, .git, config dumps # [!code ++]
          blockPatterns: # [!code ++]
            - '(?i)^/api/auth/login.*$' # [!code ++]
            - '(?i)^/api/auth/admin-sign-up.*$' # [!code ++]
            - '(?i)^/api/users.*$' # [!code ++]
            - '(?i)^/api/admin.*$' # [!code ++]
            - '(?i)^/api/server-info/stats.*$' # [!code ++]
          response: # [!code ++]
            mode: json # [!code ++]
            statusCode: 404 # [!code ++]
            body: '{"error":"Not Found","message":"Endpoint unavailable on public router"}' # [!code ++]

  routers:
    # 1. PUBLIC ROUTER: Accessible over the web for public photo/album sharing
    immich-public:
      rule: "Host(\`photos.example.com\`)"
      entryPoints:
        - websecure
      middlewares:
        - immich-public-shield # [!code ++]
      service: immich-service

    # 2. PRIVATE ROUTER: Accessible only via internal VPN / Tailscale / LAN
    immich-private:
      rule: "Host(\`photos-internal.example.com\`)"
      entryPoints:
        - internal
      # No RouteWarden restriction: full admin and login functionality available
      service: immich-service

  services:
    immich-service:
      loadBalancer:
        servers:
          - url: "http://immich-server:2283"`,
})

const traefikToml = buildSnippet({
  lang: 'toml',
  code: `# dynamic_conf.toml
[http.routers.immich-public]
  rule = "Host(\`photos.example.com\`)"
  entryPoints = ["websecure"]
  middlewares = ["immich-public-shield"] # [!code ++]
  service = "immich-service"

[http.routers.immich-private]
  rule = "Host(\`photos-internal.example.com\`)"
  entryPoints = ["internal"]
  service = "immich-service"

[http.middlewares.immich-public-shield.plugin.routewarden] # [!code ++]
  enabled = true # [!code ++]
  methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"] # [!code ++]
  enableDefaultPatterns = true # [!code ++]
  blockPatterns = [ # [!code ++]
    "(?i)^/api/auth/login.*$", # [!code ++]
    "(?i)^/api/auth/admin-sign-up.*$", # [!code ++]
    "(?i)^/api/users.*$", # [!code ++]
    "(?i)^/api/admin.*$", # [!code ++]
    "(?i)^/api/server-info/stats.*$" # [!code ++]
  ] # [!code ++]

[http.middlewares.immich-public-shield.plugin.routewarden.response] # [!code ++]
  mode = "json" # [!code ++]
  statusCode = 404 # [!code ++]
  body = '{"error":"Not Found","message":"Endpoint unavailable on public router"}' # [!code ++]

[http.services.immich-service.loadBalancer]
  [[http.services.immich-service.loadBalancer.servers]]
    url = "http://immich-server:2283"`,
})

const traefikLabels = buildSnippet({
  lang: 'docker',
  code: `# docker-compose.yaml — label-based configuration on immich-server container

# Public Router with RouteWarden shield:
- "traefik.enable=true"
- "traefik.http.routers.immich-pub.rule=Host(\`photos.example.com\`)"
- "traefik.http.routers.immich-pub.entrypoints=websecure"
- "traefik.http.routers.immich-pub.middlewares=immich-public-shield" # [!code ++]
- "traefik.http.middlewares.immich-public-shield.plugin.routewarden.enabled=true" # [!code ++]
- "traefik.http.middlewares.immich-public-shield.plugin.routewarden.methods=GET,POST,PUT,DELETE,PATCH,HEAD" # [!code ++]
- "traefik.http.middlewares.immich-public-shield.plugin.routewarden.blockPatterns=(?i)^/api/auth/login.*$,(?i)^/api/auth/admin-sign-up.*$,(?i)^/api/users.*$,(?i)^/api/admin.*$,(?i)^/api/server-info/stats.*$" # [!code ++]
- "traefik.http.middlewares.immich-public-shield.plugin.routewarden.response.mode=json" # [!code ++]
- "traefik.http.middlewares.immich-public-shield.plugin.routewarden.response.statusCode=404" # [!code ++]
- 'traefik.http.middlewares.immich-public-shield.plugin.routewarden.response.body={"error":"Not Found","message":"Endpoint unavailable on public router"}' # [!code ++]

# Private Router (Full Access over VPN / LAN):
- "traefik.http.routers.immich-priv.rule=Host(\`photos-internal.example.com\`)"
- "traefik.http.routers.immich-priv.entrypoints=internal"
- "traefik.http.services.immich-server.loadbalancer.server.port=2283"`,
})

const traefikK8s = buildSnippet({
  lang: 'yaml',
  code: `# traefik-middleware.yaml — Kubernetes CRD
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: immich-public-shield # [!code ++]
  namespace: default
spec: # [!code ++]
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
        - '(?i)^/api/auth/login.*$' # [!code ++]
        - '(?i)^/api/auth/admin-sign-up.*$' # [!code ++]
        - '(?i)^/api/users.*$' # [!code ++]
        - '(?i)^/api/admin.*$' # [!code ++]
        - '(?i)^/api/server-info/stats.*$' # [!code ++]
      response: # [!code ++]
        mode: json # [!code ++]
        statusCode: 404 # [!code ++]
        body: '{"error":"Not Found","message":"Endpoint unavailable on public router"}' # [!code ++]
---
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: immich-public
spec:
  entryPoints:
    - websecure
  routes:
    - match: Host(\`photos.example.com\`)
      kind: Rule
      middlewares:
        - name: immich-public-shield # [!code ++]
      services:
        - name: immich-service
          port: 2283`,
})

// ─── Caddy files ─────────────────────────────────────────────────────────────

const caddyFile = buildSnippet({
  lang: 'caddy',
  code: `# Caddyfile — Dual-Site Architecture
{
    order route_warden before reverse_proxy # [!code ++]
}

# 1. PUBLIC SITE: Shielded from login and administration probes
photos.example.com {
    route_warden { # [!code ++]
        methods GET POST PUT DELETE PATCH HEAD # [!code ++]
        enable_default_patterns true # [!code ++]
        block_patterns "(?i)^/api/auth/login.*$" "(?i)^/api/auth/admin-sign-up.*$" "(?i)^/api/users.*$" "(?i)^/api/admin.*$" "(?i)^/api/server-info/stats.*$" # [!code ++]
        response { # [!code ++]
            mode json # [!code ++]
            status_code 404 # [!code ++]
            body "{\"error\":\"Not Found\",\"message\":\"Endpoint unavailable on public router\"}" # [!code ++]
        } # [!code ++]
    } # [!code ++]

    reverse_proxy immich-server:2283
}

# 2. PRIVATE SITE: Accessible only via internal VPN / Tailscale / LAN
photos-internal.example.com {
    # Full access: no RouteWarden restrictions
    reverse_proxy immich-server:2283
}`,
})

const caddyDockerCompose = buildSnippet({
  lang: 'yaml',
  code: `# docker-compose.yaml — Caddy with RouteWarden plugin
services:
  caddy:
    image: ghcr.io/routewarden/caddy:latest # [!code ++]
    container_name: caddy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile # [!code ++]
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - immich-net

  immich-server:
    image: ghcr.io/immich-app/immich-server:release
    container_name: immich-server
    restart: unless-stopped
    networks:
      - immich-net

networks:
  immich-net:

volumes:
  caddy_data:
  caddy_config:`,
})

const caddyDockerfile = buildSnippet({
  lang: 'dockerfile',
  code: `# Dockerfile — Build Caddy with RouteWarden plugin
FROM caddy:2-builder AS builder # [!code ++]

RUN xcaddy build \\ # [!code ++]
    --with github.com/routewarden/caddy-routewarden # [!code ++]

FROM caddy:2

COPY --from=builder /usr/bin/caddy /usr/bin/caddy`,
})

const caddyK8s = buildSnippet({
  lang: 'yaml',
  code: `# caddy-configmap.yaml — Caddy Kubernetes ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: caddy-config
  namespace: default
data:
  Caddyfile: | # [!code ++]
    { # [!code ++]
        order route_warden before reverse_proxy # [!code ++]
    } # [!code ++]
    
    photos.example.com { # [!code ++]
        route_warden { # [!code ++]
            methods GET POST PUT DELETE PATCH HEAD # [!code ++]
            enable_default_patterns true # [!code ++]
            block_patterns "(?i)^/api/auth/login.*$" "(?i)^/api/auth/admin-sign-up.*$" "(?i)^/api/users.*$" "(?i)^/api/admin.*$" "(?i)^/api/server-info/stats.*$" # [!code ++]
            response { # [!code ++]
                mode json # [!code ++]
                status_code 404 # [!code ++]
            } # [!code ++]
        } # [!code ++]
        reverse_proxy immich-service:2283 # [!code ++]
    } # [!code ++]`,
})

// ─── Nginx files ──────────────────────────────────────────────────────────────

const nginxConf = buildSnippet({
  lang: 'nginx',
  code: `# nginx.conf — Dual-Site Architecture with RouteWarden Lua module
http {
    lua_package_path "/usr/local/openresty/site/lualib/?.lua;/etc/nginx/lua/lib/?.lua;;";

    init_by_lua_block {
        local routewarden = require("resty.routewarden") # [!code ++]

        public_warden = routewarden.new({ # [!code ++]
            methods = { "GET", "POST", "PUT", "DELETE", "PATCH", "HEAD" }, # [!code ++]
            enable_default_patterns = true, # [!code ++]
            block_patterns = { # [!code ++]
                "(?i)^/api/auth/login.*$", # [!code ++]
                "(?i)^/api/auth/admin-sign-up.*$", # [!code ++]
                "(?i)^/api/users.*$", # [!code ++]
                "(?i)^/api/admin.*$", # [!code ++]
                "(?i)^/api/server-info/stats.*$" # [!code ++]
            }, # [!code ++]
            response = { # [!code ++]
                mode = "json", # [!code ++]
                status_code = 404, # [!code ++]
                body = '{"error":"Not Found","message":"Endpoint unavailable on public router"}' # [!code ++]
            } # [!code ++]
        }) # [!code ++]
    }

    # 1. PUBLIC SERVER: Shielded from login and administrative probing
    server {
        listen 80;
        server_name photos.example.com;

        access_by_lua_block {
            public_warden:check() # [!code ++]
        }

        location / {
            proxy_pass http://immich-server:2283;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
    }

    # 2. PRIVATE SERVER: Accessible only via internal VPN / Tailscale / LAN
    server {
        listen 80;
        server_name photos-internal.example.com;

        # Full access: no RouteWarden checks applied
        location / {
            proxy_pass http://immich-server:2283;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
    }
}`,
})

const nginxDockerCompose = buildSnippet({
  lang: 'yaml',
  code: `# docker-compose.yaml — OpenResty + RouteWarden Lua module
services:
  openresty:
    image: openresty/openresty:alpine # [!code ++]
    container_name: openresty
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/usr/local/openresty/nginx/conf/nginx.conf # [!code ++]
      - ./lua:/etc/nginx/lua # [!code ++]
    networks:
      - immich-net

  immich-server:
    image: ghcr.io/immich-app/immich-server:release
    container_name: immich-server
    restart: unless-stopped
    networks:
      - immich-net

networks:
  immich-net:`,
})

const nginxK8s = buildSnippet({
  lang: 'yaml',
  code: `# nginx-ingress.yaml — NGINX Ingress with RouteWarden Lua snippet
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: immich-public-ingress
  annotations:
    nginx.ingress.kubernetes.io/configuration-snippet: | # [!code ++]
      access_by_lua_block { # [!code ++]
          local routewarden = require("resty.routewarden") # [!code ++]
          local warden = routewarden.new({ # [!code ++]
              methods = { "GET", "POST", "PUT", "DELETE", "PATCH", "HEAD" }, # [!code ++]
              enable_default_patterns = true, # [!code ++]
              block_patterns = { # [!code ++]
                  "(?i)^/api/auth/login.*$", # [!code ++]
                  "(?i)^/api/auth/admin-sign-up.*$", # [!code ++]
                  "(?i)^/api/users.*$", # [!code ++]
                  "(?i)^/api/admin.*$" # [!code ++]
              } # [!code ++]
          }) # [!code ++]
          warden:check() # [!code ++]
      } # [!code ++]
spec:
  rules:
    - host: photos.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: immich-service
                port:
                  number: 2283`,
})

// ─── Assemble snippets per gateway ────────────────────────────────────────────

const snippets = computed(() => ({
  traefik: [
    {
      filename: 'traefik.yaml',
      lang: 'yaml',
      code: traefikYaml.cleanCode,
      html: traefikYaml.html,
      hasDiff: traefikYaml.hasDiff,
    },
    {
      filename: 'traefik.toml',
      lang: 'toml',
      code: traefikToml.cleanCode,
      html: traefikToml.html,
      hasDiff: traefikToml.hasDiff,
    },
    {
      filename: 'docker-compose.yaml',
      lang: 'docker',
      code: traefikLabels.cleanCode,
      html: traefikLabels.html,
      hasDiff: traefikLabels.hasDiff,
    },
    {
      filename: 'traefik-ingress.yaml',
      lang: 'yaml',
      code: traefikK8s.cleanCode,
      html: traefikK8s.html,
      hasDiff: traefikK8s.hasDiff,
    },
  ],
  caddy: [
    {
      filename: 'Caddyfile',
      lang: 'caddy',
      code: caddyFile.cleanCode,
      html: caddyFile.html,
      hasDiff: caddyFile.hasDiff,
    },
    {
      filename: 'docker-compose.yaml',
      lang: 'yaml',
      code: caddyDockerCompose.cleanCode,
      html: caddyDockerCompose.html,
      hasDiff: caddyDockerCompose.hasDiff,
    },
    {
      filename: 'Dockerfile',
      lang: 'dockerfile',
      code: caddyDockerfile.cleanCode,
      html: caddyDockerfile.html,
      hasDiff: caddyDockerfile.hasDiff,
    },
    {
      filename: 'Caddy(K8s)',
      lang: 'yaml',
      code: caddyK8s.cleanCode,
      html: caddyK8s.html,
      hasDiff: caddyK8s.hasDiff,
    },
  ],
  nginx: [
    {
      filename: 'nginx.conf',
      lang: 'nginx',
      code: nginxConf.cleanCode,
      html: nginxConf.html,
      hasDiff: nginxConf.hasDiff,
    },
    {
      filename: 'docker-compose.yaml',
      lang: 'yaml',
      code: nginxDockerCompose.cleanCode,
      html: nginxDockerCompose.html,
      hasDiff: nginxDockerCompose.hasDiff,
    },
    {
      filename: 'Nginx(K8s)',
      lang: 'yaml',
      code: nginxK8s.cleanCode,
      html: nginxK8s.html,
      hasDiff: nginxK8s.hasDiff,
    },
  ],
}))

// ─── Alternative Single Router Snippet ────────────────────────────────────────

const altTraefikYaml = buildSnippet({
  lang: 'yaml',
  code: `# dynamic_conf.yml
http:
  routers:
    immich:
      rule: "Host(\`photos.example.com\`)"
      entryPoints:
        - websecure
      middlewares:
        - immich-smart-shield # [!code ++]
      service: immich-service

  middlewares:
    immich-smart-shield: # [!code ++]
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
            - '(?i)^/api/auth/login.*$' # [!code ++]
            - '(?i)^/api/auth/admin-sign-up.*$' # [!code ++]
            - '(?i)^/api/users.*$' # [!code ++]
            - '(?i)^/api/admin.*$' # [!code ++]
            - '(?i)^/api/server-info/stats.*$' # [!code ++]
          # Trusted Home / VPN Subnets bypass the shield:
          allowedIps: # [!code ++]
            - "10.0.0.0/8"          # Internal LAN # [!code ++]
            - "100.64.0.0/10"        # Tailscale CGNAT subnet # [!code ++]
            - "192.168.1.0/24"       # Home Office subnet # [!code ++]
          response: # [!code ++]
            mode: json # [!code ++]
            statusCode: 404 # [!code ++]
            body: '{"error":"Not Found","message":"Resource unavailable"}' # [!code ++]

  services:
    immich-service:
      loadBalancer:
        servers:
          - url: "http://immich-server:2283"`,
})

const altTraefikToml = buildSnippet({
  lang: 'toml',
  code: `# dynamic_conf.toml
[http.routers.immich]
  rule = "Host(\`photos.example.com\`)"
  entryPoints = ["websecure"]
  middlewares = ["immich-smart-shield"] # [!code ++]
  service = "immich-service"

[http.middlewares.immich-smart-shield.plugin.routewarden] # [!code ++]
  enabled = true # [!code ++]
  methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"] # [!code ++]
  enableDefaultPatterns = true # [!code ++]
  blockPatterns = [ # [!code ++]
    "(?i)^/api/auth/login.*$", # [!code ++]
    "(?i)^/api/auth/admin-sign-up.*$", # [!code ++]
    "(?i)^/api/users.*$", # [!code ++]
    "(?i)^/api/admin.*$", # [!code ++]
    "(?i)^/api/server-info/stats.*$" # [!code ++]
  ] # [!code ++]
  allowedIps = [ # [!code ++]
    "10.0.0.0/8",      # Internal LAN # [!code ++]
    "100.64.0.0/10",    # Tailscale CGNAT subnet # [!code ++]
    "192.168.1.0/24"   # Home Office subnet # [!code ++]
  ] # [!code ++]

[http.middlewares.immich-smart-shield.plugin.routewarden.response] # [!code ++]
  mode = "json" # [!code ++]
  statusCode = 404 # [!code ++]
  body = '{"error":"Not Found","message":"Resource unavailable"}' # [!code ++]

[http.services.immich-service.loadBalancer]
  [[http.services.immich-service.loadBalancer.servers]]
    url = "http://immich-server:2283"`,
})

const altTraefikLabels = buildSnippet({
  lang: 'docker',
  code: `# docker-compose.yaml — Single router with IP allowlist bypass
- "traefik.enable=true"
- "traefik.http.routers.immich.rule=Host(\`photos.example.com\`)"
- "traefik.http.routers.immich.entrypoints=websecure"
- "traefik.http.routers.immich.middlewares=immich-smart-shield" # [!code ++]
- "traefik.http.middlewares.immich-smart-shield.plugin.routewarden.enabled=true" # [!code ++]
- "traefik.http.middlewares.immich-smart-shield.plugin.routewarden.methods=GET,POST,PUT,DELETE,PATCH,HEAD" # [!code ++]
- "traefik.http.middlewares.immich-smart-shield.plugin.routewarden.enableDefaultPatterns=true" # [!code ++]
- "traefik.http.middlewares.immich-smart-shield.plugin.routewarden.blockPatterns=(?i)^/api/auth/login.*$,(?i)^/api/auth/admin-sign-up.*$,(?i)^/api/users.*$,(?i)^/api/admin.*$,(?i)^/api/server-info/stats.*$" # [!code ++]
- "traefik.http.middlewares.immich-smart-shield.plugin.routewarden.allowedIps=10.0.0.0/8,100.64.0.0/10,192.168.1.0/24" # [!code ++]
- "traefik.http.middlewares.immich-smart-shield.plugin.routewarden.response.mode=json" # [!code ++]
- "traefik.http.middlewares.immich-smart-shield.plugin.routewarden.response.statusCode=404" # [!code ++]
- 'traefik.http.middlewares.immich-smart-shield.plugin.routewarden.response.body={"error":"Not Found","message":"Resource unavailable"}' # [!code ++]
- "traefik.http.services.immich.loadbalancer.server.port=2283"`,
})

const altCaddyfile = buildSnippet({
  lang: 'caddy',
  code: `# Caddyfile: Single domain with IP allowlist bypass
{
    order route_warden before reverse_proxy # [!code ++]
}

photos.example.com {
    route_warden { # [!code ++]
        methods GET POST PUT DELETE PATCH HEAD # [!code ++]
        enable_default_patterns true # [!code ++]
        block_patterns "(?i)^/api/auth/login.*$" "(?i)^/api/auth/admin-sign-up.*$" "(?i)^/api/users.*$" "(?i)^/api/admin.*$" "(?i)^/api/server-info/stats.*$" # [!code ++]
        # Whitelisted VPN and LAN subnets bypass the block:
        allowed_ips "10.0.0.0/8" "100.64.0.0/10" "192.168.1.0/24" # [!code ++]
        response { # [!code ++]
            mode json # [!code ++]
            status_code 404 # [!code ++]
            body "{\\"error\\":\\"Not Found\\",\\"message\\":\\"Resource unavailable\\"}" # [!code ++]
        } # [!code ++]
    } # [!code ++]

    reverse_proxy immich-server:2283
}`,
})

const altNginxConf = buildSnippet({
  lang: 'nginx',
  code: `# nginx.conf: Single server with IP allowlist bypass
http {
    init_by_lua_block {
        local routewarden = require("resty.routewarden") # [!code ++]
        immich_warden = routewarden.new({ # [!code ++]
            methods = { "GET", "POST", "PUT", "DELETE", "PATCH", "HEAD" }, # [!code ++]
            enable_default_patterns = true, # [!code ++]
            block_patterns = { # [!code ++]
                "(?i)^/api/auth/login.*$", # [!code ++]
                "(?i)^/api/auth/admin-sign-up.*$", # [!code ++]
                "(?i)^/api/users.*$", # [!code ++]
                "(?i)^/api/admin.*$", # [!code ++]
                "(?i)^/api/server-info/stats.*$" # [!code ++]
            }, # [!code ++]
            allowed_ips = { # [!code ++]
                "10.0.0.0/8", "100.64.0.0/10", "192.168.1.0/24" # [!code ++]
            }, # [!code ++]
            response = { # [!code ++]
                mode = "json", # [!code ++]
                status_code = 404, # [!code ++]
                body = '{"error":"Not Found","message":"Resource unavailable"}' # [!code ++]
            } # [!code ++]
        }) # [!code ++]
    }

    server {
        listen 80;
        server_name photos.example.com;

        access_by_lua_block {
            immich_warden:check() # [!code ++]
        }

        location / {
            proxy_pass http://immich-server:2283;
        }
    }
}`,
})

const alternativeSnippets = computed(() => ({
  traefik: [
    {
      filename: 'traefik.yaml',
      lang: 'yaml',
      code: altTraefikYaml.cleanCode,
      html: altTraefikYaml.html,
      hasDiff: altTraefikYaml.hasDiff,
    },
    {
      filename: 'traefik.toml',
      lang: 'toml',
      code: altTraefikToml.cleanCode,
      html: altTraefikToml.html,
      hasDiff: altTraefikToml.hasDiff,
    },
    {
      filename: 'docker-compose.yaml',
      lang: 'docker',
      code: altTraefikLabels.cleanCode,
      html: altTraefikLabels.html,
      hasDiff: altTraefikLabels.hasDiff,
    },
  ],
  caddy: [
    {
      filename: 'Caddyfile',
      lang: 'caddy',
      code: altCaddyfile.cleanCode,
      html: altCaddyfile.html,
      hasDiff: altCaddyfile.hasDiff,
    },
  ],
  nginx: [
    {
      filename: 'nginx.conf',
      lang: 'nginx',
      code: altNginxConf.cleanCode,
      html: altNginxConf.html,
      hasDiff: altNginxConf.hasDiff,
    },
  ],
}))

// ─── Verification Curl Test Snippets ─────────────────────────────────────────

const testPublicLogin = buildSnippet({
  lang: 'bash',
  code: `# 1. Attempt GET probe to login API from public internet
curl -i https://photos.example.com/api/auth/login

# Response:
# HTTP/2 404
# content-type: application/json
# {"error":"Not Found","message":"Endpoint unavailable on public router"}

# 2. Attempt POST login probe (credential stuffing / brute force)
curl -i -X POST https://photos.example.com/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"admin@example.com","password":"password123"}'

# Response:
# HTTP/2 404
# content-type: application/json
# {"error":"Not Found","message":"Endpoint unavailable on public router"}`,
})

const testPublicStats = buildSnippet({
  lang: 'bash',
  code: `# Attempt to probe server statistics or user list
curl -i https://photos.example.com/api/server-info/stats
curl -i https://photos.example.com/api/users

# Both return 404 Not Found immediately without touching Immich backend!`,
})

const testPublicShare = buildSnippet({
  lang: 'bash',
  code: `# 1. Public shared album link accessed from the internet
curl -i https://photos.example.com/share/abcdef123456

# Response:
# HTTP/2 200 OK
# Immich serves shared album viewer successfully

# 2. Password-protected shared album submission
# Client submits password via POST; Immich validates and issues a 303 redirect:
curl -i -X POST https://photos.example.com/share/abcdef123456 \\
  -H "Content-Type: application/json" \\
  -d '{"password":"family-secret"}'

# Response:
# HTTP/2 303 See Other
# Location: /share/abcdef123456
# Set-Cookie: immich_share_auth=...`,
})

const testInternalLogin = buildSnippet({
  lang: 'bash',
  code: `# Admin login from internal VPN router or whitelisted IP
curl -i https://photos-internal.example.com/api/auth/login

# Response:
# HTTP/2 200 OK (or backend response from Immich authentication handler)`,
})

const testPublicLoginSnippets = computed(() => ({
  traefik: [{ filename: 'Shell(Bash)', lang: 'bash', code: testPublicLogin.cleanCode, html: testPublicLogin.html, hasDiff: false }],
}))

const testPublicStatsSnippets = computed(() => ({
  traefik: [{ filename: 'Shell(Bash)', lang: 'bash', code: testPublicStats.cleanCode, html: testPublicStats.html, hasDiff: false }],
}))

const testPublicShareSnippets = computed(() => ({
  traefik: [{ filename: 'Shell(Bash)', lang: 'bash', code: testPublicShare.cleanCode, html: testPublicShare.html, hasDiff: false }],
}))

const testInternalLoginSnippets = computed(() => ({
  traefik: [{ filename: 'Shell(Bash)', lang: 'bash', code: testInternalLogin.cleanCode, html: testInternalLogin.html, hasDiff: false }],
}))

// ─── Dual-Router Architecture Diagram Snippets ──────────────────────────────
const immich_mermaid_raw = `flowchart TD
    CLIENT(["<b>Internet / Public Traffic</b>"]):::startNode --> EDGE["<b>Traefik Reverse Proxy</b><br/>Port 443 / EntryPoints: websecure &amp; internal"]:::edgeNode

    EDGE -->|Host: photos.domain| PUB["<b>Public Router</b><br/>EntryPoint: websecure"]:::routerNode
    EDGE -->|Host: photos-lan.vpn| PRIV["<b>Private / VPN Router</b><br/>EntryPoint: internal (Tailscale / WireGuard)"]:::vpnNode

    PUB --> SHIELD["<b>RouteWarden Shield</b><br/>• Intercepts: /api/auth/login*, /api/users*, /api/admin*<br/>• Enforces 403 Forbidden or silent TCP drop"]:::shieldNode

    PRIV -->|Direct Full Admin Access| BACKEND["<b>Immich Server</b><br/>Upstream Backend Application"]:::upstreamNode
    SHIELD -->|Allowed Public Assets /share/*| BACKEND

    classDef startNode fill:#0284c7,stroke:#0369a1,color:#ffffff,stroke-width:2px;
    classDef edgeNode fill:#1e293b,stroke:#00a8cc,color:#f8fafc,stroke-width:2px;
    classDef routerNode fill:#1e293b,stroke:#f59e0b,color:#f8fafc,stroke-width:2px;
    classDef vpnNode fill:#1e293b,stroke:#10b981,color:#f8fafc,stroke-width:2px;
    classDef shieldNode fill:#1e293b,stroke:#ef4444,color:#f8fafc,stroke-width:2px;
    classDef upstreamNode fill:#0f172a,stroke:#6366f1,color:#ffffff,stroke-width:2px;`

const immich_graph_svg = `<div class="rw-graph-container">
  <svg viewBox="0 0 960 480" fill="none" xmlns="http://www.w3.org/2000/svg" class="rw-graph-svg">
    <defs>
      <linearGradient id="immich-grad-pub" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.14"/>
        <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.02"/>
      </linearGradient>
      <linearGradient id="immich-grad-priv" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#10b981" stop-opacity="0.14"/>
        <stop offset="100%" stop-color="#10b981" stop-opacity="0.02"/>
      </linearGradient>
      <linearGradient id="immich-grad-shield" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ef4444" stop-opacity="0.14"/>
        <stop offset="100%" stop-color="#ef4444" stop-opacity="0.02"/>
      </linearGradient>
      <linearGradient id="immich-grad-backend" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#6366f1" stop-opacity="0.14"/>
        <stop offset="100%" stop-color="#6366f1" stop-opacity="0.03"/>
      </linearGradient>
      <marker id="immich-arr-cyan" viewBox="-2 -2 16 14" refX="10" refY="5" markerWidth="9" markerHeight="9" orient="auto" overflow="visible">
        <path d="M 0 1 L 11 5 L 0 9 z" fill="#00a8cc"/>
      </marker>
      <marker id="immich-arr-amber" viewBox="-2 -2 16 14" refX="10" refY="5" markerWidth="9" markerHeight="9" orient="auto" overflow="visible">
        <path d="M 0 1 L 11 5 L 0 9 z" fill="#f59e0b"/>
      </marker>
      <marker id="immich-arr-emerald" viewBox="-2 -2 16 14" refX="10" refY="5" markerWidth="9" markerHeight="9" orient="auto" overflow="visible">
        <path d="M 0 1 L 11 5 L 0 9 z" fill="#10b981"/>
      </marker>
      <marker id="immich-arr-rose" viewBox="-2 -2 16 14" refX="10" refY="5" markerWidth="9" markerHeight="9" orient="auto" overflow="visible">
        <path d="M 0 1 L 11 5 L 0 9 z" fill="#ef4444"/>
      </marker>
      <marker id="immich-arr-indigo" viewBox="-2 -2 16 14" refX="10" refY="5" markerWidth="9" markerHeight="9" orient="auto" overflow="visible">
        <path d="M 0 1 L 11 5 L 0 9 z" fill="#6366f1"/>
      </marker>
    </defs>

    <!-- 0. Inbound Public & LAN Traffic -->
    <rect x="340" y="16" width="280" height="40" rx="20" class="rw-g-node"/>
    <circle cx="362" cy="36" r="7" fill="#0284c7"/>
    <text x="380" y="41" class="rw-g-card-title">Inbound Client Requests</text>
    <line x1="480" y1="56" x2="480" y2="82" stroke="#00a8cc" stroke-width="2" marker-end="url(#immich-arr-cyan)"/>

    <!-- 1. Traefik Reverse Proxy -->
    <rect x="290" y="82" width="380" height="56" rx="10" class="rw-g-node"/>
    <circle cx="316" cy="110" r="8" fill="#00a8cc"/>
    <text x="334" y="106" class="rw-g-card-title">Traefik Ingress Router (Port 443)</text>
    <text x="334" y="124" class="rw-g-desc">TLS Termination • Host SNI Matching • EntryPoint Routing</text>

    <!-- Connectors: Traefik -> Routers -->
    <path d="M 380 138 C 380 160, 230 155, 230 178" stroke="#f59e0b" stroke-width="2" fill="none" marker-end="url(#immich-arr-amber)"/>
    <path d="M 580 138 C 580 160, 730 155, 730 178" stroke="#10b981" stroke-width="2" fill="none" marker-end="url(#immich-arr-emerald)"/>

    <!-- 2. Public Router -->
    <rect x="60" y="178" width="340" height="74" rx="10" class="rw-g-box" fill="url(#immich-grad-pub)"/>
    <circle cx="86" cy="204" r="7" fill="#f59e0b"/>
    <text x="104" y="202" class="rw-g-card-title">Public Router (Internet Access)</text>
    <text x="86" y="224" class="rw-g-desc">Rule: Host(\`photos.domain.com\`) • EntryPoint: websecure</text>
    <text x="86" y="240" class="rw-g-desc">Intended for public photo galleries, album sharing &amp; uploads</text>

    <!-- 3. Private / VPN Router -->
    <rect x="560" y="178" width="340" height="74" rx="10" class="rw-g-box" fill="url(#immich-grad-priv)"/>
    <circle cx="586" cy="204" r="7" fill="#10b981"/>
    <text x="604" y="202" class="rw-g-card-title">Private Router (Admin / LAN / VPN)</text>
    <text x="586" y="224" class="rw-g-desc">Rule: Host(\`photos-lan.domain.com\`) • EntryPoint: internal</text>
    <text x="586" y="240" class="rw-g-desc">Direct admin panel, background jobs, user management access</text>

    <!-- Connector: Public Router -> RouteWarden Shield -->
    <line x1="230" y1="252" x2="230" y2="284" stroke="#ef4444" stroke-width="2" marker-end="url(#immich-arr-rose)"/>

    <!-- 4. RouteWarden Shield -->
    <rect x="60" y="284" width="340" height="88" rx="10" class="rw-g-box" fill="url(#immich-grad-shield)"/>
    <circle cx="86" cy="310" r="7" fill="#ef4444"/>
    <text x="104" y="308" class="rw-g-card-title">RouteWarden Middleware Shield</text>
    <text x="86" y="328" class="rw-g-desc">• Strictly intercepts: /api/auth/login*, /api/users*, /api/admin*</text>
    <text x="86" y="344" class="rw-g-desc">• Blocks sensitive probing with 403 Forbidden or silent TCP drop</text>
    <text x="86" y="360" class="rw-g-desc">• Allowed paths pass safely: /share/*, /api/asset/*</text>

    <!-- Connectors to Upstream Backend -->
    <!-- From RouteWarden Shield to Immich (Allowed Public Traffic) -->
    <path d="M 230 372 L 230 408" stroke="#0284c7" stroke-width="2" fill="none" marker-end="url(#immich-arr-cyan)"/>
    <rect x="155" y="380" width="150" height="18" rx="4" class="rw-g-pill"/>
    <text x="230" y="393" text-anchor="middle" class="rw-g-pill-txt" fill="#0284c7">Allowed Public Assets</text>

    <!-- From Private Router directly to Immich (Full Admin Access) -->
    <path d="M 730 252 L 730 408" stroke="#10b981" stroke-width="2" fill="none" marker-end="url(#immich-arr-emerald)"/>
    <rect x="660" y="324" width="140" height="18" rx="4" class="rw-g-pill"/>
    <text x="730" y="337" text-anchor="middle" class="rw-g-pill-txt" fill="#10b981">Full Admin Access</text>

    <!-- 5. Immich Server (Upstream Backend) -->
    <rect x="60" y="412" width="840" height="54" rx="10" class="rw-g-box" fill="url(#immich-grad-backend)"/>
    <circle cx="86" cy="439" r="8" fill="#6366f1"/>
    <text x="104" y="435" class="rw-g-card-title" fill="#6366f1">Immich Server (Upstream Backend Application)</text>
    <text x="104" y="453" class="rw-g-desc">Single upstream container receiving clean public requests and authorized internal admin connections</text>
  </svg>
</div>`

const immichArchSnippets = computed(() => ({
  traefik: [
    { filename: 'Dual-Router Architecture', lang: 'mermaid', code: immich_mermaid_raw, html: immich_graph_svg, hasDiff: false },
  ],
}))
</script>

# Case Study: Dual-Router Security for Immich Self-Hosted Photos

This case study demonstrates a real-world production pattern: **securing a self-hosted web application with a dual-router architecture using RouteWarden**.

We use **[Immich](https://immich.app/)** (a self-hosted high-performance photo and video backup solution) as the primary example, though this pattern applies equally to Nextcloud, Jellyfin, Grafana, Home Assistant, and internal SaaS tools.

---

## The Challenge

You want to share public photo albums, shared timeline links, or public asset previews with family, friends, or clients over the internet (e.g., `photos.yourdomain.com`). 

However, exposing Immich directly to the public web introduces significant attack surface:
- **Authentication & Login APIs**: Brute-force credential stuffing against `/api/auth/login`.
- **Administrative Endpoints**: Potential exposure of `/api/admin/*` or `/api/server-info/stats`.
- **User Management**: Public scanning against user enumeration APIs like `/api/users*`.
- **Account Registration**: Public bot registrations against `/api/auth/admin-sign-up*`.

### The Goal
1. **Private Router (Admins / Family)**: Accessible via internal network / VPN (WireGuard, Tailscale, or corporate subnet). Has full access to all features, administration, background jobs, user management, and login.
2. **Public Router (Internet)**: Accessible publicly to view shared photos/albums, but **strictly intercepts and blocks** all sensitive login, administrative, and user management endpoints before they can ever be probed by internet scanners.

---

## Architecture Diagram

<CodeViewer :snippets="immichArchSnippets" />

---

## Immich Configuration: Setting the External Domain

When Immich generates public share links (e.g. for photo albums or partner sharing), it must know which public domain to embed into the generated links instead of your internal/VPN IP.

1. Log into your Immich web interface as an Administrator (using your private/VPN router or internal IP).
2. Navigate to **Administration** ➔ **Settings** ➔ **Server Settings**.
3. Under **External domain**, enter your public router's URL (e.g., `https://photos.domain` or `https://photos.example.com`).
4. Click **Save**.

![Immich Server Settings](/immich-server-settings.png)

> [!TIP]
> Setting the **External domain** guarantees that whenever you create a public album or shareable link, Immich automatically prefixes links with your hardened public domain (`https://photos.domain/share/...`), which points to the RouteWarden-protected public router.

---

## RouteWarden Dual-Router Configuration

Select your gateway below to see the full configuration. Diff highlights show the RouteWarden-specific additions:

<CodeViewer :snippets="snippets" />

---

## Crucial Implementation Notes & Production Caveats

### 1. HTTP Methods: Why `methods` is Mandatory

By default, RouteWarden inspects only `GET` requests (`methods: ["GET"]`) to preserve performance for non-idempotent operations unless configured otherwise.

However, modern web applications like Immich execute credential checks and administrative operations using **`POST`**, **`PUT`**, and **`DELETE`**:
- Login attempts: `POST /api/auth/login`
- Admin sign-ups: `POST /api/auth/admin-sign-up`
- User creations: `POST /api/users`

> [!WARNING]
> If you omit the `methods` directive, RouteWarden will inspect only `GET` requests. An attacker sending a `POST /api/auth/login` credential brute-force request would **completely bypass RouteWarden** and hit the Immich backend directly. Always explicitly define:
> - **Caddy**: `methods GET POST PUT DELETE PATCH HEAD`
> - **Traefik (YAML / TOML)**: `methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"]`
> - **NGINX (Lua)**: `methods = { "GET", "POST", "PUT", "DELETE", "PATCH", "HEAD" }`

### 2. Public Share Links (`/share/...`) & Password-Protected Albums

Immich provides two types of public shares:
1. **Unprotected Albums**: Visitors access `GET /share/<shareKey>`. The Immich frontend loads and retrieves preview assets via `/api/assets/*`.
2. **Password-Protected Albums**: The visitor is presented with a password prompt. Submitting the password sends a **`POST /share/<shareKey>`** request with the password payload. Immich validates the password, sets a session cookie, and returns an **`HTTP 303 See Other`** redirect back to `GET /share/<shareKey>`.

Because our recommended `blockPatterns` strictly target authentication and admin endpoints (`/api/auth/login`, `/api/auth/admin-sign-up`, `/api/users`, `/api/admin`, `/api/server-info/stats`), public `/share/*` flows—including password submission redirects—function seamlessly without being blocked.

### 3. Stealth Cloaking (404 Not Found) vs `silentDrop` (Avoid 502 Edge Errors)

In our snippets, the recommended response is **`mode: json`** (or **`mode: html`**) with **`statusCode: 404`**:

```json
"response": {
  "mode": "json",
  "statusCode": 404,
  "body": "{\"error\":\"Not Found\",\"message\":\"Endpoint unavailable on public router\"}"
}
```

> [!IMPORTANT]
> If your reverse proxy is placed behind an edge proxy or CDN (such as Cloudflare, Traefik edge gateway, AWS ALB, or NGINX), avoid using `mode: silentDrop`. 
>
> When RouteWarden drops or resets a TCP connection under `silentDrop`, the upstream edge proxy cannot complete the connection and will return an **`HTTP 502 Bad Gateway`** error page to the client. Using `mode: json` or `mode: html` with `statusCode: 404` returns a natural, stealthy "Not Found" response that mimics a non-existent route without causing edge proxy 502 errors.

### 4. Caddy Directive Ordering

When using Caddy, you must register RouteWarden before Caddy's built-in `reverse_proxy` directive in the global options block:

```caddy
{
    order route_warden before reverse_proxy
}
```

*(You may also use the alias `order routewarden before reverse_proxy`.)*

Without this directive order, Caddy will fail to start with the error:
`directive 'route_warden' is not an ordered HTTP handler`.
Alternatively, you can encapsulate RouteWarden and your proxy inside an explicit `route { ... }` block.

---

## Alternative: Single Router with IP Whitelisting Bypass

If you prefer using a single domain name (e.g. `photos.example.com`) without maintaining separate public and private hostnames or entrypoints, you can configure RouteWarden's **`allowedIps`** feature:

<CodeViewer :snippets="alternativeSnippets" />

With this approach:
- When you connect while connected to your **Tailscale / WireGuard VPN** or home Wi-Fi, `allowedIps` matches your client IP, allowing unrestricted login and administration.
- When an external user or scanner hits `photos.example.com` from the internet, login and admin endpoints return **404 Not Found**, while public album links continue working smoothly.

---

## Security Verification & Curl Tests

### 1. Test from Public Internet (Simulated Attack)

<CodeViewer :snippets="testPublicLoginSnippets" />

<CodeViewer :snippets="testPublicStatsSnippets" />

### 2. Test Public Photo Sharing (Allowed Traffic)

<CodeViewer :snippets="testPublicShareSnippets" />

### 3. Test from Internal / VPN Router

<CodeViewer :snippets="testInternalLoginSnippets" />

---

## Key Benefits of this Architecture

1. **Zero Exposure of Authentication Surfaces**: Attackers cannot brute-force passwords, credential-stuff, or discover admin endpoints.
2. **Cloaked Topology (404 Not Found)**: Scanners receive a standard 404, leading them to believe the API endpoints do not exist.
3. **Upstream Load Reduction**: Blocked requests are intercepted at the proxy level in microseconds, avoiding database queries and application CPU overhead on Immich.
4. **No Custom Forks**: No need to patch or fork the upstream application; security policy is maintained cleanly at the network perimeter.
