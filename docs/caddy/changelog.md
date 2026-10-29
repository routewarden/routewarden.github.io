---
title: Caddy Warden Changelog & Release Notes
description: Complete release history, directive updates, and migration notes for Caddy Warden (caddy-warden).
---

# Caddy Warden Changelog & Release Notes

All notable changes to the **Caddy Warden** module (`github.com/routewarden/caddy-warden`) are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and Caddy Warden adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v1.7.0] - 2026-10-27 (Latest)

### Added
- **Offline ASN-Based Allowlisting (`allowed_asns` / `asn_db`)**:
  - Added Autonomous System Number (ASN) based allowlisting using an offline, in-memory JSON routing snapshot (`asn_db`), eliminating runtime DNS lookups and external HTTP latency.
  - Added native Caddyfile directives `allowed_asns <asns...>` and `asn_db <path>` to configure allowed ASNs (e.g. `allowed_asns AS64500 64501`) and point to the routing snapshot.
  - Added support for clearing inherited allowlists: declaring a bare `allowed_asns` directive in nested route blocks explicitly clears any inherited ASN allowlist.
  - Supported native Caddy JSON configuration API via `allowed_asns` and `asn_db` keys, with cross-engine alias compatibility (`allowedASNs`, `asnDB`) when loading shared `config_file` JSON manifests.
  - Implemented longest-prefix routing table lookup in Go across dual-stack IPv4 and IPv6 address spaces, including IPv4-mapped IPv6 addresses.
  - Preserved strict routing hierarchy: child subnets allocated to non-allowed ASNs cannot inherit parent ASN bypasses. Conflicting prefix origins are rejected at startup.
  - Resilient client IP extraction: evaluates socket peer IP unless `trusted_proxies` / `trustedProxies` are configured. Never relies on spoofable client-supplied ASN headers.
  - Bundled database compilation utility `scripts/build-asn-db.py` to convert MaxMind GeoLite2/GeoIP2 ASN Blocks CSV files into JSON routing snapshots.

### Fixed & Enhanced
- **IPv6 Scope & Zone Index Stripping**:
  - Sanitized zone identifiers (`%interface`, e.g. `%eth0`) in client IPv6 addresses during ASN radix-tree lookup, preventing `net.ParseIP` evaluation errors on scoped link-local and dual-stack addresses.
- **Caddyfile Parsing & Explicit Field Tracking**:
  - Implemented `markExplicit` field tracking to reliably distinguish explicitly declared Caddyfile directives from defaults when overriding settings on top of a shared `config_file` JSON base policy.
  - Added native Caddyfile parsing for top-level directives `status_code`, `custom_response_text`, `redirect_url`, and `proxy_url`, automatically synchronizing them with `rw.Response` configuration.
  - Added robust case-insensitive parsing for `silentDrop` (`silent_drop`, `silentdrop`, `drop`).
- **AI Bot & Crawler Defense Architecture**:
  - Documented active defense strategies (reverse slowloris tarpitting, gzip bombs, ASN gating) and architecture roadmap for AI crawler mitigation.
- **Comprehensive Unit Testing**:
  - Added extensive test coverage for Caddyfile directive parsing, explicit field inheritance, response mode fallback hierarchy, and ASN filter resolution.

---

## [v1.6.2] - 2026-10-21

### Fixed
- **Directive Order Precedence (`reverse_proxy` Interception)**:
  - Updated directive registration from `Before, "respond"` to `Before, "reverse_proxy"`. This ensures Routewarden intercepts and blocks malicious requests before Caddy forwards them to upstream backend servers.
- **`config_file` Caddy Zap Logger Restoration**:
  - Fixed an issue where Caddy's provisioned Zap logger on `rw` was clobbered by the zero-value logger in `*rw = fileCfg`, restoring structured access and security logging for sites utilizing `config_file`.
- **Caddyfile Parser HTTP Methods Defaulting**:
  - Prevented `UnmarshalCaddyfile` from unconditionally defaulting `rw.Methods = []string{"GET"}` when `config_file` is specified, allowing custom HTTP methods defined in the JSON configuration file to take effect.
- **Inline Caddyfile Flag Overrides with `config_file`**:
  - Fixed an issue where loading `config_file` discarded inline Caddyfile directives. Inline settings (`security_log`, `status_code`, `enabled`) now properly override file configurations.
- **Default Status Code Resolution & Synchronization**:
  - Fixed status code mode defaults bypassing explicit response configs when `respCfg.StatusCode == 0`. Synchronized top-level `status_code` parsing directly to `Response.StatusCode`.
- **Wildcard HTTP Method Matching**:
  - Added support for `*` and `ALL` in monitored methods (`isMethodMonitored`), enabling inspection across all HTTP methods.
- **Resilient Client IP Extraction**:
  - Enhanced `ExtractClientIP` to iterate comma-separated `X-Forwarded-For` tokens and select the first syntactically valid IP, preventing corrupt IPs from malformed headers.
- **Snake-Case Schema Parity in `ResponseConfig`**:
  - Added custom JSON unmarshaling to `ResponseConfig` supporting both `snake_case` (e.g., `gzip_ratio`, `status_code`, `redirect_url`) and `camelCase` keys.
- **Tarpit Timer Resource Leak**:
  - Replaced `time.After` in tarpit chunk streaming with `time.NewTimer` and explicit deferred cleanup, preventing timer accumulation under heavy concurrency.
- **Boolean Flag Parsing for `debug`**:
  - Added boolean argument parsing to the `debug` directive (`debug false`, `debug off`), avoiding unintentional enablement.
- **Body Buffer Preservation on Stream Read Errors**:
  - Ensured partially-read request body bytes are preserved and readable by downstream handlers even when reading encounters an error prior to EOF.
- **Accurate Path Tracking in Security Logs**:
  - Fixed security event logging where the `path` field was overwritten by query string or body match targets. The `path` field now strictly records `r.URL.Path` with matched payload fragments recorded in `matched_target`.

---

## [v1.6.1] - 2026-10-20

### Added
- **Official Multi-Arch Docker Packaging & GHCR Publishing**:
  - Added multi-stage `Dockerfile` based on `caddy:2.11.7-builder` and `caddy:2.11.7-alpine`.
  - Added GitHub Actions release workflow publishing multi-architecture (`linux/amd64`, `linux/arm64`) container images to GitHub Container Registry (`ghcr.io/routewarden/caddy-warden`) on release tags.
  - Added PR validation job in CI to verify container build integrity.
- **Base Caddy Version Upgrade**:
  - Upgraded base Caddy image reference to `2.11.7`.

---

## [v1.6.0] - 2026-10-20

### Added
- **Fractional & Floating Point Gzip Decompression Bomb Sizing (`gzip_bomb_mb`)**:
  - Added floating-point support for `gzip_bomb_mb` in Caddyfile parsing (`strconv.ParseFloat`) and `GzipBombMB float64` in `ResponseConfig`.
  - Supports fractional sizes (e.g. `gzip_bomb_mb 0.5` for a 512KB payload / 16 chunks).
  - Hardened `totalChunks` calculation with a safe minimum chunk floor (`totalChunks = 1`), preventing zero or negative chunk streaming on sub-megabyte inputs.
  - Updated dual-tag JSON schema bindings (`GzipBombMB *float64` / `GzipBombMBSnake *float64`) for both camelCase and snake_case configurations.
  - Added comprehensive test coverage in `caddyfile_test.go` (`TestCaddyfile_GzipBombMB_Float`) and `response_handler_test.go`.

---

## [v1.5.1] - 2026-10-19

### Fixed
- **Gzip Decompression Bomb (`gzip_bomb` / `bomb`) Status Code Default**:
  - Fixed `gzip_bomb` mode defaulting to `403` instead of `200 OK` when `status_code` is omitted, enticing crawlers to process the compression payload and inflate the bomb in memory.
  - Custom user-configured `status_code` values remain respected when provided.
  - Added safe fallback in `ServeBlockedRequest` ensuring `http.StatusOK` is written if `status_code` is `0`.
- **Configuration File Merging & Schema Parity (`config_file`)**:
  - Added full dual-tag schema support (`sharedResponseConfig`) for standard `snake_case` JSON properties inside `response` blocks (`status_code`, `redirect_url`, `proxy_url`, `gzip_bomb_mb`, `retry_after_seconds`, etc.), ensuring full cross-engine compatibility with Traefik, NGINX, and CLI configurations.
- **Case-Insensitive Captcha Mode Template Compilation**:
  - Fixed case-sensitive comparison (`respCfg.Mode == "captcha"`) in `NewResponseHandler`, ensuring `mode "Captcha"` and `"CAPTCHA"` properly initialize the challenge template instead of falling back to raw plaintext.

---

## [v1.5.0] - 2026-10-16

### Key Highlights

- **File-Based Configuration (`config_file`)**:
  - Added new `config_file` Caddyfile directive and `config_file` JSON field to `Routewarden`. When set, Routewarden loads the specified `routewarden.json` as the base configuration during `Provision()`.
  - Inline Caddyfile / JSON API values take precedence over the file, enabling a shared policy file with per-site Caddyfile overrides.
  - Empty/omitted inline directives defer to the file — no need to repeat `block_patterns` just to change `mode`.
  - Missing or malformed files cause an immediate provisioning error with a descriptive message.

---

## [v1.4.1] - 2026-10-07

### Key Highlights

- **Strict Status Code Canonicalization (`status_code`)**:
  - Removed deprecated `status` alias at the root Caddyfile directive level and within `response { ... }` blocks in favor of strictly canonical `status_code <int>`.
  - Added unit test coverage confirming that deprecated `status` and `path_patterns` directives fail Caddyfile parsing with clear unrecognized directive errors.
- **Canonical Directive Cleanup & Verification**:
  - Replaced legacy `path_patterns` references across test fixtures and sample Caddyfiles with canonical `block_patterns`.
  - Added comprehensive test suites verifying `block_patterns` and `allow_patterns` matching, query parameter filtering, and exact regex rule evaluation.

---

## [v1.4.0] - 2026-10-05

### Key Highlights

- **`route_warden` Directive & Module ID Registration**:
  - Registered both `"route_warden"` and `"routewarden"` directives with Caddyfile parser (`httpcaddyfile.RegisterHandlerDirective`), enabling standard snake_case Caddyfile configuration blocks (`route_warden { ... }`) as documented.
  - Registered Caddy module alias `http.handlers.route_warden` in addition to `http.handlers.routewarden`, allowing native Caddy JSON configuration blocks (`"handler": "route_warden"`) to resolve cleanly.
- **Canonical Directive Standardization & Duplicate Alias Removal**:
  - Standardized Caddyfile and JSON directives on `enable_default_patterns` and `enable_default_allow_patterns`.
  - Standardized on single canonical `block_patterns` directive replacing legacy aliases (`path_patterns`, `block_pattern`).
  - Standardized on `mode` (replacing `action`), `status_code` (replacing `status`), `check_body_patterns` (replacing `body_patterns`), and `check_body_max_bytes`.
  - Removed deprecated duplicate aliases across structs and Caddyfile unmarshaler.

---

## [v1.3.1] - 2026-10-02

### Key Highlights

- **Protocol-Relative Open Redirect Prevention (`redirectUrl`)**:
  - Hardened redirect URL validation in `response_handler.go` against protocol-relative URL evasion vectors (e.g. `//attacker.com`).
  - Restricts relative redirects strictly to single-slash prefixes (`/...`) and safely falls back to `/` if protocol-relative destinations are specified, mitigating open-redirect exploitation.
- **Security Log Schema Normalization (`level: "warn"`)**:
  - Added `"level": "warn"`, `"status_code"`, and `"matched_pattern"` across both Caddy's Zap logger and stdout JSONL logs.
  - Ensures full schema alignment with Traefik Warden, NGINX Warden, TCP Warden, and Routewarden observability stacks.
- **CI / Version Scripting Portability**:
  - Improved in-place sed editing in `scripts/update-version.sh` for reliable multi-platform execution across macOS (BSD) and Linux (GNU).

---

## [v1.3.0] - 2026-10-01

### Key Highlights

- **Trusted Proxies Support (`trusted_proxies` / `trusted_proxy`)**:
  - Added native Caddyfile directives `trusted_proxies <ips/cidrs...>` and `trusted_proxy <ips/cidrs...>` alongside JSON configuration support.
  - Forwarded headers (`X-Forwarded-For` and `X-Real-IP`) are now strictly honored **only** when the direct socket connection (`RemoteAddr`) originates from an explicitly trusted proxy or subnet.
  - Eliminates client IP spoofing risks and ensures unauthorized clients directly reaching Caddy cannot bypass `allowed_ips` filters by injecting forwarding headers.
- **Redirect Mode Security Hardening (`redirectUrl`)**:
  - Added strict validation for `redirectUrl` in response handlers, enforcing `http://`, `https://`, or root-relative paths (`/...`).
  - Blocks unsafe URL schemes (e.g. `javascript:`) to eliminate open-redirect and client-side execution vectors.
- **Silent Drop Connection Fallback**:
  - Added non-hijackable connection fallback for `silentDrop`: if Caddy's HTTP hijacker cannot acquire the raw connection (e.g. over HTTP/2, HTTP/3, or wrapped response writers), Routewarden responds with HTTP 200 OK and an empty body rather than leaking the blocking status code.
- **Captcha Template Error Handling**:
  - Added Zap structured error logging when CAPTCHA template rendering encounters an error, with an immediate fallback to a clean, well-formed HTML security challenge document.
- **Flexible Silent Drop Directives**:
  - Recognized case-insensitive aliases `silent_drop`, `silentdrop`, and `drop` in both Caddyfile and JSON configurations, canonicalizing automatically to `silentDrop`.
- **Header Candidate Path Expansion**:
  - Automatically includes raw header values in candidate path evaluation before tokenization for complete inspection parity across reverse-proxy headers.

---

## [v1.2.1] - 2026-09-24

### Key Highlights

- **Query Parameter Attack Surface Hardening (`check_query`)**:
  - Validates both parameter keys and parameter values.
  - Prevents evasion attempts where sensitive targets are passed as query keys (e.g., `/?key=val&.env=`).
  - Added recursive anti-evasion normalization for candidate query parameter paths.
- **Client IP Extraction & Port/Bracket Normalization (`cleanIP`)**:
  - Handles client IPs with embedded ports (`192.168.1.1:8080`) or bracketed IPv6 formats (`[2001:db8::1]`) from reverse proxies or CDNs before CIDR evaluation.
- **Response Modes & Silent Drop Parity (`mode silentDrop`)**:
  - Standardized modern `mode silentDrop` syntax in Caddyfile and JSON configurations.
- **Honeypot Evaluation Scope (`fakeSuccess`)**:
  - Evaluates both normalized URL paths and raw request URIs to ensure honeypot decoys cannot be bypassed via URI manipulation.
- **Caddyfile Configuration Hardening**:
  - Added singular directive aliases (`path_pattern`, `block_pattern`, `allow_pattern`, `allowed_ip`) for configuration convenience.
  - Enforced top-level status code validation in `Validate()`.

---

## [v1.2.0] - 2026-09-24

### Key Highlights

- **Routewarden CLI (`rwarden generate --target caddy`)**:
  - Added direct compilation from universal `routewarden.json` policy manifests into native `route_warden` Caddyfile blocks.
- **Caddyfile Block Parsing Enhancements (`caddyfile.go`)**:
  - Enhanced parsing for nested response settings, headers, and custom tarpit/captcha properties.
- **Unified Versioning Automation**:
  - Integrated `scripts/update-version.sh` for atomic updates across `version.json`, `README.md`, and Caddy docs.

---

## [v1.1.0] - 2026-09-20

### Key Highlights

- **Expanded Default Block Patterns**:
  - Built-in coverage for private keys (`*.pem`, `*.key`), container manifests (`Dockerfile*`, `docker-compose*.yml`), `.DS_Store`, and CMS configs (`wp-config.php*`, `settings.py`).
- **Header Smuggling Protection (`check_headers`)**:
  - Configurable header list (`X-Forwarded-Uri`, `X-Rewrite-URL`, `X-Original-URL`, etc.) with recursive normalization.
- **Path Normalizer Fuzz Testing**:
  - Integrated fuzz testing (`FuzzExtractCandidatePaths`) for Caddy URL normalization pipelines.

---

## [v1.0.0] - 2026-09-20

### Key Highlights

- **Official Caddy v2 Module GA Release**:
  - Seamless integration via `xcaddy build --with github.com/routewarden/caddy-warden`.
  - Native `route_warden` Caddyfile directive and dynamic Caddy JSON API support.
  - Full support for all 13 response modes (`tarpit`, `gzipBomb`, `fakeSuccess`, `captcha`, `silentDrop`, etc.).
  - Automatic order declaration: `order route_warden before reverse_proxy`.
  - Structured security logging (`security_log true`) compatible with CrowdSec.

---

## [v0.3.x Series] (Archived)

- **HTTP Method Constraints (`method <verbs...>`)**: Granular verb filtering in Caddyfile and JSON matchers.
- **Diagnostic Logging (`debug true`)**: Verbose stdout diagnostic traces of candidate path transformations.
- **CrowdSec Auto-Ban Logging (`security_log true`)**: Emits single-line JSON block audit events to stdout.
