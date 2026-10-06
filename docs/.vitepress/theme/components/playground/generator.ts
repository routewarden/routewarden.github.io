export type ResponseMode =
  | 'json'
  | 'html'
  | 'text'
  | 'xml'
  | 'redirect'
  | 'captcha'
  | 'silentDrop'
  | 'gzipBomb'
  | 'tarpit'
  | 'fakeSuccess'
  | 'rateLimitChallenge'
  | 'proxy'
  | 'infiniteStream'

export interface SnippetOptions {
  snippetFormat: string
  enabled: boolean
  debug: boolean
  securityLog: boolean
  enableDefaultPatterns: boolean
  enableDefaultAllowPatterns: boolean
  checkQuery: boolean
  blockList: string[]
  allowList: string[]
  ipList: string[]
  methodsList: string[]
  hasCustomMethods: boolean
  responseMode: ResponseMode
  statusCode: number
  customBody: string
  redirectUrl: string
  proxyUrl: string
  gzipBombMB: number
  tarpitDelayMs: number
  tarpitMaxDurationSeconds: number
  retryAfterSeconds: number
  streamSizeMB: number
  captchaProvider: 'turnstile' | 'hcaptcha' | 'recaptcha'
  captchaSiteKey: string
  captchaTitle: string
  testMethod: string
  testPath: string
  testIp: string
  trustedProxiesList?: string[]
}

export function generateGatewaySnippet(opts: SnippetOptions): string {
  const {
    snippetFormat, enabled, debug, securityLog, enableDefaultPatterns, enableDefaultAllowPatterns,
    checkQuery, blockList, allowList, ipList, methodsList, hasCustomMethods, responseMode,
    statusCode, customBody, redirectUrl, proxyUrl, gzipBombMB, tarpitDelayMs, tarpitMaxDurationSeconds,
    retryAfterSeconds, streamSizeMB, captchaProvider, captchaSiteKey, captchaTitle,
    testMethod, testPath, testIp
  } = opts
  const trustedProxiesList = opts.trustedProxiesList || []

  if (snippetFormat === 'caddy') {
    let out = `example.com {\n  route_warden {\n`
    if (!enabled) out += `    enabled false\n`
    if (debug) out += `    debug true\n`
    if (!securityLog) out += `    security_log false\n`
    if (!enableDefaultPatterns) out += `    enable_default_patterns false\n`
    if (!enableDefaultAllowPatterns) out += `    enable_default_allow_patterns false\n`
    if (checkQuery) out += `    check_query true\n`

    if (blockList.length > 0) {
      out += `    block_patterns`
      for (const p of blockList) out += ` "${p}"`
      out += `\n`
    }
    if (allowList.length > 0) {
      out += `    allow_patterns`
      for (const p of allowList) out += ` "${p}"`
      out += `\n`
    }
    if (ipList.length > 0) {
      out += `    allowed_ips`
      for (const ip of ipList) out += ` "${ip}"`
      out += `\n`
    }
    if (trustedProxiesList.length > 0) {
      out += `    trusted_proxies`
      for (const ip of trustedProxiesList) out += ` "${ip}"`
      out += `\n`
    }
    if (hasCustomMethods) {
      out += `    methods ${methodsList.join(' ')}\n`
    }
    out += `    response {\n`
    out += `      mode ${responseMode}\n`
    if (statusCode !== 403) out += `      status_code ${statusCode}\n`
    if (customBody) out += `      body "${customBody.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"\n`
    if (responseMode === 'redirect') out += `      redirect_url "${redirectUrl}"\n`
    if (responseMode === 'proxy') out += `      proxy_url "${proxyUrl}"\n`
    if (responseMode === 'gzipBomb') out += `      gzip_bomb_mb ${gzipBombMB}\n`
    if (responseMode === 'tarpit') {
      out += `      tarpit_delay_ms ${tarpitDelayMs}\n`
      out += `      tarpit_max_duration_seconds ${tarpitMaxDurationSeconds}\n`
    }
    if (responseMode === 'rateLimitChallenge') out += `      retry_after_seconds ${retryAfterSeconds}\n`
    if (responseMode === 'infiniteStream') out += `      stream_size_mb ${streamSizeMB}\n`
    if (responseMode === 'captcha') {
      out += `      captcha {\n`
      out += `        provider ${captchaProvider}\n`
      out += `        site_key "${captchaSiteKey}"\n`
      out += `      }\n`
    }
    out += `    }\n  }\n  reverse_proxy localhost:8080\n}`
    return out
  }

  if (snippetFormat === 'nginx') {
    let out = `# /etc/nginx/conf.d/routewarden.conf (OpenResty / NGINX Lua)\n`
    out += `init_by_lua_block {\n`
    out += `    local routewarden = require("resty.routewarden")\n`
    out += `    warden = routewarden.new({\n`
    if (!enabled) out += `        enabled = false,\n`
    if (debug) out += `        debug = true,\n`
    if (!securityLog) out += `        security_log = false,\n`
    if (!enableDefaultPatterns) out += `        enable_default_patterns = false,\n`
    if (!enableDefaultAllowPatterns) out += `        enable_default_allow_patterns = false,\n`
    if (checkQuery) out += `        check_query = true,\n`

    if (blockList.length > 0) {
      out += `        block_patterns = {\n`
      for (const p of blockList) out += `            "${p}",\n`
      out += `        },\n`
    }
    if (allowList.length > 0) {
      out += `        allow_patterns = {\n`
      for (const p of allowList) out += `            "${p}",\n`
      out += `        },\n`
    }
    if (ipList.length > 0) {
      out += `        allowed_ips = {\n`
      for (const ip of ipList) out += `            "${ip}",\n`
      out += `        },\n`
    }
    if (trustedProxiesList.length > 0) {
      out += `        trusted_proxies = {\n`
      for (const ip of trustedProxiesList) out += `            "${ip}",\n`
      out += `        },\n`
    }
    if (hasCustomMethods) {
      out += `        methods = { ${methodsList.map(m => `"${m}"`).join(', ')} },\n`
    }
    out += `        response = {\n`
    out += `            mode = "${responseMode}",\n`
    if (statusCode !== 403) out += `            status_code = ${statusCode},\n`
    if (customBody) out += `            body = '${customBody.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}',\n`
    if (responseMode === 'redirect') out += `            redirect_url = "${redirectUrl}",\n`
    if (responseMode === 'proxy') out += `            proxy_url = "${proxyUrl}",\n`
    if (responseMode === 'gzipBomb') out += `            gzip_bomb_mb = ${gzipBombMB},\n`
    if (responseMode === 'tarpit') {
      out += `            tarpit_delay_ms = ${tarpitDelayMs},\n`
      out += `            tarpit_max_duration_seconds = ${tarpitMaxDurationSeconds},\n`
    }
    if (responseMode === 'rateLimitChallenge') out += `            retry_after_seconds = ${retryAfterSeconds},\n`
    if (responseMode === 'infiniteStream') out += `            stream_size_mb = ${streamSizeMB},\n`
    if (responseMode === 'captcha') {
      out += `            captcha = {\n`
      out += `                provider = "${captchaProvider}",\n`
      out += `                site_key = "${captchaSiteKey}",\n`
      out += `            },\n`
    }
    out += `        }\n`
    out += `    })\n`
    out += `}\n\n`
    out += `server {\n`
    out += `    listen 80;\n`
    out += `    server_name example.com;\n\n`
    out += `    # Intercept sensitive paths before upstream proxy\n`
    out += `    access_by_lua_block {\n`
    out += `        warden:check()\n`
    out += `    }\n\n`
    out += `    location / {\n`
    out += `        proxy_pass http://localhost:8080;\n`
    out += `        proxy_set_header Host $host;\n`
    out += `        proxy_set_header X-Real-IP $remote_addr;\n`
    out += `        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n`
    out += `    }\n`
    out += `}`
    return out
  }

  if (snippetFormat === 'traefik_yaml') {
    let out = `http:\n  middlewares:\n    routewarden:\n      plugin:\n        routewarden:\n`
    if (!enabled) out += `          enabled: false\n`
    if (debug) out += `          debug: true\n`
    if (!securityLog) out += `          securityLog: false\n`
    if (!enableDefaultPatterns) out += `          enableDefaultPatterns: false\n`
    if (!enableDefaultAllowPatterns) out += `          enableDefaultAllowPatterns: false\n`
    if (checkQuery) out += `          checkQuery: true\n`

    if (blockList.length > 0) {
      out += `          blockPatterns:\n`
      for (const p of blockList) out += `            - "${p}"\n`
    }
    if (allowList.length > 0) {
      out += `          allowPatterns:\n`
      for (const p of allowList) out += `            - "${p}"\n`
    }
    if (ipList.length > 0) {
      out += `          allowedIps:\n`
      for (const ip of ipList) out += `            - "${ip}"\n`
    }
    if (trustedProxiesList.length > 0) {
      out += `          trustedProxies:\n`
      for (const ip of trustedProxiesList) out += `            - "${ip}"\n`
    }
    if (hasCustomMethods) {
      out += `          methods:\n`
      for (const m of methodsList) out += `            - "${m}"\n`
    }
    out += `          response:\n            mode: ${responseMode}\n`
    if (statusCode !== 403) out += `            statusCode: ${statusCode}\n`
    if (customBody) out += `            body: "${customBody.replace(/"/g, '\\"')}"\n`
    if (responseMode === 'redirect') out += `            redirectUrl: "${redirectUrl}"\n`
    if (responseMode === 'proxy') out += `            proxyUrl: "${proxyUrl}"\n`
    if (responseMode === 'gzipBomb') out += `            gzipBombMB: ${gzipBombMB}\n`
    if (responseMode === 'tarpit') {
      out += `            tarpitDelayMs: ${tarpitDelayMs}\n`
      out += `            tarpitMaxDurationSeconds: ${tarpitMaxDurationSeconds}\n`
    }
    if (responseMode === 'rateLimitChallenge') out += `            retryAfterSeconds: ${retryAfterSeconds}\n`
    if (responseMode === 'infiniteStream') out += `            streamSizeMB: ${streamSizeMB}\n`
    if (responseMode === 'captcha') {
      out += `            captcha:\n`
      out += `              provider: "${captchaProvider}"\n`
      out += `              siteKey: "${captchaSiteKey}"\n`
      out += `              title: "${captchaTitle}"\n`
    }
    return out
  }

  if (snippetFormat === 'traefik_toml') {
    let out = `[http.middlewares.routewarden.plugin.routewarden]\n`
    if (!enabled) out += `enabled = false\n`
    if (debug) out += `debug = true\n`
    if (!securityLog) out += `securityLog = false\n`
    if (!enableDefaultPatterns) out += `enableDefaultPatterns = false\n`
    if (!enableDefaultAllowPatterns) out += `enableDefaultAllowPatterns = false\n`
    if (checkQuery) out += `checkQuery = true\n`

    if (blockList.length > 0) {
      out += `blockPatterns = [\n`
      for (const p of blockList) out += `  "${p}",\n`
      out += `]\n`
    }
    if (allowList.length > 0) {
      out += `allowPatterns = [\n`
      for (const p of allowList) out += `  "${p}",\n`
      out += `]\n`
    }
    if (ipList.length > 0) {
      out += `allowedIps = [\n`
      for (const ip of ipList) out += `  "${ip}",\n`
      out += `]\n`
    }
    if (trustedProxiesList.length > 0) {
      out += `trustedProxies = [\n`
      for (const ip of trustedProxiesList) out += `  "${ip}",\n`
      out += `]\n`
    }
    if (hasCustomMethods) {
      out += `methods = [${methodsList.map(m => `"${m}"`).join(', ')}]\n`
    }
    out += `\n[http.middlewares.routewarden.plugin.routewarden.response]\nmode = "${responseMode}"\n`
    if (statusCode !== 403) out += `statusCode = ${statusCode}\n`
    if (customBody) out += `body = "${customBody.replace(/"/g, '\\"')}"\n`
    if (responseMode === 'redirect') out += `redirectUrl = "${redirectUrl}"\n`
    if (responseMode === 'proxy') out += `proxyUrl = "${proxyUrl}"\n`
    if (responseMode === 'gzipBomb') out += `gzipBombMB = ${gzipBombMB}\n`
    if (responseMode === 'tarpit') {
      out += `tarpitDelayMs = ${tarpitDelayMs}\n`
      out += `tarpitMaxDurationSeconds = ${tarpitMaxDurationSeconds}\n`
    }
    if (responseMode === 'rateLimitChallenge') out += `retryAfterSeconds = ${retryAfterSeconds}\n`
    if (responseMode === 'infiniteStream') out += `streamSizeMB = ${streamSizeMB}\n`
    if (responseMode === 'captcha') {
      out += `[http.middlewares.routewarden.plugin.routewarden.response.captcha]\n`
      out += `provider = "${captchaProvider}"\n`
      out += `siteKey = "${captchaSiteKey}"\n`
      out += `title = "${captchaTitle}"\n`
    }
    return out
  }

  if (snippetFormat === 'docker') {
    let out = `services:\n  traefik:\n    labels:\n`
    const prefix = 'traefik.http.middlewares.routewarden.plugin.routewarden'
    if (!enabled) out += `      - "${prefix}.enabled=false"\n`
    if (debug) out += `      - "${prefix}.debug=true"\n`
    if (!securityLog) out += `      - "${prefix}.securityLog=false"\n`
    if (!enableDefaultPatterns) out += `      - "${prefix}.enableDefaultPatterns=false"\n`
    if (!enableDefaultAllowPatterns) out += `      - "${prefix}.enableDefaultAllowPatterns=false"\n`
    if (checkQuery) out += `      - "${prefix}.checkQuery=true"\n`
    if (hasCustomMethods) {
      out += `      - "${prefix}.methods=${methodsList.join(',')}"\n`
    }
    blockList.forEach((p, idx) => {
      out += `      - "${prefix}.blockPatterns[${idx}]=${p}"\n`
    })
    allowList.forEach((p, idx) => {
      out += `      - "${prefix}.allowPatterns[${idx}]=${p}"\n`
    })
    ipList.forEach((ip, idx) => {
      out += `      - "${prefix}.allowedIps[${idx}]=${ip}"\n`
    })
    trustedProxiesList.forEach((ip, idx) => {
      out += `      - "${prefix}.trustedProxies[${idx}]=${ip}"\n`
    })
    out += `      - "${prefix}.response.mode=${responseMode}"\n`
    if (statusCode !== 403) out += `      - "${prefix}.response.statusCode=${statusCode}"\n`
    if (customBody) out += `      - "${prefix}.response.body=${customBody.replace(/"/g, '\\"')}"\n`
    if (responseMode === 'redirect') out += `      - "${prefix}.response.redirectUrl=${redirectUrl}"\n`
    if (responseMode === 'proxy') out += `      - "${prefix}.response.proxyUrl=${proxyUrl}"\n`
    if (responseMode === 'gzipBomb') out += `      - "${prefix}.response.gzipBombMB=${gzipBombMB}"\n`
    if (responseMode === 'tarpit') {
      out += `      - "${prefix}.response.tarpitDelayMs=${tarpitDelayMs}"\n`
      out += `      - "${prefix}.response.tarpitMaxDurationSeconds=${tarpitMaxDurationSeconds}"\n`
    }
    if (responseMode === 'rateLimitChallenge') out += `      - "${prefix}.response.retryAfterSeconds=${retryAfterSeconds}"\n`
    if (responseMode === 'infiniteStream') out += `      - "${prefix}.response.streamSizeMB=${streamSizeMB}"\n`
    if (responseMode === 'captcha') {
      out += `      - "${prefix}.response.captcha.provider=${captchaProvider}"\n`
      out += `      - "${prefix}.response.captcha.siteKey=${captchaSiteKey}"\n`
    }
    return out
  }

  if (snippetFormat === 'k8s_traefik' || snippetFormat === 'k8s') {
    let out = `apiVersion: traefik.io/v1alpha1\nkind: Middleware\nmetadata:\n  name: routewarden\n  namespace: default\nspec:\n  plugin:\n    routewarden:\n`
    if (!enabled) out += `      enabled: false\n`
    if (debug) out += `      debug: true\n`
    if (!securityLog) out += `      securityLog: false\n`
    if (!enableDefaultPatterns) out += `      enableDefaultPatterns: false\n`
    if (!enableDefaultAllowPatterns) out += `      enableDefaultAllowPatterns: false\n`
    if (checkQuery) out += `      checkQuery: true\n`

    if (hasCustomMethods) {
      out += `      methods:\n`
      for (const m of methodsList) out += `        - "${m}"\n`
    }
    if (blockList.length > 0) {
      out += `      blockPatterns:\n`
      for (const p of blockList) out += `        - "${p}"\n`
    }
    if (allowList.length > 0) {
      out += `      allowPatterns:\n`
      for (const p of allowList) out += `        - "${p}"\n`
    }
    if (ipList.length > 0) {
      out += `      allowedIps:\n`
      for (const ip of ipList) out += `        - "${ip}"\n`
    }
    if (trustedProxiesList.length > 0) {
      out += `      trustedProxies:\n`
      for (const ip of trustedProxiesList) out += `        - "${ip}"\n`
    }
    out += `      response:\n        mode: ${responseMode}\n`
    if (statusCode !== 403) out += `        statusCode: ${statusCode}\n`
    if (customBody) out += `        body: "${customBody.replace(/"/g, '\\"')}"\n`
    if (responseMode === 'redirect') out += `        redirectUrl: "${redirectUrl}"\n`
    if (responseMode === 'proxy') out += `        proxyUrl: "${proxyUrl}"\n`
    if (responseMode === 'gzipBomb') out += `        gzipBombMB: ${gzipBombMB}\n`
    if (responseMode === 'tarpit') {
      out += `        tarpitDelayMs: ${tarpitDelayMs}\n`
      out += `        tarpitMaxDurationSeconds: ${tarpitMaxDurationSeconds}\n`
    }
    if (responseMode === 'rateLimitChallenge') out += `        retryAfterSeconds: ${retryAfterSeconds}\n`
    if (responseMode === 'infiniteStream') out += `        streamSizeMB: ${streamSizeMB}\n`
    if (responseMode === 'captcha') {
      out += `        captcha:\n          provider: "${captchaProvider}"\n          siteKey: "${captchaSiteKey}"\n          title: "${captchaTitle}"\n`
    }
    return out
  }

  if (snippetFormat === 'k8s_caddy') {
    let out = `apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: caddy-config\n  namespace: default\ndata:\n  Caddyfile: |\n    {\n      order route_warden before reverse_proxy\n    }\n\n    example.com {\n      route_warden {\n`
    if (!enabled) out += `        enabled false\n`
    if (debug) out += `        debug true\n`
    if (!securityLog) out += `        security_log false\n`
    if (!enableDefaultPatterns) out += `        enable_default_patterns false\n`
    if (!enableDefaultAllowPatterns) out += `        enable_default_allow_patterns false\n`
    if (checkQuery) out += `        check_query true\n`

    if (blockList.length > 0) {
      out += `        block_patterns`
      for (const p of blockList) out += ` "${p}"`
      out += `\n`
    }
    if (allowList.length > 0) {
      out += `        allow_patterns`
      for (const p of allowList) out += ` "${p}"`
      out += `\n`
    }
    if (ipList.length > 0) {
      out += `        allowed_ips`
      for (const ip of ipList) out += ` "${ip}"`
      out += `\n`
    }
    if (trustedProxiesList.length > 0) {
      out += `        trusted_proxies`
      for (const ip of trustedProxiesList) out += ` "${ip}"`
      out += `\n`
    }
    if (hasCustomMethods) {
      out += `        methods ${methodsList.join(' ')}\n`
    }
    out += `        response {\n`
    out += `          mode ${responseMode}\n`
    if (statusCode !== 403) out += `          status_code ${statusCode}\n`
    if (customBody) out += `          body "${customBody.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"\n`
    if (responseMode === 'redirect') out += `          redirect_url "${redirectUrl}"\n`
    if (responseMode === 'proxy') out += `          proxy_url "${proxyUrl}"\n`
    if (responseMode === 'gzipBomb') out += `          gzip_bomb_mb ${gzipBombMB}\n`
    if (responseMode === 'tarpit') {
      out += `          tarpit_delay_ms ${tarpitDelayMs}\n`
      out += `          tarpit_max_duration_seconds ${tarpitMaxDurationSeconds}\n`
    }
    if (responseMode === 'rateLimitChallenge') out += `          retry_after_seconds ${retryAfterSeconds}\n`
    if (responseMode === 'infiniteStream') out += `          stream_size_mb ${streamSizeMB}\n`
    if (responseMode === 'captcha') {
      out += `          captcha {\n`
      out += `            provider ${captchaProvider}\n`
      out += `            site_key "${captchaSiteKey}"\n`
      out += `          }\n`
    }
    out += `        }\n      }\n      reverse_proxy app-service.default.svc.cluster.local:80\n    }\n`
    return out
  }

  if (snippetFormat === 'k8s_nginx') {
    let out = `apiVersion: networking.k8s.io/v1\nkind: Ingress\nmetadata:\n  name: secured-nginx-ingress\n  namespace: default\n  annotations:\n`
    out += `    nginx.ingress.kubernetes.io/server-snippet: |\n`
    out += `      lua_package_path "/etc/nginx/lua/lib/?.lua;/etc/nginx/lua/lib/?/init.lua;;";\n`
    out += `      init_by_lua_block {\n`
    out += `        local routewarden = require("resty.routewarden")\n`
    out += `        warden = routewarden.new({\n`
    if (!enabled) out += `          enabled = false,\n`
    if (debug) out += `          debug = true,\n`
    if (!securityLog) out += `          security_log = false,\n`
    if (!enableDefaultPatterns) out += `          enable_default_patterns = false,\n`
    if (!enableDefaultAllowPatterns) out += `          enable_default_allow_patterns = false,\n`
    if (checkQuery) out += `          check_query = true,\n`

    if (blockList.length > 0) {
      out += `          block_patterns = {\n`
      for (const p of blockList) out += `            "${p}",\n`
      out += `          },\n`
    }
    if (allowList.length > 0) {
      out += `          allow_patterns = {\n`
      for (const p of allowList) out += `            "${p}",\n`
      out += `          },\n`
    }
    if (ipList.length > 0) {
      out += `          allowed_ips = {\n`
      for (const ip of ipList) out += `            "${ip}",\n`
      out += `          },\n`
    }
    if (trustedProxiesList.length > 0) {
      out += `          trusted_proxies = {\n`
      for (const ip of trustedProxiesList) out += `            "${ip}",\n`
      out += `          },\n`
    }
    if (hasCustomMethods) {
      out += `          methods = { ${methodsList.map(m => `"${m}"`).join(', ')} },\n`
    }
    out += `          response = {\n`
    out += `            mode = "${responseMode}",\n`
    if (statusCode !== 403) out += `            status_code = ${statusCode},\n`
    if (customBody) out += `            body = '${customBody.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}',\n`
    if (responseMode === 'redirect') out += `            redirect_url = "${redirectUrl}",\n`
    if (responseMode === 'proxy') out += `            proxy_url = "${proxyUrl}",\n`
    if (responseMode === 'gzipBomb') out += `            gzip_bomb_mb = ${gzipBombMB},\n`
    if (responseMode === 'tarpit') {
      out += `            tarpit_delay_ms = ${tarpitDelayMs},\n`
      out += `            tarpit_max_duration_seconds = ${tarpitMaxDurationSeconds},\n`
    }
    if (responseMode === 'rateLimitChallenge') out += `            retry_after_seconds = ${retryAfterSeconds},\n`
    if (responseMode === 'infiniteStream') out += `            stream_size_mb = ${streamSizeMB},\n`
    if (responseMode === 'captcha') {
      out += `            captcha = {\n`
      out += `              provider = "${captchaProvider}",\n`
      out += `              site_key = "${captchaSiteKey}",\n`
      out += `            },\n`
    }
    out += `          }\n`
    out += `        })\n`
    out += `      }\n`
    out += `    nginx.ingress.kubernetes.io/configuration-snippet: |\n`
    out += `      access_by_lua_block {\n`
    out += `        warden:check()\n`
    out += `      }\nspec:\n  ingressClassName: nginx\n  rules:\n    - host: production.example.com\n      http:\n        paths:\n          - path: /\n            pathType: Prefix\n            backend:\n              service:\n                name: app-service\n                port:\n                  number: 80\n`
    return out
  }

  if (snippetFormat === 'cli_json') {
    const configObj: Record<string, any> = {
      $schema: 'https://routewarden.github.io/schema.json',
      enabled: enabled
    }
    if (debug) configObj.debug = true
    if (!securityLog) configObj.securityLog = false
    if (!enableDefaultPatterns) configObj.enableDefaultPatterns = false
    if (!enableDefaultAllowPatterns) configObj.enableDefaultAllowPatterns = false
    if (checkQuery) configObj.checkQuery = true
    if (blockList.length > 0) configObj.blockPatterns = blockList
    if (allowList.length > 0) configObj.allowPatterns = allowList
    if (ipList.length > 0) configObj.allowedIps = ipList
    if (trustedProxiesList.length > 0) configObj.trustedProxies = trustedProxiesList
    if (hasCustomMethods) configObj.methods = methodsList

    const respObj: Record<string, any> = { mode: responseMode }
    if (statusCode !== 403) respObj.statusCode = statusCode
    if (customBody) respObj.body = customBody
    if (responseMode === 'redirect') respObj.redirectUrl = redirectUrl
    if (responseMode === 'proxy') respObj.proxyUrl = proxyUrl
    if (responseMode === 'gzipBomb') respObj.gzipBombMB = gzipBombMB
    if (responseMode === 'tarpit') {
      respObj.tarpitDelayMs = tarpitDelayMs
      respObj.tarpitMaxDurationSeconds = tarpitMaxDurationSeconds
    }
    if (responseMode === 'rateLimitChallenge') respObj.retryAfterSeconds = retryAfterSeconds
    if (responseMode === 'infiniteStream') respObj.streamSizeMB = streamSizeMB
    if (responseMode === 'captcha') {
      respObj.captcha = {
        provider: captchaProvider,
        siteKey: captchaSiteKey,
        title: captchaTitle
      }
    }
    configObj.response = respObj
    return JSON.stringify(configObj, null, 2)
  }

  if (snippetFormat === 'cli_cmd') {
    let cmd = `# 1. Validate your config offline:\nrwarden validate --config routewarden.json\n\n`
    cmd += `# 2. Test current simulation parameters:\n`
    cmd += `rwarden test \\\n  --method "${testMethod}" \\\n  --path "${testPath}" \\\n  --ip "${testIp}"`
    if (checkQuery) cmd += ` \\\n  --query`
    return cmd
  }

  return ''
}
