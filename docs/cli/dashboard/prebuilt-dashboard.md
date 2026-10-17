---
title: Pre-Configured Security Dashboard & Panels — RouteWarden Dashboard
description: Real-time threat telemetry panels, GeoIP origins, top probed paths, and attack analytics in the RouteWarden GoAccess dashboard.
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

# Pre-Configured Security Dashboard & Panels

The RouteWarden GoAccess dashboard comes pre-configured with a comprehensive set of real-time security panels designed to give instant visibility into scanner activity, credential stuffing, and perimeter blocks.

<CodeViewer :snippets="launchSnippets" />

---

## Real-Time Security Panels

### 1. Top Target Paths & Probed Endpoints
Tracks the most frequently scanned URLs across your gateways in real time:
- Sensitive secrets: `/.env`, `/config.json`, `/wp-config.php`, `/settings.py`
- Version control metadata: `/.git/config`, `/.git/HEAD`, `/.svn/entries`
- Admin bastions: `/wp-login.php`, `/phpmyadmin`, `/admin/dashboard`

### 2. HTTP Status Code Breakdown
Visual distribution of response verdicts:
- **403 Forbidden**: Blocked attacker probes.
- **429 Too Many Requests**: Tarpitted scanner IPs.
- **200 OK**: Legitimate allowed traffic.

### 3. Client IP Addresses & GeoIP Host Intelligence
Lists unique client IP addresses attempting reconnaissance, resolved against MaxMind GeoIP databases to show origin country, ASN, and request volume.

### 4. HTTP Verbs & Protocol Analysis
Breakdown of methods inspected: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `HEAD`, `OPTIONS`. Highlights scanners using non-standard verbs to bypass perimeter filters.

### 5. Bandwidth & Response Latency
Monitors traffic volume and reverse proxy inspection latency in milliseconds.
