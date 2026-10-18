---
title: Pre-Configured Security Dashboard & Panels — RouteWarden Dashboard
description: Real-time threat telemetry panels, live SOC audit stream, SQLite persistence, GeoIP origins, top probed paths, and attack analytics in the RouteWarden Native SOC dashboard.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../../.vitepress/theme/composables/useCodeSnippet'

// ─── Launch Snippet ─────────────────────────────────────────────────────────
const launch_cmd = buildSnippet({
  lang: 'bash',
  code: `# Launch RouteWarden security dashboard (auto-opens http://localhost:7890)
rwarden dashboard`,
})

const launchSnippets = computed(() => ({
  cli: [
    { filename: 'rwarden dashboard', lang: 'bash', code: launch_cmd.cleanCode, html: launch_cmd.html, hasDiff: false },
  ],
}))
</script>

# Pre-Configured SOC Dashboard & Telemetry Panels

The RouteWarden Native SOC Dashboard comes pre-configured with a comprehensive set of real-time security panels designed to give instant visibility into scanner activity, credential stuffing, perimeter blocks, and geographical threat distributions.

<CodeViewer :snippets="launchSnippets" />

---

## Real-Time SOC Panels & Sections

### Section 01 // Executive KPI Telemetry & Live Status
Provides instant high-level situational awareness across all connected gateway instances:
- **Total Requests**: Cumulative requests inspected.
- **Blocked Requests (🛑)**: Malicious probes blocked by perimeter rules (HTTP 403).
- **Tarpitted Requests (⏳)**: High-frequency scanners slow-fed artificial delay (HTTP 429).
- **Clean Ingress (🛡️)**: Legitimate allowed application traffic.
- **Block Rate %**: Percentage of total ingress identified and stopped as hostile.
- **Ingestion Velocity**: Live events processed per second (EPS).

### Section 02 // Security Operations Log Stream (`stream.audit.live`)
The primary operational workhorse for live log inspection:
- **Verdict Filter Tabs**: Single-click toggles for `ALL`, `BLOCK`, `TARPIT`, and `ALLOW` with live badge counts.
- **Time Range Selector**: Rolling historical filters (`1m`, `5m`, `15m`, `30m`, or custom date/time range) backed by indexed SQLite SQL queries.
- **Search & Grep**: Real-time filtering across client IPs, requested paths, triggered rules, and countries.
- **Stream Pause & Buffered Counter**: Click **⏸ Pause** or press <kbd>Space</kbd> to freeze live updates for log inspection. Incoming events are safely queued and indicated by a counter badge (`⏸ PAUSED (+N new)`). Resuming instantly flushes and catches up.

### Section 03 // 30-Minute Threat Activity Matrix
Rolling time-series chart showing 1-minute interval activity over the past 30 minutes:
- Visual stacking of Clean, Blocked, and Tarpitted events.
- Interactive legend toggles to isolate specific verdict trends.

### Section 04 // Global Threat Hotspots & Ingress Geography
Interactive world map powered by Leaflet:
- Displays coordinates and attack density heat for offending client IPs.
- Resolved via RouteWarden's autonomous country engine combining offline CIDR/RIR databases with automatic MaxMind GeoLite2 discovery.

### Section 05 // Intelligence Vectors & Hotspots
Detailed threat intelligence panels:
- **Top Attacking Client IPs**: Highlights repeated offenders with hit counts, origin country flag, and threat breakdown bars. Clicking any client IP opens a full threat intelligence dossier modal with reverse DNS, ASN, CIDR prefix, and one-click AbuseIPDB lookup.
- **Top Probed Target Paths**: Real-time ranking of attacked endpoints (`/.env`, `/.git`, `/wp-login.php`, `/actuator/env`).
- **HTTP Status Code Breakdown**: Distribution of response statuses (200, 403, 429, 5xx).

---

## Terminal Keyboard Shortcuts

Navigate and operate the dashboard with single-key shortcuts:

| Key | Function |
|:---|:---|
| <kbd>Space</kbd> | Toggle Stream Pause / Resume |
| <kbd>T</kbd> | Switch Theme (Auto / Light / Dark) |
| <kbd>W</kbd> | Jump to Time Range selector |
| <kbd>/</kbd> | Jump to Search / Grep filter |
| <kbd>F</kbd> | Jump to Country filter dropdown |
| <kbd>R</kbd> | Reset all active query filters |
| <kbd>ESC</kbd> | Dismiss active modal or dossier dialog |
