---
title: Response Modes Reference
---
<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

// ─── 1. Plain Text (text) ───────────────────────────────────────────────────
const m1_traefik = buildSnippet({
  lang: 'yaml',
  code: `response:\n  mode: text\n  statusCode: 403\n  body: "Access Denied: You do not have permission to view this resource."`,
})
const m1_traefik_toml = buildSnippet({
  lang: 'toml',
  code: `[http.middlewares.my-warden.plugin.routewarden.response]\n  mode = "text"\n  statusCode = 403\n  body = "Access Denied: You do not have permission to view this resource."`,
})
const m1_traefik_labels = buildSnippet({
  lang: 'docker',
  code: `- "traefik.http.middlewares.my-warden.plugin.routewarden.response.mode=text"\n- "traefik.http.middlewares.my-warden.plugin.routewarden.response.statusCode=403"\n- "traefik.http.middlewares.my-warden.plugin.routewarden.response.body=Access Denied: You do not have permission to view this resource."`,
})
const m1_caddy = buildSnippet({
  lang: 'caddy',
  code: `response {\n    mode text\n    status_code 403\n    body "Access Denied: You do not have permission to view this resource."\n}`,
})
const m1_nginx = buildSnippet({
  lang: 'lua',
  code: `response = {\n    mode = "text",\n    status_code = 403,\n    body = "Access Denied: You do not have permission to view this resource."\n}`,
})
const m1_cli = buildSnippet({
  lang: 'json',
  code: `{\n  "response": {\n    "mode": "text",\n    "statusCode": 403,\n    "body": "Access Denied: You do not have permission to view this resource."\n  }\n}`,
})
const mode1Snippets = computed(() => ({
  traefik: [
    { filename: 'traefik.yml', lang: 'yaml', code: m1_traefik.cleanCode, html: m1_traefik.html, hasDiff: false },
    { filename: 'traefik.toml', lang: 'toml', code: m1_traefik_toml.cleanCode, html: m1_traefik_toml.html, hasDiff: false },
    { filename: 'docker-compose.yaml', lang: 'docker', code: m1_traefik_labels.cleanCode, html: m1_traefik_labels.html, hasDiff: false },
  ],
  caddy: [{ filename: 'Caddyfile', lang: 'caddy', code: m1_caddy.cleanCode, html: m1_caddy.html, hasDiff: false }],
  nginx: [{ filename: 'nginx.conf', lang: 'lua', code: m1_nginx.cleanCode, html: m1_nginx.html, hasDiff: false }],
  cli: [{ filename: 'routewarden.json', lang: 'json', code: m1_cli.cleanCode, html: m1_cli.html, hasDiff: false }],
}))

// ─── 2. JSON Payload (json) ─────────────────────────────────────────────────
const m2_traefik = buildSnippet({
  lang: 'yaml',
  code: `response:\n  mode: json\n  statusCode: 404\n  body: '{"status":"error","code":404,"message":"The requested endpoint does not exist"}'`,
})
const m2_traefik_toml = buildSnippet({
  lang: 'toml',
  code: `[http.middlewares.my-warden.plugin.routewarden.response]\n  mode = "json"\n  statusCode = 404\n  body = '{"status":"error","code":404,"message":"The requested endpoint does not exist"}'`,
})
const m2_traefik_labels = buildSnippet({
  lang: 'docker',
  code: `- "traefik.http.middlewares.my-warden.plugin.routewarden.response.mode=json"\n- "traefik.http.middlewares.my-warden.plugin.routewarden.response.statusCode=404"\n- 'traefik.http.middlewares.my-warden.plugin.routewarden.response.body={"status":"error","code":404,"message":"The requested endpoint does not exist"}'`,
})
const m2_caddy = buildSnippet({
  lang: 'caddy',
  code: `response {\n    mode json\n    status_code 404\n    body "{\\"status\\":\\"error\\",\\"code\\":404,\\"message\\":\\"The requested endpoint does not exist\\"}"\n}`,
})
const m2_nginx = buildSnippet({
  lang: 'lua',
  code: `response = {\n    mode = "json",\n    status_code = 404,\n    body = '{"status":"error","code":404,"message":"The requested endpoint does not exist"}'\n}`,
})
const m2_cli = buildSnippet({
  lang: 'json',
  code: `{\n  "response": {\n    "mode": "json",\n    "statusCode": 404,\n    "body": "{\\"status\\":\\"error\\",\\"code\\":404,\\"message\\":\\"The requested endpoint does not exist\\"}"\n  }\n}`,
})
const mode2Snippets = computed(() => ({
  traefik: [
    { filename: 'traefik.yml', lang: 'yaml', code: m2_traefik.cleanCode, html: m2_traefik.html, hasDiff: false },
    { filename: 'traefik.toml', lang: 'toml', code: m2_traefik_toml.cleanCode, html: m2_traefik_toml.html, hasDiff: false },
    { filename: 'docker-compose.yaml', lang: 'docker', code: m2_traefik_labels.cleanCode, html: m2_traefik_labels.html, hasDiff: false },
  ],
  caddy: [{ filename: 'Caddyfile', lang: 'caddy', code: m2_caddy.cleanCode, html: m2_caddy.html, hasDiff: false }],
  nginx: [{ filename: 'nginx.conf', lang: 'lua', code: m2_nginx.cleanCode, html: m2_nginx.html, hasDiff: false }],
  cli: [{ filename: 'routewarden.json', lang: 'json', code: m2_cli.cleanCode, html: m2_cli.html, hasDiff: false }],
}))

// ─── 3. Custom HTML (html) ──────────────────────────────────────────────────
const m3_traefik = buildSnippet({
  lang: 'yaml',
  code: `response:\n  mode: html\n  statusCode: 403\n  body: |\n    <!DOCTYPE html>\n    <html>\n      <head><title>Access Restricted</title></head>\n      <body style="font-family: sans-serif; text-align: center; padding: 4rem;">\n        <h1>403 Restricted Zone</h1>\n        <p>This endpoint is monitored and protected by RouteWarden.</p>\n      </body>\n    </html>`,
})
const m3_traefik_toml = buildSnippet({
  lang: 'toml',
  code: `[http.middlewares.my-warden.plugin.routewarden.response]\n  mode = "html"\n  statusCode = 403\n  body = "<html><body><h1>403 Restricted Zone</h1><p>Protected by RouteWarden.</p></body></html>"`,
})
const m3_traefik_labels = buildSnippet({
  lang: 'docker',
  code: `- "traefik.http.middlewares.my-warden.plugin.routewarden.response.mode=html"\n- "traefik.http.middlewares.my-warden.plugin.routewarden.response.statusCode=403"\n- "traefik.http.middlewares.my-warden.plugin.routewarden.response.body=<html><body><h1>403 Restricted Zone</h1><p>Protected by RouteWarden.</p></body></html>"`,
})
const m3_caddy = buildSnippet({
  lang: 'caddy',
  code: `response {\n    mode html\n    status_code 403\n    body "<html><body><h1>403 Restricted Zone</h1><p>Protected by RouteWarden.</p></body></html>"\n}`,
})
const m3_nginx = buildSnippet({
  lang: 'lua',
  code: `response = {\n    mode = "html",\n    status_code = 403,\n    body = "<html><body><h1>403 Restricted Zone</h1><p>Protected by RouteWarden.</p></body></html>"\n}`,
})
const m3_cli = buildSnippet({
  lang: 'json',
  code: `{\n  "response": {\n    "mode": "html",\n    "statusCode": 403,\n    "body": "<html><body><h1>403 Restricted Zone</h1><p>Protected by RouteWarden.</p></body></html>"\n  }\n}`,
})
const mode3Snippets = computed(() => ({
  traefik: [
    { filename: 'traefik.yml', lang: 'yaml', code: m3_traefik.cleanCode, html: m3_traefik.html, hasDiff: false },
    { filename: 'traefik.toml', lang: 'toml', code: m3_traefik_toml.cleanCode, html: m3_traefik_toml.html, hasDiff: false },
    { filename: 'docker-compose.yaml', lang: 'docker', code: m3_traefik_labels.cleanCode, html: m3_traefik_labels.html, hasDiff: false },
  ],
  caddy: [{ filename: 'Caddyfile', lang: 'caddy', code: m3_caddy.cleanCode, html: m3_caddy.html, hasDiff: false }],
  nginx: [{ filename: 'nginx.conf', lang: 'lua', code: m3_nginx.cleanCode, html: m3_nginx.html, hasDiff: false }],
  cli: [{ filename: 'routewarden.json', lang: 'json', code: m3_cli.cleanCode, html: m3_cli.html, hasDiff: false }],
}))

// ─── 4. XML Error (xml) ─────────────────────────────────────────────────────
const m4_traefik = buildSnippet({
  lang: 'yaml',
  code: `response:\n  mode: xml\n  statusCode: 403\n  body: |\n    <?xml version="1.0" encoding="UTF-8"?>\n    <soap:Fault xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">\n      <faultcode>soap:Client</faultcode>\n      <faultstring>Access to protected endpoint is denied</faultstring>\n    </soap:Fault>`,
})
const m4_traefik_toml = buildSnippet({
  lang: 'toml',
  code: `[http.middlewares.my-warden.plugin.routewarden.response]\n  mode = "xml"\n  statusCode = 403\n  body = '<?xml version="1.0"?><error><code>403</code><message>Access denied</message></error>'`,
})
const m4_traefik_labels = buildSnippet({
  lang: 'docker',
  code: `- "traefik.http.middlewares.my-warden.plugin.routewarden.response.mode=xml"\n- "traefik.http.middlewares.my-warden.plugin.routewarden.response.statusCode=403"`,
})
const m4_caddy = buildSnippet({
  lang: 'caddy',
  code: `response {\n    mode xml\n    status_code 403\n    body "<?xml version=\\"1.0\\"?><error><code>403</code><message>Access denied</message></error>"\n}`,
})
const m4_nginx = buildSnippet({
  lang: 'lua',
  code: `response = {\n    mode = "xml",\n    status_code = 403,\n    body = '<?xml version="1.0"?><error><code>403</code><message>Access denied</message></error>'\n}`,
})
const m4_cli = buildSnippet({
  lang: 'json',
  code: `{\n  "response": {\n    "mode": "xml",\n    "statusCode": 403,\n    "body": "<?xml version=\\"1.0\\"?><error><code>403</code><message>Access denied</message></error>"\n  }\n}`,
})
const mode4Snippets = computed(() => ({
  traefik: [
    { filename: 'traefik.yml', lang: 'yaml', code: m4_traefik.cleanCode, html: m4_traefik.html, hasDiff: false },
    { filename: 'traefik.toml', lang: 'toml', code: m4_traefik_toml.cleanCode, html: m4_traefik_toml.html, hasDiff: false },
    { filename: 'docker-compose.yaml', lang: 'docker', code: m4_traefik_labels.cleanCode, html: m4_traefik_labels.html, hasDiff: false },
  ],
  caddy: [{ filename: 'Caddyfile', lang: 'caddy', code: m4_caddy.cleanCode, html: m4_caddy.html, hasDiff: false }],
  nginx: [{ filename: 'nginx.conf', lang: 'lua', code: m4_nginx.cleanCode, html: m4_nginx.html, hasDiff: false }],
  cli: [{ filename: 'routewarden.json', lang: 'json', code: m4_cli.cleanCode, html: m4_cli.html, hasDiff: false }],
}))

// ─── 5. URL Redirect (redirect) ─────────────────────────────────────────────
const m5_traefik = buildSnippet({
  lang: 'yaml',
  code: `response:\n  mode: redirect\n  statusCode: 307\n  redirectUrl: "https://honeypot.corp.example.com/capture"\n  headers:\n    X-RouteWarden-Action: "deflected"`,
})
const m5_traefik_toml = buildSnippet({
  lang: 'toml',
  code: `[http.middlewares.my-warden.plugin.routewarden.response]\n  mode = "redirect"\n  statusCode = 307\n  redirectUrl = "https://honeypot.corp.example.com/capture"`,
})
const m5_traefik_labels = buildSnippet({
  lang: 'docker',
  code: `- "traefik.http.middlewares.my-warden.plugin.routewarden.response.mode=redirect"\n- "traefik.http.middlewares.my-warden.plugin.routewarden.response.statusCode=307"\n- "traefik.http.middlewares.my-warden.plugin.routewarden.response.redirectUrl=https://honeypot.corp.example.com/capture"`,
})
const m5_caddy = buildSnippet({
  lang: 'caddy',
  code: `response {\n    mode redirect\n    status_code 307\n    redirect_url "https://honeypot.corp.example.com/capture"\n}`,
})
const m5_nginx = buildSnippet({
  lang: 'lua',
  code: `response = {\n    mode = "redirect",\n    status_code = 307,\n    redirect_url = "https://honeypot.corp.example.com/capture"\n}`,
})
const m5_cli = buildSnippet({
  lang: 'json',
  code: `{\n  "response": {\n    "mode": "redirect",\n    "statusCode": 307,\n    "redirectUrl": "https://honeypot.corp.example.com/capture"\n  }\n}`,
})
const mode5Snippets = computed(() => ({
  traefik: [
    { filename: 'traefik.yml', lang: 'yaml', code: m5_traefik.cleanCode, html: m5_traefik.html, hasDiff: false },
    { filename: 'traefik.toml', lang: 'toml', code: m5_traefik_toml.cleanCode, html: m5_traefik_toml.html, hasDiff: false },
    { filename: 'docker-compose.yaml', lang: 'docker', code: m5_traefik_labels.cleanCode, html: m5_traefik_labels.html, hasDiff: false },
  ],
  caddy: [{ filename: 'Caddyfile', lang: 'caddy', code: m5_caddy.cleanCode, html: m5_caddy.html, hasDiff: false }],
  nginx: [{ filename: 'nginx.conf', lang: 'lua', code: m5_nginx.cleanCode, html: m5_nginx.html, hasDiff: false }],
  cli: [{ filename: 'routewarden.json', lang: 'json', code: m5_cli.cleanCode, html: m5_cli.html, hasDiff: false }],
}))

// ─── 6. Interactive Challenge (captcha) ─────────────────────────────────────
const m6_traefik = buildSnippet({
  lang: 'yaml',
  code: `response:\n  mode: captcha\n  statusCode: 403\n  captcha:\n    provider: turnstile # or "hcaptcha", "recaptcha"\n    siteKey: "0x4AAAAAAtestkey123"\n    title: "RouteWarden Security Verification"`,
})
const m6_traefik_toml = buildSnippet({
  lang: 'toml',
  code: `[http.middlewares.my-warden.plugin.routewarden.response]\n  mode = "captcha"\n  statusCode = 403\n\n[http.middlewares.my-warden.plugin.routewarden.response.captcha]\n  provider = "turnstile"\n  siteKey = "0x4AAAAAAtestkey123"\n  title = "RouteWarden Security Verification"`,
})
const m6_traefik_labels = buildSnippet({
  lang: 'docker',
  code: `- "traefik.http.middlewares.my-warden.plugin.routewarden.response.mode=captcha"\n- "traefik.http.middlewares.my-warden.plugin.routewarden.response.statusCode=403"\n- "traefik.http.middlewares.my-warden.plugin.routewarden.response.captcha.provider=turnstile"\n- "traefik.http.middlewares.my-warden.plugin.routewarden.response.captcha.siteKey=0x4AAAAAAtestkey123"\n- "traefik.http.middlewares.my-warden.plugin.routewarden.response.captcha.title=RouteWarden Security Verification"`,
})
const m6_caddy = buildSnippet({
  lang: 'caddy',
  code: `response {\n    mode captcha\n    captcha {\n        provider turnstile\n        site_key "0x4AAAAAAtestkey123"\n        title "RouteWarden Security Verification"\n    }\n}`,
})
const m6_nginx = buildSnippet({
  lang: 'lua',
  code: `response = {\n    mode = "captcha",\n    status_code = 403,\n    captcha = {\n        provider = "turnstile",\n        site_key = "0x4AAAAAAtestkey123",\n        title = "RouteWarden Security Verification"\n    }\n}`,
})
const m6_cli = buildSnippet({
  lang: 'json',
  code: `{\n  "response": {\n    "mode": "captcha",\n    "statusCode": 403,\n    "captcha": {\n      "provider": "turnstile",\n      "siteKey": "0x4AAAAAAtestkey123",\n      "title": "RouteWarden Security Verification"\n    }\n  }\n}`,
})
const mode6Snippets = computed(() => ({
  traefik: [
    { filename: 'traefik.yml', lang: 'yaml', code: m6_traefik.cleanCode, html: m6_traefik.html, hasDiff: false },
    { filename: 'traefik.toml', lang: 'toml', code: m6_traefik_toml.cleanCode, html: m6_traefik_toml.html, hasDiff: false },
    { filename: 'docker-compose.yaml', lang: 'docker', code: m6_traefik_labels.cleanCode, html: m6_traefik_labels.html, hasDiff: false },
  ],
  caddy: [{ filename: 'Caddyfile', lang: 'caddy', code: m6_caddy.cleanCode, html: m6_caddy.html, hasDiff: false }],
  nginx: [{ filename: 'nginx.conf', lang: 'lua', code: m6_nginx.cleanCode, html: m6_nginx.html, hasDiff: false }],
  cli: [{ filename: 'routewarden.json', lang: 'json', code: m6_cli.cleanCode, html: m6_cli.html, hasDiff: false }],
}))

// ─── 7. Silent TCP Drop (silentDrop) ─────────────────────────────────────────
const m7_traefik = buildSnippet({
  lang: 'yaml',
  code: `response:\n  mode: silentDrop`,
})
const m7_traefik_toml = buildSnippet({
  lang: 'toml',
  code: `[http.middlewares.my-warden.plugin.routewarden.response]\n  mode = "silentDrop"`,
})
const m7_traefik_labels = buildSnippet({
  lang: 'docker',
  code: `- "traefik.http.middlewares.my-warden.plugin.routewarden.response.mode=silentDrop"`,
})
const m7_caddy = buildSnippet({
  lang: 'caddy',
  code: `response {\n    mode silent_drop\n}`,
})
const m7_nginx = buildSnippet({
  lang: 'lua',
  code: `response = {\n    mode = "silent_drop"\n}`,
})
const m7_cli = buildSnippet({
  lang: 'json',
  code: `{\n  "response": {\n    "mode": "silentDrop"\n  }\n}`,
})
const mode7Snippets = computed(() => ({
  traefik: [
    { filename: 'traefik.yml', lang: 'yaml', code: m7_traefik.cleanCode, html: m7_traefik.html, hasDiff: false },
    { filename: 'traefik.toml', lang: 'toml', code: m7_traefik_toml.cleanCode, html: m7_traefik_toml.html, hasDiff: false },
    { filename: 'docker-compose.yaml', lang: 'docker', code: m7_traefik_labels.cleanCode, html: m7_traefik_labels.html, hasDiff: false },
  ],
  caddy: [{ filename: 'Caddyfile', lang: 'caddy', code: m7_caddy.cleanCode, html: m7_caddy.html, hasDiff: false }],
  nginx: [{ filename: 'nginx.conf', lang: 'lua', code: m7_nginx.cleanCode, html: m7_nginx.html, hasDiff: false }],
  cli: [{ filename: 'routewarden.json', lang: 'json', code: m7_cli.cleanCode, html: m7_cli.html, hasDiff: false }],
}))

// ─── 8. Gzip Decompression Bomb (gzipBomb / bomb) ───────────────────────────
const m8_traefik = buildSnippet({
  lang: 'yaml',
  code: `response:\n  mode: gzipBomb # Alias: "bomb"\n  statusCode: 200 # Enticing 200 OK to crawlers\n  gzipBombMB: 10 # 10MB stream expands to ~10GB in memory`,
})
const m8_traefik_toml = buildSnippet({
  lang: 'toml',
  code: `[http.middlewares.my-warden.plugin.routewarden.response]\n  mode = "gzipBomb"\n  statusCode = 200\n  gzipBombMB = 10`,
})
const m8_traefik_labels = buildSnippet({
  lang: 'docker',
  code: `- "traefik.http.middlewares.my-warden.plugin.routewarden.response.mode=gzipBomb"\n- "traefik.http.middlewares.my-warden.plugin.routewarden.response.statusCode=200"\n- "traefik.http.middlewares.my-warden.plugin.routewarden.response.gzipBombMB=10"`,
})
const m8_caddy = buildSnippet({
  lang: 'caddy',
  code: `response {\n    mode gzip_bomb\n    status_code 200\n    gzip_bomb_mb 10\n}`,
})
const m8_nginx = buildSnippet({
  lang: 'lua',
  code: `response = {\n    mode = "gzip_bomb",\n    status_code = 200,\n    gzip_bomb_mb = 10\n}`,
})
const m8_cli = buildSnippet({
  lang: 'json',
  code: `{\n  "response": {\n    "mode": "gzipBomb",\n    "statusCode": 200,\n    "gzipBombMB": 10\n  }\n}`,
})
const mode8Snippets = computed(() => ({
  traefik: [
    { filename: 'traefik.yml', lang: 'yaml', code: m8_traefik.cleanCode, html: m8_traefik.html, hasDiff: false },
    { filename: 'traefik.toml', lang: 'toml', code: m8_traefik_toml.cleanCode, html: m8_traefik_toml.html, hasDiff: false },
    { filename: 'docker-compose.yaml', lang: 'docker', code: m8_traefik_labels.cleanCode, html: m8_traefik_labels.html, hasDiff: false },
  ],
  caddy: [{ filename: 'Caddyfile', lang: 'caddy', code: m8_caddy.cleanCode, html: m8_caddy.html, hasDiff: false }],
  nginx: [{ filename: 'nginx.conf', lang: 'lua', code: m8_nginx.cleanCode, html: m8_nginx.html, hasDiff: false }],
  cli: [{ filename: 'routewarden.json', lang: 'json', code: m8_cli.cleanCode, html: m8_cli.html, hasDiff: false }],
}))

// ─── 9. Reverse Slowloris Tarpit (tarpit) ───────────────────────────────────
const m9_traefik = buildSnippet({
  lang: 'yaml',
  code: `response:\n  mode: tarpit\n  statusCode: 200\n  tarpitDelayMs: 1000 # Send 1 byte every 1000ms (1 second)\n  tarpitMaxDurationSeconds: 120 # Force connection close after 2 minutes`,
})
const m9_traefik_toml = buildSnippet({
  lang: 'toml',
  code: `[http.middlewares.my-warden.plugin.routewarden.response]\n  mode = "tarpit"\n  statusCode = 200\n  tarpitDelayMs = 1000\n  tarpitMaxDurationSeconds = 120`,
})
const m9_traefik_labels = buildSnippet({
  lang: 'docker',
  code: `- "traefik.http.middlewares.my-warden.plugin.routewarden.response.mode=tarpit"\n- "traefik.http.middlewares.my-warden.plugin.routewarden.response.statusCode=200"\n- "traefik.http.middlewares.my-warden.plugin.routewarden.response.tarpitDelayMs=1000"\n- "traefik.http.middlewares.my-warden.plugin.routewarden.response.tarpitMaxDurationSeconds=120"`,
})
const m9_caddy = buildSnippet({
  lang: 'caddy',
  code: `response {\n    mode tarpit\n    status_code 200\n    tarpit_delay_ms 1000\n}`,
})
const m9_nginx = buildSnippet({
  lang: 'lua',
  code: `response = {\n    mode = "tarpit",\n    status_code = 200,\n    tarpit_delay_ms = 1000,\n    tarpit_max_duration_seconds = 120\n}`,
})
const m9_cli = buildSnippet({
  lang: 'json',
  code: `{\n  "response": {\n    "mode": "tarpit",\n    "statusCode": 200,\n    "tarpitDelayMs": 1000\n  }\n}`,
})
const mode9Snippets = computed(() => ({
  traefik: [
    { filename: 'traefik.yml', lang: 'yaml', code: m9_traefik.cleanCode, html: m9_traefik.html, hasDiff: false },
    { filename: 'traefik.toml', lang: 'toml', code: m9_traefik_toml.cleanCode, html: m9_traefik_toml.html, hasDiff: false },
    { filename: 'docker-compose.yaml', lang: 'docker', code: m9_traefik_labels.cleanCode, html: m9_traefik_labels.html, hasDiff: false },
  ],
  caddy: [{ filename: 'Caddyfile', lang: 'caddy', code: m9_caddy.cleanCode, html: m9_caddy.html, hasDiff: false }],
  nginx: [{ filename: 'nginx.conf', lang: 'lua', code: m9_nginx.cleanCode, html: m9_nginx.html, hasDiff: false }],
  cli: [{ filename: 'routewarden.json', lang: 'json', code: m9_cli.cleanCode, html: m9_cli.html, hasDiff: false }],
}))

// ─── 10. Synthetic Honeypot Decoy (fakeSuccess / decoy) ─────────────────────
const m10_traefik = buildSnippet({
  lang: 'yaml',
  code: `response:\n  mode: fakeSuccess # Alias: "decoy"\n  statusCode: 200`,
})
const m10_traefik_toml = buildSnippet({
  lang: 'toml',
  code: `[http.middlewares.my-warden.plugin.routewarden.response]\n  mode = "fakeSuccess"\n  statusCode = 200`,
})
const m10_traefik_labels = buildSnippet({
  lang: 'docker',
  code: `- "traefik.http.middlewares.my-warden.plugin.routewarden.response.mode=fakeSuccess"\n- "traefik.http.middlewares.my-warden.plugin.routewarden.response.statusCode=200"`,
})
const m10_caddy = buildSnippet({
  lang: 'caddy',
  code: `response {\n    mode fake_success\n    status_code 200\n}`,
})
const m10_nginx = buildSnippet({
  lang: 'lua',
  code: `response = {\n    mode = "fake_success",\n    status_code = 200\n}`,
})
const m10_cli = buildSnippet({
  lang: 'json',
  code: `{\n  "response": {\n    "mode": "fakeSuccess",\n    "statusCode": 200\n  }\n}`,
})
const mode10Snippets = computed(() => ({
  traefik: [
    { filename: 'traefik.yml', lang: 'yaml', code: m10_traefik.cleanCode, html: m10_traefik.html, hasDiff: false },
    { filename: 'traefik.toml', lang: 'toml', code: m10_traefik_toml.cleanCode, html: m10_traefik_toml.html, hasDiff: false },
    { filename: 'docker-compose.yaml', lang: 'docker', code: m10_traefik_labels.cleanCode, html: m10_traefik_labels.html, hasDiff: false },
  ],
  caddy: [{ filename: 'Caddyfile', lang: 'caddy', code: m10_caddy.cleanCode, html: m10_caddy.html, hasDiff: false }],
  nginx: [{ filename: 'nginx.conf', lang: 'lua', code: m10_nginx.cleanCode, html: m10_nginx.html, hasDiff: false }],
  cli: [{ filename: 'routewarden.json', lang: 'json', code: m10_cli.cleanCode, html: m10_cli.html, hasDiff: false }],
}))

// ─── 11. Rate Limit Challenge (rateLimitChallenge / ratelimit) ──────────────
const m11_traefik = buildSnippet({
  lang: 'yaml',
  code: `response:\n  mode: rateLimitChallenge # Aliases: "ratelimit", "backoff"\n  statusCode: 429\n  retryAfterSeconds: 300 # Instructs client to wait 5 minutes\n  body: '{"error":"Too Many Requests","retryAfter":300,"message":"Throttled by RouteWarden"}'`,
})
const m11_traefik_toml = buildSnippet({
  lang: 'toml',
  code: `[http.middlewares.my-warden.plugin.routewarden.response]\n  mode = "rateLimitChallenge"\n  statusCode = 429\n  retryAfterSeconds = 300`,
})
const m11_traefik_labels = buildSnippet({
  lang: 'docker',
  code: `- "traefik.http.middlewares.my-warden.plugin.routewarden.response.mode=rateLimitChallenge"\n- "traefik.http.middlewares.my-warden.plugin.routewarden.response.statusCode=429"\n- "traefik.http.middlewares.my-warden.plugin.routewarden.response.retryAfterSeconds=300"`,
})
const m11_caddy = buildSnippet({
  lang: 'caddy',
  code: `response {\n    mode ratelimit\n    status_code 429\n    retry_after_seconds 300\n    body "{\\"error\\":\\"Too Many Requests\\",\\"retryAfter\\":300}"\n}`,
})
const m11_nginx = buildSnippet({
  lang: 'lua',
  code: `response = {\n    mode = "ratelimit",\n    status_code = 429,\n    retry_after_seconds = 300,\n    body = '{"error":"Too Many Requests","retryAfter":300}'\n}`,
})
const m11_cli = buildSnippet({
  lang: 'json',
  code: `{\n  "response": {\n    "mode": "rateLimitChallenge",\n    "statusCode": 429,\n    "retryAfterSeconds": 300,\n    "body": "{\\"error\\":\\"Too Many Requests\\",\\"retryAfter\\":300}"\n  }\n}`,
})
const mode11Snippets = computed(() => ({
  traefik: [
    { filename: 'traefik.yml', lang: 'yaml', code: m11_traefik.cleanCode, html: m11_traefik.html, hasDiff: false },
    { filename: 'traefik.toml', lang: 'toml', code: m11_traefik_toml.cleanCode, html: m11_traefik_toml.html, hasDiff: false },
    { filename: 'docker-compose.yaml', lang: 'docker', code: m11_traefik_labels.cleanCode, html: m11_traefik_labels.html, hasDiff: false },
  ],
  caddy: [{ filename: 'Caddyfile', lang: 'caddy', code: m11_caddy.cleanCode, html: m11_caddy.html, hasDiff: false }],
  nginx: [{ filename: 'nginx.conf', lang: 'lua', code: m11_nginx.cleanCode, html: m11_nginx.html, hasDiff: false }],
  cli: [{ filename: 'routewarden.json', lang: 'json', code: m11_cli.cleanCode, html: m11_cli.html, hasDiff: false }],
}))

// ─── 12. Transparent Honeypot Proxy (proxy / mirror) ────────────────────────
const m12_traefik = buildSnippet({
  lang: 'yaml',
  code: `response:\n  mode: proxy # Alias: "mirror"\n  proxyUrl: "http://canary-honeypot:8080"`,
})
const m12_traefik_toml = buildSnippet({
  lang: 'toml',
  code: `[http.middlewares.my-warden.plugin.routewarden.response]\n  mode = "proxy"\n  proxyUrl = "http://canary-honeypot:8080"`,
})
const m12_traefik_labels = buildSnippet({
  lang: 'docker',
  code: `- "traefik.http.middlewares.my-warden.plugin.routewarden.response.mode=proxy"\n- "traefik.http.middlewares.my-warden.plugin.routewarden.response.proxyUrl=http://canary-honeypot:8080"`,
})
const m12_caddy = buildSnippet({
  lang: 'caddy',
  code: `response {\n    mode proxy\n    proxy_url "http://canary-honeypot:8080"\n}`,
})
const m12_nginx = buildSnippet({
  lang: 'lua',
  code: `response = {\n    mode = "proxy",\n    proxy_url = "http://canary-honeypot:8080"\n}`,
})
const m12_cli = buildSnippet({
  lang: 'json',
  code: `{\n  "response": {\n    "mode": "proxy",\n    "proxyUrl": "http://canary-honeypot:8080"\n  }\n}`,
})
const mode12Snippets = computed(() => ({
  traefik: [
    { filename: 'traefik.yml', lang: 'yaml', code: m12_traefik.cleanCode, html: m12_traefik.html, hasDiff: false },
    { filename: 'traefik.toml', lang: 'toml', code: m12_traefik_toml.cleanCode, html: m12_traefik_toml.html, hasDiff: false },
    { filename: 'docker-compose.yaml', lang: 'docker', code: m12_traefik_labels.cleanCode, html: m12_traefik_labels.html, hasDiff: false },
  ],
  caddy: [{ filename: 'Caddyfile', lang: 'caddy', code: m12_caddy.cleanCode, html: m12_caddy.html, hasDiff: false }],
  nginx: [{ filename: 'nginx.conf', lang: 'lua', code: m12_nginx.cleanCode, html: m12_nginx.html, hasDiff: false }],
  cli: [{ filename: 'routewarden.json', lang: 'json', code: m12_cli.cleanCode, html: m12_cli.html, hasDiff: false }],
}))

// ─── 13. Infinite Garbage Stream (infiniteStream / garbagestream) ───────────
const m13_traefik = buildSnippet({
  lang: 'yaml',
  code: `response:\n  mode: infiniteStream # Alias: "garbagestream"\n  statusCode: 200\n  streamSizeMB: 100 # Stream 100 Megabytes of random data`,
})
const m13_traefik_toml = buildSnippet({
  lang: 'toml',
  code: `[http.middlewares.my-warden.plugin.routewarden.response]\n  mode = "infiniteStream"\n  statusCode = 200\n  streamSizeMB = 100`,
})
const m13_traefik_labels = buildSnippet({
  lang: 'docker',
  code: `- "traefik.http.middlewares.my-warden.plugin.routewarden.response.mode=infiniteStream"\n- "traefik.http.middlewares.my-warden.plugin.routewarden.response.statusCode=200"\n- "traefik.http.middlewares.my-warden.plugin.routewarden.response.streamSizeMB=100"`,
})
const m13_caddy = buildSnippet({
  lang: 'caddy',
  code: `response {\n    mode infinite_stream\n    status_code 200\n    stream_size_mb 100\n}`,
})
const m13_nginx = buildSnippet({
  lang: 'lua',
  code: `response = {
    mode = "infinite_stream",
    status_code = 200,
    stream_size_mb = 100
}`,
})
const m13_cli = buildSnippet({
  lang: 'json',
  code: `{
  "response": {
    "mode": "infiniteStream",
    "statusCode": 200,
    "streamSizeMB": 100
  }
}`,
})
const mode13Snippets = computed(() => ({
  traefik: [
    { filename: 'traefik.yml', lang: 'yaml', code: m13_traefik.cleanCode, html: m13_traefik.html, hasDiff: false },
    { filename: 'traefik.toml', lang: 'toml', code: m13_traefik_toml.cleanCode, html: m13_traefik_toml.html, hasDiff: false },
    { filename: 'docker-compose.yaml', lang: 'docker', code: m13_traefik_labels.cleanCode, html: m13_traefik_labels.html, hasDiff: false },
  ],
  caddy: [{ filename: 'Caddyfile', lang: 'caddy', code: m13_caddy.cleanCode, html: m13_caddy.html, hasDiff: false }],
  nginx: [{ filename: 'nginx.conf', lang: 'lua', code: m13_nginx.cleanCode, html: m13_nginx.html, hasDiff: false }],
  cli: [{ filename: 'routewarden.json', lang: 'json', code: m13_cli.cleanCode, html: m13_cli.html, hasDiff: false }],
}))
</script>

# Response Modes Reference

RouteWarden features a modular response engine that dictates exactly how reverse proxies (Traefik, Caddy, and NGINX) handle blocked requests. Rather than only offering a generic static 403 error page, RouteWarden supports **13 deterministic response modes** ranging from standard REST error bodies to interactive bot challenges and offensive honeypot traps.

---

## Response Modes at a Glance

| Mode | Category | Target Use Case | Default Status Code |
|---|---|---|---|
| [`text`](#1-plain-text-text) | Standard Error | Minimalist plain text response | `403 Forbidden` |
| [`json`](#2-json-payload-json) | Standard Error | Clean REST API error objects for single-page apps | `403 Forbidden` |
| [`html`](#3-custom-html-html) | Standard Error | Branded corporate or application error pages | `403 Forbidden` |
| [`xml`](#4-xml-error-xml) | Enterprise | SOAP, XML-RPC, and legacy enterprise backends | `403 Forbidden` |
| [`redirect`](#5-url-redirect-redirect) | Redirection | External honeypots, loopback sinkholes, or portals | `302 Found` |
| [`captcha`](#6-interactive-challenge-captcha) | Verification | Cloudflare Turnstile, hCaptcha, or Google reCAPTCHA | `403 Forbidden` |
| [`silentDrop`](#7-silent-tcp-drop-silentdrop) | Passive Defense | Instant TCP socket teardown to confuse port scanners | N/A (TCP RST/EOF) |
| [`gzipBomb`](#8-gzip-decompression-bomb-gzipbomb-bomb) | Active Defense | Memory exhaustion trap that crashes crawler RAM | `200 OK` |
| [`tarpit`](#9-reverse-slowloris-tarpit-tarpit) | Active Defense | Extremely slow trickle stream to tie up bot sockets | `200 OK` |
| [`fakeSuccess`](#10-synthetic-honeypot-decoy-fakesuccess-decoy) | Deception | Realistic fake `.env`, `actuator`, `git`, or `phpinfo` | `200 OK` |
| [`rateLimitChallenge`](#11-rate-limit-backoff-ratelimitchallenge-ratelimit) | Throttling | HTTP 429 with compliant `Retry-After` header | `429 Too Many Requests` |
| [`proxy`](#12-transparent-honeypot-proxy-proxy-mirror) | Forensics | Transparent reverse-proxy into canary honeypot container | Upstream status |
| [`infiniteStream`](#13-infinite-garbage-stream-infinitestream) | Active Defense | Endless pseudo-random characters to fill crawler storage | `200 OK` |

---

## 1. Plain Text (`text`)

The simplest and lightest mode. Returns a raw text string with `Content-Type: text/plain; charset=utf-8` and `X-Content-Type-Options: nosniff`.

### Example Configuration

<CodeViewer :snippets="mode1Snippets" />

### Limitations & Caveats
- Browsers render unstyled plain text.
- Automated API clients that expect JSON will receive an unparsed string.

---

## 2. JSON Payload (`json`)

Returns structured JSON data with `Content-Type: application/json` and `X-Content-Type-Options: nosniff`. If `body` is omitted, RouteWarden generates a standard JSON error structure containing the HTTP status code and error description.

### Example Configuration

<CodeViewer :snippets="mode2Snippets" />

### Limitations & Caveats
- Ensure `body` contains valid JSON syntax; RouteWarden injects the raw string directly into the HTTP response stream.

---

## 3. Custom HTML (`html`)

Renders custom HTML pages with `Content-Type: text/html; charset=utf-8`. If `body` is left empty, RouteWarden serves a clean minimalist dark-mode fallback page.

### Example Configuration

<CodeViewer :snippets="mode3Snippets" />

---

## 4. XML Error (`xml`)

Emits structured XML documents with `Content-Type: application/xml; charset=utf-8`. Essential for SOAP web services, legacy payment gateways, or enterprise Java/Spring backends where upstream clients fail if returned non-XML payloads.

### Example Configuration

<CodeViewer :snippets="mode4Snippets" />

---

## 5. URL Redirect (`redirect`)

Redirects the client to another URL using HTTP 301, 302, 307, or 308. If the configured `statusCode` is outside the 300–308 range, RouteWarden automatically falls back to `302 Found`. If `redirectUrl` is omitted, it defaults to `/`.

### Example Configuration

<CodeViewer :snippets="mode5Snippets" />

### Limitations & Caveats
- Advanced scanners detect 30x status codes and record that the endpoint redirected rather than interacting with the destination. For transparent deflection without changing client URLs, use [`proxy`](#12-transparent-honeypot-proxy-proxy-mirror).

---

## 6. Interactive Challenge (`captcha`)

Serves a self-contained security verification page prompting users to complete a CAPTCHA challenge before proceeding. RouteWarden comes with pre-built dark-mode templates for **Cloudflare Turnstile**, **hCaptcha**, and **Google reCAPTCHA**.

### Example Configuration

<CodeViewer :snippets="mode6Snippets" />

### Limitations & Caveats
- Validating the submitted captcha token on POST requires a backend authentication service or an accompanying Traefik forward-auth plugin. RouteWarden serves the challenge interface directly at the edge.

---

## 7. Silent TCP Drop (`silentDrop`)

Rather than allocating HTTP response buffers, RouteWarden hijacks the underlying TCP connection and terminates it immediately (`TCP RST` / connection reset) using Go's `http.Hijacker`.

### Example Configuration

<CodeViewer :snippets="mode7Snippets" />

### Why Use Silent Drops?
- **Zero Server Bandwidth**: No HTTP headers or status codes are sent over the wire.
- **Port Scanner Disruption**: Automated scanners (like `masscan` or `nmap`) receive an unexpected connection reset, causing them to flag the port or endpoint as dead.

### Limitations & Caveats

> [!WARNING]
> **Edge Proxies, CDNs, and 502 Bad Gateway**:
> When running behind **Cloudflare, AWS ALB, NGINX, Traefik, or any reverse proxy / CDN**, closing the TCP socket without an HTTP response causes the upstream proxy to perceive a backend connection failure or dropped peer. The upstream proxy will typically render an **HTTP `502 Bad Gateway`** error to the client.
>
> If you are diagnosing unexpected 502 errors or want predictable error codes delivered through CDNs, use `mode json` or `mode html` with `statusCode 403` or `404` instead of `silentDrop`.

---

## 8. Gzip Decompression Bomb (`gzipBomb` / `bomb`)

An active-defense countermeasure. RouteWarden serves an HTTP `200 OK` response with `Content-Encoding: gzip` containing a stream of repeating zero-byte blocks.

### Example Configuration

<CodeViewer :snippets="mode8Snippets" />

### How It Works
1. A 10 MB stream of zeroes compresses into just a few kilobytes over the wire.
2. Automated crawlers (`dirsearch`, `nikto`, `gobuster`, Python scrapers) automatically decompress HTTP responses in system memory.
3. Expanding 10 MB to **10+ GB in memory** triggers an Out-Of-Memory (OOM) crash in the scanner process or freezes its worker thread pool.

::: danger CRITICAL WARNING: Do Not Attach Globally
Standard web browsers and legitimate search engine spiders (**Googlebot**, **Bingbot**) automatically decompress gzip encoding.
- **NEVER** configure `gzipBomb` on global entrypoints or legitimate content routes.
- **Always** keep `enableDefaultAllowPatterns: true` so `/robots.txt` and `/sitemap.xml` are exempt.
- **Only** apply to explicit exploit probe paths (`^/\.env`, `^/\.git`, `^/wp-login\.php`, `^/phpmyadmin`).
:::

---

## 9. Reverse Slowloris Tarpit (`tarpit`)

Stalls the requesting bot's TCP connection by sending an HTTP `200 OK` header and trickling individual single bytes at slow, deliberate intervals.

### Example Configuration

<CodeViewer :snippets="mode9Snippets" />

### How It Works & Attacker Impact
Automated vulnerability scanners operate with limited thread concurrency pools (typically 10 to 50 threads). When an attacker probes 20 honeypot endpoints, RouteWarden holds all 20 worker threads hostage for 120 seconds, grinding their scanning operations to a halt.

### Limitations & Traefik Considerations
- Holding open connections consumes an open file descriptor in Traefik. Ensure `tarpitMaxDurationSeconds` is set to a reasonable limit (e.g. 60–120s) so your Traefik instance does not exhaust connection limits.

---

## 10. Synthetic Honeypot Decoy (`fakeSuccess` / `decoy`)

Feeds automated vulnerability scanners convincing synthetic mock data so they record a false-positive and waste time attempting to exploit dummy credentials.

### Example Configuration

<CodeViewer :snippets="mode10Snippets" />

### Out-of-the-Box Synthetic Payloads

| Probed Endpoint | RouteWarden Synthetic Response Payload |
|---|---|
| `/.env` | Realistic Laravel `.env` with dummy MySQL credentials and base64 app key |
| `/actuator/health` | Spring Boot Actuator health JSON with dummy disk space metrics |
| `/.git/HEAD` | Standard Git repository pointer (`ref: refs/heads/master`) |
| `/phpinfo.php` | Sanitized mock HTML document displaying PHP 8.2 system specs |
| `/wp-login.php` | Clean WordPress administration login form |
| Other endpoints | Generic REST success JSON `{"status":"success","data":{"id":1,"active":true}}` |

You can override any synthetic payload by supplying custom text in the `body` option.

---

## 11. Rate Limit Challenge (`rateLimitChallenge` / `ratelimit`)

Returns an HTTP `429 Too Many Requests` status code with an injected standard `Retry-After: <seconds>` header.

### Example Configuration

<CodeViewer :snippets="mode11Snippets" />

### Attacker Impact
Polite web crawlers, search indexers, and compliance-oriented scrapers respect the `Retry-After` header and will pause all outbound requests until the cooldown window expires.

---

## 12. Transparent Honeypot Proxy (`proxy` / `mirror`)

Transparently reverse-proxies the unauthorized request into an internal honeypot or forensic capture container (e.g. Cowrie, OpenCanary, or an isolated sandbox) without issuing an HTTP redirect.

### Example Configuration

<CodeViewer :snippets="mode12Snippets" />

### Why Use Transparent Proxying?
- **Attacker Blindness**: Attackers cannot detect that they were redirected because the URL, IP, and TLS handshake remain identical.
- **Forensic Payload Collection**: Captures full POST bodies, exploit payloads, SQL injection strings, and evasion attempts inside an isolated environment for security analysis.

---

## 13. Infinite Garbage Stream (`infiniteStream` / `garbagestream`)

Sends an HTTP `200 OK` response with `Content-Type: application/octet-stream` and continuously streams pseudo-random garbage characters at full TCP connection speed.

### Example Configuration

<CodeViewer :snippets="mode13Snippets" />

### Attacker Impact
- Fills local disk storage if the crawler saves HTTP response files to disk.
- Freezes or crashes regex parsers, HTML tokenizers, and JSON decoders that attempt to read the entire body into memory before parsing.
