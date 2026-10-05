---
title: Traefik Warden Changelog & Release Notes
description: Complete release history, breaking changes, and migration notes for Traefik Warden (traefik-warden).
---

# Traefik Warden Changelog & Release Notes

All notable changes to the **Traefik Warden** plugin (`github.com/routewarden/traefik-warden`) are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and Traefik Warden adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v1.4.0] - 2026-10-05 (Latest)

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
  - Ensures seamless compatibility with log forwarders (Grafana Alloy, Promtail, Vector, Fluentbit) and SIEM pipelines that filter and colorize security events based on log severity level.
- **HTTP Status Code Telemetry (`status_code`)**:
  - Added `"status_code"` field to security events representing the effective HTTP response status code dispatched to the client (`403` for forbidden, `429` for rate limit, `302` for redirect, or `0` for silent drop).
- **Dashboard Telemetry Field Parity (`matched_pattern`)**:
  - Emitted `"matched_pattern"` alongside `"pattern"` in log events to guarantee 100% out-of-the-box compatibility with Grafana Loki overview dashboards and top blocked pattern metrics.

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

- **RouteWarden CLI (`rwarden`) Multi-Target Generation**:
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
