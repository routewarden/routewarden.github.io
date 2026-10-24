---
title: TCP Warden FAQ & Comparison Guide
description: Simple, human-friendly FAQ explaining what TCP Warden does, how it compares with CrowdSec and firewalls, and how it strengthens your server security.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

const collab_mermaid_raw = `flowchart TD
    TRAFFIC(["<b>Inbound TCP Traffic</b><br/>SSH, Mail, Databases, Redis"]):::startNode --> WARDEN["<b>TCP Warden (The Bouncer)</b><br/>Zero-copy L4 reverse proxy &amp; protocol engine"]:::wardenNode

    WARDEN -->|1. Check Community Decisions| CS_CACHE{"<b>CrowdSec Decision Cache</b><br/>Is IP in global ban list?"}:::cacheNode
    WARDEN -->|2. Check Local Behavioral Rules| REALTIME{"<b>Real-Time Local Checks</b><br/>GeoIP, connection rate, failed auth?"}:::checkNode

    CS_CACHE -- Known Bad IP --> BAN(["<b>Drop Instantly / Tarpit</b><br/>Connection terminated"]):::dropNode
    CS_CACHE -- Clean --> ALLOW(["<b>Pass to Upstream</b><br/>Postfix, Dovecot, SSH, DB"]):::allowNode

    REALTIME -- Exceeded / Suspicious --> LOG["<b>Emit Structured JSON Log</b><br/>/var/log/routewarden/tcp-warden.jsonl"]:::logNode
    LOG --> CROWDSEC["<b>CrowdSec LAPI Engine</b><br/>Analyzes scenarios &amp; updates ban list"]:::csNode
    CROWDSEC -.->|Sync New Decisions| CS_CACHE

    classDef startNode fill:#0284c7,stroke:#0369a1,color:#ffffff,stroke-width:2px;
    classDef wardenNode fill:#1e293b,stroke:#00a8cc,color:#f8fafc,stroke-width:2px;
    classDef cacheNode fill:#1e293b,stroke:#f59e0b,color:#f8fafc,stroke-width:2px;
    classDef checkNode fill:#1e293b,stroke:#8b5cf6,color:#f8fafc,stroke-width:2px;
    classDef dropNode fill:#dc2626,stroke:#ef4444,color:#ffffff,stroke-width:2px;
    classDef allowNode fill:#059669,stroke:#10b981,color:#ffffff,stroke-width:2px;
    classDef logNode fill:#0f172a,stroke:#64748b,color:#f8fafc,stroke-width:1.5px;
    classDef csNode fill:#1e293b,stroke:#f97316,color:#f8fafc,stroke-width:2px;`

const collab_graph_svg = `<div class="rw-graph-container">
  <svg viewBox="0 0 960 480" fill="none" xmlns="http://www.w3.org/2000/svg" class="rw-graph-svg">
    <defs>
      <linearGradient id="faq-grad-cache" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.14"/>
        <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.02"/>
      </linearGradient>
      <linearGradient id="faq-grad-checks" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.14"/>
        <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0.02"/>
      </linearGradient>
      <linearGradient id="faq-grad-cs" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#f97316" stop-opacity="0.14"/>
        <stop offset="100%" stop-color="#f97316" stop-opacity="0.02"/>
      </linearGradient>
      <marker id="faq-arr-cyan" viewBox="-2 -2 16 14" refX="10" refY="5" markerWidth="9" markerHeight="9" orient="auto" overflow="visible">
        <path d="M 0 1 L 11 5 L 0 9 z" fill="#00a8cc"/>
      </marker>
      <marker id="faq-arr-amber" viewBox="-2 -2 16 14" refX="10" refY="5" markerWidth="9" markerHeight="9" orient="auto" overflow="visible">
        <path d="M 0 1 L 11 5 L 0 9 z" fill="#f59e0b"/>
      </marker>
      <marker id="faq-arr-purple" viewBox="-2 -2 16 14" refX="10" refY="5" markerWidth="9" markerHeight="9" orient="auto" overflow="visible">
        <path d="M 0 1 L 11 5 L 0 9 z" fill="#8b5cf6"/>
      </marker>
      <marker id="faq-arr-emerald" viewBox="-2 -2 16 14" refX="10" refY="5" markerWidth="9" markerHeight="9" orient="auto" overflow="visible">
        <path d="M 0 1 L 11 5 L 0 9 z" fill="#10b981"/>
      </marker>
      <marker id="faq-arr-rose" viewBox="-2 -2 16 14" refX="10" refY="5" markerWidth="9" markerHeight="9" orient="auto" overflow="visible">
        <path d="M 0 1 L 11 5 L 0 9 z" fill="#ef4444"/>
      </marker>
      <marker id="faq-arr-orange" viewBox="-2 -2 16 14" refX="10" refY="5" markerWidth="9" markerHeight="9" orient="auto" overflow="visible">
        <path d="M 0 1 L 11 5 L 0 9 z" fill="#f97316"/>
      </marker>
    </defs>

    <!-- 0. Incoming Traffic -->
    <rect x="300" y="16" width="360" height="40" rx="20" class="rw-g-node"/>
    <circle cx="322" cy="36" r="7" fill="#0284c7"/>
    <text x="340" y="41" class="rw-g-card-title">Incoming Traffic (SSH, Mail, DBs, Redis)</text>
    <line x1="480" y1="56" x2="480" y2="82" stroke="#00a8cc" stroke-width="2" marker-end="url(#faq-arr-cyan)"/>

    <!-- 1. TCP Warden -->
    <rect x="270" y="82" width="420" height="56" rx="10" class="rw-g-node"/>
    <circle cx="296" cy="110" r="8" fill="#00a8cc"/>
    <text x="314" y="106" class="rw-g-card-title">TCP Warden (The L4 Bouncer)</text>
    <text x="314" y="124" class="rw-g-desc">High-throughput proxying &amp; real-time protocol-level security enforcement</text>

    <!-- Connectors: TCP Warden -> Checks -->
    <path d="M 370 138 C 370 160, 240 155, 240 176" stroke="#f59e0b" stroke-width="2" fill="none" marker-end="url(#faq-arr-amber)"/>
    <path d="M 590 138 C 590 160, 720 155, 720 176" stroke="#8b5cf6" stroke-width="2" fill="none" marker-end="url(#faq-arr-purple)"/>

    <!-- 2. CrowdSec Decision Cache (Left) -->
    <rect x="50" y="176" width="380" height="74" rx="10" class="rw-g-box" fill="url(#faq-grad-cache)"/>
    <circle cx="76" cy="202" r="7" fill="#f59e0b"/>
    <text x="94" y="200" class="rw-g-card-title">1. CrowdSec Decision Cache</text>
    <text x="76" y="222" class="rw-g-desc">• In-memory local cache synced every 10s via LAPI</text>
    <text x="76" y="238" class="rw-g-desc">• Millions of banned IPs shared by servers worldwide</text>

    <!-- Connectors: Cache -> Drop / Allow -->
    <path d="M 140 250 L 140 280" stroke="#ef4444" stroke-width="2" marker-end="url(#faq-arr-rose)"/>
    <rect x="90" y="256" width="100" height="18" rx="4" class="rw-g-pill"/>
    <text x="140" y="269" text-anchor="middle" class="rw-g-pill-txt" fill="#ef4444">Known Bad IP</text>

    <path d="M 340 250 L 340 280" stroke="#10b981" stroke-width="2" marker-end="url(#faq-arr-emerald)"/>
    <rect x="300" y="256" width="80" height="18" rx="4" class="rw-g-pill"/>
    <text x="340" y="269" text-anchor="middle" class="rw-g-pill-txt" fill="#10b981">Clean IP</text>

    <!-- Drop Instantly Card -->
    <rect x="50" y="284" width="180" height="72" rx="10" class="rw-g-node"/>
    <circle cx="72" cy="308" r="6" fill="#ef4444"/>
    <text x="86" y="306" class="rw-g-card-title" fill="#ef4444">Drop / Tarpit</text>
    <text x="65" y="326" class="rw-g-desc">Connection dropped</text>
    <text x="65" y="342" class="rw-g-desc">or resources tarpitted</text>

    <!-- Pass to Backend Card -->
    <rect x="250" y="284" width="180" height="72" rx="10" class="rw-g-node"/>
    <circle cx="272" cy="308" r="6" fill="#10b981"/>
    <text x="286" y="306" class="rw-g-card-title" fill="#10b981">Pass to App</text>
    <text x="265" y="326" class="rw-g-desc">Forwards to SSH, DB,</text>
    <text x="265" y="342" class="rw-g-desc">Postfix, or Redis</text>

    <!-- 3. Real-Time Checks (Right) -->
    <rect x="530" y="176" width="380" height="74" rx="10" class="rw-g-box" fill="url(#faq-grad-checks)"/>
    <circle cx="556" cy="202" r="7" fill="#8b5cf6"/>
    <text x="574" y="200" class="rw-g-card-title">2. Real-Time Behavioral Checks</text>
    <text x="556" y="222" class="rw-g-desc">• GeoIP rules &amp; connection bursts per client IP</text>
    <text x="556" y="238" class="rw-g-desc">• Auth monitoring: 3 password failures = trigger</text>

    <!-- Connector: Real-Time Checks -> JSON Log -->
    <line x1="720" y1="250" x2="720" y2="280" stroke="#8b5cf6" stroke-width="2" marker-end="url(#faq-arr-purple)"/>
    <rect x="650" y="256" width="140" height="18" rx="4" class="rw-g-pill"/>
    <text x="720" y="269" text-anchor="middle" class="rw-g-pill-txt" fill="#8b5cf6">Suspicious Activity</text>

    <!-- 4. JSON Log File -->
    <rect x="530" y="284" width="380" height="54" rx="10" class="rw-g-node"/>
    <circle cx="556" cy="311" r="6" fill="#8b5cf6"/>
    <text x="572" y="307" class="rw-g-card-title">Structured JSONL Audit Log</text>
    <text x="572" y="325" class="rw-g-desc">Written to /var/log/routewarden/tcp-warden.jsonl</text>

    <!-- Connector: JSON Log -> CrowdSec Daemon -->
    <line x1="720" y1="338" x2="720" y2="368" stroke="#f97316" stroke-width="2" marker-end="url(#faq-arr-orange)"/>

    <!-- 5. CrowdSec Daemon -->
    <rect x="530" y="372" width="380" height="84" rx="10" class="rw-g-box" fill="url(#faq-grad-cs)"/>
    <circle cx="556" cy="398" r="7" fill="#f97316"/>
    <text x="574" y="396" class="rw-g-card-title">CrowdSec (Intelligence &amp; Remediation)</text>
    <text x="556" y="418" class="rw-g-desc">• Parses JSONL events with Routewarden scenario parser</text>
    <text x="556" y="434" class="rw-g-desc">• Emits automated remediation decision to LAPI</text>
    <text x="556" y="450" class="rw-g-desc">• Pushes ban decision into TCP Warden cache in next poll</text>

    <!-- Sync Loop back to cache -->
    <path d="M 530 414 C 470 414, 450 213, 435 213" stroke="#f97316" stroke-width="1.5" stroke-dasharray="4 4" fill="none" marker-end="url(#faq-arr-orange)"/>
  </svg>
</div>`

const collabSnippets = computed(() => ({
  tcp: [
    { filename: 'Collaborative Loop', lang: 'mermaid', code: collab_mermaid_raw, html: collab_graph_svg, hasDiff: false },
  ]
}))
</script>

# TCP Warden FAQ & Comparisons

<p class="tagline" style="font-size: 1.25rem; color: var(--vp-c-text-2); margin-bottom: 1.5rem;">
Simple answers to common questions about TCP Warden, CrowdSec, and protecting non-HTTP servers.
</p>

---

## The 30-Second Analogy

Think of your server like a popular venue:

* 🚪 **TCP Warden is the Bouncer at the front door**: It physically stands at the entrance (`:22`, `:25`, `:587`, `:993`). It checks IDs (GeoIP/CIDRs), limits how fast people can enter (rate limits), kicks troublemakers out on the spot, or makes bots wait in a ridiculously slow line (tarpit).
* 📡 **CrowdSec is the Global Security Network**: It collects intel from thousands of other venues worldwide. If someone starts trouble across town, CrowdSec adds them to the blacklist and gives your bouncer a heads-up before the troublemaker even reaches your sidewalk.

> **Bottom line:** They don't compete—they work together. **TCP Warden enforces rules live on the wire; CrowdSec provides global threat intelligence.**

---

## Comparison at a Glance

| Feature | **TCP Warden** | **CrowdSec** | **Fail2ban** | **iptables / UFW** |
| :--- | :--- | :--- | :--- | :--- |
| **What is it?** | L4 Reverse Proxy & Protocol Shield | Smart Threat Detector & Global Intel | Old-school Log Scanner | Raw Linux Firewall |
| **Where does it sit?** | **In-line**: Traffic passes *through* it | **Beside your apps**: Watches logs | **Beside your apps**: Watches logs | **In the Linux kernel** |
| **When does it act?** | **Instant**: Before the app even sees the connection | **After the fact**: Once bad actions are logged | **After the fact**: Minutes after logs are written | **Instant**: But only checks IP/port numbers |
| **Understands Protocols?** | **Yes**: Knows SMTP, SSH, IMAP, Postgres, MySQL, Redis | **Partially**: Reads text logs via regex | **Partially**: Reads text logs via regex | **No**: Only sees blind packets |
| **What can it do to attackers?** | Drop connection, send error code, or **Tarpit** (stall them) | Decides to ban, throttle, or captcha | Blocks IP in firewall | Drops or rejects packets |
| **Community Blocklist?** | Uses CrowdSec's list or local lists | **Yes**: Millions of shared IPs | No: Knows only your own machine | No: Static rules only |
| **Speed & Resource Usage** | Lightweight single Go binary | Low-to-moderate Go daemon | High CPU when logs get large | Zero overhead |

---

## How TCP Warden Makes CrowdSec Better

Running CrowdSec alone is good. Running **CrowdSec with TCP Warden** gives you enterprise-grade protection:

<div class="attack-grid">
  <div class="attack-card">
    <h4>⚡ 1. Stops Attackers on the Doorstep</h4>
    <p>Normally, CrowdSec has to wait for an attacker to connect, guess passwords, and leave log messages before taking action. With TCP Warden, known malicious IPs are dropped on the very first packet—your real mail or database servers never even know they were there.</p>
  </div>
  <div class="attack-card">
    <h4>📋 2. Zero Broken Log Parsers</h4>
    <p>Traditional tools break whenever software updates change log formats. TCP Warden emits clean, structured <code>jsonl</code> events with exact client IPs, protocols, and reasons, meaning CrowdSec parsers never miss an attack.</p>
  </div>
  <div class="attack-card">
    <h4>🪤 3. Wastes Attackers' Time (Tarpitting)</h4>
    <p>Instead of just closing the door and letting scanners move on to another victim, TCP Warden can <strong>tarpit</strong> them—holding their sockets open and drip-feeding bytes so slow that their scanning tools lock up and run out of memory.</p>
  </div>
  <div class="attack-card">
    <h4>🛡️ 4. Saves Server CPU & Memory</h4>
    <p>Heavy services like OpenSSH or Dovecot spin up separate system processes for every incoming connection. When a botnet hits you with thousands of requests, your CPU spikes. TCP Warden absorbs the storm and keeps your server fast.</p>
  </div>
  <div class="attack-card">
    <h4>🔍 5. Catches Wire-Level Tricks</h4>
    <p>Scanners often probe servers with broken protocol handshakes or attempt to strip STARTTLS encryption. These attacks often don't show up in normal server logs, but TCP Warden catches them directly on the wire.</p>
  </div>
  <div class="attack-card">
    <h4>💾 6. Survives Restarts & Network Drops</h4>
    <p>TCP Warden keeps an internal database (<code>bans.db</code>). If your server reboots or loses internet access to CrowdSec's cloud, your active bans and security rules stay active without missing a beat.</p>
  </div>
</div>

---

### The Complete Flow

<CodeViewer :snippets="collabSnippets" default-tab="tcp" />

---

## Frequently Asked Questions

### Does TCP Warden replace Fail2ban?
**Yes.** Fail2ban is an older tool written in Python that constantly scans text log files using regular expressions. It is slow, uses significant CPU during high-traffic attacks, easily breaks when log formats change, and has no global intelligence. 

TCP Warden + CrowdSec gives you instant in-line blocking with global community lists, with none of Fail2ban's weaknesses.

---

### Does TCP Warden replace CrowdSec?
**No.** They are teammates. 
* TCP Warden is the **muscle** (the proxy that handles real traffic and drops bad packets).
* CrowdSec is the **brain** (the global network that identifies attackers and shares threat intelligence).

---

### Can I run TCP Warden without CrowdSec?
**Yes, absolutely.** You don't need CrowdSec to use TCP Warden. Even on its own, TCP Warden provides:
* Automatic brute-force login protection (`ban_after_failures`).
* Rate limiting (preventing connection floods).
* Country blocking (GeoIP allow/deny lists).
* IP & subnet whitelists (Docker, Tailscale, NetBird, office networks).
* Tarpits and custom rejection messages.

---

### Can I run both on the same server?
**Yes, this is the recommended setup.**
1. TCP Warden runs as a unified daemon (`rwarden tcp up -d`), a standalone service, or a Docker container on your public ports (`:22`, `:25`, `:587`, `:993`).
2. It checks CrowdSec's local API (`http://127.0.0.1:8080`) in memory before allowing any connection.
3. It writes events to `/var/log/routewarden/tcp-warden.jsonl`, which CrowdSec reads.

---

### What is the relationship between `rwarden tcp` and standalone `tcp-warden`?
TCP Warden is natively integrated into the Routewarden unified CLI (`rwarden tcp`).
* **Unified CLI (`rwarden tcp`)**: The recommended interface for bare-metal and server installations. Manage daemon lifecycles (`rwarden tcp up [-d]`, `rwarden tcp reload`, `rwarden tcp status`, `rwarden tcp stop`), and manage plugins (`rwarden tcp plugins install <name>`).
* **Standalone Binary & Docker (`tcp-warden`)**: Maintained for lightweight single-purpose deployments and containers (`ghcr.io/routewarden/tcp-warden:latest`). Both share the exact same proxy engine, configuration schema (`tcp-warden.yaml`), and plugin ecosystem.

---

### Does TCP Warden support UDP traffic?
**Yes!** Routewarden TCP Warden includes a high-performance Layer 4 UDP proxy engine (`udp_engine.go`) supporting bidirectional session tracking, sliding idle timeouts, and connection tracking. 

Services can configure `transport: "udp"` or `transport: "both"` in `tcp-warden.yaml` to protect both TCP streams and UDP datagrams simultaneously. For example:
* **DNS Firewall (`dns`)**: Filters queries across both UDP:53 and TCP:53 with anti-amplification and rebinding defenses.
* **BitTorrent Guard (`bittorrent`)**: Protects BitTorrent Peer Wire (TCP) as well as DHT and uTP UDP datagrams.
* **Generic UDP Services**: Set `transport: "udp"` or `transport: "both"` in `tcp-warden.yaml` for game servers, syslog, or custom UDP sockets.

---

### How does TCP Warden handle IPv6 and VPNs (Tailscale / NetBird)?
It supports them seamlessly out of the box:
* **Dual-Stack**: Binding to `:25` automatically protects both IPv4 (`0.0.0.0`) and IPv6 (`::`).
* **VPN Friendly**: You can whitelist entire VPN ranges so your team can always connect (e.g. `100.64.0.0/10` for Tailscale or NetBird).
* **GeoIP**: Country lookups work on both IPv4 and IPv6 addresses.

---

### What does an attacker see when they are blocked?
You choose what happens when an attacker is denied:
* **`drop`** *(default)*: The connection is silently closed. To the attacker's port scanner, the port looks dead, filtered, or non-existent.
* **`reject`**: Immediately sends a TCP Reset (`RST`) packet, telling them the connection was refused.
* **`tarpit`**: Accepts the connection, but stalls and drip-feeds bytes so slowly that the attacker's bot runs out of threads and hangs.
* **`reject_message`**: Sends a clean protocol error message before closing (for example, replying to spammers with `421 4.7.0 Connection rate limit exceeded\r\n` on SMTP).
