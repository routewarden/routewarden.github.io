---
title: "Traefik Warden: Configuration Reference"
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

const ex_yaml = buildSnippet({
  lang: 'yaml',
  code: `http:
  middlewares:
    routewarden:
      plugin:
        routewarden:
          enabled: true
          enableDefaultPatterns: true
          # Inspect GET and POST requests (default: ["GET"])
          methods:
            - "GET"
            - "POST"`,
})

const ex_toml = buildSnippet({
  lang: 'toml',
  code: `[http.middlewares.routewarden.plugin.routewarden]
enabled = true
enableDefaultPatterns = true
methods = ["GET", "POST"]`,
})

const ex_labels = buildSnippet({
  lang: 'yaml',
  code: `services:
  webapp:
    labels:
      - "traefik.http.middlewares.my-warden.plugin.routewarden.enableDefaultPatterns=true"
      - "traefik.http.middlewares.my-warden.plugin.routewarden.methods=GET,POST"`,
})

const ex_k8s = buildSnippet({
  lang: 'yaml',
  code: `apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: routewarden
spec:
  plugin:
    routewarden:
      enableDefaultPatterns: true
      methods:
        - "GET"
        - "POST"`,
})

const configExampleSnippets = computed(() => ({
  traefik: [
    { filename: 'traefik.yml', lang: 'yaml', code: ex_yaml.cleanCode, html: ex_yaml.html, hasDiff: false },
    { filename: 'traefik.toml', lang: 'toml', code: ex_toml.cleanCode, html: ex_toml.html, hasDiff: false },
    { filename: 'docker-compose.yml', lang: 'docker', code: ex_labels.cleanCode, html: ex_labels.html, hasDiff: false },
    { filename: 'ingressroute.yaml', lang: 'yaml', code: ex_k8s.cleanCode, html: ex_k8s.html, hasDiff: false },
  ],
}))
</script>

# Traefik Warden: Configuration Reference

This reference covers all configuration options available in **Traefik Warden**.

---

## Core Options

| Key | Type | Default | Description |
|---|---|---|---|
| `enabled` | `bool` | `true` | Enables or disables the middleware. When `false`, all traffic passes through. |
| `debug` | `bool` | `false` | Enables verbose diagnostic logging for request candidate normalization, method matching, and allow/block evaluation details. |
| `securityLog` | `bool` | `true` | Emits single-line structured JSON security audit events on stdout for CrowdSec, SIEMs, or fail2ban on blocked requests. |
| `enableDefaultPatterns` | `bool` | `true` | Enables built-in protection for `.env*`, `.git`, `.aws`, `.sql`, backups, and logs. |
| `enableDefaultAllowPatterns` | `bool` | `true` | Enables built-in allowlist exemptions (`/robots.txt`, `/sitemap.xml`, `/ads.txt`, `/security.txt`, `/.well-known/*`). Set to `false` to disable. |
| `blockPatterns` | `[]string` | `[]` | List of custom regular expressions to block (matches against normalized path). |
| `allowPatterns` | `[]string` | `[]` | Additional custom regex patterns to explicitly allow even if matching blocked rules. |
| `allowedIps` | `[]string` | `[]` | Whitelisted IPv4/IPv6 addresses or CIDR subnets (e.g., `10.0.0.0/8`, `127.0.0.1`). |
| `trustedProxies` | `[]string` | `[]` | Upstream proxies/load-balancers trusted for `X-Forwarded-For` / `X-Real-IP`. Untrusted connections use socket IP directly. |
| `methods` | `[]string` | `["GET"]` | HTTP request verbs to inspect (e.g. `["GET", "POST"]`). Non-matching verbs bypass inspection. |
| `checkQuery` | `bool` | `false` | Also inspects the URL raw query string for blocked patterns. |
| `checkHeaders` | `[]string` | `[]` | Optional list of HTTP request headers to inspect for path smuggling (e.g. `["X-Forwarded-Uri", "X-Rewrite-URL"]`). |
| `checkBody` | `bool` | `false` | When true, buffers and inspects request bodies against blocked patterns. |
| `checkBodyMaxBytes` | `int64` | `65536` | Maximum bytes to buffer for body inspection (default: 64KB). |
| `checkBodyPatterns` | `[]string` | `[]` | Specific regex patterns to match against request body (falls back to `blockPatterns` if empty). |
| `statusCode` | `int` | `403` | Default HTTP status code when request is blocked (legacy shortcut). |

---

## Security Audit Logging (`securityLog`)

RouteWarden includes built-in structured security audit logging designed for [CrowdSec](/examples/crowdsec), SIEM platforms (Elasticsearch, Loki, Splunk, Datadog), and automated intrusion remediation tools.

When `securityLog: true` (the default), every intercepted probe emits a single-line JSON payload to `stdout`:

```json
{"action":"json","client_ip":"198.51.100.42","method":"GET","path":"/.env","pattern":"(?i)(^|/)(\\.env.*|.*\\.(txt|log|bak|backup|sql|conf|config|ini|yaml|yml))$","plugin":"routewarden","reason":"path_blocked","request_uri":"/.env","timestamp":"2026-09-19T15:30:00Z","type":"routewarden_block","user_agent":"Nuclei/v3.1.0"}
```

| Field | Description |
|---|---|
| `type` | Constant identifier `routewarden_block` for log parsers and alerting rules. |
| `timestamp` | ISO-8601 UTC timestamp of the interception. |
| `plugin` | Middleware instance name. |
| `client_ip` | Remote client IP extracted from socket RemoteAddr, `X-Forwarded-For`, or `X-Real-IP`. |
| `method` | HTTP request verb (`GET`, `POST`, etc.). |
| `path` | Normalized candidate path that triggered the match. |
| `request_uri` | Original raw URI requested by the client. |
| `pattern` | Regular expression pattern that triggered the block. |
| `action` | Response mode executed (`json`, `html`, `fakeSuccess`, `silentDrop`, etc.). |
| `reason` | Block trigger classification (`path_blocked`, `query_blocked`, `query_param_blocked`, `header_blocked`). |
| `user_agent` | Inbound client User-Agent header string. |

For complete end-to-end integration steps with automated firewall remediation, see the **[CrowdSec Integration Guide](/examples/crowdsec)**.

---

## Built-in Default Patterns

### Default Block Patterns (`enableDefaultPatterns: true`)

When `enableDefaultPatterns: true` (default), RouteWarden intercepts requests matching these compiled regular expressions:

| Target Category | Compiled Regex | Intercepted Examples |
|---|---|---|
| **Environment & Configs** | `(?i)(^|/)(\.env.*\|.*\.(txt\|log\|bak\|backup\|sql\|conf\|config\|ini\|yaml\|yml))$` | `/.env`, `/.env.production`, `/app.config`, `/dump.sql`, `/debug.log`, `/app.ini` |
| **VCS & Hidden Metadata** | `(?i)(^|/)\.(git\|svn\|hg\|bzr\|cvs)(/.*\|$)` | `/.git/config`, `/.git/HEAD`, `/.svn/entries` |
| **Cloud & Shell Credentials** | `(?i)(^|/)\.(aws\|ssh\|kube\|docker)(/.*\|$)` | `/.aws/credentials`, `/.ssh/id_rsa`, `/.kube/config` |
| **Archives & DB Dumps** | `(?i).*\.(tar\|tar\.gz\|tgz\|zip\|rar\|7z\|gz\|bz2\|iso\|dump\|sqlite\|sqlite3\|db)$` | `/backup.tar.gz`, `/site.zip`, `/users.dump`, `/data.sqlite3` |
| **Sensitive Admin & Metrics** | `(?i)(^|/)(phpinfo\.php\|info\.php\|server-status\|server-info\|actuator(/.*)?\|metrics\|heapdump\|trace\|env)$` | `/phpinfo.php`, `/server-status`, `/actuator/health`, `/metrics` |
| **Package Managers & Locks** | `(?i)(^|/)(composer\.(json\|lock)\|package-lock\.json\|yarn\.lock\|pnpm-lock\.yaml\|Pipfile\|Pipfile\.lock\|requirements\.txt)$` | `/package-lock.json`, `/yarn.lock`, `/composer.lock`, `/requirements.txt` |
| **TLS Keys & Keystores** | `(?i).*\.(pem\|key\|crt\|pfx\|p12\|jks\|kdb)$` | `/server.key`, `/cert.pem`, `/keystore.p12` |
| **Container Manifests** | `(?i)(^|/)(dockerfile.*\|docker-compose.*\.ya?ml)$` | `/Dockerfile`, `/docker-compose.yml`, `/docker-compose.prod.yaml` |
| **OS Metadata Structure** | `(?i)(^|/)\.ds_store$` | `/.DS_Store` |
| **CMS & Framework Configs** | `(?i)(^|/)(wp-config\.php.*\|configuration\.php.*\|settings\.py\|local_settings\.py)$` | `/wp-config.php`, `/configuration.php`, `/settings.py` |

### Default Allow Patterns (`enableDefaultAllowPatterns: true`)

When `enableDefaultAllowPatterns: true` (default), RouteWarden immediately permits standard public and ACME paths before testing block patterns:

| Target Resource | Compiled Regex |
|---|---|
| Crawler Indexing Directives | `(?i)^/robots\.txt$` |
| Search Engine XML Sitemaps | `(?i)^/sitemap.*\.xml$` |
| Digital Ad Transparency | `(?i)^/ads\.txt$` |
| Security Disclosure Policies | `(?i)^/security\.txt$` |
| ACME & Web Standards | `(?i)^/\.well-known(/.*)?$` |

---

## Response Configuration (`response`)

> 📖 **Deep Dive**: For an in-depth breakdown of all 11+ response behaviors, limitations, attacker impacts, and security cautions, visit the **[Response Modes Reference](/core/response-modes)**.

| Key | Type | Default | Description |
|---|---|---|---|
| `mode` | `string` | `"text"` | Response mode: `json`, `html`, `text`, `xml`, `redirect`, `captcha`, `silentDrop`, `gzipBomb` (`bomb`), `tarpit`, `fakeSuccess` (`decoy`), `rateLimitChallenge` (`ratelimit`), `proxy` (`mirror`), or `infiniteStream` (`garbagestream`). |
| `statusCode` | `int` | `403` | HTTP status code returned to client (use `200` for honeypots / deception, `429` for rate limit challenge). |
| `body` | `string` | `""` | Response body for `json`, `html`, `xml`, or `text` mode. |
| `headers` | `map[string]string` | `{}` | Custom HTTP response headers injected into blocked responses. |
| `redirectUrl` | `string` | `""` | Target URL when `mode: redirect`. |
| `proxyUrl` | `string` | `""` | Target backend honeypot URL when `mode: proxy` (transparent reverse-proxy). |
| `captcha` | `object` | `{}` | Captcha challenge options when `mode: captcha`. |
| `gzipBombMB` | `int` | `10` | Uncompressed stream size in Megabytes when `mode: gzipBomb` (expands ~1000x on client memory). |
| `retryAfterSeconds` | `int` | `300` | Value for `Retry-After` header when `mode: rateLimitChallenge`. |
| `tarpitDelayMs` | `int` | `1000` | Milliseconds between trickle bytes when `mode: tarpit` (stalls scanner connections). |
| `tarpitMaxDurationSeconds` | `int` | `60` | Maximum seconds before terminating stalled connection in `mode: tarpit`. |
| `streamSizeMB` | `int` | `50` | Total garbage data size in Megabytes when `mode: infiniteStream`. |

### Captcha Options (`response.captcha`)

| Key | Type | Default | Description |
|---|---|---|---|
| `provider` | `string` | `"turnstile"` | Captcha provider: `turnstile`, `hcaptcha`, or `recaptcha`. |
| `siteKey` | `string` | `""` | Public site key for the captcha widget. |
| `title` | `string` | `"Verification"` | Heading displayed on the verification challenge page. |
| `template` | `string` | `""` | Optional custom HTML template string override. |

---

## HTTP Request Verbs Inspection (`methods`)

By default, RouteWarden inspects incoming `GET` requests (`methods: ["GET"]`), as automated scanners and vulnerability reconnaissance probes primarily use `GET` to check for leaked files (`.env`, `.git`, backups, configs).

You can configure `methods` to inspect additional HTTP request verbs (e.g. `POST`, `PUT`, `DELETE`, `PATCH`, `HEAD`) or tailor inspection to specific workloads. Any incoming request whose HTTP method is **not** included in `methods` will immediately bypass inspection and pass downstream to upstream containers.

### Configuration Examples

<CodeViewer :snippets="configExampleSnippets" />
