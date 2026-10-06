---
title: JSON Schema & Production CI/CD — RouteWarden CLI
description: Formal JSON Schema definitions and automated CI/CD policy validation pipelines for RouteWarden.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

// ─── 1. Official Schema URLs ────────────────────────────────────────────────
const http_schema_url = buildSnippet({
  lang: 'plaintext',
  code: `https://routewarden.github.io/schema.json`,
})

const httpSchemaSnippets = computed(() => ({
  cli: [
    { filename: 'HTTP Gateway Schema', lang: 'plaintext', code: http_schema_url.cleanCode, html: http_schema_url.html, hasDiff: false },
  ],
}))

const tcp_schema_url = buildSnippet({
  lang: 'plaintext',
  code: `https://routewarden.github.io/tcp-warden.schema.json`,
})

const tcpSchemaSnippets = computed(() => ({
  cli: [
    { filename: 'TCP Warden Schema', lang: 'plaintext', code: tcp_schema_url.cleanCode, html: tcp_schema_url.html, hasDiff: false },
  ],
}))

// ─── 2. VS Code Settings ────────────────────────────────────────────────────
const vscode_settings = buildSnippet({
  lang: 'json',
  code: `{
  "json.schemas": [
    {
      "fileMatch": [
        "routewarden*.json",
        "*traefik*.json",
        "caddy*.json"
      ],
      "url": "https://routewarden.github.io/schema.json"
    }
  ],
  "yaml.schemas": {
    "https://routewarden.github.io/schema.json": [
      "routewarden*.yml",
      "routewarden*.yaml",
      "dynamic_conf.yml",
      "traefik-dynamic*.yml"
    ],
    "https://routewarden.github.io/tcp-warden.schema.json": [
      "tcp-warden*.yml",
      "tcp-warden*.yaml"
    ]
  }
}`,
})

const vscodeSnippets = computed(() => ({
  cli: [
    { filename: '.vscode/settings.json', lang: 'json', code: vscode_settings.cleanCode, html: vscode_settings.html, hasDiff: false },
  ],
}))

// ─── 3. Gateway Configuration Examples ──────────────────────────────────────
const traefik_yaml = buildSnippet({
  lang: 'yaml',
  code: `# yaml-language-server: $schema=https://routewarden.github.io/schema.json
enabled: true
enableDefaultPatterns: true
checkQuery: true
checkHeaders:
  - X-Forwarded-Uri
  - X-Rewrite-URL
checkBody: true
checkBodyPatterns:
  - '(?i)grant_type=password'
methods:
  - GET
  - POST
response:
  mode: json
  statusCode: 403
  body: '{"error":"Forbidden: Sensitive access blocked"}'`,
})

const traefikYamlSnippets = computed(() => ({
  cli: [
    { filename: 'dynamic_conf.yml', lang: 'yaml', code: traefik_yaml.cleanCode, html: traefik_yaml.html, hasDiff: false },
  ],
}))

const caddy_json = buildSnippet({
  lang: 'json',
  code: `{
  "$schema": "https://routewarden.github.io/schema.json",
  "enabled": true,
  "enableDefaultPatterns": true,
  "checkQuery": false,
  "checkHeaders": ["X-Forwarded-Uri"],
  "methods": ["GET", "HEAD"],
  "response": {
    "mode": "json",
    "statusCode": 403
  }
}`,
})

const caddyJsonSnippets = computed(() => ({
  cli: [
    { filename: 'caddy.json', lang: 'json', code: caddy_json.cleanCode, html: caddy_json.html, hasDiff: false },
  ],
}))

// ─── 4. CI/CD Validation Commands ───────────────────────────────────────────
const cicd_cli = buildSnippet({
  lang: 'bash',
  code: `# Offline syntax, regex, and CIDR validation
rwarden validate --config routewarden.json

# Simulate request evaluation against the rules
rwarden test --path "/.env"
rwarden test --path "/dashboard" --header "X-Forwarded-Uri:/.env"`,
})

const cicd_docker = buildSnippet({
  lang: 'bash',
  code: `# Offline syntax, regex, and CIDR validation via container
docker run --rm -v $(pwd)/routewarden.json:/routewarden.json ghcr.io/routewarden/cli:latest validate --config /routewarden.json

# Simulate request evaluation against the rules
docker run --rm ghcr.io/routewarden/cli:latest test --path "/.env"
docker run --rm ghcr.io/routewarden/cli:latest test --path "/dashboard" --header "X-Forwarded-Uri:/.env"`,
})

const cicdLintSnippets = computed(() => ({
  cli: [
    { filename: 'CLI', lang: 'bash', code: cicd_cli.cleanCode, html: cicd_cli.html, hasDiff: false },
    { filename: 'Docker', lang: 'bash', code: cicd_docker.cleanCode, html: cicd_docker.html, hasDiff: false },
  ],
}))

// ─── 5. GitHub Actions Workflow ─────────────────────────────────────────────
const github_docker = buildSnippet({
  lang: 'yaml',
  code: `name: Verify Security Rules

on:
  pull_request:
    paths:
      - 'routewarden.json'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate Configuration via Docker
        run: docker run --rm -v \${{ github.workspace }}/routewarden.json:/routewarden.json ghcr.io/routewarden/cli:latest validate --config /routewarden.json`,
})

const github_binary = buildSnippet({
  lang: 'yaml',
  code: `name: Verify Security Rules

on:
  pull_request:
    paths:
      - 'routewarden.json'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Go
        uses: actions/setup-go@v5
        with:
          go-version: '1.25'
      - name: Install RouteWarden CLI
        run: go install github.com/routewarden/cli@latest
      - name: Validate Configuration
        run: rwarden validate --config routewarden.json`,
})

const githubActionsSnippets = computed(() => ({
  cli: [
    { filename: 'Docker Container (Zero Setup)', lang: 'yaml', code: github_docker.cleanCode, html: github_docker.html, hasDiff: false },
    { filename: 'Go Tool / Binary', lang: 'yaml', code: github_binary.cleanCode, html: github_binary.html, hasDiff: false },
  ],
}))

// ─── 6. NGINX Dynamic Ingestion ─────────────────────────────────────────────
const nginx_conf = buildSnippet({
  lang: 'nginx',
  code: `http {
    init_by_lua_block {
        local cjson = require("cjson")
        local routewarden = require("resty.routewarden")

        local f, err = io.open("/etc/nginx/routewarden.json", "r")
        if not f then
            ngx.log(ngx.ERR, "failed to read routewarden.json: ", err)
            return
        end
        local content = f:read("*all")
        f:close()

        local config = cjson.decode(content)
        warden = routewarden.new(config)
    }

    server {
        listen 80;

        access_by_lua_block {
            warden:check()
        }

        location / {
            proxy_pass http://backend_upstream;
        }
    }
}`,
})

const nginxSnippets = computed(() => ({
  cli: [
    { filename: 'nginx.conf', lang: 'nginx', code: nginx_conf.cleanCode, html: nginx_conf.html, hasDiff: false },
  ],
}))

const nginx_reload = buildSnippet({
  lang: 'bash',
  code: `nginx -s reload`,
})

const nginxReloadSnippets = computed(() => ({
  cli: [
    { filename: 'Terminal', lang: 'bash', code: nginx_reload.cleanCode, html: nginx_reload.html, hasDiff: false },
  ],
}))

// ─── 7. Production Workflow Architecture Snippets ───────────────────────────
const workflow_mermaid_raw = `flowchart TD
    subgraph Spec ["Central Policy Definition"]
        RW["<b>routewarden.json</b><br/>• Built with schema autocomplete ($schema)<br/>• Version-controlled in Git"]
    end

    subgraph CI ["CI/CD Policy Gate"]
        LINT["<b>rwarden validate &amp; test</b><br/>Schema verification &amp; rule linting"]
    end

    subgraph Gateways ["Target Production Gateways"]
        NGX["<b>NGINX / OpenResty</b><br/>Dynamic JSON Loader"]
        TRF["<b>Traefik</b><br/>File Provider / Dynamic YAML"]
        CAD["<b>Caddy</b><br/>REST API / JSON Module"]
    end

    Spec -->|git push / PR| CI
    CI -->|Deploy JSON| NGX
    CI -->|Dynamic YAML| TRF
    CI -->|Caddy JSON| CAD`

const workflow_graph_svg = `<div class="rw-graph-container">
  <svg viewBox="0 0 960 440" fill="none" xmlns="http://www.w3.org/2000/svg" class="rw-graph-svg">
    <defs>
      <linearGradient id="grad-spec" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#6366f1" stop-opacity="0.12"/>
        <stop offset="100%" stop-color="#6366f1" stop-opacity="0.02"/>
      </linearGradient>
      <linearGradient id="grad-ci" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#10b981" stop-opacity="0.12"/>
        <stop offset="100%" stop-color="#10b981" stop-opacity="0.02"/>
      </linearGradient>
      <marker id="arrow-indigo" viewBox="-2 -2 16 14" refX="10" refY="5" markerWidth="10" markerHeight="10" orient="auto" overflow="visible">
        <path d="M 0 1 L 11 5 L 0 9 z" fill="#6366f1"/>
      </marker>
      <marker id="arrow-emerald" viewBox="-2 -2 16 14" refX="10" refY="5" markerWidth="10" markerHeight="10" orient="auto" overflow="visible">
        <path d="M 0 1 L 11 5 L 0 9 z" fill="#10b981"/>
      </marker>
    </defs>

    <!-- 1. Central Policy Box -->
    <rect x="230" y="16" width="500" height="92" rx="12" class="rw-g-box" fill="url(#grad-spec)"/>
    <text x="246" y="38" class="rw-g-header" fill="#6366f1">CENTRAL POLICY DEFINITION</text>
    <rect x="244" y="46" width="472" height="50" rx="8" class="rw-g-node"/>
    <circle cx="268" cy="71" r="8" fill="#6366f1"/>
    <text x="286" y="66" class="rw-g-card-title">routewarden.json</text>
    <text x="286" y="84" class="rw-g-desc">Built with schema autocomplete ($schema) • Centralized security posture in Git</text>

    <!-- Arrow 1: routewarden.json -> CI Gate -->
    <line x1="480" y1="108" x2="480" y2="152" stroke="#6366f1" stroke-width="2.5" marker-end="url(#arrow-indigo)"/>
    <rect x="425" y="118" width="110" height="22" rx="6" class="rw-g-pill"/>
    <text x="480" y="133" text-anchor="middle" class="rw-g-pill-txt" fill="#6366f1">git push / PR</text>

    <!-- 2. CI/CD Gate -->
    <rect x="300" y="156" width="360" height="74" rx="10" class="rw-g-box" fill="url(#grad-ci)"/>
    <rect x="312" y="166" width="336" height="54" rx="8" class="rw-g-node"/>
    <circle cx="334" cy="193" r="7" fill="#10b981"/>
    <text x="352" y="188" class="rw-g-card-title">rwarden validate &amp; test</text>
    <text x="352" y="206" class="rw-g-desc">Automated schema validation &amp; pattern regex audit</text>

    <!-- Connectors: CI Gate -> Target Gateways -->
    <path d="M 480 230 C 480 270, 180 262, 180 308" stroke="#10b981" stroke-width="2" fill="none" marker-end="url(#arrow-emerald)"/>
    <path d="M 480 230 L 480 308" stroke="#10b981" stroke-width="2" fill="none" marker-end="url(#arrow-emerald)"/>
    <path d="M 480 230 C 480 270, 780 262, 780 308" stroke="#10b981" stroke-width="2" fill="none" marker-end="url(#arrow-emerald)"/>

    <rect x="125" y="266" width="110" height="22" rx="6" class="rw-g-pill"/>
    <text x="180" y="281" text-anchor="middle" class="rw-g-pill-txt" fill="#10b981">Deploy JSON</text>

    <rect x="425" y="266" width="110" height="22" rx="6" class="rw-g-pill"/>
    <text x="480" y="281" text-anchor="middle" class="rw-g-pill-txt" fill="#10b981">Dynamic YAML</text>

    <rect x="725" y="266" width="110" height="22" rx="6" class="rw-g-pill"/>
    <text x="780" y="281" text-anchor="middle" class="rw-g-pill-txt" fill="#10b981">Caddy JSON</text>

    <!-- 3. Target Gateways -->
    <!-- Gateway A: NGINX / Lua -->
    <rect x="45" y="316" width="270" height="104" rx="10" class="rw-g-node"/>
    <circle cx="72" cy="345" r="8" fill="#10b981"/>
    <text x="90" y="342" class="rw-g-card-title">NGINX / OpenResty</text>
    <rect x="90" y="352" width="125" height="18" rx="4" fill="#10b981" fill-opacity="0.12"/>
    <text x="152" y="365" text-anchor="middle" class="rw-g-pill-txt" fill="#10b981">Dynamic JSON Loader</text>
    <text x="65" y="388" class="rw-g-desc">• Mounts routewarden.json dynamically</text>
    <text x="65" y="404" class="rw-g-desc">• Zero-downtime hot reload (nginx -s reload)</text>

    <!-- Gateway B: Traefik -->
    <rect x="345" y="316" width="270" height="104" rx="10" class="rw-g-node"/>
    <circle cx="372" cy="345" r="8" fill="#00a8cc"/>
    <text x="390" y="342" class="rw-g-card-title">Traefik</text>
    <rect x="390" y="352" width="135" height="18" rx="4" fill="#00a8cc" fill-opacity="0.12"/>
    <text x="457" y="365" text-anchor="middle" class="rw-g-pill-txt" fill="#00a8cc">Dynamic File Provider</text>
    <text x="365" y="388" class="rw-g-desc">• Watches dynamic configuration file</text>
    <text x="365" y="404" class="rw-g-desc">• Instant rule updates without container restart</text>

    <!-- Gateway C: Caddy -->
    <rect x="645" y="316" width="270" height="104" rx="10" class="rw-g-node"/>
    <circle cx="672" cy="345" r="8" fill="#14b8a6"/>
    <text x="690" y="342" class="rw-g-card-title">Caddy</text>
    <rect x="690" y="352" width="130" height="18" rx="4" fill="#14b8a6" fill-opacity="0.12"/>
    <text x="755" y="365" text-anchor="middle" class="rw-g-pill-txt" fill="#14b8a6">Native route_warden</text>
    <text x="665" y="388" class="rw-g-desc">• Native HTTP handler module pipeline</text>
    <text x="665" y="404" class="rw-g-desc">• Updated via Caddy REST API or JSON reload</text>
  </svg>
</div>`

const workflowSnippets = computed(() => ({
  cli: [
    { filename: 'Workflow Graph', lang: 'mermaid', code: workflow_mermaid_raw, html: workflow_graph_svg, hasDiff: false },
  ],
}))
</script>

# JSON Schema & Production CI/CD

RouteWarden publishes formal JSON Schemas for HTTP gateways and Layer 4 security configurations. Using schemas unlocks real-time IDE validation, inline autocomplete, and automated CI/CD policy linting.

---

## Official JSON Schemas

The official schemas are hosted on the documentation site:

- **HTTP Middleware (Traefik, Caddy, NGINX)**:
  <CodeViewer :snippets="httpSchemaSnippets" />
  *(Also mirrored at `https://raw.githubusercontent.com/routewarden/cli/main/config.schema.json`)*

- **Layer 4 TCP Security Proxy (TCP Warden)**:
  <CodeViewer :snippets="tcpSchemaSnippets" />

---

## 1. Visual Studio Code Setup

Add schema mappings to your workspace `.vscode/settings.json`:

<CodeViewer :snippets="vscodeSnippets" />

::: tip YAML Language Server
Ensure the official Red Hat YAML extension (`redhat.vscode-yaml`) is installed in VS Code for YAML file validation and autocomplete.
:::

---

## 2. JetBrains IDEs (IntelliJ, GoLand, WebStorm)

1. Open **Settings / Preferences** (`⌘,` on macOS or `Ctrl+Alt+S` on Linux/Windows).
2. Navigate to **Languages & Frameworks** → **Schemas and DTDs** → **JSON Schema Mappings**.
3. Configure mappings:
   - **RouteWarden HTTP**: `https://routewarden.github.io/schema.json` mapped to `routewarden*.json`, `routewarden*.yml`, `dynamic_conf.yml`, `caddy*.json`.
   - **TCP Warden**: `https://routewarden.github.io/tcp-warden.schema.json` mapped to `tcp-warden*.yaml`.

---

## 3. Gateway Configuration Examples

### Traefik Dynamic YAML Configuration

Use a top-of-file modeline comment to bind the schema directly without global IDE settings:

<CodeViewer :snippets="traefikYamlSnippets" />

### Caddy JSON Configuration

When configuring Caddy via the REST API or JSON files, map the `route_warden` handler directly:

<CodeViewer :snippets="caddyJsonSnippets" />

---

## Using `routewarden.json` in Production

`routewarden.json` is a **universal, gateway-agnostic security configuration file**. It lets you decouple your security posture from web server configurations, allowing security and DevOps teams to maintain rules centrally.

### Workflow Architecture

<CodeViewer :snippets="workflowSnippets" />

---

### Automated CI/CD Pipeline Linting

Before pushing updates to production, use `rwarden` in CI/CD to validate your security rules:

<CodeViewer :snippets="cicdLintSnippets" />

#### GitHub Actions Workflow (`.github/workflows/verify-rules.yml`)

<CodeViewer :snippets="githubActionsSnippets" />

---

### Dynamic NGINX / OpenResty Ingestion

Instead of hardcoding rules in `nginx.conf`, mount `routewarden.json` into your container and load it dynamically during worker startup:

<CodeViewer :snippets="nginxSnippets" />

To update rules without restarting NGINX, simply modify `routewarden.json` and reload:

<CodeViewer :snippets="nginxReloadSnippets" />
