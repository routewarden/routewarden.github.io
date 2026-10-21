---
title: Caddy Warden Frequently Asked Questions (FAQ)
description: Troubleshooting guide and FAQs for Caddy Warden. Learn how to resolve 404 bypasses with handle blocks, handle Automatic HTTPS redirects, configure directive ordering, and debug Docker deployments.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

// ─── 1. Handle Precedence ───────────────────────────────────────────────────
const before_handle_snippet = buildSnippet({
  lang: 'caddy',
  code: `{
    admin off
    # Order RouteWarden ahead of routing directives
    order routewarden before handle # [!code ++]
}

(routewarden) {
    routewarden {
        enable_default_allow_patterns true
        enable_default_patterns true
        response {
            mode redirect
            redirect_url "https://routewarden.github.io"
        }
    }
}

api.example.com {
    import routewarden

    encode zstd gzip

    handle {
        reverse_proxy web:8000
    }
}`,
})

const route_wrapper_snippet = buildSnippet({
  lang: 'caddy',
  code: `api.example.com {
    # Wrapping inside route { ... } enforces top-to-bottom execution
    route { # [!code ++]
        # 1. RouteWarden inspects and mitigates first
        import routewarden # [!code ++]

        # 2. Compression
        encode zstd gzip

        # 3. Downstream handlers / proxying
        handle { # [!code ++]
            reverse_proxy web:8000 # [!code ++]
        } # [!code ++]
    } # [!code ++]
}`,
})

const problematic_handle_snippet = buildSnippet({
  lang: 'caddy',
  code: `{
    # Problem: 'before reverse_proxy' does NOT run ahead of 'handle'!
    order routewarden before reverse_proxy # [!code --]
}

api.example.com {
    import routewarden

    # 'handle' routes execute BEFORE routewarden in this ordering!
    handle { # [!code --]
        reverse_proxy web:8000 # [!code --]
    } # [!code --]
}`,
})

const handleSnippets = computed(() => ({
  caddy: [
    { filename: 'Option 1: Order Before Handle (Recommended)', lang: 'caddy', code: before_handle_snippet.cleanCode, html: before_handle_snippet.html, hasDiff: before_handle_snippet.hasDiff },
    { filename: 'Option 2: Route Block Wrapper', lang: 'caddy', code: route_wrapper_snippet.cleanCode, html: route_wrapper_snippet.html, hasDiff: route_wrapper_snippet.hasDiff },
    { filename: 'Problematic Configuration (Bypassed)', lang: 'caddy', code: problematic_handle_snippet.cleanCode, html: problematic_handle_snippet.html, hasDiff: problematic_handle_snippet.hasDiff },
  ],
}))

// ─── 2. Automatic HTTPS & Redirects ─────────────────────────────────────────
const auto_https_curl = buildSnippet({
  lang: 'bash',
  code: `# Follow redirects (-L) and allow self-signed local certs (-k)
curl -v -L -k https://api.example.com/.env`,
})

const auto_https_caddy = buildSnippet({
  lang: 'caddy',
  code: `# Prefix with http:// to explicitly test plain HTTP on port 80
http://api.example.com {
    import routewarden

    encode zstd gzip
    reverse_proxy web:8000
}`,
})

const autoHttpsSnippets = computed(() => ({
  caddy: [
    { filename: 'Curl (Follow Redirects)', lang: 'bash', code: auto_https_curl.cleanCode, html: auto_https_curl.html, hasDiff: false },
    { filename: 'Caddyfile (Explicit HTTP)', lang: 'caddy', code: auto_https_caddy.cleanCode, html: auto_https_caddy.html, hasDiff: false },
  ],
}))

// ─── 3. Host / SNI Resolution ───────────────────────────────────────────────
const host_resolve_curl = buildSnippet({
  lang: 'bash',
  code: `# Resolve the domain to 127.0.0.1 while keeping correct Host & SNI headers
curl -v -k --resolve api.example.com:443:127.0.0.1 https://api.example.com/.env`,
})

const host_header_curl = buildSnippet({
  lang: 'bash',
  code: `# For plain HTTP on port 80, pass the Host header directly
curl -v -H "Host: api.example.com" http://127.0.0.1:80/.env`,
})

const hostMatchSnippets = computed(() => ({
  caddy: [
    { filename: 'HTTPS via --resolve (Recommended)', lang: 'bash', code: host_resolve_curl.cleanCode, html: host_resolve_curl.html, hasDiff: false },
    { filename: 'HTTP via Host Header', lang: 'bash', code: host_header_curl.cleanCode, html: host_header_curl.html, hasDiff: false },
  ],
}))

// ─── 4. Directive Ordering Options ──────────────────────────────────────────
const order_opt_handle = buildSnippet({
  lang: 'caddy',
  code: `{
    admin off
    # Recommended when site blocks use handle or handle_path
    order routewarden before handle # [!code ++]
}`,
})

const order_opt_basicauth = buildSnippet({
  lang: 'caddy',
  code: `{
    admin off
    # Block scanners and probes before presenting HTTP Basic Auth challenge
    order routewarden before basicauth # [!code ++]
}`,
})

const order_opt_proxy = buildSnippet({
  lang: 'caddy',
  code: `{
    admin off
    # Standard ordering for sites with top-level reverse_proxy
    order routewarden before reverse_proxy # [!code ++]
}`,
})

const directiveOrderSnippets = computed(() => ({
  caddy: [
    { filename: 'Before Handle (Recommended)', lang: 'caddy', code: order_opt_handle.cleanCode, html: order_opt_handle.html, hasDiff: order_opt_handle.hasDiff },
    { filename: 'Before Basicauth', lang: 'caddy', code: order_opt_basicauth.cleanCode, html: order_opt_basicauth.html, hasDiff: order_opt_basicauth.hasDiff },
    { filename: 'Before Reverse Proxy', lang: 'caddy', code: order_opt_proxy.cleanCode, html: order_opt_proxy.html, hasDiff: order_opt_proxy.hasDiff },
  ],
}))

// ─── 5. Docker Module Verification ──────────────────────────────────────────
const docker_exec_cli = buildSnippet({
  lang: 'bash',
  code: `# Inspect compiled Caddy modules inside your running container
docker exec caddy-container caddy list-modules | grep routewarden

# Expected output:
# http.handlers.routewarden
# http.handlers.route_warden`,
})

const docker_compose_def = buildSnippet({
  lang: 'yaml',
  code: `services:
  caddy:
    image: ghcr.io/routewarden/caddy-warden:latest # [!code ++]
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro # [!code ++]
      - caddy_data:/data
      - caddy_config:/config
    restart: unless-stopped

volumes:
  caddy_data:
  caddy_config:`,
})

const dockerVerificationSnippets = computed(() => ({
  caddy: [
    { filename: 'Verify Modules (CLI)', lang: 'bash', code: docker_exec_cli.cleanCode, html: docker_exec_cli.html, hasDiff: false },
    { filename: 'docker-compose.yml', lang: 'yaml', code: docker_compose_def.cleanCode, html: docker_compose_def.html, hasDiff: docker_compose_def.hasDiff },
  ],
}))

// ─── 6. Edge Proxy Safe Responses ───────────────────────────────────────────
const edge_json_response = buildSnippet({
  lang: 'caddy',
  code: `routewarden {
    enable_default_patterns true

    # Safe for Cloudflare, AWS ALB, NGINX: returns 403 Forbidden
    response {
        mode json # [!code ++]
        status_code 403 # [!code ++]
        body "{\\"error\\":\\"Forbidden\\",\\"message\\":\\"Access denied\\"}" # [!code ++]
    }
}`,
})

const edge_html_response = buildSnippet({
  lang: 'caddy',
  code: `routewarden {
    enable_default_patterns true

    # Deceptive 404: looks like a standard missing page
    response {
        mode html # [!code ++]
        status_code 404 # [!code ++]
        body "<!DOCTYPE html><html><body><h1>404 Not Found</h1></body></html>" # [!code ++]
    }
}`,
})

const edgeProxyResponseSnippets = computed(() => ({
  caddy: [
    { filename: 'JSON 403 (Recommended)', lang: 'caddy', code: edge_json_response.cleanCode, html: edge_json_response.html, hasDiff: edge_json_response.hasDiff },
    { filename: 'Deceptive HTML 404', lang: 'caddy', code: edge_html_response.cleanCode, html: edge_html_response.html, hasDiff: edge_html_response.hasDiff },
  ],
}))

// ─── 7. Reusable Snippets Across Sites ──────────────────────────────────────
const multi_site_caddy = buildSnippet({
  lang: 'caddy',
  code: `# 1. Define reusable RouteWarden configuration snippet
(routewarden_common) {
    routewarden {
        enable_default_allow_patterns true
        enable_default_patterns true
        response {
            mode redirect
            redirect_url "https://routewarden.github.io"
        }
    }
}

# 2. Import into API domain
api.example.com {
    route {
        import routewarden_common # [!code ++]
        reverse_proxy app:8000
    }
}

# 3. Import into Dashboard domain
dashboard.example.com {
    route {
        import routewarden_common # [!code ++]
        reverse_proxy dashboard:3000
    }
}`,
})

const reusableSnippetSnippets = computed(() => ({
  caddy: [
    { filename: 'Caddyfile (Multi-Domain Snippet)', lang: 'caddy', code: multi_site_caddy.cleanCode, html: multi_site_caddy.html, hasDiff: multi_site_caddy.hasDiff },
  ],
}))
</script>

# Caddy Warden FAQ & Troubleshooting

<p class="tagline" style="font-size: 1.15rem; color: var(--vp-c-text-2); margin-bottom: 2rem;">
Solutions to common Caddy integration edge cases, directive ordering conflicts, Automatic HTTPS redirects, and reverse proxy behaviors.
</p>

---

## 1. Why is RouteWarden not blocking requests when my site uses `handle` blocks?

### Symptom
You test a blocked sensitive endpoint like `curl https://api.example.com/.env`, but instead of RouteWarden intercepting it, the request slips through to your backend application and returns a backend **`404 Not Found`** (with `Via: 1.1 Caddy` and a duration around `5-10ms`).

### Root Cause
In Caddy's HTTP architecture, **`handle` and `handle_path` are routing directives with higher evaluation precedence than standard proxy handlers**. 

If your Caddyfile defines `order routewarden before reverse_proxy`, Caddy compiles the internal middleware pipeline in this order:
1. `handle { ... }` runs **first**.
2. `routewarden` is placed **second** (never reached because `handle` already dispatched to the backend).

### Solution

<CodeViewer :snippets="handleSnippets" />

> [!TIP]
> **Option 1 (`order routewarden before handle`)** is recommended because it applies globally to all site blocks and lets your downstream site configurations remain clean and concise.

---

## 2. Why do I get a `308 Permanent Redirect` when curling `http://api.example.com/.env`?

### Symptom
Running `curl http://api.example.com/.env` returns `308 Permanent Redirect` to `https://api.example.com/.env` without RouteWarden blocking it or redirecting to your configured response target.

### Root Cause
When a domain name is specified without a scheme in a Caddyfile (e.g. `api.example.com { ... }`), Caddy enables **Automatic HTTPS**:
1. Your actual site configuration (including RouteWarden, compression, and proxying) is bound exclusively to **HTTPS (port 443)**.
2. Caddy automatically starts an internal HTTP-to-HTTPS redirect server on **HTTP (port 80)**.
3. This port 80 redirect server **does not run any of your site's middleware**. It immediately returns a `308 Permanent Redirect` to `https://`.

If `curl` is run without `-L` (follow redirects), `curl` terminates at the port 80 redirect and **never reaches RouteWarden** on port 443.

### Solution

<CodeViewer :snippets="autoHttpsSnippets" />

---

## 3. Why do I get a generic 404 when testing locally with `curl https://localhost/.env`?

### Symptom
Curling `localhost` or `127.0.0.1` returns an empty `404 Not Found` with `Server: Caddy`.

### Root Cause
Caddy uses strict SNI and `Host` header routing. If your Caddyfile defines `api.example.com { ... }`, and you execute `curl -k https://localhost/.env`, `curl` sends `Host: localhost`. Because Caddy has no site block matching `localhost`, Caddy returns a core `404 Not Found` before entering any site routes.

### Solution

<CodeViewer :snippets="hostMatchSnippets" />

---

## 4. How does directive ordering (`order`) work with RouteWarden?

### Recommended Global Directives Order
In Caddy v2, plugins define where they should execute in the middleware chain. Starting in Caddy Warden v1.6.2, RouteWarden registers a default directive order automatically. 

When configuring manual orders in the global options block:

| Directive Order | When to Use |
|---|---|
| `order routewarden before handle` | **(Recommended)** When using `handle` or `handle_path` blocks in site definitions. |
| `order routewarden before basicauth` | When you want scanner recon and probe requests blocked **before** presenting an HTTP authentication prompt to attackers. |
| `order routewarden before reverse_proxy` | When sites define `reverse_proxy` at the top level without wrapping in `handle`. |

<CodeViewer :snippets="directiveOrderSnippets" />

---

## 5. How do I verify RouteWarden is compiled into my Caddy container?

Verify that the Caddy binary inside your container includes the RouteWarden plugin module:

<CodeViewer :snippets="dockerVerificationSnippets" />

---

## 6. Why do I see a `502 Bad Gateway` when using `mode silent_drop` behind Cloudflare?

### Root Cause
In `mode silent_drop`, RouteWarden hijacks the underlying TCP connection and closes it immediately (`conn.Close()`) without transmitting an HTTP status line. 

If Caddy is behind an edge proxy or CDN (like **Cloudflare, AWS ALB, NGINX, or Traefik**), the edge proxy interprets the unexpected TCP socket termination as an upstream failure and returns **`502 Bad Gateway`** to the client.

### Solution
When deploying behind a CDN or reverse proxy, use `mode json` or `mode html` with `status_code 403` or `404` instead of `silent_drop`:

<CodeViewer :snippets="edgeProxyResponseSnippets" />

---

## 7. How do I define a reusable RouteWarden snippet across multiple sites?

Define a snippet using parentheses `(routewarden)` and `import` it into each site block:

<CodeViewer :snippets="reusableSnippetSnippets" />
