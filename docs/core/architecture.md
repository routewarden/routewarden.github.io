# System Architecture

RouteWarden operates as an in-line HTTP middleware within Traefik's proxy pipeline. Every incoming request undergoes a strict, multi-stage inspection lifecycle before being either passed downstream or intercepted.

---

## Architectural Flow

![RouteWarden Architecture](/architecture.png)

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

// ─── Architectural Inspection Lifecycle Snippets ─────────────────────────────
const arch_mermaid_raw = `flowchart TD
    REQ(["<b>Incoming HTTP Request</b>"]):::startNode --> IP{"<b>1. IP Whitelist Match?</b><br/>Allowed IP or CIDR?"}:::decisionNode
    
    IP -- Yes (Bypass) --> UPSTREAM(["<b>Forward to Upstream</b><br/>Passed to backend application"]):::allowNode
    IP -- No --> EVASION["<b>2. Path Anti-Evasion Engine</b><br/>• Multi-layer unescape (%252e ➔ .)<br/>• Semicolon parameter stripping<br/>• Backslash normalization (\\ ➔ /)<br/>• Directory traversal canonicalization"]:::processNode

    EVASION --> ALLOW{"<b>3. Allowlist Check</b><br/>Matches allowPatterns?"}:::decisionNode
    ALLOW -- Yes (Safe Override) --> UPSTREAM
    ALLOW -- No --> SENSITIVE{"<b>4. Sensitive Matcher</b><br/>Built-in or custom blockPatterns?"}:::decisionNode

    SENSITIVE -- No Match (Clean) --> UPSTREAM
    SENSITIVE -- Matches Forbidden --> RESP["<b>5. Response Handler</b><br/>JSON / HTML / Captcha / Redirect / Tarpit / Drop"]:::blockNode

    RESP --> LOG["<b>6. Structured Security Log</b><br/>JSON on stdout ➔ CrowdSec / SIEM Auto-Ban"]:::logNode

    classDef startNode fill:#0284c7,stroke:#0369a1,color:#ffffff,stroke-width:2px;
    classDef decisionNode fill:#1e293b,stroke:#3b82f6,color:#f8fafc,stroke-width:2px;
    classDef processNode fill:#0f172a,stroke:#64748b,color:#f8fafc,stroke-width:1.5px;
    classDef allowNode fill:#059669,stroke:#10b981,color:#ffffff,stroke-width:2px;
    classDef blockNode fill:#dc2626,stroke:#ef4444,color:#ffffff,stroke-width:2px;
    classDef logNode fill:#7c3aed,stroke:#8b5cf6,color:#ffffff,stroke-width:1.5px;`

const arch_graph_svg = `<div class="rw-graph-container">
  <svg viewBox="0 0 1020 580" fill="none" xmlns="http://www.w3.org/2000/svg" class="rw-graph-svg">
    <defs>
      <linearGradient id="grad-req" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0284c7" stop-opacity="0.16"/>
        <stop offset="100%" stop-color="#0284c7" stop-opacity="0.03"/>
      </linearGradient>
      <linearGradient id="grad-upstream" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#10b981" stop-opacity="0.16"/>
        <stop offset="100%" stop-color="#10b981" stop-opacity="0.04"/>
      </linearGradient>
      <linearGradient id="grad-block" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ef4444" stop-opacity="0.16"/>
        <stop offset="100%" stop-color="#ef4444" stop-opacity="0.04"/>
      </linearGradient>
      <linearGradient id="grad-log" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.16"/>
        <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0.04"/>
      </linearGradient>
      <marker id="arr-blue" viewBox="-2 -2 16 14" refX="10" refY="5" markerWidth="9" markerHeight="9" orient="auto" overflow="visible">
        <path d="M 0 1 L 11 5 L 0 9 z" fill="#0284c7"/>
      </marker>
      <marker id="arr-green" viewBox="-2 -2 16 14" refX="10" refY="5" markerWidth="9" markerHeight="9" orient="auto" overflow="visible">
        <path d="M 0 1 L 11 5 L 0 9 z" fill="#10b981"/>
      </marker>
      <marker id="arr-red" viewBox="-2 -2 16 14" refX="10" refY="5" markerWidth="9" markerHeight="9" orient="auto" overflow="visible">
        <path d="M 0 1 L 11 5 L 0 9 z" fill="#ef4444"/>
      </marker>
      <marker id="arr-purple" viewBox="-2 -2 16 14" refX="10" refY="5" markerWidth="9" markerHeight="9" orient="auto" overflow="visible">
        <path d="M 0 1 L 11 5 L 0 9 z" fill="#8b5cf6"/>
      </marker>
      <marker id="arr-slate" viewBox="-2 -2 16 14" refX="10" refY="5" markerWidth="9" markerHeight="9" orient="auto" overflow="visible">
        <path d="M 0 1 L 11 5 L 0 9 z" fill="#64748b"/>
      </marker>
    </defs>

    <!-- 0. Incoming HTTP Request -->
    <rect x="150" y="16" width="320" height="42" rx="21" class="rw-g-node" fill="url(#grad-req)"/>
    <circle cx="174" cy="37" r="7" fill="#0284c7"/>
    <text x="190" y="42" class="rw-g-card-title">Incoming HTTP Request</text>
    <line x1="310" y1="58" x2="310" y2="84" stroke="#0284c7" stroke-width="2" marker-end="url(#arr-blue)"/>

    <!-- 1. IP Whitelist Match -->
    <rect x="60" y="84" width="500" height="62" rx="10" class="rw-g-node"/>
    <circle cx="86" cy="107" r="7" fill="#3b82f6"/>
    <text x="104" y="104" class="rw-g-card-title">1. IP Whitelist Evaluator</text>
    <text x="104" y="122" class="rw-g-desc">Evaluates client IP &amp; CIDRs against allowedIps (socket or X-Forwarded-For)</text>

    <!-- Branch: IP Match -> Upstream -->
    <path d="M 560 115 C 630 115, 650 200, 710 200" stroke="#10b981" stroke-width="2" fill="none" marker-end="url(#arr-green)"/>
    <rect x="585" y="104" width="105" height="20" rx="5" class="rw-g-pill"/>
    <text x="637" y="118" text-anchor="middle" class="rw-g-pill-txt" fill="#10b981">Allowed CIDR</text>

    <!-- Arrow down to Anti-Evasion -->
    <line x1="310" y1="146" x2="310" y2="174" stroke="#64748b" stroke-width="2" marker-end="url(#arr-slate)"/>
    <rect x="265" y="152" width="90" height="18" rx="4" class="rw-g-pill"/>
    <text x="310" y="165" text-anchor="middle" class="rw-g-pill-txt" fill="#64748b">No IP Match</text>

    <!-- 2. Anti-Evasion Engine -->
    <rect x="60" y="174" width="500" height="78" rx="10" class="rw-g-node"/>
    <circle cx="86" cy="198" r="7" fill="#0284c7"/>
    <text x="104" y="196" class="rw-g-card-title">2. Path Anti-Evasion Engine</text>
    <text x="104" y="214" class="rw-g-desc">• Multi-layer unescape (%252e ➔ .)  • Semicolon strip (/;param/..)</text>
    <text x="104" y="232" class="rw-g-desc">• Backslash normalize (\\ ➔ /)  • Traversal canonicalization (/static/../.env)</text>

    <!-- Arrow down to Allowlist -->
    <line x1="310" y1="252" x2="310" y2="280" stroke="#0284c7" stroke-width="2" marker-end="url(#arr-blue)"/>
    <rect x="245" y="258" width="130" height="18" rx="4" class="rw-g-pill"/>
    <text x="310" y="271" text-anchor="middle" class="rw-g-pill-txt" fill="#0284c7">Canonical Candidates</text>

    <!-- 3. Allowlist Check -->
    <rect x="60" y="280" width="500" height="62" rx="10" class="rw-g-node"/>
    <circle cx="86" cy="303" r="7" fill="#10b981"/>
    <text x="104" y="300" class="rw-g-card-title">3. Allowlist Regex Engine</text>
    <text x="104" y="318" class="rw-g-desc">Evaluates safe exemptions (allowPatterns: /robots.txt, /.well-known/*)</text>

    <!-- Branch: Allowlist Match -> Upstream -->
    <path d="M 560 311 C 630 311, 650 260, 710 260" stroke="#10b981" stroke-width="2" fill="none" marker-end="url(#arr-green)"/>
    <rect x="585" y="300" width="105" height="20" rx="5" class="rw-g-pill"/>
    <text x="637" y="314" text-anchor="middle" class="rw-g-pill-txt" fill="#10b981">Safe Override</text>

    <!-- Arrow down to Sensitive Matcher -->
    <line x1="310" y1="342" x2="310" y2="370" stroke="#64748b" stroke-width="2" marker-end="url(#arr-slate)"/>
    <rect x="260" y="348" width="100" height="18" rx="4" class="rw-g-pill"/>
    <text x="310" y="361" text-anchor="middle" class="rw-g-pill-txt" fill="#64748b">Not Allowed</text>

    <!-- 4. Sensitive Matcher -->
    <rect x="60" y="370" width="500" height="62" rx="10" class="rw-g-node"/>
    <circle cx="86" cy="393" r="7" fill="#ef4444"/>
    <text x="104" y="390" class="rw-g-card-title">4. Sensitive Path Matcher</text>
    <text x="104" y="408" class="rw-g-desc">Checks built-in dictionary (.env, .git, dumps, configs) &amp; custom blockPatterns</text>

    <!-- Branch: No Sensitive Match -> Upstream -->
    <path d="M 560 401 C 630 401, 650 320, 710 320" stroke="#10b981" stroke-width="2" fill="none" marker-end="url(#arr-green)"/>
    <rect x="585" y="390" width="105" height="20" rx="5" class="rw-g-pill"/>
    <text x="637" y="404" text-anchor="middle" class="rw-g-pill-txt" fill="#10b981">Clean Request</text>

    <!-- Arrow down to Response Handler -->
    <line x1="310" y1="432" x2="310" y2="462" stroke="#ef4444" stroke-width="2" marker-end="url(#arr-red)"/>
    <rect x="235" y="440" width="150" height="18" rx="4" class="rw-g-pill"/>
    <text x="310" y="453" text-anchor="middle" class="rw-g-pill-txt" fill="#ef4444">Forbidden Match</text>

    <!-- 5. Response Handler -->
    <rect x="60" y="462" width="340" height="96" rx="10" class="rw-g-box" fill="url(#grad-block)"/>
    <circle cx="86" cy="488" r="7" fill="#ef4444"/>
    <text x="104" y="485" class="rw-g-card-title">5. Multi-Action Response Handler</text>
    <text x="86" y="508" class="rw-g-desc">• Custom JSON, HTML, redirect, or silent TCP drop</text>
    <text x="86" y="524" class="rw-g-desc">• Turnstile / hCaptcha / reCAPTCHA challenge</text>
    <text x="86" y="540" class="rw-g-desc">• Active defense: Gzip bomb (10GB) or TCP tarpit sink</text>

    <!-- Arrow between Response Handler and Security Log -->
    <line x1="400" y1="510" x2="435" y2="510" stroke="#8b5cf6" stroke-width="2" marker-end="url(#arr-purple)"/>
    <rect x="385" y="482" width="65" height="18" rx="4" class="rw-g-pill"/>
    <text x="417" y="495" text-anchor="middle" class="rw-g-pill-txt" fill="#8b5cf6">Audit Log</text>

    <!-- 6. Structured Security Log -->
    <rect x="445" y="462" width="270" height="96" rx="10" class="rw-g-box" fill="url(#grad-log)"/>
    <circle cx="471" cy="488" r="7" fill="#8b5cf6"/>
    <text x="489" y="485" class="rw-g-card-title">6. Security Audit Log</text>
    <text x="471" y="508" class="rw-g-desc">• Structured JSON written to stdout</text>
    <text x="471" y="524" class="rw-g-desc">• Auto-ban via CrowdSec parser</text>
    <text x="471" y="540" class="rw-g-desc">• Loki / Alloy log ingestion</text>

    <!-- Upstream Backend Card (Right Destination) -->
    <rect x="720" y="165" width="260" height="200" rx="12" class="rw-g-box" fill="url(#grad-upstream)"/>
    <circle cx="748" cy="195" r="9" fill="#10b981"/>
    <text x="768" y="195" class="rw-g-card-title" fill="#10b981">Upstream Backend</text>
    <text x="740" y="218" class="rw-g-header" fill="#10b981">FORWARDED &amp; PROTECTED</text>
    <line x1="740" y1="230" x2="955" y2="230" stroke="#10b981" stroke-opacity="0.25" stroke-width="1"/>
    <text x="740" y="254" class="rw-g-desc">• Reverse proxy forwards request</text>
    <text x="740" y="274" class="rw-g-desc">• Traefik, Caddy, or NGINX upstream</text>
    <text x="740" y="294" class="rw-g-desc">• Zero added latency for clean traffic</text>
    <text x="740" y="314" class="rw-g-desc">• Backend receives normal request</text>
    <text x="740" y="334" class="rw-g-desc">• Client receives standard 200/2xx OK</text>
  </svg>
</div>`

const archFlowSnippets = computed(() => ({
  traefik: [
    { filename: 'Inspection Pipeline', lang: 'mermaid', code: arch_mermaid_raw, html: arch_graph_svg, hasDiff: false },
  ],
  caddy: [
    { filename: 'Inspection Pipeline', lang: 'mermaid', code: arch_mermaid_raw, html: arch_graph_svg, hasDiff: false },
  ],
  nginx: [
    { filename: 'Inspection Pipeline', lang: 'mermaid', code: arch_mermaid_raw, html: arch_graph_svg, hasDiff: false },
  ],
  cli: [
    { filename: 'Inspection Pipeline', lang: 'mermaid', code: arch_mermaid_raw, html: arch_graph_svg, hasDiff: false },
  ],
}))
</script>

<CodeViewer :snippets="archFlowSnippets" />

---

## Modular Component Design

RouteWarden is constructed with clean, decoupled Go components adhering to Yaegi interpreter specifications:

1. **`ip_filter.go` (`IPFilter`)**:
   - Parses exact IPv4 (`127.0.0.1`), IPv6 (`::1`), and CIDR networks (`10.0.0.0/8`).
   - Resolves client IP by prioritizing proxy headers (`X-Forwarded-For`, `X-Real-IP`) and falling back to socket `RemoteAddr`.
2. **`path_normalizer.go` (`PathNormalizer`)**:
   - Extracts URL paths, unescapes recursive percent-encoding (`%252e%252e` ➔ `..`), strips semicolon matrix parameters (`/;param/.env`), normalizes Windows backslashes (`\`), and generates canonical candidate paths.
3. **`config.go` (`Config`)**:
   - Defines plugin parameters, default sensitive regex sets, allowlist patterns, compiler factories, and security logging settings.
4. **`response_handler.go` (`ResponseHandler`)**:
   - Manages HTTP response emission for custom JSON, HTML, redirect codes, and embedded Captcha challenges (**Turnstile**, **hCaptcha**, **reCAPTCHA**).
5. **`routewarden.go` (`RouteWarden`) / `caddywarden.go`**:
   - Implements gateway interface (`http.Handler` for Traefik, `caddyhttp.MiddlewareHandler` for Caddy).
   - Coordinates candidate normalization, allow/block evaluation, and emits structured JSON audit events (`logSecurityEvent`) on blocked requests for [CrowdSec](/examples/crowdsec) and SIEM log shippers.
6. **`lib/resty/routewarden/init.lua` (`RouteWarden Lua`)**:
   - Implements the OpenResty / NGINX Lua equivalent of the RouteWarden pipeline.
   - Runs in LuaJIT during `access_by_lua` with zero external dependencies, providing feature parity (anti-evasion, CIDR allowlists, 13 response modes, and CrowdSec security logging) for NGINX workloads.
