---
title: Offline ASN-Based Filtering & Allowlisting
description: Complete guide to Autonomous System Number (ASN) allowlisting and admission gating across Traefik, Caddy, NGINX, and TCP Warden using offline routing snapshots.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

// ─── 1. Build Snapshot Snippet ──────────────────────────────────────────────
const build_cmd = buildSnippet({
  lang: 'bash',
  code: `# 1. Download GeoLite2 or GeoIP2 ASN CSV archives from MaxMind
# Unpack GeoLite2-ASN-Blocks-IPv4.csv and GeoLite2-ASN-Blocks-IPv6.csv

# 2. Compile into an optimized offline JSON routing snapshot:
python3 scripts/build-asn-db.py -o /etc/routewarden/asn.json \\
  GeoLite2-ASN-Blocks-IPv4.csv GeoLite2-ASN-Blocks-IPv6.csv

# 3. Verify snapshot file structure:
head -n 12 /etc/routewarden/asn.json`,
})

const db_json = buildSnippet({
  lang: 'json',
  code: `{
  "64500": [
    "192.0.2.0/24",
    "2001:db8::/32"
  ],
  "64501": [
    "2001:db8:1::/48"
  ],
  "13335": [
    "173.245.48.0/20",
    "103.21.244.0/22",
    "2400:cb00::/32"
  ]
}`,
})

const buildSnippets = computed(() => ({
  cli: [
    { filename: 'build-asn-db.sh', lang: 'bash', code: build_cmd.cleanCode, html: build_cmd.html, hasDiff: false },
    { filename: 'asn.json (Snapshot Format)', lang: 'json', code: db_json.cleanCode, html: db_json.html, hasDiff: false },
  ],
}))

// ─── 2. HTTP Gateway Snippets ───────────────────────────────────────────────
const traefik_cfg = buildSnippet({
  lang: 'yaml',
  code: `# dynamic_conf.yml
http:
  middlewares:
    asn-shield:
      plugin:
        routewarden:
          enabled: true
          # List of allowed ASNs (accepts "64500" or "AS64500") # [!code ++]
          allowedASNs: # [!code ++]
            - "AS13335" # Cloudflare # [!code ++]
            - "64500"   # Corporate WAN # [!code ++]
          # Path to the mounted JSON routing snapshot # [!code ++]
          asnDB: /etc/routewarden/asn.json # [!code ++]
          # Upstream reverse proxies trusted for X-Forwarded-For resolution
          trustedProxies:
            - "10.0.0.0/8"
            - "172.16.0.0/12"
          response:
            mode: json
            statusCode: 403`,
})

const caddy_cfg = buildSnippet({
  lang: 'caddy',
  code: `# Caddyfile
example.com {
    route {
        routewarden {
            # Allowed ASN identifiers (case-insensitive) # [!code ++]
            allowed_asns AS13335 64500 # [!code ++]
            # Offline JSON snapshot path # [!code ++]
            asn_db /etc/routewarden/asn.json # [!code ++]
            # Trusted proxy CIDRs for real client IP extraction
            trusted_proxies 10.0.0.0/8 172.16.0.0/12
            response {
                mode json
                status_code 403
            }
        }
        reverse_proxy app:8080
    }
}`,
})

const nginx_cfg = buildSnippet({
  lang: 'lua',
  code: `-- nginx.conf (init_by_lua_block)
local routewarden = require("resty.routewarden")

warden = routewarden.new({
    -- Allowed ASN list # [!code ++]
    allowed_asns = { "AS13335", "64500" }, -- [!code ++]
    -- Offline JSON snapshot path # [!code ++]
    asn_db = "/etc/routewarden/asn.json", -- [!code ++]
    -- Trusted proxy subnets
    trusted_proxies = { "10.0.0.0/8", "172.16.0.0/12" },
    response = {
        mode = "json",
        status_code = 403
    }
})`,
})

const cli_cfg = buildSnippet({
  lang: 'json',
  code: `{
  "$schema": "https://routewarden.github.io/schema.json",
  "enabled": true,
  "allowedASNs": [
    "AS13335",
    "64500"
  ],
  "asnDB": "/etc/routewarden/asn.json",
  "trustedProxies": [
    "10.0.0.0/8"
  ],
  "response": {
    "mode": "json",
    "statusCode": 403
  }
}`,
})

const gatewaySnippets = computed(() => ({
  traefik: [
    { filename: 'traefik.yml', lang: 'yaml', code: traefik_cfg.cleanCode, html: traefik_cfg.html, hasDiff: traefik_cfg.hasDiff },
  ],
  caddy: [
    { filename: 'Caddyfile', lang: 'caddy', code: caddy_cfg.cleanCode, html: caddy_cfg.html, hasDiff: caddy_cfg.hasDiff },
  ],
  nginx: [
    { filename: 'nginx-lua.conf', lang: 'lua', code: nginx_cfg.cleanCode, html: nginx_cfg.html, hasDiff: nginx_cfg.hasDiff },
  ],
  cli: [
    { filename: 'routewarden.json', lang: 'json', code: cli_cfg.cleanCode, html: cli_cfg.html, hasDiff: false },
  ],
}))

// ─── 3. TCP Warden Snippet ──────────────────────────────────────────────────
const tcp_cfg = buildSnippet({
  lang: 'yaml',
  code: `# tcp-warden.yaml
global:
  max_connections: 10000
  # Global routing snapshot database # [!code ++]
  asn_db: /etc/routewarden/asn.json # [!code ++]
  # Global default allowed ASNs (e.g. corporate WAN) # [!code ++]
  allowed_asns: # [!code ++]
    - "64500" # [!code ++]
  log_level: "warn"
  log_file: "/var/log/routewarden/tcp-warden.jsonl"

services:
  # Inherits global.allowed_asns (only AS64500 is admitted)
  internal_postgres:
    listen: ":5432"
    upstream: "10.0.1.20:5432"
    protocol: "postgres"
    response:
      mode: "reject"

  # Explicit service override: replaces global allowed_asns # [!code ++]
  partner_api: # [!code ++]
    listen: ":8443"
    upstream: "127.0.0.1:9443"
    protocol: "tcp"
    transport: "both" # TCP and UDP
    allowed_asns: # [!code ++]
      - "AS13335" # Cloudflare # [!code ++]
      - "64501"   # Dedicated Partner ASN # [!code ++]
    response:
      mode: "drop"`,
})

const tcpSnippets = computed(() => ({
  cli: [
    { filename: 'tcp-warden.yaml', lang: 'yaml', code: tcp_cfg.cleanCode, html: tcp_cfg.html, hasDiff: tcp_cfg.hasDiff },
  ],
}))
</script>

# Offline ASN-Based Filtering & Allowlisting

Routewarden supports **Autonomous System Number (ASN) based filtering** across all gateway plugins (**Traefik Warden**, **Caddy Warden**, **NGINX Warden**) and Layer 4 proxy infrastructure (**TCP Warden** and the CLI daemon).

ASN filtering allows security teams and DevOps operators to allowlist or admit traffic originating from entire telecommunications providers, cloud platforms (e.g., AWS, GCP, Cloudflare, Fastly), or corporate WANs without maintaining brittle, constantly churning lists of thousands of individual IP prefixes.

---

## Key Highlights

- **100% Offline & In-Memory**: ASN routing data is compiled into a local JSON routing snapshot and loaded into memory at startup. **Zero DNS queries and zero runtime HTTP calls** occur during live traffic inspection.
- **Hierarchical Longest-Prefix Matching**: Evaluates routes using longest-prefix radix matching. If an allowed parent network delegates a more specific `/24` or `/48` subnet to another ASN, the child route **does not** inherit the parent's bypass.
- **Conflict Prevention**: Snapshots containing conflicting origin declarations for the exact same prefix are rejected during startup validation.
- **Dual-Stack IPv4 & IPv6**: Seamlessly supports standard IPv4, IPv6, and IPv4-mapped IPv6 client addresses (`::ffff:192.0.2.1`).
- **Resilient & Anti-Spoofing**: Client-supplied ASN headers (e.g. `CF-Connecting-ASN`, `X-Forwarded-ASN`) are **never trusted**. Routewarden strictly analyzes verified socket peer addresses or sanitized proxy forwarding headers via `trustedProxies` / `trusted_proxies`.

---

## Behavioral Semantics: HTTP vs Layer 4

Routewarden employs deliberately distinct semantics between HTTP reverse proxy middleware and Layer 4 proxy shields:

| Dimension | HTTP Gateways (Traefik, Caddy, NGINX) | Layer 4 Proxy (TCP Warden / CLI Proxy) |
| :--- | :--- | :--- |
| **Primary Role** | **Inspection Allowlist / Bypass** | **Admission Gate & Perimeter Shield** |
| **ASN Match** | Bypasses path and body inspection (identical to `allowed_ips`). | **Admitted to security pipeline**. Connection is still evaluated against IP filters, geo-blocking, rate limits, CrowdSec, and protocol guards. |
| **ASN Non-Match** | **Continues normal inspection**. Benign requests to legitimate paths pass through unhindered; malicious probes are blocked. | **Connection Rejected Immediately**. Emits `asn_denied` security audit event. |
| **Unknown Origin (Private / RFC 1918)** | Evaluated as an unknown ASN; continues to normal HTTP path inspection. | **Rejected**. Private addresses absent from the snapshot are denied admission unless listed in `ip_filter.allow`. |
| **Configuration Keys** | `allowedASNs`, `asnDB` (camelCase / snake_case) | `asn_db`, `allowed_asns` (global & per-service) |

---

## 1. Building the Routing Snapshot

Routewarden ASN resolution relies on an offline JSON snapshot file created with the bundled Python 3 utility `scripts/build-asn-db.py`.

### Step-by-Step Generation

1. Download the free **GeoLite2 ASN CSV** (or commercial **GeoIP2 ASN CSV**) archive from MaxMind:
   - `GeoLite2-ASN-Blocks-IPv4.csv`
   - `GeoLite2-ASN-Blocks-IPv6.csv`
2. Run `scripts/build-asn-db.py` to compile the IPv4 and IPv6 block CSVs into a unified snapshot:

<CodeViewer :snippets="buildSnippets" />

### Snapshot Database Properties

- **File Format**: A compact JSON object mapping ASN strings (e.g. `"64500"`) to arrays of CIDR strings (`["192.0.2.0/24", "2001:db8::/32"]`).
- **Snapshot Immutability**: The routing database is read into memory at process boot. To update routing tables in production, rebuild the JSON file and restart the gateway container or recreate the middleware instance.
- **Container Deployments**: Mount `/etc/routewarden/asn.json` into your gateway or proxy container as a read-only volume (`:ro`).

---

## 2. HTTP Reverse Proxy Middleware

In **Traefik**, **Caddy**, and **NGINX**, an ASN match acts as an allowlist exemption identical to `allowed_ips`:
- Matching clients bypass sensitive file checks, query string inspections, and honeypot triggers.
- Non-matching clients continue through regular pattern analysis. Legitimate public traffic is served normally, while scanners probing for `.env`, `.git`, or SQL dumps receive your configured defense response.

### Configuration Across Gateways

<CodeViewer :snippets="gatewaySnippets" />

### Configuration Syntax Reference

#### Traefik Warden
- `allowedASNs`: `[]string` — List of ASN strings (e.g. `["AS13335", "64500"]`). Case-insensitive.
- `asnDB`: `string` — Absolute filesystem path to the compiled `asn.json` routing snapshot.
- `trustedProxies`: `[]string` — Upstream proxy CIDRs. When set, evaluates the sanitized client IP from `X-Forwarded-For`. Without this setting, evaluates the direct TCP peer socket.
- Dynamic JSON configurations (`configFile`) accept both `allowedASNs` / `asnDB` and `allowed_asns` / `asn_db`.

#### Caddy Warden
- `allowed_asns <asns...>`: Directive in `routewarden { ... }` block.
- `asn_db <path>`: Directive pointing to the routing snapshot file.
- `trusted_proxies <cidrs...>`: Trusted proxy CIDR blocks.
- **Clearing Inherited Lists**: Declaring a bare `allowed_asns` directive with no arguments in a nested block explicitly clears an inherited allowlist.
- Native Caddy JSON API accepts `allowed_asns` and `asn_db`.

#### NGINX Warden (OpenResty)
- `allowed_asns = { "AS13335", "64500" }`: Lua table inside `routewarden.new({ ... })`.
- `asn_db = "/etc/routewarden/asn.json"`: Path to snapshot file.
- `trusted_proxies = { "10.0.0.0/8" }`: CIDRs trusted for `X-Forwarded-For`.
- Shared JSON policy files accept camelCase and snake_case aliases.

#### Routewarden CLI & Simulator
- `routewarden.json` schema supports `"allowedASNs"` and `"asnDB"`.
- Running `rwarden test --path "/.env" --ip 192.0.2.1` evaluates ASN routing rules offline and reports `verdict: "ALLOW"` with reason `asn_whitelisted`.
- Running `rwarden generate` translates ASN rules into valid Traefik YAML/TOML, Caddyfile blocks, NGINX Lua tables, and TCP Warden YAML.

---

## 3. Layer 4 Admission Gating (TCP Warden)

In **TCP Warden** and the CLI daemon proxy (`rwarden tcp`), ASN allowlisting operates as an **Admission Gate**:

<CodeViewer :snippets="tcpSnippets" />

### Admission Gate Mechanics

1. **Perimeter Admission**:
   - When an effective ASN allowlist is active, incoming TCP connections or UDP datagrams must originate from an ASN in the allowlist.
   - Connections from non-matching ASNs or unknown origins (such as private RFC 1918 subnets not declared in the snapshot) are **denied admission** immediately according to `response.mode` (`drop`, `reject`, `silent`, or `tarpit`).
   - Rejections emit structured security audit events:
     ```json
     {
       "timestamp": "2026-10-27T08:00:00Z",
       "event": "asn_denied",
       "service": "internal_postgres",
       "client_ip": "198.51.100.99",
       "asn": "64599",
       "action": "reject"
     }
     ```
2. **Deep Pipeline Defense**:
   - Matching an allowed ASN merely admits the client to the proxy pipeline.
   - **It does not bypass security**: The connection is still evaluated against IP filter rules (`ip_filter`), country blocks (`geo_block`), rate limits (`rate_limit`), persistent bans, CrowdSec threat intelligence (`crowdsec`), and protocol-specific payload validation (SSH banner checks, Redis command filtering, SMTP sender domain blocks).
3. **Inheritance & Overrides**:
   - If a service defines its own `allowed_asns`, it **replaces** the `global.allowed_asns` list for that service.
   - If a service leaves `allowed_asns` empty or omitted, it inherits `global.allowed_asns`.
   - To admit internal private networks (e.g. `10.0.0.0/8`) alongside an ASN allowlist, specify them in `ip_filter.allow`.

---

## Troubleshooting & Best Practices

> [!TIP]
> **Keep All ASNs in the Snapshot**
> Do not prune un-allowed ASNs when creating `asn.json`. Longest-prefix matching depends on the presence of more specific routes owned by other ASNs to prevent inadvertent bypasses of parent subnets.

> [!WARNING]
> **Private IP Addresses & Layer 4 Admission**
> MaxMind ASN databases do not include private RFC 1918 addresses (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`). In TCP Warden, if you configure an ASN admission gate and clients connect over private networks or VPNs, declare those private CIDRs in `ip_filter.allow` so they are not rejected with `asn_denied`.

> [!IMPORTANT]
> **Mounting Paths Across Containers**
> Paths specified in `asnDB` / `asn_db` are resolved relative to the container filesystem. Ensure the JSON snapshot is mounted at the exact destination specified in your configuration (e.g., `-v /opt/routewarden/asn.json:/etc/routewarden/asn.json:ro`).
