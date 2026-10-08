import { defineConfig } from 'vitepress'
import versionData from '../version.json' with { type: 'json' }
import versionsRegistry from '../versions.json' with { type: 'json' }

// Cloudflare Web Analytics token — only set in CI via GitHub Actions secret.
// When absent (local dev), the beacon script is NOT injected at all to avoid
// CORS errors from Cloudflare rejecting requests with an empty/invalid token.
const CF_ANALYTICS_TOKEN = process.env.CLOUDFLARE_ANALYTICS_TOKEN || ''

const caddyLanguage = {
  name: 'caddy',
  aliases: ['caddyfile', 'Caddyfile'],
  displayName: 'Caddyfile',
  scopeName: 'source.caddyfile',
  patterns: [
    {
      name: 'comment.line.number-sign.caddyfile',
      match: '#.*$'
    },
    {
      name: 'string.quoted.double.caddyfile',
      begin: '"',
      end: '"',
      patterns: [{ name: 'constant.character.escape.caddyfile', match: '\\\\.' }]
    },
    {
      name: 'constant.numeric.caddyfile',
      match: '\\b\\d+(\\.\\d+)?\\b'
    },
    {
      name: 'constant.language.boolean.caddyfile',
      match: '\\b(true|false|on|off)\\b'
    },
    {
      name: 'keyword.control.caddyfile',
      match: '\\b(order|route_warden|reverse_proxy|tls|respond|import|handle|handle_path|root|encode|log|rewrite|redir|header|request_header|basicauth|forward_auth|abort|error)\\b'
    },
    {
      name: 'entity.name.tag.caddyfile',
      match: '^[\\s]*([a-zA-Z0-9_.-]+)'
    }
  ]
}

export default defineConfig({
  title: 'RouteWarden',
  description: 'Unified Edge & L4 Defense: Stop sensitive file leaks in Traefik, Caddy, NGINX, and protect non-HTTP services with TCP Warden.',
  base: '/',
  cleanUrls: true,
  ignoreDeadLinks: [
    /^https?:\/\/localhost/,
  ],
  vite: {
    server: {
      host: true
    }
  },
  async buildEnd(siteConfig) {
    // Generate fallback redirect for old /docs/ URLs so existing links and bookmarks redirect seamlessly to /
    const importModule = (name: string) => new Function('n', 'return import(n)')(name)
    const fs = await importModule('node:fs')
    const path = await importModule('node:path')
    const outDir = siteConfig.outDir
    
    const docsDir = path.join(outDir, 'docs')
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true })
    }

    const docsRedirectHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Redirecting to RouteWarden Documentation...</title>
  <meta http-equiv="refresh" content="0; url=/">
  <link rel="canonical" href="/">
  <script>
    const newPath = window.location.pathname.replace(/^\\/docs\\/?/, '/') + window.location.search + window.location.hash;
    window.location.replace(newPath || '/');
  </script>
</head>
<body>
  <p>Redirecting to <a href="/">RouteWarden Documentation</a>...</p>
</body>
</html>
`
    fs.writeFileSync(path.join(docsDir, 'index.html'), docsRedirectHtml, 'utf8')
  },
  transformPageData(pageData) {
    // Provide version globally to markdown templates
    const defaultVer = (versionData as any).traefik || (versionData as any).version || ''
    pageData.params = {
      ...pageData.params,
      version: defaultVer,
      traefik_version: (versionData as any).traefik || defaultVer,
      caddy_version: (versionData as any).caddy || defaultVer,
      nginx_version: (versionData as any).nginx || defaultVer,
      tcp_version: (versionData as any).tcp || defaultVer,
      cli_version: (versionData as any).cli || defaultVer,
    }
  },
  markdown: {
    languages: [
      caddyLanguage as any
    ],
    config(md) {
      const originalRender = md.render.bind(md)
      md.render = (src, env) => {
        const vDefault = (versionData as any).traefik || (versionData as any).version || ''
        const vTraefik = (versionData as any).traefik || vDefault
        const vCaddy = (versionData as any).caddy || vDefault
        const vNginx = (versionData as any).nginx || vDefault
        const vTcp = (versionData as any).tcp || vDefault
        const vCli = (versionData as any).cli || vDefault

        let replaced = src
          .replace(/\{\{version\}\}/g, vDefault)
          .replace(/\{\{(?:traefik_version|version_traefik)\}\}/g, vTraefik)
          .replace(/\{\{(?:caddy_version|version_caddy)\}\}/g, vCaddy)
          .replace(/\{\{(?:nginx_version|version_nginx)\}\}/g, vNginx)
          .replace(/\{\{(?:tcp_version|version_tcp)\}\}/g, vTcp)
          .replace(/\{\{(?:cli_version|version_cli)\}\}/g, vCli)
        // Escape raw unescaped pipes and backslashes inside inline code spans (`...`) within markdown table lines
        // so that table columns are not prematurely split by regex alternation pipes (e.g. `(^|/)`)
        // and backslashes are not stripped by markdown HTML parsing
        replaced = replaced.replace(/^(\|.*?\|)$/gm, (tableLine) => {
          return tableLine.replace(/`([^`\r\n]+?)`/g, (_match, code) => {
            return '<code>' + code
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/\\/g, '&#92;')
              .replace(/\|/g, '&#124;') + '</code>'
          })
        })
        return originalRender(replaced, env)
      }
    }
  },
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/icon.svg' }],
    ['link', { rel: 'alternate icon', type: 'image/x-icon', href: '/favicon.ico' }],
    ['meta', { name: 'theme-color', content: '#6366f1' }],
    ['meta', { name: 'author', content: 'RouteWarden Contributors' }],
    ['meta', { name: 'keywords', content: 'traefik, caddy, nginx, openresty, tcp-warden, middleware, security, anti-evasion, ip whitelist, sensitive files, env protection, reverse proxy waf, layer 4 firewall' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'RouteWarden — Unified Edge & Protocol Security Suite' }],
    ['meta', { property: 'og:description', content: 'Stop sensitive file leaks (.env, .git, backups) across Traefik, Caddy, and NGINX, and protect non-HTTP infrastructure with TCP Warden.' }],
    ['meta', { property: 'og:image', content: 'https://routewarden.github.io/banner.png' }],
    ['meta', { property: 'og:url', content: 'https://routewarden.github.io/' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: 'RouteWarden — Unified Edge & Protocol Security Suite' }],
    ['meta', { name: 'twitter:description', content: 'Ultra-fast sensitive path defense for web gateways and protocol-aware Layer 4 proxying for backend infrastructure.' }],
    ['meta', { name: 'twitter:image', content: 'https://routewarden.github.io/banner.png' }],
    // Cloudflare Web Analytics — only injected when the token secret is available at build time.
    // Omitting the script entirely when CF_ANALYTICS_TOKEN is empty avoids CORS rejections from
    // Cloudflare's RUM endpoint, which returns no Access-Control-Allow-Origin on invalid tokens.
    ...(CF_ANALYTICS_TOKEN ? [[
      'script' as const,
      {
        defer: '',
        src: 'https://static.cloudflareinsights.com/beacon.min.js',
        'data-cf-beacon': JSON.stringify({ token: CF_ANALYTICS_TOKEN })
      }
    ] as [string, Record<string, string>]] : [])
  ],
  themeConfig: {
    logo: '/icon.svg',
    siteTitle: 'RouteWarden',
    nav: [
      {
        text: 'Gateways',
        activeMatch: '^/(traefik|caddy|nginx|tcp)/',
        items: [
          { text: 'TCP Warden (L4 Firewall)', link: '/tcp/' },
          { text: 'Traefik Warden', link: '/traefik/' },
          { text: 'Caddy Warden', link: '/caddy/' },
          { text: 'NGINX Warden', link: '/nginx/' }
        ]
      },
      {
        text: 'Docs',
        activeMatch: '^/(core|examples|reference|tools)/',
        items: [
          { text: 'Architecture & Threat Model', link: '/core/architecture' },
          { text: 'Anti-Evasion Normalization', link: '/core/anti-evasion' },
          { text: 'Response Modes (13 Actions)', link: '/core/response-modes' },
          { text: 'Custom Regex Patterns', link: '/core/custom-patterns' },
          { text: 'Production Case Studies', link: '/examples/case-study-immich' },
          { text: 'Common Recipes & Compose', link: '/examples/basic-sensitive-files' },
          { text: 'Interactive Pattern Checker', link: '/tools/pattern-checker' }
        ]
      },
      {
        text: 'CLI',
        link: '/cli/',
        activeMatch: '^/cli/'
      },
      {
        text: versionsRegistry.current,
        activeMatch: '^/v(0|1)\\.',
        items: [
          ...versionsRegistry.versions.map(v => ({ text: v.text, link: v.link })),
          { text: 'Changelog & Migrations', link: '/core/changelog' },
          { text: 'Traefik Plugin Catalog', link: 'https://plugins.traefik.io/plugins/6aae41dd5b5ee35d8bd24ca5/route-warden' }
        ]
      }
    ],
    sidebar: {
      '/tcp/': [
        {
          text: 'TCP Warden (L4 Proxy & Firewall)',
          collapsed: false,
          items: [
            { text: 'Overview & Architecture', link: '/tcp/' },
            { text: 'Getting Started & Docker', link: '/tcp/getting-started' },
            { text: 'Configuration Reference', link: '/tcp/configuration' },
            { text: 'Log Levels', link: '/tcp/log-levels' },
            { text: 'Network & Firewall Integrations', link: '/tcp/network-integrations' },
            { text: 'Modular Protocol Plugins', link: '/tcp/plugins' },
            { text: 'CrowdSec Integration (Optional)', link: '/tcp/crowdsec' },
            { text: 'FAQ & Comparisons', link: '/tcp/faq' },
            { text: 'Management API & SSE', link: '/tcp/api' },
            { text: 'CLI Commands Reference', link: '/tcp/cli' },
            { text: 'Changelog & Releases', link: '/tcp/changelog' }
          ]
        },
        {
          text: 'Plugin Development Guide',
          collapsed: false,
          items: [
            { text: 'Overview & Quick Start', link: '/tcp/plugin-development/' },
            { text: 'SDK & Lifecycle Reference', link: '/tcp/plugin-development/sdk-lifecycle' },
            { text: 'In-Memory Testing & QA', link: '/tcp/plugin-development/testing' },
            { text: 'Packaging & Publishing', link: '/tcp/plugin-development/publishing' }
          ]
        },
        {
          text: 'Official Plugins',
          collapsed: false,
          items: [
            { text: 'DNS Guard (UDP & TCP)', link: '/tcp/plugins/dns' },
            { text: 'BitTorrent Guard (TCP & UDP)', link: '/tcp/plugins/bittorrent' },
            { text: 'SSH Guard', link: '/tcp/plugins/ssh' },
            { text: 'PostgreSQL Guard', link: '/tcp/plugins/postgres' },
            { text: 'MySQL & MariaDB Guard', link: '/tcp/plugins/mysql' },
            { text: 'Redis & Valkey Guard', link: '/tcp/plugins/redis' },
            { text: 'MongoDB Wire Guard', link: '/tcp/plugins/mongodb' },
            { text: 'HTTP & WebSocket Guard', link: '/tcp/plugins/http' },
            { text: 'TLS SNI Router & Filter', link: '/tcp/plugins/tls-sni' },
            { text: 'SMTP Mail Guard', link: '/tcp/plugins/smtp' },
            { text: 'POP3 Mail Guard', link: '/tcp/plugins/pop3' },
            { text: 'IMAP4 Mail Guard', link: '/tcp/plugins/imap' },
            { text: 'FTP Control Guard', link: '/tcp/plugins/ftp' },
            { text: 'LDAP & Active Directory', link: '/tcp/plugins/ldap' },
            { text: 'AMQP & RabbitMQ Guard', link: '/tcp/plugins/amqp' },
            { text: 'Memcached Cache Guard', link: '/tcp/plugins/memcached' },
            { text: 'MQTT IoT Broker Guard', link: '/tcp/plugins/mqtt' },
            { text: 'VNC Remote Desktop Guard', link: '/tcp/plugins/vnc' },
            { text: 'Minecraft Game Guard', link: '/tcp/plugins/minecraft' },
            { text: 'Generic Layer 4 Proxy', link: '/tcp/plugins/generic' },
            { text: 'Echo Stream Filter', link: '/tcp/plugins/echo-filter' }
          ]
        },
        {
          text: 'Gateways & Ecosystem',
          collapsed: false,
          items: [
            { text: 'Traefik Warden', link: '/traefik/' },
            { text: 'Caddy Warden', link: '/caddy/' },
            { text: 'NGINX Warden', link: '/nginx/' },
            { text: 'Core Architecture', link: '/core/architecture' }
          ]
        }
      ],
      '/traefik/': [
        {
          text: 'Traefik Warden',
          collapsed: false,
          items: [
            { text: 'Overview', link: '/traefik/' },
            { text: 'Getting Started', link: '/traefik/getting-started' },
            { text: 'Configuration Reference', link: '/traefik/configuration' },
            { text: 'Local Deployment', link: '/traefik/local-deployment' },
            { text: 'Testing & Verification', link: '/traefik/testing' },
            { text: 'Recipes & Blueprints', link: '/traefik/examples' },
            { text: 'Changelog & Releases', link: '/traefik/changelog' }
          ]
        },
        {
          text: 'References',
          collapsed: false,
          items: [
            { text: 'Custom Paths & Regex Guide', link: '/reference/custom-paths' },
            { text: 'Response Modes Reference', link: '/reference/response-modes' },
            { text: 'Anti-Evasion Engine', link: '/reference/anti-evasion' }
          ]
        },
        {
          text: 'Production Case Studies',
          collapsed: false,
          items: [
            { text: '1. Immich Dual-Router', link: '/examples/case-study-immich' },
            { text: '2. Zero-Trust Webhooks', link: '/examples/case-study-webhooks' },
            { text: '3. Observability Cloaking', link: '/examples/case-study-observability' },
            { text: '4. CMS & WordPress Shield', link: '/examples/case-study-cms-shield' },
            { text: '5. Password Vaults (Vaultwarden)', link: '/examples/case-study-vaultwarden' },
            { text: '6. Honeypots & Gzip Bombs', link: '/examples/case-study-honeypot-staging' },
            { text: '7. Media Streaming (Jellyfin/Plex)', link: '/examples/case-study-media' },
            { text: '8. Smart Home (Home Assistant)', link: '/examples/case-study-home-assistant' },
            { text: '9. CrowdSec Auto-Ban Shield', link: '/examples/crowdsec' }
          ]
        },
        {
          text: 'Core Engine',
          collapsed: false,
          items: [
            { text: 'System Architecture', link: '/core/architecture' },
            { text: 'Anti-Evasion Engine', link: '/core/anti-evasion' },
            { text: 'Response Modes (13 Actions)', link: '/core/response-modes' },
            { text: 'Custom Regex Patterns', link: '/core/custom-patterns' }
          ]
        }
      ],
      '/caddy/': [
        {
          text: 'Caddy Warden',
          collapsed: false,
          items: [
            { text: 'Overview', link: '/caddy/' },
            { text: 'Getting Started (xcaddy/Docker)', link: '/caddy/getting-started' },
            { text: 'Caddyfile Reference', link: '/caddy/caddyfile' },
            { text: 'JSON API Reference', link: '/caddy/json-api' },
            { text: 'Recipes & Blueprints', link: '/caddy/examples' },
            { text: 'Changelog & Releases', link: '/caddy/changelog' }
          ]
        },
        {
          text: 'References',
          collapsed: false,
          items: [
            { text: 'Custom Paths & Regex Guide', link: '/reference/custom-paths' },
            { text: 'Response Modes Reference', link: '/reference/response-modes' },
            { text: 'Anti-Evasion Engine', link: '/reference/anti-evasion' }
          ]
        },
        {
          text: 'Production Case Studies',
          collapsed: false,
          items: [
            { text: '1. Immich Dual-Router', link: '/examples/case-study-immich' },
            { text: '2. Zero-Trust Webhooks', link: '/examples/case-study-webhooks' },
            { text: '3. Observability Cloaking', link: '/examples/case-study-observability' },
            { text: '4. CMS & WordPress Shield', link: '/examples/case-study-cms-shield' },
            { text: '5. Password Vaults (Vaultwarden)', link: '/examples/case-study-vaultwarden' },
            { text: '6. Honeypots & Gzip Bombs', link: '/examples/case-study-honeypot-staging' },
            { text: '7. Media Streaming (Jellyfin/Plex)', link: '/examples/case-study-media' },
            { text: '8. Smart Home (Home Assistant)', link: '/examples/case-study-home-assistant' },
            { text: '9. CrowdSec Auto-Ban Shield', link: '/examples/crowdsec' }
          ]
        },
        {
          text: 'Core Engine',
          collapsed: false,
          items: [
            { text: 'System Architecture', link: '/core/architecture' },
            { text: 'Anti-Evasion Engine', link: '/core/anti-evasion' },
            { text: 'Response Modes (13 Actions)', link: '/core/response-modes' },
            { text: 'Custom Regex Patterns', link: '/core/custom-patterns' }
          ]
        }
      ],
      '/nginx/': [
        {
          text: 'NGINX Warden',
          collapsed: false,
          items: [
            { text: 'Overview', link: '/nginx/' },
            { text: 'Getting Started (Docker/Lua)', link: '/nginx/getting-started' },
            { text: 'Configuration Reference', link: '/nginx/configuration' },
            { text: 'Recipes & Blueprints', link: '/nginx/examples' },
            { text: 'Changelog & Releases', link: '/nginx/changelog' }
          ]
        },
        {
          text: 'References',
          collapsed: false,
          items: [
            { text: 'Custom Paths & Regex Guide', link: '/reference/custom-paths' },
            { text: 'Response Modes Reference', link: '/reference/response-modes' },
            { text: 'Anti-Evasion Engine', link: '/reference/anti-evasion' }
          ]
        },
        {
          text: 'Production Case Studies',
          collapsed: false,
          items: [
            { text: '1. Immich Dual-Router', link: '/examples/case-study-immich' },
            { text: '2. Zero-Trust Webhooks', link: '/examples/case-study-webhooks' },
            { text: '3. Observability Cloaking', link: '/examples/case-study-observability' },
            { text: '4. CMS & WordPress Shield', link: '/examples/case-study-cms-shield' },
            { text: '5. Password Vaults (Vaultwarden)', link: '/examples/case-study-vaultwarden' },
            { text: '6. Honeypots & Gzip Bombs', link: '/examples/case-study-honeypot-staging' },
            { text: '7. Media Streaming (Jellyfin/Plex)', link: '/examples/case-study-media' },
            { text: '8. Smart Home (Home Assistant)', link: '/examples/case-study-home-assistant' },
            { text: '9. CrowdSec Auto-Ban Shield', link: '/examples/crowdsec' }
          ]
        },
        {
          text: 'Core Engine',
          collapsed: false,
          items: [
            { text: 'System Architecture', link: '/core/architecture' },
            { text: 'Anti-Evasion Engine', link: '/core/anti-evasion' },
            { text: 'Response Modes (13 Actions)', link: '/core/response-modes' },
            { text: 'Custom Regex Patterns', link: '/core/custom-patterns' }
          ]
        }
      ],
      '/core/': [
        {
          text: 'Core Defense Engine',
          collapsed: false,
          items: [
            { text: 'System Architecture', link: '/core/architecture' },
            { text: 'Anti-Evasion Normalization', link: '/core/anti-evasion' },
            { text: 'Response Modes (13 Actions)', link: '/core/response-modes' },
            { text: 'Custom Regex Patterns', link: '/core/custom-patterns' },
            { text: 'RouteWarden CLI Tool', link: '/cli/' },
            { text: 'Changelog & Migrations', link: '/core/changelog' }
          ]
        },
        {
          text: 'References',
          collapsed: false,
          items: [
            { text: 'Custom Paths & Regex Guide', link: '/reference/custom-paths' },
            { text: 'Response Modes Reference', link: '/reference/response-modes' },
            { text: 'Anti-Evasion Engine', link: '/reference/anti-evasion' }
          ]
        },
        {
          text: 'Production Case Studies',
          collapsed: false,
          items: [
            { text: '1. Immich Dual-Router', link: '/examples/case-study-immich' },
            { text: '2. Zero-Trust Webhooks', link: '/examples/case-study-webhooks' },
            { text: '3. Observability Cloaking', link: '/examples/case-study-observability' },
            { text: '4. CMS & WordPress Shield', link: '/examples/case-study-cms-shield' },
            { text: '5. Password Vaults (Vaultwarden)', link: '/examples/case-study-vaultwarden' },
            { text: '6. Honeypots & Gzip Bombs', link: '/examples/case-study-honeypot-staging' },
            { text: '7. Media Streaming (Jellyfin/Plex)', link: '/examples/case-study-media' },
            { text: '8. Smart Home (Home Assistant)', link: '/examples/case-study-home-assistant' },
            { text: '9. CrowdSec Auto-Ban Shield', link: '/examples/crowdsec' }
          ]
        },
        {
          text: 'Gateways',
          collapsed: false,
          items: [
            { text: 'Traefik Plugin Docs ➔', link: '/traefik/' },
            { text: 'Caddy Module Docs ➔', link: '/caddy/' },
            { text: 'NGINX Module Docs ➔', link: '/nginx/' }
          ]
        }
      ],
      '/examples/': [
        {
          text: 'References',
          collapsed: false,
          items: [
            { text: 'Custom Paths & Regex Guide', link: '/reference/custom-paths' },
            { text: 'Response Modes Reference', link: '/reference/response-modes' },
            { text: 'Anti-Evasion Engine', link: '/reference/anti-evasion' }
          ]
        },
        {
          text: 'Production Case Studies',
          collapsed: false,
          items: [
            { text: 'Overview', link: '/examples/overview' },
            { text: '1. Immich Dual-Router Shield', link: '/examples/case-study-immich' },
            { text: '2. Zero-Trust Webhooks', link: '/examples/case-study-webhooks' },
            { text: '3. Observability Cloaking', link: '/examples/case-study-observability' },
            { text: '4. CMS & WordPress Shield', link: '/examples/case-study-cms-shield' },
            { text: '5. Password Vaults (Vaultwarden)', link: '/examples/case-study-vaultwarden' },
            { text: '6. Honeypots & Gzip Bombs', link: '/examples/case-study-honeypot-staging' },
            { text: '7. Media Streaming (Jellyfin/Plex)', link: '/examples/case-study-media' },
            { text: '8. Smart Home (Home Assistant)', link: '/examples/case-study-home-assistant' },
            { text: '9. CrowdSec Auto-Ban Shield', link: '/examples/crowdsec' }
          ]
        },
        {
          text: 'General Recipes',
          collapsed: false,
          items: [
            { text: '1. Basic Sensitive Files', link: '/examples/basic-sensitive-files' },
            { text: '2. Global EntryPoint Shield', link: '/examples/docker-compose-global' },
            { text: '3. Service-Level Compose', link: '/examples/docker-compose-service' },
            { text: '4. IP Whitelisting', link: '/examples/ip-whitelisting' },
            { text: '5. Captcha Challenge', link: '/examples/captcha' },
            { text: '6. Kubernetes IngressRoute', link: '/examples/kubernetes' }
          ]
        },
        {
          text: 'Gateways & Core',
          collapsed: false,
          items: [
            { text: 'Traefik Plugin ➔', link: '/traefik/' },
            { text: 'Caddy Module ➔', link: '/caddy/' },
            { text: 'NGINX Module ➔', link: '/nginx/' },
            { text: 'Core Architecture ➔', link: '/core/architecture' }
          ]
        }
      ],
      '/reference/': [
        {
          text: 'References',
          collapsed: false,
          items: [
            { text: 'Custom Paths & Regex Guide', link: '/reference/custom-paths' },
            { text: 'Response Modes Reference', link: '/reference/response-modes' },
            { text: 'Anti-Evasion Engine', link: '/reference/anti-evasion' }
          ]
        },
        {
          text: 'Production Case Studies',
          collapsed: false,
          items: [
            { text: 'Overview', link: '/examples/overview' },
            { text: '1. Immich Dual-Router Shield', link: '/examples/case-study-immich' },
            { text: '2. Zero-Trust Webhooks', link: '/examples/case-study-webhooks' },
            { text: '3. Observability Cloaking', link: '/examples/case-study-observability' },
            { text: '4. CMS & WordPress Shield', link: '/examples/case-study-cms-shield' },
            { text: '5. Password Vaults (Vaultwarden)', link: '/examples/case-study-vaultwarden' },
            { text: '6. Honeypots & Gzip Bombs', link: '/examples/case-study-honeypot-staging' },
            { text: '7. Media Streaming (Jellyfin/Plex)', link: '/examples/case-study-media' },
            { text: '8. Smart Home (Home Assistant)', link: '/examples/case-study-home-assistant' },
            { text: '9. CrowdSec Auto-Ban Shield', link: '/examples/crowdsec' }
          ]
        },
        {
          text: 'Gateways & Core',
          collapsed: false,
          items: [
            { text: 'Traefik Plugin ➔', link: '/traefik/' },
            { text: 'Caddy Module ➔', link: '/caddy/' },
            { text: 'NGINX Module ➔', link: '/nginx/' },
            { text: 'Core Architecture ➔', link: '/core/architecture' }
          ]
        }
      ],
      '/cli/': [
        {
          text: 'RouteWarden CLI (rwarden)',
          collapsed: false,
          items: [
            { text: 'Overview & Features', link: '/cli/' },
            { text: 'Installation', link: '/cli/installation' },
            { text: 'Commands Reference', link: '/cli/commands' },
            { text: 'JSON Schema & CI/CD', link: '/cli/schema' },
            { text: 'Changelog & Releases', link: '/cli/changelog' }
          ]
        },
        {
          text: 'Security Dashboard',
          collapsed: false,
          items: [
            { text: 'Overview & Architecture', link: '/cli/dashboard' },
            { text: 'Container Discovery & Logging', link: '/cli/dashboard/discovery-and-logging' },
            { text: 'Pre-Configured Dashboard', link: '/cli/dashboard/prebuilt-dashboard' },
            { text: 'Standalone Deployment', link: '/cli/dashboard/deployment' },
            { text: 'Reusing Existing Stack', link: '/cli/dashboard/existing-stack' },
            { text: 'LogQL & Alerting Reference', link: '/cli/dashboard/logql-reference' }
          ]
        },
        {
          text: 'Tools & Playground',
          collapsed: false,
          items: [
            { text: 'Pattern & Response Playground', link: '/tools/pattern-checker' }
          ]
        },
        {
          text: 'Gateways & Ecosystem',
          collapsed: false,
          items: [
            { text: 'TCP Warden (L4) ➔', link: '/tcp/' },
            { text: 'Traefik Warden ➔', link: '/traefik/' },
            { text: 'Caddy Warden ➔', link: '/caddy/' },
            { text: 'NGINX Warden ➔', link: '/nginx/' },
            { text: 'Core Architecture ➔', link: '/core/architecture' }
          ]
        }
      ],
      '/tools/': [
        {
          text: 'Interactive Tools & Utilities',
          collapsed: false,
          items: [
            { text: 'RouteWarden CLI (`rwarden`)', link: '/cli/' },
            { text: 'Pattern & Response Playground', link: '/tools/pattern-checker' }
          ]
        },
        {
          text: 'Gateways & Core',
          collapsed: false,
          items: [
            { text: 'Traefik Plugin Docs ➔', link: '/traefik/' },
            { text: 'Caddy Module Docs ➔', link: '/caddy/' },
            { text: 'NGINX Module Docs ➔', link: '/nginx/' },
            { text: 'Core Architecture ➔', link: '/core/architecture' }
          ]
        }
      ],
      '/': [
        {
          text: 'Gateways',
          collapsed: false,
          items: [
            { text: 'RouteWarden for Traefik', link: '/traefik/' },
            { text: 'Caddy-Warden for Caddy', link: '/caddy/' },
            { text: 'RouteWarden for NGINX', link: '/nginx/' }
          ]
        },
        {
          text: 'References',
          collapsed: false,
          items: [
            { text: 'Custom Paths & Regex Guide', link: '/reference/custom-paths' },
            { text: 'Response Modes Reference', link: '/reference/response-modes' },
            { text: 'Anti-Evasion Engine', link: '/reference/anti-evasion' }
          ]
        },
        {
          text: 'Core Defense Engine',
          collapsed: false,
          items: [
            { text: 'System Architecture', link: '/core/architecture' },
            { text: 'Anti-Evasion Engine', link: '/core/anti-evasion' },
            { text: 'Response Modes Engine', link: '/core/response-modes' },
            { text: 'Custom Path Patterns', link: '/core/custom-patterns' },
            { text: 'Changelog & Migrations', link: '/core/changelog' }
          ]
        },
        {
          text: 'Production Case Studies',
          collapsed: false,
          items: [
            { text: '1. Immich Dual-Router', link: '/examples/case-study-immich' },
            { text: '2. Zero-Trust Webhooks', link: '/examples/case-study-webhooks' },
            { text: '3. Observability Cloaking', link: '/examples/case-study-observability' },
            { text: '4. CMS & WordPress Shield', link: '/examples/case-study-cms-shield' },
            { text: '5. Password Vaults (Vaultwarden)', link: '/examples/case-study-vaultwarden' },
            { text: '6. Honeypots & Gzip Bombs', link: '/examples/case-study-honeypot-staging' },
            { text: '7. Media Streaming (Jellyfin/Plex)', link: '/examples/case-study-media' },
            { text: '8. Smart Home (Home Assistant)', link: '/examples/case-study-home-assistant' },
            { text: '9. CrowdSec Auto-Ban Shield', link: '/examples/crowdsec' }
          ]
        }
      ]
    },
    search: {
      provider: 'local'
    },
    notFound: {
      title: 'PAGE NOT FOUND',
      quote: 'RouteWarden caught an unmatched path or the resource has been moved.',
      linkLabel: 'Return to Documentation',
      linkText: 'Go to Home'
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/routewarden' }
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 RouteWarden Contributors'
    }
  }
})
