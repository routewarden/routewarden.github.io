---
title: CrowdSec Integration for TCP Warden (Optional)
description: Step-by-step guide to connect TCP Warden with CrowdSec Local API (LAPI) for automated collaborative threat detection and real-time IP banning.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

// ─── 0. Architecture Diagram ────────────────────────────────────────────────
const arch_mermaid_raw = `flowchart TD
    INBOUND(["<b>Inbound Client Connection</b>"]):::startNode --> PIPELINE["<b>TCP Warden L4 Pipeline</b><br/>Zero-copy proxy &amp; protocol inspection"]:::pipeNode

    PIPELINE --> CHECK_CACHE{"<b>Step A: CrowdSec Local Cache Check</b><br/>Queried synchronously in memory"}:::cacheNode
    CHECK_CACHE -- IP Match (Banned) --> BAN(["<b>Instant Ban / Drop / Tarpit</b><br/>Connection terminated"]):::dropNode
    CHECK_CACHE -- Clean --> PROCEED(["<b>Proceed to Upstream</b><br/>Socket forwarded at wire-speed"]):::allowNode

    PIPELINE --> INSPECT["<b>Step B: Protocol &amp; Auth Monitoring</b><br/>Detects brute force, scanner patterns, command injections"]:::inspectNode
    INSPECT --> LOG["<b>Write to JSONL Audit Feed</b><br/>/var/log/routewarden/tcp-warden.jsonl"]:::logNode
    LOG --> CS_DAEMON["<b>CrowdSec Daemon (Log Acquisition)</b><br/>Reads real-time events via file source"]:::csNode
    CS_DAEMON --> CS_PARSER["<b>RouteWarden Custom Parsers &amp; Scenarios</b><br/>Correlates attacks across connections"]:::csNode
    CS_PARSER -->|Threshold Exceeded| LAPI["<b>Push Remediation to CrowdSec LAPI</b><br/>Decisions pushed to local API"]:::lapiNode
    LAPI -.->|10s Poll Sync| CHECK_CACHE

    classDef startNode fill:#0284c7,stroke:#0369a1,color:#ffffff,stroke-width:2px;
    classDef pipeNode fill:#1e293b,stroke:#00a8cc,color:#f8fafc,stroke-width:2px;
    classDef cacheNode fill:#1e293b,stroke:#f59e0b,color:#f8fafc,stroke-width:2px;
    classDef dropNode fill:#dc2626,stroke:#ef4444,color:#ffffff,stroke-width:2px;
    classDef allowNode fill:#059669,stroke:#10b981,color:#ffffff,stroke-width:2px;
    classDef inspectNode fill:#1e293b,stroke:#8b5cf6,color:#f8fafc,stroke-width:2px;
    classDef logNode fill:#0f172a,stroke:#64748b,color:#f8fafc,stroke-width:1.5px;
    classDef csNode fill:#1e293b,stroke:#f97316,color:#f8fafc,stroke-width:2px;
    classDef lapiNode fill:#7c3aed,stroke:#8b5cf6,color:#ffffff,stroke-width:2px;`

const arch_graph_svg = `<div class="rw-graph-container">
  <svg viewBox="0 0 960 480" fill="none" xmlns="http://www.w3.org/2000/svg" class="rw-graph-svg">
    <defs>
      <linearGradient id="cs-grad-cache" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.14"/>
        <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.02"/>
      </linearGradient>
      <linearGradient id="cs-grad-inspect" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.14"/>
        <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0.02"/>
      </linearGradient>
      <linearGradient id="cs-grad-daemon" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#f97316" stop-opacity="0.14"/>
        <stop offset="100%" stop-color="#f97316" stop-opacity="0.02"/>
      </linearGradient>
      <marker id="cs-arr-cyan" viewBox="-2 -2 16 14" refX="10" refY="5" markerWidth="9" markerHeight="9" orient="auto" overflow="visible">
        <path d="M 0 1 L 11 5 L 0 9 z" fill="#00a8cc"/>
      </marker>
      <marker id="cs-arr-amber" viewBox="-2 -2 16 14" refX="10" refY="5" markerWidth="9" markerHeight="9" orient="auto" overflow="visible">
        <path d="M 0 1 L 11 5 L 0 9 z" fill="#f59e0b"/>
      </marker>
      <marker id="cs-arr-purple" viewBox="-2 -2 16 14" refX="10" refY="5" markerWidth="9" markerHeight="9" orient="auto" overflow="visible">
        <path d="M 0 1 L 11 5 L 0 9 z" fill="#8b5cf6"/>
      </marker>
      <marker id="cs-arr-emerald" viewBox="-2 -2 16 14" refX="10" refY="5" markerWidth="9" markerHeight="9" orient="auto" overflow="visible">
        <path d="M 0 1 L 11 5 L 0 9 z" fill="#10b981"/>
      </marker>
      <marker id="cs-arr-rose" viewBox="-2 -2 16 14" refX="10" refY="5" markerWidth="9" markerHeight="9" orient="auto" overflow="visible">
        <path d="M 0 1 L 11 5 L 0 9 z" fill="#ef4444"/>
      </marker>
      <marker id="cs-arr-orange" viewBox="-2 -2 16 14" refX="10" refY="5" markerWidth="9" markerHeight="9" orient="auto" overflow="visible">
        <path d="M 0 1 L 11 5 L 0 9 z" fill="#f97316"/>
      </marker>
    </defs>

    <!-- 0. Incoming Connection -->
    <rect x="320" y="16" width="320" height="40" rx="20" class="rw-g-node"/>
    <circle cx="342" cy="36" r="7" fill="#0284c7"/>
    <text x="360" y="41" class="rw-g-card-title">Inbound Client TCP Connection</text>
    <line x1="480" y1="56" x2="480" y2="82" stroke="#00a8cc" stroke-width="2" marker-end="url(#cs-arr-cyan)"/>

    <!-- 1. TCP Warden Pipeline -->
    <rect x="270" y="82" width="420" height="56" rx="10" class="rw-g-node"/>
    <circle cx="296" cy="110" r="8" fill="#00a8cc"/>
    <text x="314" y="106" class="rw-g-card-title">TCP Warden L4 Pipeline</text>
    <text x="314" y="124" class="rw-g-desc">Zero-copy bidirectional forwarding &amp; protocol inspection hooks</text>

    <!-- Connectors: Pipeline -> Step A and Step B -->
    <path d="M 370 138 C 370 160, 240 155, 240 174" stroke="#f59e0b" stroke-width="2" fill="none" marker-end="url(#cs-arr-amber)"/>
    <path d="M 590 138 C 590 160, 720 155, 720 174" stroke="#8b5cf6" stroke-width="2" fill="none" marker-end="url(#cs-arr-purple)"/>

    <!-- 2. Step A: CrowdSec Local Cache Check (Left) -->
    <rect x="50" y="174" width="380" height="74" rx="10" class="rw-g-box" fill="url(#cs-grad-cache)"/>
    <circle cx="76" cy="200" r="7" fill="#f59e0b"/>
    <text x="94" y="198" class="rw-g-card-title">Step A: CrowdSec Local Cache Check</text>
    <text x="76" y="220" class="rw-g-desc">• In-memory query with zero network overhead</text>
    <text x="76" y="236" class="rw-g-desc">• Checks if client IP exists in active CrowdSec decision list</text>

    <!-- Connectors: Cache -> Drop / Allow -->
    <path d="M 140 248 L 140 280" stroke="#ef4444" stroke-width="2" marker-end="url(#cs-arr-rose)"/>
    <rect x="85" y="254" width="110" height="18" rx="4" class="rw-g-pill"/>
    <text x="140" y="267" text-anchor="middle" class="rw-g-pill-txt" fill="#ef4444">IP Match (Banned)</text>

    <path d="M 340 248 L 340 280" stroke="#10b981" stroke-width="2" marker-end="url(#cs-arr-emerald)"/>
    <rect x="300" y="254" width="80" height="18" rx="4" class="rw-g-pill"/>
    <text x="340" y="267" text-anchor="middle" class="rw-g-pill-txt" fill="#10b981">Clean IP</text>

    <!-- Instant Ban Card -->
    <rect x="50" y="284" width="180" height="72" rx="10" class="rw-g-node"/>
    <circle cx="72" cy="308" r="6" fill="#ef4444"/>
    <text x="86" y="306" class="rw-g-card-title" fill="#ef4444">Instant Ban</text>
    <text x="65" y="326" class="rw-g-desc">Connection dropped</text>
    <text x="65" y="342" class="rw-g-desc">or socket tarpitted</text>

    <!-- Proceed to Upstream Card -->
    <rect x="250" y="284" width="180" height="72" rx="10" class="rw-g-node"/>
    <circle cx="272" cy="308" r="6" fill="#10b981"/>
    <text x="286" y="306" class="rw-g-card-title" fill="#10b981">Upstream Service</text>
    <text x="265" y="326" class="rw-g-desc">Zero-copy pass to</text>
    <text x="265" y="342" class="rw-g-desc">target backend socket</text>

    <!-- 3. Step B: Protocol Inspection (Right) -->
    <rect x="530" y="174" width="380" height="74" rx="10" class="rw-g-box" fill="url(#cs-grad-inspect)"/>
    <circle cx="556" cy="200" r="7" fill="#8b5cf6"/>
    <text x="574" y="198" class="rw-g-card-title">Step B: Protocol &amp; Auth Monitoring</text>
    <text x="556" y="220" class="rw-g-desc">• Plugin inspectors evaluate authentication handshakes</text>
    <text x="556" y="236" class="rw-g-desc">• Detects password failures, scans, and command anomalies</text>

    <!-- Connector: Step B -> JSONL -->
    <line x1="720" y1="248" x2="720" y2="280" stroke="#8b5cf6" stroke-width="2" marker-end="url(#cs-arr-purple)"/>
    <rect x="645" y="254" width="150" height="18" rx="4" class="rw-g-pill"/>
    <text x="720" y="267" text-anchor="middle" class="rw-g-pill-txt" fill="#8b5cf6">Emits Security Event</text>

    <!-- 4. JSONL Log -->
    <rect x="530" y="284" width="380" height="54" rx="10" class="rw-g-node"/>
    <circle cx="556" cy="311" r="6" fill="#8b5cf6"/>
    <text x="572" y="307" class="rw-g-card-title">Structured JSONL Audit Log</text>
    <text x="572" y="325" class="rw-g-desc">Written to /var/log/routewarden/tcp-warden.jsonl</text>

    <!-- Connector: JSONL -> CrowdSec Daemon -->
    <line x1="720" y1="338" x2="720" y2="368" stroke="#f97316" stroke-width="2" marker-end="url(#cs-arr-orange)"/>

    <!-- 5. CrowdSec Engine -->
    <rect x="530" y="372" width="380" height="84" rx="10" class="rw-g-box" fill="url(#cs-grad-daemon)"/>
    <circle cx="556" cy="398" r="7" fill="#f97316"/>
    <text x="574" y="396" class="rw-g-card-title">CrowdSec Daemon &amp; LAPI</text>
    <text x="556" y="418" class="rw-g-desc">• RouteWarden scenarios detect brute-force patterns</text>
    <text x="556" y="434" class="rw-g-desc">• Pushes ban decision to CrowdSec Local API (LAPI)</text>
    <text x="556" y="450" class="rw-g-desc">• TCP Warden polls LAPI and updates local cache</text>

    <!-- Sync Loop back to cache -->
    <path d="M 530 414 C 470 414, 450 211, 435 211" stroke="#f97316" stroke-width="1.5" stroke-dasharray="4 4" fill="none" marker-end="url(#cs-arr-orange)"/>
  </svg>
</div>`

const archSnippets = computed(() => ({
  tcp: [
    { filename: 'Collaborative Loop', lang: 'mermaid', code: arch_mermaid_raw, html: arch_graph_svg, hasDiff: false },
  ]
}))

// ─── 1. Configuration (tcp-warden.yaml) ──────────────────────────────────────
const crowdsec_config = buildSnippet({
  lang: 'yaml',
  code: `# CrowdSec integration in tcp-warden.yaml
global:
  # "warn" is recommended: suppresses routine "allowed" events from the JSONL
  # audit feed so CrowdSec only parses auth failures, port scans, and blocks.
  log_level: "warn"
  log_file: "/var/log/routewarden/tcp-warden.jsonl"

crowdsec:
  enabled: true
  lapi_url: "http://127.0.0.1:8080"
  api_key: "\${CROWDSEC_API_KEY}"
  update_frequency: "10s"
  fallback_action: "ban" # "ban" | "throttle" | "bypass"`
})

const crowdsecConfigSnippets = computed(() => ({
  tcp: [
    { filename: 'tcp-warden.yaml', lang: 'yaml', code: crowdsec_config.cleanCode, html: crowdsec_config.html, hasDiff: false },
  ]
}))

// ─── 2. Log Acquisition (acquis.yaml) ────────────────────────────────────────
const acquis_yaml = buildSnippet({
  lang: 'yaml',
  code: `# /etc/crowdsec/acquis.d/tcp-warden.yaml
filenames:
  - /var/log/routewarden/tcp-warden.jsonl
labels:
  type: routewarden-tcp`
})

const acquisSnippets = computed(() => ({
  tcp: [
    { filename: 'acquis.yaml', lang: 'yaml', code: acquis_yaml.cleanCode, html: acquis_yaml.html, hasDiff: false },
  ]
}))

// ─── 3. Parser (routewarden-tcp-warden.yaml) ─────────────────────────────────
const parser_yaml = buildSnippet({
  lang: 'yaml',
  code: `# /etc/crowdsec/parsers/s01-parse/routewarden-tcp-warden.yaml
filter: "evt.Line.Labels.type == 'routewarden-tcp'"
onsuccess: next_stage
name: routewarden/tcp-warden-parser
description: "Parse TCP Warden structured JSONL security logs"
nodes:
  - grok:
      pattern: '^%{GREEDYDATA:raw_json}$'
      apply_on: Line.Raw
  - json:
      target: evt.Parsed
      apply_on: raw_json
statics:
  - meta: service
    expression: "evt.Parsed.service"
  - meta: source_ip
    expression: "evt.Parsed.client_ip"
  - meta: action
    expression: "evt.Parsed.action"
  - meta: reason
    expression: "evt.Parsed.reason"`
})

const parserSnippets = computed(() => ({
  tcp: [
    { filename: 'routewarden-tcp-warden.yaml', lang: 'yaml', code: parser_yaml.cleanCode, html: parser_yaml.html, hasDiff: false },
  ]
}))

// ─── 4. Docker Compose Full-Stack ───────────────────────────────────────────
const compose_yaml = buildSnippet({
  lang: 'yaml',
  code: `services:
  # TCP Warden
  tcp-warden:
    image: ghcr.io/routewarden/tcp-warden:latest
    container_name: tcp-warden
    restart: unless-stopped
    network_mode: host
    volumes:
      - tcp-warden-config:/etc/routewarden
      - tcp-warden-plugins:/var/lib/routewarden/plugins
      - tcp-warden-data:/var/lib/routewarden
      - tcp-warden-logs:/var/log/routewarden
    environment:
      - ROUTEWARDEN_LOG_LEVEL=warn
      - CROWDSEC_API_KEY=\${CROWDSEC_API_KEY}

  # CrowdSec Security Engine
  crowdsec:
    image: crowdsecurity/crowdsec:latest
    container_name: crowdsec
    restart: unless-stopped
    environment:
      - COLLECTIONS=crowdsecurity/linux
    volumes:
      - ./crowdsec/acquis.yaml:/etc/crowdsec/acquis.d/tcp-warden.yaml:ro
      - ./crowdsec/parsers:/etc/crowdsec/parsers:ro
      - ./crowdsec/scenarios:/etc/crowdsec/scenarios:ro
      - tcp-warden-logs:/var/log/routewarden:ro
      - crowdsec-db:/var/lib/crowdsec/data
      - crowdsec-config:/etc/crowdsec
    ports:
      - "8080:8080"

volumes:
  tcp-warden-config:
  tcp-warden-plugins:
  tcp-warden-data:
  tcp-warden-logs:
  crowdsec-db:
  crowdsec-config:`
})

const composeSnippets = computed(() => ({
  tcp: [
    { filename: 'docker-compose.yml', lang: 'yaml', code: compose_yaml.cleanCode, html: compose_yaml.html, hasDiff: false },
  ]
}))

const start_stack = buildSnippet({
  lang: 'bash',
  code: `docker compose up -d`
})

const startStackSnippets = computed(() => ({
  tcp: [
    { filename: 'Terminal', lang: 'bash', code: start_stack.cleanCode, html: start_stack.html, hasDiff: false },
  ]
}))

// ─── 5. Register Bouncer Key ────────────────────────────────────────────────
const register_bouncer = buildSnippet({
  lang: 'bash',
  code: `# Register TCP Warden as a bouncer in CrowdSec
docker compose exec crowdsec cscli bouncers add tcp-warden-bouncer

# Output example:
# Api key for 'tcp-warden-bouncer':
#    a1b2c3d4e5f678901234567890abcdef
#
# Add this key to your .env file:
echo "CROWDSEC_API_KEY=a1b2c3d4e5f678901234567890abcdef" >> .env`
})

const bouncerKeySnippets = computed(() => ({
  tcp: [
    { filename: 'Terminal', lang: 'bash', code: register_bouncer.cleanCode, html: register_bouncer.html, hasDiff: false },
  ]
}))

// ─── 6. Verification Snippets ───────────────────────────────────────────────
const verify_commands = buildSnippet({
  lang: 'bash',
  code: `# 1. Verify TCP Warden health & CrowdSec status
curl -s http://127.0.0.1:9091/health
# Expected output contains:
# {"status":"ok","version":"3.4.0","crowdsec":{"status":"healthy","decisions":1250,"update_frequency":"10s"}}

# Or check status via RouteWarden CLI
rwarden tcp status

# 2. List registered bouncers in CrowdSec
docker compose exec crowdsec cscli bouncers list

# 3. View active decision / ban records in CrowdSec
docker compose exec crowdsec cscli decisions list`
})

const verifySnippets = computed(() => ({
  tcp: [
    { filename: 'Verification', lang: 'bash', code: verify_commands.cleanCode, html: verify_commands.html, hasDiff: false },
  ]
}))

const health_response = buildSnippet({
  lang: 'json',
  code: `{
  "status": "ok",
  "version": "3.4.0",
  "crowdsec": {
    "status": "healthy",
    "decisions": 1250,
    "update_frequency": "10s"
  }
}`
})

const healthResponseSnippets = computed(() => ({
  tcp: [
    { filename: 'Response (200 OK)', lang: 'json', code: health_response.cleanCode, html: health_response.html, hasDiff: false },
  ]
}))
</script>

# CrowdSec Integration <Badge type="info" text="Optional" />

TCP Warden is built to run fully autonomously, but it also natively supports bidirectional integration with **[CrowdSec](https://www.crowdsec.net/)**.

::: info Optional Integration
TCP Warden operates as a complete standalone proxy and firewall without CrowdSec. All core features—including GeoIP filtering, CIDR allow/deny lists, token-bucket rate limiting, protocol inspection, brute-force failure tracking, and embedded SQLite ban storage—function out of the box with zero external dependencies.

Only follow this guide if you wish to link TCP Warden to CrowdSec for collaborative community blocklists and centralized multi-server decision sharing.
:::

---

## How the Integration Works

The integration forms a closed-loop security cycle:

1. **Log Acquisition (Outbound Threat Feed)**: TCP Warden records every connection attempt, authentication failure, and port scan to `/var/log/routewarden/tcp-warden.jsonl`. CrowdSec tail-reads this file, applying custom parsers and detection scenarios.
2. **LAPI Bouncer (Inbound Enforcement)**: TCP Warden acts as a high-performance CrowdSec remediation bouncer. It periodically polls CrowdSec Local API (LAPI) for active decisions and drops or tarpits malicious IPs at Layer 4 before they consume backend server resources.

<CodeViewer :snippets="archSnippets" />

---

## Step-by-Step Setup Guide

Follow these sequential steps to deploy the combined TCP Warden and CrowdSec stack.

### Step 1: Set Up Log Acquisition (`acquis.yaml`)

Tell CrowdSec where to find TCP Warden's structured JSONL audit log:

<CodeViewer :snippets="acquisSnippets" />

::: tip Built-in Optimization: Default `warn` Level
TCP Warden defaults to `log_level: "warn"`, which logs **only** actionable security signals (`auth_failure` and `blocked` events) to `/var/log/routewarden/tcp-warden.jsonl` while suppressing routine `allowed` connection records. This significantly reduces log volume, disk I/O, and CPU consumption by CrowdSec parsers while maintaining 100% scenario detection fidelity. See [Log Levels](./log-levels) for full details.
:::

---

### Step 2: Install Custom Parser & Scenarios

TCP Warden ships with custom CrowdSec parsers and scenarios located in the repository under `crowdsec/`:

#### Parser (`parsers/s01-parse/routewarden-tcp-warden.yaml`)

Extracts `service`, `client_ip`, `action`, and `reason` fields from incoming audit records:

<CodeViewer :snippets="parserSnippets" />

#### Scenarios

Install or mount the scenarios from the `crowdsec/scenarios/` directory:

* **SSH Brute Force** (`routewarden-tcp-ssh-bf.yaml`): Detects repeated SSH authentication failures within a 60-second window.
* **SMTP Spam / Brute Force** (`routewarden-tcp-smtp-bf.yaml`): Detects senders repeatedly hitting blocked domains or failing authentication.
* **Port Scan Detector** (`routewarden-tcp-portscan.yaml`): Flags IPs attempting connection floods across unconfigured or closed ports.

---

### Step 3: Register the Bouncer API Key

In CrowdSec, create a bouncer entry for TCP Warden to obtain an API key:

<CodeViewer :snippets="bouncerKeySnippets" />

---

### Step 4: Configure `tcp-warden.yaml`

Enable the CrowdSec bouncer section in your `tcp-warden.yaml`:

<CodeViewer :snippets="crowdsecConfigSnippets" />

| Field | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `global.log_level` | `string` | `"warn"` | Defaults to `"warn"` so the JSONL feed emits only `auth_failure` and `blocked` events. |
| `enabled` | `bool` | `false` | Set to `true` to activate CrowdSec decision polling. |
| `lapi_url` | `string` | `"http://127.0.0.1:8080"` | URL of your CrowdSec Local API service. |
| `api_key` | `string` | — | Bouncer API token obtained in Step 3. |
| `update_frequency` | `duration` | `"10s"` | Interval for polling new ban/unban decisions. |
| `fallback_action` | `string` | `"ban"` | Strategy when decisions match: `ban`, `throttle`, or `bypass`. |

---

### Step 5: Full-Stack Docker Compose Deployment

Run both services in a unified Docker Compose file with shared log and data volumes:

<CodeViewer :snippets="composeSnippets" />

Start the stack:

<CodeViewer :snippets="startStackSnippets" />

---

### Step 6: Verify the Integration

Verify that TCP Warden successfully connects to CrowdSec LAPI and receives active decisions:

<CodeViewer :snippets="verifySnippets" />

In the [Management Dashboard](./api) or via `curl http://127.0.0.1:9091/health`, the health response will show the active CrowdSec connection status:

<CodeViewer :snippets="healthResponseSnippets" />

---

> [!TIP] Architectural Deep Dive & Comparison
> Want to understand the fundamental architectural differences between TCP Warden and CrowdSec, and why they work best together? Check out the [TCP Warden FAQ & Comparison Guide](./faq).
