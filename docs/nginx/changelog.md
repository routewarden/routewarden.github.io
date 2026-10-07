---
title: NGINX Warden Changelog & Release Notes
description: Complete release history, OpenResty Lua updates, and migration notes for NGINX Warden (nginx-warden).
---

# NGINX Warden Changelog & Release Notes

All notable changes to **NGINX Warden** (`github.com/routewarden/nginx-warden`) are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and NGINX Warden adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v1.4.1] - 2026-10-07 (Latest)

### Key Highlights

- **Strict Status Code Canonicalization (`status_code`)**:
  - Removed deprecated `opts.status` and `opts.response.status` alias fallbacks in OpenResty Lua configuration (`init.lua`) in favor of strictly canonical `status_code`.
- **Comprehensive Pattern Test Suite**:
  - Added full test suite verifying `block_patterns` and `allow_patterns` precedence, exact URI matching, and custom pattern override behavior across OpenResty phases.

---

## [v1.4.0] - 2026-10-05

### Key Highlights

- **Large Request Body Disk Buffer Fallback (`ngx.req.get_body_file`)**:
  - Fixed request body inspection bypass when payload size exceeds OpenResty's `client_body_buffer_size`. OpenResty buffers large request bodies to temporary disk files where `ngx.req.get_body_data()` returns `nil`. RouteWarden now reads up to `check_body_max_bytes` from `ngx.req.get_body_file()`, ensuring malicious payloads in large requests are inspected.
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
  - Ensures field parity with Grafana Loki and Alloy observability stacks.
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

- **RouteWarden CLI Compilation Target (`--target nginx`)**:
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
