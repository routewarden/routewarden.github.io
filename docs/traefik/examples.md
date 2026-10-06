---
title: Traefik Cookbook & Recipes
---
<script setup>
import { computed, onMounted } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'
import { useGatewaySelection } from '../.vitepress/theme/composables/useGatewaySelection'

const { activeGateway } = useGatewaySelection()
onMounted(() => {
  activeGateway.value = 'traefik'
})

// ─── 1. Global EntryPoint Shield (Docker Compose) ─────────────────────────────
const r1_json = buildSnippet({
  lang: 'json',
  code: `{
  "$schema": "https://raw.githubusercontent.com/routewarden/cli/main/config.schema.json",
  "enabled": true,
  "enableDefaultPatterns": true,
  "response": {
    "mode": "json",
    "statusCode": 404,
    "body": "{\\"error\\":\\"Not Found\\"}"
  }
}`,
})

const r1_compose = buildSnippet({
  lang: 'docker',
  code: `services:
  traefik:
    image: traefik:v3.0
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.web.http.middlewares=traefik-warden@docker" # [!code ++]
      - "--experimental.plugins.routewarden.modulename=github.com/routewarden/traefik-warden" # [!code ++]
      - "--experimental.plugins.routewarden.version={{traefik_version}}" # [!code ++]
    labels:
      - "traefik.enable=true"
      - "traefik.http.middlewares.traefik-warden.plugin.routewarden.enabled=true" # [!code ++]
      - "traefik.http.middlewares.traefik-warden.plugin.routewarden.enableDefaultPatterns=true" # [!code ++]
      - "traefik.http.middlewares.traefik-warden.plugin.routewarden.response.mode=json" # [!code ++]
      - "traefik.http.middlewares.traefik-warden.plugin.routewarden.response.statusCode=404" # [!code ++]
      - 'traefik.http.middlewares.traefik-warden.plugin.routewarden.response.body={"error":"Not Found"}' # [!code ++]`,
})

const r1Snippets = computed(() => ({
  traefik: [
    { filename: 'docker-compose.yml', lang: 'docker', code: r1_compose.cleanCode, html: r1_compose.html, hasDiff: r1_compose.hasDiff },
  ],
  cli: [
    { filename: 'routewarden.json', lang: 'json', code: r1_json.cleanCode, html: r1_json.html, hasDiff: false },
  ],
}))

// ─── 2. Service-Specific Defense with Allowlist Exceptions ─────────────────────
const r2_json = buildSnippet({
  lang: 'json',
  code: `{
  "$schema": "https://raw.githubusercontent.com/routewarden/cli/main/config.schema.json",
  "enabled": true,
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
  ]
}`,
})

const r2_compose = buildSnippet({
  lang: 'docker',
  code: `services:
  webapp:
    image: nginx:alpine
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.webapp.rule=Host(\`app.example.com\`)"
      - "traefik.http.routers.webapp.middlewares=app-warden" # [!code ++]
      - "traefik.http.middlewares.app-warden.plugin.routewarden.enabled=true" # [!code ++]
      - "traefik.http.middlewares.app-warden.plugin.routewarden.blockPatterns=(?i)^/admin(/.*)?$,(?i)^/metrics$" # [!code ++]
      - "traefik.http.middlewares.app-warden.plugin.routewarden.allowPatterns=(?i)^/admin/health$" # [!code ++]
      - "traefik.http.middlewares.app-warden.plugin.routewarden.allowedIps=10.0.0.0/8,192.168.1.100" # [!code ++]`,
})

const r2Snippets = computed(() => ({
  traefik: [
    { filename: 'docker-compose.yml', lang: 'docker', code: r2_compose.cleanCode, html: r2_compose.html, hasDiff: r2_compose.hasDiff },
  ],
  cli: [
    { filename: 'routewarden.json', lang: 'json', code: r2_json.cleanCode, html: r2_json.html, hasDiff: false },
  ],
}))

// ─── 3. Kubernetes IngressRoute (Traefik CRD) ─────────────────────────────────
const r3_json = buildSnippet({
  lang: 'json',
  code: `{
  "$schema": "https://raw.githubusercontent.com/routewarden/cli/main/config.schema.json",
  "enabled": true,
  "enableDefaultPatterns": true,
  "blockPatterns": [
    "(?i)^/admin(/.*)?$"
  ],
  "allowedIps": [
    "10.0.0.0/8"
  ],
  "response": {
    "mode": "json",
    "statusCode": 403,
    "body": "{\\"error\\":\\"Forbidden: Internal Cluster Only\\"}"
  }
}`,
})

const r3_ingress = buildSnippet({
  lang: 'yaml',
  code: `apiVersion: traefik.io/v1alpha1
kind: Middleware # [!code ++]
metadata: # [!code ++]
  name: routewarden-middleware # [!code ++]
  namespace: default # [!code ++]
spec: # [!code ++]
  plugin: # [!code ++]
    routewarden: # [!code ++]
      enabled: true # [!code ++]
      enableDefaultPatterns: true # [!code ++]
      blockPatterns: # [!code ++]
        - '(?i)^/admin(/.*)?$' # [!code ++]
      allowedIps: # [!code ++]
        - "10.0.0.0/8" # [!code ++]
      response: # [!code ++]
        mode: json # [!code ++]
        statusCode: 403 # [!code ++]
        body: '{"error":"Forbidden: Internal Cluster Only"}' # [!code ++]
---
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: app-ingress
  namespace: default
spec:
  entryPoints:
    - websecure
  routes:
    - match: Host(\`cluster.example.com\`)
      kind: Rule
      middlewares:
        - name: routewarden-middleware # [!code ++]
      services:
        - name: backend-service
          port: 80`,
})

const r3Snippets = computed(() => ({
  traefik: [
    { filename: 'ingressroute.yaml', lang: 'yaml', code: r3_ingress.cleanCode, html: r3_ingress.html, hasDiff: r3_ingress.hasDiff },
  ],
  cli: [
    { filename: 'routewarden.json', lang: 'json', code: r3_json.cleanCode, html: r3_json.html, hasDiff: false },
  ],
}))

// ─── 4. Case Study: Dual-Router Defense for Immich ───────────────────────────
const r4_json = buildSnippet({
  lang: 'json',
  code: `{
  "$schema": "https://raw.githubusercontent.com/routewarden/cli/main/config.schema.json",
  "enabled": true,
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

const r4_dynamic = buildSnippet({
  lang: 'yaml',
  code: `http:
  middlewares:
    immich-public-shield: # [!code ++]
      plugin: # [!code ++]
        routewarden: # [!code ++]
          enabled: true # [!code ++]
          enableDefaultPatterns: true # [!code ++]
          blockPatterns: # [!code ++]
            - '(?i)^/api/auth/login.*$' # [!code ++]
            - '(?i)^/api/auth/admin-sign-up.*$' # [!code ++]
            - '(?i)^/api/users.*$' # [!code ++]
            - '(?i)^/api/admin.*$' # [!code ++]
          response: # [!code ++]
            mode: json # [!code ++]
            statusCode: 404 # [!code ++]
            body: '{"error":"Not Found","message":"Endpoint unavailable on public router"}' # [!code ++]

  routers:
    # Public Router: Exposes photo sharing with RouteWarden active
    immich-public:
      rule: "Host(\`photos.example.com\`)"
      entryPoints: ["websecure"]
      middlewares: ["immich-public-shield"] # [!code ++]
      service: immich-service

    # Private Router: Full admin access via WireGuard or Tailscale VPN
    immich-private:
      rule: "Host(\`photos-internal.example.com\`)"
      entryPoints: ["internal"]
      service: immich-service`,
})

const r4Snippets = computed(() => ({
  traefik: [
    { filename: 'dynamic.yml', lang: 'yaml', code: r4_dynamic.cleanCode, html: r4_dynamic.html, hasDiff: r4_dynamic.hasDiff },
  ],
  cli: [
    { filename: 'routewarden.json', lang: 'json', code: r4_json.cleanCode, html: r4_json.html, hasDiff: false },
  ],
}))

// ─── 5. Case Study: WordPress / CMS Brute-Force Shield (Cloudflare Turnstile) ──
const r5_json = buildSnippet({
  lang: 'json',
  code: `{
  "$schema": "https://raw.githubusercontent.com/routewarden/cli/main/config.schema.json",
  "enabled": true,
  "enableDefaultPatterns": true,
  "blockPatterns": [
    "(?i)^/(wp-login\\\\.php|xmlrpc\\\\.php)$",
    "(?i)^/wp-admin(/.*)?$"
  ],
  "allowedIps": [
    "10.0.0.0/8"
  ],
  "response": {
    "mode": "captcha",
    "statusCode": 403,
    "captcha": {
      "provider": "turnstile",
      "siteKey": "0x4AAAAAAtestkey123",
      "title": "Administrative Verification Required"
    }
  }
}`,
})

const r5_dynamic = buildSnippet({
  lang: 'yaml',
  code: `http:
  middlewares:
    wordpress-shield: # [!code ++]
      plugin: # [!code ++]
        routewarden: # [!code ++]
          enabled: true # [!code ++]
          enableDefaultPatterns: true # [!code ++]
          blockPatterns: # [!code ++]
            - '(?i)^/(wp-login\\.php|xmlrpc\\.php)$' # [!code ++]
            - '(?i)^/wp-admin(/.*)?$' # [!code ++]
          allowedIps: # [!code ++]
            - "10.0.0.0/8"      # Internal office VPN bypasses captcha # [!code ++]
          response: # [!code ++]
            mode: captcha # [!code ++]
            statusCode: 403 # [!code ++]
            captcha: # [!code ++]
              provider: turnstile # [!code ++]
              siteKey: "0x4AAAAAAtestkey123" # [!code ++]
              title: "Administrative Verification Required" # [!code ++]`,
})

const r5Snippets = computed(() => ({
  traefik: [
    { filename: 'dynamic.yml', lang: 'yaml', code: r5_dynamic.cleanCode, html: r5_dynamic.html, hasDiff: r5_dynamic.hasDiff },
  ],
  cli: [
    { filename: 'routewarden.json', lang: 'json', code: r5_json.cleanCode, html: r5_json.html, hasDiff: false },
  ],
}))

// ─── 6. Case Study: Active Defense Gzip Bomb Traps ────────────────────────────
const r6_json = buildSnippet({
  lang: 'json',
  code: `{
  "$schema": "https://raw.githubusercontent.com/routewarden/cli/main/config.schema.json",
  "enabled": true,
  "blockPatterns": [
    "(?i)(^|/)(\\\\.env.*|\\\\.git.*|wp-login\\\\.php|phpmyadmin.*)$"
  ],
  "response": {
    "mode": "gzipBomb",
    "statusCode": 200,
    "gzipBombMB": 10
  }
}`,
})

const r6_dynamic = buildSnippet({
  lang: 'yaml',
  code: `http:
  middlewares:
    honeypot-bomber: # [!code ++]
      plugin: # [!code ++]
        routewarden: # [!code ++]
          enabled: true # [!code ++]
          blockPatterns: # [!code ++]
            - '(?i)(^|/)(\\.env.*|\\.git.*|wp-login\\.php|phpmyadmin.*)$' # [!code ++]
          response: # [!code ++]
            mode: gzipBomb # [!code ++]
            statusCode: 200 # [!code ++]
            gzipBombMB: 10 # [!code ++]`,
})

const r6Snippets = computed(() => ({
  traefik: [
    { filename: 'dynamic.yml', lang: 'yaml', code: r6_dynamic.cleanCode, html: r6_dynamic.html, hasDiff: r6_dynamic.hasDiff },
  ],
  cli: [
    { filename: 'routewarden.json', lang: 'json', code: r6_json.cleanCode, html: r6_json.html, hasDiff: false },
  ],
}))
</script>

# Traefik Cookbook & Recipes

Production blueprints and ready-to-run configurations for deploying **Traefik Warden** on Traefik Proxy.

---

## 1. Global EntryPoint Shield (Docker Compose)

Protect every microservice, API, and container automatically at Traefik's `web` or `websecure` entrypoints without needing to attach middleware labels to individual containers:

<CodeViewer :snippets="r1Snippets" />

---

## 2. Service-Specific Defense with Allowlist Exceptions

Apply custom regex filters and safe whitelists on an individual web application:

<CodeViewer :snippets="r2Snippets" />

---

## 3. Kubernetes IngressRoute (Traefik CRD)

Deploy RouteWarden in Kubernetes clusters using Traefik's Custom Resource Definitions:

<CodeViewer :snippets="r3Snippets" />

---

## 4. Case Study: Dual-Router Defense for Immich

Safely expose public photo/video shares (`/share/*`) while strictly returning a 404 on administrative, login, and user management endpoints:

<CodeViewer :snippets="r4Snippets" />

---

## 5. Case Study: WordPress / CMS Brute-Force Shield (Cloudflare Turnstile)

Neutralize automated dictionary crawlers probing `wp-login.php` or `xmlrpc.php`:

<CodeViewer :snippets="r5Snippets" />

---

## 6. Case Study: Active Defense Gzip Bomb Traps

Neutralize high-frequency bot crawlers (`dirsearch`, `nikto`) scanning for `.env` or backups:

<CodeViewer :snippets="r6Snippets" />
