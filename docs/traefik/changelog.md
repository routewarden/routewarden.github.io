---
title: Traefik Warden Changelog & Release Notes
description: Complete release history, breaking changes, and migration notes for Traefik Warden (traefik-warden).
---

# Traefik Warden Changelog & Release Notes

All notable changes to the **Traefik Warden** plugin (`github.com/routewarden/traefik-warden`) are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and Traefik Warden adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v1.8.0] - 2026-10-30 (Latest)

### Added
- **AI Bot & Web Crawler Defense**:
  - Added native detection and blocking of automated LLM scrapers and AI crawlers (`blockAIBots` / `block_ai_bots` setting).
  - Built-in multi-tier AI bot registry with profiles: `train_only` (default: blocks mass training harvesters like `GPTBot`, `ClaudeBot`, `Bytespider`, `CCBot`), `all` (blocks all training and search bots including `PerplexityBot` and `OAI-SearchBot`), `aggressive` (blocks aggressive crawlers like Bytespider), and `custom` (`aiBotProfile` setting).
  - Added custom User-Agent pattern blocking via `blockUserAgents` and allowlisting via `allowUserAgents`.
- **Negative ASN Filtering (`blockedASNs`)**:
  - Added support for blocking client IP addresses originating from hostile Autonomous Systems or scraping clouds via `blockedASNs` / `blocked_asns` (e.g. ByteDance `AS138699`, DigitalOcean `AS14061`) using local offline routing snapshot (`asnDB`).
- **Active Deception Response Modes (`aiPoison` & `markovTarpit`)**:
  - Added `mode: "aiPoison"`: Serves HTTP 200 with `X-Robots-Tag: noindex, nofollow, noai` and adversarial system prompt injection directives, neutralizing data poisoning into RAG and model training pipelines.
  - Added `mode: "markovTarpit"`: Continuously streams pseudo-coherent Markov text tokens at configured delays (`tarpitDelayMs`), exhausting scraper worker capacity and token context windows.
- **Honeypot Spider Traps & In-Memory IP Ban Table**:
  - Added `honeypotTrapPaths` to designate invisible honeypot routes in web templates.
  - Added zero-dependency, Yaegi-compliant thread-safe bounded in-memory sliding-window IP ban table: any crawler accessing a honeypot path is banned for `trapBanDuration` (default: `24h`), automatically rejecting subsequent requests.
- **Search Engine Impersonator Verification via FCrDNS (`verifySearchEngineBots`)**:
  - Added Forward-Confirmed Reverse DNS verification setting `verifySearchEngineBots` / `verify_search_engine_bots`.
  - Performs reverse DNS PTR lookups and forward IP cross-validation for crawlers presenting Googlebot, bingbot, or Applebot User-Agents against authorized domain suffixes (`.googlebot.com`, `.google.com`, `.search.msn.com`, `.applebot.apple.com`).
  - Includes a zero-dependency, 100% Yaegi-compliant in-memory cache with 6-hour TTL (up to 10,000 entries) and 500ms timeout.
  - Allows verified search engine spiders through to upstream services while instantly blocking spoofed bots (`search_engine_spoofed`).
- **Browser Impersonation Detection (`detectBrowserImpersonation`)**:
  - Added `detectBrowserImpersonation` / `detect_browser_impersonation` option to detect and block bots disguising themselves with desktop/mobile browser User-Agents.
  - Cross-validates Client Hints (`Sec-CH-UA-Platform` matching OS in User-Agent, `Sec-CH-UA-Mobile` form factor consistency, `Sec-CH-UA` presence on modern Chromium $\ge 89$, and brand integrity), Chromium Fetch Metadata (`Sec-Fetch-Site`, `Sec-Fetch-Mode`, `Sec-Fetch-Dest`), and mandatory companion headers (`Accept-Language`, `Accept-Encoding`).
- **Script Client & Headless Automation Blocking (`blockScriptClients`)**:
  - Added `blockScriptClients` / `block_script_clients` option to block requests originating from programmatic HTTP client libraries (Python `requests`, `urllib`, `aiohttp`, `httpx`, `Scrapy`, `curl-cffi`, `mechanize`, PHP `Guzzle`, Rust `reqwest`, Node `axios`, `node-fetch`, `undici`, Go `Go-http-client`, Java `OkHttp`, `curl`, `wget`) and headless automation frameworks (`X-Playwright`, `X-Puppeteer`, `X-Selenium`, `X-Cypress`, `X-Headless-Chrome`, `X-Automation`, `Sec-WebDriver`).
- **Edge robots.txt Dynamic Honeypot Injection (`enableRobotsTxtHoneypot`)**:
  - Dynamically injects daily rotating `Disallow: /_rw_trap_<token>/` entries into `/robots.txt` with HMAC-SHA256 tokens and UTC day rollover tolerance.
  - Synthesizes 200 OK `robots.txt` responses when origin returns 404, trapping non-compliant crawlers into `BanTable`.
- **10-Engine Global FCrDNS Verification (`verifySearchEngineBots`)**:
  - Expanded search engine verification to 10 global engines: Google, Bing, Apple, Yandex, Baidu, DuckDuckGo, Yahoo, Naver, Sogou, and Mojeek.
- **Chromium GREASE & Header Order Anomaly Detection (`detectBrowserImpersonation`)**:
  - Validates Chromium GREASE brand presence (`missing_grease_brand`) and detects HTTP header order anomalies (`header_order_anomaly`).
- **Datacenter & Cloud Hosting IP Classification (`blockCloudHosts`)**:
  - Identifies and blocks requests from major cloud infrastructure (AWS, GCP, Azure, Hetzner, DigitalOcean, OVH, Linode, Oracle, ByteDance), emitting `datacenter_browser_impersonation` or `cloud_host_blocked` with FCrDNS exemptions for legitimate search crawlers.
- **Cryptographic Proof-of-Work Challenge Mode (`powChallenge`)**:
  - Added zero-dependency client-side Hashcash challenge solver (<2KB inline HTML/JS using Web Crypto `crypto.subtle`) returning HTTP 429.
  - $O(1)$ stateless token verification via normalized client IP binding and HMAC-SHA256 signatures (`powDifficulty`, `powSecret`, `powTimeoutSeconds`).
  - Solved `rw_pow` cookie or `X-RouteWarden-PoW` bypasses bot inspection while keeping honeypot traps and hard IP bans immutable.

---

## [v1.7.0] - 2026-10-27

### Added
- **Offline ASN-Based Allowlisting (`allowedASNs` / `asnDB`)**:
  - Added support for Autonomous System Number (ASN) based allowlisting using an offline, in-memory JSON routing snapshot (`asnDB`), eliminating runtime DNS and external HTTP dependencies.
  - Supports standard string-formatted ASN identifiers such as `"64500"` or `"AS64500"` (case-insensitive).
  - Implements in-memory longest-prefix matching across IPv4 and IPv6 routing tables, including dual-stack support and IPv4-mapped IPv6 client addresses (`::ffff:x.x.x.x`).
  - Preserves hierarchical routing boundaries: more specific prefixes owned by another ASN never inherit an allowed parent's bypass. Conflicting origins for the exact same prefix are rejected during snapshot validation.
  - Non-matching client IPs continue through standard security inspection without rejection; matching client IPs bypass inspection identical to `allowedIps`.
  - Added strict peer IP resolution: client-supplied ASN headers (e.g. `CF-Connecting-ASN`) are never trusted. Evaluates direct socket peer IP unless `trustedProxies` / `trusted_proxies` are explicitly configured.
  - Bundled database compilation utility `scripts/build-asn-db.py` to convert MaxMind GeoLite2/GeoIP2 ASN Blocks CSV files into optimized JSON routing snapshots.
  - Added cross-engine configuration alias support: accepts both camelCase (`allowedASNs`, `asnDB`) and snake_case (`allowed_asns`, `asn_db`) via shared `configFile` (`routewarden.json`) policies.

### Fixed & Enhanced
- **IPv6 Scope & Zone Index Stripping**:
  - Automatically strip zone identifiers (`%interface`, e.g. `%eth0`) from client IPv6 addresses before parsing in `ASNFilter.Lookup` and `IPFilter`. Prevents `net.ParseIP` evaluation failures on scoped link-local and dual-stack socket addresses.
- **Response Handler Normalization & Status Code Fallbacks**:
  - Synchronized response status code fallback and mode handling across all 13 response modes, ensuring consistent status codes and headers in `ServeBlockedRequest`.
  - Hardened silent drop connection termination and custom response text delivery.
- **AI Bot & Crawler Defense Architecture**:
  - Published comprehensive AI bot mitigation guide covering active tarpits, gzip bomb counters, and ASN filtering against automated LLM training scrapers (`GPTBot`, `ClaudeBot`, `Bytespider`, `CCBot`).
- **Test Suite Hardening**:
  - Added unit test coverage for IPv6 zone handling, response mode fallbacks, Yaegi interpreter compliance, and path normalizer edge cases.

---

## [v1.6.0] - 2026-10-20

### Security
- **Critical Fix: Matrix Parameter Allowlist Bypass (`/.env;robots.txt`)**:
  - Fixed an issue in `ExtractCandidatePaths` where semicolon matrix parameters (e.g. `;robots.txt`, `;sitemap.xml`, `;.well-known`) were extracted as standalone root candidate paths (`/robots.txt`). Because `AllowPatterns` evaluates before `BlockPatterns`, this enabled attackers to bypass blocking on sensitive files (`/.env`, `/backup.sql`, `/.git`) simply by appending `;robots.txt`.
  - Removed synthetic parameter-to-path generation while preserving matrix parameter stripping (`matrixStripped`) and semicolon slash normalization (`semiAsSlash`), ensuring all sensitive patterns inside or outside matrix segments are blocked.

### Added
- **Wildcard HTTP Methods Matching (`*` and `ALL`)**:
  - Added native support for `methods: ["*"]` and `methods: ["ALL"]` in `Config` and `ServeHTTP`. Operators can now inspect all HTTP methods across all endpoints without needing to list every verb explicitly.
- **Automatic Method Expansion on Request Body Inspection (`checkBody`)**:
  - When `checkBody: true` or `checkBodyPatterns` is configured and `methods` was left to its default `["GET"]`, Routewarden now automatically expands inspected methods to include `POST`, `PUT`, and `PATCH`. Prevents the silent configuration trap where request bodies submitted via mutation verbs were bypassed.
- **Flexible Snake_Case Support in `CaptchaConfig`**:
  - Added `UnmarshalJSON` to `CaptchaConfig` enabling transparent parsing of standard `site_key` (snake_case) from `routewarden.json` and YAML dynamic configurations.
- **Fractional & Floating Point Gzip Bomb Sizes (`gzipBombMB`)**:
  - Added floating-point support for `gzipBombMB` (e.g. `gzipBombMB: 0.5` for a 512KB payload) in `ResponseConfig`, allowing fine-grained control over bomb sizes in memory-constrained environments.

---

## [v1.5.1] - 2026-10-19

### Fixed
- **Gzip Decompression Bomb (`gzipBomb` / `bomb`) Status Code Default**:
  - Fixed `gzipBomb` mode defaulting to `403 Forbidden` instead of `200 OK` when `statusCode` is omitted. Web vulnerability scanners and crawlers typically discard response bodies on `4xx` error codes without decompressing; an enticing `200 OK` header forces the scanner's decompression stream to inflate the bomb in memory.
  - Explicit user-configured `statusCode` values (e.g. `403`, `418`, `404`) remain respected when provided.
  - Added safe fallback in `ServeBlockedRequest` ensuring `http.StatusOK` is written if `statusCode` evaluates to `0`.
- **Configuration File Merging & Schema Parity (`configFile`)**:
  - Fixed an issue where `CreateConfig()` non-zero defaults (`statusCode: 403`, `methods: ["GET"]`, `securityLog: true`, `mode: "text"`) clobbered custom settings loaded from `routewarden.json`.
  - Added full dual-tag schema support (`sharedConfigFile`) for standard `snake_case` JSON properties (`status_code`, `block_patterns`, `allowed_ips`, `trusted_proxies`, `check_query`, etc.), ensuring complete cross-engine compatibility with Caddy, NGINX, and CLI configurations.
- **Case-Insensitive Captcha Mode Template Compilation**:
  - Fixed case-sensitive comparison (`respCfg.Mode == "captcha"`) in `NewResponseHandler`, ensuring `mode: "Captcha"` and `"CAPTCHA"` properly initialize the challenge template instead of falling back to raw plaintext.
  - Standardized captcha fallback body to render a valid HTML document conforming to `Content-Type: text/html`.

---

## [v1.5.0] - 2026-10-16

### Key Highlights

- **File-Based Configuration (`configFile`)**:
  - Added new `configFile` field to `Config`. When set, Routewarden loads the specified `routewarden.json` as the base configuration at startup.
  - Inline `traefik.yml` / Docker label values take precedence over the file, enabling a shared policy file with per-service overrides.
  - Empty/omitted inline slices defer to the file so `blockPatterns` from the file are preserved when only overriding `response.mode`.
  - Missing or malformed files cause an immediate startup error with a descriptive message — no silent fallback to defaults.
  - Added 6 new unit tests covering: file-only load, inline override, missing file error, malformed JSON error, pattern merge from file, and empty-path no-op.

---

## [v1.4.2] - 2026-10-09

### Key Highlights

- **Traefik Catalog Archive Integrity & Fresh Checksum Release**:
  - Published clean SemVer patch release `v1.4.2` to resolve the immutable hash mismatch on Traefik Plugin Catalog (`plugins.traefik.io`), preventing `plugin integrity check failed` errors when installing from the catalog.
- **Local & Offline Plugin Installation (`/plugins-local`)**:
  - Added comprehensive documentation and production deployment guides for running Routewarden as a local Traefik plugin via `--experimental.localplugins` and volume mounting to `/plugins-local/src/github.com/routewarden/traefik-warden`, enabling zero-network air-gapped and enterprise usage.
- **Documentation & Configuration Parity**:
  - Updated configuration tables with full documentation for `trustedProxies`, `checkHeaders`, `checkBody`, `checkBodyMaxBytes`, and `checkBodyPatterns`.
  - Corrected default `response.mode` to `"text"` (matching `CreateConfig()`).
  - Aligned all documentation links to canonical routes (`/traefik/*`, `/core/*`).

---

## [v1.4.1] - 2026-10-07

### Key Highlights

- **Standardization on Canonical `blockPatterns` Directive**:
  - Replaced all legacy `pathPatterns` and `path_patterns` references across documentation, Docker Compose examples, `.traefik.yml` manifest, and test scripts with canonical `blockPatterns`.
  - Enforced strict canonical configuration directives, verifying that legacy aliases (`pathPatterns`, `path_patterns`, `action`) do not populate active middleware configuration.
- **Enhanced Verification & Alias Safety**:
  - Added comprehensive test suites verifying `blockPatterns` and `allowPatterns` matching, wildcard prefixes, and regex override precedence.
  - Added unit tests confirming removed legacy alias keys are ignored and do not affect canonical fields.

---

## [v1.4.0] - 2026-10-05

### Key Highlights

- **Canonical Directive Standardization & Duplicate Alias Removal**:
  - Standardized on `enableDefaultPatterns` and `enableDefaultAllowPatterns` as the canonical boolean opt-in flags for built-in rule sets.
  - Standardized on single canonical `blockPatterns` (list of regex strings) replacing all legacy aliases (`pathPatterns`, `path_patterns`, `block_pattern`).
  - Standardized on `mode` (replacing `action`), `statusCode` (replacing `status`), `checkBodyPatterns` (replacing `bodyPatterns`/`body_pattern`), and `checkBodyMaxBytes`.
  - Removed duplicate config aliases across Go structures and documentation to eliminate configuration drift.
- **Docker Label Parsing Parity**:
  - Ensured compatibility with CLI label compilation, supporting indexed array notation (`blockPatterns[0]`, `allowedIps[0]`, etc.).

---

## [v1.3.1] - 2026-10-02

### Key Highlights

- **Security Log Schema Normalization (`level: "warn"`)**:
  - Embedded `"level": "warn"` directly into structured JSON `routewarden_block` log outputs.
  - Ensures seamless compatibility with log forwarders (Promtail, Vector, Fluentbit) and SIEM pipelines that filter and colorize security events based on log severity level.
- **HTTP Status Code Telemetry (`status_code`)**:
  - Added `"status_code"` field to security events representing the effective HTTP response status code dispatched to the client (`403` for forbidden, `429` for rate limit, `302` for redirect, or `0` for silent drop).
- **Dashboard Telemetry Field Parity (`matched_pattern`)**:
  - Emitted `"matched_pattern"` alongside `"pattern"` in log events to guarantee 100% out-of-the-box compatibility with security overview dashboards and top blocked pattern metrics.

---

## [v1.3.0] - 2026-10-01

### Key Highlights

- **Trusted Proxies Support (`trustedProxies`)**:
  - Added `trustedProxies` configuration to `IPFilter` allowing operators to declare upstream load balancers, reverse proxies, and CDN CIDR subnets.
  - Forwarded client IP headers (`X-Forwarded-For` and `X-Real-IP`) are now **only** trusted when the direct socket connection (`RemoteAddr`) originates from a declared trusted proxy.
  - Prevents attackers from spoofing allowlisted CIDRs by sending forged `X-Forwarded-For` headers directly to the Traefik entrypoint.
  - Automatically falls back to socket `RemoteAddr` when the direct peer is not in `trustedProxies`.
- **Redirect Mode Security Hardening (`response.mode: redirect`)**:
  - Added strict validation for `redirectUrl` during middleware initialization.
  - Restricts redirect destinations to `http://`, `https://`, or local relative paths beginning with `/`, preventing open-redirect exploitation and `javascript:` pseudo-protocol execution.
- **Silent Drop Fallback Resilience (`response.mode: silentDrop`)**:
  - Added robust fallback when HTTP hijacking (`http.Hijacker`) is unavailable in the execution environment (e.g., HTTP/2 connections or specific proxy handlers).
  - Falls back to returning HTTP 200 OK with an empty body instead of leaking the blocking error status code, ensuring security scanning tools cannot infer rule triggering.
- **Captcha Template Error Handling**:
  - Implemented safe error recovery for custom and default CAPTCHA templates; logs render errors to stderr and emits a clean HTML challenge document to prevent empty or corrupted client responses.
- **Query Parameter Candidate Slice Safety**:
  - Bounded candidate slice capacities (`keyCandidates[:len:len]` and `valCandidates[:len:len]`) during query parameter evaluation to prevent slice backing-array mutation or aliasing bugs.

---

## [v1.2.1] - 2026-09-24

### Key Highlights

- **Query Parameter Attack Surface Hardening (`checkQuery`)**:
  - Query parameter inspection now validates both parameter **keys** and **values**.
  - Neutralizes evasion attempts where malicious sensitive file paths are hidden in parameter names (e.g., `/?foo=bar&.env=1` or `/?settings.py=`).
  - Added recursive path normalization on candidate query parameters.
- **Client IP Extraction & Port/Bracket Normalization (`ip_filter`)**:
  - Hardened IP address parsing when upstream reverse proxies, load balancers, or CDNs (Cloudflare, AWS ALB, NGINX) include ports or brackets in `X-Forwarded-For` or `X-Real-IP` headers (e.g., `192.168.1.1:8080` or `[2001:db8::1]`).
  - Implemented automatic port and bracket stripping (`cleanIP`) before passing to CIDR evaluation, preventing false rejections of legitimate whitelisted IPs.
- **Response Modes & Silent Drop Parity (`response.mode: silentDrop`)**:
  - Standardized `silentDrop` mode to match the modern `response.mode: silentDrop` configuration (replacing legacy direct `silentDrop: bool`).
- **Honeypot Evaluation Scope (`fakeSuccess`)**:
  - Ensured `fakeSuccess` honeypot evaluation inspects both normalized URL paths and raw request URIs to prevent bypasses via URI manipulation.
- **Traefik Logging Clean-Up**:
  - Standardized debug logging to stdout and eliminated duplicate stderr log messages.

---

## [v1.2.0] - 2026-09-24

### Key Highlights

- **Routewarden CLI (`rwarden`) Multi-Target Generation**:
  - Native compilation targets for Traefik:
    - `rwarden generate --target traefik-yaml`: Compiles `routewarden.json` directly into Traefik Dynamic Configuration YAML format.
    - `rwarden generate --target traefik-toml`: Compiles `routewarden.json` directly into Traefik Dynamic Configuration TOML format.
    - `rwarden generate --target traefik-labels`: Compiles `routewarden.json` directly into Traefik Docker Compose label syntax.
- **Interactive CodeViewer & Setup Snippets**:
  - Implemented interactive `Diff` toggle in the 30-Second Setup documentation component.
- **Unified Versioning Automation**:
  - Updated `scripts/update-version.sh` to automatically synchronize `VERSIONING.md` alongside `version.json`, `README.md`, and source files upon release.

---

## [v1.1.0] - 2026-09-20

### Key Highlights

- **Expanded Default Block Patterns**:
  - Added built-in protection for private cryptographic keys and certificates (`*.pem`, `*.key`, `*.crt`, `*.pfx`, `*.p12`, `*.jks`, `*.kdb`).
  - Added container manifest blocking (`Dockerfile*`, `docker-compose*.yml`, `docker-compose*.yaml`).
  - Added OS directory structure leak protection (`.DS_Store`).
  - Added CMS and framework configuration file protection (`wp-config.php*`, `configuration.php*`, `settings.py`, `local_settings.py`).
- **Header Injection & Forwarded Path Inspection (`checkHeaders`)**:
  - Configurable header inspection list to neutralize HTTP reverse-proxy header smuggling (`X-Forwarded-Uri`, `X-Rewrite-URL`, `X-Original-URL`, `X-Custom-Path`).
  - Headers are passed through candidate path extraction and normalization before regex matching.
- **Path Normalizer Fuzz Testing**:
  - Implemented continuous fuzz testing (`FuzzExtractCandidatePaths`) targeting percent-decoding, null bytes, backslashes, and matrix parameters.

---

## [v1.0.0] - 2026-09-20

### Key Highlights

- **General Availability Release**:
  - Production-ready plugin for Traefik v2 and Traefik v3.
  - Multi-layer anti-evasion path normalization (percent-decoding `%252e%252e`, null-byte stripping, backslash conversion, dot-segment traversal protection).
  - Full suite of **13 response modes** (`tarpit`, `gzipBomb`, `fakeSuccess`, `captcha`, `silentDrop`, `rateLimitChallenge`, `proxy`, `infiniteStream`, `json`, `html`, `text`, `xml`, `redirect`).
  - IPv4 and IPv6 CIDR subnet whitelisting (`allowedIps`).
  - Origin client IP resolution through `X-Forwarded-For` and `X-Real-IP`.

---

## [v0.3.x Series] (Archived)

- **HTTP Method Filtering (`methods`)**: Granular verb filtering in path rules (`blockPatterns[].methods: ["POST", "PUT"]`).
- **CrowdSec SIEM Audit Logging (`securityLog: true`)**: Single-line JSON block events on stdout for CrowdSec auto-bans.
- **Diagnostic Debug Logging (`debug: true`)**: Verbose stdout diagnostic traces of candidate path transformations.

---

## [v0.2.x Series] (Archived)

- **CIDR/IP Whitelisting (`allowedIps`)**: Network subnet allowlists to bypass security filtering.
- **Multi-Mode Response Engine**: 13 response behaviors including reverse slowloris tarpits and synthetic decoys.
- **Normalized Path Matching**: Strict pre-regex path canonicalization.
