---
title: Case Study – Zero-Trust Webhook Ingress
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

const s = {
  traefik_yaml: buildSnippet({ lang: 'yaml', code: `# dynamic_conf.yml
http:
  middlewares:
    webhook-shield: # [!code ++]
      plugin: # [!code ++]
        routewarden: # [!code ++]
          enabled: true # [!code ++]
          enableDefaultPatterns: true # [!code ++]
          # Block everything under /webhooks by default
          blockPatterns: # [!code ++]
            - '(?i)^/webhooks(/.*)?$' # [!code ++]
          # Allow ONLY the verified production webhook handler
          allowPatterns: # [!code ++]
            - '(?i)^/webhooks/stripe/v1$' # [!code ++]
          # Restrict to official Stripe Webhook IP ranges
          allowedIps: # [!code ++]
            - "3.18.12.63/32" # [!code ++]
            - "3.130.192.231/32" # [!code ++]
            - "13.235.14.237/32" # [!code ++]
            - "13.235.122.149/32" # [!code ++]
            - "35.154.171.200/32" # [!code ++]
          response: # [!code ++]
            mode: silentDrop # Drop unauthorized scanner connections immediately # [!code ++]

  routers:
    webhook-router:
      rule: "Host(\`api.example.com\`) && PathPrefix(\`/webhooks\`)"
      entryPoints:
        - websecure
      middlewares:
        - webhook-shield # [!code ++]
      service: webhook-service` }),

  traefik_toml: buildSnippet({ lang: 'toml', code: `# dynamic_conf.toml
[http.routers.webhook-router]
  rule = "Host(\`api.example.com\`) && PathPrefix(\`/webhooks\`)"
  entryPoints = ["websecure"]
  middlewares = ["webhook-shield"]
  service = "webhook-service"

[http.middlewares.webhook-shield.plugin.routewarden] # [!code ++]
  enabled = true # [!code ++]
  enableDefaultPatterns = true # [!code ++]
  blockPatterns = ["(?i)^/webhooks(/.*)?$"] # [!code ++]
  allowPatterns = ["(?i)^/webhooks/stripe/v1$"] # [!code ++]
  allowedIps = [ # [!code ++]
    "3.18.12.63/32", # [!code ++]
    "3.130.192.231/32", # [!code ++]
    "13.235.14.237/32", # [!code ++]
    "13.235.122.149/32", # [!code ++]
    "35.154.171.200/32" # [!code ++]
  ] # [!code ++]

[http.middlewares.webhook-shield.plugin.routewarden.response] # [!code ++]
  mode = "silentDrop" # [!code ++]` }),

  traefik_labels: buildSnippet({ lang: 'docker', code: `# Docker Compose Labels
- "traefik.http.routers.webhook.rule=Host(\`api.example.com\`) && PathPrefix(\`/webhooks\`)"
- "traefik.http.routers.webhook.middlewares=webhook-shield" # [!code ++]
- "traefik.http.middlewares.webhook-shield.plugin.routewarden.enabled=true" # [!code ++]
- "traefik.http.middlewares.webhook-shield.plugin.routewarden.blockPatterns=(?i)^/webhooks(/.*)?$" # [!code ++]
- "traefik.http.middlewares.webhook-shield.plugin.routewarden.allowPatterns=(?i)^/webhooks/stripe/v1$" # [!code ++]
- "traefik.http.middlewares.webhook-shield.plugin.routewarden.allowedIps=3.18.12.63/32,3.130.192.231/32,13.235.14.237/32" # [!code ++]
- "traefik.http.middlewares.webhook-shield.plugin.routewarden.response.mode=silentDrop" # [!code ++]` }),

  caddy: buildSnippet({ lang: 'caddy', code: `# Caddyfile
{
    order route_warden before reverse_proxy # [!code ++]
}

api.example.com {
    route_warden { # [!code ++]
        enable_default_patterns true # [!code ++]
        block_patterns "(?i)^/webhooks(/.*)?$" # [!code ++]
        allow_patterns "(?i)^/webhooks/stripe/v1$" # [!code ++]
        allowed_ips "3.18.12.63/32" "3.130.192.231/32" "13.235.14.237/32" "13.235.122.149/32" "35.154.171.200/32" # [!code ++]
        response { # [!code ++]
            mode silent_drop # [!code ++]
        } # [!code ++]
    } # [!code ++]

    reverse_proxy webhook-service:8080
}` }),

  nginx: buildSnippet({ lang: 'nginx', code: `# nginx.conf: Zero-Trust Webhook Protection
http {
    lua_package_path "/usr/local/openresty/site/lualib/?.lua;/etc/nginx/lua/lib/?.lua;;";

    init_by_lua_block {
        local routewarden = require("resty.routewarden") # [!code ++]

        webhook_warden = routewarden.new({ # [!code ++]
            enable_default_patterns = true, # [!code ++]
            block_patterns = { # [!code ++]
                "(?i)^/webhooks(/.*)?$" # [!code ++]
            }, # [!code ++]
            allow_patterns = { # [!code ++]
                "(?i)^/webhooks/stripe/v1$" # [!code ++]
            }, # [!code ++]
            allowed_ips = { # [!code ++]
                "3.18.12.63/32", # [!code ++]
                "3.130.192.231/32", # [!code ++]
                "13.235.14.237/32", # [!code ++]
                "13.235.122.149/32", # [!code ++]
                "35.154.171.200/32" # [!code ++]
            }, # [!code ++]
            response = { # [!code ++]
                mode = "silentDrop" -- Drop unauthorized TCP connection immediately # [!code ++]
            } # [!code ++]
        }) # [!code ++]
    }

    server {
        listen 80;
        server_name api.example.com;

        location /webhooks {
            access_by_lua_block {
                webhook_warden:check() # [!code ++]
            }
            proxy_pass http://webhook-service:8080;
        }

        location / {
            proxy_pass http://api-service:8080;
        }
    }
}` }),

  cli: buildSnippet({ lang: 'json', code: `// routewarden.json
{
  "$schema": "https://raw.githubusercontent.com/routewarden/cli/main/config.schema.json",
  "enabled": true,
  "enableDefaultPatterns": true,
  "blockPatterns": ["(?i)^/webhooks(/.*)?$"],
  "allowPatterns": ["(?i)^/webhooks/stripe/v1$"],
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

# Case Study: Zero-Trust Webhook Ingress (Stripe & GitHub)

This case study demonstrates how to protect payment gateways and webhook ingestion endpoints from unauthorized tampering, forged payload injection, and internal route disclosure.

---

## The Threat Model

Modern SaaS and e-commerce applications rely heavily on external webhooks from services like **Stripe**, **GitHub**, **Shopify**, **Paddle**, and **Slack**.

Because webhook handlers must be reachable over the public internet, developers frequently place their entire payment or integration microservice behind Traefik. This exposes several risks:
- **Reconnaissance of Internal Endpoints**: Attackers probe `/webhooks/debug`, `/webhooks/replay`, or `/webhooks/test`.
- **Forged Event Injection**: Direct HTTP spam to the webhook receiver attempting to trigger expensive verification workflows or crash background queues.
- **Credential & Config Exposure**: Accidental leakage of `.env` or deployment configurations on webhook servers.

---

## The Solution: Two-Layer Zero-Trust Defense

With RouteWarden, you enforce a two-tier gatekeeper at the edge:
1. **IP Range Restriction (`allowedIps`)**: Only official CIDR blocks published by Stripe/GitHub can send payloads to `/webhooks/.*`.
2. **Exact Allowlist (`allowPatterns`)**: Only designated production webhook endpoints (e.g. `/webhooks/stripe/v1`) are permitted; all internal or debug paths are blocked with `404 Not Found` or dropped silently (`silentDrop`).

---

## Configuration (Traefik, Caddy & NGINX)

<CodeViewer :snippets="snippets" />
