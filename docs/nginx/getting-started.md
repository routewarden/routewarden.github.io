---
title: "NGINX Warden: Getting Started"
description: "Step-by-step guide for setting up Routewarden in NGINX and OpenResty with LuaJIT."
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

// ─── Installation Methods ─────────────────────────────────────────────────────
const inst_dockerfile = buildSnippet({
  lang: 'dockerfile',
  code: `FROM openresty/openresty:alpine

# Copy Routewarden into OpenResty Lua library search path
COPY lib/resty/routewarden /usr/local/openresty/site/lualib/resty/routewarden # [!code ++]

# Copy your NGINX configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf`,
})

const inst_dockerrun = buildSnippet({
  lang: 'bash',
  code: `docker run -d -p 80:80 -p 443:443 --name my-web-proxy my-openresty-app`,
})

const inst_compose = buildSnippet({
  lang: 'yaml',
  code: `services:
  nginx:
    image: openresty/openresty:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./lib/resty/routewarden:/usr/local/openresty/site/lualib/resty/routewarden:ro # [!code ++]
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - backend

  backend:
    image: hashicorp/http-echo
    command: ["-text=Hello from backend"]`,
})

const inst_manual = buildSnippet({
  lang: 'nginx',
  code: `# 1. Clone repository:
# git clone https://github.com/routewarden/nginx-warden.git /etc/nginx/lua/nginx-warden

# 2. In /etc/nginx/nginx.conf inside http {}:
http {
    lua_package_path "/etc/nginx/lua/nginx-warden/lib/?.lua;/etc/nginx/lua/nginx-warden/lib/?/init.lua;;"; # [!code ++]
    # ...
}`,
})

const installSnippets = computed(() => ({
  nginx: [
    { filename: 'Dockerfile', lang: 'dockerfile', code: inst_dockerfile.cleanCode, html: inst_dockerfile.html, hasDiff: inst_dockerfile.hasDiff },
    { filename: 'Docker Run', lang: 'bash', code: inst_dockerrun.cleanCode, html: inst_dockerrun.html, hasDiff: false },
    { filename: 'docker-compose.yml', lang: 'yaml', code: inst_compose.cleanCode, html: inst_compose.html, hasDiff: inst_compose.hasDiff },
    { filename: 'Manual (nginx.conf)', lang: 'nginx', code: inst_manual.cleanCode, html: inst_manual.html, hasDiff: inst_manual.hasDiff },
  ],
}))

// ─── Universal routewarden.json Schema ───────────────────────────────────────
const dyn_json = buildSnippet({
  lang: 'json',
  code: `{
  "$schema": "https://routewarden.github.io/schema.json",
  "enabled": true,
  "enableDefaultPatterns": true,
  "enableDefaultAllowPatterns": true,
  "methods": ["GET", "HEAD"],
  "allowedIps": ["127.0.0.1", "10.0.0.0/8"],
  "response": {
    "mode": "json",
    "statusCode": 403,
    "body": "{\\"error\\":\\"Forbidden\\",\\"message\\":\\"Sensitive route protected by Routewarden\\"}"
  }
}`,
})

// ─── Inline Lua Configuration (nginx.conf) ───────────────────────────────────
const config_nginx = buildSnippet({
  lang: 'nginx',
  code: `http {
    lua_package_path "/usr/local/openresty/site/lualib/?.lua;/etc/nginx/lua/lib/?.lua;;";

    init_by_lua_block { # [!code ++]
        local routewarden = require("resty.routewarden") # [!code ++]
 # [!code ++]
        warden = routewarden.new({ # [!code ++]
            enabled = true, # [!code ++]
            security_log = true, # [!code ++]
            enable_default_patterns = true, # [!code ++]
            methods = { "GET", "HEAD" }, # [!code ++]
            allowed_ips = { # [!code ++]
                "127.0.0.1", # [!code ++]
                "10.0.0.0/8" # [!code ++]
            }, # [!code ++]
            response = { # [!code ++]
                mode = "json", # [!code ++]
                status_code = 403 # [!code ++]
            } # [!code ++]
        }) # [!code ++]
    } # [!code ++]

    server {
        listen 80;
        server_name example.com;

        access_by_lua_block { # [!code ++]
            warden:check() # [!code ++]
        } # [!code ++]

        location / {
            proxy_pass http://backend_upstream;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
    }
}`,
})

const configSnippets = computed(() => ({
  nginx: [
    { filename: 'routewarden.json', lang: dyn_json.lang, code: dyn_json.cleanCode, html: dyn_json.html, hasDiff: false },
    { filename: 'nginx.conf', lang: 'nginx', code: config_nginx.cleanCode, html: config_nginx.html, hasDiff: config_nginx.hasDiff },
  ],
}))

// ─── Direct Generation & CI/CD Pipeline ───────────────────────────────────────
const gen_cli = buildSnippet({
  lang: 'bash',
  code: `# 1. Validate schema compliance, regex patterns, and CIDRs
rwarden validate --config routewarden.json

# 2. Compile directly into OpenResty Lua configuration table
rwarden generate --target nginx --config routewarden.json > /etc/nginx/lua/routewarden_conf.lua`,
})

const gen_docker = buildSnippet({
  lang: 'bash',
  code: `# Validate and generate without local installation
docker run --rm -v $(pwd):/workspace -w /workspace \\
  ghcr.io/routewarden/cli:latest validate --config routewarden.json

docker run --rm -v $(pwd):/workspace -w /workspace \\
  ghcr.io/routewarden/cli:latest generate --target nginx --config routewarden.json > routewarden_conf.lua`,
})

const gen_github = buildSnippet({
  lang: 'yaml',
  code: `# .github/workflows/deploy.yml
name: Deploy NGINX Security Rules
on:
  push:
    paths:
      - 'routewarden.json'

jobs:
  build-nginx-config:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Routewarden CLI
        run: curl -sSfL https://routewarden.github.io/install.sh | sh

      - name: Validate & Generate OpenResty Lua Config
        run: |
          rwarden validate --config routewarden.json
          rwarden generate --target nginx --config routewarden.json > routewarden_conf.lua

      - name: Deploy & Reload NGINX
        run: |
          # Copy to NGINX host and reload
          scp routewarden_conf.lua user@nginx-host:/etc/nginx/lua/routewarden_conf.lua
          ssh user@nginx-host "nginx -s reload"`,
})

const pipelineSnippets = computed(() => ({
  cli: [
    { filename: 'CLI', lang: gen_cli.lang, code: gen_cli.cleanCode, html: gen_cli.html, hasDiff: false },
    { filename: 'Docker', lang: gen_docker.lang, code: gen_docker.cleanCode, html: gen_docker.html, hasDiff: false },
    { filename: 'GitHub Actions', lang: gen_github.lang, code: gen_github.cleanCode, html: gen_github.html, hasDiff: false },
  ],
}))

// ─── Verification Snippets ───────────────────────────────────────────────────
const v_benign = buildSnippet({
  lang: 'bash',
  code: `curl -I http://localhost/index.html
# HTTP/1.1 200 OK`,
})

const v_sensitive = buildSnippet({
  lang: 'bash',
  code: `curl -i http://localhost/.env
# HTTP/1.1 403 Forbidden
# Content-Type: application/json
# {"status":403,"error":"Forbidden","message":"Access denied: sensitive route"}`,
})

const v_evasion = buildSnippet({
  lang: 'bash',
  code: `curl -i "http://localhost/%252e%252e/.env"
# HTTP/1.1 403 Forbidden`,
})

const v_whitelist = buildSnippet({
  lang: 'bash',
  code: `curl -i -H "X-Forwarded-For: 10.0.1.5" http://localhost/.env
# Passes through to upstream (HTTP 200 OK)`,
})

const verificationSnippets = computed(() => ({
  nginx: [
    { filename: 'Benign Traffic', lang: 'bash', code: v_benign.cleanCode, html: v_benign.html, hasDiff: false },
    { filename: 'Sensitive Route (.env)', lang: 'bash', code: v_sensitive.cleanCode, html: v_sensitive.html, hasDiff: false },
    { filename: 'Double URL Evasion', lang: 'bash', code: v_evasion.cleanCode, html: v_evasion.html, hasDiff: false },
    { filename: 'IP Whitelist Pass', lang: 'bash', code: v_whitelist.cleanCode, html: v_whitelist.html, hasDiff: false },
  ],
}))
</script>

# NGINX Warden: Getting Started

**NGINX Warden** (`github.com/routewarden/nginx-warden`) provides zero-dependency Lua middleware for OpenResty and NGINX servers equipped with `lua-nginx-module`. It executes inside worker processes during the `access_by_lua` phase to filter malicious requests before reverse-proxying.

---

## Prerequisites

- **OpenResty** (v1.19+ recommended) OR
- **Standard NGINX** compiled with:
  - `lua-nginx-module` (v0.10.15+)
  - `ngx_devel_kit` (NDK)
  - LuaJIT 2.1

---

## Installation Methods

Deploy Routewarden via Dockerfile, container run, Docker Compose, or manual package integration:

<CodeViewer :snippets="installSnippets" />

---

## Configuration

Routewarden can be configured directly in OpenResty's `init_by_lua_block` or defined via **`routewarden.json`** as your universal security policy:

<CodeViewer :snippets="configSnippets" />

### Using `routewarden.json` Directly via Generate Pipeline

If you maintain `routewarden.json` as your single source of truth across Git repositories or multi-gateway environments, use the [Routewarden CLI (`rwarden`)](/cli/) to validate rules offline and compile directly into OpenResty Lua configuration tables during your deployment pipeline:

<CodeViewer :snippets="pipelineSnippets" />

---

## Verification

Test edge security enforcement against benign requests, sensitive file probes, double URL-encoded evasion attempts, and trusted IP exemptions:

<CodeViewer :snippets="verificationSnippets" />

---

## Next Steps

- Use the [Routewarden CLI (`rwarden`)](/cli/) to validate schemas and test paths offline.
- Review [NGINX Configuration Reference](/nginx/configuration) for all directives and options.
- Read [Production Recipes & Blueprints](/nginx/examples) for Kubernetes Ingress and Docker configurations.
