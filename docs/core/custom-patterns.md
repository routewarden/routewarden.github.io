---
title: Custom Path Configuration & Regex Guide
---
<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

// ─── 3. Common Recipe Cookbooks ───────────────────────────────────────────────
const r1_code = buildSnippet({
  lang: 'yaml',
  code: `blockPatterns:
  - '(?i)(^|/)(\\.env.*|\\.git.*|\\.aws.*)$'
  - '(?i).*\\.(sql|bak|backup|conf|ini|yaml|yml|log)$'
  - '(?i)(^|/)(next\\.config\\.js|tsconfig\\.json|package\\.json|package-lock\\.json)$'`,
})
const r1Snippets = computed(() => ({
  traefik: [
    { filename: 'SPA / Next.js', lang: 'yaml', code: r1_code.cleanCode, html: r1_code.html, hasDiff: false },
  ],
}))

const r2_code = buildSnippet({
  lang: 'yaml',
  code: `blockPatterns:
  - '(?i)(^|/)(__pycache__|\\.pytest_cache|\\.venv|venv)(/.*)?$'
  - '(?i).*\\.(pyc|pyd|sqlite3?|db|log)$'
  - '(?i)(^|/)(requirements\\.txt|Pipfile.*|poetry\\.lock)$'`,
})
const r2Snippets = computed(() => ({
  traefik: [
    { filename: 'Python / Django / FastAPI', lang: 'yaml', code: r2_code.cleanCode, html: r2_code.html, hasDiff: false },
  ],
}))

const r3_code = buildSnippet({
  lang: 'yaml',
  code: `blockPatterns:
  - '(?i)(^|/)(wp-login\\.php|wp-admin|xmlrpc\\.php|wp-config\\.php)$'
  - '(?i)(^|/)(phpmyadmin|pma|adminer\\.php|info\\.php|phpinfo\\.php)$'
  - '(?i).*\\.(php|phtml|php3|php4|php5|phps|cgi)$'`,
})
const r3Snippets = computed(() => ({
  traefik: [
    { filename: 'PHP / WordPress / CMS', lang: 'yaml', code: r3_code.cleanCode, html: r3_code.html, hasDiff: false },
  ],
}))

const r4_code = buildSnippet({
  lang: 'yaml',
  code: `blockPatterns:
  - '(?i)^/(actuator|metrics|heapdump|trace|env|prometheus)(/.*)?$'
  - '(?i)^/(h2-console|swagger-ui.*|v[23]/api-docs)(/.*)?$'`,
})
const r4Snippets = computed(() => ({
  traefik: [
    { filename: 'Java / Spring Boot', lang: 'yaml', code: r4_code.cleanCode, html: r4_code.html, hasDiff: false },
  ],
}))

const r5_code = buildSnippet({
  lang: 'yaml',
  code: `blockPatterns:
  - '(?i)^/api/(internal|admin|management|debug)(/.*)?$'`,
})
const r5Snippets = computed(() => ({
  traefik: [
    { filename: 'Internal API Isolation', lang: 'yaml', code: r5_code.cleanCode, html: r5_code.html, hasDiff: false },
  ],
}))

// ─── 4. Predefined Sample Application Blueprints ──────────────────────────────

// Blueprint A: WordPress / WooCommerce Store
const bpA_json = buildSnippet({
  lang: 'json',
  code: `{
  "$schema": "https://raw.githubusercontent.com/routewarden/cli/main/config.schema.json",
  "enabled": true,
  "enableDefaultPatterns": true,
  "blockPatterns": [
    "(?i)(^|/)(xmlrpc\\\\.php|wp-config\\\\.php|install\\\\.php|license\\\\.txt|readme\\\\.html)$"
  ],
  "allowPatterns": [
    "(?i)^/wp-content/uploads/.*",
    "(?i)^/robots\\\\.txt$"
  ],
  "allowedIps": [
    "203.0.113.50"
  ],
  "response": {
    "mode": "text",
    "statusCode": 404,
    "body": "404 Not Found"
  }
}`,
})
const bpA_yaml = buildSnippet({
  lang: 'yaml',
  code: `# dynamic_conf.yml
http:
  middlewares:
    wp-warden: # [!code ++]
      plugin: # [!code ++]
        routewarden: # [!code ++]
          enabled: true # [!code ++]
          enableDefaultPatterns: true # [!code ++]
          blockPatterns: # [!code ++]
            - '(?i)(^|/)(xmlrpc\\.php|wp-config\\.php|install\\.php|license\\.txt|readme\\.html)$' # [!code ++]
          allowPatterns: # [!code ++]
            - '(?i)^/wp-content/uploads/.*' # [!code ++]
            - '(?i)^/robots\\.txt$' # [!code ++]
          allowedIps: # [!code ++]
            - "203.0.113.50" # [!code ++]
          response: # [!code ++]
            mode: text # [!code ++]
            statusCode: 404 # [!code ++]
            body: "404 Not Found" # [!code ++]

  routers:
    wp-router:
      rule: "Host(\`shop.example.com\`)"
      entryPoints:
        - web
      middlewares:
        - wp-warden # [!code ++]
      service: wp-service`,
})
const bpA_caddy = buildSnippet({
  lang: 'caddy',
  code: `# Caddyfile
{
    order route_warden before reverse_proxy # [!code ++]
}

shop.example.com {
    route_warden { # [!code ++]
        enable_default_patterns true # [!code ++]
        block_patterns "(?i)(^|/)(xmlrpc\\.php|wp-config\\.php|install\\.php|license\\.txt|readme\\.html)$" # [!code ++]
        allow_patterns "(?i)^/wp-content/uploads/.*" "(?i)^/robots\\.txt$" # [!code ++]
        allowed_ips "203.0.113.50" # [!code ++]
        response { # [!code ++]
            mode text # [!code ++]
            status_code 404 # [!code ++]
            body "404 Not Found" # [!code ++]
        } # [!code ++]
    } # [!code ++]

    reverse_proxy wp-service:80
}`,
})
const bpA_compose = buildSnippet({
  lang: 'docker',
  code: `services:
  webapp:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.wp.rule=Host(\`shop.example.com\`)"
      - "traefik.http.routers.wp.middlewares=wp-warden" # [!code ++]
      - "traefik.http.middlewares.wp-warden.plugin.routewarden.enabled=true" # [!code ++]
      - "traefik.http.middlewares.wp-warden.plugin.routewarden.enableDefaultPatterns=true" # [!code ++]
      - "traefik.http.middlewares.wp-warden.plugin.routewarden.blockPatterns=(?i)(^|/)(xmlrpc\\\\.php|wp-config\\\\.php|install\\\\.php|license\\\\.txt|readme\\\\.html)$" # [!code ++]
      - "traefik.http.middlewares.wp-warden.plugin.routewarden.allowPatterns=(?i)^/wp-content/uploads/.*,(?i)^/robots\\\\.txt$" # [!code ++]
      - "traefik.http.middlewares.wp-warden.plugin.routewarden.allowedIps=203.0.113.50" # [!code ++]
      - "traefik.http.middlewares.wp-warden.plugin.routewarden.response.mode=text" # [!code ++]
      - "traefik.http.middlewares.wp-warden.plugin.routewarden.response.statusCode=404" # [!code ++]
      - "traefik.http.middlewares.wp-warden.plugin.routewarden.response.body=404 Not Found" # [!code ++]`,
})
const bpA_toml = buildSnippet({
  lang: 'toml',
  code: `# dynamic_conf.toml
[http.routers.wp-router]
  rule = "Host(\`shop.example.com\`)"
  entryPoints = ["web"]
  middlewares = ["wp-warden"] # [!code ++]
  service = "wp-service"

[http.middlewares.wp-warden.plugin.routewarden] # [!code ++]
  enabled = true # [!code ++]
  enableDefaultPatterns = true # [!code ++]
  blockPatterns = ["(?i)(^|/)(xmlrpc\\\\.php|wp-config\\\\.php|install\\\\.php|license\\\\.txt|readme\\\\.html)$"] # [!code ++]
  allowPatterns = ["(?i)^/wp-content/uploads/.*", "(?i)^/robots\\\\.txt$"] # [!code ++]
  allowedIps = ["203.0.113.50"] # [!code ++]

[http.middlewares.wp-warden.plugin.routewarden.response] # [!code ++]
  mode = "text" # [!code ++]
  statusCode = 404 # [!code ++]
  body = "404 Not Found" # [!code ++]`,
})
const bpA_nginx = buildSnippet({
  lang: 'nginx',
  code: `http {
    init_by_lua_block { # [!code ++]
        warden = require("resty.routewarden").new({ # [!code ++]
            enabled = true, # [!code ++]
            enable_default_patterns = true, # [!code ++]
            block_patterns = { # [!code ++]
                "(?i)(^|/)(xmlrpc\\.php|wp-config\\.php|install\\.php|license\\.txt|readme\\.html)$" # [!code ++]
            }, # [!code ++]
            allow_patterns = { # [!code ++]
                "(?i)^/wp-content/uploads/.*", # [!code ++]
                "(?i)^/robots\\.txt$" # [!code ++]
            }, # [!code ++]
            allowed_ips = { "203.0.113.50" }, # [!code ++]
            response = { mode = "text", status_code = 404, body = "404 Not Found" } # [!code ++]
        }) # [!code ++]
    } # [!code ++]

    server {
        listen 80;
        server_name shop.example.com;
        access_by_lua_block { warden:check() } # [!code ++]
        location / { proxy_pass http://wordpress:80; }
    }
}`,
})
const bpASnippets = computed(() => ({
  traefik: [
    { filename: 'traefik.yml', lang: 'yaml', code: bpA_yaml.cleanCode, html: bpA_yaml.html, hasDiff: bpA_yaml.hasDiff },
    { filename: 'docker-compose.yml', lang: 'docker', code: bpA_compose.cleanCode, html: bpA_compose.html, hasDiff: bpA_compose.hasDiff },
    { filename: 'traefik.toml', lang: 'toml', code: bpA_toml.cleanCode, html: bpA_toml.html, hasDiff: bpA_toml.hasDiff },
  ],
  caddy: [
    { filename: 'Caddyfile', lang: 'caddy', code: bpA_caddy.cleanCode, html: bpA_caddy.html, hasDiff: bpA_caddy.hasDiff },
  ],
  nginx: [
    { filename: 'nginx.conf', lang: 'nginx', code: bpA_nginx.cleanCode, html: bpA_nginx.html, hasDiff: bpA_nginx.hasDiff },
  ],
  cli: [
    { filename: 'routewarden.json', lang: 'json', code: bpA_json.cleanCode, html: bpA_json.html, hasDiff: false },
  ],
}))

// Blueprint B: Next.js / React Full-Stack App
const bpB_json = buildSnippet({
  lang: 'json',
  code: `{
  "$schema": "https://raw.githubusercontent.com/routewarden/cli/main/config.schema.json",
  "enabled": true,
  "enableDefaultPatterns": true,
  "blockPatterns": [
    "(?i)(^|/)(next\\\\.config\\\\.js|tsconfig\\\\.json|package\\\\.json|package-lock\\\\.json|yarn\\\\.lock)$"
  ],
  "allowPatterns": [
    "(?i)^/_next/static/.*",
    "(?i)^/favicon\\\\.ico$"
  ],
  "response": {
    "mode": "json",
    "statusCode": 403,
    "body": "{\\"error\\":\\"Forbidden\\"}"
  }
}`,
})
const bpB_compose = buildSnippet({
  lang: 'docker',
  code: `services:
  nextjs-app:
    image: my-nextjs-app:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.nextjs.rule=Host(\`app.example.com\`)"
      - "traefik.http.routers.nextjs.middlewares=nextjs-warden" # [!code ++]

      - "traefik.http.middlewares.nextjs-warden.plugin.routewarden.enabled=true" # [!code ++]
      - "traefik.http.middlewares.nextjs-warden.plugin.routewarden.enableDefaultPatterns=true" # [!code ++]
      # Block build configs, package locks, and server logs
      - "traefik.http.middlewares.nextjs-warden.plugin.routewarden.blockPatterns=(?i)(^|/)(next\\\\.config\\\\.js|tsconfig\\\\.json|package\\\\.json|package-lock\\\\.json|yarn\\\\.lock)$" # [!code ++]
      # Allow static chunks and images
      - "traefik.http.middlewares.nextjs-warden.plugin.routewarden.allowPatterns=(?i)^/_next/static/.*,(?i)^/favicon\\\\.ico$" # [!code ++]
      - "traefik.http.middlewares.nextjs-warden.plugin.routewarden.response.mode=json" # [!code ++]
      - "traefik.http.middlewares.nextjs-warden.plugin.routewarden.response.statusCode=403" # [!code ++]
      - "traefik.http.middlewares.nextjs-warden.plugin.routewarden.response.body={\\"error\\":\\"Forbidden\\"}" # [!code ++]`,
})
const bpB_caddy = buildSnippet({
  lang: 'caddy',
  code: `app.example.com {
    route_warden { # [!code ++]
        enable_default_patterns true # [!code ++]
        block_patterns "(?i)(^|/)(next\\.config\\.js|tsconfig\\.json|package\\.json|package-lock\\.json|yarn\\.lock)$" # [!code ++]
        allow_patterns "(?i)^/_next/static/.*" "(?i)^/favicon\\.ico$" # [!code ++]
        response { # [!code ++]
            mode json # [!code ++]
            status_code 403 # [!code ++]
            body "{\\"error\\":\\"Forbidden\\"}" # [!code ++]
        } # [!code ++]
    } # [!code ++]

    reverse_proxy localhost:3000
}`,
})
const bpB_nginx = buildSnippet({
  lang: 'nginx',
  code: `http {
    init_by_lua_block { # [!code ++]
        warden = require("resty.routewarden").new({ # [!code ++]
            enabled = true, # [!code ++]
            enable_default_patterns = true, # [!code ++]
            block_patterns = { # [!code ++]
                "(?i)(^|/)(next\\.config\\.js|tsconfig\\.json|package\\.json|package-lock\\.json|yarn\\.lock)$" # [!code ++]
            }, # [!code ++]
            allow_patterns = { # [!code ++]
                "(?i)^/_next/static/.*", # [!code ++]
                "(?i)^/favicon\\.ico$" # [!code ++]
            }, # [!code ++]
            response = { mode = "json", status_code = 403, body = '{"error":"Forbidden"}' } # [!code ++]
        }) # [!code ++]
    } # [!code ++]

    server {
        listen 80;
        server_name app.example.com;
        access_by_lua_block { warden:check() } # [!code ++]
        location / { proxy_pass http://nextjs:3000; }
    }
}`,
})
const bpBSnippets = computed(() => ({
  traefik: [
    { filename: 'docker-compose.yml', lang: 'docker', code: bpB_compose.cleanCode, html: bpB_compose.html, hasDiff: bpB_compose.hasDiff },
  ],
  caddy: [
    { filename: 'Caddyfile', lang: 'caddy', code: bpB_caddy.cleanCode, html: bpB_caddy.html, hasDiff: bpB_caddy.hasDiff },
  ],
  nginx: [
    { filename: 'nginx.conf', lang: 'nginx', code: bpB_nginx.cleanCode, html: bpB_nginx.html, hasDiff: bpB_nginx.hasDiff },
  ],
  cli: [
    { filename: 'routewarden.json', lang: 'json', code: bpB_json.cleanCode, html: bpB_json.html, hasDiff: false },
  ],
}))

// Blueprint C: Python / Django / FastAPI Backend
const bpC_json = buildSnippet({
  lang: 'json',
  code: `{
  "$schema": "https://raw.githubusercontent.com/routewarden/cli/main/config.schema.json",
  "enabled": true,
  "enableDefaultPatterns": true,
  "blockPatterns": [
    "(?i)(^|/)(__pycache__|\\\\.venv|venv|local_settings\\\\.py|manage\\\\.py)$"
  ],
  "allowPatterns": [
    "(?i)^/static/.*",
    "(?i)^/media/.*"
  ],
  "allowedIps": [
    "10.0.0.0/8"
  ],
  "response": {
    "mode": "json",
    "statusCode": 403
  }
}`,
})
const bpC_compose = buildSnippet({
  lang: 'docker',
  code: `services:
  django-api:
    image: my-django-app:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.django.rule=Host(\`api.example.com\`)"
      - "traefik.http.routers.django.middlewares=django-warden" # [!code ++]

      - "traefik.http.middlewares.django-warden.plugin.routewarden.enabled=true" # [!code ++]
      - "traefik.http.middlewares.django-warden.plugin.routewarden.enableDefaultPatterns=true" # [!code ++]
      # Block Python byte-code, virtualenvs, SQLite dumps, and settings files
      - "traefik.http.middlewares.django-warden.plugin.routewarden.blockPatterns=(?i)(^|/)(__pycache__|\\\\.venv|venv|local_settings\\\\.py|manage\\\\.py)$" # [!code ++]
      # Exempt public static files & media
      - "traefik.http.middlewares.django-warden.plugin.routewarden.allowPatterns=(?i)^/static/.*,(?i)^/media/.*" # [!code ++]
      # Office VPN bypass
      - "traefik.http.middlewares.django-warden.plugin.routewarden.allowedIps=10.0.0.0/8" # [!code ++]
      - "traefik.http.middlewares.django-warden.plugin.routewarden.response.mode=json" # [!code ++]
      - "traefik.http.middlewares.django-warden.plugin.routewarden.response.statusCode=403" # [!code ++]`,
})
const bpC_caddy = buildSnippet({
  lang: 'caddy',
  code: `api.example.com {
    route_warden { # [!code ++]
        enable_default_patterns true # [!code ++]
        block_patterns "(?i)(^|/)(__pycache__|\\.venv|venv|local_settings\\.py|manage\\.py)$" # [!code ++]
        allow_patterns "(?i)^/static/.*" "(?i)^/media/.*" # [!code ++]
        allowed_ips "10.0.0.0/8" # [!code ++]
        response { # [!code ++]
            mode json # [!code ++]
            status_code 403 # [!code ++]
        } # [!code ++]
    } # [!code ++]

    reverse_proxy localhost:8000
}`,
})
const bpC_nginx = buildSnippet({
  lang: 'nginx',
  code: `http {
    init_by_lua_block { # [!code ++]
        warden = require("resty.routewarden").new({ # [!code ++]
            enabled = true, # [!code ++]
            enable_default_patterns = true, # [!code ++]
            block_patterns = { # [!code ++]
                "(?i)(^|/)(__pycache__|\\.venv|venv|local_settings\\.py|manage\\.py)$" # [!code ++]
            }, # [!code ++]
            allow_patterns = { # [!code ++]
                "(?i)^/static/.*", # [!code ++]
                "(?i)^/media/.*" # [!code ++]
            }, # [!code ++]
            allowed_ips = { "10.0.0.0/8" }, # [!code ++]
            response = { mode = "json", status_code = 403 } # [!code ++]
        }) # [!code ++]
    } # [!code ++]

    server {
        listen 80;
        server_name api.example.com;
        access_by_lua_block { warden:check() } # [!code ++]
        location / { proxy_pass http://django:8000; }
    }
}`,
})
const bpCSnippets = computed(() => ({
  traefik: [
    { filename: 'docker-compose.yml', lang: 'docker', code: bpC_compose.cleanCode, html: bpC_compose.html, hasDiff: bpC_compose.hasDiff },
  ],
  caddy: [
    { filename: 'Caddyfile', lang: 'caddy', code: bpC_caddy.cleanCode, html: bpC_caddy.html, hasDiff: bpC_caddy.hasDiff },
  ],
  nginx: [
    { filename: 'nginx.conf', lang: 'nginx', code: bpC_nginx.cleanCode, html: bpC_nginx.html, hasDiff: bpC_nginx.hasDiff },
  ],
  cli: [
    { filename: 'routewarden.json', lang: 'json', code: bpC_json.cleanCode, html: bpC_json.html, hasDiff: false },
  ],
}))

// Blueprint D: Spring Boot / Java Cloud Microservice
const bpD_json = buildSnippet({
  lang: 'json',
  code: `{
  "$schema": "https://raw.githubusercontent.com/routewarden/cli/main/config.schema.json",
  "enabled": true,
  "enableDefaultPatterns": true,
  "blockPatterns": [
    "(?i)^/(actuator|metrics|heapdump|trace|env|h2-console)(/.*)?$"
  ],
  "allowPatterns": [
    "(?i)^/actuator/health$"
  ],
  "response": {
    "mode": "json",
    "statusCode": 403,
    "body": "{\\"error\\":\\"Forbidden\\",\\"scope\\":\\"actuator-protected\\"}"
  }
}`,
})
const bpD_compose = buildSnippet({
  lang: 'docker',
  code: `services:
  spring-service:
    image: my-spring-app:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.spring.rule=Host(\`service.internal.example.com\`)"
      - "traefik.http.routers.spring.middlewares=spring-warden" # [!code ++]

      - "traefik.http.middlewares.spring-warden.plugin.routewarden.enabled=true" # [!code ++]
      - "traefik.http.middlewares.spring-warden.plugin.routewarden.enableDefaultPatterns=true" # [!code ++]
      # Block Spring debug consoles, heapdumps, and environment variables
      - "traefik.http.middlewares.spring-warden.plugin.routewarden.blockPatterns=(?i)^/(actuator|metrics|heapdump|trace|env|h2-console)(/.*)?$" # [!code ++]
      # Exempt only the public liveness health check
      - "traefik.http.middlewares.spring-warden.plugin.routewarden.allowPatterns=(?i)^/actuator/health$" # [!code ++]
      # Response
      - "traefik.http.middlewares.spring-warden.plugin.routewarden.response.mode=json" # [!code ++]
      - "traefik.http.middlewares.spring-warden.plugin.routewarden.response.statusCode=403" # [!code ++]
      - "traefik.http.middlewares.spring-warden.plugin.routewarden.response.body={\\"error\\":\\"Forbidden\\",\\"scope\\":\\"actuator-protected\\"}" # [!code ++]`,
})
const bpD_caddy = buildSnippet({
  lang: 'caddy',
  code: `service.internal.example.com {
    route_warden { # [!code ++]
        enable_default_patterns true # [!code ++]
        block_patterns "(?i)^/(actuator|metrics|heapdump|trace|env|h2-console)(/.*)?$" # [!code ++]
        allow_patterns "(?i)^/actuator/health$" # [!code ++]
        response { # [!code ++]
            mode json # [!code ++]
            status_code 403 # [!code ++]
            body "{\\"error\\":\\"Forbidden\\",\\"scope\\":\\"actuator-protected\\"}" # [!code ++]
        } # [!code ++]
    } # [!code ++]

    reverse_proxy localhost:8080
}`,
})
const bpD_nginx = buildSnippet({
  lang: 'nginx',
  code: `http {
    init_by_lua_block { # [!code ++]
        warden = require("resty.routewarden").new({ # [!code ++]
            enabled = true, # [!code ++]
            enable_default_patterns = true, # [!code ++]
            block_patterns = { # [!code ++]
                "(?i)^/(actuator|metrics|heapdump|trace|env|h2-console)(/.*)?$" # [!code ++]
            }, # [!code ++]
            allow_patterns = { "(?i)^/actuator/health$" }, # [!code ++]
            response = { # [!code ++]
                mode = "json", # [!code ++]
                status_code = 403, # [!code ++]
                body = '{"error":"Forbidden","scope":"actuator-protected"}' # [!code ++]
            } # [!code ++]
        }) # [!code ++]
    } # [!code ++]

    server {
        listen 80;
        server_name service.internal.example.com;
        access_by_lua_block { warden:check() } # [!code ++]
        location / { proxy_pass http://spring:8080; }
    }
}`,
})
const bpDSnippets = computed(() => ({
  traefik: [
    { filename: 'docker-compose.yml', lang: 'docker', code: bpD_compose.cleanCode, html: bpD_compose.html, hasDiff: bpD_compose.hasDiff },
  ],
  caddy: [
    { filename: 'Caddyfile', lang: 'caddy', code: bpD_caddy.cleanCode, html: bpD_caddy.html, hasDiff: bpD_caddy.hasDiff },
  ],
  nginx: [
    { filename: 'nginx.conf', lang: 'nginx', code: bpD_nginx.cleanCode, html: bpD_nginx.html, hasDiff: bpD_nginx.hasDiff },
  ],
  cli: [
    { filename: 'routewarden.json', lang: 'json', code: bpD_json.cleanCode, html: bpD_json.html, hasDiff: false },
  ],
}))

// Blueprint E: PHP / Laravel Application
const bpE_json = buildSnippet({
  lang: 'json',
  code: `{
  "$schema": "https://raw.githubusercontent.com/routewarden/cli/main/config.schema.json",
  "enabled": true,
  "enableDefaultPatterns": true,
  "blockPatterns": [
    "(?i)(^|/)(artisan|composer\\\\.json|composer\\\\.lock|package\\\\.json|\\\\.env.*)$"
  ],
  "allowPatterns": [
    "(?i)^/(css|js|images|storage)/.*"
  ],
  "response": {
    "mode": "text",
    "statusCode": 404,
    "body": "404 page not found"
  }
}`,
})
const bpE_compose = buildSnippet({
  lang: 'docker',
  code: `services:
  laravel-app:
    image: my-laravel-app:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.laravel.rule=Host(\`laravel.example.com\`)"
      - "traefik.http.routers.laravel.middlewares=laravel-warden" # [!code ++]

      - "traefik.http.middlewares.laravel-warden.plugin.routewarden.enabled=true" # [!code ++]
      - "traefik.http.middlewares.laravel-warden.plugin.routewarden.enableDefaultPatterns=true" # [!code ++]
      # Block artisan, composer files, and storage logs
      - "traefik.http.middlewares.laravel-warden.plugin.routewarden.blockPatterns=(?i)(^|/)(artisan|composer\\\\.json|composer\\\\.lock|package\\\\.json|\\\\.env.*)$" # [!code ++]
      # Allow public compiled assets
      - "traefik.http.middlewares.laravel-warden.plugin.routewarden.allowPatterns=(?i)^/(css|js|images|storage)/.*" # [!code ++]
      - "traefik.http.middlewares.laravel-warden.plugin.routewarden.response.mode=text" # [!code ++]
      - "traefik.http.middlewares.laravel-warden.plugin.routewarden.response.statusCode=404" # [!code ++]
      - "traefik.http.middlewares.laravel-warden.plugin.routewarden.response.body=404 page not found" # [!code ++]`,
})
const bpE_caddy = buildSnippet({
  lang: 'caddy',
  code: `laravel.example.com {
    route_warden { # [!code ++]
        enable_default_patterns true # [!code ++]
        block_patterns "(?i)(^|/)(artisan|composer\\.json|composer\\.lock|package\\.json|\\.env.*)$" # [!code ++]
        allow_patterns "(?i)^/(css|js|images|storage)/.*" # [!code ++]
        response { # [!code ++]
            mode text # [!code ++]
            status_code 404 # [!code ++]
            body "404 page not found" # [!code ++]
        } # [!code ++]
    } # [!code ++]

    reverse_proxy localhost:8000
}`,
})
const bpE_nginx = buildSnippet({
  lang: 'nginx',
  code: `http {
    init_by_lua_block { # [!code ++]
        warden = require("resty.routewarden").new({ # [!code ++]
            enabled = true, # [!code ++]
            enable_default_patterns = true, # [!code ++]
            block_patterns = { # [!code ++]
                "(?i)(^|/)(artisan|composer\\.json|composer\\.lock|package\\.json|\\.env.*)$" # [!code ++]
            }, # [!code ++]
            allow_patterns = { "(?i)^/(css|js|images|storage)/.*" }, # [!code ++]
            response = { mode = "text", status_code = 404, body = "404 page not found" } # [!code ++]
        }) # [!code ++]
    } # [!code ++]

    server {
        listen 80;
        server_name laravel.example.com;
        access_by_lua_block { warden:check() } # [!code ++]
        location / { proxy_pass http://laravel:8000; }
    }
}`,
})
const bpESnippets = computed(() => ({
  traefik: [
    { filename: 'docker-compose.yml', lang: 'docker', code: bpE_compose.cleanCode, html: bpE_compose.html, hasDiff: bpE_compose.hasDiff },
  ],
  caddy: [
    { filename: 'Caddyfile', lang: 'caddy', code: bpE_caddy.cleanCode, html: bpE_caddy.html, hasDiff: bpE_caddy.hasDiff },
  ],
  nginx: [
    { filename: 'nginx.conf', lang: 'nginx', code: bpE_nginx.cleanCode, html: bpE_nginx.html, hasDiff: bpE_nginx.hasDiff },
  ],
  cli: [
    { filename: 'routewarden.json', lang: 'json', code: bpE_json.cleanCode, html: bpE_json.html, hasDiff: false },
  ],
}))

// ─── 5. Custom Exceptions (allowPatterns) ─────────────────────────────────────
const allow_yaml = buildSnippet({
  lang: 'yaml',
  code: `blockPatterns:
  - '(?i).*\.ya?ml$'
  - '(?i)^/api/(internal|admin).*'

allowPatterns:
  # Allow public OpenAPI spec despite .yaml block
  - '(?i)^/api/v1/openapi\.ya?ml$'
  # Allow specific public health endpoint
  - '(?i)^/api/internal/health$'`,
})
const allow_toml = buildSnippet({
  lang: 'toml',
  code: `[http.middlewares.my-warden.plugin.routewarden]
  blockPatterns = ["(?i).*\\.ya?ml$", "(?i)^/api/(internal|admin).*"]
  allowPatterns = ["(?i)^/api/v1/openapi\\.ya?ml$", "(?i)^/api/internal/health$"]`,
})
const allow_labels = buildSnippet({
  lang: 'docker',
  code: `- "traefik.http.middlewares.my-warden.plugin.routewarden.blockPatterns=(?i).*\\.ya?ml$,(?i)^/api/(internal|admin).*"
- "traefik.http.middlewares.my-warden.plugin.routewarden.allowPatterns=(?i)^/api/v1/openapi\\.ya?ml$,(?i)^/api/internal/health$"`,
})
const allow_caddy = buildSnippet({
  lang: 'caddy',
  code: `example.com {
    route_warden {
        block_patterns "(?i).*\\.ya?ml$" "(?i)^/api/(internal|admin).*"
        allow_patterns "(?i)^/api/v1/openapi\\.ya?ml$" "(?i)^/api/internal/health$"
    }
    reverse_proxy localhost:8080
}`,
})
const allow_nginx = buildSnippet({
  lang: 'nginx',
  code: `init_by_lua_block {
    warden = require("resty.routewarden").new({
        block_patterns = {
            "(?i).*\\.ya?ml$",
            "(?i)^/api/(internal|admin).*"
        },
        allow_patterns = {
            "(?i)^/api/v1/openapi\\.ya?ml$",
            "(?i)^/api/internal/health$"
        }
    })
}`,
})
const allow_json = buildSnippet({
  lang: 'json',
  code: `{
  "blockPatterns": [
    "(?i).*\\.ya?ml$",
    "(?i)^/api/(internal|admin).*"
  ],
  "allowPatterns": [
    "(?i)^/api/v1/openapi\\.ya?ml$",
    "(?i)^/api/internal/health$"
  ]
}`,
})
const allowSnippets = computed(() => ({
  traefik: [
    { filename: 'traefik.yml', lang: 'yaml', code: allow_yaml.cleanCode, html: allow_yaml.html, hasDiff: false },
    { filename: 'traefik.toml', lang: 'toml', code: allow_toml.cleanCode, html: allow_toml.html, hasDiff: false },
    { filename: 'docker-compose.yaml', lang: 'docker', code: allow_labels.cleanCode, html: allow_labels.html, hasDiff: false },
  ],
  caddy: [
    { filename: 'Caddyfile', lang: 'caddy', code: allow_caddy.cleanCode, html: allow_caddy.html, hasDiff: false },
  ],
  nginx: [
    { filename: 'nginx.conf', lang: 'nginx', code: allow_nginx.cleanCode, html: allow_nginx.html, hasDiff: false },
  ],
  cli: [
    { filename: 'routewarden.json', lang: 'json', code: allow_json.cleanCode, html: allow_json.html, hasDiff: false },
  ],
}))

// ─── 6. Query String Inspection (checkQuery) ──────────────────────────────────
const query_yaml = buildSnippet({
  lang: 'yaml',
  code: `checkQuery: true
blockPatterns:
  - '(?i)(\\.env|phpinfo|backup\\.sql)'`,
})
const query_toml = buildSnippet({
  lang: 'toml',
  code: `[http.middlewares.my-warden.plugin.routewarden]
  checkQuery = true
  blockPatterns = ["(?i)(\\\\.env|phpinfo|backup\\\\.sql)"]`,
})
const query_labels = buildSnippet({
  lang: 'docker',
  code: `- "traefik.http.middlewares.my-warden.plugin.routewarden.checkQuery=true"
- "traefik.http.middlewares.my-warden.plugin.routewarden.blockPatterns=(?i)(\\.env|phpinfo|backup\\.sql)"`,
})
const query_caddy = buildSnippet({
  lang: 'caddy',
  code: `example.com {
    route_warden {
        check_query true
        block_patterns "(?i)(\\.env|phpinfo|backup\\.sql)"
    }
    reverse_proxy localhost:8080
}`,
})
const query_nginx = buildSnippet({
  lang: 'nginx',
  code: `init_by_lua_block {
    warden = require("resty.routewarden").new({
        check_query = true,
        block_patterns = { "(?i)(\\.env|phpinfo|backup\\.sql)" }
    })
}`,
})
const query_json = buildSnippet({
  lang: 'json',
  code: `{
  "checkQuery": true,
  "blockPatterns": [
    "(?i)(\\.env|phpinfo|backup\\.sql)"
  ]
}`,
})
const querySnippets = computed(() => ({
  traefik: [
    { filename: 'traefik.yml', lang: 'yaml', code: query_yaml.cleanCode, html: query_yaml.html, hasDiff: false },
    { filename: 'traefik.toml', lang: 'toml', code: query_toml.cleanCode, html: query_toml.html, hasDiff: false },
    { filename: 'docker-compose.yaml', lang: 'docker', code: query_labels.cleanCode, html: query_labels.html, hasDiff: false },
  ],
  caddy: [
    { filename: 'Caddyfile', lang: 'caddy', code: query_caddy.cleanCode, html: query_caddy.html, hasDiff: false },
  ],
  nginx: [
    { filename: 'nginx.conf', lang: 'nginx', code: query_nginx.cleanCode, html: query_nginx.html, hasDiff: false },
  ],
  cli: [
    { filename: 'routewarden.json', lang: 'json', code: query_json.cleanCode, html: query_json.html, hasDiff: false },
  ],
}))


// ─── 7. Complete Multi-Gateway Configuration Example ──────────────────────────
const multi_json = buildSnippet({
  lang: 'json',
  code: `{
  "$schema": "https://raw.githubusercontent.com/routewarden/cli/main/config.schema.json",
  "enabled": true, // [!code ++]
  "enableDefaultPatterns": true, // [!code ++]
  "blockPatterns": [ // [!code ++]
    "(?i)^/api/(internal|admin)(/.*)?$", // [!code ++]
    "(?i).*\\\\.(sql|dump)$" // [!code ++]
  ], // [!code ++]
  "allowPatterns": [ // [!code ++]
    "(?i)^/api/internal/health$" // [!code ++]
  ], // [!code ++]
  "response": { // [!code ++]
    "mode": "json", // [!code ++]
    "statusCode": 403, // [!code ++]
    "body": "{\\"error\\":\\"Forbidden\\",\\"message\\":\\"Restricted path pattern\\"}" // [!code ++]
  } // [!code ++]
}`,
})
const multi_yaml = buildSnippet({
  lang: 'yaml',
  code: `# dynamic_conf.yml
http:
  middlewares:
    custom-shield: # [!code ++]
      plugin: # [!code ++]
        routewarden: # [!code ++]
          enabled: true # [!code ++]
          enableDefaultPatterns: true # [!code ++]
          blockPatterns: # [!code ++]
            - '(?i)^/api/(internal|admin)(/.*)?$' # [!code ++]
            - '(?i).*\\.(sql|dump)$' # [!code ++]
          allowPatterns: # [!code ++]
            - '(?i)^/api/internal/health$' # [!code ++]
          response: # [!code ++]
            mode: json # [!code ++]
            statusCode: 403 # [!code ++]
            body: '{"error":"Forbidden","message":"Restricted path pattern"}' # [!code ++]

  routers:
    webapp-router:
      rule: "Host(\`app.example.com\`)"
      entryPoints: ["web"]
      middlewares: ["custom-shield"] # [!code ++]
      service: webapp-service

  services:
    webapp-service:
      loadBalancer:
        servers:
          - url: "http://webapp:80"`,
})
const multi_toml = buildSnippet({
  lang: 'toml',
  code: `# dynamic_conf.toml
[http.routers.webapp-router]
  rule = "Host(\`app.example.com\`)"
  entryPoints = ["web"]
  middlewares = ["custom-shield"] # [!code ++]
  service = "webapp-service"

[http.middlewares.custom-shield.plugin.routewarden] # [!code ++]
  enabled = true # [!code ++]
  enableDefaultPatterns = true # [!code ++]
  blockPatterns = ["(?i)^/api/(internal|admin)(/.*)?$", "(?i).*\\\\.(sql|dump)$"] # [!code ++]
  allowPatterns = ["(?i)^/api/internal/health$"] # [!code ++]

[http.middlewares.custom-shield.plugin.routewarden.response] # [!code ++]
  mode = "json" # [!code ++]
  statusCode = 403 # [!code ++]
  body = '{"error":"Forbidden","message":"Restricted path pattern"}' # [!code ++]

[http.services.webapp-service.loadBalancer]
  [[http.services.webapp-service.loadBalancer.servers]]
    url = "http://webapp:80"`,
})
const multi_compose = buildSnippet({
  lang: 'docker',
  code: `services:
  webapp:
    image: nginx:alpine
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.webapp.rule=Host(\`app.example.com\`)"
      - "traefik.http.routers.webapp.middlewares=custom-shield" # [!code ++]

      # RouteWarden Middleware Definition
      - "traefik.http.middlewares.custom-shield.plugin.routewarden.enabled=true" # [!code ++]
      - "traefik.http.middlewares.custom-shield.plugin.routewarden.enableDefaultPatterns=true" # [!code ++]
      # Block custom internal endpoints
      - "traefik.http.middlewares.custom-shield.plugin.routewarden.blockPatterns=(?i)^/api/(internal|admin)(/.*)?$,(?i).*\\.(sql|dump)$" # [!code ++]
      # Exempt public health check
      - "traefik.http.middlewares.custom-shield.plugin.routewarden.allowPatterns=(?i)^/api/internal/health$" # [!code ++]
      # Response
      - "traefik.http.middlewares.custom-shield.plugin.routewarden.response.mode=json" # [!code ++]
      - "traefik.http.middlewares.custom-shield.plugin.routewarden.response.statusCode=403" # [!code ++]
      - "traefik.http.middlewares.custom-shield.plugin.routewarden.response.body={\\"error\\":\\"Forbidden\\",\\"message\\":\\"Restricted path pattern\\"}" # [!code ++]`,
})
const multi_caddy = buildSnippet({
  lang: 'caddy',
  code: `{
    order route_warden before reverse_proxy # [!code ++]
}

app.example.com {
    route_warden { # [!code ++]
        enabled true # [!code ++]
        enable_default_patterns true # [!code ++]
        block_patterns "(?i)^/api/(internal|admin)(/.*)?$" "(?i).*\\.(sql|dump)$" # [!code ++]
        allow_patterns "(?i)^/api/internal/health$" # [!code ++]
        response { # [!code ++]
            mode json # [!code ++]
            status_code 403 # [!code ++]
            body "{\\"error\\":\\"Forbidden\\",\\"message\\":\\"Restricted path pattern\\"}" # [!code ++]
        } # [!code ++]
    } # [!code ++]

    reverse_proxy webapp:80
}`,
})
const multi_nginx = buildSnippet({
  lang: 'nginx',
  code: `http {
    lua_package_path "/usr/local/openresty/site/lualib/?.lua;;";

    init_by_lua_block { # [!code ++]
        warden = require("resty.routewarden").new({ # [!code ++]
            enabled = true, # [!code ++]
            enable_default_patterns = true, # [!code ++]
            block_patterns = { # [!code ++]
                "(?i)^/api/(internal|admin)(/.*)?$", # [!code ++]
                "(?i).*\\.(sql|dump)$" # [!code ++]
            }, # [!code ++]
            allow_patterns = { "(?i)^/api/internal/health$" }, # [!code ++]
            response = { # [!code ++]
                mode = "json", # [!code ++]
                status_code = 403, # [!code ++]
                body = '{"error":"Forbidden","message":"Restricted path pattern"}' # [!code ++]
            } # [!code ++]
        }) # [!code ++]
    } # [!code ++]

    server {
        listen 80;
        server_name app.example.com;

        access_by_lua_block { warden:check() } # [!code ++]

        location / {
            proxy_pass http://webapp:80;
            proxy_set_header Host $host;
        }
    }
}`,
})
const multiSnippets = computed(() => ({
  traefik: [
    { filename: 'traefik.yml', lang: 'yaml', code: multi_yaml.cleanCode, html: multi_yaml.html, hasDiff: multi_yaml.hasDiff },
    { filename: 'traefik.toml', lang: 'toml', code: multi_toml.cleanCode, html: multi_toml.html, hasDiff: multi_toml.hasDiff },
    { filename: 'docker-compose.yaml', lang: 'docker', code: multi_compose.cleanCode, html: multi_compose.html, hasDiff: multi_compose.hasDiff },
  ],
  caddy: [
    { filename: 'Caddyfile', lang: 'caddy', code: multi_caddy.cleanCode, html: multi_caddy.html, hasDiff: multi_caddy.hasDiff },
  ],
  nginx: [
    { filename: 'nginx.conf', lang: 'nginx', code: multi_nginx.cleanCode, html: multi_nginx.html, hasDiff: multi_nginx.hasDiff },
  ],
  cli: [
    { filename: 'routewarden.json', lang: 'json', code: multi_json.cleanCode, html: multi_json.html, hasDiff: false },
  ],
}))
</script>

# Custom Path Configuration & Regex Guide

RouteWarden provides a flexible regular expression matching engine allowing you to define custom blocking rules (`blockPatterns` / `block_patterns`) and safe overrides (`allowPatterns`).

> **Test Your Rules Interactively**: Use the [Pattern & Anti-Evasion Playground](/?playground=open) to test obfuscated URLs, custom regex patterns, and allowlist rules against RouteWarden's live simulation engine.

---

## 1. How Path Matching Works

Before regular expressions are evaluated, RouteWarden runs every request path through its **Anti-Evasion Engine**:
- Decodes layered percent-encoding (`%252e` ➔ `.`)
- Strips semicolon matrix parameters (`/;param=1/admin` ➔ `/admin`)
- Normalizes Windows backslashes (`\admin` ➔ `/admin`)
- Cleans directory traversals (`/static/../admin` ➔ `/admin`)

Regex patterns are evaluated against the clean normalized path (and optionally the query string if `checkQuery: true`).

---

## 2. Built-in Default Block Patterns (`enableDefaultPatterns`)

When `enableDefaultPatterns: true` (Traefik) or `enable_default_patterns true` (Caddy) is configured (which is enabled by default), RouteWarden activates the following compiled regular expressions:

| Target Category | Compiled Regular Expression | Target Examples Intercepted |
|---|---|---|
| **Environment & Config Files** | `(?i)(^|/)(\.env.*\|.*\.(txt\|log\|bak\|backup\|sql\|conf\|config\|ini\|yaml\|yml))$` | `/.env`, `/.env.production`, `/app.config`, `/dump.sql`, `/debug.log`, `/database.sqlite` |
| **Source Control & VCS Meta** | `(?i)(^|/)\.(git\|svn\|hg\|bzr\|cvs)(/.*\|$)` | `/.git/config`, `/.git/HEAD`, `/.svn/entries`, `/.hg/hgrc` |
| **Cloud & Shell Credentials** | `(?i)(^|/)\.(aws\|ssh\|kube\|docker)(/.*\|$)` | `/.aws/credentials`, `/.ssh/id_rsa`, `/.kube/config`, `/.docker/config.json` |
| **Archives & DB Dump Files** | `(?i).*\.(tar\|tar\.gz\|tgz\|zip\|rar\|7z\|gz\|bz2\|iso\|dump\|sqlite\|sqlite3\|db)$` | `/backup.tar.gz`, `/site.zip`, `/users.dump`, `/app.db`, `/database.sqlite3` |
| **Sensitive Admin & Metrics** | `(?i)(^|/)(phpinfo\.php\|info\.php\|server-status\|server-info\|actuator(/.*)?\|metrics\|heapdump\|trace\|env)$` | `/phpinfo.php`, `/server-status`, `/actuator/health`, `/metrics`, `/heapdump` |
| **Package Managers & Locks** | `(?i)(^|/)(composer\.(json\|lock)\|package-lock\.json\|yarn\.lock\|pnpm-lock\.yaml\|Pipfile\|Pipfile\.lock\|requirements\.txt)$` | `/package-lock.json`, `/yarn.lock`, `/composer.json`, `/requirements.txt`, `/Pipfile` |

> [!TIP]
> If your application legitimately serves files ending in extensions matched above (such as `/robots.txt` or `/ads.txt`), RouteWarden's built-in allowlist automatically grants permission before these block patterns are tested.

---

## 3. Defining Custom Block Patterns (`blockPatterns` / `block_patterns`)

You can supply one or more custom regular expressions to block using the canonical `blockPatterns` (Traefik/CLI) or `block_patterns` (Caddy/NGINX) directive.

### Syntax & Flags
RouteWarden uses Go's standard `regexp` syntax (RE2).
- **Case-Insensitive Flag**: Always prefix with `(?i)` unless you strictly require case sensitivity.
- **Root/Segment Anchoring**: Use `(^|/)` or `^/` to ensure you match full path segments rather than accidental substrings.

### Quick Pattern Cheat Sheet

| Defense Goal | Recommended Regex | Example Blocked URLs |
|---|---|---|
| **Environment Files** | `(?i)(^|/)(\.env.*)$` | `/.env`, `/.env.production`, `/.env.local` |
| **Source Control (Git/SVN)** | `(?i)(^|/)\.(git|svn|hg)(/.*\|$)` | `/.git/config`, `/.git/HEAD`, `/.svn/entries` |
| **Cloud & SSH Keys** | `(?i)(^|/)\.(aws|ssh|kube|docker)(/.*\|$)` | `/.aws/credentials`, `/.ssh/id_rsa`, `/.kube/config` |
| **Database Dumps** | `(?i).*\.(sql|dump|sqlite3?|db|rdb)$` | `/backup.sql`, `/data.dump`, `/users.sqlite` |
| **Archives & Backups** | `(?i).*\.(tar|tar\.gz|tgz|zip|rar|7z|bak)$` | `/site.zip`, `/db.backup`, `/code.tar.gz` |
| **Configurations** | `(?i).*\.(conf|config|ini|yaml|yml)$` | `/app.conf`, `/server.ini`, `/config.yaml` |
| **Application Logs** | `(?i).*\.(log|txt)$` *(pair with allowPatterns)* | `/error.log`, `/debug.txt`, `/access.log` |
| **PHP & CGI Exploits** | `(?i).*\.(php[0-9]?|phtml|cgi|asp|aspx|jsp)$` | `/index.php`, `/upload.phtml`, `/test.cgi` |
| **Internal / Admin APIs** | `(?i)^/api/(internal|admin|private)(/.*)?$` | `/api/internal/users`, `/api/admin/delete` |
| **Actuator & Metrics** | `(?i)^/(actuator|metrics|heapdump|env)(/.*)?$` | `/actuator/health`, `/metrics`, `/heapdump` |
| **Debug & Server Status** | `(?i)(^|/)(phpinfo|server-status|server-info)` | `/phpinfo.php`, `/server-status` |
| **Swagger / API Docs** | `(?i)^/(swagger|swagger-ui|api-docs)(/.*)?$` | `/swagger-ui.html`, `/v2/api-docs` |
| **Node / Python Locks** | `(?i)(^|/)(package-lock\.json|yarn\.lock|Pipfile)$` | `/package-lock.json`, `/yarn.lock` |

---

### Common Recipe Cookbooks

#### Recipe 1: Modern SPA / React / Vue / Next.js Shield
Blocks reconnaissance of server-side artifacts while permitting normal frontend routing:

<CodeViewer :snippets="r1Snippets" />

#### Recipe 2: Python / Django / FastAPI Shield
Prevents exposure of virtualenvs, SQLite databases, and test artifacts:

<CodeViewer :snippets="r2Snippets" />

#### Recipe 3: PHP / WordPress / CMS Hardening
Stops brute-forcing and common scanning bots:

<CodeViewer :snippets="r3Snippets" />

#### Recipe 4: Java / Spring Boot Microservice Shield
Protects Spring actuator management ports and memory dumps:

<CodeViewer :snippets="r4Snippets" />

#### Recipe 5: Microservice Internal API Isolation
Restricts internal endpoints from being reached via public ingress:

<CodeViewer :snippets="r5Snippets" />

---

## 4. Predefined Sample Application Blueprints

Below are complete, production-tested RouteWarden configurations designed for specific popular application stacks:

### Blueprint A: WordPress / WooCommerce Store
Stops XML-RPC amplification attacks, wp-config exposure, and brute-force bot scans on wp-login:

<CodeViewer :snippets="bpASnippets" />

### Blueprint B: Next.js / React / SvelteKit Full-Stack App
Protects internal server assets, environment secrets, and build manifests:

<CodeViewer :snippets="bpBSnippets" />

### Blueprint C: Python / Django / FastAPI Backend
Guards virtual environment directories, SQLite database files, and Django management endpoints:

<CodeViewer :snippets="bpCSnippets" />

### Blueprint D: Spring Boot / Java Cloud Microservice
Shields internal Actuator management metrics, trace dumps, and H2 database consoles:

<CodeViewer :snippets="bpDSnippets" />

### Blueprint E: PHP / Laravel Application
Protects `.env`, Artisan CLI files, storage logs, and debug toolbars:

<CodeViewer :snippets="bpESnippets" />

---

## 5. Built-in Default Allow Patterns (`allowPatterns`)

The `allowPatterns` list takes precedence over both built-in default patterns and your custom `blockPatterns`. If a path matches **any** regex in `allowPatterns`, RouteWarden immediately permits the request to pass downstream without blocking or challenging.

### Default Built-in Allow Rules (`enableDefaultAllowPatterns`)
When `enableDefaultAllowPatterns: true` (or `enable_default_allow_patterns true` in Caddy), RouteWarden automatically permits:

| Target Legitimate Resource | Compiled Regular Expression | Purpose |
|---|---|---|
| **Crawler Indexing Directives** | `(?i)^/robots\.txt$` | Allows search engine bots (Googlebot, Bingbot) to fetch crawl policies |
| **Search Engine XML Sitemaps** | `(?i)^/sitemap.*\.xml$` | Allows discovery of public pages and sitemaps (e.g. `/sitemap.xml`, `/sitemap_index.xml`) |
| **Digital Ad Transparency** | `(?i)^/ads\.txt$` | Allows IAB / Google AdSense crawler verification |
| **Security Disclosure Policies** | `(?i)^/security\.txt$` | RFC 9116 security contact information |
| **ACME & Web Standards** | `(?i)^/\.well-known(/.*)?$` | Let's Encrypt / ZeroSSL TLS challenges, OpenID Connect (`/.well-known/openid-configuration`), etc. |

To disable these automatic exemptions entirely, set `enableDefaultAllowPatterns: false` (or `enable_default_allow_patterns false` in Caddy).

### Adding Custom Exceptions
For example, if you block all `*.yaml` files or `/api/*`, but need to allow a public spec file or public health check:

<CodeViewer :snippets="allowSnippets" />

---

## 6. Query String Inspection (`checkQuery`)

By default (`checkQuery: false`), RouteWarden inspects only the URL path. If attackers attempt to smuggle sensitive files via query parameters (e.g. `?file=../../.env` or `?redirect=phpinfo.php`), enable `checkQuery`:

<CodeViewer :snippets="querySnippets" />

---

## 7. Complete Multi-Gateway Configuration Example

<CodeViewer :snippets="multiSnippets" />
