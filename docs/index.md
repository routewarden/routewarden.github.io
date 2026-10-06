---
layout: home

hero:
  name: "RouteWarden"
  text: "High-Performance Edge & L4 Protocol Defense"
  tagline: "Stop sensitive file leaks (.env, .git, backups), protect non-HTTP services (SSH, SMTP, DBs), and block threats before requests reach your backends."
  image:
    src: /icon.svg
    alt: RouteWarden Logo
  actions:
    - theme: brand
      text: TCP Warden (L4) ➔
      link: /tcp/
    - theme: brand
      text: Traefik Warden ➔
      link: /traefik/
    - theme: brand
      text: Caddy Warden ➔
      link: /caddy/
    - theme: brand
      text: NGINX Warden ➔
      link: /nginx/
    - theme: alt
      text: CLI & Dashboard ➔
      link: /cli/

features:
  - title: Layer 4 Defense (TCP Warden)
    details: "Protocol-aware reverse proxy protecting SSH, SMTP, IMAP, PostgreSQL, MySQL, Redis, and game servers."
  - title: Scanner & Recon Defense
    details: "Instantly drops automated bots scanning for .env files, git repositories, database dumps, and admin portals."
  - title: Anti-Evasion Normalization
    details: "Cleans up double percent-encoding, semicolon matrix parameters, Windows backslashes, and null-byte tricks."
  - title: IP & VPN Whitelisting
    details: "Allows trusted subnets, office IPs, or Tailscale/NetBird VPNs to bypass inspection with full X-Forwarded-For support."
  - title: Configurable Responses
    details: "Respond with custom JSON, 404 deceptions, Turnstile/hCaptcha challenges, silent TCP drops, or bot-crashing gzip bombs."
  - title: CLI & Web Dashboard
    details: "Test paths offline with rwarden, generate gateway configs, and monitor security events in real-time."
---

<script setup>
import setupSnippets from './.vitepress/theme/components/setup-snippets.json'
</script>

## What is RouteWarden?

**RouteWarden** is a unified edge defense suite built for reverse proxies and servers. It protects both **web traffic (Layer 7)** via **Traefik**, **Caddy**, and **NGINX**, as well as **infrastructure services (Layer 4)** via **TCP Warden**.

Every server exposed to the public internet gets hammered by automated scanning scripts hunting for `.env` files, `.git` trees, backup archives, open databases, and unauthenticated management ports. RouteWarden filters these threats out at the perimeter before they consume backend resources.

---

## 30-Second Setup

Get protected in seconds with your preferred gateway:

<CodeViewer :snippets="setupSnippets" />

---

## Request Inspection Lifecycle

RouteWarden evaluates inbound HTTP requests in five stages:

<div class="home-pipeline">
  <div class="pipeline-step">
    <div class="pipeline-num">Stage 1</div>
    <div class="pipeline-title">HTTP Verb Filtering</div>
    <div class="pipeline-desc">Checks the request method against configured <code>methods</code> (default: <code>["GET"]</code>). Non-matching methods bypass inspection immediately.</div>
  </div>
  <div class="pipeline-step">
    <div class="pipeline-num">Stage 2</div>
    <div class="pipeline-title">IP Allowlist Check</div>
    <div class="pipeline-desc">Checks client IP against <code>allowedIps</code> via socket <code>RemoteAddr</code>, <code>X-Forwarded-For</code>, or <code>X-Real-IP</code>. Trusted addresses bypass checks immediately.</div>
  </div>
  <div class="pipeline-step">
    <div class="pipeline-num">Stage 3</div>
    <div class="pipeline-title">Anti-Evasion Normalization</div>
    <div class="pipeline-desc">Decodes multi-layer percent-encoding (<code>%252e%252e</code>), strips matrix parameters (<code>/;param/.env</code>), normalizes backslashes (<code>\</code>), and removes null bytes.</div>
  </div>
  <div class="pipeline-step">
    <div class="pipeline-num">Stage 4</div>
    <div class="pipeline-title">Rule Evaluation</div>
    <div class="pipeline-desc">Evaluates safe exemptions (<code>allowPatterns</code>) first. If not exempted, checks built-in sensitive dictionaries and custom <code>blockPatterns</code>.</div>
  </div>
  <div class="pipeline-step">
    <div class="pipeline-num">Stage 5</div>
    <div class="pipeline-title">Response Generation</div>
    <div class="pipeline-desc">Executes the configured response mode: custom JSON, HTML, redirect, silent drop, challenge verification, or gzip compression response.</div>
  </div>
</div>

---

## Default Protection Rules

With `enableDefaultPatterns: true` active, RouteWarden blocks common exposure paths without requiring custom rules:

<div class="attack-grid">
  <div class="attack-card">
    <h4>Environment & Secrets</h4>
    <p>Blocks <code>/.env</code>, <code>/.env.local</code>, <code>/.env.production</code>, <code>/.aws/credentials</code>, and <code>/.ssh/id_rsa</code>.</p>
  </div>
  <div class="attack-card">
    <h4>Version Control Repositories</h4>
    <p>Prevents source disclosure via <code>/.git/config</code>, <code>/.git/HEAD</code>, <code>/.svn/entries</code>, and <code>/.hg/</code>.</p>
  </div>
  <div class="attack-card">
    <h4>Database Dumps & Backups</h4>
    <p>Catches accidental exposure of <code>/dump.sql</code>, <code>/db.bak</code>, <code>/backup.tar.gz</code>, and <code>/site.zip</code>.</p>
  </div>
  <div class="attack-card">
    <h4>Configuration & Debug Files</h4>
    <p>Guards server manifests like <code>/config.yaml</code>, <code>/app.ini</code>, <code>/phpinfo.php</code>, and Spring <code>/actuator/*</code>.</p>
  </div>
</div>

---

## Anti-Evasion Normalization

Attackers often obfuscate request paths to bypass string matching. RouteWarden normalizes paths before evaluation:

| Evasion Technique | Raw Attacker Payload | RouteWarden Normalized Candidate | Action |
|---|---|---|---|
| **Double URL Encoding** | `/%252e%252e/%252eenv` | `/.env` | Blocked |
| **Semicolon Matrix Traversal** | `/public;param=1/..;param=2/.env` | `/.env` | Blocked |
| **Windows / Backslash** | `/static\..\.git\config` | `/.git/config` | Blocked |
| **Null Byte Injection** | `/.env%00.png` | `/.env` | Blocked |
| **Dot-Segment Traversal** | `/images/../.aws/credentials` | `/.aws/credentials` | Blocked |

---

## Response Actions

When a path matches a block rule, choose how RouteWarden defends your server:

- **Clean Errors & Deception**: Return custom `json`, `html`, `text`, `xml`, or a deceptive `fakeSuccess` (200 OK honeypot).
- **Active Defense**: Crash aggressive bots with `gzipBomb` (~1000× RAM expansion), reset connections via `silentDrop`, or delay scanners with `tarpit`.
- **Challenges & Forwarding**: Challenge suspicious traffic with `captcha` (Turnstile / hCaptcha / reCAPTCHA), rate-limit via `rateLimitChallenge` (HTTP 429), or divert to a canary backend via `proxy`.

---

## Production Case Studies

Real-world deployment patterns demonstrating how engineering teams protect their applications using RouteWarden:

<div class="attack-grid">
  <div class="attack-card">
    <h4><a href="/examples/case-study-immich">Immich Photo Sharing</a></h4>
    <p>Public photo/album sharing while strictly cloaking administrative, login, and user management APIs under a 404.</p>
  </div>
  <div class="attack-card">
    <h4><a href="/examples/case-study-webhooks">Zero-Trust Webhooks</a></h4>
    <p>Lock down Stripe/GitHub payment webhook ingress using official provider IP CIDRs and silent TCP drops.</p>
  </div>
  <div class="attack-card">
    <h4><a href="/examples/case-study-observability">Metrics & Actuator Cloaking</a></h4>
    <p>Shield Prometheus <code>/metrics</code> and Spring Boot <code>/actuator</code> from public scanners while keeping internal scrapers active.</p>
  </div>
  <div class="attack-card">
    <h4><a href="/examples/case-study-cms-shield">WordPress & CMS Shield</a></h4>
    <p>Defeat brute-force and XML-RPC attacks on <code>wp-login.php</code> using interactive Cloudflare Turnstile / hCaptcha challenges.</p>
  </div>
  <div class="attack-card">
    <h4><a href="/examples/case-study-vaultwarden">Password Vaults (Bitwarden)</a></h4>
    <p>Allow public mobile password sync while restricting <code>/admin</code> strictly to WireGuard or Tailscale subnets.</p>
  </div>
  <div class="attack-card">
    <h4><a href="/examples/case-study-honeypot-staging">Honeypots & Active Defense</a></h4>
    <p>Crash scanning bots with <code>gzipBomb</code> decompression traps, reset TCP connections with <code>silentDrop</code>, and cloak staging preview clusters.</p>
  </div>
  <div class="attack-card">
    <h4><a href="/examples/crowdsec">CrowdSec Integration & Auto-Ban</a></h4>
    <p>Emit structured JSON security audit events directly into CrowdSec to automatically ban attacker IPs across your firewall on their first request.</p>
  </div>
</div>

---

## Ready to Explore?

- Protect non-HTTP infrastructure with **[TCP Warden](/tcp/)** (SSH, SMTP, databases, Redis).
- Deploy on **[Traefik Warden](/traefik/)** with Docker Compose templates.
- Deploy on **[Caddy Warden](/caddy/)** with native Caddyfile directives.
- Deploy on **[NGINX Warden](/nginx/)** with in-memory Lua inspection.
- Monitor live attacks with the **[RouteWarden CLI & Dashboard](/cli/)**.
- Learn about the [Core System Architecture](/core/architecture) and [Anti-Evasion Engine](/core/anti-evasion).
- Browse real-world blueprints in the [Cookbook & Case Studies](/examples/overview).
