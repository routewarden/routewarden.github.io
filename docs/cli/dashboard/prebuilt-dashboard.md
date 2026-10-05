---
title: Pre-Configured Dashboard & Panels — RouteWarden Dashboard
description: Comprehensive breakdown of the pre-configured Grafana threat intelligence dashboard, visualization panels, metric widgets, and interactive filters.
---

# Pre-Configured Dashboard & Panels

RouteWarden comes with an out-of-the-box, professionally crafted Grafana dashboard (**"RouteWarden — Threat & Security Intelligence"**, embedded in `routewarden-overview.json`). It provisions automatically when launching the stack via `rwarden dashboard` or Docker Compose.

---

## Key Dashboard Panels

### 1. Key Security Counters (KPI Widgets)

At the top of the dashboard, four high-visibility stat panels provide an immediate posture overview:

- **Blocked Attacks**: Total number of malicious requests or probes intercepted by RouteWarden within the selected time window. Rendered in vivid threat red.
- **Total Inspected Events**: Complete volume of gateway traffic evaluated against RouteWarden security rules.
- **Whitelist Bypasses**: Legitimate traffic successfully bypassing checks via trusted IP CIDRs or bypass headers.
- **Attack Ratio (%)**: Percentage calculation of hostile requests relative to total traffic (`(Blocked / Total) * 100`). Gives immediate insight into active DDoS or brute-force campaigns.

---

### 2. Attack Timelines (Multi-Series Time Graph)

Visualizes threat activity across time:
- **`BLOCK` Series (Red)**: Attacks blocked by sensitive path detection, regex signatures, anti-evasion traps, or IP denies.
- **`ALLOW` Series (Green)**: Clean traffic permitted to reach backend application services.
- **`THROTTLED` Series (Amber)**: Requests delayed via tarpit or rate-limited before downstream forwarding.
- **`BYPASS` Series (Blue)**: Requests originating from trusted internal CIDRs or verified reverse proxy hops.

Spikes in red indicate port scanning, credential stuffing, or vulnerability scanner activity (such as Nuclei, Nikto, or sqlmap).

---

### 3. Verdict & Status Code Distribution

Two donut graphs illustrate your traffic breakdown:
- **Verdict Distribution**: Quick proportion breakdown of `BLOCK` vs `ALLOW` vs `THROTTLED`.
- **Status Code Distribution**: Shows HTTP status codes returned by the gateway (e.g. `403 Forbidden`, `404 Not Found`, `429 Too Many Requests`, `200 OK`).

---

---

### 4. Threat Geography & GeoIP Intelligence

A comprehensive geographic intelligence suite providing real-time visibility into attacking nation states and geographic concentrations:
- **Global Attack Origins Map (Geomap)**: Interactive world map plotting attack origins by ISO 3166-1 alpha-2 country codes. Marker sizes and colors scale dynamically with attack intensity.
- **Top Attacking Countries**: Ranked bar gauge showing the top 10 nation-state origins of blocked probes and hostile requests.
- **Country Threat Share**: Donut chart displaying the percentage breakdown of global threat traffic by origin country.

---

### 5. Layer 4 & Layer 7 Multi-Protocol Convergence

Provides unified visibility across application-layer HTTP gateways and network-layer TCP/UDP bastions:
- **L4 vs L7 Threat Convergence Over Time**: Multi-series timeseries tracking HTTP reverse proxy blocks (Traefik, Caddy, NGINX) alongside Layer 4 TCP connection bans (SSH bastion) and UDP packet drops (DNS/DHT).
- **Protocol Breakdown**: Donut chart illustrating distribution across protected protocols (`http`, `ssh`, `dns`, `dht`, `tcp`, `udp`).
- **Transport Split (TCP vs UDP)**: Bar gauge comparing transport-layer traffic volume.

---

### 6. Threat Analysis & Attack Vector Profiling

Pinpoints targets, repeat offenders, and offensive toolkits:
- **Top Attacked Targets**: Heavily probed endpoints (`/.env`, `/.git/config`, `/wp-login.php`, `/actuator/env`).
- **Top Offender IPs & GeoIP**: Ranked client IP addresses annotated with resolved country codes (`[US]`, `[DE]`, `[LAN]`).
- **Top Triggered Rules / Signatures**: Identifies which defense rules are firing most frequently (sensitive files, path traversal, SQLi, protocol anomalies).
- **Malicious User-Agents & Security Scanners**: Automated scanner detection ranking offensive toolkits (`Nuclei`, `Nikto`, `sqlmap`, `Masscan`, `Go-http-client`, `python-requests`, `curl`, `ZGrab`).
- **Attacked HTTP Methods & Verbs**: Donut chart illustrating HTTP verbs utilized in attacks (`GET`, `POST`, `HEAD`, `CONNECT`, `OPTIONS`).

---

---

### 7. Interactive Incident Triage & Live Security Feed

A dual-mode operational pane designed for Security Operations Center (SOC) analysts:

- **🚨 Interactive Threat Incident Triage Table**:
  - Structured forensic grid of blocked hostile events.
  - **One-Click Threat Intelligence Drilldowns**: Clicking any IP in the table or offender gauge reveals instant investigative lookups:
    - **AbuseIPDB**: Comprehensive IP reputation, report counts, and abuse history (`https://www.abuseipdb.com/check/<IP>`).
    - **VirusTotal**: Cross-engine malware, scanner, and infrastructure scoring (`https://www.virustotal.com/gui/ip-address/<IP>`).
    - **Shodan**: Open ports, running daemons, and banner reconnaissance (`https://www.shodan.io/host/<IP>`).
    - **Loki Forensic Threat Hunter**: Drills directly into Grafana Explore pre-filtered to the attacker's client IP.
  - **Color-Coded Verdict Badges**: High-contrast indicators for `BLOCK` (red), `ALLOW` (green), and `THROTTLED` (amber).

- **📜 Real-Time Attack Log Stream**:
  - Low-latency log viewer streaming security events with zero latency.
  - Expands to show full structured JSON metadata for any event (nanosecond timestamps, headers, response modes, and rule IDs).

---

## Interactive Filters & Template Variables

The dashboard includes top-bar interactive dropdowns that dynamically alter all queries without editing panels:

| Filter Variable | Options | Description |
|:---|:---|:---|
| **Gateway** | `All`, `traefik`, `caddy`, `nginx`, `tcp-warden` | Filter logs to a specific reverse proxy or Layer 4 daemon |
| **Verdict** | `All`, `BLOCK`, `ALLOW`, `THROTTLED` | Focus exclusively on hostile attacks or audit permitted flows |
| **Country** | `All`, `US`, `DE`, `CN`, `RU`, `LAN`, ... | Filter attacks, events, and metrics by geographic origin code |
| **Protocol** | `All`, `http`, `ssh`, `dns`, `dht`, `tcp`, `udp` | Isolate specific application layer or network protocols |
| **Transport** | `All`, `tcp`, `udp` | Toggle between connection-oriented and datagram traffic |
| **Time Range** | Last 5m, 15m, 1h, 6h, 24h, 7d | Adjust time resolution for real-time triage or historical audits |
| **Auto-Refresh** | Off, 5s, 10s, 30s, 1m | Real-time monitoring mode for Security Operations Centers (SOC) |

---

## Public & Shared Dashboards

RouteWarden's observability stack is pre-configured for public status pages, executive dashboards, and secure iframe embedding:

### 1. Zero-Login Anonymous Viewer Access
The stack enables anonymous read-only access by default:
- Users accessing `http://localhost:3000` or public proxy endpoints immediately view the RouteWarden Threat Intelligence dashboard without requiring login credentials.
- Anonymous users receive the `Viewer` role, preventing unauthorized configuration edits.

### 2. Public Dashboards Feature
Grafana's `publicDashboards` feature toggle is enabled (`GF_FEATURE_TOGGLES_ENABLE=publicDashboards`):
- Click **Share** $\rightarrow$ **Public dashboard** in the top navigation bar.
- Generate a standalone, secure public link to share live threat telemetry with clients or leadership.

### 3. Portal & Iframe Embedding
Grafana frame-ancestors restrictions are relaxed (`GF_SECURITY_ALLOW_EMBEDDING=true`):
- Embed the entire RouteWarden dashboard or individual attack panels directly into company intranets, SecOps portals, or status pages:
  ```html
  <iframe
    src="http://grafana.example.com/d/routewarden-overview?kiosk"
    width="100%"
    height="800"
    frameborder="0">
  </iframe>
  ```


---

## Optional Automated Alerting & Incident Notification Channels

RouteWarden ships with pre-configured Grafana Alerting rules provisioned in `grafana/provisioning/alerting/alerting.yaml`. **Alerting is optional and disabled by default** to ensure instant, zero-configuration dashboard startup without requiring external webhook destinations or credentials.

### Enabling Threat Alerting
- **With RouteWarden CLI**: Run `rwarden dashboard up --enable-alerting` (or `rwarden dashboard up --alerting`).
- **With Docker Compose**: Set `ALERTING_PROVISIONING_DIR=./grafana/provisioning/alerting docker compose up -d`.
- **Custom Webhook Destination**: Set `ALERT_WEBHOOK_URL="https://your-soc-webhook.example.com/alerts"` (defaults to `http://host.docker.internal:8080/alerts`).

### Out-of-the-Box Alert Rules

1. **Hostile Attack Rate Spike (DDoS)**:
   - Triggers when blocked attack traffic exceeds $10\,\text{req/s}$ over a 5-minute sliding window.
   - Severity: `warning`
2. **Critical Sensitive File Probing (`.env` / `.git` / `.aws`)**:
   - Triggers immediately ($0\,\text{s}$ latency) when hostile attempts access environment files, Git repositories, or cloud credentials.
   - Severity: `critical`
3. **Layer 4 Brute-Force & SSH Bastion Attack Surge**:
   - Triggers when $>15$ connection drops or IP bans occur within 3 minutes on Layer 4 TCP/UDP listeners.
   - Severity: `high`
4. **Active Exploitation Tool Detected (`sqlmap` / `Nuclei` / `Nikto`)**:
   - Triggers immediately when automated penetration testing or vulnerability scanner signatures are detected.
   - Severity: `high`

### Pre-Configured Contact Points

- **Webhook**: Posts structured JSON payloads to `${ALERT_WEBHOOK_URL}` for custom firewalls or automated SOAR runbooks.
- **Slack**: Formatted alert messages sent to `#security-alerts` via `${SLACK_WEBHOOK_URL}`.
- **Discord**: Real-time embed cards dispatched to `${DISCORD_WEBHOOK_URL}`.
- **PagerDuty**: High-urgency incident escalation via `${PAGERDUTY_KEY}`.


