---
title: Frequently Asked Questions (FAQ)
description: Answers to common questions about RouteWarden edge defense, anti-evasion normalization, response modes, Layer 4 TCP Warden, IP allowlisting, and observability.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from './.vitepress/theme/composables/useCodeSnippet'

// ─── Built-in Dictionaries Snippet ──────────────────────────────────────────
const default_dict = buildSnippet({
  lang: 'plaintext',
  code: `├── Environment Files     (.env, .env.local, .env.production, docker-compose.yml)
├── Version Control       (.git, .svn, .hg, .bzr, .gitattributes, .gitmodules)
├── Backups & Archives    (.bak, .backup, .old, .orig, .tar.gz, .sql.gz, dump.sql)
├── Cloud & Credentials   (.aws/credentials, .kube/config, id_rsa, id_ed25519)
├── Server Info & Debug   (phpinfo.php, server-status, _profiler, /actuator)
├── OS & Editor Artifacts (.DS_Store, Thumbs.db, *~, #*#, .idea, .vscode)
└── Database Management   (pma, phpmyadmin, adminer.php, myadmin)`,
})

const defaultDictSnippets = computed(() => ({
  rules: [
    { filename: 'Built-in Dictionaries', lang: 'plaintext', code: default_dict.cleanCode, html: default_dict.html, hasDiff: default_dict.hasDiff },
  ],
}))

// ─── ACME Challenge Exemption Snippet ────────────────────────────────────────
const acme_regex = buildSnippet({
  lang: 'plaintext',
  code: `^/.well-known/acme-challenge/.*`,
})

const acmeExemptionSnippets = computed(() => ({
  rules: [
    { filename: 'ACME Exemption Regex', lang: 'plaintext', code: acme_regex.cleanCode, html: acme_regex.html, hasDiff: acme_regex.hasDiff },
  ],
}))

// ─── Custom Pattern Snippets ────────────────────────────────────────────────
const cp_traefik_yaml = buildSnippet({
  lang: 'yaml',
  code: `# traefik.yml (Dynamic Configuration)
http:
  middlewares:
    my-shield:
      plugin:
        routewarden:
          enabled: true
          customBlockPatterns: # [!code ++]
            - "^/internal-api/.*" # [!code ++]
            - "(?i)\\\\.(log|conf|ini|key)$" # [!code ++]
            - "^/wp-login\\\\.php$" # [!code ++]`,
})

const cp_traefik_compose = buildSnippet({
  lang: 'yaml',
  code: `# docker-compose.yml (Container Labels)
services:
  webapp:
    image: my-app:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.app.middlewares=my-shield@docker"
      - "traefik.http.middlewares.my-shield.plugin.routewarden.enabled=true"
      - "traefik.http.middlewares.my-shield.plugin.routewarden.customBlockPatterns[0]=^/internal-api/.*" # [!code ++]
      - "traefik.http.middlewares.my-shield.plugin.routewarden.customBlockPatterns[1]=(?i)\\\\.(log|conf|ini|key)$" # [!code ++]
      - "traefik.http.middlewares.my-shield.plugin.routewarden.customBlockPatterns[2]=^/wp-login\\\\.php$" # [!code ++]`,
})

const cp_caddyfile = buildSnippet({
  lang: 'caddy',
  code: `# Caddyfile
:443 {
    route {
        route_warden {
            custom_block_patterns ^/internal-api/.* (?i)\\.(log|conf|ini|key)$ ^/wp-login\\.php$ # [!code ++]
        }
        reverse_proxy app:8080
    }
}`,
})

const cp_caddy_json = buildSnippet({
  lang: 'json',
  code: `// Caddy JSON Configuration
{
  "handler": "route_warden",
  "custom_block_patterns": [ // [!code ++]
    "^/internal-api/.*", // [!code ++]
    "(?i)\\\\.(log|conf|ini|key)$", // [!code ++]
    "^/wp-login\\\\.php$" // [!code ++]
  ] // [!code ++]
}`,
})

const cp_nginx_lua = buildSnippet({
  lang: 'lua',
  code: `# /etc/nginx/conf.d/default.conf
access_by_lua_block {
    local rw = require("routewarden")
    rw.check({
        custom_block_patterns = { -- [!code ++]
            "^/internal-api/.*", -- [!code ++]
            "(?i)\\.(log|conf|ini|key)$", -- [!code ++]
            "^/wp-login\\.php$" -- [!code ++]
        } -- [!code ++]
    })
}`,
})

const customPatternSnippets = computed(() => ({
  traefik: [
    { filename: 'traefik.yml', lang: 'yaml', code: cp_traefik_yaml.cleanCode, html: cp_traefik_yaml.html, hasDiff: cp_traefik_yaml.hasDiff },
    { filename: 'docker-compose.yml', lang: 'yaml', code: cp_traefik_compose.cleanCode, html: cp_traefik_compose.html, hasDiff: cp_traefik_compose.hasDiff },
  ],
  caddy: [
    { filename: 'Caddyfile', lang: 'caddy', code: cp_caddyfile.cleanCode, html: cp_caddyfile.html, hasDiff: cp_caddyfile.hasDiff },
    { filename: 'caddy.json', lang: 'json', code: cp_caddy_json.cleanCode, html: cp_caddy_json.html, hasDiff: cp_caddy_json.hasDiff },
  ],
  nginx: [
    { filename: 'nginx.conf (Lua)', lang: 'lua', code: cp_nginx_lua.cleanCode, html: cp_nginx_lua.html, hasDiff: cp_nginx_lua.hasDiff },
  ],
}))

// ─── Allow Pattern Snippets ─────────────────────────────────────────────────
const ap_traefik = buildSnippet({
  lang: 'yaml',
  code: `# traefik.yml (Dynamic Configuration)
http:
  middlewares:
    my-shield:
      plugin:
        routewarden:
          allowPatterns: # [!code ++]
            - "^/downloads/sample\\\\.env$" # [!code ++]
            - "^/public/documentation/.*\\\\.sql$" # [!code ++]`,
})

const ap_caddy = buildSnippet({
  lang: 'caddy',
  code: `# Caddyfile
:443 {
    route {
        route_warden {
            allow_patterns ^/downloads/sample\\.env$ ^/public/documentation/.*\\.sql$ # [!code ++]
        }
        reverse_proxy app:8080
    }
}`,
})

const ap_nginx = buildSnippet({
  lang: 'lua',
  code: `# /etc/nginx/conf.d/default.conf
access_by_lua_block {
    local rw = require("routewarden")
    rw.check({
        allow_patterns = { -- [!code ++]
            "^/downloads/sample\\.env$", -- [!code ++]
            "^/public/documentation/.*\\.sql$" -- [!code ++]
        } -- [!code ++]
    })
}`,
})

const allowPatternSnippets = computed(() => ({
  traefik: [
    { filename: 'traefik.yml', lang: 'yaml', code: ap_traefik.cleanCode, html: ap_traefik.html, hasDiff: ap_traefik.hasDiff },
  ],
  caddy: [
    { filename: 'Caddyfile', lang: 'caddy', code: ap_caddy.cleanCode, html: ap_caddy.html, hasDiff: ap_caddy.hasDiff },
  ],
  nginx: [
    { filename: 'nginx.conf (Lua)', lang: 'lua', code: ap_nginx.cleanCode, html: ap_nginx.html, hasDiff: ap_nginx.hasDiff },
  ],
}))

// ─── IP Whitelist Snippets ──────────────────────────────────────────────────
const ip_traefik = buildSnippet({
  lang: 'yaml',
  code: `# traefik.yml
http:
  middlewares:
    my-shield:
      plugin:
        routewarden:
          allowedIps: # [!code ++]
            - "127.0.0.1"        # Localhost loopback # [!code ++]
            - "10.0.0.0/8"        # Internal corporate LAN # [!code ++]
            - "172.16.0.0/12"     # Docker bridge network # [!code ++]
            - "192.168.1.0/24"    # Office subnet # [!code ++]
            - "100.64.0.0/10"     # Tailscale / NetBird CGNAT # [!code ++]`,
})

const ip_caddy = buildSnippet({
  lang: 'caddy',
  code: `# Caddyfile
:443 {
    route {
        route_warden {
            allowed_ips 127.0.0.1 10.0.0.0/8 172.16.0.0/12 192.168.1.0/24 100.64.0.0/10 # [!code ++]
        }
        reverse_proxy app:8080
    }
}`,
})

const ip_nginx = buildSnippet({
  lang: 'lua',
  code: `# /etc/nginx/conf.d/default.conf
access_by_lua_block {
    local rw = require("routewarden")
    rw.check({
        allowed_ips = { -- [!code ++]
            "127.0.0.1", "10.0.0.0/8", "172.16.0.0/12", "192.168.1.0/24", "100.64.0.0/10" -- [!code ++]
        } -- [!code ++]
    })
}`,
})

const ipAllowlistSnippets = computed(() => ({
  traefik: [
    { filename: 'traefik.yml', lang: 'yaml', code: ip_traefik.cleanCode, html: ip_traefik.html, hasDiff: ip_traefik.hasDiff },
  ],
  caddy: [
    { filename: 'Caddyfile', lang: 'caddy', code: ip_caddy.cleanCode, html: ip_caddy.html, hasDiff: ip_caddy.hasDiff },
  ],
  nginx: [
    { filename: 'nginx.conf (Lua)', lang: 'lua', code: ip_nginx.cleanCode, html: ip_nginx.html, hasDiff: ip_nginx.hasDiff },
  ],
}))

// ─── Trusted Proxies Snippets ───────────────────────────────────────────────
const tp_traefik = buildSnippet({
  lang: 'yaml',
  code: `# traefik.yml
http:
  middlewares:
    my-shield:
      plugin:
        routewarden:
          trustedProxies: # [!code ++]
            - "173.245.48.0/20"   # Cloudflare IP range # [!code ++]
            - "103.21.244.0/22"   # Cloudflare IP range # [!code ++]
            - "10.0.0.0/8"        # Internal Load Balancer # [!code ++]`,
})

const tp_caddy = buildSnippet({
  lang: 'caddy',
  code: `# Caddyfile
:443 {
    route {
        route_warden {
            trusted_proxies 173.245.48.0/20 103.21.244.0/22 10.0.0.0/8 # [!code ++]
        }
        reverse_proxy app:8080
    }
}`,
})

const tp_nginx = buildSnippet({
  lang: 'lua',
  code: `# /etc/nginx/conf.d/default.conf
access_by_lua_block {
    local rw = require("routewarden")
    rw.check({
        trusted_proxies = { -- [!code ++]
            "173.245.48.0/20", "103.21.244.0/22", "10.0.0.0/8" -- [!code ++]
        } -- [!code ++]
    })
}`,
})

const trustedProxiesSnippets = computed(() => ({
  traefik: [
    { filename: 'traefik.yml', lang: 'yaml', code: tp_traefik.cleanCode, html: tp_traefik.html, hasDiff: tp_traefik.hasDiff },
  ],
  caddy: [
    { filename: 'Caddyfile', lang: 'caddy', code: tp_caddy.cleanCode, html: tp_caddy.html, hasDiff: tp_caddy.hasDiff },
  ],
  nginx: [
    { filename: 'nginx.conf (Lua)', lang: 'lua', code: tp_nginx.cleanCode, html: tp_nginx.html, hasDiff: tp_nginx.hasDiff },
  ],
}))

// ─── Dashboard Management Snippet ───────────────────────────────────────────
const dash_start = buildSnippet({
  lang: 'bash',
  code: `# Launch RouteWarden Grafana + Loki + Alloy Observability Stack
rwarden dashboard up

# Launch with automated threat alerting enabled
rwarden dashboard up --enable-alerting`,
})

const dashboardStartSnippets = computed(() => ({
  cli: [
    { filename: 'Terminal', lang: 'bash', code: dash_start.cleanCode, html: dash_start.html, hasDiff: dash_start.hasDiff },
  ],
}))

// ─── Log Replay Snippet ─────────────────────────────────────────────────────
const replay_bash = buildSnippet({
  lang: 'bash',
  code: `# Fetch existing RouteWarden events from Loki and replay to Alloy UDP (1514)
curl -G -s "http://localhost:3100/loki/api/v1/query_range" \\
  --data-urlencode 'query={app="routewarden"}' \\
  --data-urlencode 'limit=5000' \\
  | jq -r '.data.result[].values[][1]' \\
  | while IFS= read -r line; do
      echo "$line" | nc -u -w0 127.0.0.1 1514
      sleep 0.005
    done`,
})

const replay_rescrape = buildSnippet({
  lang: 'bash',
  code: `# Clear Alloy's position cache to re-read Docker container logs from start
docker compose stop alloy
docker compose run --rm alloy rm -rf /var/lib/alloy/data/
docker compose start alloy`,
})

const replayLogsSnippets = computed(() => ({
  replay: [
    { filename: 'Replay to Alloy (UDP)', lang: 'bash', code: replay_bash.cleanCode, html: replay_bash.html, hasDiff: replay_bash.hasDiff },
    { filename: 'Re-scrape Container Logs', lang: 'bash', code: replay_rescrape.cleanCode, html: replay_rescrape.html, hasDiff: replay_rescrape.hasDiff },
  ],
}))

// ─── Container Opt-in Logging Snippets ──────────────────────────────────────
const optin_compose = buildSnippet({
  lang: 'yaml',
  code: `# docker-compose.yml: Opt-in container logging for Alloy
services:
  traefik:
    image: traefik:latest
    labels:
      - "routewarden.logs=true" # [!code ++]
      - "traefik.enable=true"`,
})

const optin_cli = buildSnippet({
  lang: 'bash',
  code: `# docker run with RouteWarden discovery label
docker run -d \\
  --label routewarden.logs=true \\ # [!code ++]
  --name webapp \\
  my-app:latest`,
})

const containerOptInSnippets = computed(() => ({
  docker: [
    { filename: 'docker-compose.yml', lang: 'yaml', code: optin_compose.cleanCode, html: optin_compose.html, hasDiff: optin_compose.hasDiff },
    { filename: 'docker run CLI', lang: 'bash', code: optin_cli.cleanCode, html: optin_cli.html, hasDiff: optin_cli.hasDiff },
  ],
}))

// ─── CLI Installation Snippets ──────────────────────────────────────────────
const cli_brew = buildSnippet({
  lang: 'bash',
  code: `# macOS & Linux via Homebrew
brew install routewarden/tap/rwarden

# Verify installation
rwarden version`,
})

const cli_curl_system = buildSnippet({
  lang: 'bash',
  code: `# Universal one-liner installer (macOS & Linux)
curl -fsSL https://routewarden.github.io/install.sh | bash

# Verify installation
rwarden version`,
})

const cli_curl_user = buildSnippet({
  lang: 'bash',
  code: `# Install to user directory without sudo (~/.local/bin)
curl -fsSL https://routewarden.github.io/install.sh | INSTALL_DIR=$HOME/.local/bin bash

# Verify installation
rwarden version`,
})

const cli_go = buildSnippet({
  lang: 'bash',
  code: `# Build and install directly from Go source
go install github.com/routewarden/cli@latest

# Verify installation
rwarden version`,
})

const cliInstallSnippets = computed(() => ({
  cli: [
    { filename: 'Homebrew', lang: 'bash', code: cli_brew.cleanCode, html: cli_brew.html, hasDiff: cli_brew.hasDiff },
    { filename: 'System-Wide (/usr/local/bin)', lang: 'bash', code: cli_curl_system.cleanCode, html: cli_curl_system.html, hasDiff: cli_curl_system.hasDiff },
    { filename: 'User Directory (~/.local/bin)', lang: 'bash', code: cli_curl_user.cleanCode, html: cli_curl_user.html, hasDiff: cli_curl_user.hasDiff },
    { filename: 'Go Install', lang: 'bash', code: cli_go.cleanCode, html: cli_go.html, hasDiff: cli_go.hasDiff },
  ],
}))

// ─── CI/CD GitHub Actions Workflow ──────────────────────────────────────────
const ga_workflow = buildSnippet({
  lang: 'yaml',
  code: `# .github/workflows/security-lint.yml
name: Security Lint
on: [push, pull_request]

jobs:
  routewarden:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install RouteWarden CLI
        run: curl -fsSL https://routewarden.github.io/install.sh | sh
      - name: Verify Sensitive Endpoints Are Blocked
        run: |
          rwarden check "/.env" --expect-block # [!code ++]
          rwarden check "/.git/config" --expect-block # [!code ++]
          rwarden check "/backup.sql" --expect-block # [!code ++]
          rwarden check "/api/v1/health" --expect-allow # [!code ++]`,
})

const githubActionsSnippets = computed(() => ({
  ci: [
    { filename: 'security-lint.yml', lang: 'yaml', code: ga_workflow.cleanCode, html: ga_workflow.html, hasDiff: ga_workflow.hasDiff },
  ],
}))

// ─── Diagnostic Snippets ────────────────────────────────────────────────────
const diag_check = buildSnippet({
  lang: 'bash',
  code: `# Diagnose path normalization and pattern matching
rwarden check "/path/to/resource" --debug

# Example output:
# [NORMALIZED] /path/to/resource
# [VERDICT]    BLOCK
# [MATCH]      ^/path/to/.* (Rule ID: custom_01)
# [RESPONSE]   403 Forbidden`,
})

const diag_allow = buildSnippet({
  lang: 'yaml',
  code: `# Whitelist the identified false positive in your gateway config
allowPatterns: # [!code ++]
  - "^/path/to/resource$" # [!code ++]`,
})

const diagnoseSnippets = computed(() => ({
  debug: [
    { filename: 'CLI Diagnostic', lang: 'bash', code: diag_check.cleanCode, html: diag_check.html, hasDiff: diag_check.hasDiff },
    { filename: 'allowPatterns Fix', lang: 'yaml', code: diag_allow.cleanCode, html: diag_allow.html, hasDiff: diag_allow.hasDiff },
  ],
}))
</script>

# Frequently Asked Questions (FAQ)

<p class="tagline" style="font-size: 1.2rem; color: var(--vp-c-text-2); margin-bottom: 2rem;">
Everything you need to know about RouteWarden architecture, threat mitigation, performance, and best practices.
</p>

---

## Quick Navigation

<div class="attack-grid" style="margin-bottom: 2.5rem;">
  <div class="attack-card">
    <div style="font-size: 15px; font-weight: 700; margin-bottom: 8px;">🛡️ <a href="#general-architecture">General & Architecture</a></div>
    <p>What RouteWarden is, how it compares to WAFs, and multi-gateway compatibility.</p>
  </div>
  <div class="attack-card">
    <div style="font-size: 15px; font-weight: 700; margin-bottom: 8px;">🔍 <a href="#threat-detection-patterns">Detection & Patterns</a></div>
    <p>Default blocklists, regex syntax, anti-evasion rules, and .well-known exemptions.</p>
  </div>
  <div class="attack-card">
    <div style="font-size: 15px; font-weight: 700; margin-bottom: 8px;">⚡ <a href="#response-modes-active-defense">Response Modes</a></div>
    <p>13 response actions, deceptive 404s, silent TCP drops, and gzip bombs.</p>
  </div>
  <div class="attack-card">
    <div style="font-size: 15px; font-weight: 700; margin-bottom: 8px;">🌐 <a href="#ip-allowlisting-trusted-proxies">IPs & Proxies</a></div>
    <p>CIDR whitelists, Cloudflare integration, and preventing XFF header spoofing.</p>
  </div>
  <div class="attack-card">
    <div style="font-size: 15px; font-weight: 700; margin-bottom: 8px;">🔌 <a href="#layer-4-tcp-warden">Layer 4 (TCP Warden)</a></div>
    <p>SSH, SMTP, database protection, protocol inspection, and connection tarpits.</p>
  </div>
  <div class="attack-card">
    <div style="font-size: 15px; font-weight: 700; margin-bottom: 8px;">📊 <a href="#observability-dashboard">Observability & CLI</a></div>
    <p>Grafana/Loki integration, GeoIP country resolution, and rwarden linting.</p>
  </div>
</div>

---

## General & Architecture

### What is RouteWarden, and what problem does it solve?

**RouteWarden** is a unified edge and protocol security suite designed to block scanner recon, credential stuffing, and sensitive data leaks at the perimeter before requests touch your application containers.

Every server on the public internet faces relentless automated scanners probing for:
* Configuration & secrets: `/.env`, `/config.json`, `/wp-config.php`, `/settings.py`
* VCS repositories & metadata: `/.git/HEAD`, `/.svn/entries`, `/.DS_Store`
* Backups & dumps: `/backup.sql`, `/database.tar.gz`, `/site.zip`
* Admin consoles & debug endpoints: `/phpinfo.php`, `/_profiler`, `/actuator/env`

RouteWarden sits directly inside your edge gateway (**Traefik**, **Caddy**, or **NGINX**) or as an **L4 proxy (TCP Warden)**, neutralizing these requests in less than **0.05 milliseconds** before your backend processes, databases, or application servers ever see them.

---

### How does RouteWarden differ from a full WAF (ModSecurity, Coraza, Cloudflare)?

| Dimension | Full WAF (ModSecurity / Coraza) | Cloudflare WAF | RouteWarden |
| :--- | :--- | :--- | :--- |
| **Primary Scope** | Deep HTTP body inspection (SQLi, XSS, RCE) | Cloud-level DDoS, managed rule sets | **Edge path defense (L7) & Protocol shielding (L4)** |
| **Inspection Latency** | 5ms – 25ms per request | Variable (cloud edge detour) | **< 0.05ms (zero-alloc regex & byte scanning)** |
| **Memory Footprint** | 100MB – 500MB+ per process | Hosted / SaaS | **< 15MB standalone binary / in-process middleware** |
| **Rule Complexity** | Thousands of complex CRS rules | Managed / proprietary cloud rules | **Curated high-signal dictionary + custom RE2 regex** |
| **False Positive Rate** | High (often requires weeks of tuning) | Low-to-moderate | **Near zero for sensitive paths & protocol handshakes** |
| **Layer 4 Coverage** | No (HTTP/HTTPS only) | Spectrum (Enterprise tier only) | **Native TCP Warden (SSH, SMTP, DBs, DNS, etc.)** |
| **Active Deception** | Block (403) or Drop | Managed challenge page | **13 actions: Gzip bombs, fake 404s, Captchas, Tarpits** |

> [!TIP]
> **Better Together**: RouteWarden is not an all-or-nothing replacement for a full WAF. Many production teams run RouteWarden directly at their reverse proxy to instantly discard scanner garbage, drastically lowering load on heavier downstream WAF engines or application servers.

---

### Can I run RouteWarden alongside CrowdSec or Fail2ban?

**Yes, absolutely.** They serve complementary roles:
* **RouteWarden** is an **in-line enforcement gate**: it inspects every packet/request live on the wire and acts instantly on the very first offending request (e.g., dropping or tarpitting before response generation).
* **CrowdSec / Fail2ban** are **log analyzers**: they monitor logs after the fact and push IP bans to firewalls or IP lists.

When combined, RouteWarden emits structured JSON logs with normalized client IPs and exact threat verdicts, which CrowdSec or Fail2ban can ingest without fragile custom log parsers. See the [CrowdSec Auto-Ban Shield Case Study](/examples/crowdsec) for complete configuration blueprints.

---

### Which reverse proxies and gateways are supported?

RouteWarden provides native integrations for all major open-source web gateways and protocols:

1. **[Traefik Warden](/traefik/)**: Official Traefik middleware plugin written in Go (`github.com/routewarden/route-warden`), available in the Traefik Plugin Catalog.
2. **[Caddy Warden](/caddy/)**: Native Caddy v2 HTTP handler module (`github.com/routewarden/caddy-warden`) with full Caddyfile and JSON configuration support.
3. **[NGINX Warden](/nginx/)**: High-performance OpenResty/Lua module with `resty.core` string manipulation and optional shared dictionary caching.
4. **[TCP Warden](/tcp/)**: Standalone Layer 4 reverse proxy protecting non-HTTP protocols (SSH, databases, mail, DNS, game servers) with modular protocol plugins.

---

### Does RouteWarden add measurable latency?

**No.** Benchmarks across Traefik, Caddy, and NGINX show RouteWarden introduces **less than 50 microseconds (< 0.05ms)** of overhead on standard HTTP requests:
* Regex patterns are pre-compiled at startup into optimized RE2 finite automata.
* Fast-path byte checking validates request methods and path prefixes before regex execution.
* IP allowlists use binary radix tree CIDR lookups ($O(1)$ complexity).
* No external network calls, database lookups, or thread locks occur during request evaluation.

---

## Threat Detection & Patterns

### What does RouteWarden block by default?

When `enableDefaultPatterns: true` is active, RouteWarden blocks over 250 common scanner targets grouped into 7 categories:

<CodeViewer :snippets="defaultDictSnippets" />

For the complete list and interactive tests, visit the [Interactive Pattern Checker](/tools/pattern-checker).

---

### How does Anti-Evasion Normalization prevent bypasses?

Attackers frequently encode paths to sneak past basic reverse proxy rules. RouteWarden runs all paths through a strict 5-stage anti-evasion normalization pipeline before pattern matching:

1. **Recursive Percent-Decoding**: Neutralizes multi-layered percent encoding (`/%252e%252e/` $\to$ `/../` $\to$ `/`).
2. **Path Traversal Resolution**: Resolves relative path segments (`/static/../../.env` $\to$ `/.env`).
3. **Matrix Parameter Stripping**: Removes path parameters (`/;param=1/.env` $\to$ `/.env`).
4. **Separator Normalization**: Converts backslashes to forward slashes (`\admin\.env` $\to$ `/admin/.env`) and collapses consecutive slashes (`///.env` $\to$ `/.env`).
5. **Null-Byte & Control Character Stripping**: Removes poison null bytes (`/.env%00.png` $\to$ `/.env`).

Learn more in the [Anti-Evasion Normalization Deep Dive](/core/anti-evasion).

---

### Will RouteWarden block Let's Encrypt / ACME challenges (`.well-known`)?

**No.** RouteWarden includes a built-in exemption for ACME certificate validation:

<CodeViewer :snippets="acmeExemptionSnippets" />

Legitimate requests from Let's Encrypt, ZeroSSL, or cert-manager to `/.well-known/acme-challenge/*` pass through unconditionally, ensuring automated TLS renewal is never disrupted.

---

### How do I add custom block patterns or regexes?

You can supply custom rules via `customBlockPatterns` or `blockPatterns`. Select your gateway below:

<CodeViewer :snippets="customPatternSnippets" />

---

### How do I whitelist a false positive or legitimate public file?

Use `allowPatterns` (or `customAllowPatterns`). Rules in the allowlist are evaluated **before** block rules, guaranteeing that matching requests bypass inspection:

<CodeViewer :snippets="allowPatternSnippets" />

---

## Response Modes & Active Defense

### What response modes does RouteWarden support?

RouteWarden provides **13 distinct response actions**, ranging from standard HTTP rejections to active defense deceptions:

| Mode | HTTP Status | Action / Behavior | Best Used For |
| :--- | :--- | :--- | :--- |
| `block` | `403` | Standard RFC 403 Forbidden with custom security headers. | Default public APIs and corporate gateways. |
| `fake404` | `404` | Returns a sterile Not Found page, concealing middleware existence. | Preventing reconnaissance and fingerprinting. |
| `silentDrop` | None | Instantly closes TCP socket with `TCP RST` (or `0` byte read). | Exhausting bot connection pools and socket limits. |
| `delay` | `403` | Sleeps for a configured duration (e.g., 5s) before returning 403. | Slowing down high-velocity automated scanners. |
| `tarpit` | `200` | Trickles single bytes every few seconds to keep scanner threads frozen. | Paralyzing single-threaded scanning scripts. |
| `redirect` | `301/302` | Sends the attacker to a honeypot, FBI warning, or Rickroll. | Psychological defense and threat diversion. |
| `customJson` | `403` | Emits a structured JSON error payload matching your API schema. | REST and GraphQL backends. |
| `customHtml` | `403` | Renders a branded HTML security barrier with support contacts. | User-facing web applications. |
| `honeypot` | `200` | Responds with realistic fake secrets (canary AWS/Stripe keys). | Attacker attribution and automated alerting. |
| `ratelimit` | `429` | Throttles excessive sensitive path probes with standard `Retry-After`. | Thwarting brute-force and dictionary attacks. |
| `captchaTurnstile` | `200` | Challenges client with Cloudflare Turnstile before allowing access. | Protecting admin panels without static IP limits. |
| `captchaHcaptcha` | `200` | Challenges client with hCaptcha interactive verification. | Privacy-focused bot verification. |
| `gzipBomb` | `200` | Emits a 10MB recursive gzip bomb that inflates to 10GB in client RAM. | Crashing aggressive vulnerability scrapers. |

See the [Response Modes Reference](/core/response-modes) for setup syntax and configuration details for each mode.

---

### How does the `gzipBomb` response mode work? Is it dangerous for my server?

The `gzipBomb` response serves an ultra-compressed **10 KB HTTP payload** that inflates to over **10 GB of zeros** when decompressed into the memory of an automated scraper or curl script.

* **Server-side footprint**: Minimal. The compressed 10 KB file is pre-generated in memory; your server streams the small byte slice without CPU spike or disk I/O.
* **Client-side impact**: Scanners running Python `requests`, Go HTTP clients, or headless browsers that automatically decode gzip responses will suffer immediate memory exhaustion (`OOM kill`) or CPU freeze.

> [!WARNING]
> Use `gzipBomb` exclusively on paths that legitimate visitors never request (such as `/.env`, `/backup.sql`, or `/.git/config`).

---

## IP Allowlisting & Trusted Proxies

### How do I whitelist my office, VPN, or Docker internal network?

Add specific IP addresses or CIDR ranges to `allowedIps`:

<CodeViewer :snippets="ipAllowlistSnippets" />

Requests from these addresses bypass all inspection rules immediately.

---

### How does RouteWarden prevent `X-Forwarded-For` spoofing?

Attackers frequently send headers like `X-Forwarded-For: 127.0.0.1` hoping naive middlewares will treat them as local traffic.

RouteWarden includes a **Trusted Proxies Engine**:
1. When `trustedProxies` is configured, RouteWarden inspects the physical socket connection address (`RemoteAddr`).
2. If `RemoteAddr` belongs to a trusted proxy CIDR (such as Cloudflare or your internal load balancer), RouteWarden parses `X-Forwarded-For` from right to left to locate the verified client IP.
3. If `RemoteAddr` is **not** in `trustedProxies`, RouteWarden ignores all incoming forwarding headers and treats `RemoteAddr` as the authoritative client IP.

<CodeViewer :snippets="trustedProxiesSnippets" />

---

## Layer 4 (TCP Warden)

### What is TCP Warden, and how does it relate to HTTP RouteWarden?

While Traefik, Caddy, and NGINX handle Layer 7 (HTTP/HTTPS) web applications, **TCP Warden** is a dedicated Layer 4 reverse proxy and protocol firewall designed for non-HTTP infrastructure.

It sits in front of ports like:
* `:22` (SSH)
* `:25`, `:587`, `:993` (SMTP, IMAP mail servers)
* `:5432` (PostgreSQL), `:3306` (MySQL), `:6379` (Redis)
* `:53` (DNS over UDP and TCP)
* `:25565` (Minecraft and game servers)

It performs wire-level protocol handshake inspection, connection rate limiting, GeoIP fences, and tarpits before handoffs reach the underlying server. Read the [TCP Warden Guide](/tcp/) for architecture and plugin details.

---

### What is a Tarpit in TCP Warden?

A **Tarpit** accepts an attacker's TCP connection but deliberately throttles data transmission to a crawl (e.g., sending 1 byte every 10 seconds). 

Because bots and brute-force tools (like `hydra`, `nmap`, or SSH scanners) allocate connection threads and wait for responses, a tarpit holds their sockets open for minutes or hours, consuming the attacker's resources while using virtually zero CPU or memory on your server.

---

## Observability & Dashboard

### How does the RouteWarden Security Dashboard work?

RouteWarden provides an out-of-the-box observability stack composed of:
1. **Grafana Alloy**: Discovers RouteWarden containers or tails log files, enriches events with MaxMind GeoIP country codes, and ships structured records to Loki.
2. **Grafana Loki**: High-efficiency append-only log aggregator indexing labels (`verdict`, `gateway`, `country_code`, `client_ip`).
3. **Pre-built Grafana Dashboard**: Includes real-time threat maps, threat share charts, top attacking IPs, and an interactive threat incident triage table.

Start the stack with a single command:

<CodeViewer :snippets="dashboardStartSnippets" />

---

### Why were countries not showing on my dashboard, and how do I fix it?

Country resolution requires two components:
1. **GeoLite2 Database**: Alloy needs a valid `GeoLite2-Country.mmdb` mounted in `/etc/alloy/geoip`. RouteWarden automatically downloads this via the `geoip-init` container.
2. **Public vs Private IPs**: Local addresses (`127.0.0.1`, `10.x.x.x`, `192.168.x.x`) are tagged as `LAN` by design because private subnets do not have geographical coordinates.

If you recently updated Alloy or mounted the database, you can replay existing Loki logs through Alloy to backfill country codes:

<CodeViewer :snippets="replayLogsSnippets" />

---

### Does Grafana Alloy scrape all Docker containers on my host?

**No.** RouteWarden Alloy discovery uses a **strict opt-in model**. It only ingests logs from containers that declare:

<CodeViewer :snippets="containerOptInSnippets" />

Or containers monitored via the dedicated UDP syslog listener (`127.0.0.1:1514`). Unlabeled containers and host services are completely ignored.

---

## CLI (`rwarden`) & CI/CD

### What can I do with the `rwarden` CLI?

The `rwarden` CLI is a cross-platform command-line tool for developers and SecOps teams:

* **Offline Pattern Testing**: Test paths against RouteWarden normalization without running a live server (`rwarden check "/.env"`).
* **Configuration Validation & Linting**: Validate `routewarden.json` against the JSON schema (`rwarden schema validate`).
* **Config Snippet Generation**: Output production-ready Traefik, Caddy, NGINX, or Docker Compose snippets (`rwarden generate --gateway traefik`).
* **Observability Management**: Launch and monitor the local Grafana/Loki security dashboard (`rwarden dashboard up`).

Install it with the universal installer script or from source:

<CodeViewer :snippets="cliInstallSnippets" />

---

### Can I run `rwarden check` in GitHub Actions or CI/CD?

**Yes.** You can integrate `rwarden` into pull request workflows to prevent developers from accidentally committing configurations that expose protected paths:

<CodeViewer :snippets="githubActionsSnippets" />

---

## Troubleshooting & Support

### A legitimate user request is getting blocked (403/404). How do I diagnose it?

1. **Test the path with CLI and apply the allowlist fix**:

<CodeViewer :snippets="diagnoseSnippets" />

2. **Check the Incident Triage Table**:
   Open Grafana (`http://localhost:3000`), navigate to the **Interactive Threat Incident Triage Table (Panel 50)**, and filter by the client IP or path to see the exact rule ID and timestamp.

---

### Where do I ask questions, report bugs, or request features?

* **GitHub Discussions & Issues**: [github.com/routewarden](https://github.com/routewarden)
* **Product Hunt Community**: Share feedback and engage with the maintainers.
* **Security Advisories**: To report a security vulnerability responsibly, please submit a private report via **GitHub Security Advisories** on the relevant repository or review our [Security Policy](https://github.com/routewarden/.github/blob/main/.github/SECURITY.md).
