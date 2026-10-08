---
title: Case Study – Honeypot Deflection & Tarpit Scanning Sink
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

// ─── Strategy A: silentDrop ───────────────────────────────────────────────────
const silentDrop = {
  traefik_yaml: buildSnippet({ lang: 'yaml', code: `# dynamic_conf.yml
http:
  middlewares:
    scanner-drop: # [!code ++]
      plugin: # [!code ++]
        routewarden: # [!code ++]
          enabled: true # [!code ++]
          methods: # [!code ++]
            - GET # [!code ++]
            - POST # [!code ++]
            - HEAD # [!code ++]
          enableDefaultPatterns: true # [!code ++]
          # Close connection immediately on probe attempts
          response: # [!code ++]
            mode: silentDrop # [!code ++]` }),
  traefik_toml: buildSnippet({ lang: 'toml', code: `# dynamic_conf.toml
[http.middlewares.scanner-drop.plugin.routewarden] # [!code ++]
  enabled = true # [!code ++]
  methods = ["GET", "POST", "HEAD"] # [!code ++]
  enableDefaultPatterns = true # [!code ++]
 # [!code ++]
[http.middlewares.scanner-drop.plugin.routewarden.response] # [!code ++]
  mode = "silentDrop" # [!code ++]` }),
  traefik_labels: buildSnippet({ lang: 'docker', code: `# Docker Compose Labels
- "traefik.http.middlewares.scanner-drop.plugin.routewarden.enabled=true" # [!code ++]
- "traefik.http.middlewares.scanner-drop.plugin.routewarden.methods=GET,POST,HEAD" # [!code ++]
- "traefik.http.middlewares.scanner-drop.plugin.routewarden.enableDefaultPatterns=true" # [!code ++]
- "traefik.http.middlewares.scanner-drop.plugin.routewarden.response.mode=silentDrop" # [!code ++]` }),
  caddy: buildSnippet({ lang: 'caddy', code: `# Caddyfile
{
    order route_warden before reverse_proxy # [!code ++]
}

example.com {
    route_warden { # [!code ++]
        methods GET POST HEAD # [!code ++]
        enable_default_patterns true # [!code ++]
        response { # [!code ++]
            mode silent_drop # [!code ++]
        } # [!code ++]
    } # [!code ++]
    reverse_proxy backend:8080
}` }),
  nginx: buildSnippet({ lang: 'nginx', code: `# nginx.conf: Silent TCP Connection Drop (HTTP 444)
http {
    lua_package_path "/usr/local/openresty/site/lualib/?.lua;/etc/nginx/lua/lib/?.lua;;";

    init_by_lua_block {
        local routewarden = require("resty.routewarden") # [!code ++]

        drop_warden = routewarden.new({ # [!code ++]
            methods = { "GET", "POST", "HEAD" }, # [!code ++]
            enable_default_patterns = true, # [!code ++]
            response = { # [!code ++]
                mode = "silentDrop" # [!code ++]
            } # [!code ++]
        }) # [!code ++]
    }

    server {
        listen 80;
        server_name example.com;

        access_by_lua_block {
            drop_warden:check() # [!code ++]
        }

        location / {
            proxy_pass http://backend:8080;
        }
    }
}` }),
  cli: buildSnippet({ lang: 'json', code: `// routewarden.json
{
  "$schema": "https://raw.githubusercontent.com/routewarden/cli/main/config.schema.json",
  "enabled": true,
  "methods": ["GET", "POST", "HEAD"],
  "enableDefaultPatterns": true,
  "response": {
    "mode": "silentDrop"
  }
}` }),
}

// ─── Strategy B: Honeypot redirect ───────────────────────────────────────────
const honeypot = {
  traefik_yaml: buildSnippet({ lang: 'yaml', code: `# dynamic_conf.yml
http:
  middlewares:
    honeypot-deflect: # [!code ++]
      plugin: # [!code ++]
        routewarden: # [!code ++]
          enabled: true # [!code ++]
          methods: # [!code ++]
            - GET # [!code ++]
            - POST # [!code ++]
            - HEAD # [!code ++]
          enableDefaultPatterns: true # [!code ++]
          response: # [!code ++]
            mode: redirect # [!code ++]
            statusCode: 307 # [!code ++]
            redirectUrl: "https://honeypot.internal.corp/capture" # [!code ++]
            headers: # [!code ++]
              X-RouteWarden-Deflected: "true" # [!code ++]` }),
  traefik_toml: buildSnippet({ lang: 'toml', code: `# dynamic_conf.toml
[http.middlewares.honeypot-deflect.plugin.routewarden] # [!code ++]
  enabled = true # [!code ++]
  methods = ["GET", "POST", "HEAD"] # [!code ++]
  enableDefaultPatterns = true # [!code ++]
 # [!code ++]
[http.middlewares.honeypot-deflect.plugin.routewarden.response] # [!code ++]
  mode = "redirect" # [!code ++]
  statusCode = 307 # [!code ++]
  redirectUrl = "https://honeypot.internal.corp/capture" # [!code ++]
 # [!code ++]
[http.middlewares.honeypot-deflect.plugin.routewarden.response.headers] # [!code ++]
  X-RouteWarden-Deflected = "true" # [!code ++]` }),
  traefik_labels: buildSnippet({ lang: 'docker', code: `# Docker Compose Labels
- "traefik.http.middlewares.honeypot-deflect.plugin.routewarden.enabled=true" # [!code ++]
- "traefik.http.middlewares.honeypot-deflect.plugin.routewarden.methods=GET,POST,HEAD" # [!code ++]
- "traefik.http.middlewares.honeypot-deflect.plugin.routewarden.enableDefaultPatterns=true" # [!code ++]
- "traefik.http.middlewares.honeypot-deflect.plugin.routewarden.response.mode=redirect" # [!code ++]
- "traefik.http.middlewares.honeypot-deflect.plugin.routewarden.response.statusCode=307" # [!code ++]
- "traefik.http.middlewares.honeypot-deflect.plugin.routewarden.response.redirectUrl=https://honeypot.internal.corp/capture" # [!code ++]
- "traefik.http.middlewares.honeypot-deflect.plugin.routewarden.response.headers.X-RouteWarden-Deflected=true" # [!code ++]` }),
  caddy: buildSnippet({ lang: 'caddy', code: `# Caddyfile
{
    order route_warden before reverse_proxy # [!code ++]
}

example.com {
    route_warden { # [!code ++]
        methods GET POST HEAD # [!code ++]
        enable_default_patterns true # [!code ++]
        response { # [!code ++]
            mode redirect # [!code ++]
            status_code 307 # [!code ++]
            redirect_url "https://honeypot.internal.corp/capture" # [!code ++]
        } # [!code ++]
    } # [!code ++]
    reverse_proxy backend:8080
}` }),
  nginx: buildSnippet({ lang: 'nginx', code: `# nginx.conf: Honeypot Redirection
http {
    lua_package_path "/usr/local/openresty/site/lualib/?.lua;/etc/nginx/lua/lib/?.lua;;";

    init_by_lua_block {
        local routewarden = require("resty.routewarden") # [!code ++]

        honeypot_warden = routewarden.new({ # [!code ++]
            methods = { "GET", "POST", "HEAD" }, # [!code ++]
            enable_default_patterns = true, # [!code ++]
            response = { # [!code ++]
                mode = "redirect", # [!code ++]
                status_code = 307, # [!code ++]
                redirect_url = "https://honeypot.internal.corp/capture", # [!code ++]
                headers = { # [!code ++]
                    ["X-RouteWarden-Deflected"] = "true" # [!code ++]
                } # [!code ++]
            } # [!code ++]
        }) # [!code ++]
    }

    server {
        listen 80;
        server_name example.com;

        access_by_lua_block {
            honeypot_warden:check() # [!code ++]
        }

        location / {
            proxy_pass http://backend:8080;
        }
    }
}` }),
  cli: buildSnippet({ lang: 'json', code: `// routewarden.json
{
  "$schema": "https://raw.githubusercontent.com/routewarden/cli/main/config.schema.json",
  "enabled": true,
  "methods": ["GET", "POST", "HEAD"],
  "enableDefaultPatterns": true,
  "response": {
    "mode": "redirect",
    "statusCode": 307,
    "redirectUrl": "https://honeypot.internal.corp/capture",
    "headers": {
      "X-RouteWarden-Deflected": "true"
    }
  }
}` }),
}

// ─── Strategy C: Staging cloaking ────────────────────────────────────────────
const staging = {
  traefik_yaml: buildSnippet({ lang: 'yaml', code: `# dynamic_conf.yml
http:
  middlewares:
    staging-guard: # [!code ++]
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
          # Block everything by default
          blockPatterns: # [!code ++]
            - '^/.*$' # [!code ++]
          # Disable standard public exemptions (robots.txt, sitemap.xml)
          enableDefaultAllowPatterns: false # [!code ++]
          # Allow exclusively developer and office subnets
          allowedIps: # [!code ++]
            - "10.0.0.0/8" # [!code ++]
            - "100.64.0.0/10" # Tailscale # [!code ++]
            - "203.0.113.50/32" # Corporate NAT IP # [!code ++]
          response: # [!code ++]
            mode: json # [!code ++]
            statusCode: 404 # [!code ++]
            body: '{"error":"Not Found"}' # [!code ++]` }),
  traefik_toml: buildSnippet({ lang: 'toml', code: `# dynamic_conf.toml
[http.middlewares.staging-guard.plugin.routewarden] # [!code ++]
  enabled = true # [!code ++]
  methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"] # [!code ++]
  enableDefaultAllowPatterns = false # [!code ++]
  blockPatterns = ["^/.*$"] # [!code ++]
  allowedIps = ["10.0.0.0/8", "100.64.0.0/10", "203.0.113.50/32"] # [!code ++]
 # [!code ++]
[http.middlewares.staging-guard.plugin.routewarden.response] # [!code ++]
  mode = "json" # [!code ++]
  statusCode = 404 # [!code ++]
  body = '{"error":"Not Found"}' # [!code ++]` }),
  traefik_labels: buildSnippet({ lang: 'docker', code: `# Docker Compose Labels
- "traefik.http.middlewares.staging-guard.plugin.routewarden.enabled=true" # [!code ++]
- "traefik.http.middlewares.staging-guard.plugin.routewarden.methods=GET,POST,PUT,DELETE,PATCH,HEAD" # [!code ++]
- "traefik.http.middlewares.staging-guard.plugin.routewarden.enableDefaultAllowPatterns=false" # [!code ++]
- "traefik.http.middlewares.staging-guard.plugin.routewarden.blockPatterns=^/.*$" # [!code ++]
- "traefik.http.middlewares.staging-guard.plugin.routewarden.allowedIps=10.0.0.0/8,100.64.0.0/10,203.0.113.50/32" # [!code ++]
- "traefik.http.middlewares.staging-guard.plugin.routewarden.response.mode=json" # [!code ++]
- "traefik.http.middlewares.staging-guard.plugin.routewarden.response.statusCode=404" # [!code ++]
- 'traefik.http.middlewares.staging-guard.plugin.routewarden.response.body={"error":"Not Found"}' # [!code ++]` }),
  caddy: buildSnippet({ lang: 'caddy', code: `# Caddyfile
{
    order route_warden before reverse_proxy # [!code ++]
}

pr-142.staging.example.com {
    route_warden { # [!code ++]
        methods GET POST PUT DELETE PATCH HEAD # [!code ++]
        enable_default_allow_patterns false # [!code ++]
        block_patterns "^/.*$" # [!code ++]
        allowed_ips "10.0.0.0/8" "100.64.0.0/10" "203.0.113.50/32" # [!code ++]
        response { # [!code ++]
            mode json # [!code ++]
            status_code 404 # [!code ++]
            body "{\\"error\\":\\"Not Found\\"}" # [!code ++]
        } # [!code ++]
    } # [!code ++]
    reverse_proxy preview-app:3000
}` }),
  nginx: buildSnippet({ lang: 'nginx', code: `# nginx.conf: Staging & Preview Cloaking
http {
    lua_package_path "/usr/local/openresty/site/lualib/?.lua;/etc/nginx/lua/lib/?.lua;;";

    init_by_lua_block {
        local routewarden = require("resty.routewarden") # [!code ++]

        staging_warden = routewarden.new({ # [!code ++]
            methods = { "GET", "POST", "PUT", "DELETE", "PATCH", "HEAD" }, # [!code ++]
            enable_default_allow_patterns = false, # [!code ++]
            block_patterns = { # [!code ++]
                "^/.*$" # [!code ++]
            }, # [!code ++]
            allowed_ips = { # [!code ++]
                "10.0.0.0/8", # [!code ++]
                "100.64.0.0/10", # [!code ++]
                "203.0.113.50/32" # [!code ++]
            }, # [!code ++]
            response = { # [!code ++]
                mode = "json", # [!code ++]
                status_code = 404, # [!code ++]
                body = '{"error":"Not Found"}' # [!code ++]
            } # [!code ++]
        }) # [!code ++]
    }

    server {
        listen 80;
        server_name pr-142.staging.example.com;

        access_by_lua_block {
            staging_warden:check() # [!code ++]
        }

        location / {
            proxy_pass http://preview-app:3000;
        }
    }
}` }),
  cli: buildSnippet({ lang: 'json', code: `// routewarden.json
{
  "$schema": "https://raw.githubusercontent.com/routewarden/cli/main/config.schema.json",
  "enabled": true,
  "methods": ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"],
  "enableDefaultAllowPatterns": false,
  "blockPatterns": [
    "^/.*$"
  ],
  "allowedIps": [
    "10.0.0.0/8",
    "100.64.0.0/10",
    "203.0.113.50/32"
  ],
  "response": {
    "mode": "json",
    "statusCode": 404,
    "body": "{\\"error\\":\\"Not Found\\"}"
  }
}` }),
}

// ─── Strategy D: Gzip Bomb ────────────────────────────────────────────────────
const gzipBomb = {
  traefik_yaml: buildSnippet({ lang: 'yaml', code: `# dynamic_conf.yml
http:
  middlewares:
    honeypot-bomber: # [!code ++]
      plugin: # [!code ++]
        routewarden: # [!code ++]
          enabled: true # [!code ++]
          methods: # [!code ++]
            - GET # [!code ++]
            - POST # [!code ++]
            - HEAD # [!code ++]
          blockPatterns: # [!code ++]
            # Lure crawlers scanning for high-value targets
            - '(?i)(^|/)(\\.env.*|\\.git.*|wp-login\\.php|phpmyadmin.*)$' # [!code ++]
          response: # [!code ++]
            mode: gzipBomb         # Alias: "bomb" # [!code ++]
            statusCode: 200        # Looks like a jackpot 200 OK to the crawler # [!code ++]
            gzipBombMB: 10         # 10MB uncompressed expands ~1000x to ~10GB in client memory # [!code ++]` }),
  traefik_toml: buildSnippet({ lang: 'toml', code: `# dynamic_conf.toml
[http.middlewares.honeypot-bomber.plugin.routewarden] # [!code ++]
  enabled = true # [!code ++]
  methods = ["GET", "POST", "HEAD"] # [!code ++]
  blockPatterns = ["(?i)(^|/)(\\\\.env.*|\\\\.git.*|wp-login\\\\.php|phpmyadmin.*)$"] # [!code ++]
 # [!code ++]
[http.middlewares.honeypot-bomber.plugin.routewarden.response] # [!code ++]
  mode = "gzipBomb" # [!code ++]
  statusCode = 200 # [!code ++]
  gzipBombMB = 10 # [!code ++]` }),
  traefik_labels: buildSnippet({ lang: 'docker', code: `# Docker Compose Labels
- "traefik.http.middlewares.honeypot-bomber.plugin.routewarden.enabled=true" # [!code ++]
- "traefik.http.middlewares.honeypot-bomber.plugin.routewarden.methods=GET,POST,HEAD" # [!code ++]
- "traefik.http.middlewares.honeypot-bomber.plugin.routewarden.blockPatterns=(?i)(^|/)(\\\\.env.*|\\\\.git.*|wp-login\\\\.php|phpmyadmin.*)$" # [!code ++]
- "traefik.http.middlewares.honeypot-bomber.plugin.routewarden.response.mode=gzipBomb" # [!code ++]
- "traefik.http.middlewares.honeypot-bomber.plugin.routewarden.response.statusCode=200" # [!code ++]
- "traefik.http.middlewares.honeypot-bomber.plugin.routewarden.response.gzipBombMB=10" # [!code ++]` }),
  caddy: buildSnippet({ lang: 'caddy', code: `# Caddyfile
{
    order route_warden before reverse_proxy # [!code ++]
}

honeypot.example.com {
    route_warden { # [!code ++]
        methods GET POST HEAD # [!code ++]
        block_patterns "(?i)(^|/)(\\.env.*|\\.git.*|wp-login\\.php|phpmyadmin.*)$" # [!code ++]
        response { # [!code ++]
            mode gzip_bomb # [!code ++]
            status_code 200 # [!code ++]
            gzip_bomb_mb 10 # [!code ++]
        } # [!code ++]
    } # [!code ++]
    reverse_proxy honeypot-sink:80
}` }),
  nginx: buildSnippet({ lang: 'nginx', code: `# nginx.conf: Gzip Bomb Active Defense
http {
    lua_package_path "/usr/local/openresty/site/lualib/?.lua;/etc/nginx/lua/lib/?.lua;;";

    init_by_lua_block {
        local routewarden = require("resty.routewarden") # [!code ++]

        bomb_warden = routewarden.new({ # [!code ++]
            methods = { "GET", "POST", "HEAD" }, # [!code ++]
            block_patterns = { # [!code ++]
                "(?i)(^|/)(\\\\.env.*|\\\\.git.*|wp-login\\\\.php|phpmyadmin.*)$" # [!code ++]
            }, # [!code ++]
            response = { # [!code ++]
                mode = "gzipBomb", # [!code ++]
                status_code = 200, # [!code ++]
                gzip_bomb_mb = 10 # [!code ++]
            } # [!code ++]
        }) # [!code ++]
    }

    server {
        listen 80;
        server_name honeypot.example.com;

        access_by_lua_block {
            bomb_warden:check() # [!code ++]
        }

        location / {
            proxy_pass http://honeypot-sink:80;
        }
    }
}` }),
  cli: buildSnippet({ lang: 'json', code: `// routewarden.json
{
  "$schema": "https://raw.githubusercontent.com/routewarden/cli/main/config.schema.json",
  "enabled": true,
  "methods": ["GET", "POST", "HEAD"],
  "blockPatterns": [
    "(?i)(^|/)(\\\\.env.*|\\\\.git.*|wp-login\\\\.php|phpmyadmin.*)$"
  ],
  "response": {
    "mode": "gzipBomb",
    "statusCode": 200,
    "gzipBombMB": 10
  }
}` }),
}

// ─── Strategy E: Tarpit ───────────────────────────────────────────────────────
const tarpit = {
  traefik_yaml: buildSnippet({ lang: 'yaml', code: `http:
  middlewares:
    tarpit-sink: # [!code ++]
      plugin: # [!code ++]
        routewarden: # [!code ++]
          enabled: true # [!code ++]
          methods: # [!code ++]
            - GET # [!code ++]
            - POST # [!code ++]
            - HEAD # [!code ++]
          blockPatterns: # [!code ++]
            - '(?i)^/(phpmyadmin|pma|wp-login\\.php|\\.env|\\.git.*)$' # [!code ++]
          response: # [!code ++]
            mode: tarpit # [!code ++]
            statusCode: 200 # [!code ++]
            tarpitDelayMs: 1000            # Trickle 1 byte every 1000ms # [!code ++]
            tarpitMaxDurationSeconds: 120  # Release socket after 2 minutes # [!code ++]` }),
  traefik_toml: buildSnippet({ lang: 'toml', code: `# dynamic_conf.toml
[http.middlewares.tarpit-sink.plugin.routewarden] # [!code ++]
  enabled = true # [!code ++]
  methods = ["GET", "POST", "HEAD"] # [!code ++]
  blockPatterns = ["(?i)^/(phpmyadmin|pma|wp-login\\\\.php|\\\\.env|\\\\.git.*)$"] # [!code ++]
 # [!code ++]
[http.middlewares.tarpit-sink.plugin.routewarden.response] # [!code ++]
  mode = "tarpit" # [!code ++]
  statusCode = 200 # [!code ++]
  tarpitDelayMs = 1000 # [!code ++]
  tarpitMaxDurationSeconds = 120 # [!code ++]` }),
  traefik_labels: buildSnippet({ lang: 'docker', code: `# Docker Compose Labels
- "traefik.http.middlewares.tarpit-sink.plugin.routewarden.enabled=true" # [!code ++]
- "traefik.http.middlewares.tarpit-sink.plugin.routewarden.methods=GET,POST,HEAD" # [!code ++]
- "traefik.http.middlewares.tarpit-sink.plugin.routewarden.blockPatterns=(?i)^/(phpmyadmin|pma|wp-login\\\\.php|\\\\.env|\\\\.git.*)$" # [!code ++]
- "traefik.http.middlewares.tarpit-sink.plugin.routewarden.response.mode=tarpit" # [!code ++]
- "traefik.http.middlewares.tarpit-sink.plugin.routewarden.response.statusCode=200" # [!code ++]
- "traefik.http.middlewares.tarpit-sink.plugin.routewarden.response.tarpitDelayMs=1000" # [!code ++]
- "traefik.http.middlewares.tarpit-sink.plugin.routewarden.response.tarpitMaxDurationSeconds=120" # [!code ++]` }),
  caddy: buildSnippet({ lang: 'caddy', code: `# Caddyfile
{
    order route_warden before reverse_proxy # [!code ++]
}

honeypot.example.com {
    route_warden { # [!code ++]
        methods GET POST HEAD # [!code ++]
        block_patterns "(?i)^/(phpmyadmin|pma|wp-login\\.php|\\.env|\\.git.*)$" # [!code ++]
        response { # [!code ++]
            mode tarpit # [!code ++]
            status_code 200 # [!code ++]
            tarpit_delay_ms 1000 # [!code ++]
            tarpit_max_duration_seconds 120 # [!code ++]
        } # [!code ++]
    } # [!code ++]
    reverse_proxy honeypot-sink:80
}` }),
  nginx: buildSnippet({ lang: 'nginx', code: `# nginx.conf: Reverse Slowloris Tarpit
http {
    lua_package_path "/usr/local/openresty/site/lualib/?.lua;/etc/nginx/lua/lib/?.lua;;";

    init_by_lua_block {
        local routewarden = require("resty.routewarden") # [!code ++]

        tarpit_warden = routewarden.new({ # [!code ++]
            methods = { "GET", "POST", "HEAD" }, # [!code ++]
            block_patterns = { # [!code ++]
                "(?i)^/(phpmyadmin|pma|wp-login\\\\.php|\\\\.env|\\\\.git.*)$" # [!code ++]
            }, # [!code ++]
            response = { # [!code ++]
                mode = "tarpit", # [!code ++]
                status_code = 200, # [!code ++]
                tarpit_delay_ms = 1000, # [!code ++]
                tarpit_max_duration_seconds = 120 # [!code ++]
            } # [!code ++]
        }) # [!code ++]
    }

    server {
        listen 80;
        server_name honeypot.example.com;

        access_by_lua_block { tarpit_warden:check() } # [!code ++]

        location / { proxy_pass http://honeypot-sink:80; }
    }
}` }),
  cli: buildSnippet({ lang: 'json', code: `{
  "$schema": "https://raw.githubusercontent.com/routewarden/cli/main/config.schema.json",
  "enabled": true,
  "methods": ["GET", "POST", "HEAD"],
  "blockPatterns": [
    "(?i)^/(phpmyadmin|pma|wp-login\\\\.php|\\\\.env|\\\\.git.*)$"
  ],
  "response": {
    "mode": "tarpit",
    "statusCode": 200,
    "tarpitDelayMs": 1000,
    "tarpitMaxDurationSeconds": 120
  }
}` }),
}

function toSnippets(s) {
  return {
    traefik: [
      { filename: 'traefik.yaml', lang: 'yaml', code: s.traefik_yaml.cleanCode, html: s.traefik_yaml.html, hasDiff: s.traefik_yaml.hasDiff },
      { filename: 'traefik.toml', lang: 'toml', code: s.traefik_toml.cleanCode, html: s.traefik_toml.html, hasDiff: s.traefik_toml.hasDiff },
      { filename: 'docker-compose.yaml', lang: 'docker', code: s.traefik_labels.cleanCode, html: s.traefik_labels.html, hasDiff: s.traefik_labels.hasDiff },
    ],
    caddy: [{ filename: 'Caddyfile', lang: 'caddy', code: s.caddy.cleanCode, html: s.caddy.html, hasDiff: s.caddy.hasDiff }],
    nginx: [{ filename: 'nginx.conf', lang: 'nginx', code: s.nginx.cleanCode, html: s.nginx.html, hasDiff: s.nginx.hasDiff }],
    cli:   [{ filename: 'routewarden.json', lang: 'json', code: s.cli.cleanCode, html: s.cli.html, hasDiff: false }],
  }
}

const silentDropSnippets = computed(() => toSnippets(silentDrop))
const honeypotSnippets = computed(() => toSnippets(honeypot))
const stagingSnippets = computed(() => toSnippets(staging))
const gzipBombSnippets = computed(() => toSnippets(gzipBomb))
const tarpitSnippets = computed(() => toSnippets(tarpit))
</script>

# Case Study: Honeypot Deflection & Tarpit Scanning Sink

This case study demonstrates how to use RouteWarden to deflect reconnaissance bots and malicious vulnerability scanners into honeypots or silent TCP drops.

---

## The Threat Model

Public IPv4 and IPv6 addresses receive continuous automated requests looking for `.env`, `/phpinfo.php`, `/.git`, and common vulnerable endpoints.

While returning an HTTP `403 Forbidden` or `404 Not Found` works, scanners will often continue iterating through hundreds of file paths, consuming reverse proxy bandwidth and generating thousands of log lines.

---

## Strategy A: Silent Connection Drops (`mode: silentDrop` / `silent_drop`)

Rather than allocating memory buffers and sending an HTTP status response, RouteWarden's `silentDrop` mode closes the underlying TCP connection immediately (or returns an empty payload).

<CodeViewer :snippets="silentDropSnippets" />

### Result:
- Port scanners receive a connection reset (`TCP RST` or EOF).
- Automated vulnerability tools flag the endpoint as dead or unresponsive, prompting them to abandon the host.
- Zero server bandwidth spent delivering HTML error bodies.

> [!WARNING]
> **Edge Proxy & CDN Compatibility**:
> When using `silentDrop` behind an edge proxy or CDN (such as Cloudflare, Traefik edge, AWS ALB, or NGINX reverse proxy), abruptly dropping the TCP connection may cause the edge proxy to report an **`HTTP 502 Bad Gateway`** error page to the client rather than hanging or silently terminating the connection. If you want stealth deflection without triggering proxy 502 errors, use `mode: json` or `mode: html` with `statusCode: 404` (see [Strategy C](#strategy-c-staging-preview-environment-cloaking)).

---

## Strategy B: External Honeypot Deflection (`mode: redirect`)

When an attacker accesses any sensitive file pattern, RouteWarden can issue an HTTP `302/307 Redirect` to an external honeypot, a public loopback (`http://127.0.0.1`), or an FBI/IC3 reporting endpoint:

<CodeViewer :snippets="honeypotSnippets" />

---

## Strategy C: Staging & Preview Environment Cloaking

For pull-request preview environments (e.g., `pr-142.staging.example.com`), competitors or automated crawlers shouldn't index unreleased code:

<CodeViewer :snippets="stagingSnippets" />

---

## Strategy D: Active Defense with Gzip Bomb (`mode: gzipBomb` / `gzip_bomb`)

When automated reconnaissance scanners (`nikto`, `gobuster`, `dirsearch`, or credential stuffers) probe for sensitive configuration files (`.env`, `wp-config.php`, `/actuator/env`), returning a 403/404 allows them to swiftly move to the next URL on their wordlist.

With RouteWarden's `gzipBomb` mode (alias: `bomb`), the middleware serves a **valid HTTP 200 response with `Content-Encoding: gzip`** consisting of a stream of compressed zero bytes.

<CodeViewer :snippets="gzipBombSnippets" />

### How the Gzip Bomb Neutralizes Scanners:
1. **Negligible Server Cost**: The server streams compressed zeroes. Transmitting a 10 MB payload over the wire requires only a few kilobytes of bandwidth and tiny CPU cycles.
2. **Client Memory Exhaustion (OOM)**: Most automated crawler libraries (`requests`, `urllib3`, Go/Python scrapers) auto-decompress gzip responses in RAM. When the stream expands to 10+ GB, the attacker's crawler crashes from out-of-memory errors.
3. **Scan Halting**: The attacker's scanning process terminates, preventing further probing across your infrastructure.

::: warning CAUTION: Impact on Legitimate Crawlers & Browsers
Legitimate web browsers and search engine indexers (such as **Googlebot**, **Bingbot**, or **Applebot**) automatically decompress gzip content encoding.

- **Do NOT bind `gzipBomb` as a global entrypoint catch-all** across all application routes.
- **Always keep `enableDefaultAllowPatterns: true`** (or explicitly whitelist `/robots.txt` and `/sitemap.xml`) so search engine indexers are never trapped.
- **Only target explicit, high-confidence exploit paths** that standard human users and valid search spiders will never request (e.g., `^/\.env`, `^/\.git`, `^/wp-login\.php`, `^/phpmyadmin`).
:::

---

## Strategy E: Tarpit Scanning Sink (`mode: tarpit`)

Rather than dropping or bombing the connection, RouteWarden's **Reverse Slowloris Tarpit** stalls scanner concurrency pools by accepting requests to probe endpoints with a `200 OK` header and trickling individual bytes at slow, deliberate intervals.

Because automated vulnerability tools (`sqlmap`, `nikto`, `nuclei`) operate with finite worker thread pools (typically 10–50 concurrent workers), tying up sockets on honeypot routes paralyzes their scanning capacity.

<CodeViewer :snippets="tarpitSnippets" />

### Result:
- The crawler's active thread pool is occupied for up to 120 seconds per probing thread.
- Scanning velocity against your legitimate applications drops to near-zero.
- The connection cleanly closes after `tarpitMaxDurationSeconds` to protect reverse proxy file descriptor limits.
