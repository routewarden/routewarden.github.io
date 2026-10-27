---
title: Case Study – Neutralizing AI Crawlers & Scrapers
description: "Protect web applications, APIs, and content from aggressive AI scrapers, LLM training bots, and data harvesters using RouteWarden active defense."
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

// ─── Strategy 1: Tarpit (Reverse Slowloris) ──────────────────────────────────
const sTarpit = {
  traefik_yaml: buildSnippet({ lang: 'yaml', code: `# dynamic_conf.yml
http:
  middlewares:
    ai-crawler-tarpit: # [!code ++]
      plugin: # [!code ++]
        routewarden: # [!code ++]
          enabled: true # [!code ++]
          methods: # [!code ++]
            - GET # [!code ++]
            - POST # [!code ++]
            - HEAD # [!code ++]
          enableDefaultPatterns: true # [!code ++]
          enableDefaultAllowPatterns: true # Keep /robots.txt & /sitemap.xml accessible # [!code ++]
          checkHeaders: # [!code ++]
            - "User-Agent" # [!code ++]
          blockPatterns: # [!code ++]
            - '(?i)(GPTBot|ChatGPT-User|ClaudeBot|Anthropic-AI|PerplexityBot|Bytespider|CCBot|Diffbot|FacebookBot|Google-Extended|Omgilibot|cohere-ai|Amazonbot|ImagesiftBot)' # [!code ++]
          response: # [!code ++]
            mode: tarpit # Hold crawler worker threads hostage # [!code ++]
            statusCode: 200 # [!code ++]
            tarpitDelayMs: 2000 # Send 1 byte every 2 seconds # [!code ++]
            tarpitMaxDurationSeconds: 120 # Lock crawler socket for 2 minutes # [!code ++]

  routers:
    web-router:
      rule: "Host(\`example.com\`)"
      entryPoints:
        - websecure
      middlewares:
        - ai-crawler-tarpit # [!code ++]
      service: web-service` }),

  traefik_toml: buildSnippet({ lang: 'toml', code: `# dynamic_conf.toml
[http.routers.web-router]
  rule = "Host(\`example.com\`)"
  entryPoints = ["websecure"]
  middlewares = ["ai-crawler-tarpit"]
  service = "web-service"

[http.middlewares.ai-crawler-tarpit.plugin.routewarden] # [!code ++]
  enabled = true # [!code ++]
  methods = ["GET", "POST", "HEAD"] # [!code ++]
  enableDefaultPatterns = true # [!code ++]
  enableDefaultAllowPatterns = true # [!code ++]
  checkHeaders = ["User-Agent"] # [!code ++]
  blockPatterns = ["(?i)(GPTBot|ChatGPT-User|ClaudeBot|Anthropic-AI|PerplexityBot|Bytespider|CCBot|Diffbot|FacebookBot|Google-Extended|Omgilibot|cohere-ai|Amazonbot|ImagesiftBot)"] # [!code ++]

[http.middlewares.ai-crawler-tarpit.plugin.routewarden.response] # [!code ++]
  mode = "tarpit" # [!code ++]
  statusCode = 200 # [!code ++]
  tarpitDelayMs = 2000 # [!code ++]
  tarpitMaxDurationSeconds = 120 # [!code ++]` }),

  traefik_labels: buildSnippet({ lang: 'docker', code: `# Docker Compose Labels
- "traefik.http.routers.web.rule=Host(\`example.com\`)"
- "traefik.http.routers.web.middlewares=ai-crawler-tarpit" # [!code ++]
- "traefik.http.middlewares.ai-crawler-tarpit.plugin.routewarden.enabled=true" # [!code ++]
- "traefik.http.middlewares.ai-crawler-tarpit.plugin.routewarden.methods=GET,POST,HEAD" # [!code ++]
- "traefik.http.middlewares.ai-crawler-tarpit.plugin.routewarden.checkHeaders=User-Agent" # [!code ++]
- "traefik.http.middlewares.ai-crawler-tarpit.plugin.routewarden.blockPatterns=(?i)(GPTBot|ChatGPT-User|ClaudeBot|Anthropic-AI|PerplexityBot|Bytespider|CCBot|Diffbot|FacebookBot|Google-Extended|Omgilibot|cohere-ai|Amazonbot|ImagesiftBot)" # [!code ++]
- "traefik.http.middlewares.ai-crawler-tarpit.plugin.routewarden.response.mode=tarpit" # [!code ++]
- "traefik.http.middlewares.ai-crawler-tarpit.plugin.routewarden.response.statusCode=200" # [!code ++]
- "traefik.http.middlewares.ai-crawler-tarpit.plugin.routewarden.response.tarpitDelayMs=2000" # [!code ++]
- "traefik.http.middlewares.ai-crawler-tarpit.plugin.routewarden.response.tarpitMaxDurationSeconds=120" # [!code ++]` }),

  caddy: buildSnippet({ lang: 'caddy', code: `# Caddyfile: Reverse Slowloris Tarpit
{
    order routewarden before reverse_proxy # [!code ++]
}

example.com {
    routewarden { # [!code ++]
        methods GET POST HEAD # [!code ++]
        enable_default_patterns true # [!code ++]
        enable_default_allow_patterns true # Keep /robots.txt accessible # [!code ++]
        check_headers User-Agent # [!code ++]
        block_patterns "(?i)(GPTBot|ChatGPT-User|ClaudeBot|Anthropic-AI|PerplexityBot|Bytespider|CCBot|Diffbot|FacebookBot|Google-Extended|Omgilibot|cohere-ai|Amazonbot|ImagesiftBot)" # [!code ++]
        response { # [!code ++]
            mode tarpit # [!code ++]
            status_code 200 # [!code ++]
            tarpit_delay_ms 2000 # [!code ++]
            tarpit_max_duration_seconds 120 # [!code ++]
        } # [!code ++]
    } # [!code ++]

    reverse_proxy app:8080
}` }),

  nginx: buildSnippet({ lang: 'nginx', code: `# nginx.conf: Tarpit Crawler Defense
http {
    lua_package_path "/usr/local/openresty/site/lualib/?.lua;/etc/nginx/lua/lib/?.lua;;";

    init_by_lua_block {
        local routewarden = require("resty.routewarden") # [!code ++]

        ai_tarpit = routewarden.new({ # [!code ++]
            methods = { "GET", "POST", "HEAD" }, # [!code ++]
            enable_default_patterns = true, # [!code ++]
            enable_default_allow_patterns = true, # [!code ++]
            check_headers = { "User-Agent" }, # [!code ++]
            block_patterns = { # [!code ++]
                "(?i)(GPTBot|ChatGPT-User|ClaudeBot|Anthropic-AI|PerplexityBot|Bytespider|CCBot|Diffbot|FacebookBot|Google-Extended|Omgilibot|cohere-ai|Amazonbot|ImagesiftBot)" # [!code ++]
            }, # [!code ++]
            response = { # [!code ++]
                mode = "tarpit", # [!code ++]
                status_code = 200, # [!code ++]
                tarpit_delay_ms = 2000, # [!code ++]
                tarpit_max_duration_seconds = 120 # [!code ++]
            } # [!code ++]
        }) # [!code ++]
    }

    server {
        listen 80;
        server_name example.com;

        location / {
            access_by_lua_block {
                ai_tarpit:check() # [!code ++]
            }
            proxy_pass http://app:8080;
        }
    }
}` }),

  tcp: buildSnippet({ lang: 'yaml', code: `# tcp-warden.yaml: L4/L7 HTTP Crawler Filtering
logging:
  level: "info"
  format: "json"
  log_file: "/var/log/routewarden/tcp-warden.jsonl"

services:
  web_http:
    listen: ":80"
    upstream: "127.0.0.1:8080"
    transport: tcp
    protocol: http # [!code ++]
    rate_limit:
      connections_per_minute: 120
      burst: 30
    http: # [!code ++]
      blocked_headers: # [!code ++]
        User-Agent: "(?i)(GPTBot|ChatGPT-User|ClaudeBot|Anthropic-AI|PerplexityBot|Bytespider|CCBot|Diffbot|FacebookBot|Google-Extended|Omgilibot|cohere-ai|Amazonbot|ImagesiftBot)" # [!code ++]` }),

  cli: buildSnippet({ lang: 'json', code: `// routewarden.json
{
  "$schema": "https://raw.githubusercontent.com/routewarden/cli/main/config.schema.json",
  "enabled": true,
  "methods": ["GET", "POST", "HEAD"],
  "enableDefaultPatterns": true,
  "enableDefaultAllowPatterns": true,
  "checkHeaders": ["User-Agent"],
  "blockPatterns": [
    "(?i)(GPTBot|ChatGPT-User|ClaudeBot|Anthropic-AI|PerplexityBot|Bytespider|CCBot|Diffbot|FacebookBot|Google-Extended|Omgilibot|cohere-ai|Amazonbot|ImagesiftBot)"
  ],
  "response": {
    "mode": "tarpit",
    "statusCode": 200,
    "tarpitDelayMs": 2000,
    "tarpitMaxDurationSeconds": 120
  }
}` }),
}

// ─── Strategy 2: Silent Drop (Instant TCP Reset) ──────────────────────────────
const sSilentDrop = {
  traefik_yaml: buildSnippet({ lang: 'yaml', code: `# dynamic_conf.yml: Instant Socket Teardown
http:
  middlewares:
    ai-crawler-drop: # [!code ++]
      plugin: # [!code ++]
        routewarden: # [!code ++]
          enabled: true # [!code ++]
          methods: # [!code ++]
            - GET # [!code ++]
            - POST # [!code ++]
            - HEAD # [!code ++]
          checkHeaders: # [!code ++]
            - "User-Agent" # [!code ++]
          blockPatterns: # [!code ++]
            - '(?i)(GPTBot|ChatGPT-User|ClaudeBot|Anthropic-AI|PerplexityBot|Bytespider|CCBot|Diffbot|FacebookBot|Google-Extended|Omgilibot|cohere-ai|Amazonbot|ImagesiftBot)' # [!code ++]
          response: # [!code ++]
            mode: silentDrop # Reset TCP connection with 0 bytes sent # [!code ++]` }),

  caddy: buildSnippet({ lang: 'caddy', code: `# Caddyfile: Silent TCP Reset
{
    order routewarden before reverse_proxy # [!code ++]
}

example.com {
    routewarden { # [!code ++]
        methods GET POST HEAD # [!code ++]
        check_headers User-Agent # [!code ++]
        block_patterns "(?i)(GPTBot|ChatGPT-User|ClaudeBot|Anthropic-AI|PerplexityBot|Bytespider|CCBot|Diffbot|FacebookBot|Google-Extended|Omgilibot|cohere-ai|Amazonbot|ImagesiftBot)" # [!code ++]
        response { # [!code ++]
            mode silent_drop # [!code ++]
        } # [!code ++]
    } # [!code ++]

    reverse_proxy app:8080
}` }),

  nginx: buildSnippet({ lang: 'nginx', code: `# nginx.conf: Silent Drop (HTTP 444)
http {
    lua_package_path "/usr/local/openresty/site/lualib/?.lua;/etc/nginx/lua/lib/?.lua;;";

    init_by_lua_block {
        local routewarden = require("resty.routewarden") # [!code ++]

        ai_drop = routewarden.new({ # [!code ++]
            methods = { "GET", "POST", "HEAD" }, # [!code ++]
            check_headers = { "User-Agent" }, # [!code ++]
            block_patterns = { # [!code ++]
                "(?i)(GPTBot|ChatGPT-User|ClaudeBot|Anthropic-AI|PerplexityBot|Bytespider|CCBot|Diffbot|FacebookBot|Google-Extended|Omgilibot|cohere-ai|Amazonbot|ImagesiftBot)" # [!code ++]
            }, # [!code ++]
            response = { # [!code ++]
                mode = "silentDrop" # [!code ++]
            } # [!code ++]
        }) # [!code ++]
    }

    server {
        listen 80;
        server_name example.com;

        location / {
            access_by_lua_block {
                ai_drop:check() # [!code ++]
            }
            proxy_pass http://app:8080;
        }
    }
}` }),

  cli: buildSnippet({ lang: 'json', code: `// routewarden.json
{
  "$schema": "https://raw.githubusercontent.com/routewarden/cli/main/config.schema.json",
  "enabled": true,
  "methods": ["GET", "POST", "HEAD"],
  "checkHeaders": ["User-Agent"],
  "blockPatterns": [
    "(?i)(GPTBot|ChatGPT-User|ClaudeBot|Anthropic-AI|PerplexityBot|Bytespider|CCBot|Diffbot|FacebookBot|Google-Extended|Omgilibot|cohere-ai|Amazonbot|ImagesiftBot)"
  ],
  "response": {
    "mode": "silentDrop"
  }
}` }),
}

// ─── Strategy 3: Gzip Bomb (Memory Exhaustion) ────────────────────────────────
const sGzipBomb = {
  traefik_yaml: buildSnippet({ lang: 'yaml', code: `# dynamic_conf.yml: Gzip Decompression Bomb
http:
  middlewares:
    ai-crawler-bomb: # [!code ++]
      plugin: # [!code ++]
        routewarden: # [!code ++]
          enabled: true # [!code ++]
          methods: # [!code ++]
            - GET # [!code ++]
            - HEAD # [!code ++]
          checkHeaders: # [!code ++]
            - "User-Agent" # [!code ++]
          blockPatterns: # [!code ++]
            - '(?i)(GPTBot|ChatGPT-User|ClaudeBot|Anthropic-AI|PerplexityBot|Bytespider|CCBot|Diffbot|FacebookBot|Google-Extended|Omgilibot|cohere-ai|Amazonbot|ImagesiftBot)' # [!code ++]
          response: # [!code ++]
            mode: gzipBomb # Explodes in crawler RAM # [!code ++]
            statusCode: 200 # Enticing 200 OK triggers auto-decompression # [!code ++]
            gzipBombMB: 10 # 10MB expands to ~10GB in memory # [!code ++]` }),

  caddy: buildSnippet({ lang: 'caddy', code: `# Caddyfile: Gzip Bomb Active Defense
{
    order routewarden before reverse_proxy # [!code ++]
}

example.com {
    routewarden { # [!code ++]
        methods GET HEAD # [!code ++]
        check_headers User-Agent # [!code ++]
        block_patterns "(?i)(GPTBot|ChatGPT-User|ClaudeBot|Anthropic-AI|PerplexityBot|Bytespider|CCBot|Diffbot|FacebookBot|Google-Extended|Omgilibot|cohere-ai|Amazonbot|ImagesiftBot)" # [!code ++]
        response { # [!code ++]
            mode gzip_bomb # [!code ++]
            status_code 200 # [!code ++]
            gzip_bomb_mb 10 # [!code ++]
        } # [!code ++]
    } # [!code ++]

    reverse_proxy app:8080
}` }),

  nginx: buildSnippet({ lang: 'nginx', code: `# nginx.conf: Gzip Bomb Active Defense
http {
    lua_package_path "/usr/local/openresty/site/lualib/?.lua;/etc/nginx/lua/lib/?.lua;;";

    init_by_lua_block {
        local routewarden = require("resty.routewarden") # [!code ++]

        ai_bomber = routewarden.new({ # [!code ++]
            methods = { "GET", "HEAD" }, # [!code ++]
            check_headers = { "User-Agent" }, # [!code ++]
            block_patterns = { # [!code ++]
                "(?i)(GPTBot|ChatGPT-User|ClaudeBot|Anthropic-AI|PerplexityBot|Bytespider|CCBot|Diffbot|FacebookBot|Google-Extended|Omgilibot|cohere-ai|Amazonbot|ImagesiftBot)" # [!code ++]
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
        server_name example.com;

        location / {
            access_by_lua_block {
                ai_bomber:check() # [!code ++]
            }
            proxy_pass http://app:8080;
        }
    }
}` }),

  cli: buildSnippet({ lang: 'json', code: `// routewarden.json
{
  "$schema": "https://raw.githubusercontent.com/routewarden/cli/main/config.schema.json",
  "enabled": true,
  "methods": ["GET", "HEAD"],
  "checkHeaders": ["User-Agent"],
  "blockPatterns": [
    "(?i)(GPTBot|ChatGPT-User|ClaudeBot|Anthropic-AI|PerplexityBot|Bytespider|CCBot|Diffbot|FacebookBot|Google-Extended|Omgilibot|cohere-ai|Amazonbot|ImagesiftBot)"
  ],
  "response": {
    "mode": "gzipBomb",
    "statusCode": 200,
    "gzipBombMB": 10
  }
}` }),
}

const tarpitSnippets = computed(() => ({
  traefik: [
    { filename: 'traefik.yaml', lang: 'yaml', code: sTarpit.traefik_yaml.cleanCode, html: sTarpit.traefik_yaml.html, hasDiff: sTarpit.traefik_yaml.hasDiff },
    { filename: 'traefik.toml', lang: 'toml', code: sTarpit.traefik_toml.cleanCode, html: sTarpit.traefik_toml.html, hasDiff: sTarpit.traefik_toml.hasDiff },
    { filename: 'docker-compose.yaml', lang: 'docker', code: sTarpit.traefik_labels.cleanCode, html: sTarpit.traefik_labels.html, hasDiff: sTarpit.traefik_labels.hasDiff },
  ],
  caddy: [
    { filename: 'Caddyfile', lang: 'caddy', code: sTarpit.caddy.cleanCode, html: sTarpit.caddy.html, hasDiff: sTarpit.caddy.hasDiff },
  ],
  nginx: [
    { filename: 'nginx.conf', lang: 'nginx', code: sTarpit.nginx.cleanCode, html: sTarpit.nginx.html, hasDiff: sTarpit.nginx.hasDiff },
  ],
  tcp: [
    { filename: 'tcp-warden.yaml', lang: 'yaml', code: sTarpit.tcp.cleanCode, html: sTarpit.tcp.html, hasDiff: sTarpit.tcp.hasDiff },
  ],
  cli: [
    { filename: 'routewarden.json', lang: 'json', code: sTarpit.cli.cleanCode, html: sTarpit.cli.html, hasDiff: sTarpit.cli.hasDiff },
  ],
}))

const silentDropSnippets = computed(() => ({
  traefik: [
    { filename: 'traefik.yaml', lang: 'yaml', code: sSilentDrop.traefik_yaml.cleanCode, html: sSilentDrop.traefik_yaml.html, hasDiff: sSilentDrop.traefik_yaml.hasDiff },
  ],
  caddy: [
    { filename: 'Caddyfile', lang: 'caddy', code: sSilentDrop.caddy.cleanCode, html: sSilentDrop.caddy.html, hasDiff: sSilentDrop.caddy.hasDiff },
  ],
  nginx: [
    { filename: 'nginx.conf', lang: 'nginx', code: sSilentDrop.nginx.cleanCode, html: sSilentDrop.nginx.html, hasDiff: sSilentDrop.nginx.hasDiff },
  ],
  cli: [
    { filename: 'routewarden.json', lang: 'json', code: sSilentDrop.cli.cleanCode, html: sSilentDrop.cli.html, hasDiff: sSilentDrop.cli.hasDiff },
  ],
}))

const gzipBombSnippets = computed(() => ({
  traefik: [
    { filename: 'traefik.yaml', lang: 'yaml', code: sGzipBomb.traefik_yaml.cleanCode, html: sGzipBomb.traefik_yaml.html, hasDiff: sGzipBomb.traefik_yaml.hasDiff },
  ],
  caddy: [
    { filename: 'Caddyfile', lang: 'caddy', code: sGzipBomb.caddy.cleanCode, html: sGzipBomb.caddy.html, hasDiff: sGzipBomb.caddy.hasDiff },
  ],
  nginx: [
    { filename: 'nginx.conf', lang: 'nginx', code: sGzipBomb.nginx.cleanCode, html: sGzipBomb.nginx.html, hasDiff: sGzipBomb.nginx.hasDiff },
  ],
  cli: [
    { filename: 'routewarden.json', lang: 'json', code: sGzipBomb.cli.cleanCode, html: sGzipBomb.cli.html, hasDiff: sGzipBomb.cli.hasDiff },
  ],
}))

// ─── 4. Defense Flow Architecture Diagram Snippet ───────────────────────────
const defense_mermaid_raw = `flowchart TD
    Client(["<b>Incoming Client Request</b>"]):::clientNode --> FILTER{"<b>RouteWarden Header Filter</b><br/>Inspects User-Agent against AI crawler regex"}:::filterNode

    FILTER -->|Clean User / Legitimate Search Engine| APP["<b>Upstream Web Application</b><br/>• Normal low-latency processing<br/>• Serves 200 OK HTML / JSON API<br/>• Robots.txt &amp; sitemaps allowed"]:::appNode

    FILTER -->|Matched AI Bot User-Agent| STRATEGY{"<b>Active Neutralization Defense</b><br/>Executes configured active defense action"}:::stratNode

    STRATEGY -->|mode: tarpit (Recommended)| TARPIT["<b>Reverse Slowloris Tarpit</b><br/>• Sends 1 byte every 2s for 120s<br/>• Starves scraper concurrency pool<br/>• Crawl speed drops by &gt;99%"]:::tarpitNode

    STRATEGY -->|mode: silentDrop| DROP["<b>Zero-Egress Connection Reset</b><br/>• Instant TCP RST / socket close<br/>• Zero bytes outbound egress<br/>• Breaks headless browser pool"]:::dropNode

    STRATEGY -->|mode: gzipBomb| BOMB["<b>Memory Decompression Trap</b><br/>• Serves 10MB compressed payload<br/>• Expands to 10GB in client RAM<br/>• Triggers OOM crash in scraper"]:::bombNode

    TARPIT -.-> LOG["<b>Structured Security Audit Log</b><br/>Emits JSON event to stdout for CrowdSec / SIEM"]:::logNode
    DROP -.-> LOG
    BOMB -.-> LOG

    classDef clientNode fill:#0284c7,stroke:#0369a1,color:#ffffff,stroke-width:2px;
    classDef filterNode fill:#1e293b,stroke:#00a8cc,color:#f8fafc,stroke-width:2px;
    classDef appNode fill:#0f172a,stroke:#10b981,color:#ffffff,stroke-width:2px;
    classDef stratNode fill:#1e293b,stroke:#f59e0b,color:#f8fafc,stroke-width:2px;
    classDef tarpitNode fill:#1e293b,stroke:#ec4899,color:#f8fafc,stroke-width:2px;
    classDef dropNode fill:#1e293b,stroke:#64748b,color:#f8fafc,stroke-width:2px;
    classDef bombNode fill:#1e293b,stroke:#ef4444,color:#f8fafc,stroke-width:2px;
    classDef logNode fill:#1e293b,stroke:#8b5cf6,color:#f8fafc,stroke-width:2px;`

const defense_graph_svg = `<div class="rw-graph-container">
  <svg viewBox="0 0 960 520" fill="none" xmlns="http://www.w3.org/2000/svg" class="rw-graph-svg">
    <defs>
      <linearGradient id="grad-req" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0284c7" stop-opacity="0.18"/>
        <stop offset="100%" stop-color="#0284c7" stop-opacity="0.04"/>
      </linearGradient>
      <linearGradient id="grad-upstream" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#10b981" stop-opacity="0.18"/>
        <stop offset="100%" stop-color="#10b981" stop-opacity="0.04"/>
      </linearGradient>
      <linearGradient id="grad-strat" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.18"/>
        <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.04"/>
      </linearGradient>
      <linearGradient id="grad-tarpit" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ec4899" stop-opacity="0.18"/>
        <stop offset="100%" stop-color="#ec4899" stop-opacity="0.04"/>
      </linearGradient>
      <linearGradient id="grad-drop" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#64748b" stop-opacity="0.18"/>
        <stop offset="100%" stop-color="#64748b" stop-opacity="0.04"/>
      </linearGradient>
      <linearGradient id="grad-bomb" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ef4444" stop-opacity="0.18"/>
        <stop offset="100%" stop-color="#ef4444" stop-opacity="0.04"/>
      </linearGradient>
      <linearGradient id="grad-log" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.18"/>
        <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0.04"/>
      </linearGradient>
      <marker id="arr-blue" viewBox="-2 -2 16 14" refX="10" refY="5" markerWidth="9" markerHeight="9" orient="auto" overflow="visible">
        <path d="M 0 1 L 11 5 L 0 9 z" fill="#0284c7"/>
      </marker>
      <marker id="arr-green" viewBox="-2 -2 16 14" refX="10" refY="5" markerWidth="9" markerHeight="9" orient="auto" overflow="visible">
        <path d="M 0 1 L 11 5 L 0 9 z" fill="#10b981"/>
      </marker>
      <marker id="arr-amber" viewBox="-2 -2 16 14" refX="10" refY="5" markerWidth="9" markerHeight="9" orient="auto" overflow="visible">
        <path d="M 0 1 L 11 5 L 0 9 z" fill="#f59e0b"/>
      </marker>
      <marker id="arr-pink" viewBox="-2 -2 16 14" refX="10" refY="5" markerWidth="9" markerHeight="9" orient="auto" overflow="visible">
        <path d="M 0 1 L 11 5 L 0 9 z" fill="#ec4899"/>
      </marker>
      <marker id="arr-slate" viewBox="-2 -2 16 14" refX="10" refY="5" markerWidth="9" markerHeight="9" orient="auto" overflow="visible">
        <path d="M 0 1 L 11 5 L 0 9 z" fill="#64748b"/>
      </marker>
      <marker id="arr-red" viewBox="-2 -2 16 14" refX="10" refY="5" markerWidth="9" markerHeight="9" orient="auto" overflow="visible">
        <path d="M 0 1 L 11 5 L 0 9 z" fill="#ef4444"/>
      </marker>
      <marker id="arr-purple" viewBox="-2 -2 16 14" refX="10" refY="5" markerWidth="9" markerHeight="9" orient="auto" overflow="visible">
        <path d="M 0 1 L 11 5 L 0 9 z" fill="#8b5cf6"/>
      </marker>
    </defs>

    <!-- 1. Incoming Request Node -->
    <rect x="70" y="18" width="340" height="42" rx="21" class="rw-g-node" fill="url(#grad-req)"/>
    <circle cx="94" cy="39" r="7" fill="#0284c7"/>
    <text x="110" y="44" class="rw-g-card-title">Incoming Client Request</text>
    <text x="260" y="43" class="rw-g-desc">HTTP GET / POST / HEAD</text>
    <line x1="240" y1="60" x2="240" y2="88" stroke="#0284c7" stroke-width="2" marker-end="url(#arr-blue)"/>

    <!-- 2. RouteWarden Header Inspection Node -->
    <rect x="40" y="88" width="400" height="80" rx="10" class="rw-g-node"/>
    <circle cx="66" cy="114" r="7" fill="#00a8cc"/>
    <text x="84" y="112" class="rw-g-card-title">RouteWarden Header Filter</text>
    <text x="66" y="134" class="rw-g-desc">• checkHeaders: ["User-Agent"]</text>
    <text x="66" y="152" class="rw-g-desc">• blockPatterns: (?i)(GPTBot|ClaudeBot|Bytespider...)</text>

    <!-- Branch: Clean Traffic -> Upstream Application -->
    <path d="M 440 128 L 620 128" stroke="#10b981" stroke-width="2" fill="none" marker-end="url(#arr-green)"/>
    <rect x="460" y="112" width="140" height="20" rx="5" class="rw-g-pill"/>
    <text x="530" y="126" text-anchor="middle" class="rw-g-pill-txt" fill="#10b981">Clean User / Googlebot</text>

    <!-- Upstream Backend Card -->
    <rect x="635" y="72" width="285" height="112" rx="10" class="rw-g-box" fill="url(#grad-upstream)"/>
    <circle cx="660" cy="98" r="7" fill="#10b981"/>
    <text x="678" y="96" class="rw-g-card-title" fill="#10b981">Upstream Application</text>
    <text x="660" y="118" class="rw-g-header" fill="#10b981">FORWARDED &amp; PROTECTED</text>
    <text x="660" y="140" class="rw-g-desc">• Fast 200 OK HTML / API response</text>
    <text x="660" y="158" class="rw-g-desc">• Zero added latency for real users</text>

    <!-- Arrow Down: Matched AI Bot -->
    <line x1="240" y1="168" x2="240" y2="204" stroke="#f59e0b" stroke-width="2" marker-end="url(#arr-amber)"/>
    <rect x="155" y="174" width="170" height="20" rx="5" class="rw-g-pill"/>
    <text x="240" y="188" text-anchor="middle" class="rw-g-pill-txt" fill="#f59e0b">Matched AI Bot Pattern</text>

    <!-- 3. Active Neutralization Strategy Banner -->
    <rect x="40" y="204" width="880" height="52" rx="8" class="rw-g-node" fill="url(#grad-strat)"/>
    <circle cx="66" cy="230" r="7" fill="#f59e0b"/>
    <text x="84" y="226" class="rw-g-card-title">Active Neutralization Defense (Selected Response Mode)</text>
    <text x="84" y="244" class="rw-g-desc">Executes configured countermeasure instead of passive 403 to deplete bot resources</text>

    <!-- Connectors: Strategy Banner -> 3 Modes -->
    <path d="M 175 256 L 175 282" stroke="#ec4899" stroke-width="2" fill="none" marker-end="url(#arr-pink)"/>
    <path d="M 480 256 L 480 282" stroke="#64748b" stroke-width="2" fill="none" marker-end="url(#arr-slate)"/>
    <path d="M 785 256 L 785 282" stroke="#ef4444" stroke-width="2" fill="none" marker-end="url(#arr-red)"/>

    <!-- 4. Mode 1: tarpit -->
    <rect x="40" y="284" width="270" height="140" rx="10" class="rw-g-card" fill="url(#grad-tarpit)"/>
    <circle cx="66" cy="308" r="7" fill="#ec4899"/>
    <text x="82" y="306" class="rw-g-card-title">1. mode: tarpit</text>
    <rect x="195" y="296" width="102" height="18" rx="4" fill="#ec4899" fill-opacity="0.15"/>
    <text x="246" y="309" text-anchor="middle" class="rw-g-pill-txt" fill="#ec4899">RECOMMENDED</text>
    <text x="60" y="330" class="rw-g-desc">• Sends 1 byte every 2s up to 120s</text>
    <text x="60" y="348" class="rw-g-desc">• Stalls crawler worker threads</text>
    <text x="60" y="366" class="rw-g-desc">• Starves fixed concurrency pools</text>
    <text x="60" y="384" class="rw-g-desc">• Crawl throughput drops &gt;99.8%</text>

    <!-- 5. Mode 2: silentDrop -->
    <rect x="345" y="284" width="270" height="140" rx="10" class="rw-g-card" fill="url(#grad-drop)"/>
    <circle cx="371" cy="308" r="7" fill="#64748b"/>
    <text x="387" y="306" class="rw-g-card-title">2. mode: silentDrop</text>
    <rect x="500" y="296" width="102" height="18" rx="4" fill="#64748b" fill-opacity="0.15"/>
    <text x="551" y="309" text-anchor="middle" class="rw-g-pill-txt" fill="#94a3b8">ZERO EGRESS</text>
    <text x="365" y="330" class="rw-g-desc">• Immediate TCP RST / socket close</text>
    <text x="365" y="348" class="rw-g-desc">• 0 bytes outbound bandwidth</text>
    <text x="365" y="366" class="rw-g-desc">• Breaks scraper connection pools</text>
    <text x="365" y="384" class="rw-g-desc">• Deflects massive ByteSpider floods</text>

    <!-- 6. Mode 3: gzipBomb -->
    <rect x="650" y="284" width="270" height="140" rx="10" class="rw-g-card" fill="url(#grad-bomb)"/>
    <circle cx="676" cy="308" r="7" fill="#ef4444"/>
    <text x="692" y="306" class="rw-g-card-title">3. mode: gzipBomb</text>
    <rect x="805" y="296" width="102" height="18" rx="4" fill="#ef4444" fill-opacity="0.15"/>
    <text x="856" y="309" text-anchor="middle" class="rw-g-pill-txt" fill="#ef4444">MEMORY TRAP</text>
    <text x="670" y="330" class="rw-g-desc">• Delivers 10MB compressed payload</text>
    <text x="670" y="348" class="rw-g-desc">• Inflates to 10GB in crawler RAM</text>
    <text x="670" y="366" class="rw-g-desc">• Python/Node scrapers crash with OOM</text>
    <text x="670" y="384" class="rw-g-desc">• Penalizes aggressive re-scrapers</text>

    <!-- Connectors down to Audit Log -->
    <path d="M 175 424 C 175 444, 440 440, 450 455" stroke="#8b5cf6" stroke-width="1.5" stroke-dasharray="3 3" fill="none"/>
    <path d="M 480 424 L 480 455" stroke="#8b5cf6" stroke-width="1.5" stroke-dasharray="3 3" fill="none"/>
    <path d="M 785 424 C 785 444, 520 440, 510 455" stroke="#8b5cf6" stroke-width="1.5" stroke-dasharray="3 3" fill="none"/>

    <!-- 7. Security Audit Log Node -->
    <rect x="180" y="456" width="600" height="46" rx="8" class="rw-g-node" fill="url(#grad-log)"/>
    <circle cx="206" cy="479" r="7" fill="#8b5cf6"/>
    <text x="224" y="476" class="rw-g-card-title">Structured Security Audit Logging (stdout)</text>
    <text x="224" y="493" class="rw-g-desc">Emits real-time JSON security events for CrowdSec auto-ban &amp; Routewarden SOC Dashboard</text>
  </svg>
</div>`

const defenseFlowSnippets = computed(() => ({
  traefik: [
    { filename: 'Defense Pipeline', lang: 'mermaid', code: defense_mermaid_raw, html: defense_graph_svg, hasDiff: false },
  ],
  caddy: [
    { filename: 'Defense Pipeline', lang: 'mermaid', code: defense_mermaid_raw, html: defense_graph_svg, hasDiff: false },
  ],
  nginx: [
    { filename: 'Defense Pipeline', lang: 'mermaid', code: defense_mermaid_raw, html: defense_graph_svg, hasDiff: false },
  ],
  cli: [
    { filename: 'Defense Pipeline', lang: 'mermaid', code: defense_mermaid_raw, html: defense_graph_svg, hasDiff: false },
  ],
}))
</script>

# Case Study: Neutralizing AI Crawlers & Scrapers

This case study demonstrates how to protect web applications, APIs, and content from automated Large Language Model (LLM) training bots, aggressive data harvesters, and rogue crawlers using RouteWarden active defense.

---

## The Threat Model

Commercial artificial intelligence systems and data brokerage firms continuously deploy automated web crawlers to harvest proprietary articles, technical documentation, user-generated content, and API data to train LLMs.

### Why AI Crawlers Are Harmful to Production Infrastructure

1. **Extreme Resource & Concurrency Spikes**: Unlike polite search engines that respect crawl rates, bots like **ByteSpider** and **ClaudeBot** frequently dispatch hundreds of concurrent threads. They scan paginated datasets, search queries, and dynamic filters, causing massive database load and CPU spikes on backend servers.
2. **Cloud Egress Bill Shock**: Scraping entire sites repeatedly consumes hundreds of gigabytes of network egress, directly increasing cloud hosting and CDN bills.
3. **Disregard for `robots.txt`**: While some well-known bots publish adherence to `robots.txt`, many rogue scrapers, third-party proxies, and headless browser fleets completely ignore `User-agent: * Disallow: /` directives.
4. **Unlicensed Content Ingestion**: Data is scraped without attribution, license compliance, or consent.

### Primary AI Crawler User-Agents

| Organization | Bot User-Agent | Primary Activity |
|:---|:---|:---|
| **ByteDance / TikTok** | `Bytespider` | Aggressive LLM and recommendation engine training; notoriously high request volume. |
| **OpenAI** | `GPTBot`, `ChatGPT-User` | GPT model training dataset collection and live browsing requests. |
| **Anthropic** | `ClaudeBot`, `Anthropic-AI` | Claude training data crawling across public web applications. |
| **Perplexity AI** | `PerplexityBot` | Real-time conversational search indexing and summarization. |
| **Common Crawl** | `CCBot` | Open petabyte-scale web data pipeline consumed by dozens of foundation AI models. |
| **Meta** | `FacebookBot` | LLaMA model training and AI assistant grounding. |
| **Google** | `Google-Extended` | Separate crawler token used specifically for Gemini / Vertex AI model training. |
| **Other Aggressive Harvesters** | `Diffbot`, `cohere-ai`, `Omgilibot`, `Amazonbot`, `ImagesiftBot` | Commercial data brokers, knowledge graphs, and enterprise model pre-training. |

---

## The Defense Strategy: Active Neutralization

Standard WAFs typically respond to blocked user-agents with a static **`403 Forbidden`**. However:
- Automated crawlers treat `403` as an instantaneous response and immediately proceed to request the next 10,000 URLs in their queue.
- Some scrapers automatically rotate proxy IP addresses when encountering `403` or `429` status codes.

RouteWarden uses **Active Defense** response modes to neutralize scraping operations:

<CodeViewer :snippets="defenseFlowSnippets" />

1. **`tarpit` (Reverse Slowloris)**:
   - Responds with `200 OK` and slowly sends one byte every 2 seconds for up to 120 seconds.
   - **Attacker Impact**: Scrapers operate with fixed thread pools (typically 20–100 workers). By holding 50 sockets open for two minutes, RouteWarden starves the scraper's thread pool, grinding their crawl to a halt without burdening your backend.
2. **`silentDrop` (Zero-Egress Socket Reset)**:
   - Resets the TCP socket immediately (`TCP RST`/EOF) with zero bytes sent.
   - **Attacker Impact**: Saves maximum outbound bandwidth and breaks headless browser connection pools instantly.
3. **`gzipBomb` (Memory Exhaustion Trap)**:
   - Serves an enticing `200 OK` with a 10MB gzip payload that expands to ~10GB in memory.
   - **Attacker Impact**: Python scrapers (`requests`, Scrapy) and headless Chrome instances that auto-decompress responses crash with Out-Of-Memory (OOM) fatal errors.

---

## Strategy 1: Active Tarpitting (`tarpit`) — Recommended

This configuration intercepts AI crawler User-Agents and traps them in a 120-second reverse Slowloris tarpit, exhausting their concurrency pools while letting normal users and legitimate search engines through.

<CodeViewer :snippets="tarpitSnippets" />

> [!TIP]
> **Preserving Googlebot & Legitimate Search Engine Indexing**:
> RouteWarden's `enableDefaultAllowPatterns: true` is enabled by default. This ensures critical discovery files like `/robots.txt` and `/sitemap.xml` remain accessible so legitimate search engines (Googlebot, Bingbot) continue indexing your site normally.

---

## Strategy 2: Zero-Egress Connection Reset (`silentDrop`)

For servers operating under tight bandwidth quotas or facing high-volume scraper attacks (e.g. distributed ByteSpider clusters), `silentDrop` terminates the TCP connection with zero bytes returned.

<CodeViewer :snippets="silentDropSnippets" />

---

## Strategy 3: Memory Exhaustion Decompression Bomb (`gzipBomb`)

When scrapers aggressively ignore polite rate limits or scan protected endpoints, `gzipBomb` returns an HTTP `200 OK` header containing a compressed recursive zero-byte stream.

<CodeViewer :snippets="gzipBombSnippets" />

> [!WARNING]
> **Use on Verified Scrapers Only**:
> Web vulnerability scanners and automated scrapers decompress responses in memory. Ensure `checkHeaders: ["User-Agent"]` is configured with strict regex so normal human browsers are never served decompression bombs.

---

## Testing & Verification

You can verify your AI crawler defense using `curl` with custom User-Agent strings.

### 1. Test That AI Crawlers Are Tarpitted

```bash
# Test with GPTBot (should stall and receive trickle bytes for 120 seconds)
time curl -i -A "Mozilla/5.0 (compatible; GPTBot/1.2; +https://openai.com/gptbot)" https://example.com/

# Test with Bytespider
time curl -i -A "Mozilla/5.0 (Linux; Android 5.0) AppleWebKit/537.36 (KHTML, like Gecko) Bytespider" https://example.com/

# Test with ClaudeBot
time curl -i -A "ClaudeBot/1.0 (+https://www.anthropic.com/claudebot)" https://example.com/
```

### 2. Verify Legitimate Browsers & Search Engines Pass Normally

```bash
# Standard desktop browser: returns 200 OK immediately
curl -i -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" https://example.com/

# Googlebot search indexer on robots.txt: allowed by default allowlist
curl -i -A "Googlebot/2.1 (+http://www.google.com/bot.html)" https://example.com/robots.txt
```

---

## Live Monitoring & Observability with `rwarden push`

When streaming logs to the central RouteWarden dashboard via `rwarden push`, every blocked or tarpitted crawler is tracked in real time:

```bash
# Monitor container logs for live scraper mitigation
rwarden push --docker
```

On the RouteWarden SOC Dashboard:
- AI scraper mitigations are highlighted with `Verdict: "TARPIT"` or `Verdict: "BLOCK"`.
- Offending IP addresses, Autonomous System Numbers (ASNs), and targeting frequencies are triaged in the live event stream.
- If integrated with **CrowdSec**, IPs triggering repeated scraper mitigations can be automatically banned across your entire edge fleet via firewall bouncers (`ipset`/`nftables`).
