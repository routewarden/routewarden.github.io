# RouteWarden CLI Changelog

All notable changes to the RouteWarden CLI (`rwarden`) are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and the CLI adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v4.2.0] - 2026-10-04 (Latest)

### Added
- **Threat Geography & GeoIP Intelligence Suite**:
  - Global Attack Origins Map (`geomap` panel) rendering real-time geospatial attack concentrations and clusters across the globe mapped to ISO 3166-1 alpha-2 country codes.
  - Top Attacking Countries (`bargauge` panel) ranking top nation-state sources of blocked probes and malicious traffic.
  - Country Threat Share (`piechart` panel) showing percentage distribution of hostile requests by origin nation.
  - Interactive `$country_code` template variable with multi-select support to filter events and metrics across the dashboard by origin country.
- **Malicious User-Agent & Scanner Profiling**:
  - Automated scanner detection (`bargauge` panel) identifying and profiling offensive security toolkits (Nuclei, Nikto, sqlmap, Gobuster, Nmap, Masscan, curl, python-requests, and Go-http-client).
  - Attacked HTTP Methods & Verbs distribution (`piechart` panel) revealing threat actor request methods (`GET`, `POST`, `HEAD`, `CONNECT`, `OPTIONS`).
- **Layer 4 & Layer 7 Multi-Protocol Convergence**:
  - L4 vs L7 Threat Convergence Over Time (`timeseries` panel) correlating HTTP reverse proxy blocks (Traefik, Caddy, NGINX) with Layer 4 TCP connection bans and UDP packet drops.
  - Protocol Breakdown (`piechart` panel) tracking traffic proportions across protected protocols (`http`, `ssh`, `dns`, `dht`, `tcp`, `udp`).
  - Transport Split (`bargauge` panel) comparing connection-oriented TCP vs datagram UDP flows.
  - Interactive `$protocol` and `$transport` template filter variables for fine-grained multi-protocol drilldowns.
- **Optional Grafana Threat Alerting & Automated Incident Notification Channels**:
  - Pre-configured alerting rules provisioned in `grafana/provisioning/alerting/alerting.yaml`, optional and disabled by default (enabled via `rwarden dashboard up --enable-alerting` or `ALERTING_PROVISIONING_DIR=./grafana/provisioning/alerting`):
    - `rw-ddos-attack-spike`: Hostile attack rate spike alert triggering when block rate exceeds 10 req/s over 5m.
    - `rw-sensitive-path-probe`: Immediate critical alert on hostile access attempts to `.env`, `.git`, or cloud credential files.
    - `rw-l4-brute-force`: Layer 4 brute-force surge alert when >15 connection drops or bans occur within 3m.
    - `rw-scanner-nuclei-sqlmap`: High-urgency alert when active exploitation tool signatures are detected.
  - Multi-channel notification receivers pre-configured for Slack (`${SLACK_WEBHOOK_URL}`), Discord (`${DISCORD_WEBHOOK_URL}`), PagerDuty (`${PAGERDUTY_KEY}`), and Generic Webhooks (`${ALERT_WEBHOOK_URL}`).
- **Public & Shared Dashboards with Iframe Embedding**:
  - Enabled Grafana `publicDashboards` feature toggle (`GF_FEATURE_TOGGLES_ENABLE=publicDashboards`) for zero-login public links to live threat telemetry.
  - Enabled frame embedding (`GF_SECURITY_ALLOW_EMBEDDING=true`) for embedding threat widgets directly into SecOps intranets or customer portals.
- **Interactive SOC Incident Triage Table & Threat Intelligence Drilldowns**:
  - Dedicated SOC triage grid (`table` panel) displaying real-time forensic event records.
  - Interactive one-click investigative drilldowns on attacker client IPs:
    - **AbuseIPDB**: Instant IP reputation check, report counts, and abuse confidence score (`https://www.abuseipdb.com/check/${__data.fields.client_ip}`).
    - **VirusTotal**: Cross-engine malware, scanner, and infrastructure scoring (`https://www.virustotal.com/gui/ip-address/${__data.fields.client_ip}`).
    - **Shodan**: Open ports, running daemons, and banner reconnaissance (`https://www.shodan.io/host/${__data.fields.client_ip}`).
    - **Loki Forensic Threat Hunter**: Instant pivot into Grafana Explore pre-filtered to the attacker's client IP.
  - Direct top-bar navigation shortcuts for rapid threat hunting.

### Fixed
- **Dashboard Offender IP Data Links (Panel 8)**: Replaced `${__series.name}` with `${__field.labels.client_ip}` in "Top Offender IP Addresses & GeoIP", preventing country code suffixes (e.g. `[US]`) from leaking into external threat intelligence URLs (AbuseIPDB, VirusTotal, Shodan, and Loki Explore).
- **Dashboard Template Variable Filter Wiring**: Enabled multi-select and dynamic regex filtering (`allValue: ".*"`, `multi: true`, `refresh: 1`) on `$gateway` and `$verdict`, and wired stream selector filters across dashboard panels so that toolbar dropdowns properly filter panels.
- **Block Ratio Division by Zero Protection (Panel 4)**: Added `"noValue": "0%"` to the Block Ratio stat panel to gracefully display `0%` during fresh installations with zero logs instead of `NaN%`.
- **Secret-Safe Alerting Configuration**: Replaced placeholder Slack/Discord/PagerDuty dummy keys with clean environment variable references, fully preventing GitHub Push Protection and Secret Scanner false-positive blocks.

---

## [v4.1.1] - 2026-10-02

### Fixed
- **Alloy Multi-Label Relabel Matching (`config.alloy`)**:
  - Fixed an issue in `discovery.relabel` where multi-source label evaluation with semicolon separators failed when evaluating `routewarden.logs=true` alongside legacy `routewarden=true` labels (`regex = ".*(true|1|yes).*"`).
- **Premature Security Log Drop in Pipeline (`config.alloy`)**:
  - Eliminated a duplicate `stage.drop` rule running before the verdict template normalization. Gateways emitting `type="routewarden_block"` (Traefik) and `action="blocked"` (TCP Warden) now properly normalize to `verdict="BLOCK"` before unparseable noise is dropped.
- **HTTP Gateway Log Normalization (`config.alloy`)**:
  - Mapped `type="routewarden_block"` to `verdict="BLOCK"` and `type="routewarden_allow"` to `verdict="ALLOW"` across Traefik, Caddy, and NGINX logs.
- **TCP Warden Metadata Extraction (`config.alloy`)**:
  - Extracted full Layer 4 metadata (`service`, `protocol`, `transport`, `client_ip`, `country_code`, `flag_emoji`, `level`, and `reason`) for unified dashboard correlation.
- **Runtime Grafana Environment Overrides (`rwarden dashboard up`)**:
  - Added repeatable `--env` / `-e` flags to `rwarden dashboard up` (e.g. `--env GF_SECURITY_ADMIN_PASSWORD=secret`).
  - Added `${GF_*:-default}` parameter fallbacks across `docker-compose.yml` so custom environment variables, SMTP credentials, and OAuth SSO settings are respected at runtime.
- **TCP Warden Sample Configuration & Obsolete Flags**:
  - Fixed `samples/tcp-warden/docker-compose.yaml`, `README.md`, and `tcp-warden.yaml` by removing non-existent flags (`--tcp-warden`, `--host`, `--no-docker`) and adding the proper `routewarden.logs=true` label for the RouteWarden Observability Stack.
- **UDP Port Exposure in Docker Image**:
  - Added `1514/udp` to the `EXPOSE` directive in `Dockerfile` for network UDP syslog ingestion.

### Changed
- **Pure Opt-In Container Discovery & Self-Logging Protection (`config.alloy`)**:
  - Replaced broad container name regex matching (`.*(routewarden|traefik|caddy|nginx|tcp-warden).*`) with a strict, label-based **Pure Opt-In** model (`routewarden.logs=true` or `routewarden=true`).
  - Completely prevents the observability stack (`routewarden-loki`, `routewarden-alloy`, `routewarden-grafana`) from capturing its own internal logs or scraping unrelated host containers (databases, web applications, or unmanaged proxies).
  - Added stream-level log noise filtering in `loki.process` (`stage.drop`) to automatically discard plain-text container startup banners, health check probes, and ordinary proxy access lines lacking structured RouteWarden security fields (`verdict` or `action`).
  - Simplified `docker-compose.yml` by eliminating negative exclusion labels across all observability services.

---

## [v4.1.0] - 2026-10-01

### Added
- **Grafana, Loki & Alloy Observability Stack (`rwarden dashboard`)**:
  - Replaced the embedded monolithic web dashboard with a production-grade cloud-native telemetry stack powered by Grafana, Grafana Loki, and Grafana Alloy.
  - Added `rwarden dashboard up` (default) to orchestrate and launch the full stack via Docker Compose with pre-provisioned data sources and security dashboards on port 3000.
  - Added `rwarden dashboard down` to cleanly stop and remove running stack containers.
  - Added `rwarden dashboard status` to inspect container health, active port bindings, and endpoint URLs.
  - Added `rwarden dashboard export [dir]` (and `--dir <path>`) to extract `docker-compose.yml`, `config.alloy`, `loki-config.yaml`, and Grafana provisioning dashboards to disk for standalone customization and GitOps workflows.
- **Trusted Proxies Support Across All Generators (`trustedProxies`)**:
  - Full code generator support for `trustedProxies` across all supported targets:
    - Traefik Dynamic File Provider YAML (`http.middlewares.routewarden.plugin.routewarden.ipFilter.trustedProxies`)
    - Traefik Dynamic File Provider TOML (`[http.middlewares.routewarden.plugin.routewarden.ipFilter] trustedProxies = [...]`)
    - Traefik Docker Compose Labels (`traefik.http.middlewares.<name>.plugin.routewarden.ipfilter.trustedproxies=...`)
    - Caddyfile (`trusted_proxies <ips/cidrs...>`)
    - NGINX OpenResty Lua (`trusted_proxies = { ... }`)
- **Redirect Mode Security Hardening (`redirectUrl`)**:
  - Strict URL scheme validation in `rwarden validate` and `engine.NewEngine`, restricting `redirectUrl` to `http://`, `https://`, or root-relative paths (`/...`) to eliminate open-redirect and `javascript:` attack vectors.
- **Centralized Documentation & Universal Installer Integration**:
  - Centralized CLI documentation and guide hosted at [RouteWarden Documentation](/cli/).
  - Integrated with the unified ecosystem installation script served directly at `https://routewarden.github.io/install.sh`.
- **Multi-Architecture Docker Container Build Optimization**:
  - Upgraded Dockerfile with BuildKit cache mounting (`--mount=type=cache`) for Go package modules and build caches, substantially speeding up container build times.
  - Added native cross-compilation support utilizing `BUILDPLATFORM`, `TARGETOS`, and `TARGETARCH` with automatic fallback to `linux`.

### Fixed
- **Dashboard Export `--dir` Flag Parsing**:
  - Fixed an issue where passing `rwarden dashboard export --dir <dir>` treated the literal flag `"--dir"` as the destination folder. The export command now seamlessly accepts both flag and positional arguments.
- **Dashboard Subcommand Routing**:
  - Disallowed implicit fallback on unknown dashboard subcommands; invalid subcommands now report a helpful error with valid choices rather than silently launching containers.
- **TCP Warden YAML Detection in `validate`**:
  - Tightened heuristics in `rwarden validate` to require a `.yaml`/`.yml` extension or a top-level `version:` key, preventing false-positive skips for JSON configs containing nested version fields.

---

## [v4.0.1] - 2026-09-26

### Added
- **Multi-App Version Sync**:
  - Unified version synchronizer and multi-target documentation linking in RouteWarden ecosystem docs.
- **Enhanced Error Diagnostics**:
  - Clearer syntax error messages when validating malformed `tcp-warden.yaml` configurations.

---

## [v4.0.0] - 2026-09-25

### Added
- **RouteWarden TCP Warden Integration (`rwarden generate tcp-warden` & `rwarden validate`)**:
  - Declarative generation of `tcp-warden.yaml` configurations directly from centralized RouteWarden JSON policies.
  - Strict syntax, schema, and CIDR validation for `tcp-warden.yaml` via CLI arguments or stdin pipelines.
- **Real-Time TCP Monitoring in RouteWarden Dashboard**:
  - Direct ingestion and real-time visualization of structured `tcp-warden.jsonl` event streams.
  - GeoIP mapping, protocol breakdowns, connection velocity metrics, and dynamic ban tracking.
- **RouteWarden TCP Warden Standalone Application** ([TCP Warden Docs](/tcp/)):
  - Dedicated, zero-allocation Layer 4 TCP security proxy daemon for SSH, SMTP, POP3, IMAP, and generic TCP tunnels.
  - Bidirectional CrowdSec integration (LAPI bouncer decision ingestion and scenario log export).
  - Built-in management REST and SSE API (`:9091`) with hot-reload support (`SIGHUP`).
  - Official JSON Schema `tcp-warden.schema.json` and Docker Compose recipes.

---

## [v3.0.0] - 2026-09-25

### Added
- **Self-Hosted Security Dashboard (`rwarden dashboard`)**:
  - Real-time, zero-dependency web UI embedded in the `rwarden` binary — no Node.js, no external database, no cloud services required.
  - **Zero-Config Docker Discovery**: Auto-detects and streams logs from running Traefik, Caddy, and NGINX containers via the local Docker socket.
  - **Log File Tailing**: Tail local log files or wildcard glob patterns with automatic log rotation support.
  - **Real-Time Live Event Feed**: WebSocket / SSE stream of blocked requests with full-text search, container filtering, pause/resume, and clear controls.
  - **Attack Analytics**: Interactive timelines (24h, 6h, 1h), blocks-per-minute chart, top attacked endpoints, top offender IPs, and response mode distribution.
  - **Sources & Container Management**: View all active log sources with live status badges and one-click filtering.
- **v1.2 — GeoIP & IP Intelligence**:
  - Country resolution with flag emojis via embedded GeoLite2 MMDB or `ip-api.com` live fallback.
  - **Deep IP Intelligence** (`/api/ip/:ip`): Threat risk score, ISP / ASN resolution, geographic location, behavioral patterns, top targeted endpoints, and paginated event history.
  - **Config Viewer** (`/api/config/:id`): Inspect and render the live `routewarden.json` from any discovered container.
- **Tailscale & NetBird Mesh VPN Auto-Detection**:
  - Native identification of Tailscale CGNAT peers (`100.64.0.0/10`) and NetBird ULA overlay peers (`fd00::/8`) with dedicated metadata and flag emoji (`🔒`).
  - RFC 5737 documentation ranges correctly classified as `LAN / Reserved Test Network`.

---

## [v2.1.0] - 2026-09-24

### Added
- **Flexible Positional Arguments & Lenient Flag Parsing**:
  - Direct positional inputs for all commands: `rwarden test /.env`, `rwarden validate [config]`, `rwarden generate <target> [config]`, and `rwarden sandbox <target> [config]`.
  - Flags can now be placed interchangeably before or after positional arguments.
  - Automatic fallback to `routewarden.json` in current working directory when `--config` is omitted in `validate` and `generate`.
- **Shorthand Flag Aliases**:
  - Added `-c` for `--config`, `-t` for `--target`, `-q` for `--query`, `-X` and `-m` for `--method`, `-H` (repeatable) for `--header`, `-n` for `--dry-run`, `-d` for `--detach`, `-p` for `--print-config`, and `-v` for `version`.
- **Target & Format Aliases**:
  - Target generator and sandbox accept standard aliases: `yaml`, `yml`, `toml`, `compose`, `labels`, `docker-compose`, `caddyfile`, `openresty`.
- **Production Gateway Config Adaptation in Sandbox**:
  - Support for passing complete, production Traefik (`traefik.yaml`, `traefik.toml`), Docker Compose (`docker-compose.yaml`), Caddy (`Caddyfile`), and NGINX (`nginx.conf`) files directly to `rwarden sandbox`.
  - In-memory auto-adaptation: rewrites external upstream backend URLs, proxies, and certificates for isolated local testing without modifying original configuration files.
  - Live probe testing (`--test`) accommodates upstream reachability (HTTP 200, 502, 504) as allowlist pass-through.
- **Dedicated Sandbox Teardown Command**:
  - `rwarden cleanup` (and `rwarden sandbox cleanup`) to stop and prune dangling or detached sandbox containers in one command.

### Fixed
- Fixed RE2 regex backreference in Traefik label parsing to ensure 100% Go regexp standard library compliance.
- Prevented multiline upstream regex greediness in NGINX config adaptation from corrupting `server {` blocks.
- Injected missing `middlewares:` parent block in synthetic Traefik sandbox YAML generation.
- Enhanced label normalization to recognize root-level response parameters (`status`, `statusCode`, `mode`, `action`, `customResponseText`).
- Removed legacy direct boolean `silentDrop` property from `Config` schema, structs, and Docker label converters.

---

## [v2.0.0] - 2026-09-21

### Added
- **Ephemeral Gateway Sandbox (`rwarden sandbox`)**:
  - Spin up live, ephemeral container environments for **Traefik**, **Caddy**, and **NGINX (OpenResty)** pre-configured with RouteWarden security rules.
  - Automatically translates and mounts native dynamic configurations into isolated test containers.
  - Interactive foreground mode with instant graceful teardown on `Ctrl+C`.
  - Detached background mode (`--detach` / `-d`) for local dev workflows and integration testing.
  - Automated probe testing (`--test`) to execute live HTTP test suites asserting blocking and bypass behavior.
  - Dry-run mode (`--dry-run`) to inspect generated gateway configurations and exact Docker run commands without launching containers.
- **Custom RouteWarden Plugin Support**:
  - `--plugin-version`: Specify custom plugin version/tag/branch for testing specific releases.
  - `--plugin-path`: Mount local plugin repository directories for real-time plugin development.
- **Pre-flight Environment Validation**:
  - Added early Docker installation and daemon accessibility checks to fail fast with actionable guidance.
- **Enhanced Container Tooling**:
  - Included `docker-cli` inside the RouteWarden container image (`ghcr.io/routewarden/cli`).

---

## [v1.1.0] - 2026-09-21

### Added
- **Multi-Gateway Config Generator (`generate`)**:
  - Convert `routewarden.json` into native configuration for Traefik Dynamic YAML, Traefik Docker Labels, Caddy Caddyfile, and NGINX / OpenResty Lua.
  - Added support for `--config -` to stream configuration via standard input.
- **Client IP Whitelist Simulation (`test --ip`)**:
  - Test client IP evaluation against CIDR blocks and single IP allowlists offline.
- **HTTP Header Smuggling Inspection (`test --header`)**:
  - Test custom headers in `Key:Value` format to evaluate reverse proxy path normalization anti-evasion.
- **Config & Query Precedence in Offline Testing**:
  - Added `--config <path>` flag to `rwarden test`.
  - Added `--check-query` boolean flag.
- **Comprehensive Configuration Validation (`validate`)**:
  - Added HTTP status code range checks (100–599).
  - Added response mode validation and required target URL validation.
  - Added CAPTCHA provider validation.

---

## [v1.0.0] - 2026-09-20

### Initial Release
- **Path Anti-Evasion Inspection Engine (`test`)**:
  - Offline candidate path extraction simulating Traefik and Caddy middleware pipelines.
  - Recursive multi-layer URL percent-decoding (`%252e%252e`).
  - Semicolon matrix parameter stripping (`/;param/.env`).
  - Windows/IIS backslash normalization (`\..\`).
  - Null-byte injection scrubbing (`%00`).
  - Dot-segment path traversal resolving (`/static/../.env`).
  - Default block pattern matching across sensitive files.
  - Default allow pattern overrides.
- **Configuration Validator (`validate`)**:
  - Offline schema validation of `routewarden.json`.
  - Detection of invalid regular expressions and malformed CIDR blocks.
- **Official JSON Schema Export (`schema`)**:
  - CLI command emitting `config.schema.json` directly for IDE integration.
- **Distribution**:
  - Single-binary zero-dependency Go distribution for macOS, Linux, and Windows.
  - Automated installation script (`curl -fsSL https://routewarden.github.io/install.sh | bash`).
  - Official multi-architecture Docker container image on GitHub Container Registry (`ghcr.io/routewarden/cli:latest`).
