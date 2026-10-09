---
title: CrowdSec Integration & Security Logging
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

// ─── Step 3: Log acquisition sources ─────────────────────────────────────────
// ─── Step 3: Log acquisition sources ─────────────────────────────────────────
const acquis = {
  // Traefik sources
  traefik_docker: buildSnippet({ lang: 'yaml', code: `# /etc/crowdsec/acquis.yaml
# Ingest directly from Traefik container stdout/stderr
source: docker
container_name:
  - traefik
labels:
  type: routewarden` }),
  traefik_file: buildSnippet({ lang: 'yaml', code: `# /etc/crowdsec/acquis.yaml
# Ingest Traefik log file from disk
filenames:
  - /var/log/traefik/traefik.log
labels:
  type: routewarden` }),
  traefik_systemd: buildSnippet({ lang: 'yaml', code: `# /etc/crowdsec/acquis.yaml
# Ingest Traefik running as a systemd unit
source: journalctl
journalctl_filter:
  - _SYSTEMD_UNIT=traefik.service
labels:
  type: routewarden` }),

  // Caddy sources
  caddy_docker: buildSnippet({ lang: 'yaml', code: `# /etc/crowdsec/acquis.yaml
# Ingest directly from Caddy container stdout/stderr
source: docker
container_name:
  - caddy
labels:
  type: routewarden` }),
  caddy_file: buildSnippet({ lang: 'yaml', code: `# /etc/crowdsec/acquis.yaml
# Ingest Caddy log file from disk
filenames:
  - /var/log/caddy/caddy.log
labels:
  type: routewarden` }),
  caddy_systemd: buildSnippet({ lang: 'yaml', code: `# /etc/crowdsec/acquis.yaml
# Ingest Caddy running as a systemd unit
source: journalctl
journalctl_filter:
  - _SYSTEMD_UNIT=caddy.service
labels:
  type: routewarden` }),

  // NGINX sources
  nginx_docker: buildSnippet({ lang: 'yaml', code: `# /etc/crowdsec/acquis.yaml
# Ingest directly from NGINX / OpenResty container stdout/stderr
source: docker
container_name:
  - nginx
labels:
  type: routewarden` }),
  nginx_file: buildSnippet({ lang: 'yaml', code: `# /etc/crowdsec/acquis.yaml
# Ingest NGINX error log from disk
filenames:
  - /var/log/nginx/error.log
labels:
  type: routewarden` }),
  nginx_systemd: buildSnippet({ lang: 'yaml', code: `# /etc/crowdsec/acquis.yaml
# Ingest NGINX running as a systemd unit
source: journalctl
journalctl_filter:
  - _SYSTEMD_UNIT=nginx.service
labels:
  type: routewarden` }),
}

const acquisSnippets = computed(() => ({
  traefik: [
    { filename: 'Docker Logs', lang: 'yaml', code: acquis.traefik_docker.cleanCode, html: acquis.traefik_docker.html, hasDiff: acquis.traefik_docker.hasDiff },
    { filename: 'File (/var/log)', lang: 'yaml', code: acquis.traefik_file.cleanCode, html: acquis.traefik_file.html, hasDiff: acquis.traefik_file.hasDiff },
    { filename: 'Systemd Journal', lang: 'yaml', code: acquis.traefik_systemd.cleanCode, html: acquis.traefik_systemd.html, hasDiff: acquis.traefik_systemd.hasDiff },
  ],
  caddy: [
    { filename: 'Docker Logs', lang: 'yaml', code: acquis.caddy_docker.cleanCode, html: acquis.caddy_docker.html, hasDiff: acquis.caddy_docker.hasDiff },
    { filename: 'File (/var/log)', lang: 'yaml', code: acquis.caddy_file.cleanCode, html: acquis.caddy_file.html, hasDiff: acquis.caddy_file.hasDiff },
    { filename: 'Systemd Journal', lang: 'yaml', code: acquis.caddy_systemd.cleanCode, html: acquis.caddy_systemd.html, hasDiff: acquis.caddy_systemd.hasDiff },
  ],
  nginx: [
    { filename: 'Docker Logs', lang: 'yaml', code: acquis.nginx_docker.cleanCode, html: acquis.nginx_docker.html, hasDiff: acquis.nginx_docker.hasDiff },
    { filename: 'File (/var/log)', lang: 'yaml', code: acquis.nginx_file.cleanCode, html: acquis.nginx_file.html, hasDiff: acquis.nginx_file.hasDiff },
    { filename: 'Systemd Journal', lang: 'yaml', code: acquis.nginx_systemd.cleanCode, html: acquis.nginx_systemd.html, hasDiff: acquis.nginx_systemd.hasDiff },
  ],
}))

// ─── Step 3b: Gateway log file config ────────────────────────────────────────
const logfile_traefik_yaml = buildSnippet({ lang: 'yaml', code: `# Static Traefik Configuration (traefik.yml)
log:
  level: INFO
  filePath: "/var/log/traefik/traefik.log"
  format: common` })

const logfile_traefik_docker = buildSnippet({ lang: 'yaml', code: `services:
  traefik:
    image: traefik:v3.1
    volumes:
      - /var/log/traefik:/var/log/traefik
    command:
      - "--log.filePath=/var/log/traefik/traefik.log"` })

const logfile_caddy = buildSnippet({ lang: 'caddy', code: `{
    order route_warden before reverse_proxy
    log {
        output file /var/log/caddy/caddy.log {
            roll_size 50mb
            roll_keep 5
        }
        format console
    }
}` })

const logfile_caddy_docker = buildSnippet({ lang: 'yaml', code: `services:
  caddy:
    image: caddy:2-alpine
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - /var/log/caddy:/var/log/caddy` })

const logfile_nginx = buildSnippet({ lang: 'nginx', code: `# nginx.conf
http {
    # Direct error_log containing OpenResty ngx.log output to disk
    error_log /var/log/nginx/error.log notice;
}` })

const logfile_nginx_docker = buildSnippet({ lang: 'yaml', code: `services:
  nginx:
    image: openresty/openresty:alpine
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - /var/log/nginx:/var/log/nginx` })

const logfileSnippets = computed(() => ({
  traefik: [
    { filename: 'traefik.yml', lang: 'yaml', code: logfile_traefik_yaml.cleanCode, html: logfile_traefik_yaml.html, hasDiff: logfile_traefik_yaml.hasDiff },
    { filename: 'docker-compose.yaml', lang: 'yaml', code: logfile_traefik_docker.cleanCode, html: logfile_traefik_docker.html, hasDiff: logfile_traefik_docker.hasDiff },
  ],
  caddy: [
    { filename: 'Caddyfile', lang: 'caddy', code: logfile_caddy.cleanCode, html: logfile_caddy.html, hasDiff: logfile_caddy.hasDiff },
    { filename: 'docker-compose.yaml', lang: 'yaml', code: logfile_caddy_docker.cleanCode, html: logfile_caddy_docker.html, hasDiff: logfile_caddy_docker.hasDiff },
  ],
  nginx: [
    { filename: 'nginx.conf', lang: 'nginx', code: logfile_nginx.cleanCode, html: logfile_nginx.html, hasDiff: logfile_nginx.hasDiff },
    { filename: 'docker-compose.yaml', lang: 'yaml', code: logfile_nginx_docker.cleanCode, html: logfile_nginx_docker.html, hasDiff: logfile_nginx_docker.hasDiff },
  ],
}))

// ─── Step 3c: Docker Volume Sharing Snippets ─────────────────────────────────
const volume_traefik = buildSnippet({ lang: 'yaml', code: `volumes:
  - /var/log/traefik:/var/log/traefik:ro` })

const volume_caddy = buildSnippet({ lang: 'yaml', code: `volumes:
  - /var/log/caddy:/var/log/caddy:ro` })

const volume_nginx = buildSnippet({ lang: 'yaml', code: `volumes:
  - /var/log/nginx:/var/log/nginx:ro` })

const volumeSharingSnippets = computed(() => ({
  traefik: [{ filename: 'docker-compose.yaml', lang: 'yaml', code: volume_traefik.cleanCode, html: volume_traefik.html, hasDiff: false }],
  caddy:   [{ filename: 'docker-compose.yaml', lang: 'yaml', code: volume_caddy.cleanCode,   html: volume_caddy.html,   hasDiff: false }],
  nginx:   [{ filename: 'docker-compose.yaml', lang: 'yaml', code: volume_nginx.cleanCode,   html: volume_nginx.html,   hasDiff: false }],
}))

// ─── Step 4: Gateway configuration ───────────────────────────────────────────
const s = {
  json: buildSnippet({ lang: 'json', code: `{
  "$schema": "https://raw.githubusercontent.com/routewarden/cli/main/config.schema.json",
  "enabled": true, // [!code ++]
  "methods": ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"], // [!code ++]
  "securityLog": true, // [!code ++]
  "enableDefaultPatterns": true, // [!code ++]
  "response": { // [!code ++]
    "mode": "fakeSuccess", // [!code ++]
    "statusCode": 200 // [!code ++]
  } // [!code ++]
}` }),
  traefik_yaml: buildSnippet({ lang: 'yaml', code: `http:
  middlewares:
    routewarden-shield: # [!code ++]
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
          # Emits structured JSON events on stdout for CrowdSec
          securityLog: true # [!code ++]
          enableDefaultPatterns: true # [!code ++]
          # Deceive attackers with convincing dummy credentials
          response: # [!code ++]
            mode: fakeSuccess # [!code ++]
            statusCode: 200 # [!code ++]` }),
  traefik_toml: buildSnippet({ lang: 'toml', code: `# dynamic_conf.toml
[http.middlewares.routewarden-shield.plugin.routewarden] # [!code ++]
  enabled = true # [!code ++]
  methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"] # [!code ++]
  securityLog = true # [!code ++]
  enableDefaultPatterns = true # [!code ++]
 # [!code ++]
[http.middlewares.routewarden-shield.plugin.routewarden.response] # [!code ++]
  mode = "fakeSuccess" # [!code ++]
  statusCode = 200 # [!code ++]` }),
  traefik_labels: buildSnippet({ lang: 'yaml', code: `services:
  app:
    image: my-app:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.app.rule=Host(\`example.com\`)"
      - "traefik.http.routers.app.middlewares=routewarden-shield"
      - "traefik.http.middlewares.routewarden-shield.plugin.routewarden.enabled=true" # [!code ++]
      - "traefik.http.middlewares.routewarden-shield.plugin.routewarden.methods=GET,POST,PUT,DELETE,PATCH,HEAD" # [!code ++]
      - "traefik.http.middlewares.routewarden-shield.plugin.routewarden.securityLog=true" # [!code ++]
      - "traefik.http.middlewares.routewarden-shield.plugin.routewarden.response.mode=fakeSuccess" # [!code ++]` }),
  caddy: buildSnippet({ lang: 'caddy', code: `{
    order route_warden before reverse_proxy # [!code ++]
}

example.com {
    route_warden { # [!code ++]
        methods GET POST PUT DELETE PATCH HEAD # [!code ++]
        # Emits structured JSON events on stdout for CrowdSec
        security_log true # [!code ++]
        enable_default_patterns true # [!code ++]
        response { # [!code ++]
            mode fakeSuccess # [!code ++]
            status_code 200 # [!code ++]
        } # [!code ++]
    } # [!code ++]
    reverse_proxy app:8080
}` }),
  nginx: buildSnippet({ lang: 'nginx', code: `# nginx.conf
http {
    lua_package_path "/usr/local/openresty/site/lualib/?.lua;/etc/nginx/lua/lib/?.lua;;";

    init_by_lua_block {
        local routewarden = require("resty.routewarden") # [!code ++]

        warden = routewarden.new({ # [!code ++]
            enabled = true, # [!code ++]
            methods = { "GET", "POST", "PUT", "DELETE", "PATCH", "HEAD" }, # [!code ++]
            -- Emits structured JSON events on stdout for CrowdSec
            security_log = true, # [!code ++]
            enable_default_patterns = true, # [!code ++]
            response = { # [!code ++]
                mode = "fakeSuccess", # [!code ++]
                status_code = 200 # [!code ++]
            } # [!code ++]
        }) # [!code ++]
    }

    server {
        listen 80;
        server_name example.com;

        access_by_lua_block {
            warden:check() # [!code ++]
        }

        location / {
            proxy_pass http://app:8080;
        }
    }
}` }),

  docker_traefik: buildSnippet({ lang: 'yaml', code: `services:
  traefik:
    image: traefik:v3.1
    container_name: traefik
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--experimental.plugins.routewarden.modulename=github.com/routewarden/traefik-warden" # [!code ++]
      - "--experimental.plugins.routewarden.version=v1.4.2" # [!code ++]
    ports:
      - "80:80"
      - "8080:8080"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    restart: unless-stopped

  crowdsec:
    image: crowdsecurity/crowdsec:latest
    container_name: crowdsec
    environment:
      COLLECTIONS: "crowdsecurity/traefik crowdsecurity/http-cve"
    volumes:
      - ./crowdsec/acquis.yaml:/etc/crowdsec/acquis.yaml:ro
      - ./crowdsec/parsers:/etc/crowdsec/parsers/s01-parse:ro
      - ./crowdsec/scenarios:/etc/crowdsec/scenarios:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - crowdsec-db:/var/lib/crowdsec/data/
    restart: unless-stopped

  web:
    image: nginx:alpine
    container_name: web
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.web.rule=PathPrefix(\`/\`)"
      - "traefik.http.routers.web.middlewares=sec-shield" # [!code ++]
      - "traefik.http.middlewares.sec-shield.plugin.routewarden.enabled=true" # [!code ++]
      - "traefik.http.middlewares.sec-shield.plugin.routewarden.securityLog=true" # [!code ++]
      - "traefik.http.middlewares.sec-shield.plugin.routewarden.response.mode=json" # [!code ++]

volumes:
  crowdsec-db:` }),

  docker_caddy: buildSnippet({ lang: 'yaml', code: `services:
  caddy:
    image: caddy:2-alpine
    container_name: caddy
    build: # [!code ++]
      context: . # [!code ++]
      dockerfile_inline: | # [!code ++]
        FROM caddy:2-builder AS builder # [!code ++]
        RUN xcaddy build --with github.com/routewarden/caddy-warden@v1.4.1 # [!code ++]
        FROM caddy:2-alpine # [!code ++]
        COPY --from=builder /usr/bin/caddy /usr/bin/caddy # [!code ++]
    ports:
      - "80:80"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
    restart: unless-stopped

  crowdsec:
    image: crowdsecurity/crowdsec:latest
    container_name: crowdsec
    environment:
      COLLECTIONS: "crowdsecurity/caddy crowdsecurity/http-cve"
    volumes:
      - ./crowdsec/acquis.yaml:/etc/crowdsec/acquis.yaml:ro
      - ./crowdsec/parsers:/etc/crowdsec/parsers/s01-parse:ro
      - ./crowdsec/scenarios:/etc/crowdsec/scenarios:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - crowdsec-db:/var/lib/crowdsec/data/
    restart: unless-stopped

  web:
    image: nginx:alpine
    container_name: web

volumes:
  crowdsec-db:` }),

  docker_nginx: buildSnippet({ lang: 'yaml', code: `services:
  nginx:
    image: openresty/openresty:alpine
    container_name: nginx
    ports:
      - "80:80"
    volumes:
      - ./lib/resty/routewarden:/usr/local/openresty/site/lualib/resty/routewarden:ro # [!code ++]
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    restart: unless-stopped

  crowdsec:
    image: crowdsecurity/crowdsec:latest
    container_name: crowdsec
    environment:
      COLLECTIONS: "crowdsecurity/nginx crowdsecurity/http-cve"
    volumes:
      - ./crowdsec/acquis.yaml:/etc/crowdsec/acquis.yaml:ro
      - ./crowdsec/parsers:/etc/crowdsec/parsers/s01-parse:ro
      - ./crowdsec/scenarios:/etc/crowdsec/scenarios:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - crowdsec-db:/var/lib/crowdsec/data/
    restart: unless-stopped

  web:
    image: nginx:alpine
    container_name: web

volumes:
  crowdsec-db:` }),
}

const gatewaySnippets = computed(() => ({
  traefik: [
    { filename: 'traefik.yaml', lang: 'yaml', code: s.traefik_yaml.cleanCode, html: s.traefik_yaml.html, hasDiff: s.traefik_yaml.hasDiff },
    { filename: 'traefik.toml', lang: 'toml', code: s.traefik_toml.cleanCode, html: s.traefik_toml.html, hasDiff: s.traefik_toml.hasDiff },
    { filename: 'docker-compose.yaml', lang: 'yaml', code: s.traefik_labels.cleanCode, html: s.traefik_labels.html, hasDiff: s.traefik_labels.hasDiff },
  ],
  caddy: [{ filename: 'Caddyfile', lang: 'caddy', code: s.caddy.cleanCode, html: s.caddy.html, hasDiff: s.caddy.hasDiff }],
  nginx: [{ filename: 'nginx.conf', lang: 'nginx', code: s.nginx.cleanCode, html: s.nginx.html, hasDiff: s.nginx.hasDiff }],
  cli:   [{ filename: 'routewarden.json', lang: 'json', code: s.json.cleanCode, html: s.json.html, hasDiff: s.json.hasDiff }],
}))

// ─── Docker Compose Example ───────────────────────────────────────────────────
const dockerSnippets = computed(() => ({
  traefik: [{ filename: 'docker-compose.yaml', lang: 'yaml', code: s.docker_traefik.cleanCode, html: s.docker_traefik.html, hasDiff: s.docker_traefik.hasDiff }],
  caddy:   [{ filename: 'docker-compose.yaml', lang: 'yaml', code: s.docker_caddy.cleanCode,   html: s.docker_caddy.html,   hasDiff: s.docker_caddy.hasDiff }],
  nginx:   [{ filename: 'docker-compose.yaml', lang: 'yaml', code: s.docker_nginx.cleanCode,   html: s.docker_nginx.html,   hasDiff: s.docker_nginx.hasDiff }],
}))

// ─── Step 1 & 2: CrowdSec Parser & Scenario ────────────────────────────────────
const crowdsecParser = buildSnippet({
  lang: 'yaml',
  code: `# /etc/crowdsec/parsers/s01-parse/routewarden-logs.yaml
onsuccess: next_stage
name: routewarden/parser
description: "Parse RouteWarden security block events from Traefik & Caddy"
filter: "evt.Line.Raw contains 'routewarden_block'"
nodes:
  - grok:
      pattern: '.*(?P<json_raw>\\{"type":"routewarden_block".*\\})'
      apply_on: Line.Raw
statics:
  - meta: log_type
    value: routewarden_block
  - meta: source_ip
    expression: 'JsonExtract(evt.Parsed.json_raw, "client_ip")'
  - meta: http_path
    expression: 'JsonExtract(evt.Parsed.json_raw, "path")'
  - meta: http_method
    expression: 'JsonExtract(evt.Parsed.json_raw, "method")'
  - meta: http_user_agent
    expression: 'JsonExtract(evt.Parsed.json_raw, "user_agent")'
  - meta: routewarden_pattern
    expression: 'JsonExtract(evt.Parsed.json_raw, "pattern")'
  - meta: routewarden_action
    expression: 'JsonExtract(evt.Parsed.json_raw, "action")'`,
})

const crowdsecScenario = buildSnippet({
  lang: 'yaml',
  code: `# /etc/crowdsec/scenarios/routewarden-threat.yaml
type: trigger
name: routewarden/sensitive-endpoint-scan
description: "Ban IPs probing sensitive paths intercepted by RouteWarden"
filter: "evt.Meta.log_type == 'routewarden_block'"
blackhole: 1h
labels:
  type: scan
  remediation: true
  service: http
  confidence: 3
  spoofable: 0
  behavior: "http:probing"
scope:
  type: ip
  expression: evt.Meta.source_ip`,
})

const parserSnippets = computed(() => ({
  traefik: [{ filename: 'routewarden-logs.yaml', lang: 'yaml', code: crowdsecParser.cleanCode, html: crowdsecParser.html, hasDiff: false }],
}))

const scenarioSnippets = computed(() => ({
  traefik: [{ filename: 'routewarden-threat.yaml', lang: 'yaml', code: crowdsecScenario.cleanCode, html: crowdsecScenario.html, hasDiff: false }],
}))

// ─── Caddy Directive Ordering Snippet ─────────────────────────────────────────
const caddyOrder = buildSnippet({
  lang: 'caddy',
  code: `# Caddyfile Global Options
{
    order route_warden before reverse_proxy
}`
})

const caddyOrderSnippets = computed(() => ({
  caddy: [
    { filename: 'Caddyfile', lang: 'caddy', code: caddyOrder.cleanCode, html: caddyOrder.html, hasDiff: false },
  ],
}))

// ─── Testing & Verification Commands ───────────────────────────────────────────
const testProbeCmd = buildSnippet({
  lang: 'bash',
  code: `# 1. Simulate vulnerability scanner probing for exposed configuration files
curl -i -H "User-Agent: Nuclei/v3.1.0" http://localhost/.env

# Response (RouteWarden fakeSuccess deception):
# HTTP/1.1 200 OK
# Content-Type: text/plain
# APP_NAME=Laravel
# APP_ENV=production
# DB_PASSWORD=...`,
})

const verifyLogCmd = buildSnippet({
  lang: 'bash',
  code: `# 2. Check gateway container logs for structured audit event
docker logs traefik | grep routewarden_block

# Or for Caddy:
# docker logs caddy | grep routewarden_block

# Or for NGINX:
# docker logs nginx | grep routewarden_block`,
})

const crowdsecCheckCmd = buildSnippet({
  lang: 'bash',
  code: `# 3. Verify CrowdSec detected the scan and banned the attacker IP

# View trigger alerts:
docker exec -t crowdsec cscli alerts list

# View active firewall remediation decisions:
docker exec -t crowdsec cscli decisions list

# The client IP is now banned across all bouncers!`,
})

// ─── JSON Log Snippets ────────────────────────────────────────────────────────
const structuredAuditEvent = buildSnippet({
  lang: 'json',
  code: `{
  "type": "routewarden_block",
  "timestamp": "2026-09-19T15:20:00Z",
  "plugin": "routewarden",
  "client_ip": "198.51.100.42",
  "method": "GET",
  "path": "/.env",
  "request_uri": "/.env",
  "pattern": "(?i)(^|/)(\\.env.*)$",
  "action": "fakeSuccess",
  "reason": "path_blocked",
  "user_agent": "Mozilla/5.0 (compatible; Nuclei/v3.1.0)"
}`,
})

const structuredAuditSnippets = computed(() => ({
  traefik: [{ filename: 'routewarden_block.json', lang: 'json', code: structuredAuditEvent.cleanCode, html: structuredAuditEvent.html, hasDiff: false }],
}))

const verificationSnippets = computed(() => ({
  traefik: [
    { filename: '1-test-probe.sh', lang: 'bash', code: testProbeCmd.cleanCode, html: testProbeCmd.html, hasDiff: false },
    { filename: '2-verify-logs.sh', lang: 'bash', code: verifyLogCmd.cleanCode, html: verifyLogCmd.html, hasDiff: false },
    { filename: '3-crowdsec-ban.sh', lang: 'bash', code: crowdsecCheckCmd.cleanCode, html: crowdsecCheckCmd.html, hasDiff: false },
    { filename: 'routewarden_block.json', lang: 'json', code: structuredAuditEvent.cleanCode, html: structuredAuditEvent.html, hasDiff: false },
  ],
}))
</script>

# CrowdSec Integration & Security Logging

Connect RouteWarden to [CrowdSec](https://crowdsec.net/) to automatically turn blocked reconnaissance scans into immediate firewall bans across your entire infrastructure.

```
Attacker Probes /.env ──► RouteWarden Blocks & Emits JSON ──► CrowdSec Parses & Bans Attacker IP
```

---

## Why Pair RouteWarden with CrowdSec?

CrowdSec typically detects attacks by tailing standard web access logs and waiting for multiple suspicious requests to cross a threshold. While effective for broad traffic, this means vulnerability scanners still get multiple chances to probe your services before getting blocked.

Pairing RouteWarden directly with CrowdSec changes this dynamic:

| Feature | Standard Log Analysis | RouteWarden + CrowdSec |
|---|---|---|
| **First-Request Neutralization** | Requires multiple requests to cross threshold | Intercepted on the very first probe before reaching upstream backends |
| **Ban Speed** | Typically requires 5–10 requests | Immediate ban triggered on sensitive file reconnaissance |
| **Attacker Experience** | Standard 403 Forbidden | Choice of deception: fake `.env` credentials, slow tarpits, or connection drops |
| **Parsing Overhead** | CrowdSec must parse every web request | CrowdSec only processes discrete `routewarden_block` security events |
| **Anti-Evasion Normalization** | Complex URL-encoded paths can slip past naive regex | Evaluates canonical paths cleaned of double encoding, matrix params, and backslashes |

---

## How It Works

1. **Interception**: When a client requests a protected endpoint (such as `/.env`, `/.git/config`, or `/dump.sql`) or sends a blocked query string, RouteWarden intercepts the request according to your configured response mode (`json`, `html`, `fakeSuccess`, `silentDrop`, etc.).
2. **Structured Event Emission**: Along with the client response, RouteWarden emits a single-line JSON audit event to `stdout`:

<CodeViewer :snippets="structuredAuditSnippets" />

3. **CrowdSec Parsing**: The custom RouteWarden parser ingests this structured event and extracts the client IP, probed path, HTTP method, and matched pattern.
4. **Instant Remediation**: The scenario flags the probe as high-confidence reconnaissance and immediately instructs your CrowdSec bouncers (firewall, iptables, Cloudflare) to ban the offending IP.

---

## Setup Walkthrough

### Step 1: Install the RouteWarden CrowdSec Parser

Create `/etc/crowdsec/parsers/s01-parse/routewarden-logs.yaml`:

<CodeViewer :snippets="parserSnippets" />

---

### Step 2: Install the RouteWarden Threat Scenario

Create `/etc/crowdsec/scenarios/routewarden-threat.yaml`:

<CodeViewer :snippets="scenarioSnippets" />

---

### Step 3: Configure CrowdSec Log Acquisition (`acquis.yaml`)

CrowdSec reads logs through an acquisition datasource configured in `/etc/crowdsec/acquis.yaml`. You can ingest RouteWarden logs via **Docker container logs** or directly from **local log files** on disk.

<CodeViewer :snippets="acquisSnippets" />

#### How to direct Gateway output to a log file

If you choose file-based acquisition, configure your gateway to write logs to disk:

<CodeViewer :snippets="logfileSnippets" />

> [!TIP]
> **Docker Volume Sharing for File-Based Acquisition**: If CrowdSec runs inside a Docker container while reading a file from the host, ensure the log directory is mounted in both containers:

<CodeViewer :snippets="volumeSharingSnippets" />

---

### Step 4: Configure the Gateway (Traefik, Caddy & NGINX)

Security logging is **enabled by default** (`securityLog: true` / `security_log true`).

<CodeViewer :snippets="gatewaySnippets" />

#### Caddy Directive Ordering

When using Caddy, you must register RouteWarden before Caddy's built-in `reverse_proxy` directive in the global options block:

<CodeViewer :snippets="caddyOrderSnippets" />

---

## Complete Docker Compose Example

Here is a practical Docker Compose setup running your preferred gateway with RouteWarden, CrowdSec, and a protected web container:

<CodeViewer :snippets="dockerSnippets" />

---

## Testing the Integration

Test end-to-end integration: send a test probe, verify structured security event emission on gateway logs, and verify the CrowdSec automatic ban:

<CodeViewer :snippets="verificationSnippets" />

The client IP is now banned by CrowdSec across all attached bouncers (firewall, iptables, Cloudflare).

---

## SIEM and Log Shipper Ingestion

Because RouteWarden emits single-line JSON with `type: "routewarden_block"`, you can easily pipe these logs into your existing observability stack without custom grok patterns:

- **Elasticsearch / Filebeat**: Ingest with standard JSON processors and enrich `client_ip` with GeoIP data.
- **Grafana Loki / Promtail**: Parse with `{type="routewarden_block"} | json` for instant dashboard metrics and alerts.
- **Datadog / Splunk**: Automatic JSON facet extraction for `pattern`, `action`, `reason`, and `user_agent`.
