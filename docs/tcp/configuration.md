---
title: TCP Warden Configuration Reference
description: Comprehensive configuration reference for tcp-warden.yaml, including rate limiting, geo-blocking, protocol guards, and JSON schema validation.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

// ─── Global Schema Snippet ───────────────────────────────────────────────────
const global_schema = buildSnippet({
  lang: 'yaml',
  code: `# yaml-language-server: $schema=https://routewarden.github.io/tcp-warden/tcp-warden.schema.json

global:
  max_connections: 10000
  ban_duration: "1h"
  ban_after_failures: 5
  tarpit_ms: 1000
  log_level: "warn"
  log_file: "/var/log/routewarden/tcp-warden.jsonl"
  geoip_db: "/etc/routewarden/GeoLite2-Country.mmdb"
  asn_db: "/etc/routewarden/asn.json"
  allowed_asns:
    - "64500"
  ip_filter:
    allow:
      - "127.0.0.1/32"
      - "10.0.0.0/8"
    deny:
      - "198.51.100.0/24"
  geo_block:
    deny_countries:
      - "KP"
    allow_countries: []

api:
  enabled: true
  listen: "127.0.0.1:9091"
  # Optional: Unix domain socket for local IPC (no open TCP ports needed)
  socket: "/var/run/routewarden/tcp-warden.sock"
  socket_mode: "0666"

# Optional: CrowdSec LAPI Bouncer (disabled by default)
# crowdsec:
#   enabled: true
#   lapi_url: "http://127.0.0.1:8080"
#   api_key: "\${CROWDSEC_API_KEY}"
#   update_frequency: "10s"
#   fallback_action: "ban"

plugins:
  postgres:
    enabled: true
    source: "https://github.com/routewarden/plugins/postgres"
  redis:
    enabled: true
    source: "https://github.com/routewarden/plugins/redis"
  tls_sni:
    enabled: true
    source: "https://github.com/routewarden/plugins/tls_sni"`
})

// ─── Services Examples ────────────────────────────────────────────────────────
const ssh_service = buildSnippet({
  lang: 'yaml',
  code: `services:
  ssh_bastion:
    listen: ":2222"
    upstream: "127.0.0.1:22"
    protocol: "ssh"
    rate_limit:
      connections_per_minute: 20
      burst: 5
    ip_filter:
      allow:
        - "10.0.0.0/8"
        - "192.168.1.0/24"
      deny: []
    geo_block:
      deny_countries:
        - "RU"
        - "CN"
      allow_countries: []
    max_auth_failures: 3
    ban_after_failures: 3
    ban_duration: "2h"
    response:
      mode: "reject"
    ssh:
      banner: "Routewarden SSH Guard"
      max_auth_tries: 3`
})

const smtp_service = buildSnippet({
  lang: 'yaml',
  code: `services:
  mail_guard:
    listen: ":2525"
    upstream: "127.0.0.1:25"
    protocol: "smtp"
    smtp:
      require_starttls: true
      max_recipients: 50
      blocked_sender_domains:
        - "*.tempmail.com"
        - "spam.org"`
})

const port_range_service = buildSnippet({
  lang: 'yaml',
  code: `services:
  # 1:1 Port Range Mapping (8000 -> 9000, 8001 -> 9001, ..., 8005 -> 9005)
  microservices_1to1:
    listen: ":8000-8005"
    upstream: "10.0.0.10:9000-9005"
    protocol: "tcp"

  # Many-to-One Port Mapping (all ports 8080..8085 route to backend port 80)
  http_gateway_many_to_one:
    listen: ":8080-8085"
    upstream: "10.0.0.20:80"
    protocol: "http"
    plugin_config:
      blocked_paths:
        - "^/admin(/.*)?$"
        - "\\.(env|git|bak|sql)$"
      blocked_headers:
        User-Agent: "(?i)(sqlmap|nikto|acunetix)"`
})

const db_service = buildSnippet({
  lang: 'yaml',
  code: `services:
  db_proxy:
    listen: ":5432"
    upstream: "10.0.0.15:5432"
    protocol: "postgres"
    max_auth_failures: 5
    ban_after_failures: 5
    ban_duration: "1h"

  cache_proxy:
    listen: ":6380"
    upstream: "127.0.0.1:6379"
    protocol: "redis"
    plugin_config:
      blocked_commands:
        - "FLUSHALL"
        - "FLUSHDB"
        - "CONFIG"
        - "SHUTDOWN"`
})

const udp_service = buildSnippet({
  lang: 'yaml',
  code: `services:
  dns_hybrid:
    listen: ":53"
    upstream: "1.1.1.1:53"
    transport: "both"         # Bind both UDP and TCP on port 53
    protocol: "dns"
    rate_limit:
      connections_per_minute: 1200
      burst: 200
    geo_block:
      deny_countries:
        - "KP"
    udp:
      session_timeout: "15s"  # Idle NAT mapping cleanup timeout
      max_sessions: 20000     # Protect host memory from UDP session floods
      read_buffer_size: 4096  # Buffer size per datagram
    plugin_config:
      blocked_domains:
        - "*.badware.test"
      blocked_qtypes:
        - "ANY"
      block_private_ips: true`
})

const configSnippets = computed(() => ({
  tcp: [
    { filename: 'Full Schema', lang: 'yaml', code: global_schema.cleanCode, html: global_schema.html, hasDiff: false },
    { filename: 'UDP & Dual Transport', lang: 'yaml', code: udp_service.cleanCode, html: udp_service.html, hasDiff: false },
    { filename: 'Port Ranges & HTTP', lang: 'yaml', code: port_range_service.cleanCode, html: port_range_service.html, hasDiff: false },
    { filename: 'SSH Guard', lang: 'yaml', code: ssh_service.cleanCode, html: ssh_service.html, hasDiff: false },
    { filename: 'DB & Redis Guard', lang: 'yaml', code: db_service.cleanCode, html: db_service.html, hasDiff: false },
    { filename: 'SMTP Guard', lang: 'yaml', code: smtp_service.cleanCode, html: smtp_service.html, hasDiff: false },
  ]
}))

// ─── Port Range Snippets ────────────────────────────────────────────────────
const port_range_1to1 = buildSnippet({
  lang: 'yaml',
  code: `services:
  # 1:1 Port Range: each ingress port maps to an offset on upstream
  # Port 8000 -> 9000, 8001 -> 9001, ..., 8005 -> 9005
  microservice_fleet:
    listen: ":8000-8005"
    upstream: "10.0.0.10:9000-9005"
    protocol: "tcp"`
})

const port_range_many_to_one = buildSnippet({
  lang: 'yaml',
  code: `services:
  # Many-to-One Port Range: all ingress ports route to a single backend
  # Ports 8080..8085 all forward into a single HTTP gateway or proxy
  http_gateway_fleet:
    listen: ":8080-8085"
    upstream: "10.0.0.20:80"
    protocol: "http"
    plugin_config:
      blocked_paths:
        - "^/admin(/.*)?$"
        - "\\.(env|git|bak|sql)$"
      blocked_headers:
        User-Agent: "(?i)(sqlmap|nikto|acunetix)"`
})

const portRangeSnippets = computed(() => ({
  tcp: [
    { filename: '1:1 Port Mapping', lang: 'yaml', code: port_range_1to1.cleanCode, html: port_range_1to1.html, hasDiff: false },
    { filename: 'Many-to-One Mapping', lang: 'yaml', code: port_range_many_to_one.cleanCode, html: port_range_many_to_one.html, hasDiff: false },
  ]
}))

// ─── Validate Snippets ────────────────────────────────────────────────────────
const validate_rwarden = buildSnippet({
  lang: 'bash',
  code: `# Validate config syntax, CIDRs, duplicate ports, and plugin dependencies
rwarden tcp validate -c /etc/routewarden/tcp-warden.yaml

# Or using general route validation
rwarden validate /etc/routewarden/tcp-warden.yaml

# Output:
# ✓ Configuration /etc/routewarden/tcp-warden.yaml is valid!
#   • Global Max Connections: 10000
#   • Services Configured:    4
#   • CrowdSec Enabled:       true`
})

const validate_standalone = buildSnippet({
  lang: 'bash',
  code: `# Validate config syntax, CIDRs, duplicate ports, and plugin dependencies
tcp-warden validate --config /etc/routewarden/tcp-warden.yaml

# Output:
# ✓ Configuration /etc/routewarden/tcp-warden.yaml is valid!
#   • Global Max Connections: 10000
#   • Services Configured:    4
#   • CrowdSec Enabled:       true`
})

const validate_docker = buildSnippet({
  lang: 'bash',
  code: `# Run validation inside a running Docker container
docker compose exec tcp-warden tcp-warden validate --config /etc/routewarden/tcp-warden.yaml`
})

const validateSnippets = computed(() => ({
  tcp: [
    { filename: 'Unified CLI (rwarden tcp)', lang: 'bash', code: validate_rwarden.cleanCode, html: validate_rwarden.html, hasDiff: false },
    { filename: 'Standalone (tcp-warden)', lang: 'bash', code: validate_standalone.cleanCode, html: validate_standalone.html, hasDiff: false },
    { filename: 'Docker Compose', lang: 'bash', code: validate_docker.cleanCode, html: validate_docker.html, hasDiff: false },
  ]
}))

// ─── Schema Auto-Completion Snippets ─────────────────────────────────────────
const schema_inline = buildSnippet({
  lang: 'yaml',
  code: `# yaml-language-server: $schema=https://routewarden.github.io/tcp-warden/tcp-warden.schema.json

global:
  max_connections: 10000

services:
  ssh_bastion:
    listen: ":2222"
    upstream: "127.0.0.1:22"`
})

const schema_vscode = buildSnippet({
  lang: 'json',
  code: `{
  "yaml.schemas": {
    "https://routewarden.github.io/tcp-warden/tcp-warden.schema.json": "tcp-warden*.yaml"
  }
}`
})

const schemaSnippets = computed(() => ({
  tcp: [
    { filename: 'tcp-warden.yaml', lang: 'yaml', code: schema_inline.cleanCode, html: schema_inline.html, hasDiff: false },
    { filename: '.vscode/settings.json', lang: 'json', code: schema_vscode.cleanCode, html: schema_vscode.html, hasDiff: false },
  ]
}))
</script>

# Configuration Reference

TCP Warden is configured via a single declarative YAML file (default: `tcp-warden.yaml`).

::: tip Schema Auto-Completion
Enable real-time autocomplete, tooltips, and validation in VS Code or JetBrains editors by adding the JSON Schema header at the top of your YAML file or mapping it in your workspace settings:

<CodeViewer :snippets="schemaSnippets" />
:::

---

## Configuration Schema

Full reference with global policy defaults, management API, CrowdSec integration, plugin declarations, and service definitions:

<CodeViewer :snippets="configSnippets" />

---

## Global Settings (`global`)

Daemon-wide defaults for connection limits, ban rules, persistent state, and logging.

| Setting | Type | Default | What it means |
| :--- | :--- | :--- | :--- |
| `max_connections` | `int` | `10000` | Total active connections allowed across all services at once. |
| `ban_duration` | `duration` | `"1h"` | How long an offending IP stays banned (e.g., `"1h"`, `"24h"`). |
| `ban_after_failures` | `int` | `5` | Failed attempts within the sliding window before an IP is banned. |
| `tarpit_ms` | `int` | `1000` | Milliseconds to stall banned or challenged connections before closing. |
| `data_dir` | `string` | `"/var/lib/routewarden"` | Persistent state directory storing SQLite `bans.db` and installed plugins cache. |
| `log_level` | `string` | `"warn"` | Log verbosity: `debug`, `info`, `warn`, `error`, or `off`. See [Log Levels](./log-levels). |
| `log_file` | `string` | — | Path to JSONL audit log file (leave empty to log to stdout). |
| `geoip_db` | `string` | — | Path to MaxMind GeoLite2 Country database (`.mmdb`). |
| `asn_db` | `string` | — | Path to local JSON ASN-to-CIDR routing snapshot file. |
| `allowed_asns` | `[]string` | `[]` | Global list of allowed ASNs (e.g. `["64500", "AS13335"]`). Acts as admission gate. |
| `ip_filter.allow` | `[]CIDR` | `[]` | Subnets that are always allowed (e.g. `["10.0.0.0/8"]`). |
| `ip_filter.deny` | `[]CIDR` | `[]` | Subnets that are always blocked immediately. |
| `geo_block.deny_countries` | `[]string` | `[]` | Two-letter country codes to block (e.g. `["KP"]`). |

---

## Management API (`api`)

Settings for the local HTTP administration, metrics, and SSE live events server (port `9091`).

| Setting | Type | Default | What it means |
| :--- | :--- | :--- | :--- |
| `enabled` | `bool` | `true` | Turns the management HTTP server on or off. |
| `listen` | `string` | `"127.0.0.1:9091"` | Address and port to bind for management API requests (can also be configured via `ROUTEWARDEN_API_LISTEN`). |
| `socket` | `string` | `"/var/run/routewarden/tcp-warden.sock"` | Optional Unix domain socket path for local IPC (can also be configured via `ROUTEWARDEN_API_SOCKET`). |
| `socket_mode` | `string` | `"0666"` | File permission mode for the Unix domain socket. |
| `auth_token` | `string` | — | Optional Bearer authentication token for securing REST and SSE endpoints. |

---

## CrowdSec Bouncer (`crowdsec`) <Badge type="info" text="Optional" />

Connects TCP Warden to your CrowdSec Local API (LAPI) to automatically block malicious IPs.

::: info Optional Integration
Connecting TCP Warden to CrowdSec is completely optional (`enabled: false` by default). TCP Warden functions as a complete standalone Layer 4 proxy and firewall with its own GeoIP blocking, CIDR filters, rate limits, protocol inspectors, failure tracking, and embedded SQLite ban storage.

To set up CrowdSec log ingestion, parsers, scenarios, and bouncers, see the dedicated [CrowdSec Integration Guide](./crowdsec).
:::

| Setting | Type | Default | What it means |
| :--- | :--- | :--- | :--- |
| `enabled` | `bool` | `false` | Enables real-time CrowdSec ban enforcement. |
| `lapi_url` | `string` | — | URL of your CrowdSec instance (e.g. `"http://127.0.0.1:8080"`). |
| `api_key` | `string` | — | Bouncer API key generated via `cscli bouncers add`. |
| `update_frequency` | `duration` | `"10s"` | How often to refresh active ban decisions from CrowdSec. |
| `fallback_action` | `string` | `"ban"` | Action when an IP is flagged: `ban`, `throttle`, or `bypass`. |

---

## Services (`services`)

Each key under `services` defines an isolated Layer 4 proxy listener. Common service fields:

| Field | Type | Description |
| :--- | :--- | :--- |
| `listen` | `string` | Single port (`":2222"`) or port range (`":8000-8005"`). |
| `upstream` | `string` | Backend target: single address (`"127.0.0.1:22"`), single backend for many-to-one ranges (`"10.0.0.1:80"`), or matching 1:1 range (`"10.0.0.1:9000-9005"`). |
| `allowed_asns` | `[]string` | Per-service allowed ASNs. When set, replaces `global.allowed_asns`. Non-matching clients are rejected at perimeter. |
| `transport` | `string` | Network transport: `"tcp"` (default), `"udp"`, or `"both"` (binds both TCP and UDP listeners on the same port, e.g. for DNS on `:53`). |
| `protocol` | `string` | Protocol handler: `ssh`, `smtp`, `pop3`, `imap`, `tcp`, or any loaded plugin name (`dns`, `bittorrent`, `http`, `postgres`, `redis`, etc.). |
| `plugin_config` | `map` | Protocol-specific inspector options passed directly to the active plugin. |
| `rate_limit.connections_per_minute` | `int` | Token-bucket rate: connections (TCP) or packets (UDP) allowed per minute per IP. |
| `rate_limit.burst` | `int` | Maximum burst allowance above the rate limit. |
| `max_auth_failures` | `int` | Maximum auth failures before banning the client IP. |
| `ban_duration` | `duration` | Overrides `global.ban_duration` for this service. |
| `response.mode` | `string` | Rejection strategy for TCP: `reject` | `drop` | `tarpit` | `silent`. (Blocked UDP datagrams are always dropped silently). |
| `udp.session_timeout` | `duration` | Idle timeout before cleaning up a client's UDP NAT/session mapping (default: `"30s"`). |
| `udp.max_sessions` | `int` | Maximum concurrent active UDP client sessions (`0` = unlimited). Protects against session table memory exhaustion. |
| `udp.read_buffer_size` | `int` | Per-datagram socket read buffer in bytes (default: `65535`). |

---

## ASN Admission Gating (`asn_db` & `allowed_asns`)

TCP Warden supports offline Autonomous System Number (ASN) based perimeter admission gating for Layer 4 TCP and UDP services.

```yaml
global:
  asn_db: /etc/routewarden/asn.json
  allowed_asns: ["64500"]

services:
  # Inherits global ASN allowlist (only AS64500 is admitted)
  db_proxy:
    listen: ":5432"
    upstream: "10.0.1.20:5432"
    protocol: postgres

  # Overrides global list for dedicated partner traffic
  partner_service:
    listen: ":8443"
    upstream: "127.0.0.1:9443"
    protocol: tcp
    allowed_asns: ["AS13335", "64501"]
```

### Perimeter Admission Gating Mechanics

- **Admission Gate (Not Bypass)**: Unlike HTTP reverse proxy middleware (where matching an ASN acts as an allowlist exemption), in TCP Warden an ASN match simply **admits the client into the security pipeline**. Admitted connections are still evaluated against IP filters (`ip_filter`), country blocks (`geo_block`), rate limits (`rate_limit`), persistent bans, CrowdSec threat intelligence (`crowdsec`), and protocol guards.
- **Immediate Rejection**: Clients connecting from non-matching ASNs or unknown origins (including private RFC 1918 subnets not declared in the snapshot) are rejected immediately according to `response.mode` and logged as `asn_denied` security events.
- **Private Subnets**: MaxMind ASN databases do not include private RFC 1918 addresses (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`). To admit local clients or internal VPNs alongside an ASN allowlist, declare them in `ip_filter.allow`.
- For complete snapshot generation commands and longest-prefix routing details, see the **[ASN Filtering Guide](/core/asn-filtering)**.

---

## UDP Transport & Datagram Proxying (`udp`)

TCP Warden v3.0.0 introduces native **Layer 4 UDP Proxying** alongside TCP. Services can run strictly over UDP (`transport: "udp"`) or dual-stack (`transport: "both"`), allowing a single service definition to guard both protocols (such as DNS on port 53).

### Full Pipeline Protection on Every Datagram

Inbound UDP datagrams pass through the complete security pipeline before forwarding:

1. **Active Banlist**: Drops datagrams from IPs banned manually, via SQLite, or by auto-ban.
2. **CrowdSec LAPI Bouncer**: Drops datagrams if CrowdSec returns an active community ban decision.
3. **CIDR IP Filter**: Enforces service-level and global `allow` and `deny` subnets.
4. **Geo-Blocking**: Evaluates `allow_countries` and `deny_countries` using MaxMind GeoIP.
5. **Token Bucket Rate Limiting**: Throttles datagram rates per client IP (`connections_per_minute` and `burst`).
6. **MaxSessions Guard**: Rejects new sessions when active concurrent client count exceeds `udp.max_sessions`.
7. **Session Table & NAT Mapping**: Tracks client endpoints and reaps idle sessions after `udp.session_timeout`.
8. **Deep Protocol Inspection (`UDPPlugin`)**: Analyzes datagram payloads (e.g. DNS domain filtering, BitTorrent DHT/uTP validation) with in-place mutation or drop/reject verdicts.

::: tip Anti-Amplification: Silent Drops for UDP
Unlike TCP (which can reply with a TCP `RST`, banner message, or `tarpit` delay), **blocked UDP datagrams are always dropped silently**. 

Replying to unauthorized UDP packets would allow attackers with spoofed source IPs to abuse Routewarden as a reflection/amplification vector. Silent drops guarantee zero reflection risk.
:::

---

## Port Range Forwarding

TCP Warden supports listening on continuous port ranges:

- **1:1 Port Mapping**: Each incoming port forwards directly to its corresponding port on the upstream target.
- **Many-to-One Port Mapping**: An entire range of ingress ports forwards into a single backend (ideal for HTTP gateways and proxy fleets).

<CodeViewer :snippets="portRangeSnippets" />

---

## Plugin Configuration (`plugin_config`)

When using a modular plugin from `routewarden/plugins`, use `plugin_config` to customize the inspector's behavior:

| Plugin | Key Options | Example Usage |
| :--- | :--- | :--- |
| **`dns`** | `blocked_domains`, `blocked_qtypes`, `block_private_ips`, `min_ttl`, `max_packet_size` | Intercept malicious domains, block `ANY`/`AXFR` reflection queries, prevent DNS rebinding. |
| **`bittorrent`** | `blocked_info_hashes`, `allowed_peer_id_prefixes`, `private_tracker_mode`, `blocked_dht_methods` | Filter swarms by info-hash, enforce `-CCVVVV-` client formats, block DHT poisoning. |
| **`http`** | `allowed_hosts`, `blocked_paths` (regex), `blocked_headers` (regex) | Intercept sensitive paths (`/\.env`), block scanner User-Agents. |
| **`redis`** | `blocked_commands` | Intercept destructive commands (`FLUSHALL`, `CONFIG`, `SHUTDOWN`). |
| **`mongodb`** | `blocked_ops` | Intercept collection drops (`drop`, `dropDatabase`, `shutdown`). |
| **`tls_sni`** | `allowed_domains`, `blocked_domains` | Filter TLS SNI domain names with wildcard support (`*.example.com`). |
| **`mqtt`** | `max_client_id_len`, `blocked_client_prefixes` | Enforce IoT device naming standards and block scanner prefixes. |
| **`minecraft`** | `blocked_protocol_versions` | Reject outdated or vulnerable game client versions. |


---

## Response Actions (`response.mode`)

Choose how TCP Warden handles blocked or challenged connections:

| Mode | What it does | Best used for |
| :--- | :--- | :--- |
| `reject` | Closes the connection immediately with a TCP RST. | Clean, fast rejection with zero latency. |
| `drop` | Closes the socket silently without sending any data. | Hiding services from automated port scanners. |
| `tarpit` | Stalls the connection for `tarpit_ms` before closing. | Slowing down aggressive scanners and wasting bot concurrency. |
| `silent` | Terminates without writing to logs or events. | Silently discarding high-volume spoofed traffic. |

---

## Configuration Validation

Always validate your configuration file before starting or reloading the proxy daemon:

<CodeViewer :snippets="validateSnippets" />

