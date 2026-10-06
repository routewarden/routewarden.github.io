---
title: NGINX Warden — High-Speed Lua Security for NGINX & OpenResty
description: In-memory sensitive file protection, bot filtering, and anti-evasion for NGINX and OpenResty.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

// ─── 30-Second Quick Start Snippets ──────────────────────────────────────────
const quick_nginx = buildSnippet({
  lang: 'nginx',
  code: `http {
    lua_package_path "/usr/local/openresty/site/lualib/?.lua;/etc/nginx/lua/lib/?.lua;/etc/nginx/lua/lib/?/init.lua;;";

    init_by_lua_block {
        local routewarden = require("resty.routewarden")

        warden = routewarden.new({
            enabled = true,
            enable_default_patterns = true,
            block_patterns = {
                "(?i)^/admin(/.*)?$",
                "(?i)^/api/internal(/.*)?$"
            },
            allowed_ips = {
                "10.0.0.0/8",
                "192.168.1.100"
            }
        })
    }

    server {
        listen 80;
        server_name example.com;

        access_by_lua_block {
            warden:check()
        }

        location / {
            proxy_pass http://backend_upstream;
        }
    }
}`,
})

const quickStartSnippets = computed(() => ({
  nginx: [
    { filename: 'nginx.conf', lang: 'nginx', code: quick_nginx.cleanCode, html: quick_nginx.html, hasDiff: false },
  ],
}))

// ─── Installation & Setup Snippets ───────────────────────────────────────────
const install_compose = buildSnippet({
  lang: 'yaml',
  code: `services:
  nginx:
    image: openresty/openresty:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./lib/resty/routewarden:/usr/local/openresty/site/lualib/resty/routewarden:ro # [!code ++]
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro`,
})

const install_docker_run = buildSnippet({
  lang: 'bash',
  code: `# Run with local Lua module mounted:
docker run -d -p 80:80 \\
  -v ./lib/resty/routewarden:/usr/local/openresty/site/lualib/resty/routewarden:ro \\ # [!code ++]
  -v ./nginx.conf:/etc/nginx/conf.d/default.conf:ro \\
  openresty/openresty:alpine`,
})

const install_dockerfile = buildSnippet({
  lang: 'dockerfile',
  code: `FROM openresty/openresty:alpine

# Copy RouteWarden into OpenResty Lua search path
COPY lib/resty/routewarden /usr/local/openresty/site/lualib/resty/routewarden # [!code ++]
COPY nginx.conf /etc/nginx/conf.d/default.conf`,
})

const installSnippets = computed(() => ({
  nginx: [
    { filename: 'Docker Compose', lang: 'yaml', code: install_compose.cleanCode, html: install_compose.html, hasDiff: install_compose.hasDiff },
    { filename: 'Docker CLI', lang: 'bash', code: install_docker_run.cleanCode, html: install_docker_run.html, hasDiff: install_docker_run.hasDiff },
    { filename: 'Dockerfile', lang: 'dockerfile', code: install_dockerfile.cleanCode, html: install_dockerfile.html, hasDiff: install_dockerfile.hasDiff },
  ],
}))
</script>

# NGINX Warden

<p class="tagline" style="font-size: 1.25rem; color: var(--vp-c-text-2); margin-bottom: 1.5rem;">
High-speed Lua security module for NGINX & OpenResty to drop scanner bots, path traversal attacks, and sensitive file probes in worker memory.
</p>

**NGINX Warden** (`github.com/routewarden/nginx-warden`) runs directly inside NGINX worker memory using LuaJIT during the `access_by_lua` phase. It screens incoming HTTP requests in sub-milliseconds without adding proxy latency.

---

## What Does NGINX Warden Do?

<div class="attack-grid">
  <div class="attack-card">
    <h4>⚡ In-Memory LuaJIT Speed</h4>
    <p>Inspects incoming URLs directly in NGINX memory before proxying to your backend, adding virtually zero latency.</p>
  </div>
  <div class="attack-card">
    <h4>🛡️ Block Reconnaissance Bots</h4>
    <p>Catches automated vulnerability scans looking for <code>.env</code>, <code>.git</code>, backup archives, SQL dumps, and diagnostic endpoints.</p>
  </div>
  <div class="attack-card">
    <h4>🔍 Anti-Evasion Normalization</h4>
    <p>Stops directory traversal, double URL encoding, matrix parameters, and null-byte bypasses before evaluating regex rules.</p>
  </div>
  <div class="attack-card">
    <h4>🌍 IP & CIDR Whitelisting</h4>
    <p>Easily whitelist internal VPNs, office IPs, or trusted subnets using native <code>X-Forwarded-For</code> and <code>X-Real-IP</code> parsing.</p>
  </div>
</div>

---

## 30-Second Quick Start

Initialize NGINX Warden in `nginx.conf` and protect your location blocks:

<CodeViewer :snippets="quickStartSnippets" />

---

## Installation & Setup

Deploy the NGINX Warden Lua module into OpenResty or NGINX with `lua-nginx-module`:

<CodeViewer :snippets="installSnippets" />

---

## Explore the Documentation

| Guide | Description |
| :--- | :--- |
| 🚀 **[Getting Started](/nginx/getting-started)** | Docker setup, OpenResty installation, and lua-nginx-module configuration. |
| ⚙️ **[Configuration Reference](/nginx/configuration)** | Directives, options, and response configurations for `nginx.conf`. |
| 💡 **[Recipes & Blueprints](/nginx/examples)** | Real-world NGINX configurations for API cloaking, honeypots, and allowlists. |
| 📜 **[Changelog & Releases](/nginx/changelog)** | Complete release history, OpenResty Lua updates, and migration notes. |
