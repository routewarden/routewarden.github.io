---
title: Caddy Warden — Native Caddy v2 Security Module
description: Instant sensitive file protection, bot blocking, and anti-evasion for Caddy v2.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

// ─── 30-Second Quick Start Snippets ──────────────────────────────────────────
const quick_caddyfile = buildSnippet({
  lang: 'caddy',
  code: `{
    order routewarden before reverse_proxy # [!code ++]
}

example.com {
    routewarden { # [!code ++]
        enable_default_patterns true # [!code ++]
    } # [!code ++]

    reverse_proxy localhost:8080
}`,
})

const quick_json = buildSnippet({
  lang: 'json',
  code: `{
  "handler": "routewarden", // [!code ++]
  "enabled": true, // [!code ++]
  "enable_default_patterns": true // [!code ++]
}`,
})

const quickStartSnippets = computed(() => ({
  caddy: [
    { filename: 'Caddyfile', lang: 'caddy', code: quick_caddyfile.cleanCode, html: quick_caddyfile.html, hasDiff: quick_caddyfile.hasDiff },
    { filename: 'Caddy (JSON API)', lang: 'json', code: quick_json.cleanCode, html: quick_json.html, hasDiff: quick_json.hasDiff },
  ],
}))

// ─── Installation & Setup Snippets ───────────────────────────────────────────
const install_compose = buildSnippet({
  lang: 'yaml',
  code: `# docker-compose.yml
services:
  caddy:
    build: # [!code ++]
      context: . # [!code ++]
      dockerfile_inline: | # [!code ++]
        FROM caddy:2-builder AS builder # [!code ++]
        RUN xcaddy build --with github.com/routewarden/caddy-warden@{{caddy_version}} # [!code ++]
        FROM caddy:2-alpine # [!code ++]
        COPY --from=builder /usr/bin/caddy /usr/bin/caddy # [!code ++]
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config

volumes:
  caddy_data:
  caddy_config:`,
})

const install_xcaddy = buildSnippet({
  lang: 'bash',
  code: `# Build custom Caddy binary with caddy-warden:
xcaddy build --with github.com/routewarden/caddy-warden@{{caddy_version}}`,
})

const install_dockerfile = buildSnippet({
  lang: 'dockerfile',
  code: `FROM caddy:2-builder AS builder
RUN xcaddy build --with github.com/routewarden/caddy-warden@{{caddy_version}} # [!code ++]

FROM caddy:2-alpine
COPY --from=builder /usr/bin/caddy /usr/bin/caddy # [!code ++]`,
})

const installSnippets = computed(() => ({
  caddy: [
    { filename: 'Docker Compose (Inline)', lang: 'yaml', code: install_compose.cleanCode, html: install_compose.html, hasDiff: install_compose.hasDiff },
    { filename: 'xcaddy CLI', lang: 'bash', code: install_xcaddy.cleanCode, html: install_xcaddy.html, hasDiff: install_xcaddy.hasDiff },
    { filename: 'Dockerfile', lang: 'dockerfile', code: install_dockerfile.cleanCode, html: install_dockerfile.html, hasDiff: install_dockerfile.hasDiff },
  ],
}))
</script>

# Caddy Warden

<p class="tagline" style="font-size: 1.25rem; color: var(--vp-c-text-2); margin-bottom: 1.5rem;">
Native security middleware for Caddy v2 to protect sensitive files, block reconnaissance bots, and stop path evasion tricks.
</p>

**Caddy Warden** (`github.com/routewarden/caddy-warden`) is an official Caddy v2 HTTP module. It plugs directly into your `Caddyfile` or Caddy's dynamic JSON API, blocking scanner probes before they touch your upstream web apps.

---

## What Does Caddy Warden Do?

<div class="attack-grid">
  <div class="attack-card">
    <h4>🛡️ Instant Sensitive File Shield</h4>
    <p>Automatically blocks scans targeting <code>.env</code>, <code>.git</code>, AWS credentials, database dumps, and server status endpoints with zero config.</p>
  </div>
  <div class="attack-card">
    <h4>🔍 Automatic Anti-Evasion</h4>
    <p>Cleans up sneaky URLs before evaluating rules—handling double URL encoding, semicolon parameters, backslashes, and null bytes.</p>
  </div>
  <div class="attack-card">
    <h4>📝 Simple Caddyfile Directive</h4>
    <p>Configure everything in 3 lines right inside your existing <code>Caddyfile</code> or dynamically via Caddy's REST API.</p>
  </div>
  <div class="attack-card">
    <h4>💣 Deception & Custom Responses</h4>
    <p>Reply to attackers with custom JSON, 404 deceptions, silent TCP drops, Turnstile captcha challenges, or bot-crashing gzip bombs.</p>
  </div>
</div>

---

## 30-Second Quick Start

Add Caddy Warden directives to your Caddyfile or JSON API:

<CodeViewer :snippets="quickStartSnippets" />

---

## Installation & Build

Build a custom Caddy binary with `caddy-warden` or run via Docker:

<CodeViewer :snippets="installSnippets" />

---

## Explore the Documentation

| Guide | Description |
| :--- | :--- |
| 🚀 **[Getting Started](/caddy/getting-started)** | Build Caddy with `xcaddy` or run with Docker in 2 minutes. |
| ⚙️ **[Caddyfile Reference](/caddy/caddyfile)** | Directive ordering, syntax schema, and configuration options. |
| 📡 **[JSON API Reference](/caddy/json-api)** | Native Caddy REST API schema and zero-downtime reconfiguration. |
| 💡 **[Caddy Recipes & Examples](/caddy/examples)** | Real-world Caddyfile recipes (Honeypot bombs, Turnstile, VPN allowlists). |
| 📜 **[Changelog & Releases](/caddy/changelog)** | Complete release history, directive updates, and migration notes. |
