---
title: Caddy Cookbook & Recipes
---
<script setup>
import { computed, onMounted } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'
import { useGatewaySelection } from '../.vitepress/theme/composables/useGatewaySelection'

const { activeGateway } = useGatewaySelection()
onMounted(() => {
  activeGateway.value = 'caddy'
})

// ─── 1. Zero-Trust Admin & API Cloaking ───────────────────────────────────────
const r1_json = buildSnippet({
  lang: 'json',
  code: `{
  "$schema": "https://raw.githubusercontent.com/routewarden/cli/main/config.schema.json",
  "enabled": true,
  "enableDefaultPatterns": true,
  "blockPatterns": [
    "(?i)^/admin(/.*)?$",
    "(?i)^/metrics$"
  ],
  "allowPatterns": [
    "(?i)^/admin/health$"
  ],
  "allowedIps": [
    "10.0.0.0/8",
    "192.168.1.100"
  ],
  "methods": [
    "GET",
    "POST"
  ],
  "response": {
    "mode": "json",
    "statusCode": 404,
    "body": "{\\"error\\":\\"Not Found\\"}"
  }
}`,
})

const r1_caddy = buildSnippet({
  lang: 'caddy',
  code: `{
    order route_warden before reverse_proxy # [!code ++]
}

app.example.com {
    route_warden { # [!code ++]
        enable_default_patterns true # [!code ++]
        block_patterns "(?i)^/admin(/.*)?$" "(?i)^/metrics$" # [!code ++]
        allow_patterns "(?i)^/admin/health$" # [!code ++]
        allowed_ips "10.0.0.0/8" "192.168.1.100" # [!code ++]
        methods GET POST # [!code ++]
        response { # [!code ++]
            mode json # [!code ++]
            status_code 404 # [!code ++]
            body "{\\"error\\":\\"Not Found\\"}" # [!code ++]
        } # [!code ++]
    } # [!code ++]

    reverse_proxy backend:8080
}`,
})

const r1Snippets = computed(() => ({
  caddy: [
    { filename: 'Caddyfile', lang: 'caddy', code: r1_caddy.cleanCode, html: r1_caddy.html, hasDiff: r1_caddy.hasDiff },
  ],
  cli: [
    { filename: 'routewarden.json', lang: 'json', code: r1_json.cleanCode, html: r1_json.html, hasDiff: false },
  ],
}))

// ─── 2. Interactive Cloudflare Turnstile Verification ─────────────────────────
const r2_json = buildSnippet({
  lang: 'json',
  code: `{
  "$schema": "https://raw.githubusercontent.com/routewarden/cli/main/config.schema.json",
  "enabled": true,
  "blockPatterns": [
    "(?i)^/portal/sensitive(/.*)?$"
  ],
  "response": {
    "mode": "captcha",
    "statusCode": 403,
    "captcha": {
      "provider": "turnstile",
      "siteKey": "0x4AAAAAAAxxyyzz"
    }
  }
}`,
})

const r2_caddy = buildSnippet({
  lang: 'caddy',
  code: `{
    order route_warden before reverse_proxy # [!code ++]
}

portal.example.com {
    route_warden { # [!code ++]
        block_patterns "(?i)^/portal/sensitive(/.*)?$" # [!code ++]
        response { # [!code ++]
            mode captcha # [!code ++]
            captcha { # [!code ++]
                provider turnstile # [!code ++]
                site_key "0x4AAAAAAAxxyyzz" # [!code ++]
            } # [!code ++]
        } # [!code ++]
    } # [!code ++]

    reverse_proxy portal-backend:3000
}`,
})

const r2Snippets = computed(() => ({
  caddy: [
    { filename: 'Caddyfile', lang: 'caddy', code: r2_caddy.cleanCode, html: r2_caddy.html, hasDiff: r2_caddy.hasDiff },
  ],
  cli: [
    { filename: 'routewarden.json', lang: 'json', code: r2_json.cleanCode, html: r2_json.html, hasDiff: false },
  ],
}))

// ─── 3. Active Defense Decompression Trap (Gzip Bomb) ─────────────────────────
const r3_json = buildSnippet({
  lang: 'json',
  code: `{
  "$schema": "https://raw.githubusercontent.com/routewarden/cli/main/config.schema.json",
  "enabled": true,
  "blockPatterns": [
    "(?i)^/(wp-login\\\\.php|\\\\.env|\\\\.git.*|xmlrpc\\\\.php)$"
  ],
  "response": {
    "mode": "gzipBomb",
    "statusCode": 200,
    "gzipBombMB": 10
  }
}`,
})

const r3_caddy = buildSnippet({
  lang: 'caddy',
  code: `{
    order route_warden before reverse_proxy # [!code ++]
}

honeypot.example.com {
    route_warden { # [!code ++]
        block_patterns "(?i)^/(wp-login\\.php|\\.env|\\.git.*|xmlrpc\\.php)$" # [!code ++]
        response { # [!code ++]
            mode gzip_bomb # [!code ++]
            status_code 200 # [!code ++]
            gzip_bomb_mb 10 # [!code ++]
        } # [!code ++]
    } # [!code ++]

    reverse_proxy dummy-upstream:80
}`,
})

const r3Snippets = computed(() => ({
  caddy: [
    { filename: 'Caddyfile', lang: 'caddy', code: r3_caddy.cleanCode, html: r3_caddy.html, hasDiff: r3_caddy.hasDiff },
  ],
  cli: [
    { filename: 'routewarden.json', lang: 'json', code: r3_json.cleanCode, html: r3_json.html, hasDiff: false },
  ],
}))

// ─── 4. Case Study: Dual-Site Architecture for Immich Photos ──────────────────
const r4_json = buildSnippet({
  lang: 'json',
  code: `{
  "$schema": "https://raw.githubusercontent.com/routewarden/cli/main/config.schema.json",
  "enabled": true,
  "methods": ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"],
  "enableDefaultPatterns": true,
  "blockPatterns": [
    "(?i)^/api/auth/login.*$",
    "(?i)^/api/auth/admin-sign-up.*$",
    "(?i)^/api/users.*$",
    "(?i)^/api/admin.*$"
  ],
  "response": {
    "mode": "json",
    "statusCode": 404,
    "body": "{\\"error\\":\\"Not Found\\",\\"message\\":\\"Endpoint unavailable on public router\\"}"
  }
}`,
})

const r4_caddy = buildSnippet({
  lang: 'caddy',
  code: `{
    order route_warden before reverse_proxy # [!code ++]
}

# 1. PUBLIC SITE: Shielded from login and administration probes
photos.example.com {
    route_warden { # [!code ++]
        methods GET POST PUT DELETE PATCH HEAD # [!code ++]
        enable_default_patterns true # [!code ++]
        block_patterns "(?i)^/api/auth/login.*$" "(?i)^/api/auth/admin-sign-up.*$" "(?i)^/api/users.*$" "(?i)^/api/admin.*$" # [!code ++]
        response { # [!code ++]
            mode json # [!code ++]
            status_code 404 # [!code ++]
            body "{\\"error\\":\\"Not Found\\",\\"message\\":\\"Endpoint unavailable on public router\\"}" # [!code ++]
        } # [!code ++]
    } # [!code ++]

    reverse_proxy immich-server:2283
}

# 2. PRIVATE SITE: Accessible strictly via internal VPN / Tailscale
photos-internal.example.com {
    # Full access without RouteWarden restrictions
    reverse_proxy immich-server:2283
}`,
})

const r4Snippets = computed(() => ({
  caddy: [
    { filename: 'Caddyfile', lang: 'caddy', code: r4_caddy.cleanCode, html: r4_caddy.html, hasDiff: r4_caddy.hasDiff },
  ],
  cli: [
    { filename: 'routewarden.json', lang: 'json', code: r4_json.cleanCode, html: r4_json.html, hasDiff: false },
  ],
}))

// ─── 5. Case Study: Zero-Trust Webhook Ingress (Stripe CIDR Whitelist) ─────────
const r5_json = buildSnippet({
  lang: 'json',
  code: `{
  "$schema": "https://raw.githubusercontent.com/routewarden/cli/main/config.schema.json",
  "enabled": true,
  "methods": ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"],
  "enableDefaultPatterns": true,
  "blockPatterns": [
    "(?i)^/webhooks(/.*)?$"
  ],
  "allowPatterns": [
    "(?i)^/webhooks/stripe/v1$"
  ],
  "allowedIps": [
    "3.18.12.63/32",
    "3.130.192.231/32",
    "13.235.14.237/32",
    "13.235.122.149/32",
    "35.154.171.200/32"
  ],
  "response": {
    "mode": "silentDrop"
  }
}`,
})

const r5_caddy = buildSnippet({
  lang: 'caddy',
  code: `{
    order route_warden before reverse_proxy # [!code ++]
}

api.example.com {
    route_warden { # [!code ++]
        methods GET POST PUT DELETE PATCH HEAD # [!code ++]
        enable_default_patterns true # [!code ++]
        block_patterns "(?i)^/webhooks(/.*)?$" # [!code ++]
        allow_patterns "(?i)^/webhooks/stripe/v1$" # [!code ++]
        allowed_ips "3.18.12.63/32" "3.130.192.231/32" "13.235.14.237/32" "13.235.122.149/32" "35.154.171.200/32" # [!code ++]
        response { # [!code ++]
            mode silent_drop # [!code ++]
        } # [!code ++]
    } # [!code ++]

    reverse_proxy webhook-service:8080
}`,
})

const r5Snippets = computed(() => ({
  caddy: [
    { filename: 'Caddyfile', lang: 'caddy', code: r5_caddy.cleanCode, html: r5_caddy.html, hasDiff: r5_caddy.hasDiff },
  ],
  cli: [
    { filename: 'routewarden.json', lang: 'json', code: r5_json.cleanCode, html: r5_json.html, hasDiff: false },
  ],
}))

// ─── 6. Case Study: Prometheus & Actuator Telemetry Cloaking ──────────────────
const r6_json = buildSnippet({
  lang: 'json',
  code: `{
  "$schema": "https://raw.githubusercontent.com/routewarden/cli/main/config.schema.json",
  "enabled": true,
  "methods": ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"],
  "enableDefaultPatterns": true,
  "blockPatterns": [
    "(?i)^/(metrics|server-metrics|telemetry)(/.*)?$",
    "(?i)^/actuator(/.*)?$"
  ],
  "allowedIps": [
    "10.0.0.50/32",
    "10.244.0.0/16",
    "127.0.0.1"
  ],
  "response": {
    "mode": "json",
    "statusCode": 404,
    "body": "{\\"error\\":\\"Not Found\\"}"
  }
}`,
})

const r6_caddy = buildSnippet({
  lang: 'caddy',
  code: `{
    order route_warden before reverse_proxy # [!code ++]
}

app.example.com {
    route_warden { # [!code ++]
        methods GET POST PUT DELETE PATCH HEAD # [!code ++]
        enable_default_patterns true # [!code ++]
        block_patterns "(?i)^/(metrics|server-metrics|telemetry)(/.*)?$" "(?i)^/actuator(/.*)?$" # [!code ++]
        allowed_ips "10.0.0.50/32" "10.244.0.0/16" "127.0.0.1" # [!code ++]
        response { # [!code ++]
            mode json # [!code ++]
            status_code 404 # [!code ++]
            body "{\\"error\\":\\"Not Found\\"}" # [!code ++]
        } # [!code ++]
    } # [!code ++]

    reverse_proxy app-service:8080
}`,
})

const r6Snippets = computed(() => ({
  caddy: [
    { filename: 'Caddyfile', lang: 'caddy', code: r6_caddy.cleanCode, html: r6_caddy.html, hasDiff: r6_caddy.hasDiff },
  ],
  cli: [
    { filename: 'routewarden.json', lang: 'json', code: r6_json.cleanCode, html: r6_json.html, hasDiff: false },
  ],
}))
</script>

# Caddy Cookbook & Recipes

Production blueprints and ready-to-run configurations for deploying **Caddy Warden** on Caddy Web Server.

---

## 1. Zero-Trust Admin & API Cloaking

Allow corporate VPN (`10.0.0.0/8`) and office IP (`192.168.1.100`) access to `/admin` and `/metrics` while returning a stealth 404 to public crawlers:

<CodeViewer :snippets="r1Snippets" />

---

## 2. Interactive Cloudflare Turnstile Verification

Challenge visitors accessing sensitive routes with Turnstile before reaching backend applications:

<CodeViewer :snippets="r2Snippets" />

---

## 3. Active Defense Decompression Trap (Gzip Bomb)

When automated crawlers probe for WordPress, `.env`, or PHP exploits, respond with a compressed zero-byte stream that expands ~1000x in RAM:

<CodeViewer :snippets="r3Snippets" />

---

## 4. Case Study: Dual-Site Architecture for Immich Photos

Run public photo sharing alongside protected administrative access:

<CodeViewer :snippets="r4Snippets" />

---

## 5. Case Study: Zero-Trust Webhook Ingress (Stripe CIDR Whitelist)

Lock down Stripe webhook ingress using official provider IP CIDRs and silent TCP resets:

<CodeViewer :snippets="r5Snippets" />

---

## 6. Case Study: Prometheus & Actuator Telemetry Cloaking

Hide Prometheus metrics and Spring Boot diagnostic dumps from unauthorized crawlers:

<CodeViewer :snippets="r6Snippets" />
