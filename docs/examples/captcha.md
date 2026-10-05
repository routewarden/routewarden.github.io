---
title: Example 5 – Captcha Challenge
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

// ─── hCaptcha ────────────────────────────────────────────────────────────────
const hcaptcha = {
  json: buildSnippet({ lang: 'json', code: `{
  "$schema": "https://raw.githubusercontent.com/routewarden/cli/main/config.schema.json",
  "enabled": true,
  "blockPatterns": [
    "(?i)^/(admin|login)(/.*)?$"
  ],
  "response": {
    "mode": "captcha",
    "statusCode": 403,
    "captcha": {
      "provider": "hcaptcha",
      "siteKey": "10000000-ffff-ffff-ffff-000000000001",
      "title": "Human Verification (hCaptcha)"
    }
  }
}` }),
  traefik_yaml: buildSnippet({ lang: 'yaml', code: `# dynamic_conf.yml
http:
  middlewares:
    hcaptcha-barrier:
      plugin:
        routewarden:
          enabled: true
          blockPatterns:
            - '(?i)^/(admin|login)(/.*)?$'
          response:
            mode: captcha
            statusCode: 403
            captcha:
              provider: "hcaptcha"
              siteKey: "10000000-ffff-ffff-ffff-000000000001"
              title: "Human Verification (hCaptcha)"

  routers:
    app-router:
      rule: "Host(\`app.example.com\`)"
      entryPoints:
        - web
      middlewares:
        - hcaptcha-barrier
      service: app-service` }),
  traefik_toml: buildSnippet({ lang: 'toml', code: `# dynamic_conf.toml
[http.routers.app-router]
  rule = "Host(\`app.example.com\`)"
  entryPoints = ["web"]
  middlewares = ["hcaptcha-barrier"]
  service = "app-service"

[http.middlewares.hcaptcha-barrier.plugin.routewarden]
  enabled = true
  blockPatterns = ["(?i)^/(admin|login)(/.*)?$"]

[http.middlewares.hcaptcha-barrier.plugin.routewarden.response]
  mode = "captcha"
  statusCode = 403

[http.middlewares.hcaptcha-barrier.plugin.routewarden.response.captcha]
  provider = "hcaptcha"
  siteKey = "10000000-ffff-ffff-ffff-000000000001"
  title = "Human Verification (hCaptcha)"` }),
  traefik_labels: buildSnippet({ lang: 'docker', code: `# Docker Compose Labels
- "traefik.enable=true"
- "traefik.http.routers.app.rule=Host(\`app.example.com\`)"
- "traefik.http.routers.app.middlewares=hcaptcha-barrier"
- "traefik.http.middlewares.hcaptcha-barrier.plugin.routewarden.enabled=true"
- "traefik.http.middlewares.hcaptcha-barrier.plugin.routewarden.blockPatterns=(?i)^/(admin|login)(/.*)?$"
- "traefik.http.middlewares.hcaptcha-barrier.plugin.routewarden.response.mode=captcha"
- "traefik.http.middlewares.hcaptcha-barrier.plugin.routewarden.response.statusCode=403"
- "traefik.http.middlewares.hcaptcha-barrier.plugin.routewarden.response.captcha.provider=hcaptcha"
- "traefik.http.middlewares.hcaptcha-barrier.plugin.routewarden.response.captcha.siteKey=10000000-ffff-ffff-ffff-000000000001"
- "traefik.http.middlewares.hcaptcha-barrier.plugin.routewarden.response.captcha.title=Human Verification (hCaptcha)"` }),
  caddy: buildSnippet({ lang: 'caddy', code: `# Caddyfile
{
    order route_warden before reverse_proxy
}

app.example.com {
    route_warden {
        block_patterns "(?i)^/(admin|login)(/.*)?$"
        response {
            mode captcha
            status_code 403
            captcha {
                provider hcaptcha
                site_key "10000000-ffff-ffff-ffff-000000000001"
            }
        }
    }

    reverse_proxy app-service:80
}` }),
  nginx: buildSnippet({ lang: 'nginx', code: `# nginx.conf: hCaptcha Verification Barrier
http {
    lua_package_path "/usr/local/openresty/site/lualib/?.lua;/etc/nginx/lua/lib/?.lua;;";

    init_by_lua_block {
        local routewarden = require("resty.routewarden")

        hcaptcha_warden = routewarden.new({
            block_patterns = {
                "(?i)^/(admin|login)(/.*)?$"
            },
            response = {
                mode = "captcha",
                status_code = 403,
                captcha = {
                    provider = "hcaptcha",
                    site_key = "10000000-ffff-ffff-ffff-000000000001",
                    title = "Human Verification (hCaptcha)"
                }
            }
        })
    }

    server {
        listen 80;
        server_name app.example.com;

        access_by_lua_block {
            hcaptcha_warden:check()
        }

        location / {
            proxy_pass http://app-service:80;
        }
    }
}` }),
}

// ─── Turnstile ───────────────────────────────────────────────────────────────
const turnstile = {
  json: buildSnippet({ lang: 'json', code: `{
  "$schema": "https://raw.githubusercontent.com/routewarden/cli/main/config.schema.json",
  "enabled": true,
  "blockPatterns": [
    "(?i)^/login(/.*)?$",
    "(?i)^/reset-password(/.*)?$"
  ],
  "response": {
    "mode": "captcha",
    "statusCode": 403,
    "captcha": {
      "provider": "turnstile",
      "siteKey": "1x00000000000000000000AA",
      "title": "Security Verification Required"
    }
  }
}` }),
  traefik_yaml: buildSnippet({ lang: 'yaml', code: `# dynamic_conf.yml
http:
  middlewares:
    turnstile-barrier:
      plugin:
        routewarden:
          enabled: true
          blockPatterns:
            - '(?i)^/login(/.*)?$'
            - '(?i)^/reset-password(/.*)?$'
          response:
            mode: captcha
            statusCode: 403
            captcha:
              provider: "turnstile"
              siteKey: "1x00000000000000000000AA"
              title: "Security Verification Required"

  routers:
    login-router:
      rule: "Host(\`login.example.com\`)"
      entryPoints:
        - web
      middlewares:
        - turnstile-barrier
      service: login-service` }),
  traefik_toml: buildSnippet({ lang: 'toml', code: `# dynamic_conf.toml
[http.routers.login-router]
  rule = "Host(\`login.example.com\`)"
  entryPoints = ["web"]
  middlewares = ["turnstile-barrier"]
  service = "login-service"

[http.middlewares.turnstile-barrier.plugin.routewarden]
  enabled = true
  blockPatterns = ["(?i)^/login(/.*)?$", "(?i)^/reset-password(/.*)?$"]

[http.middlewares.turnstile-barrier.plugin.routewarden.response]
  mode = "captcha"
  statusCode = 403

[http.middlewares.turnstile-barrier.plugin.routewarden.response.captcha]
  provider = "turnstile"
  siteKey = "1x00000000000000000000AA"
  title = "Security Verification Required"` }),
  traefik_labels: buildSnippet({ lang: 'docker', code: `# Docker Compose Labels
- "traefik.enable=true"
- "traefik.http.routers.login.rule=Host(\`login.example.com\`)"
- "traefik.http.routers.login.middlewares=turnstile-barrier"
- "traefik.http.middlewares.turnstile-barrier.plugin.routewarden.enabled=true"
- "traefik.http.middlewares.turnstile-barrier.plugin.routewarden.blockPatterns=(?i)^/login(/.*)?$,(?i)^/reset-password(/.*)?$"
- "traefik.http.middlewares.turnstile-barrier.plugin.routewarden.response.mode=captcha"
- "traefik.http.middlewares.turnstile-barrier.plugin.routewarden.response.statusCode=403"
- "traefik.http.middlewares.turnstile-barrier.plugin.routewarden.response.captcha.provider=turnstile"
- "traefik.http.middlewares.turnstile-barrier.plugin.routewarden.response.captcha.siteKey=1x00000000000000000000AA"
- "traefik.http.middlewares.turnstile-barrier.plugin.routewarden.response.captcha.title=Security Verification Required"` }),
  caddy: buildSnippet({ lang: 'caddy', code: `# Caddyfile
{
    order route_warden before reverse_proxy
}

login.example.com {
    route_warden {
        block_patterns "(?i)^/login(/.*)?$" "(?i)^/reset-password(/.*)?$"
        response {
            mode captcha
            status_code 403
            captcha {
                provider turnstile
                site_key "1x00000000000000000000AA"
            }
        }
    }

    reverse_proxy login-service:80
}` }),
  nginx: buildSnippet({ lang: 'nginx', code: `# nginx.conf: Cloudflare Turnstile Verification
http {
    lua_package_path "/usr/local/openresty/site/lualib/?.lua;/etc/nginx/lua/lib/?.lua;;";

    init_by_lua_block {
        local routewarden = require("resty.routewarden")

        turnstile_warden = routewarden.new({
            block_patterns = {
                "(?i)^/login(/.*)?$",
                "(?i)^/reset-password(/.*)?$"
            },
            response = {
                mode = "captcha",
                status_code = 403,
                captcha = {
                    provider = "turnstile",
                    site_key = "1x00000000000000000000AA",
                    title = "Security Verification Required"
                }
            }
        })
    }

    server {
        listen 80;
        server_name login.example.com;

        access_by_lua_block {
            turnstile_warden:check()
        }

        location / {
            proxy_pass http://login-service:80;
        }
    }
}` }),
  docker_traefik: buildSnippet({ lang: 'yaml', code: `services:
  traefik:
    image: traefik:v3.1
    command:
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
      - "--experimental.plugins.routewarden.modulename=github.com/routewarden/traefik-warden" # [!code ++]
      - "--experimental.plugins.routewarden.version={{traefik_version}}" # [!code ++]
    ports:
      - "80:80"
    volumes:
      - "/var/run/docker.sock:/var/run/docker.sock:ro"

  app:
    image: nginx:alpine
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.app.rule=Host(\`app.localhost\`)"
      - "traefik.http.routers.app.middlewares=hcaptcha-barrier" # [!code ++]
      - "traefik.http.middlewares.hcaptcha-barrier.plugin.routewarden.enabled=true" # [!code ++]
      - "traefik.http.middlewares.hcaptcha-barrier.plugin.routewarden.blockPatterns=(?i)^/(admin|login)(/.*)?$" # [!code ++]
      - "traefik.http.middlewares.hcaptcha-barrier.plugin.routewarden.response.mode=captcha" # [!code ++]
      - "traefik.http.middlewares.hcaptcha-barrier.plugin.routewarden.response.captcha.provider=hcaptcha" # [!code ++]
      - "traefik.http.middlewares.hcaptcha-barrier.plugin.routewarden.response.captcha.siteKey=10000000-ffff-ffff-ffff-000000000001" # [!code ++]` }),

  docker_caddy: buildSnippet({ lang: 'yaml', code: `services:
  caddy:
    image: caddy:2-alpine
    build: # [!code ++]
      context: . # [!code ++]
      dockerfile_inline: | # [!code ++]
        FROM caddy:2-builder AS builder # [!code ++]
        RUN xcaddy build --with github.com/routewarden/caddy-warden@{{caddy_version}} # [!code ++]
        FROM caddy:2-alpine # [!code ++]
        COPY --from=builder /usr/bin/caddy /usr/bin/caddy # [!code ++]
    ports:
      - "80:80"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
    depends_on:
      - app

  app:
    image: nginx:alpine` }),

  docker_nginx: buildSnippet({ lang: 'yaml', code: `services:
  nginx:
    image: openresty/openresty:alpine
    ports:
      - "80:80"
    volumes:
      - ./lib/resty/routewarden:/usr/local/openresty/site/lualib/resty/routewarden:ro # [!code ++]
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - app

  app:
    image: nginx:alpine` }),
}

function toSnippets(s) {
  return {
    traefik: [
      { filename: 'traefik.yaml', lang: 'yaml', code: s.traefik_yaml.cleanCode, html: s.traefik_yaml.html, hasDiff: s.traefik_yaml.hasDiff },
      { filename: 'traefik.toml', lang: 'toml', code: s.traefik_toml.cleanCode, html: s.traefik_toml.html, hasDiff: s.traefik_toml.hasDiff },
      { filename: 'docker-compose.yaml', lang: 'docker', code: s.traefik_labels.cleanCode, html: s.traefik_labels.html, hasDiff: s.traefik_labels.hasDiff },
    ],
    caddy: [{ filename: 'Caddyfile', lang: 'caddy', code: s.caddy.cleanCode, html: s.caddy.html, hasDiff: s.caddy.hasDiff }],
    nginx: [{ filename: 'nginx.conf', lang: 'nginx', code: s.nginx.cleanCode, html: s.nginx.html, hasDiff: s.nginx.hasDiff }],
    cli: [{ filename: 'routewarden.json', lang: 'json', code: s.json.cleanCode, html: s.json.html, hasDiff: s.json.hasDiff }],
  }
}

const hcaptchaSnippets = computed(() => toSnippets(hcaptcha))
const turnstileSnippets = computed(() => toSnippets(turnstile))

const dockerSnippets = computed(() => ({
  traefik: [{ filename: 'docker-compose.yaml', lang: 'yaml', code: turnstile.docker_traefik.cleanCode, html: turnstile.docker_traefik.html, hasDiff: turnstile.docker_traefik.hasDiff }],
  caddy:   [{ filename: 'docker-compose.yaml', lang: 'yaml', code: turnstile.docker_caddy.cleanCode,   html: turnstile.docker_caddy.html,   hasDiff: turnstile.docker_caddy.hasDiff }],
  nginx:   [{ filename: 'docker-compose.yaml', lang: 'yaml', code: turnstile.docker_nginx.cleanCode,   html: turnstile.docker_nginx.html,   hasDiff: turnstile.docker_nginx.hasDiff }],
}))
</script>

# Example 5: Captcha Challenge (Turnstile / hCaptcha / reCAPTCHA)

Instead of dropping connections or returning static error codes, RouteWarden can serve interactive Captcha challenges on sensitive paths using **Cloudflare Turnstile**, **hCaptcha**, or **Google reCAPTCHA**.

---

## Is a `captcha.html` File Required?

> [!TIP]
> **No external `captcha.html` file is required!**  
> RouteWarden has a **built-in, mobile-responsive dark-mode HTML template** embedded directly into the Go binary. When `mode: captcha` is enabled, RouteWarden automatically:
> 1. Injects the official provider JavaScript SDK.
> 2. Renders the appropriate widget container.
> 3. Populates your custom title and site key.
>
> *(Optional: Pass an HTML template string into `response.captcha.template` to override the design.)*

---

## Supported Providers

| Provider | `response.captcha.provider` | Injected SDK Script | Widget Class |
|---|---|---|---|
| **hCaptcha** | `hcaptcha` | `https://js.hcaptcha.com/1/api.js` | `<div class="h-captcha">` |
| **Cloudflare Turnstile** | `turnstile` | `https://challenges.cloudflare.com/turnstile/v0/api.js` | `<div class="cf-turnstile">` |
| **Google reCAPTCHA v2** | `recaptcha` | `https://www.google.com/recaptcha/api.js` | `<div class="g-recaptcha">` |

---

## 1. hCaptcha Configuration Example

This example protects `/admin` and `/login` with **hCaptcha** (using the official hCaptcha test site key `10000000-ffff-ffff-ffff-000000000001`):

<CodeViewer :snippets="hcaptchaSnippets" />

---

## 2. Cloudflare Turnstile Configuration Example

<CodeViewer :snippets="turnstileSnippets" />

---

## 3. Docker Compose Example

<CodeViewer :snippets="dockerSnippets" />
