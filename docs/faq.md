---
title: Frequently Asked Questions (FAQ)
description: Answers to common questions about RouteWarden edge defense, anti-evasion normalization, response modes, Layer 4 TCP Warden, IP allowlisting, and observability.
---

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

```
├── Environment Files     (.env, .env.local, .env.production, docker-compose.yml)
├── Version Control       (.git, .svn, .hg, .bzr, .gitattributes, .gitmodules)
├── Backups & Archives    (.bak, .backup, .old, .orig, .tar.gz, .sql.gz, dump.sql)
├── Cloud & Credentials   (.aws/credentials, .kube/config, id_rsa, id_ed25519)
├── Server Info & Debug   (phpinfo.php, server-status, _profiler, /actuator)
├── OS & Editor Artifacts (.DS_Store, Thumbs.db, *~, #*#, .idea, .vscode)
└── Database Management   (pma, phpmyadmin, adminer.php, myadmin)
```

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
```
^/.well-known/acme-challenge/.*
```
Legitimate requests from Let's Encrypt, ZeroSSL, or cert-manager to `/.well-known/acme-challenge/*` pass through unconditionally, ensuring automated TLS renewal is never disrupted.

---

### How do I add custom block patterns or regexes?

You can supply custom rules via `customBlockPatterns` or `blockPatterns`. Patterns support both simple glob wildcards and full RE2 regular expressions:

::: code-group
```yaml [Traefik (YAML)]
experimental:
  plugins:
    routewarden:
      moduleName: "github.com/routewarden/route-warden"
      version: "v1.5.0"

http:
  middlewares:
    my-shield:
      plugin:
        routewarden:
          customBlockPatterns:
            - "^/internal-api/.*"
            - "(?i)\\.(log|conf|ini|key)$"
            - "^/wp-login\\.php$"
```

```caddyfile [Caddy (Caddyfile)]
:443 {
    route {
        route_warden {
            custom_block_patterns ^/internal-api/.* (?i)\.(log|conf|ini|key)$ ^/wp-login\.php$
        }
        reverse_proxy app:8080
    }
}
```

```lua [NGINX (OpenResty)]
access_by_lua_block {
    local rw = require("routewarden")
    rw.check({
        custom_block_patterns = {
            "^/internal-api/.*",
            "(?i)\\.(log|conf|ini|key)$",
            "^/wp-login\\.php$"
        }
    })
}
```
:::

---

### How do I whitelist a false positive or legitimate public file?

Use `allowPatterns` (or `customAllowPatterns`). Rules in the allowlist are evaluated **before** block rules, guaranteeing that matching requests bypass inspection:

```yaml
# Allow sample configuration file for public downloads
allowPatterns:
  - "^/downloads/sample\\.env$"
  - "^/public/documentation/.*\\.sql$"
```

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

```yaml
allowedIps:
  - "127.0.0.1"          # Localhost loopback
  - "10.0.0.0/8"          # Internal corporate LAN
  - "172.16.0.0/12"       # Docker bridge network
  - "192.168.1.0/24"      # Office subnet
  - "100.64.0.0/10"       # Tailscale / NetBird CGNAT subnet
```

Requests from these addresses bypass all inspection rules immediately.

---

### How does RouteWarden prevent `X-Forwarded-For` spoofing?

Attackers frequently send headers like `X-Forwarded-For: 127.0.0.1` hoping naive middlewares will treat them as local traffic.

RouteWarden includes a **Trusted Proxies Engine**:
1. When `trustedProxies` is configured, RouteWarden inspects the physical socket connection address (`RemoteAddr`).
2. If `RemoteAddr` belongs to a trusted proxy CIDR (such as Cloudflare or your internal load balancer), RouteWarden parses `X-Forwarded-For` from right to left to locate the verified client IP.
3. If `RemoteAddr` is **not** in `trustedProxies`, RouteWarden ignores all incoming forwarding headers and treats `RemoteAddr` as the authoritative client IP.

```yaml
# Only trust X-Forwarded-For headers coming from Cloudflare or internal ingress
trustedProxies:
  - "173.245.48.0/20"
  - "103.21.244.0/22"
  - "10.0.0.0/8"
```

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
```bash
rwarden dashboard up
```

---

### Why were countries not showing on my dashboard, and how do I fix it?

Country resolution requires two components:
1. **GeoLite2 Database**: Alloy needs a valid `GeoLite2-Country.mmdb` mounted in `/etc/alloy/geoip`. RouteWarden automatically downloads this via the `geoip-init` container.
2. **Public vs Private IPs**: Local addresses (`127.0.0.1`, `10.x.x.x`, `192.168.x.x`) are tagged as `LAN` by design because private subnets do not have geographical coordinates.

If you recently updated Alloy or mounted the database, you can replay existing Loki logs through Alloy to backfill country codes:
```bash
curl -G -s "http://localhost:3100/loki/api/v1/query_range" \
  --data-urlencode 'query={app="routewarden"}' \
  --data-urlencode 'limit=5000' \
  | jq -r '.data.result[].values[][1]' \
  | while IFS= read -r line; do
      echo "$line" | nc -u -w0 127.0.0.1 1514
      sleep 0.005
    done
```

---

### Does Grafana Alloy scrape all Docker containers on my host?

**No.** RouteWarden Alloy discovery uses a **strict opt-in model**. It only ingests logs from containers that declare:
```yaml
labels:
  - "routewarden.logs=true"
```
Or containers monitored via the dedicated UDP syslog listener (`127.0.0.1:1514`). Unlabeled containers and host services are completely ignored.

---

## CLI (`rwarden`) & CI/CD

### What can I do with the `rwarden` CLI?

The `rwarden` CLI is a cross-platform command-line tool for developers and SecOps teams:

* **Offline Pattern Testing**: Test paths against RouteWarden normalization without running a live server (`rwarden check "/.env"`).
* **Configuration Validation & Linting**: Validate `routewarden.json` against the JSON schema (`rwarden schema validate`).
* **Config Snippet Generation**: Output production-ready Traefik, Caddy, NGINX, or Docker Compose snippets (`rwarden generate --gateway traefik`).
* **Observability Management**: Launch and monitor the local Grafana/Loki security dashboard (`rwarden dashboard up`).

Install it with Homebrew or curl:
```bash
brew install routewarden/tap/rwarden
# Or via curl
curl -fsSL https://routewarden.github.io/install.sh | sh
```

---

### Can I run `rwarden check` in GitHub Actions or CI/CD?

**Yes.** You can integrate `rwarden` into pull request workflows to prevent developers from accidentally committing configurations that expose protected paths:

```yaml
name: Security Lint
on: [push, pull_request]

jobs:
  routewarden:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install RouteWarden CLI
        run: |
          curl -fsSL https://routewarden.github.io/install.sh | sh
      - name: Test Critical Endpoints
        run: |
          rwarden check "/.env" --expect-block
          rwarden check "/.git/config" --expect-block
          rwarden check "/api/v1/health" --expect-allow
```

---

## Troubleshooting & Support

### A legitimate user request is getting blocked (403/404). How do I diagnose it?

1. **Test the path with CLI**:
   ```bash
   rwarden check "/path/to/resource" --debug
   ```
   The output will display the normalized path and identify which specific regex pattern triggered the block.

2. **Add an allow pattern**:
   Once identified, whitelist the path in your gateway configuration:
   ```yaml
   allowPatterns:
     - "^/path/to/resource$"
   ```

3. **Check the Incident Triage Table**:
   Open Grafana (`http://localhost:3000`), navigate to the **Interactive Threat Incident Triage Table (Panel 50)**, and filter by the client IP or path to see the exact rule ID and timestamp.

---

### Where do I ask questions, report bugs, or request features?

* **GitHub Discussions & Issues**: [github.com/routewarden](https://github.com/routewarden)
* **Product Hunt Community**: Share feedback and engage with the maintainers.
* **Security Advisories**: To report a security vulnerability responsibly, please email `security@routewarden.dev` or file a private GitHub Advisory.
