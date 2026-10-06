---
title: TCP Warden Changelog & Release Notes
description: Complete release notes, breaking changes, and migration guide for TCP Warden.
---

# TCP Warden Changelog & Release Notes

All notable changes to **TCP Warden** (`github.com/routewarden/tcp-warden`) are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and TCP Warden adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [v3.4.0] - 2026-10-06 (Latest)

### 🔒 Security Hardening Release: Protocol Plugin Boundary Fixes, UDP Ban Fast-Path & Installer Path Traversal Protection

TCP Warden v3.4.0 is a comprehensive security hardening release, closing a set of boundary-condition vulnerabilities identified during an internal audit of the plugin ecosystem and the core daemon's UDP engine and plugin installer subsystems. All 21 official protocol plugins were audited; seven received targeted fixes.

#### 1. UDP Engine — Synchronous Ban Fast-Path

- **Synchronous Pre-Goroutine Drop**: The UDP datagram engine (`core/udp_engine.go`) now checks the active ban list and CrowdSec block list **before** allocating a session goroutine or NAT socket for incoming datagrams.
- **Zero-Goroutine-Leak DoS Mitigation**: Previously, a banned sender triggering high-frequency UDP floods could saturate the goroutine pool before per-session ban checks executed. Bans from permanently blacklisted IPs are now dropped inline on the receive loop without scheduling any goroutine.
- **Tests**: `TestUDPEngine_BannedIP_Dropped` verifies the fast-path verdict for active bans.

#### 2. Plugin Installer — Path Traversal & Symlink Safety

- **Plugin Name Allowlist**: Plugin names passed to `tcp-warden plugins install` are now validated against a strict allowlist (`[a-zA-Z0-9_-]+`). Names containing path separators, dot-dot sequences (`../`), or shell metacharacters are rejected before any filesystem or network operation.
- **Git Subpath Escape Prevention**: Resolved a vulnerability where a crafted Git repository could use `.git` hooks or nested submodule paths to write files outside the plugin staging directory during `go build`.
- **Symlink Dereferencing Block**: The installer now verifies that the resolved real path of every file in a cloned plugin directory remains inside the staging root, blocking symlink escape attacks.
- **Tests**: `TestPluginInstaller_SecurityBoundaries` covers traversal names, symlink attempts, and allowlist enforcement.

#### 3. Protocol Plugin Hardening (All 21 Plugins Audited)

##### MQTT (`plugins/mqtt`)
- **CONNACK 0x02 Emission on Oversized ClientID**: When `max_client_id_len` is configured and a connecting client exceeds the limit, the inspector now sends a well-formed MQTT `CONNACK` response with return code `0x02` (Identifier Rejected) before closing the connection, as required by the MQTT 3.1.1 specification.
- Previously the connection was silently closed mid-handshake, causing compliant client libraries to retry indefinitely.
- **Security event**: `blocked_mqtt_client_id_too_long` emitted via `ctx.OnSecurityEvent`.

##### AMQP 0-9-1 (`plugins/amqp`)
- **Empty VHost Normalization**: `extractVHost` now treats a zero-length vhost field in `Connection.Open` as the AMQP default vhost (`/`), preventing an attacker from bypassing `allowed_vhosts` enforcement by sending a zero-length vhost byte when the server default is included in the allowlist.
- **Tests**: `TestAMQP_ExtractVHost` — boundary matrix covering truncated payload, zero-length vhost, out-of-bounds length, and valid vhosts.

##### BitTorrent DHT (`plugins/bittorrent`)
- **Allowlist Enforcement on Unparseable DHT Methods**: When `allowed_dht_methods` is configured and a DHT query arrives with a missing or undecodable method name (e.g., malformed bencode length prefix), the packet is now **dropped** (`bt_dht_query_missing_method`) rather than silently allowed through the allowlist.
- **Bounded Bencode Length Scanning**: The `extractDHTMessageType` parser caps its length-prefix digit scan to 4 digits (`colonOffset <= 4`), preventing CPU amplification from arbitrarily long synthetic length fields in crafted DHT packets.
- **Tests**: `TestBTUDPInspector_DHTAllowlist_RejectsMissingMethod` verifies the allowlist drop on unparseable query methods.

##### Minecraft Java Edition (`plugins/minecraft`)
- **TCP Fragmentation Bypass Fix**: The Minecraft inspector previously read the handshake with a single non-blocking `client.Read()`. A client fragmenting the handshake across multiple TCP segments could cause `readVarInt` to receive insufficient bytes for multi-byte protocol version VarInts (e.g., version 760 / 1.19.2 encoded as `0xF8 0x05`), resulting in the version check being skipped entirely and an uninspected connection being forwarded to the upstream server.
- The inspector now accumulates the full packet body (up to 512 bytes) across TCP segment boundaries before evaluating `blocked_protocol_versions`.
- **Strict Packet ID Enforcement**: When protocol version blocking is configured, a non-zero Packet ID (not a handshake packet) is now rejected immediately (`invalid minecraft handshake packet id`) rather than silently forwarded.
- **Tests**: `TestMinecraft_Run_BlockedProtocolVersion_Fragmented` and `TestMinecraft_Run_MalformedHandshake_Rejected`.

##### SMTP, LDAP, FTP, IMAP, POP3, Memcached (`plugins/*`)
- **Unbounded Line Read Protection**: `bufio.Scanner` replaced raw `bufio.ReadLine` calls with enforced per-line limits (`MaxScanTokenSize`) across SMTP, FTP, IMAP, and POP3, preventing a connected client from sending an infinitely long line to exhaust inspector heap memory.
- **Authentication Failure Cap (`max_auth_failures`)**: All authentication-inspecting plugins (SMTP, LDAP, IMAP, POP3, FTP) now enforce `MaxAuthFailures` by sending a protocol-appropriate rejection and closing the connection once the cap is reached, with `ctx.OnAuthFailure()` and `ctx.OnSecurityEvent` emitted on every excess attempt.
- **LDAP DN Suffix Spoofing Prevention**: The LDAP inspector validates that the `BindDN` in a Bind Request matches only literal suffixes from the `allowed_bind_dn_suffixes` list (case-folded), preventing evasion via Unicode homoglyphs or LDAP attribute reordering.
- **Memcached Storage Length Validation**: The Memcached inspector rejects `set`/`add`/`replace`/`append`/`prepend` commands with a declared `bytes` field that is negative or exceeds 1 MB (configurable), preventing heap exhaustion via synthetic large-object commands.

---

## [v3.3.0] - 2026-10-05

### 🚀 Hardening & Protocol Handover Release: BufferedConn Fallthrough, IPv6 Zone Normalization & Extended API Coverage

TCP Warden v3.3.0 delivers critical protocol transport fixes, IPv6 zone normalization across CIDR filters, and comprehensive test suite additions.

#### 1. Transport & Handover Reliability
- **`BufferedConn.Read` Fallthrough**: Fixed an issue where peeking or draining headers during protocol inspection could stall downstream readers. `BufferedConn.Read()` now cleanly falls through to the underlying network connection when the initial buffer is exhausted or nil.
- **Large Stream Transfer Resilience**: Added verification for high-throughput, multi-chunk stream forwarding in `protocol.Proxy()`.

#### 2. IPv6 Scope & CIDR Integrity
- **Zone Identifier Normalization in Config**: Updated `isValidIPOrCIDR()` to strip RFC 4007 zone identifiers (e.g., `fe80::1%eth0`), preventing false validation errors during configuration parsing.
- **IPv6 CIDR Precedence & Evaluation**: Verified that IPv6 CIDR ranges (such as `2001:db8::/32`) evaluate correctly across global allowlists, service allowlists, and denylists.

#### 3. Management API & Ban Administration
- **Banlist Listing & Dynamic Unban**: Validated JSON serialization of active bans on `/api/banlist` and tested dynamic unbanning via `/api/unban`.
- **Service Discovery**: Verified `/api/services` endpoint reporting configured proxy services and operational metadata.

---

## [v3.2.1] - 2026-10-04

### 🐛 Maintenance & Bug Fix Release: SemVer 2.0.0 Pre-Release Parsing & SDK Synchronization

TCP Warden v3.2.1 resolves a version comparison defect in the dynamic plugin registry and synchronizes the Plugin SDK and host daemon release versions.

#### 1. Plugin Registry & Semantic Versioning Pre-Release Ordering
- **SemVer 2.0.0 Pre-Release Precedence**: Replaced dot-separated integer splitting in `plugins.CompareVersions()` with strict SemVer 2.0.0 compliance via `sdk.ParseSemVer()` and `sdk.CompareSemVer()`.
- **Pre-Release Tag Sorting**: Pre-release versions (e.g. `1.2.0-rc.1`, `1.2.0-beta.1`) are now correctly evaluated as having lower precedence than their corresponding normal releases (`1.2.0`), and dot-separated pre-release identifiers are properly compared lexicographically and numerically in accordance with the SemVer 2.0.0 specification.
- **Unit Test Coverage**: Added comprehensive test cases in `plugins/registry_test.go` covering pre-release tags, release candidates, and version equality checks.

#### 2. Ecosystem Synchronization
- **Plugin SDK v3.2.1 Alignment**: Synchronized the Plugin SDK version constant `sdk.Version = "3.2.1"` in `plugins/sdk/sdk.go` with the host daemon version.
- **Version Metadata & Test Verification**: Synchronized `version.json`, `main.go`, `VERSIONING.md`, and automated test validation `TestVersionMatchesJSON` across the repository.

---

## [v3.2.0] - 2026-10-04

### 🚀 Feature & Hardening Release: Comprehensive Concurrency, Persistence, and Security Fixes

TCP Warden v3.2.0 brings comprehensive security hardening, concurrency stability, and memory optimizations across all core subsystems, resolving 24 edge-case vulnerabilities and operational defects identified across the UDP datagram engine, SQLite ban persistence, GeoIP resolver, API server, and Plugin SDK.

#### 1. Core Proxy & Transport Hardening
- **TCP Half-Close Preservation**: Fixed bidirectional stream proxying in `protocol.Proxy()` to invoke `CloseWrite()` on `*net.TCPConn` rather than closing the underlying socket prematurely. Connections requiring half-close handshakes (such as HTTP/1.1 pipelining, SMTP TLS upgrades, and custom RPCs) now transfer payloads completely without EOF truncation.
- **`BufferedConn` Half-Close Delegation**: Added `CloseRead()` forwarding in `protocol.BufferedConn`, ensuring that wrapped or peeked connections propagate half-close read shutdowns cleanly without breaking ongoing writes.
- **Active Connection Underflow Defense**: Replaced plain atomic decrement with a compare-and-swap (CAS) guard in `ServiceStats.ConnClosed()`, guaranteeing that `ActiveConnections` never underflows below zero during rapid client disconnects or aborted handshakes.
- **Cancellation Context Propagation in Plugin Inspection**: Threaded active connection contexts (`context.Context`) through to `sdk.DefaultContext` in `core/pipeline.go`. Protocol inspectors listening on `ctx.Context().Done()` now receive immediate cancellation when connections terminate or the daemon initiates graceful shutdown.
- **Pipeline Panic Recovery**: Protected inspector executions and pipeline evaluation stages with defensive panic recovery handlers. Malformed protocol payloads or panicking plugin inspectors are caught, logged, and isolated without crashing the daemon process.
- **Platform-Agnostic Listener Accept Error Handling**: Added `use of closed network connection` string fallback in TCP listener accept error checks, ensuring uniform clean shutdown across all operating systems.
- **Port Range Forwarding**: Added support for 1:1 and N:1 port mapping ranges with strict validation ensuring non-overlapping ranges and matching source/destination widths.

#### 2. Network Protocol & IPv6 Integrity
- **IPv6 Scope / Zone Identifier Stripping**: Added RFC 4007 zone ID stripping across `parseClientIP()`, `cleanIPString()`, `matchIP()`, `crowdsec.Client.Check()`, and the management API (`/api/ban`, `/api/unban`). Link-local addresses with interface suffixes (e.g., `[fe80::1%eth0]:1234`) are now cleanly resolved, preventing erroneous drops by `net.ParseIP`, properly classifying them as `LAN` (`IsPrivate: true`) in GeoIP lookups, and matching CrowdSec ban decisions.

#### 3. Management API & Stream Hardening
- **Constant-Time API Token Authentication**: Replaced standard string equality comparison in API `requireAuth` middleware with `crypto/subtle.ConstantTimeCompare`, neutralizing timing side-channel attacks against the daemon's bearer authentication token.
- **API Health Endpoint Version Alignment**: Updated `/health` response payload to report the daemon's release version (`sdk.Version` / `3.2.0`) as `"version"` instead of the config schema version (`"1.0"`), while preserving `"config_version": "1.0"`.
- **SSE Stream Broken Client Resource Leak Fix**: Handled write errors on Server-Sent Events (`/api/events`) immediately, allowing disconnected streaming clients to exit promptly and execute deferred `unsubscribe()` callbacks to avoid channel retention.
- **Management API Route Parity (`/api/tcp/*`)**: Added `/api/tcp/*` route aliases (`/api/tcp/stats`, `/api/tcp/services`, `/api/tcp/banlist`, `/api/tcp/unban`, `/api/tcp/ban`, `/api/tcp/events`) matching `/api/guard/*` and `/api/*`, and implemented `http.Handler` on `APIServer.ServeHTTP`.

#### 4. Layer 4 UDP Datagram Engine
- **Session Table Race Condition Fix**: Eliminated a race condition in `UDPSessionTable.GetOrCreate` under concurrent UDP packet bursts using atomic synchronization, preventing duplicate upstream socket creation and spurious connection close logs.
- **High-Precision Idle Session Reaper**: Added a periodic idle reaper to clean inactive NAT sessions according to `udp.session_timeout`, reclaiming memory and socket handles under high packet churn.
- **Datagram Metrics Lifecycle**: Integrated UDP packet counters and datagram throughput metrics directly into `StatsRegistry` and the JSONL event logging stream.

#### 5. SQLite Banlist Persistence & Hardening
- **Thread-Safe SQLite Persistence (`bans.db`)**: Persists dynamic and permanent bans across daemon restarts using SQLite in WAL mode with connection serialization (`SetMaxOpenConns(1)`), eliminating database lock contention.
- **SQL Injection Prevention**: Parameterized all queries across `Unban()` and `IsBanned()`, preventing malicious IP payloads from escaping SQL statements.
- **Permanent Ban Expiry Sentinel**: Stored a far-future sentinel timestamp (`9999-12-31`) rather than zero-time timestamps, eliminating false expirations in SQL engines.
- **TOCTOU Read Eviction Protection**: Upgrades locks cleanly when evicting expired bans on read without risking concurrent re-ban loss.
- **Automated Legacy JSON Migration**: Automatically migrates pre-v3.0 `bans.json` files into SQLite on boot.

#### 6. GeoIP Engine Memory Bounding & Hardening
- **High-Cardinality Cache Bounding**: Capped in-memory GeoIP cache to `maxGeoCacheEntries = 50,000` entries with atomic threshold pruning, preventing memory exhaustion attacks from spoofed random IP scans.
- **Extended Network Classification**: Added automatic classification for Carrier-Grade NAT (CGNAT `100.64.0.0/10`), Tailscale IPv6 ULA (`fd7a:115c:a1e0::/48`), RFC 5737 test nets, and benchmark ranges to `IsPrivateOrLocal()`.
- **Corrupted MMDB Buffer Boundary Checks**: Added strict bounds checking in MMDB binary parsing, eliminating slice bounds out-of-range panics when reading truncated or malformed GeoLite2 databases.

#### 7. Plugin SDK & Dynamic Registry
- **Manifest Traversal Protection**: Validated plugin manifest names, versions, and protocol lists, forbidding path traversal (`../`) and illegal directory characters.
- **Semantic Version Compatibility & Auto-Disable**: Verifies plugin manifest compatibility against the running host SDK version, automatically disabling incompatible or faulty plugins with clear warning logs instead of aborting startup.
- **SDK Version Bump**: Synchronized Plugin SDK constant `Version = "3.2.0"` in `plugins/sdk/sdk.go`.

---

## [v3.1.0] - 2026-10-02

### 🚀 Minor Release: Leveled Security Events & RouteWarden Observability Integration

TCP Warden v3.1.0 introduces native log severity classification directly into the structured `SecurityEvent` pipeline, enabling seamless ingestion, filtering, and visual correlation within the RouteWarden Observability Stack (Grafana, Loki, and Alloy).

#### 1. Structured Security Event Log Levels (`Level`)
- **First-Class `Level` Field**: Added `Level` (`json:"level,omitempty"`) to `SecurityEvent` payloads emitted across all active listeners and bastions.
- **Automatic Pipeline Severity Assignment**:
  - `warn`: Automatically assigned to blocked requests, banned IPs (`ip_denied`, `crowdsec_ban`), and rate-limited traffic (`throttled`).
  - `error`: Assigned to pipeline or internal proxy failures.
  - `info`: Assigned to clean, allowed TCP and UDP connections.
- **Alloy & Loki Stream Labeling**: Grafana Alloy automatically indexes `level` as a primary Loki stream label, allowing instant querying via `{app="routewarden", level="warn"}`.

#### 2. Enhanced L4 Event Metadata for SIEM Correlation
- Emits comprehensive connection metadata on all security triggers:
  - `client_ip`: Remote socket address (IPv4 and IPv6).
  - `country_code`, `country_name`, and `flag_emoji`: MaxMind GeoIP resolution (e.g. `🇩🇪 Germany`, `🏠 Local Network`).
  - `service`, `protocol`, and `transport`: Protocol context (`ssh`, `postgres`, `dns`, `smtp`, `udp`, `tcp`).
  - `action` and `reason`: Specific defense rule or trigger (`ip_denied`, `rate_limit_exceeded`, `blocked_domain`).
- Full compatibility with the **Pure Opt-In** logging model via Docker label `routewarden.logs=true`.

#### 3. Plugin SDK v3.1.0 Synchronization
- Synchronized Plugin SDK version constant to `3.1.0` (`plugins/sdk/sdk.go`).
- Retained full backward compatibility with manifest schema version `1.0.0`.

---

## [v3.0.0] - 2026-09-30

### 🚀 Major Release: Layer 4 UDP Transport Engine & Multi-Protocol Expansion (DNS & BitTorrent)

TCP Warden v3.0.0 introduces native **Layer 4 UDP Proxying**, enabling multi-transport protection across both TCP and UDP. It introduces two major official plugins—**DNS Guard** and **BitTorrent Guard**—and extends the Plugin SDK with datagram-level protocol inspection.

#### 1. Native UDP Transport & Multi-Stage Datagram Pipeline
- **Dual-Transport Listeners (`transport: "both"`)**: A single service definition can bind both TCP and UDP sockets on the same port (ideal for DNS on `:53` or BitTorrent on `:6881`).
- **Full Pipeline Defense for Datagrams**: Inbound UDP datagrams pass through the complete security pipeline before reaching upstreams:
  - **Stage 1 (Active Banlist)**: Drops datagrams from banned IPs immediately.
  - **Stage 2 (CrowdSec LAPI Bouncer)**: Enforces real-time community ban decisions.
  - **Stage 3 (CIDR IP Filter)**: Enforces service-level and global subnet allow/denylists.
  - **Stage 4 (GeoIP Blocking)**: Filters countries using MaxMind GeoIP (`allow_countries` & `deny_countries`).
  - **Stage 5 (Token Bucket Rate Limiting)**: Throttles datagram rates per client IP (`connections_per_minute` and `burst`).
  - **Stage 6 (Session Table & Concurrency Caps)**: `udp.max_sessions` caps active unique client sessions; `udp.session_timeout` reaps idle NAT states.
- **Zero-Reflection Anti-Amplification Architecture**: Blocked UDP datagrams are discarded silently rather than sending error responses, guaranteeing RouteWarden cannot be weaponized as a reflection/amplification vector for spoofed attacks.

#### 2. Plugin SDK v3.0.0 & UDP Datagram Inspector
- **`sdk.UDPPlugin` & `sdk.UDPInspector`**: New optional interfaces for protocol plugins handling datagram traffic.
- **`sdk.UDPPacket`**: Inspects raw datagram payloads, client address metadata, and traffic direction (`IsReply`).
- **In-Place Payload Mutation**: Inspectors can mutate packet payloads in-place (e.g. rewriting DNS records or stripping metadata) before forwarding.
- **`sdk.UDPVerdict`**: Explicit inspection verdicts (`UDPVerdictAllow`, `UDPVerdictDrop`, `UDPVerdictReject`).
- **100% Backward Compatible**: Type-asserted at runtime (`plugin.(sdk.UDPPlugin)`). Existing TCP plugins continue operating without modification; manifest schema remains `1.0.0`.

#### 3. Official DNS Guard Plugin (`plugins/all/dns`)
- **Dual UDP & TCP Inspection**: Full RFC 1035 inspection for resolvers and authoritatives.
- **Malicious Domain Blocking**: Regex and wildcard domain pattern filtering (`blocked_domains` / `allowed_domains`).
- **Query Type Filtering**: Block dangerous query types (`blocked_qtypes: ["ANY", "AXFR"]`) to mitigate amplification and unauthorized zone transfers.
- **DNS Rebinding Defense**: `block_private_ips` scans upstream answers and blocks responses resolving to RFC1918 or loopback addresses.
- **Cache Poisoning & Amplification Defense**: Enforces `min_ttl` response rewriting and caps EDNS0 buffer sizes with `max_packet_size`.

#### 4. Official BitTorrent Guard Plugin (`plugins/all/bittorrent`)
- **Three-Transport Protocol Coverage**: Inspects Peer Wire Protocol (TCP), Mainline DHT (UDP), and Micro Transport Protocol (uTP over UDP).
- **Info-Hash Enforcement**: Filter swarms by 40-character SHA-1 info-hash (`blocked_info_hashes` / `allowed_info_hashes`).
- **Client Identity Validation**: Enforces standard Azureus peer ID convention (`require_peer_id_format`) and filters client prefixes (`allowed_peer_id_prefixes` e.g. `-qB-`, `-TR-`, `-DE-`).
- **Private Tracker Protection**: `private_tracker_mode` blocks peers advertising DHT capability in their handshake flags.
- **DHT Abuse Defense**: Block specific DHT methods (`announce_peer` to stop swarm poisoning), cap packet sizes (`max_dht_packet_size`), and toggle discovery transports (`block_dht`, `block_utp`).

---

## [v2.1.0] - 2026-09-30

### 🚀 Feature Release: Configurable Log Levels & Dual-Stream Filtering

TCP Warden v2.1.0 introduces fine-grained, leveled logging across both human-readable operational output and structured JSONL security event streams, featuring a zero-dependency leaf logger package and default `warn` filtering.

#### 1. Configurable Log Levels (`debug`, `info`, `warn`, `error`, `off`)
- **Granular Verbosity Control**: Added `global.log_level` supporting case-insensitive levels: `debug`, `info`, `warn` (or `warning`), `error`, and `off` (or `silent`).
- **Environment Variable Override**: Supports `ROUTEWARDEN_LOG_LEVEL` for containerized environments, taking precedence over YAML configuration.
- **Startup Banner**: Active log level is dynamically displayed in the daemon startup banner during boot.

#### 2. Dual-Stream Logging Architecture
- **Operational Logs (`stderr`)**: Human-readable daemon lifecycle events, banners, plugin compilation status, API listener confirmations, and system warnings.
- **Security Event Stream (`stdout` + `log_file` JSONL)**: Structured audit records consumed by dashboards, SIEMs, and CrowdSec.
- **Action-to-Level Event Gating**:
  - `allowed` events: Emitted only at `debug` and `info`.
  - `auth_failure` events: Emitted at `warn`, `info`, and `debug`.
  - `blocked` / `banned` events: Emitted at `error`, `warn`, `info`, and `debug`.
  - `off`: Completely silences both output streams.

#### 3. Default Log Level: `warn` (Optimized for Production & CrowdSec)
- **High-Volume Log Suppression**: Defaulting to `warn` prevents millions of routine `allowed` connection records from bloating disk storage.
- **CrowdSec Ready Out of the Box**: Keeps `/var/log/routewarden/tcp-warden.jsonl` strictly focused on actionable threat signals (`auth_failure` and `blocked` events), minimizing CrowdSec parser CPU and disk I/O overhead.

#### 4. New Zero-Dependency `logger` Package
- **Leaf Architecture**: Introduced [`github.com/routewarden/tcp-warden/logger`](file:///Users/aman/git/routewarden/tcp-warden/logger) with zero internal imports, eliminating any risk of import cycles.
- **Plugin Integration**: External protocol plugins in `github.com/routewarden/plugins` can now directly import `logger` to emit leveled trace, warning, and error diagnostics via `logger.Default().Debug(...)` / `logger.Default().Warn(...)`.

---

## [v2.0.0] - 2026-09-29

### 🚀 Major Release: Complete Protocol Modularization & Architecture V2

TCP Warden v2.0.0 marks a major architectural milestone. All protocol inspectors have been extracted from the core codebase into the standalone, independently versioned [`github.com/routewarden/plugins`](https://github.com/routewarden/plugins) repository. The core `tcp-warden` daemon is now an ultra-fast, zero-bloat Layer 4 transparent reverse proxy and security engine.

#### 1. Complete Protocol Plugin Extraction
- **Decoupled Core Architecture**: Removed legacy internal protocol framing packages (`protocol/ssh`, `protocol/postgres`, `protocol/redis`, etc.) from the core binary repository.
- **19 Standalone Protocol Plugins**: All protocol guards now live in `github.com/routewarden/plugins`:
  - **Remote Access & Mail**: `ssh`, `smtp`, `pop3`, `imap`, `ftp`, `vnc`.
  - **Databases & Caches**: `postgres`, `mysql`, `redis`, `mongodb`, `memcached`.
  - **Messaging & Directory**: `amqp`, `mqtt`, `ldap`.
  - **Web, Routing & Games**: `http`, `tls_sni`, `minecraft`, `generic`, `echo_filter`.
- **Embedded Manifests (`//go:embed plugin.yaml`)**:
  - All plugins embed their `plugin.yaml` manifests directly into compiled binaries using `sdk.MustParseManifest()`.
  - Enables zero-disk in-memory capability discovery, schema validation, and health reporting.

#### 2. High-Performance Runtime Caching & Boot Optimization
- **Recompiled Binary Caching**:
  - Container entrypoint automatically persists recompiled daemon binaries in `/var/lib/routewarden/bin/tcp-warden` and active plugin imports in `/var/lib/routewarden/all.go`.
  - Subsequent container boots restore the precompiled binary instantly, eliminating Go compiler latency on container restarts.
- **Dynamic Plugin Boot Integration**:
  - Support for `AUTO_INSTALL_PLUGINS="ssh postgres redis"` in Docker environments to automatically pull, verify, and compile plugins on first boot.
  - Automatic protocol detection activates plugin inspectors declared in `tcp-warden.yaml`.

#### 3. Dual API Architecture & Unix Socket Support
- **Dual API Route Prefixes**:
  - Management API endpoints now respond both at root paths (`/stats`, `/services`, `/banlist`, `/ban`, `/unban`, `/events`, `/ping`) and standard REST paths (`/api/stats`, `/api/services`, `/api/banlist`, `/api/events`).
  - Added dedicated `/services` endpoint returning the active catalog of registered services, protocols, listeners, and upstreams.
- **IPC Unix Domain Sockets**:
  - Secure local inter-process communication via `api.socket` and environment variables `ROUTEWARDEN_API_SOCKET` / `ROUTEWARDEN_API_LISTEN`.
  - Automated file permissions handling (`0660` socket mode).

#### 4. Hardened Security, Privileges & Concurrency
- **Non-Root Port Capabilities**:
  - Automatically applies `setcap 'cap_net_bind_service=+ep'` to recompiled binaries in Docker, allowing unprivileged `routewarden` user (UID 1000) to bind low ports (<1024) safely.
- **Stream Buffer Preservation (`protocol.BufferedConn`)**:
  - Guarantees zero byte loss during protocol inspection handshakes before transitioning to raw bidirectional streaming.
- **Race Condition & Thread Safety**:
  - 100% race-condition free concurrency across all proxy pipelines and plugin inspectors verified with `go test -race -count=1 ./...`.
  - Converted internal byte and packet metrics to lock-free atomic counters (`atomic.Int64`).

#### 5. Sample Configurations & Deployment Topologies
- **Overhauled Configuration Samples**:
  - Modernized `samples/` directory with dedicated manifests: `databases.yaml`, `crowdsec.yaml`, `gaming-iot.yaml`, `local-test.yaml`, and `docker-compose.yaml`.
  - Cleaned default `tcp-warden.yaml` template to showcase modular plugin registration and upstream proxying.

---

## [v1.1.1] - 2026-09-29

### Improvements & Hardening

- **Instant Recompiled Binary Caching**:
  - Container entrypoint automatically persists recompiled daemon binaries in `/var/lib/routewarden/bin/tcp-warden`.
  - Subsequent container boots and restarts load the cached binary immediately without invoking `go build`, reducing startup time from seconds to milliseconds.
- **Dual API Route Prefixes**:
  - Management API now exposes convenience aliases directly at the root (`/stats`, `/services`, `/banlist`, `/ban`, `/unban`, `/events`, `/ping`) alongside their `/api/` counterparts (`/api/stats`, `/api/services`, etc.).
- **Container Permissions & Capability Security**:
  - Automatically provisions `cap_net_bind_service` on recompiled binaries, enabling unprivileged `routewarden` user to bind low ports (<1024) safely under Docker.

---

## [v1.1.0] - 2026-09-28

### Major Architecture Updates

- **Full Plugin Modularization**:
  - Decoupled all protocol inspectors (`ssh`, `smtp`, `pop3`, `imap`, `postgres`, `mysql`, `redis`, etc.) from the core binary into the dedicated [`routewarden/plugins`](https://github.com/routewarden/plugins) repository.
  - Core binary remains a lean, zero-bloat Layer 4 transparent proxy (`generic` / `tcp`).
- **Port Range Forwarding**:
  - **1:1 Port Mapping**: Maps continuous ingress port ranges directly to matching upstream port offsets (e.g. `:8000-8005` to `10.0.0.1:9000-9005`).
  - **Many-to-One Mapping**: Routes an entire range of ingress ports into a single backend ingress pool (e.g. `:8080-8085` to `10.0.0.1:80`).
- **Auto-Installation on Boot**:
  - Added support for `AUTO_INSTALL_PLUGINS="ssh postgres redis"` in Docker Compose.
  - Automatic protocol enablement: the daemon automatically detects protocols used in `tcp-warden.yaml` and activates the corresponding plugin.
- **Unix Domain Socket API**:
  - Added support for local IPC via `api.socket` and environment variables `ROUTEWARDEN_API_LISTEN` / `ROUTEWARDEN_API_SOCKET`.

---

## [v1.0.5] - 2026-09-26

### Key Highlights

- **Embedded Manifests (`//go:embed plugin.yaml`)**:
  - Standardized manifest embedding across all official plugins via Go 1.16+ `//go:embed plugin.yaml` and `sdk.MustParseManifest()`.
  - Enables in-memory metadata inspection without needing loose YAML files on disk at runtime.
- **Manifest Versioning Separation (`manifest_version`)**:
  - Decoupled `manifest_version` (format schema version, e.g. `"1.0.0"`) from plugin release `version` (e.g. `"1.1.0"`).
  - Plugin releases can now be updated and bumped independently without mutating or breaking manifest schema validation.
- **4-Step Plugin Verification Pipeline**:
  - Implemented a strict 4-step installation pipeline when running `tcp-warden plugins install <source>`:
    1. `[1/4] Validating manifest`: Validates `plugin.yaml` syntax, uniqueness, and required fields.
    2. `[2/4] Checking manifest compatibility`: Confirms the manifest format is supported by the running SDK.
    3. `[3/4] Compiling plugin`: Runs Go compiler sanity checks (`go vet` and dry-run build).
    4. `[4/4] Running tests`: Executes `go test -race -count=1 ./...` inside the plugin directory. If tests fail or race conditions are detected, the plugin is rejected before installation.
  - Simplified and standardized CLI progress reporting to clean single-line status messages.
- **Stream Buffer Preservation (`protocol.BufferedConn`)**:
  - Resolved potential data loss when transitioning from initial protocol inspection (using `bufio.Reader`) to raw bidirectional proxying (`protocol.Proxy`).
  - `BufferedConn` ensures any unconsumed buffered bytes are forwarded to the upstream connection before streaming raw packets.
- **Race Condition Hardening**:
  - Audited all 14 official plugins with `go test -race -count=1 ./...` with zero race warnings.
  - Atomic byte counters (`atomic.Int64`) implemented across all inspectors.

---

## [v1.0.4] - 2026-09-25

### Improvements & Fixes

- **Docker Volume Mounting & State Persistence**:
  - Hardened Docker volume configuration for `/var/lib/routewarden/plugins` and `/var/lib/routewarden/data`.
  - Ensured dynamic plugin registration survives container restarts and image updates.
- **Plugin Module Resolution**:
  - Improved local directory plugin resolution (`tcp-warden plugins install ./path`).
  - Added automatic fallback to shallow cloning for Git plugin repositories.

---

## [v1.0.3] - 2026-09-24

### Features & Usability

- **Fast Plugin Installs (`--no-build`)**:
  - Added `--no-build` flag to `tcp-warden plugins install` to allow batching multiple plugin installations before triggering a single compilation step.
- **Plugin Dependency Management**:
  - Handled nested dependency resolution when plugins require external third-party Go packages.
  - Added cache management via `tcp-warden plugins install --force` to purge corrupted plugin staging directories.

---

## [v1.0.2] - 2026-09-22

### Optimizations

- **Lightweight Docker Image (~25MB)**:
  - Migrated Docker distribution to a multi-stage Alpine build.
  - Stripped debug symbols and minimized binary footprint while preserving full statically linked CGO-free portability.
- **CLI Flag Normalization**:
  - Added short flags (`-c` for `--config`, `-v` for `--version`) across all root and subcommands.
  - Improved error messages for invalid YAML syntax with line and column indicators.

---

## [v1.0.1] - 2026-09-20

### Security & Engine

- **High-Performance IP Banning Engine**:
  - In-memory concurrent hash table for instant $\mathcal{O}(1)$ connection lookups.
  - Embedded SQLite database for crash-resilient ban persistence across daemon restarts.
- **Management API & SSE Stream**:
  - Added lightweight HTTP management API on `127.0.0.1:9091`.
  - Endpoints for querying metrics (`/health`, `/metrics`), managing bans (`GET /bans`, `POST /ban`, `POST /unban`), and streaming live security audit logs via Server-Sent Events (`GET /events`).
- **Token-Bucket Rate Limiting**:
  - Configurable per-service and global rate limits (`connections_per_minute` and `burst`).
  - Sub-millisecond connection evaluation with zero socket allocation overhead.

---

## [v1.0.0] - 2026-09-18

### Initial Release

- **Core L4 Security Proxy & Firewall**:
  - High-speed Layer 4 TCP proxy engine built on Go.
  - Anti-brute-force failure tracking with automatic IP banning.
  - Native support for SSH, SMTP, POP3, IMAP, and raw TCP pass-through.
- **Modular Plugin SDK (`plugins/sdk`)**:
  - Extensible plugin architecture enabling custom protocol inspectors.
  - In-memory self-testing interface (`SelfTest()`).
  - Security event auditing (`ctx.OnSecurityEvent()`) and auth failure reporting (`ctx.OnAuthFailure()`).
- **CrowdSec LAPI Integration (Optional)**:
  - Optional real-time ban decision synchronizer with CrowdSec Local API.
  - Fallback action policies: `ban`, `throttle`, or `bypass`.
- **Port Range Forwarding**:
  - Support for 1:1 and many-to-one port range mappings (e.g. `:8000-8005`).
