# Caddyfile Directive & JSON Reference

Comprehensive syntax and configuration options for **Caddy Warden** (`github.com/routewarden/caddy-warden`).

---

## 1. Directive Ordering

Caddy evaluates HTTP handler directives strictly according to order. Because RouteWarden acts as an edge security boundary to neutralize attacks before backend processing or authentication, configure directive ordering in global options:

```nginx
{
    order route_warden before basicauth
}
```

Or before `reverse_proxy` if you do not use Caddy's built-in `basicauth`:

```nginx
{
    order route_warden before reverse_proxy
}
```

---

## 2. Complete Caddyfile Schema

```nginx
route_warden {
    # Boolean Flags
    enabled <true|false>                        # Default: true
    enable_default_patterns <true|false>        # Default: true (.env, .git, backups, etc.)
    enable_default_allow_patterns <true|false>  # Default: true (/robots.txt, /favicon.ico, etc.)
    check_query <true|false>                    # Default: false (inspect URI query strings)

    # Path Patterns to Block or Challenge (Go RE2 Regular Expressions)
    block_patterns <regex...>

    # Safe Whitelist Patterns (Overrides blocking)
    allow_patterns <regex...>

    # IP / CIDR Subnet Allowlist (Bypasses all checks)
    allowed_ips <ip_or_cidr...>

    # HTTP Methods to Inspect (Default: GET)
    methods <methods...>

    # Response Actions
    response {
        mode <json|html|text|xml|redirect|captcha|silent_drop|gzip_bomb|tarpit|fake_success|ratelimit|proxy|infinite_stream>
        status_code <int>
        body <string>
        redirect_url <url>
        proxy_url <url>
        gzip_bomb_mb <int>
        retry_after_seconds <int>
        tarpit_delay_ms <int>
        stream_size_mb <int>

        captcha {
            provider <turnstile|hcaptcha|recaptcha>
            site_key <key>
        }
    }
}
```

---

## 3. Configuration Properties

| Directive | Type | Default | Description |
|---|---|---|---|
| `enabled` | `bool` | `true` | Enables or disables RouteWarden inspection. |
| `enable_default_patterns` | `bool` | `true` | Blocks high-risk files (`.env`, `.git`, `.aws`, `.ssh`, `.sql`, `.bak`, etc.). |
| `enable_default_allow_patterns` | `bool` | `true` | Whitelists standard files like `/robots.txt`, `/favicon.ico`, `/sitemap.xml`. |
| `check_query` | `bool` | `false` | When enabled, also evaluates query parameters for sensitive file targets. |
| `block_patterns` | `list` | `[]` | Additional regex patterns to intercept. |
| `allow_patterns` | `list` | `[]` | Regex patterns that should always be allowed through. |
| `allowed_ips` | `list` | `[]` | IPv4, IPv6, or CIDR blocks exempted from checks. |
| `methods` | `list` | `["GET"]` | HTTP verbs to inspect (e.g. `methods GET POST`). Non-matching verbs bypass inspection. |

---

## 4. Built-in Default Patterns

### Default Block Patterns (`enable_default_patterns true`)

When enabled (default), Caddy Warden intercepts requests matching these compiled regular expressions:

| Target Category | Compiled Regex | Intercepted Examples |
|---|---|---|
| **Environment & Configs** | `(?i)(^|/)(\.env.*\|.*\.(txt\|log\|bak\|backup\|sql\|conf\|config\|ini\|yaml\|yml))$` | `/.env`, `/.env.production`, `/app.config`, `/dump.sql`, `/debug.log`, `/app.ini` |
| **VCS & Hidden Metadata** | `(?i)(^|/)\.(git\|svn\|hg\|bzr\|cvs)(/.*\|$)` | `/.git/config`, `/.git/HEAD`, `/.svn/entries` |
| **Cloud & Shell Credentials** | `(?i)(^|/)\.(aws\|ssh\|kube\|docker)(/.*\|$)` | `/.aws/credentials`, `/.ssh/id_rsa`, `/.kube/config` |
| **Archives & DB Dumps** | `(?i).*\.(tar\|tar\.gz\|tgz\|zip\|rar\|7z\|gz\|bz2\|iso\|dump\|sqlite\|sqlite3\|db)$` | `/backup.tar.gz`, `/site.zip`, `/users.dump`, `/data.sqlite3` |
| **Sensitive Admin & Metrics** | `(?i)(^|/)(phpinfo\.php\|info\.php\|server-status\|server-info\|actuator(/.*)?\|metrics\|heapdump\|trace\|env)$` | `/phpinfo.php`, `/server-status`, `/actuator/health`, `/metrics` |
| **Package Managers & Locks** | `(?i)(^|/)(composer\.(json\|lock)\|package-lock\.json\|yarn\.lock\|pnpm-lock\.yaml\|Pipfile\|Pipfile\.lock\|requirements\.txt)$` | `/package-lock.json`, `/yarn.lock`, `/composer.lock`, `/requirements.txt` |

### Default Allow Patterns (`enable_default_allow_patterns true`)

When enabled (default), Caddy Warden immediately allows standard public resources through without checking block rules:

| Target Resource | Compiled Regex | Purpose |
|---|---|---|
| **Crawler Indexing Directives** | `(?i)^/robots\.txt$` | Search engine bot crawling policy |
| **Search Engine XML Sitemaps** | `(?i)^/sitemap.*\.xml$` | Public sitemaps (`/sitemap.xml`, `/sitemap_index.xml`) |
| **Digital Ad Transparency** | `(?i)^/ads\.txt$` | Authorized digital advertising sellers verification |
| **Security Disclosure Policies** | `(?i)^/security\.txt$` | RFC 9116 security researcher reporting endpoint |
| **ACME & Web Standards** | `(?i)^/\.well-known(/.*)?$` | TLS certificate challenges & discovery (`/.well-known/*`) |

---

## 5. Response Modes Matrix

| Mode | Options | Typical Use Case |
|---|---|---|
| `json` | `status_code`, `body` | REST API protection with clean JSON error |
| `html` | `status_code`, `body` | Custom branded 404 or 403 error page |
| `text` | `status_code`, `body` | Minimal plain-text rejection |
| `redirect` | `status_code`, `redirect_url` | Deflect scanners to honeypot or warning page |
| `captcha` | `captcha.provider`, `captcha.site_key` | Challenge suspicious visits via Cloudflare Turnstile/hCaptcha |
| `silent_drop` | None | Reset TCP connection immediately |
| `gzip_bomb` | `status_code`, `gzip_bomb_mb` | Active defense memory-exhaustion trap |
| `tarpit` | `tarpit_delay_ms` | Slowloris defense trickling bytes to tie up scanner concurrency |
| `ratelimit` | `status_code`, `retry_after_seconds` | 429 Too Many Requests response |
| `proxy` | `proxy_url` | Transparent canary/forensics honeypot mirror |
| `fake_success` | `status_code`, `body` | Synthetic decoy responses (`wp-login`, fake `.env`) |

---

## 6. JSON Configuration (Caddy REST API)

For zero-downtime environments configured via Caddy's dynamic API:

```json
{
  "handler": "route_warden",
  "enabled": true,
  "enable_default_patterns": true,
  "allowed_ips": ["10.0.0.0/8", "192.168.1.50"],
  "methods": ["GET", "POST"],
  "block_patterns": ["(?i)^/admin(/.*)?$"],
  "allow_patterns": ["(?i)^/admin/health$"],
  "response": {
    "mode": "json",
    "status_code": 403,
    "body": "{\"error\":\"Forbidden: Authorized Access Only\"}"
  }
}
```
