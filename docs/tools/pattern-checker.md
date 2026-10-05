---
title: Pattern & Anti-Evasion Checker
description: Interactive simulation tool for testing RouteWarden regex patterns, evasion techniques, and allowlist overrides.
---

# Pattern & Response Playground

Use this interactive playground to test RouteWarden's URL path normalization, built-in sensitive file blocking, allowlist bypasses, and custom regex rules. Simulate the live HTTP response returned by RouteWarden (including deceptive honeypots, gzip bombs, tarpits, and custom payloads) and export ready-to-use configurations for **Caddy**, **NGINX (Lua / OpenResty)**, **Traefik (YAML & TOML)**, **Docker Compose**, or **Kubernetes**.

> **Shareable Playground URLs**: Click the **Share** button below the path bar to generate a direct link containing your current test path, HTTP method, client IP, custom rules, and response settings. Anyone opening the link will reproduce the exact simulation state.

<PatternChecker />

---

## How RouteWarden Evaluates Requests

The simulator follows the canonical evaluation sequence implemented identically across RouteWarden's Go core and OpenResty Lua modules:

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

// ─── Evaluation Lifecycle Snippets ───────────────────────────────────────────
const eval_mermaid_raw = `flowchart TD
    REQ(["<b>Incoming HTTP Request</b>"]):::startNode --> IP{"<b>1. IP Whitelist Match?</b><br/>Matches allowedIps or CIDRs?"}:::decisionNode
    
    IP -- Yes --> PASS_IP(["<b>Bypassed &amp; Forwarded</b><br/>Trusted IP / internal CIDR"]):::allowNode
    IP -- No --> EVASION["<b>2. Anti-Evasion Engine</b><br/>• Multi-layer unescape (%252e ➔ .)<br/>• Semicolon stripping (/path;param/..)<br/>• Backslash normalize (\\\\ ➔ /)<br/>• Traversal canonicalization (/../)"]:::processNode

    EVASION --> ALLOW{"<b>3. Allowlist Check</b><br/>Matches allowPatterns?"}:::decisionNode
    ALLOW -- Yes --> PASS_ALLOW(["<b>Allowed &amp; Forwarded</b><br/>Built-in or custom safe rules"]):::allowNode
    ALLOW -- No --> BLOCK{"<b>4. Blocklist Check</b><br/>Matches sensitive rules?"}:::decisionNode

    BLOCK -- Matches Forbidden --> BLOCK_RESP(["<b>Intercepted &amp; Challenged</b><br/>Active response: JSON / Captcha / Drop"]):::blockNode
    BLOCK -- Clean (No Match) --> PASS_CLEAN(["<b>Clean Request Forwarded</b><br/>Proceeds to upstream backends"]):::allowNode

    classDef startNode fill:#0284c7,stroke:#0369a1,color:#ffffff,stroke-width:2px;
    classDef decisionNode fill:#1e293b,stroke:#3b82f6,color:#f8fafc,stroke-width:2px;
    classDef processNode fill:#0f172a,stroke:#64748b,color:#f8fafc,stroke-width:1.5px;
    classDef allowNode fill:#059669,stroke:#10b981,color:#ffffff,stroke-width:2px;
    classDef blockNode fill:#dc2626,stroke:#ef4444,color:#ffffff,stroke-width:2px;`

const eval_graph_svg = `<div class="rw-graph-container">
  <svg viewBox="0 0 1000 530" fill="none" xmlns="http://www.w3.org/2000/svg" class="rw-graph-svg">
    <defs>
      <linearGradient id="eval-req" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0284c7" stop-opacity="0.16"/>
        <stop offset="100%" stop-color="#0284c7" stop-opacity="0.03"/>
      </linearGradient>
      <linearGradient id="eval-upstream" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#10b981" stop-opacity="0.16"/>
        <stop offset="100%" stop-color="#10b981" stop-opacity="0.04"/>
      </linearGradient>
      <linearGradient id="eval-block" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ef4444" stop-opacity="0.16"/>
        <stop offset="100%" stop-color="#ef4444" stop-opacity="0.04"/>
      </linearGradient>
      <marker id="eval-arr-blue" viewBox="-2 -2 16 14" refX="10" refY="5" markerWidth="9" markerHeight="9" orient="auto" overflow="visible">
        <path d="M 0 1 L 11 5 L 0 9 z" fill="#0284c7"/>
      </marker>
      <marker id="eval-arr-green" viewBox="-2 -2 16 14" refX="10" refY="5" markerWidth="9" markerHeight="9" orient="auto" overflow="visible">
        <path d="M 0 1 L 11 5 L 0 9 z" fill="#10b981"/>
      </marker>
      <marker id="eval-arr-red" viewBox="-2 -2 16 14" refX="10" refY="5" markerWidth="9" markerHeight="9" orient="auto" overflow="visible">
        <path d="M 0 1 L 11 5 L 0 9 z" fill="#ef4444"/>
      </marker>
      <marker id="eval-arr-slate" viewBox="-2 -2 16 14" refX="10" refY="5" markerWidth="9" markerHeight="9" orient="auto" overflow="visible">
        <path d="M 0 1 L 11 5 L 0 9 z" fill="#64748b"/>
      </marker>
    </defs>

    <!-- 0. Incoming HTTP Request -->
    <rect x="180" y="16" width="300" height="40" rx="20" class="rw-g-node" fill="url(#eval-req)"/>
    <circle cx="204" cy="36" r="7" fill="#0284c7"/>
    <text x="222" y="41" class="rw-g-card-title">Incoming HTTP Request</text>
    <line x1="330" y1="56" x2="330" y2="80" stroke="#0284c7" stroke-width="2" marker-end="url(#eval-arr-blue)"/>

    <!-- 1. IP Whitelist Match -->
    <rect x="80" y="80" width="500" height="60" rx="10" class="rw-g-node"/>
    <circle cx="106" cy="103" r="7" fill="#3b82f6"/>
    <text x="124" y="100" class="rw-g-card-title">1. IP Whitelist Match?</text>
    <text x="124" y="118" class="rw-g-desc">Matches allowedIps or CIDRs (socket or X-Forwarded-For)</text>

    <!-- Branch: IP Match -> Upstream -->
    <path d="M 580 110 C 640 110, 650 180, 690 180" stroke="#10b981" stroke-width="2" fill="none" marker-end="url(#eval-arr-green)"/>
    <rect x="595" y="99" width="85" height="20" rx="5" class="rw-g-pill"/>
    <text x="637" y="113" text-anchor="middle" class="rw-g-pill-txt" fill="#10b981">IP Bypass</text>

    <!-- Arrow down to Anti-Evasion -->
    <line x1="330" y1="140" x2="330" y2="168" stroke="#64748b" stroke-width="2" marker-end="url(#eval-arr-slate)"/>
    <rect x="285" y="146" width="90" height="18" rx="4" class="rw-g-pill"/>
    <text x="330" y="159" text-anchor="middle" class="rw-g-pill-txt" fill="#64748b">No Match</text>

    <!-- 2. Anti-Evasion Engine -->
    <rect x="80" y="168" width="500" height="74" rx="10" class="rw-g-node"/>
    <circle cx="106" cy="192" r="7" fill="#0284c7"/>
    <text x="124" y="190" class="rw-g-card-title">2. Anti-Evasion Engine</text>
    <text x="124" y="208" class="rw-g-desc">• Multi-layer unescape (%252e ➔ .)  • Semicolon strip (/path;param/..)</text>
    <text x="124" y="226" class="rw-g-desc">• Backslash convert (\\\\ ➔ /)  • Traversal canonical (/static/../.env ➔ /.env)</text>

    <!-- Arrow down to Allowlist -->
    <line x1="330" y1="242" x2="330" y2="270" stroke="#0284c7" stroke-width="2" marker-end="url(#eval-arr-blue)"/>
    <rect x="260" y="248" width="140" height="18" rx="4" class="rw-g-pill"/>
    <text x="330" y="261" text-anchor="middle" class="rw-g-pill-txt" fill="#0284c7">Canonical Candidates</text>

    <!-- 3. Allowlist Check -->
    <rect x="80" y="270" width="500" height="60" rx="10" class="rw-g-node"/>
    <circle cx="106" cy="293" r="7" fill="#10b981"/>
    <text x="124" y="290" class="rw-g-card-title">3. Allowlist Check</text>
    <text x="124" y="308" class="rw-g-desc">Built-in safe rules (/robots.txt, /.well-known/*) &amp; custom allowPatterns</text>

    <!-- Branch: Allowlist Match -> Upstream -->
    <path d="M 580 300 C 640 300, 650 240, 690 240" stroke="#10b981" stroke-width="2" fill="none" marker-end="url(#eval-arr-green)"/>
    <rect x="595" y="289" width="85" height="20" rx="5" class="rw-g-pill"/>
    <text x="637" y="303" text-anchor="middle" class="rw-g-pill-txt" fill="#10b981">Exemption</text>

    <!-- Arrow down to Blocklist Check -->
    <line x1="330" y1="330" x2="330" y2="358" stroke="#64748b" stroke-width="2" marker-end="url(#eval-arr-slate)"/>
    <rect x="280" y="336" width="100" height="18" rx="4" class="rw-g-pill"/>
    <text x="330" y="349" text-anchor="middle" class="rw-g-pill-txt" fill="#64748b">Not Allowed</text>

    <!-- 4. Blocklist Check -->
    <rect x="80" y="358" width="500" height="60" rx="10" class="rw-g-node"/>
    <circle cx="106" cy="381" r="7" fill="#ef4444"/>
    <text x="124" y="378" class="rw-g-card-title">4. Blocklist Check</text>
    <text x="124" y="396" class="rw-g-desc">Built-in sensitive dictionaries (.env, .git, dumps) &amp; custom blockPatterns</text>

    <!-- Branch: Clean -> Upstream -->
    <path d="M 580 388 C 640 388, 650 300, 690 300" stroke="#10b981" stroke-width="2" fill="none" marker-end="url(#eval-arr-green)"/>
    <rect x="595" y="377" width="85" height="20" rx="5" class="rw-g-pill"/>
    <text x="637" y="391" text-anchor="middle" class="rw-g-pill-txt" fill="#10b981">Clean Pass</text>

    <!-- Arrow down to Intercepted -->
    <line x1="330" y1="418" x2="330" y2="446" stroke="#ef4444" stroke-width="2" marker-end="url(#eval-arr-red)"/>
    <rect x="250" y="424" width="160" height="18" rx="4" class="rw-g-pill"/>
    <text x="330" y="437" text-anchor="middle" class="rw-g-pill-txt" fill="#ef4444">Forbidden Match</text>

    <!-- 5. Intercepted & Challenged -->
    <rect x="80" y="446" width="500" height="64" rx="10" class="rw-g-box" fill="url(#eval-block)"/>
    <circle cx="106" cy="471" r="7" fill="#ef4444"/>
    <text x="124" y="468" class="rw-g-card-title">5. Intercepted &amp; Challenged</text>
    <text x="124" y="488" class="rw-g-desc">Active response: JSON / HTML error, Captcha (Turnstile/hCaptcha), Tarpit, or Drop</text>

    <!-- Upstream Backend Card (Right Destination) -->
    <rect x="700" y="150" width="260" height="180" rx="12" class="rw-g-box" fill="url(#eval-upstream)"/>
    <circle cx="728" cy="180" r="9" fill="#10b981"/>
    <text x="748" y="180" class="rw-g-card-title" fill="#10b981">Clean Request</text>
    <text x="720" y="202" class="rw-g-header" fill="#10b981">FORWARDED TO BACKEND</text>
    <line x1="720" y1="214" x2="935" y2="214" stroke="#10b981" stroke-opacity="0.25" stroke-width="1"/>
    <text x="720" y="238" class="rw-g-desc">• Passes to backend server</text>
    <text x="720" y="258" class="rw-g-desc">• Zero added latency for clean traffic</text>
    <text x="720" y="278" class="rw-g-desc">• Protected against bypass evasions</text>
    <text x="720" y="298" class="rw-g-desc">• Emits standard 200/2xx OK</text>
  </svg>
</div>`

const evalFlowSnippets = computed(() => ({
  traefik: [
    { filename: 'Evaluation Flow', lang: 'mermaid', code: eval_mermaid_raw, html: eval_graph_svg, hasDiff: false },
  ],
  caddy: [
    { filename: 'Evaluation Flow', lang: 'mermaid', code: eval_mermaid_raw, html: eval_graph_svg, hasDiff: false },
  ],
  nginx: [
    { filename: 'Evaluation Flow', lang: 'mermaid', code: eval_mermaid_raw, html: eval_graph_svg, hasDiff: false },
  ],
  cli: [
    { filename: 'Evaluation Flow', lang: 'mermaid', code: eval_mermaid_raw, html: eval_graph_svg, hasDiff: false },
  ],
}))
</script>

<CodeViewer :snippets="evalFlowSnippets" />

---

## Related Documentation

- **[RouteWarden CLI (`rwarden`)](/cli/)**: Command-line tool for offline path evasion testing, schema validation, and config generation.
- **[Custom Path Regex Guide](/core/custom-patterns)**: Syntax, cheat sheets, and production blueprints for popular frameworks.
- **[Anti-Evasion Engine](/core/anti-evasion)**: Technical breakdown of defeated evasion attacks.
- **[Response Modes Engine](/core/response-modes)**: All 13 response behaviors (JSON, Captcha, Gzip Bomb, Tarpit, etc.).
- **[Traefik Configuration](/traefik/configuration)**, **[Caddyfile Reference](/caddy/caddyfile)** & **[NGINX Configuration](/nginx/configuration)**: Gateway-specific syntax.
