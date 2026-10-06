<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

// ─── Installation: xcaddy ───────────────────────────────────────────────────
const xcaddy_code = buildSnippet({
  lang: 'bash',
  code: `# Install xcaddy if you haven't already
go install github.com/caddyserver/xcaddy/cmd/xcaddy@latest

# Build Caddy with caddy-warden
xcaddy build \\
  --with github.com/routewarden/caddy-warden@{{caddy_version}}`,
})

const xcaddySnippets = computed(() => ({
  caddy: [
    { filename: 'Terminal', lang: 'bash', code: xcaddy_code.cleanCode, html: xcaddy_code.html, hasDiff: false },
  ],
}))

// ─── Installation: Dockerfile ───────────────────────────────────────────────
const dockerfile_code = buildSnippet({
  lang: 'dockerfile',
  code: `# Dockerfile
FROM caddy:2-builder AS builder

RUN xcaddy build \\ # [!code ++]
    --with github.com/routewarden/caddy-warden@{{caddy_version}} # [!code ++]

FROM caddy:2-alpine

COPY --from=builder /usr/bin/caddy /usr/bin/caddy # [!code ++]`,
})

const dockerfileSnippets = computed(() => ({
  caddy: [
    { filename: 'Dockerfile', lang: 'dockerfile', code: dockerfile_code.cleanCode, html: dockerfile_code.html, hasDiff: dockerfile_code.hasDiff },
  ],
}))

// ─── Installation: Docker Compose ──────────────────────────────────────────
const compose_yaml = buildSnippet({
  lang: 'yaml',
  code: `services:
  caddy:
    build: # [!code ++]
      context: . # [!code ++]
      dockerfile: Dockerfile # [!code ++]
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - webapp
    restart: unless-stopped

  webapp:
    image: nginx:alpine
    restart: unless-stopped

volumes:
  caddy_data:
  caddy_config:`,
})

const compose_dockerfile = buildSnippet({
  lang: 'dockerfile',
  code: `FROM caddy:2-builder AS builder

RUN xcaddy build \\ # [!code ++]
    --with github.com/routewarden/caddy-warden@{{caddy_version}} # [!code ++]

FROM caddy:2-alpine

COPY --from=builder /usr/bin/caddy /usr/bin/caddy # [!code ++]`,
})

const compose_caddyfile = buildSnippet({
  lang: 'caddy',
  code: `{
    order route_warden before reverse_proxy # [!code ++]
}

example.com {
    route_warden { # [!code ++]
        enable_default_patterns true # [!code ++]
        response { # [!code ++]
            mode json # [!code ++]
            status_code 404 # [!code ++]
            body "{\\"error\\":\\"Not Found\\"}" # [!code ++]
        } # [!code ++]
    } # [!code ++]

    reverse_proxy webapp:80
}`,
})

const compose_up = buildSnippet({
  lang: 'bash',
  code: `docker compose up -d --build`,
})

const composeSnippets = computed(() => ({
  caddy: [
    { filename: 'docker-compose.yml', lang: 'yaml', code: compose_yaml.cleanCode, html: compose_yaml.html, hasDiff: compose_yaml.hasDiff },
    { filename: 'Dockerfile', lang: 'dockerfile', code: compose_dockerfile.cleanCode, html: compose_dockerfile.html, hasDiff: compose_dockerfile.hasDiff },
    { filename: 'Caddyfile', lang: 'caddy', code: compose_caddyfile.cleanCode, html: compose_caddyfile.html, hasDiff: compose_caddyfile.hasDiff },
    { filename: 'Terminal', lang: 'bash', code: compose_up.cleanCode, html: compose_up.html, hasDiff: false },
  ],
}))

// ─── Configuration: Option 1 (routewarden.json vs Caddyfile vs JSON API) ───
const config_opt1_json = buildSnippet({
  lang: 'json',
  code: `{
  "$schema": "https://routewarden.github.io/schema.json",
  "enabled": true,
  "enableDefaultPatterns": true,
  "enableDefaultAllowPatterns": true,
  "methods": ["GET", "POST"],
  "allowedIps": ["10.0.0.0/8", "192.168.1.0/24"],
  "response": {
    "mode": "json",
    "statusCode": 403,
    "body": "{\\"error\\":\\"Access Denied\\",\\"security\\":\\"RouteWarden Shield\\"}"
  }
}`,
})

const config_opt1_caddyfile = buildSnippet({
  lang: 'caddy',
  code: `# Caddyfile mapping from routewarden.json
{
    order route_warden before reverse_proxy # [!code ++]
}

example.com {
    route_warden { # [!code ++]
        enabled true # [!code ++]
        enable_default_patterns true # [!code ++]
        methods GET POST # [!code ++]
        allowed_ips "10.0.0.0/8" "192.168.1.0/24" # [!code ++]
        response { # [!code ++]
            mode json # [!code ++]
            status_code 403 # [!code ++]
            body "{\\"error\\":\\"Access Denied\\",\\"security\\":\\"RouteWarden Shield\\"}" # [!code ++]
        } # [!code ++]
    } # [!code ++]

    reverse_proxy localhost:8080
}`,
})

const config_opt1_api = buildSnippet({
  lang: 'json',
  code: `// POST /load or /config/apps/http/servers/srv0/routes
{
  "handler": "route_warden",
  "enabled": true,
  "enable_default_patterns": true,
  "methods": ["GET", "POST"],
  "allowed_ips": ["10.0.0.0/8", "192.168.1.0/24"],
  "response": {
    "mode": "json",
    "status_code": 403,
    "body": "{\\"error\\":\\"Access Denied\\",\\"security\\":\\"RouteWarden Shield\\"}"
  }
}`,
})

const configOpt1Snippets = computed(() => ({
  caddy: [
    { filename: 'routewarden.json', lang: 'json', code: config_opt1_json.cleanCode, html: config_opt1_json.html, hasDiff: false },
    { filename: 'Caddyfile', lang: 'caddy', code: config_opt1_caddyfile.cleanCode, html: config_opt1_caddyfile.html, hasDiff: config_opt1_caddyfile.hasDiff },
    { filename: 'caddy-api.json', lang: 'json', code: config_opt1_api.cleanCode, html: config_opt1_api.html, hasDiff: false },
  ],
}))

// ─── Direct Generation & CI/CD Pipeline ───────────────────────────────────────
const gen_cli = buildSnippet({
  lang: 'bash',
  code: `# 1. Validate schema compliance, regex patterns, and CIDRs
rwarden validate --config routewarden.json

# 2. Compile directly into Caddyfile directive block
rwarden generate --target caddy --config routewarden.json > Caddyfile`,
})

const gen_docker = buildSnippet({
  lang: 'bash',
  code: `# Validate and generate without local installation
docker run --rm -v $(pwd):/workspace -w /workspace \\
  ghcr.io/routewarden/cli:latest validate --config routewarden.json

docker run --rm -v $(pwd):/workspace -w /workspace \\
  ghcr.io/routewarden/cli:latest generate --target caddy --config routewarden.json > Caddyfile`,
})

const gen_github = buildSnippet({
  lang: 'yaml',
  code: `# .github/workflows/deploy.yml
name: Deploy Caddy Security Rules
on:
  push:
    paths:
      - 'routewarden.json'

jobs:
  build-caddy-config:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install RouteWarden CLI
        run: curl -sSfL https://routewarden.github.io/install.sh | sh

      - name: Validate & Generate Caddyfile Snippet
        run: |
          rwarden validate --config routewarden.json
          rwarden generate --target caddy --config routewarden.json > Caddyfile

      - name: Reload Caddy Server
        run: |
          # Copy to Caddy host and reload
          scp Caddyfile user@caddy-host:/etc/caddy/Caddyfile
          ssh user@caddy-host "caddy reload --config /etc/caddy/Caddyfile"`,
})

const pipelineSnippets = computed(() => ({
  cli: [
    { filename: 'CLI', lang: gen_cli.lang, code: gen_cli.cleanCode, html: gen_cli.html, hasDiff: false },
    { filename: 'Docker', lang: gen_docker.lang, code: gen_docker.cleanCode, html: gen_docker.html, hasDiff: false },
    { filename: 'GitHub Actions', lang: gen_github.lang, code: gen_github.cleanCode, html: gen_github.html, hasDiff: false },
  ],
}))

// ─── Directive Ordering ─────────────────────────────────────────────────────
const ordering_code = buildSnippet({
  lang: 'caddy',
  code: `{
    order route_warden before basicauth # [!code ++]
}`,
})

const orderingSnippets = computed(() => ({
  caddy: [
    { filename: 'Caddyfile', lang: 'caddy', code: ordering_code.cleanCode, html: ordering_code.html, hasDiff: ordering_code.hasDiff },
  ],
}))

// ─── Option 2: Caddyfile Syntax ─────────────────────────────────────────────
const caddyfile_syntax = buildSnippet({
  lang: 'caddy',
  code: `route_warden {
    enabled <true|false>
    enable_default_patterns <true|false>
    enable_default_allow_patterns <true|false>
    check_query <true|false>

    block_patterns <regex...>
    allow_patterns <regex...>
    allowed_ips <ip_or_cidr...>

    response {
        mode <json|html|text|xml|redirect|captcha|silent_drop|gzip_bomb|tarpit|fake_success|ratelimit|proxy|infinite_stream>
        status_code <int>
        body <string>
        redirect_url <url>
        proxy_url <url>
        gzip_bomb_mb <int>
        retry_after_seconds <int>
        tarpit_delay_ms <int>
        stream_size_mb <int>
        captcha {
            provider <turnstile|hcaptcha|recaptcha>
            site_key <key>
        }
    }
}`,
})

const caddyfileSyntaxSnippets = computed(() => ({
  caddy: [
    { filename: 'Caddyfile Syntax', lang: 'caddy', code: caddyfile_syntax.cleanCode, html: caddyfile_syntax.html, hasDiff: false },
  ],
}))

// ─── Examples: 1. Basic Production Shield ───────────────────────────────────
const ex1_code = buildSnippet({
  lang: 'caddy',
  code: `{
    order route_warden before reverse_proxy # [!code ++]
}

example.com {
    route_warden { # [!code ++]
        enable_default_patterns true # [!code ++]
        response { # [!code ++]
            mode json # [!code ++]
            status_code 404 # [!code ++]
            body "{\\"error\\":\\"Not Found\\"}" # [!code ++]
        } # [!code ++]
    } # [!code ++]

    reverse_proxy localhost:8080
}`,
})

const ex1Snippets = computed(() => ({
  caddy: [
    { filename: 'Caddyfile', lang: 'caddy', code: ex1_code.cleanCode, html: ex1_code.html, hasDiff: ex1_code.hasDiff },
  ],
}))

// ─── Examples: 2. IP Whitelisting ───────────────────────────────────────────
const ex2_code = buildSnippet({
  lang: 'caddy',
  code: `{
    order route_warden before reverse_proxy # [!code ++]
}

app.example.com {
    route_warden { # [!code ++]
        enable_default_patterns true # [!code ++]
        block_patterns "(?i)^/admin(/.*)?$" "(?i)^/metrics$" # [!code ++]
        allow_patterns "(?i)^/admin/health$" # [!code ++]
        allowed_ips "10.0.0.0/8" "192.168.1.100" # [!code ++]
        response { # [!code ++]
            mode json # [!code ++]
            status_code 403 # [!code ++]
            body "{\\"error\\":\\"Access Denied: Internal Network Only\\"}" # [!code ++]
        } # [!code ++]
    } # [!code ++]

    reverse_proxy backend:3000
}`,
})

const ex2Snippets = computed(() => ({
  caddy: [
    { filename: 'Caddyfile', lang: 'caddy', code: ex2_code.cleanCode, html: ex2_code.html, hasDiff: ex2_code.hasDiff },
  ],
}))

// ─── Examples: 3. Active Defense: Gzip Bomb ─────────────────────────────────
const ex3_code = buildSnippet({
  lang: 'caddy',
  code: `{
    order route_warden before reverse_proxy # [!code ++]
}

honeypot.example.com {
    route_warden { # [!code ++]
        enable_default_patterns true # [!code ++]
        block_patterns "(?i)^/wp-login\\.php$" "(?i)^/xmlrpc\\.php$" # [!code ++]
        response { # [!code ++]
            mode gzip_bomb # [!code ++]
            status_code 200 # [!code ++]
            gzip_bomb_mb 10 # [!code ++]
        } # [!code ++]
    } # [!code ++]

    reverse_proxy backend:80
}`,
})

const ex3Snippets = computed(() => ({
  caddy: [
    { filename: 'Caddyfile', lang: 'caddy', code: ex3_code.cleanCode, html: ex3_code.html, hasDiff: ex3_code.hasDiff },
  ],
}))

// ─── Examples: 4. Interactive Captcha ───────────────────────────────────────
const ex4_code = buildSnippet({
  lang: 'caddy',
  code: `{
    order route_warden before reverse_proxy # [!code ++]
}

portal.example.com {
    route_warden { # [!code ++]
        block_patterns "(?i)^/portal/sensitive(/.*)?$" # [!code ++]
        response { # [!code ++]
            mode captcha # [!code ++]
            captcha { # [!code ++]
                provider turnstile # [!code ++]
                site_key "0x4AAAAAAAxxyyzz" # [!code ++]
            } # [!code ++]
        } # [!code ++]
    } # [!code ++]

    reverse_proxy backend:8080
}`,
})

const ex4Snippets = computed(() => ({
  caddy: [
    { filename: 'Caddyfile', lang: 'caddy', code: ex4_code.cleanCode, html: ex4_code.html, hasDiff: ex4_code.hasDiff },
  ],
}))

// ─── JSON Configuration (Caddy Native API) ──────────────────────────────────
const json_api_code = buildSnippet({
  lang: 'json',
  code: `{
  "apps": {
    "http": {
      "servers": {
        "srv0": {
          "listen": [":443"],
          "routes": [
            {
              "handle": [
                {
                  "handler": "route_warden", // [!code ++]
                  "enabled": true, // [!code ++]
                  "enable_default_patterns": true, // [!code ++]
                  "allowed_ips": ["10.0.0.0/8"], // [!code ++]
                  "response": { // [!code ++]
                    "mode": "json", // [!code ++]
                    "status_code": 404, // [!code ++]
                    "body": "{\\"error\\":\\"Not Found\\"}" // [!code ++]
                  } // [!code ++]
                },
                {
                  "handler": "reverse_proxy",
                  "upstreams": [
                    { "dial": "localhost:8080" }
                  ]
                }
              ]
            }
          ]
        }
      }
    }
  }
}`,
})

const jsonApiSnippets = computed(() => ({
  caddy: [
    { filename: 'caddy.json', lang: 'json', code: json_api_code.cleanCode, html: json_api_code.html, hasDiff: json_api_code.hasDiff },
  ],
}))
</script>

# Caddy Warden: Getting Started

**Caddy Warden** (`github.com/routewarden/caddy-warden`) is the official **Caddy v2** security module from RouteWarden. It brings high-performance sensitive path defense, anti-evasion normalization, IP allowlisting, and active deception defenses to Caddy web servers.

---

## Key Capabilities

- **Automatic Sensitive Asset Shielding**: Blocks `.env`, `.git`, `.aws`, `.ssh`, `.sql`, database dumps, and server manifests out-of-the-box (`enable_default_patterns`).
- **Anti-Evasion Engine**: Normalizes multiple URL encodings (`%252e%252e`), semicolon matrix parameters (`/;param/.env`), Windows backslashes (`\`), and null bytes (`%00`) before pattern matching.
- **IP & CIDR Allowlisting**: Exempt trusted corporate subnets, office IPs, or VPNs (`allowed_ips`) using client IP detection or upstream proxy headers (`X-Forwarded-For`, `X-Real-IP`).
- **Multi-Action Defense Engine**: Respond with JSON errors, branded HTML, Cloudflare Turnstile/hCaptcha challenges, silent TCP resets (`silent_drop`), or bot-neutralizing **Gzip Bombs** (`gzip_bomb`).

---

## Installation & Building Caddy

Caddy uses [xcaddy](https://github.com/caddyserver/xcaddy) to compile custom builds with plugins:

### Using xcaddy (Recommended)

<CodeViewer :snippets="xcaddySnippets" />

### Using Dockerfile

<CodeViewer :snippets="dockerfileSnippets" />

### Using Docker Compose

Run Caddy with RouteWarden alongside your upstream web services using a dedicated `Dockerfile`:

<CodeViewer :snippets="composeSnippets" />

---

## Configuration

You can define RouteWarden security rules using **`routewarden.json` (Recommended Universal Schema)** as your single source of truth, directly in your **Caddyfile**, or via Caddy's dynamic **JSON API**.

### Option 1: `routewarden.json` (Recommended Universal Schema)

#### How `routewarden.json` Works with Caddy

`routewarden.json` acts as a portable security policy with IDE autocompletion and CI/CD validation. Its properties correspond directly to Caddy's directive blocks and JSON handler objects:
- `"methods"` ➔ Caddyfile `methods GET POST` / JSON `"methods": ["GET", "POST"]`
- `"allowedIps"` ➔ Caddyfile `allowed_ips ...` / JSON `"allowed_ips": [...]`
- `"blockPatterns"` ➔ Caddyfile `block_patterns ...` / JSON `"block_patterns": [...]`
- `"response"` ➔ Caddyfile `response { mode ... }` / JSON `"response": { ... }`

<CodeViewer :snippets="configOpt1Snippets" />

#### Using `routewarden.json` Directly via Generate Pipeline

If you maintain `routewarden.json` as your single source of truth across Git repositories or multi-gateway environments, use the [RouteWarden CLI (`rwarden`)](/cli/) to validate rules offline and compile directly into Caddyfile directive blocks during your deployment pipeline:

<CodeViewer :snippets="pipelineSnippets" />

---

## Directive Ordering

In Caddy, custom HTTP handler modules must be ordered in the middleware chain. Add `order route_warden before basicauth` or `order route_warden before reverse_proxy` inside your Caddyfile global options block:

<CodeViewer :snippets="orderingSnippets" />

---

## Option 2: Caddyfile Syntax

<CodeViewer :snippets="caddyfileSyntaxSnippets" />

---

## Examples

### 1. Basic Production Shield (JSON 404)

Shield all sensitive paths and return a sterile JSON 404 response:

<CodeViewer :snippets="ex1Snippets" />

### 2. IP Whitelisting with Safe Admin Exceptions

Allow corporate VPN (`10.0.0.0/8`) and office IP (`192.168.1.100`) to access administrative endpoints while blocking external crawlers:

<CodeViewer :snippets="ex2Snippets" />

### 3. Active Defense: Gzip Bomb Decompression Trap

When automated scrapers scan for `.env` or WordPress admin endpoints, send an active defense gzip bomb stream that expands ~1000× in client RAM:

<CodeViewer :snippets="ex3Snippets" />

### 4. Interactive Captcha Verification

Challenge visitors accessing sensitive URLs using Cloudflare Turnstile:

<CodeViewer :snippets="ex4Snippets" />

---

## JSON Configuration (Caddy Native API)

If you configure Caddy via its native JSON API:

<CodeViewer :snippets="jsonApiSnippets" />

---

## Related Links

- [RouteWarden Core Architecture & Anti-Evasion Engine](/core/architecture)
- [RouteWarden CLI Documentation](/cli/)
- [Response Modes Deep Dive (13 Actions)](/core/response-modes)
- [Custom Path Patterns Reference](/core/custom-patterns)
- [Caddy-Warden GitHub Repository](https://github.com/routewarden/caddy-warden)
