---
title: Case Study – CMS Admin & Brute-Force Shielding
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

const s = {
  traefik_yaml: buildSnippet({ lang: 'yaml', code: `# dynamic_conf.yml
http:
  middlewares:
    wordpress-shield: # [!code ++]
      plugin: # [!code ++]
        routewarden: # [!code ++]
          enabled: true # [!code ++]
          methods: # [!code ++]
            - GET # [!code ++]
            - POST # [!code ++]
            - PUT # [!code ++]
            - DELETE # [!code ++]
            - PATCH # [!code ++]
            - HEAD # [!code ++]
          enableDefaultPatterns: true # Blocks wp-config.php.bak, .sql, .env # [!code ++]
          blockPatterns: # [!code ++]
            - '(?i)^/(wp-login\\.php|xmlrpc\\.php)$' # [!code ++]
            - '(?i)^/wp-admin(/.*)?$' # [!code ++]
          # Office IP bypasses captcha challenge automatically
          allowedIps: # [!code ++]
            - "192.168.1.0/24" # [!code ++]
            - "10.0.0.0/8" # [!code ++]
          # Challenge all other external visitors
          response: # [!code ++]
            mode: captcha # [!code ++]
            statusCode: 403 # [!code ++]
            captcha: # [!code ++]
              provider: turnstile # [!code ++]
              siteKey: "0x4AAAAAAtestkey123" # [!code ++]
              title: "Administrative Verification Required" # [!code ++]

  routers:
    blog-router:
      rule: "Host(\`blog.example.com\`)"
      entryPoints:
        - websecure
      middlewares:
        - wordpress-shield # [!code ++]
      service: wordpress-service` }),

  traefik_toml: buildSnippet({ lang: 'toml', code: `# dynamic_conf.toml
[http.routers.blog-router]
  rule = "Host(\`blog.example.com\`)"
  entryPoints = ["websecure"]
  middlewares = ["wordpress-shield"]
  service = "wordpress-service"

[http.middlewares.wordpress-shield.plugin.routewarden] # [!code ++]
  enabled = true # [!code ++]
  methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"] # [!code ++]
  enableDefaultPatterns = true # [!code ++]
  blockPatterns = [ # [!code ++]
    "(?i)^/(wp-login\\\\.php|xmlrpc\\\\.php)$", # [!code ++]
    "(?i)^/wp-admin(/.*)?$" # [!code ++]
  ] # [!code ++]
  allowedIps = ["192.168.1.0/24", "10.0.0.0/8"] # [!code ++]

[http.middlewares.wordpress-shield.plugin.routewarden.response] # [!code ++]
  mode = "captcha" # [!code ++]
  statusCode = 403 # [!code ++]

[http.middlewares.wordpress-shield.plugin.routewarden.response.captcha] # [!code ++]
  provider = "turnstile" # [!code ++]
  siteKey = "0x4AAAAAAtestkey123" # [!code ++]
  title = "Administrative Verification Required" # [!code ++]` }),

  traefik_labels: buildSnippet({ lang: 'docker', code: `# Docker Compose Labels
- "traefik.http.routers.blog.rule=Host(\`blog.example.com\`)"
- "traefik.http.routers.blog.middlewares=wordpress-shield" # [!code ++]
- "traefik.http.middlewares.wordpress-shield.plugin.routewarden.enabled=true" # [!code ++]
- "traefik.http.middlewares.wordpress-shield.plugin.routewarden.methods=GET,POST,PUT,DELETE,PATCH,HEAD" # [!code ++]
- "traefik.http.middlewares.wordpress-shield.plugin.routewarden.blockPatterns=(?i)^/(wp-login\\\\.php|xmlrpc\\\\.php)$,(?i)^/wp-admin(/.*)?$" # [!code ++]
- "traefik.http.middlewares.wordpress-shield.plugin.routewarden.allowedIps=192.168.1.0/24,10.0.0.0/8" # [!code ++]
- "traefik.http.middlewares.wordpress-shield.plugin.routewarden.response.mode=captcha" # [!code ++]
- "traefik.http.middlewares.wordpress-shield.plugin.routewarden.response.captcha.provider=turnstile" # [!code ++]
- "traefik.http.middlewares.wordpress-shield.plugin.routewarden.response.captcha.siteKey=0x4AAAAAAtestkey123" # [!code ++]` }),

  caddy: buildSnippet({ lang: 'caddy', code: `# Caddyfile
{
    order route_warden before reverse_proxy # [!code ++]
}

blog.example.com {
    route_warden { # [!code ++]
        methods GET POST PUT DELETE PATCH HEAD # [!code ++]
        enable_default_patterns true # [!code ++]
        block_patterns "(?i)^/(wp-login\\.php|xmlrpc\\.php)$" "(?i)^/wp-admin(/.*)?$" # [!code ++]
        allowed_ips "192.168.1.0/24" "10.0.0.0/8" # [!code ++]
        response { # [!code ++]
            mode captcha # [!code ++]
            status_code 403 # [!code ++]
            captcha { # [!code ++]
                provider turnstile # [!code ++]
                site_key "0x4AAAAAAtestkey123" # [!code ++]
            } # [!code ++]
        } # [!code ++]
    } # [!code ++]

    reverse_proxy wordpress-service:80
}` }),

  nginx: buildSnippet({ lang: 'nginx', code: `# nginx.conf: WordPress & CMS Shield
http {
    lua_package_path "/usr/local/openresty/site/lualib/?.lua;/etc/nginx/lua/lib/?.lua;;";

    init_by_lua_block {
        local routewarden = require("resty.routewarden") # [!code ++]

        wp_warden = routewarden.new({ # [!code ++]
            methods = { "GET", "POST", "PUT", "DELETE", "PATCH", "HEAD" }, # [!code ++]
            enable_default_patterns = true, # [!code ++]
            block_patterns = { # [!code ++]
                "(?i)^/(wp-login\\\\.php|xmlrpc\\\\.php)$", # [!code ++]
                "(?i)^/wp-admin(/.*)?$" # [!code ++]
            }, # [!code ++]
            allowed_ips = { # [!code ++]
                "192.168.1.0/24", # [!code ++]
                "10.0.0.0/8" # [!code ++]
            }, # [!code ++]
            response = { # [!code ++]
                mode = "captcha", # [!code ++]
                status_code = 403, # [!code ++]
                captcha = { # [!code ++]
                    provider = "turnstile", # [!code ++]
                    site_key = "0x4AAAAAAtestkey123", # [!code ++]
                    title = "Administrative Verification Required" # [!code ++]
                } # [!code ++]
            } # [!code ++]
        }) # [!code ++]
    }

    server {
        listen 80;
        server_name blog.example.com;

        access_by_lua_block {
            wp_warden:check() # [!code ++]
        }

        location / {
            proxy_pass http://wordpress-service:80;
        }
    }
}` }),

  cli: buildSnippet({ lang: 'json', code: `// routewarden.json
{
  "$schema": "https://raw.githubusercontent.com/routewarden/cli/main/config.schema.json",
  "enabled": true,
  "methods": ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"],
  "enableDefaultPatterns": true,
  "blockPatterns": [
    "(?i)^/(wp-login\\\\.php|xmlrpc\\\\.php)$",
    "(?i)^/wp-admin(/.*)?$"
  ],
  "allowedIps": ["192.168.1.0/24", "10.0.0.0/8"],
  "response": {
    "mode": "captcha",
    "statusCode": 403,
    "captcha": {
      "provider": "turnstile",
      "siteKey": "0x4AAAAAAtestkey123",
      "title": "Administrative Verification Required"
    }
  }
}` }),
}

const snippets = computed(() => ({
  traefik: [
    { filename: 'traefik.yaml', lang: 'yaml', code: s.traefik_yaml.cleanCode, html: s.traefik_yaml.html, hasDiff: s.traefik_yaml.hasDiff },
    { filename: 'traefik.toml', lang: 'toml', code: s.traefik_toml.cleanCode, html: s.traefik_toml.html, hasDiff: s.traefik_toml.hasDiff },
    { filename: 'docker-compose.yaml', lang: 'docker', code: s.traefik_labels.cleanCode, html: s.traefik_labels.html, hasDiff: s.traefik_labels.hasDiff },
  ],
  caddy: [
    { filename: 'Caddyfile', lang: 'caddy', code: s.caddy.cleanCode, html: s.caddy.html, hasDiff: s.caddy.hasDiff },
  ],
  nginx: [
    { filename: 'nginx.conf', lang: 'nginx', code: s.nginx.cleanCode, html: s.nginx.html, hasDiff: s.nginx.hasDiff },
  ],
  cli: [
    { filename: 'routewarden.json', lang: 'json', code: s.cli.cleanCode, html: s.cli.html, hasDiff: s.cli.hasDiff },
  ],
}))
</script>

# Case Study: CMS Admin & Brute-Force Shielding (WordPress & Ghost)

This case study demonstrates how to protect content management systems (WordPress, Ghost, Strapi, Drupal) against automated credential-stuffing bots, brute-force login attempts, and XML-RPC amplification attacks.

---

## The Threat Model

WordPress powers over 40% of the web, making it the number one target for automated scanner networks. The attack vectors are consistent across all deployments:
1. **`wp-login.php` Brute-Force**: Relentless dictionary attacks attempting common administrative passwords.
2. **`xmlrpc.php` Exploitation**: Used for multi-call brute force attacks where a single HTTP request can attempt hundreds of password combinations.
3. **Backup File Probing**: Scanners looking for `wp-config.php.bak`, `wp-config.old`, or database exports dumped into the webroot.

---

## The Solution: Two Tactical Approaches

### Approach A: Cloudflare Turnstile / hCaptcha Challenge
Rather than blocking login entirely, RouteWarden intercepts requests to `wp-login.php` or `/admin` and presents an interactive bot verification challenge. Once solved, legitimate humans proceed to login while bots are stopped dead.

### Approach B: Internal IP / VPN Bypass with 404 Cloaking
If content creators always connect via a corporate VPN or office IP, RouteWarden returns `404 Not Found` to the rest of the world and allows only whitelisted subnets to reach administrative paths.

---

## Middleware Configuration (Captcha Challenge Mode)

<CodeViewer :snippets="snippets" />

> [!IMPORTANT]
> **HTTP Methods Requirement**:
> Attackers and credential stuffing scripts almost exclusively use **`POST`** to submit passwords to `wp-login.php` or execute multi-call amplification on `xmlrpc.php`. Because RouteWarden inspects only `GET` requests by default, always explicitly define `methods GET POST PUT DELETE PATCH HEAD` (or `methods: ["GET", "POST"]`) so POST attack traffic cannot bypass RouteWarden.
