---
title: Caddy Warden Changelog & Release Notes
description: Complete release history, directive updates, and migration notes for Caddy Warden (caddy-warden).
---

# Caddy Warden Changelog & Release Notes

All notable changes to the **Caddy Warden** module (`github.com/routewarden/caddy-warden`) are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and Caddy Warden adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v1.4.1] - 2026-10-07 (Latest)

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
  - Ensures full schema alignment with Traefik Warden, NGINX Warden, TCP Warden, and Grafana Loki/Alloy observability stacks.
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
  - Added non-hijackable connection fallback for `silentDrop`: if Caddy's HTTP hijacker cannot acquire the raw connection (e.g. over HTTP/2, HTTP/3, or wrapped response writers), RouteWarden responds with HTTP 200 OK and an empty body rather than leaking the blocking status code.
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

- **RouteWarden CLI (`rwarden generate --target caddy`)**:
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
