---
title: "Traefik Warden — Traefik Middleware Plugin"
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

// ─── Installation & Setup Snippets ───────────────────────────────────────────
const install_compose = buildSnippet({
  lang: 'yaml',
  code: `services:
  traefik:
    image: traefik:latest
    command:
      - "--experimental.plugins.routewarden.modulename=github.com/routewarden/traefik-warden" # [!code ++]
      - "--experimental.plugins.routewarden.version={{traefik_version}}" # [!code ++]
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.web.http.middlewares=warden@docker" # [!code ++]
    ports:
      - "80:80"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    labels: # [!code ++]
      - "traefik.enable=true" # [!code ++]
      - "traefik.http.middlewares.warden.plugin.routewarden.enabled=true" # [!code ++]
      - "traefik.http.middlewares.warden.plugin.routewarden.enableDefaultPatterns=true" # [!code ++]`,
})

const install_yaml = buildSnippet({
  lang: 'yaml',
  code: `# traefik.yml (Static YAML)
entryPoints: # [!code ++]
  web: # [!code ++]
    address: ":80" # [!code ++]
    http: # [!code ++]
      middlewares: # [!code ++]
        - warden@file # [!code ++]

experimental: # [!code ++]
  plugins: # [!code ++]
    routewarden: # [!code ++]
      moduleName: github.com/routewarden/traefik-warden # [!code ++]
      version: {{traefik_version}} # [!code ++]`,
})

const install_toml = buildSnippet({
  lang: 'toml',
  code: `# traefik.toml (Static TOML)
[entryPoints.web] # [!code ++]
  address = ":80" # [!code ++]
  [entryPoints.web.http] # [!code ++]
    middlewares = ["warden@file"] # [!code ++]

[experimental.plugins.routewarden] # [!code ++]
  moduleName = "github.com/routewarden/traefik-warden" # [!code ++]
  version = "{{traefik_version}}" # [!code ++]`,
})

const install_cli = buildSnippet({
  lang: 'bash',
  code: `# Traefik CLI arguments
traefik \\
  --experimental.plugins.routewarden.modulename=github.com/routewarden/traefik-warden \\ # [!code ++]
  --experimental.plugins.routewarden.version={{traefik_version}} \\ # [!code ++]
  --entrypoints.web.http.middlewares=warden@docker # [!code ++]`,
})

const installSnippets = computed(() => ({
  traefik: [
    { filename: 'docker-compose.yaml', lang: 'yaml', code: install_compose.cleanCode, html: install_compose.html, hasDiff: install_compose.hasDiff },
    { filename: 'traefik.yml', lang: 'yaml', code: install_yaml.cleanCode, html: install_yaml.html, hasDiff: install_yaml.hasDiff },
    { filename: 'traefik.toml', lang: 'toml', code: install_toml.cleanCode, html: install_toml.html, hasDiff: install_toml.hasDiff },
    { filename: 'CLI Flags', lang: 'bash', code: install_cli.cleanCode, html: install_cli.html, hasDiff: install_cli.hasDiff },
  ],
}))

// ─── 30-Second Quick Start Snippets ──────────────────────────────────────────
const quick_compose = buildSnippet({
  lang: 'yaml',
  code: `# docker-compose.yml: Global protection on entryPoint
services:
  traefik:
    image: traefik:latest
    command:
      - "--experimental.plugins.routewarden.modulename=github.com/routewarden/traefik-warden"  # [!code ++]
      - "--experimental.plugins.routewarden.version={{traefik_version}}" # [!code ++]
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.web.http.middlewares=warden@docker" # [!code ++]
    ports:
      - "80:80"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    labels:
      - "traefik.enable=true"
      # Global EntryPoint Shield: protects ALL services automatically
      - "traefik.http.middlewares.warden.plugin.routewarden.enabled=true" # [!code ++]
      - "traefik.http.middlewares.warden.plugin.routewarden.enableDefaultPatterns=true" # [!code ++]

  # All services are now shielded automatically without router labels:
  webapp:
    image: nginx:alpine
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.app.rule=PathPrefix(\`/\`)"
      - "traefik.http.routers.app.entrypoints=web"`,
})

const quick_yaml = buildSnippet({
  lang: 'yaml',
  code: `# dynamic_conf.yml
http:
  middlewares:
    warden:
      plugin:
        routewarden:
          enabled: true
          enableDefaultPatterns: true

  routers:
    # Router requires no middleware labels when attached to entryPoints:
    app-router:
      rule: "Host(\`example.com\`)"
      entryPoints:
        - web
      service: app-service`,
})

const quick_toml = buildSnippet({
  lang: 'toml',
  code: `# dynamic_conf.toml
[http.middlewares.warden.plugin.routewarden]
  enabled = true
  enableDefaultPatterns = true

[http.routers.app-router]
  rule = "Host(\`example.com\`)"
  entryPoints = ["web"]
  service = "app-service"`,
})

const quickStartSnippets = computed(() => ({
  traefik: [
    { filename: 'docker-compose.yml', lang: 'yaml', code: quick_compose.cleanCode, html: quick_compose.html, hasDiff: quick_compose.hasDiff },
    { filename: 'traefik.yaml', lang: 'yaml', code: quick_yaml.cleanCode, html: quick_yaml.html, hasDiff: false },
    { filename: 'traefik.toml', lang: 'toml', code: quick_toml.cleanCode, html: quick_toml.html, hasDiff: false },
  ],
}))

</script>

# Traefik Warden

<p class="tagline" style="font-size: 1.25rem; color: var(--vp-c-text-2); margin-bottom: 1.5rem;">
Stop automated scanners from finding your <code>.env</code> files, backup archives, and admin endpoints before they ever reach your backend.
</p>

**Traefik Warden** (`github.com/routewarden/traefik-warden`) is a lightweight, pure Go middleware plugin for Traefik v2 and v3. It acts as an in-line shield at your gateway: dropping malicious scans, neutralizing path evasion tricks, and whitelisting trusted team IPs.

---

## What Does Traefik Warden Do?

<div class="attack-grid">
  <div class="attack-card">
    <h4>🛡️ Block Sensitive File Scans</h4>
    <p>Automatically blocks bots searching for <code>.env</code>, <code>.git</code>, AWS keys, database dumps, and debug endpoints out of the box.</p>
  </div>
  <div class="attack-card">
    <h4>🔍 Neutralize Path Evasion</h4>
    <p>Stops sneaky URL encoding tricks like double percent-encoding (<code>%252e</code>), semicolon matrix parameters (<code>/;param/.env</code>), Windows backslashes, and null bytes.</p>
  </div>
  <div class="attack-card">
    <h4>🌍 Whitelist Trusted IPs & VPNs</h4>
    <p>Let office subnets, Tailscale, or developer IPs bypass security rules using simple CIDR rules with full <code>X-Forwarded-For</code> support.</p>
  </div>
  <div class="attack-card">
    <h4>⚡ Zero Dependencies & Yaegi Native</h4>
    <p>Built with 100% Go standard library. Runs cleanly inside Traefik's Yaegi runtime with zero external binary dependencies.</p>
  </div>
</div>

---

## 30-Second Quick Start

Attach the Traefik Warden middleware to your routers:

<CodeViewer :snippets="quickStartSnippets" />

---

## Installation & Setup

Declare the Traefik Warden plugin in Traefik's static configuration or container launch arguments:

<CodeViewer :snippets="installSnippets" />

---

## Explore the Documentation

| Guide | Description |
| :--- | :--- |
| 🚀 **[Getting Started](/traefik/getting-started)** | Install Traefik Warden on Traefik v2/v3 in under 5 minutes. |
| ⚙️ **[Configuration Reference](/traefik/configuration)** | Static, dynamic, and container label configuration parameters. |
| 💻 **[Local Deployment](/traefik/local-deployment)** | Test and develop plugins locally using `experimental.localPlugins`. |
| 🧪 **[Testing & CI](/traefik/testing)** | Verification routines, unit testing, and Docker Compose test suites. |
| 💡 **[Traefik Recipes & Examples](/traefik/examples)** | Real-world blueprints (Docker Compose, Kubernetes IngressRoute, Immich). |
| 📜 **[Changelog & Releases](/traefik/changelog)** | Complete release history, breaking changes, and migration notes. |

