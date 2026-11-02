---
title: NGINX Warden Changelog & Release Notes
description: Complete release history, OpenResty Lua updates, and migration notes for NGINX Warden (nginx-warden).
---

# NGINX Warden Changelog & Release Notes

All notable changes to **NGINX Warden** (`github.com/routewarden/nginx-warden`) are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and NGINX Warden adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v1.8.0] - 2026-10-30 (Latest)

### Added
- **AI Bot & Web Crawler Defense**:
  - Added native detection and blocking of automated LLM scrapers and AI crawlers (`block_ai_bots` Lua option).
  - Built-in multi-tier AI bot registry supporting `train_only` (default: `GPTBot`, `ClaudeBot`, `Bytespider`, `CCBot`), `all` (`PerplexityBot`, `OAI-SearchBot`), `aggressive`, and `custom` profiles via `ai_bot_profile`.
  - Added custom User-Agent pattern blocking via `block_user_agents` and allowlisting via `allow_user_agents`.
- **Negative ASN Filtering (`blocked_asns`)**:
  - Added support for blocking client IP addresses originating from hostile Autonomous Systems or scraping clouds via `blocked_asns` (e.g. `AS138699`) using local offline routing snapshot (`asn_db`).
- **Active Deception Response Modes (`aiPoison` & `markovTarpit`)**:
  - Added `mode = "aiPoison"`: Serves HTTP 200 with `X-Robots-Tag: noindex, nofollow, noai` and adversarial system prompt injection directives.
  - Added `mode = "markovTarpit"`: Continuously streams pseudo-coherent Markov text tokens at configured delays (`tarpit_delay_ms`), exhausting scraper worker capacity.
- **Honeypot Spider Traps & In-Memory IP Ban Table**:
  - Added `honeypot_trap_paths` to configure invisible honeypot routes in web templates.
  - Added bounded in-memory sliding-window IP ban table: any crawler accessing a honeypot path is banned for `trap_ban_duration` (default: `24h`), automatically rejecting subsequent requests.
- **Search Engine Impersonator Verification via FCrDNS (`verify_search_engine_bots`)**:
  - Added Forward-Confirmed Reverse DNS verification setting `verify_search_engine_bots`.
  - Performs reverse DNS PTR lookups and forward IP cross-validation for crawlers presenting Googlebot, bingbot, or Applebot User-Agents against authorized domain suffixes (`.googlebot.com`, `.google.com`, `.search.msn.com`, `.applebot.apple.com`).
  - Includes a bounded in-memory cache with 6-hour TTL (up to 10,000 entries) and 500ms timeout.
  - Allows verified search engine spiders through to upstream services while instantly blocking spoofed bots (`search_engine_spoofed`).
- **Browser Impersonation Detection (`detect_browser_impersonation`)**:
  - Added `detect_browser_impersonation` option to detect and block bots disguising themselves with desktop/mobile browser User-Agents.
  - Cross-validates Client Hints (`Sec-CH-UA-Platform` matching OS in User-Agent, `Sec-CH-UA-Mobile` form factor consistency, `Sec-CH-UA` presence on modern Chromium $\ge 89$, and brand integrity), Chromium Fetch Metadata (`Sec-Fetch-Site`, `Sec-Fetch-Mode`, `Sec-Fetch-Dest`), and mandatory companion headers (`Accept-Language`, `Accept-Encoding`).
- **Script Client & Headless Automation Blocking (`block_script_clients`)**:
  - Added `block_script_clients` option to block requests originating from programmatic HTTP client libraries (Python `requests`, `urllib`, `aiohttp`, `httpx`, `Scrapy`, `curl-cffi`, `mechanize`, PHP `Guzzle`, Rust `reqwest`, Node `axios`, `node-fetch`, `undici`, Go `Go-http-client`, Java `OkHttp`, `curl`, `wget`) and headless automation frameworks (`X-Playwright`, `X-Puppeteer`, `X-Selenium`, `X-Cypress`, `X-Headless-Chrome`, `X-Automation`, `Sec-WebDriver`).
- **Edge robots.txt Dynamic Honeypot Injection (`enable_robots_txt_honeypot`)**:
  - Dynamically injects daily rotating `Disallow: /_rw_trap_<token>/` bait into `/robots.txt` via pure-Lua HMAC-SHA256 calculation and UTC rollover tolerance.
  - Automatically synthesizes 200 OK `robots.txt` responses when origin returns 404, trapping non-compliant scrapers into `BanTable`.
- **10-Engine Global FCrDNS Verification (`verify_search_engine_bots`)**:
  - Expanded search engine verification to 10 global engines: Google, Bing, Apple, Yandex, Baidu, DuckDuckGo, Yahoo, Naver, Sogou, and Mojeek.
- **Chromium GREASE & Header Order Anomaly Detection (`detect_browser_impersonation`)**:
  - Added Chromium GREASE brand validation (`missing_grease_brand`) and HTTP header order anomaly detection (`header_order_anomaly`).
- **Datacenter & Cloud Hosting IP Classification (`block_cloud_hosts`)**:
  - Added `block_cloud_hosts = true` option to classify and block datacenter scrapers and browser impersonators from AWS, GCP, Azure, Hetzner, DigitalOcean, OVH, Linode, Oracle, ByteDance, with FCrDNS exemptions for legitimate search crawlers.
- **Cryptographic Proof-of-Work Challenge Mode (`powChallenge`)**:
  - Added `mode = "powChallenge"` with response configuration options: `pow_difficulty`, `pow_secret`, `pow_timeout_seconds`.
  - Serves zero-dependency Web Crypto Hashcash solver (<2KB) returning HTTP 429, allowing solved `rw_pow` cookie or `X-RouteWarden-PoW` header to bypass route blocks while keeping honeypot traps and hard IP bans immutable.

---

## [v1.7.0] - 2026-10-27

### Added
- **Offline ASN-Based Allowlisting (`allowed_asns` / `asn_db`)**:
  - Added support for Autonomous System Number (ASN) based allowlisting using an offline JSON routing snapshot (`asn_db`) parsed into an in-memory lookup table during worker initialization (`init_by_lua_block`), incurring zero runtime HTTP/DNS latency.
  - Added Lua configuration table options `allowed_asns = { "AS64500" }` and `asn_db = "/etc/routewarden/asn.json"`, with dual-casing support for camelCase keys (`allowedASNs`, `asnDB`) when loading shared `routewarden.json` policy manifests.
  - Implemented longest-prefix routing table matching supporting both IPv4 and IPv6 addresses, including IPv4-mapped IPv6 addresses (`::ffff:x.x.x.x`).
  - Added hierarchical route preservation: more specific routes allocated to other ASNs do not inherit an allowed parent's bypass. Conflicting prefix origins are rejected during database initialization.
  - Non-matching client IPs continue to standard path inspection without rejection; matching client IPs bypass inspection identical to `allowed_ips`.
  - Added integration with `trusted_proxies` to evaluate real client IPs safely without trusting client-supplied ASN headers.
  - Bundled database compilation utility `scripts/build-asn-db.py` to convert MaxMind GeoLite2/GeoIP2 ASN Blocks CSV files into JSON routing snapshots.
  - Synchronized `_VERSION = "1.7.0"` across all core Lua modules (`resty.routewarden.*`).

### Fixed & Enhanced
- **IPv6 Scope & Zone Identifier Sanitization**:
  - Stripped IPv6 zone identifiers in OpenResty Lua ASN lookups before network prefix matching, ensuring link-local and scoped IPv6 client connections resolve reliably against routing tables.
- **Normalizer & Response Modes Refinements**:
  - Refined URL path normalization edge cases and synchronized response handler fallbacks across all 13 response modes in pure Lua.
  - Hardened silent drop connection resets and custom response text delivery.
- **AI Bot & Crawler Defense Architecture**:
  - Published comprehensive AI bot mitigation guide covering active tarpits, gzip bomb counters, and ASN filtering against automated LLM training scrapers (`GPTBot`, `ClaudeBot`, `Bytespider`, `CCBot`) in OpenResty.
- **Test Suite Expansion**:
  - Added new Test::Nginx and pure-Lua test cases in `t/test_routewarden.lua` and `t/test_asn.lua`.

---

## [v1.6.0] - 2026-10-20

### Added
- **Fractional & Floating Point Gzip Decompression Bomb Sizing (`gzip_bomb_mb`)**:
  - Supported floating-point values for `gzip_bomb_mb` in `response.lua` (e.g., `gzip_bomb_mb = 0.5`).
  - Added safe chunk floor guard (`if total_chunks <= 0 then total_chunks = 1 end`) preventing empty or negative chunk streaming on sub-megabyte sizes.
  - Added test coverage in `t/test_response.lua`.
- **Module Version Synchronization (`1.6.0`)**:
  - Synchronized `_VERSION = "1.6.0"` across all core Lua modules: `resty.routewarden.config`, `resty.routewarden.init`, `resty.routewarden.ip_filter`, `resty.routewarden.logger`, `resty.routewarden.normalizer`, and `resty.routewarden.response`.
  - Updated `version.json` and `VERSIONING.md`.

---

## [v1.5.1] - 2026-10-19

### Fixed
- **Gzip Decompression Bomb (`gzip_bomb` / `bomb`) Status Code Default**:
  - Fixed `gzip_bomb` mode defaulting to `403` instead of `200 OK` in `_M.new()` when `status_code` is not configured, ensuring crawlers receive an enticing `200 OK` header to trigger decompression.
  - Custom user-configured `status_code` values remain respected when provided.

---

## [v1.5.0] - 2026-10-16

### Key Highlights

- **File-Based Configuration (`config_file`)**:
  - Added new `config_file` option to `routewarden.new({ config_file = "/etc/routewarden/routewarden.json" })` (or passing the file path directly: `routewarden.new(filepath)`).
  - Automatically loads and parses shared `routewarden.json` policy manifests, mapping universal camelCase properties (`enableDefaultPatterns`, `blockPatterns`, `allowedIps`, `response.mode`, `statusCode`) to native Lua table keys.
  - Supports OpenResty's built-in `cjson` / `cjson.safe` with an embedded pure-Lua JSON parser fallback for standalone environments.
  - Inline Lua configuration overrides file settings while preserving file-defined rule slices.
  - Missing or malformed configuration files cause a hard startup error with descriptive diagnostics.
  - Added unit test coverage in `t/test_config.lua`.

---

## [v1.4.1] - 2026-10-07

### Key Highlights

- **Strict Status Code Canonicalization (`status_code`)**:
  - Removed deprecated `opts.status` and `opts.response.status` alias fallbacks in OpenResty Lua configuration (`init.lua`) in favor of strictly canonical `status_code`.
- **Comprehensive Pattern Test Suite**:
  - Added full test suite verifying `block_patterns` and `allow_patterns` precedence, exact URI matching, and custom pattern override behavior across OpenResty phases.

---

## [v1.4.0] - 2026-10-05

### Key Highlights

- **Large Request Body Disk Buffer Fallback (`ngx.req.get_body_file`)**:
  - Fixed request body inspection bypass when payload size exceeds OpenResty's `client_body_buffer_size`. OpenResty buffers large request bodies to temporary disk files where `ngx.req.get_body_data()` returns `nil`. Routewarden now reads up to `check_body_max_bytes` from `ngx.req.get_body_file()`, ensuring malicious payloads in large requests are inspected.
- **Canonical Directive Standardization & Duplicate Alias Removal**:
  - Standardized OpenResty Lua configuration on canonical `enable_default_patterns` and `enable_default_allow_patterns`.
  - Standardized on `block_patterns` table replacing `path_patterns`.
  - Standardized on `mode` (replacing `action`), `status_code` (replacing `status`), `check_body_patterns`, and `check_body_max_bytes`.
  - Removed duplicate aliases in `config.lua` and `init.lua`.

---

## [v1.3.1] - 2026-10-02

### Key Highlights

- **Protocol-Relative Open Redirect Prevention (`response.lua`)**:
  - Hardened redirect destination validation against protocol-relative URL evasion vectors (e.g., `//attacker.com`).
  - Protocol-relative destinations are safely detected, discarded, and fallback to root `/`, preventing open-redirect exploitation.
- **Security Log Schema Normalization (`level: "warn"`)**:
  - Added `"level": "warn"`, `"status_code"`, and `"matched_pattern"` across both standard JSON logger (`logger.lua`) and emergency fallback logging (`init.lua`).
  - Ensures field parity with Routewarden observability and SIEM pipelines.
- **CI / Version Scripting Portability**:
  - Improved in-place sed editing in `scripts/update-version.sh` for reliable multi-platform execution across macOS (BSD) and Linux (GNU).

---

## [v1.3.0] - 2026-10-01

### Key Highlights

- **Trusted Proxies Support (`trusted_proxies`)**:
  - Added support for `trusted_proxies` in `ip_filter.lua` and `config.lua` supporting exact IP addresses and CIDR subnets across both IPv4 and IPv6.
  - Forwarded headers (`X-Forwarded-For` and `X-Real-IP`) are now **only** trusted when `ngx.var.remote_addr` matches a declared trusted proxy.
  - Neutralizes IP spoofing vectors where attackers attempt to bypass `allowed_ips` restrictions by injecting forged headers directly into NGINX.
- **Redirect Mode Security Hardening**:
  - Restricts redirect destination targets to safe protocols (`http`, `https`) or relative paths starting with `/`.
  - Malformed or dangerous URI schemes (such as `javascript:`) are safely discarded and fallback to `/`.
- **RFC 1951 DEFLATE Gzip Bomb Compliance**:
  - Standardized `gzipbomb` response generation with valid RFC 1951 uncompressed DEFLATE blocks, explicit block lengths, final block markers, and gzip trailers.
  - Resolves decompression errors across strict HTTP clients and vulnerability scanners while maximizing memory consumption on attacker tooling.
- **Structured Log Escaping**:
  - Enhanced JSON escaping in `logger.lua` to convert all ASCII control characters (`[\1-\31%z]`) into standard `\u00XX` unicode escape sequences.
  - Prevents log corruptions and malformed JSONL outputs when handling malicious binary payloads or control-character injection attempts.
- **Response Content-Type Headers**:
  - Explicitly sets `Content-Type` headers for `gzipbomb` and `infinitestream` response modes.
- **Normalizer Scope Fix**:
  - Resolved local variable scoping issue for `raw_uri_path` in `normalizer.lua`.

---

## [v1.2.1] - 2026-09-24

### Key Highlights

- **Query Parameter Attack Surface Hardening (`check_query`)**:
  - OpenResty Lua inspector evaluates both parameter keys and parameter values.
  - Prevents query key injection bypasses (`/?sensitive_file=value` or `/?settings.py=`).
- **Client IP Extraction & Port/Bracket Normalization (`clean_ip`)**:
  - Automatically strips port suffixes (`:8080`) and IPv6 brackets (`[...]`) from `X-Forwarded-For` and `X-Real-IP` headers prior to CIDR evaluation.
- **OpenResty Concurrency Bug Fix**:
  - Made the `compiled` cache table strictly local within `compile_regex` to prevent race conditions across concurrent requests in OpenResty worker processes.
- **Default Security Logging (`security_log = true`)**:
  - Enabled `security_log = true` by default in `config.lua` for multi-gateway parity with Traefik and Caddy.
- **Lua Regex Hyphen Escaping**:
  - Escaped hyphens (`%-`) outside character classes in fallback pure-Lua pattern matching, preventing Lua's `-` magic quantifier from misinterpreting regexes in environments without PCRE.
- **Configuration Parsing Aliases**:
  - Added support for singular aliases (`path_pattern`, `block_pattern`, `allow_pattern`, `allowed_ip`) and single-string values in configuration tables.
- **Silent Drop Event Parity**:
  - Fixed security event logger to accurately emit `action = "silentDrop"` when silent drop (HTTP 444) triggers.

---

## [v1.2.0] - 2026-09-24

### Key Highlights

- **Routewarden CLI Compilation Target (`--target nginx`)**:
  - `rwarden generate --target nginx` generates production-ready `init_by_lua_block` Lua configuration tables directly from `routewarden.json`.
- **Enhanced Test Suites (`test_config.lua`)**:
  - Comprehensive unit test suites validating configuration tables, singular aliases, and CIDR checks.

---

## [v1.1.0] - 2026-09-20

### Key Highlights

- **Worker-Level Regex Caching**:
  - Reuses compiled PCRE matchers across repeated requests and instances to minimize LuaJIT GC pressure.
- **Context Auto-Population**:
  - Enhanced `warden:check()` to automatically extract HTTP method, URI, query string, remote address, and headers directly from `ngx` context when called without arguments.
- **Expanded Default Block Patterns**:
  - Coverage for private keys (`*.pem`, `*.key`), container manifests (`Dockerfile*`), `.DS_Store`, and CMS configs.

---

## [v1.0.0] - 2026-09-20

### Key Highlights

- **Initial GA Release of `nginx-warden`**:
  - Production-ready Lua middleware for OpenResty and NGINX with `lua-nginx-module`.
  - Executes directly inside worker memory during the `access_by_lua` phase without extra proxy latency.
  - Zero external dependencies: pure OpenResty standard libraries (`ngx.re`, `resty.string`, bit operations).
  - Complete parity with Go implementations:
    - Multi-layer recursive percent-decoding (`%252e%252e`).
    - Semicolon matrix parameter stripping (`/;param/.env`).
    - Windows backslash normalization (`\..\`).
    - Null-byte injection scrubbing (`%00`).
    - Canonical path resolution and dot-segment traversal protection.
  - Full suite of 13 response modes supported including HTTP 444 silent drops and reverse slowloris tarpits.
  - Structured JSON security logging compatible with CrowdSec parsers.
