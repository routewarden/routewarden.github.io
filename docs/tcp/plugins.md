---
title: Modular Protocol Plugins for TCP Warden
description: Extend TCP Warden with modular protocol inspectors from routewarden/plugins for HTTP, databases, caches, message queues, game servers, and IoT brokers.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

// ─── 1. CLI Installation Snippets ───────────────────────────────────────────
const install_rwarden = buildSnippet({
  lang: 'bash',
  code: `# Install by short name from the official routewarden/plugins repository
rwarden tcp plugins install http
rwarden tcp plugins install redis
rwarden tcp plugins install postgres

# Install from a custom Git repository
rwarden tcp plugins install https://github.com/my-org/tcp-warden-kafka

# Install from a local directory (useful during plugin development)
rwarden tcp plugins install ./my-plugin`
})

const install_standalone = buildSnippet({
  lang: 'bash',
  code: `# Install by short name from the official routewarden/plugins repository
tcp-warden plugins install http
tcp-warden plugins install redis
tcp-warden plugins install postgres

# Install from a custom Git repository
tcp-warden plugins install https://github.com/my-org/tcp-warden-kafka

# Install from a local directory (useful during plugin development)
tcp-warden plugins install ./my-plugin`
})

const installCliSnippets = computed(() => ({
  tcp: [
    { filename: 'Unified CLI (rwarden tcp)', lang: 'bash', code: install_rwarden.cleanCode, html: install_rwarden.html, hasDiff: false },
    { filename: 'Standalone (tcp-warden)', lang: 'bash', code: install_standalone.cleanCode, html: install_standalone.html, hasDiff: false },
  ]
}))

// ─── 2. Declarative Config Snippets ─────────────────────────────────────────
const declarative_yaml = buildSnippet({
  lang: 'yaml',
  code: `# tcp-warden.yaml
plugins:
  http:
    enabled: true
    source: "https://github.com/routewarden/plugins/http"
  redis:
    enabled: true
    source: "https://github.com/routewarden/plugins/redis"
  mongodb:
    enabled: true
    source: "https://github.com/routewarden/plugins/mongodb"`
})

const declarativeSnippets = computed(() => ({
  tcp: [
    { filename: 'tcp-warden.yaml', lang: 'yaml', code: declarative_yaml.cleanCode, html: declarative_yaml.html, hasDiff: false },
  ]
}))

// ─── 3. Plugin Management Snippets ──────────────────────────────────────────
const manage_rwarden = buildSnippet({
  lang: 'bash',
  code: `# List all installed plugins and their current status
rwarden tcp plugins list

# Test installed plugins
rwarden tcp plugins test

# Enable a plugin (runs self-tests and updates config)
rwarden tcp plugins enable redis

# Temporarily disable a plugin without uninstalling
rwarden tcp plugins disable redis

# Remove plugin source and clean up
rwarden tcp plugins uninstall redis`
})

const manage_standalone = buildSnippet({
  lang: 'bash',
  code: `# List all installed plugins and their current status
tcp-warden plugins list

# Test installed plugins
tcp-warden plugins test

# Enable a plugin (runs self-tests and updates config)
tcp-warden plugins enable redis

# Temporarily disable a plugin without uninstalling
tcp-warden plugins disable redis

# Remove plugin source, unregister import, and recompile binary
tcp-warden plugins uninstall redis`
})

const manageSnippets = computed(() => ({
  tcp: [
    { filename: 'Unified CLI (rwarden tcp)', lang: 'bash', code: manage_rwarden.cleanCode, html: manage_rwarden.html, hasDiff: false },
    { filename: 'Standalone (tcp-warden)', lang: 'bash', code: manage_standalone.cleanCode, html: manage_standalone.html, hasDiff: false },
  ]
}))

// ─── 4. HTTP Guard Snippets ─────────────────────────────────────────────────
const http_guard_yaml = buildSnippet({
  lang: 'yaml',
  code: `services:
  web_guard:
    listen: ":8080"
    upstream: "127.0.0.1:80"
    protocol: "http"
    rate_limit:
      connections_per_minute: 120
      burst: 30
    plugin_config:
      allowed_hosts:
        - "api.example.com"
        - "app.example.com"
      blocked_paths:
        - "^/admin(/.*)?$"
        - "\\.(env|git|bak|sql)$"
      blocked_headers:
        User-Agent: "(?i)(sqlmap|nikto|acunetix|masscan)"`
})

const httpGuardSnippets = computed(() => ({
  tcp: [
    { filename: 'tcp-warden.yaml', lang: 'yaml', code: http_guard_yaml.cleanCode, html: http_guard_yaml.html, hasDiff: false },
  ]
}))

// ─── 5. Database Snippets ───────────────────────────────────────────────────
const postgres_yaml = buildSnippet({
  lang: 'yaml',
  code: `services:
  pg_bastion:
    listen: ":5432"
    upstream: "10.0.0.15:5432"
    protocol: "postgres"
    max_auth_failures: 3
    ban_duration: "2h"`
})

const mongodb_yaml = buildSnippet({
  lang: 'yaml',
  code: `services:
  mongo_guard:
    listen: ":27017"
    upstream: "10.0.0.20:27017"
    protocol: "mongodb"
    max_auth_failures: 5
    plugin_config:
      blocked_ops:
        - "drop"
        - "dropDatabase"
        - "shutdown"`
})

const databaseSnippets = computed(() => ({
  tcp: [
    { filename: 'PostgreSQL Guard', lang: 'yaml', code: postgres_yaml.cleanCode, html: postgres_yaml.html, hasDiff: false },
    { filename: 'MongoDB Guard', lang: 'yaml', code: mongodb_yaml.cleanCode, html: mongodb_yaml.html, hasDiff: false },
  ]
}))

// ─── 6. Redis Snippets ──────────────────────────────────────────────────────
const redis_yaml = buildSnippet({
  lang: 'yaml',
  code: `services:
  redis_proxy:
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

const redisSnippets = computed(() => ({
  tcp: [
    { filename: 'tcp-warden.yaml', lang: 'yaml', code: redis_yaml.cleanCode, html: redis_yaml.html, hasDiff: false },
  ]
}))

// ─── 7. TLS SNI Snippets ────────────────────────────────────────────────────
const tls_sni_yaml = buildSnippet({
  lang: 'yaml',
  code: `services:
  sni_proxy:
    listen: ":443"
    upstream: "10.0.0.10:443"
    protocol: "tls_sni"
    plugin_config:
      allowed_domains:
        - "*.example.com"
        - "example.com"
      blocked_domains:
        - "internal.example.com"`
})

const tlsSniSnippets = computed(() => ({
  tcp: [
    { filename: 'tcp-warden.yaml', lang: 'yaml', code: tls_sni_yaml.cleanCode, html: tls_sni_yaml.html, hasDiff: false },
  ]
}))

// ─── 8. DNS Firewall Snippets ───────────────────────────────────────────────
const dns_yaml = buildSnippet({
  lang: 'yaml',
  code: `services:
  dns_firewall:
    listen: ":53"
    upstream: "1.1.1.1:53"
    transport: "both"         # Intercepts both UDP and TCP DNS queries
    protocol: "dns"
    rate_limit:
      connections_per_minute: 1200
      burst: 200
    udp:
      session_timeout: "15s"
      max_sessions: 20000
    plugin_config:
      blocked_domains:
        - "*.badware.test"
        - "c2.threat.org"
      blocked_qtypes:
        - "ANY"               # Stop ANY query amplification floods
        - "AXFR"              # Block unauthorized zone transfers
      block_private_ips: true # Prevent DNS rebinding attacks`
})

const dnsSnippets = computed(() => ({
  tcp: [
    { filename: 'tcp-warden.yaml', lang: 'yaml', code: dns_yaml.cleanCode, html: dns_yaml.html, hasDiff: false },
  ]
}))

// ─── 9. BitTorrent Guard Snippets ───────────────────────────────────────────
const bittorrent_yaml = buildSnippet({
  lang: 'yaml',
  code: `services:
  torrent_guard:
    listen: ":6881"
    upstream: "10.0.0.50:6881"
    transport: "both"         # Peer Wire (TCP) + DHT/uTP (UDP)
    protocol: "bittorrent"
    plugin_config:
      blocked_info_hashes:
        - "aabbccddeeff00112233445566778899aabbccdd"
      require_peer_id_format: true
      allowed_peer_id_prefixes:
        - "-qB-"              # qBittorrent
        - "-TR-"              # Transmission
        - "-DE-"              # Deluge
      blocked_dht_methods:
        - "announce_peer"     # Mitigate DHT poisoning
      max_dht_packet_size: 1500`
})

const bittorrentSnippets = computed(() => ({
  tcp: [
    { filename: 'tcp-warden.yaml', lang: 'yaml', code: bittorrent_yaml.cleanCode, html: bittorrent_yaml.html, hasDiff: false },
  ]
}))

// ─── 10. Docker Cache Snippets ──────────────────────────────────────────────
const docker_cache_yaml = buildSnippet({
  lang: 'yaml',
  code: `services:
  tcp-warden:
    image: ghcr.io/routewarden/tcp-warden:latest
    container_name: tcp-warden
    restart: unless-stopped
    network_mode: host
    environment:
      - AUTO_INSTALL_PLUGINS=ssh postgres redis # Auto-install & compile on first launch
    volumes:
      - tcp-warden-config:/etc/routewarden
      - tcp-warden-data:/var/lib/routewarden    # Caches compiled binary & plugins across restarts
      - tcp-warden-logs:/var/log/routewarden

volumes:
  tcp-warden-config:
  tcp-warden-data:
  tcp-warden-logs:`
})

const dockerCacheSnippets = computed(() => ({
  tcp: [
    { filename: 'docker-compose.yml', lang: 'yaml', code: docker_cache_yaml.cleanCode, html: docker_cache_yaml.html, hasDiff: false },
  ]
}))
</script>

# Modular Protocol Plugins

The core TCP Warden proxy engine in RouteWarden (`rwarden tcp` or standalone `tcp-warden`) is an ultra-lightweight, high-performance Layer 4 transparent security proxy (`generic` / `tcp`).

All protocol-specific security inspectors (`ssh`, `smtp`, `pop3`, `imap`, `postgres`, `mysql`, `redis`, `http`, etc.) are modular plugins maintained in the dedicated **[`routewarden/plugins`](https://github.com/routewarden/plugins)** repository. This modular architecture ensures the core daemon remains minimal, zero-bloat, and rock-solid, while allowing operators to install only the protocols their infrastructure requires.

---

## Official Plugins

TCP Warden provides **21 official plugins** in the [`routewarden/plugins`](https://github.com/routewarden/plugins) repository, covering DNS resolvers, P2P networks, database servers, mail systems, remote access, web services, caches, message brokers, and game servers. All plugins can be installed instantly with `rwarden tcp plugins install <name>` (or `tcp-warden plugins install <name>`).

| Plugin | Protocol(s) | Documentation | What it does |
| :--- | :--- | :--- | :--- |
| **`dns`** | `dns` | [DNS Guide](./plugins/dns) | High-performance DNS firewall for UDP & TCP. Blocks malicious domains, restricts query types (`ANY`/`AXFR`), and prevents DNS rebinding attacks. |
| **`bittorrent`** | `bittorrent`, `bittorrent-tcp`, `bittorrent-dht`, `bittorrent-utp` | [BitTorrent Guide](./plugins/bittorrent) | Multi-transport BitTorrent guard inspecting Peer Wire (TCP), DHT (UDP), and uTP (UDP) with info-hash filtering and anti-amplification. |
| **`ssh`** | `ssh` | [SSH Guide](./plugins/ssh) | SSH handshake inspector with banner validation, version checks, and `SSH_MSG_USERAUTH_FAILURE` brute-force detection. |
| **`postgres`** | `postgres`, `postgresql` | [PostgreSQL Guide](./plugins/postgres) | Catches failed password attempts (`28P01`) and automatically bans brute-force bots targeting PostgreSQL. |
| **`mysql`** | `mysql`, `mariadb` | [MySQL Guide](./plugins/mysql) | Detects Access Denied errors (`1045`) and mitigates credential brute-forcing against MySQL and MariaDB. |
| **`redis`** | `redis`, `resp` | [Redis Guide](./plugins/redis) | Command firewall: blocks dangerous commands (`FLUSHALL`, `CONFIG`, `SHUTDOWN`) and bans repeated wrong passwords (`-WRONGPASS`). Supports RESP2 & RESP3. |
| **`mongodb`** | `mongodb`, `mongo` | [MongoDB Guide](./plugins/mongodb) | Wire protocol firewall: blocks destructive commands (`drop`, `dropDatabase`, `shutdown`) and bans failed authentications. |
| **`http`** | `http` | [HTTP Guide](./plugins/http) | Blocks vulnerability scanners (User-Agent), regex path attacks (e.g. `/.env`, `/admin`), and validates Host headers. Transparent WebSocket pass-through. |
| **`tls_sni`** | `tls`, `tls-sni`, `https` | [TLS SNI Guide](./plugins/tls-sni) | Inspects domain names (SNI) at Layer 4 to allow, block, or route domains without needing TLS certificates or decryption. |
| **`smtp`** | `smtp`, `mail` | [SMTP Guide](./plugins/smtp) | SMTP mail transfer inspector with recipient limits, spam sender domain blocking, and authentication failure monitoring. |
| **`pop3`** | `pop3` | [POP3 Guide](./plugins/pop3) | POP3 mail retrieval guard detecting auth brute-force attacks (`-ERR Authentication failed`) and STLS enforcement. |
| **`imap`** | `imap` | [IMAP Guide](./plugins/imap) | IMAP4rev1 mail retrieval guard tracking tagged authentication failures (`NO`/`BAD [AUTHENTICATIONFAILED]`). |
| **`generic`** | `tcp`, `generic`, `raw` | [Generic Proxy Guide](./plugins/generic) | Universal Layer 4 transparent proxy with rate limiting, CIDR allow/deny filtering, geo-blocking, and tarpitting for any custom TCP socket or protocol. |
| **`ftp`** | `ftp` | [FTP Guide](./plugins/ftp) | Monitors control connections, restricts anonymous logins, and blocks repeated FTP authentication failures (`530 Login incorrect`). |
| **`ldap`** | `ldap` | [LDAP Guide](./plugins/ldap) | Detects failed LDAP bind attempts (`resultCode: 49`) to protect Active Directory and OpenLDAP from credential stuffing. |
| **`amqp`** | `amqp`, `rabbitmq` | [AMQP Guide](./plugins/amqp) | Protects RabbitMQ and AMQP brokers by tracking SASL authentication failures and malicious connection frames. |
| **`memcached`** | `memcached` | [Memcached Guide](./plugins/memcached) | Protects caches by blocking administrative wipe commands (`flush_all`) and tracking unauthorized attempts. |
| **`mqtt`** | `mqtt` | [MQTT Guide](./plugins/mqtt) | Protects IoT brokers by enforcing valid client IDs and blocking scanner or bot prefixes. |
| **`vnc`** | `vnc`, `rfb` | [VNC Guide](./plugins/vnc) | Protects remote desktop servers by detecting and banning VNC brute-force login attempts. |
| **`minecraft`** | `minecraft`, `mc` | [Minecraft Guide](./plugins/minecraft) | Protects game servers from ping floods, malformed handshake packets, and unsupported client versions. |
| **`echo_filter`** | `echo`, `stream-filter` | [Echo Filter Guide](./plugins/echo-filter) | Example bidirectional stream filter that inspects and sanitizes text keywords in real time. |

---

## Installation & Management

Install, configure, and manage modular plugins either via the CLI or declaratively in your configuration file.

### 1. Command Line Installation

Install any plugin using its official short name, a Git repository URL, or a local source directory:

<CodeViewer :snippets="installCliSnippets" />

::: tip 4-Step Safety Verification Pipeline
When you install any plugin, TCP Warden automatically runs four safety checks to protect your proxy:
1. **`[1/4] Validating manifest`**: Checks that `plugin.yaml` has valid YAML and required fields (`name`, `version`, `manifest_version`, `protocols`).
2. **`[2/4] Checking manifest compatibility`**: Confirms that `manifest_version` matches the supported SDK format (`1.0.0`).
3. **`[3/4] Compiling plugin`**: Verifies that the plugin compiles cleanly without Go syntax or package errors.
4. **`[4/4] Running tests`**: Runs `go test -race -count=1 ./...` inside the plugin. If any unit tests fail or race conditions are detected, installation is safely aborted.
:::

### 2. Declarative Configuration (`tcp-warden.yaml`)

Declare required plugins directly in your configuration file. On startup, the daemon automatically pulls and registers any missing plugins:

<CodeViewer :snippets="declarativeSnippets" />

### 3. Managing Installed Plugins

Use built-in CLI subcommands to inspect active plugins, enable or disable inspectors, or cleanly uninstall them:

<CodeViewer :snippets="manageSnippets" />

---

## Plugin Configuration Examples

Below are common service configurations using official plugins:

### DNS Firewall (`dns`)

Protects DNS resolvers across UDP and TCP against malicious domains, query amplification, and DNS rebinding:

<CodeViewer :snippets="dnsSnippets" />

### BitTorrent Guard (`bittorrent`)

Enforces info-hash filtering, verified peer ID formats, and anti-amplification controls across TCP and UDP:

<CodeViewer :snippets="bittorrentSnippets" />

### HTTP Guard (`http`)

Protects HTTP applications with Host header validation, User-Agent filtering, and regex path blocking:

<CodeViewer :snippets="httpGuardSnippets" />

### Database Protection (`postgres` & `mongodb`)

Tracks failed authentication attempts and blocks destructive operations:

<CodeViewer :snippets="databaseSnippets" />

### In-Memory Cache Firewall (`redis`)

Blocks dangerous administrative commands while allowing application queries:

<CodeViewer :snippets="redisSnippets" />

### Transparent TLS SNI Routing (`tls_sni`)

Inspects the TLS `ClientHello` Server Name Indication (SNI) at Layer 4 and filters traffic by domain name without terminating TLS certificates:

<CodeViewer :snippets="tlsSniSnippets" />

---

## Docker Persistence & Caching

When running in Docker, mount the named volume `tcp-warden-data` to `/var/lib/routewarden`. This preserves:
1. **Installed plugin sources and manifests** in `/var/lib/routewarden/plugins`.
2. **Recompiled daemon binary** in `/var/lib/routewarden/bin/tcp-warden` (so subsequent container restarts are instant without re-compiling).
3. **SQLite bans database** in `/var/lib/routewarden/bans.db`.

<CodeViewer :snippets="dockerCacheSnippets" />

---

## Next Steps

- **Routing Traffic:** Learn how to divert live traffic into TCP Warden via `nftables`, `iptables`, port swapping, or Docker networks in the [Network & Firewall Integrations Guide](./network-integrations).
- **Developing Plugins:** Want to create your own protocol inspector? Follow the [Plugin Development & Integration Guide](./plugin-development/).
- **Configuration Details:** Learn more about proxy listeners and port ranges in the [Configuration Reference](./configuration).
