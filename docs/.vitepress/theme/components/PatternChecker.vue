<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { trackPlaygroundEvent } from '../telemetry'
import {
  DEFAULT_BLOCK_RULES,
  DEFAULT_ALLOW_RULES,
  STANDARD_METHODS,
  type PresetItem
} from './playground/rules'
import {
  extractCandidatePaths,
  isIpWhitelisted,
  resolveEffectiveClientIp,
  matchRegex,
  smartCompileRegex
} from './playground/engine'
import {
  generateGatewaySnippet,
  type ResponseMode
} from './playground/generator'
import { highlightSnippet } from './playground/highlighter'
import { useGatewaySelection, type GatewayId } from '../composables/useGatewaySelection'

import RequestInputStrip from './playground/RequestInputStrip.vue'
import PatternColumn from './playground/PatternColumn.vue'
import OptionsPanel from './playground/OptionsPanel.vue'
import ResponseOptionsPanel, { type VerbEvalResult } from './playground/ResponseOptionsPanel.vue'
import SimulatedResponseCard from './playground/SimulatedResponseCard.vue'
import ExportEditorCard, { type FormatTab } from './playground/ExportEditorCard.vue'

// 1. Input state
const testMethod = ref('GET')
const testPath = ref('/%252e%252e/.env')
const testIp = ref('198.51.100.42')
const testForwardedFor = ref('')

// 2. Patterns state
const blockPatternsInput = ref('')
const allowPatternsInput = ref('')
const newBlockInput = ref('')
const newAllowInput = ref('')

// 3. Flags state
const enabled = ref(true)
const debug = ref(false)
const securityLog = ref(true)
const enableDefaultPatterns = ref(true)
const enableDefaultAllowPatterns = ref(true)
const checkQuery = ref(false)
const checkHeadersInput = ref('')
const allowedIpsInput = ref('127.0.0.1, 10.0.0.0/8')
const trustedProxiesInput = ref('')
const methodsInput = ref('GET')

const inspectedMethods = computed(() => {
  const raw = methodsInput.value.trim()
  if (!raw) return ['GET']
  return raw.split(/[,\s]+/).map(m => m.trim().toUpperCase()).filter(Boolean)
})

function toggleInspectedMethod(m: string) {
  const current = inspectedMethods.value.slice()
  const idx = current.indexOf(m)
  if (idx >= 0) {
    if (current.length === 1) {
      methodsInput.value = 'GET'
    } else {
      current.splice(idx, 1)
      methodsInput.value = current.join(', ')
    }
  } else {
    current.push(m)
    methodsInput.value = current.join(', ')
  }
}

const allStandardMethodsSelected = computed(() => {
  return STANDARD_METHODS.every(m => inspectedMethods.value.includes(m))
})

function toggleAllMethods() {
  if (allStandardMethodsSelected.value) {
    methodsInput.value = 'GET'
  } else {
    methodsInput.value = STANDARD_METHODS.join(', ')
  }
}

// 4. Response state
const responseMode = ref<ResponseMode>('json')
const statusCode = ref(403)
const customBody = ref('')
const redirectUrl = ref('https://honeypot.example.com/sinkhole')
const proxyUrl = ref('http://honeypot-internal:8080')
const captchaProvider = ref<'turnstile' | 'hcaptcha' | 'recaptcha'>('turnstile')
const captchaSiteKey = ref('0x4AAAAAAtestkey123')
const captchaTitle = ref('Security Verification Required')
const gzipBombMB = ref(10)
const retryAfterSeconds = ref(300)
const tarpitDelayMs = ref(1000)
const tarpitMaxDurationSeconds = ref(60)
const streamSizeMB = ref(50)

// 5. Shared gateway selection composable
const { activeGateway: selectedGateway, gateways } = useGatewaySelection()

// Filter out TCP Warden from Playground gateway choices since playground evaluates Layer 7 HTTP patterns
const playgroundGateways = computed(() => gateways.filter(g => g.id !== 'tcp'))

type SnippetFormat = 'caddy' | 'nginx' | 'traefik_yaml' | 'traefik_toml' | 'docker' | 'k8s_traefik' | 'k8s_caddy' | 'k8s_nginx' | 'k8s' | 'cli_json' | 'cli_cmd'

function gatewayFamilyOf(fmt: string): GatewayId {
  if (fmt === 'caddy' || fmt === 'k8s_caddy') return 'caddy'
  if (fmt === 'nginx' || fmt === 'k8s_nginx') return 'nginx'
  if (fmt === 'cli_json' || fmt === 'cli_cmd') return 'cli'
  return 'traefik'
}

function defaultFormatFor(gw: string): SnippetFormat {
  if (gw === 'caddy') return 'caddy'
  if (gw === 'nginx') return 'nginx'
  if (gw === 'cli') return 'cli_json'
  return 'traefik_yaml'
}

const snippetFormat = ref<SnippetFormat>('traefik_yaml')

const gatewayTabs = computed<FormatTab[]>(() => {
  switch (selectedGateway.value) {
    case 'caddy':
      return [
        { id: 'caddy', label: 'Caddyfile' },
        { id: 'k8s_caddy', label: 'Kubernetes' }
      ]
    case 'nginx':
      return [
        { id: 'nginx', label: 'NGINX (Lua)' },
        { id: 'k8s_nginx', label: 'Kubernetes' }
      ]
    case 'cli':
      return [
        { id: 'cli_json', label: 'routewarden.json' },
        { id: 'cli_cmd', label: 'rwarden CLI' }
      ]
    case 'traefik':
    default:
      return [
        { id: 'traefik_yaml', label: 'Traefik (YAML)' },
        { id: 'traefik_toml', label: 'Traefik (TOML)' },
        { id: 'docker', label: 'Docker' },
        { id: 'k8s_traefik', label: 'Kubernetes (CRD)' }
      ]
  }
})

// Sync selectedGateway -> snippetFormat
watch(selectedGateway, (newGw) => {
  if (newGw === 'tcp') {
    // TCP Warden is Layer 4; fallback to traefik in Layer 7 playground
    selectedGateway.value = 'traefik'
    return
  }
  const currentFamily = gatewayFamilyOf(snippetFormat.value)
  if (currentFamily !== newGw) {
    snippetFormat.value = defaultFormatFor(newGw)
  }
}, { immediate: true })

// Sync snippetFormat -> selectedGateway
watch(snippetFormat, (fmt) => {
  const gw = gatewayFamilyOf(fmt)
  if (selectedGateway.value !== gw) {
    selectedGateway.value = gw
  }
})

function applyPreset(p: PresetItem) {
  testPath.value = p.path
  testIp.value = p.ip
  testForwardedFor.value = p.xForwardedFor || ''
  if (p.trustedProxies !== undefined) {
    trustedProxiesInput.value = p.trustedProxies
  }
  if (p.method) testMethod.value = p.method
  trackPlaygroundEvent('apply_preset', { label: p.label || p.path })
}

function normalizePath(rawPath: string) {
  const res = extractCandidatePaths(rawPath, checkQuery.value)
  return {
    normalized: res.normalized,
    transformations: res.transformations,
    candidates: res.candidates
  }
}

const customBlockList = computed(() => {
  return blockPatternsInput.value.split('\n').map(s => s.trim()).filter(Boolean)
})

const customAllowList = computed(() => {
  return allowPatternsInput.value.split('\n').map(s => s.trim()).filter(Boolean)
})

function addNewBlockPattern() {
  const pat = smartCompileRegex(newBlockInput.value)
  if (!pat) return
  if (!customBlockList.value.includes(pat)) {
    blockPatternsInput.value = customBlockList.value.length ? `${blockPatternsInput.value.trim()}\n${pat}` : pat
  }
  newBlockInput.value = ''
}

function removeBlockPattern(index: number) {
  const lines = customBlockList.value.slice()
  lines.splice(index, 1)
  blockPatternsInput.value = lines.join('\n')
}

function addNewAllowPattern() {
  const pat = smartCompileRegex(newAllowInput.value)
  if (!pat) return
  if (!customAllowList.value.includes(pat)) {
    allowPatternsInput.value = customAllowList.value.length ? `${allowPatternsInput.value.trim()}\n${pat}` : pat
  }
  newAllowInput.value = ''
}

function removeAllowPattern(index: number) {
  const lines = customAllowList.value.slice()
  lines.splice(index, 1)
  allowPatternsInput.value = lines.join('\n')
}

function evaluateForVerb(methodName: string): VerbEvalResult {
  const m = (methodName || 'GET').trim().toUpperCase()
  const isInspected = inspectedMethods.value.includes(m)

  if (!enabled.value) {
    return {
      method: m,
      verdict: 'DISABLED',
      statusTitle: 'Bypassed (RouteWarden disabled)',
      badgeClass: 'verdict-pass',
      statusCode: 200,
      statusText: 'OK (Downstream)',
      reason: 'Middleware is disabled.',
      isInspected
    }
  }

  if (!isInspected) {
    return {
      method: m,
      verdict: 'BYPASS',
      statusTitle: `Bypassed by Verb (${m})`,
      badgeClass: 'verdict-bypass',
      statusCode: 200,
      statusText: 'OK (Passthrough)',
      reason: `HTTP method ${m} is not in inspected methods [${inspectedMethods.value.join(', ')}].`,
      isInspected
    }
  }

  const clientIpRes = resolveEffectiveClientIp(testIp.value, testForwardedFor.value, '', trustedProxiesInput.value)
  const effectiveIp = clientIpRes.effectiveIp

  if (isIpWhitelisted(effectiveIp, allowedIpsInput.value)) {
    const reasonMsg = clientIpRes.usedForwardedHeader
      ? `Client IP ${effectiveIp} (via trusted proxy ${clientIpRes.directPeerIp}) matches allowedIps.`
      : `Client IP ${effectiveIp} matches allowedIps.`
    return {
      method: m,
      verdict: 'BYPASS',
      statusTitle: `Bypassed by IP (${effectiveIp})`,
      badgeClass: 'verdict-bypass',
      statusCode: 200,
      statusText: 'OK (IP Whitelisted)',
      reason: reasonMsg,
      isInspected
    }
  }

  const norm = normalizePath(testPath.value)
  const candidatePaths = norm.candidates.length > 0 ? norm.candidates : [norm.normalized]

  if (enableDefaultAllowPatterns.value) {
    for (const rule of DEFAULT_ALLOW_RULES) {
      for (const cand of candidatePaths) {
        if (matchRegex(rule.pattern, cand)) {
          return {
            method: m,
            verdict: 'ALLOW',
            statusTitle: `Allowed (${rule.category})`,
            badgeClass: 'verdict-allow',
            statusCode: 200,
            statusText: 'OK (Safe Exemption)',
            reason: cand !== norm.normalized
              ? `Matches safe rule: ${rule.pattern} on candidate path '${cand}'`
              : `Matches safe rule: ${rule.pattern}`,
            isInspected
          }
        }
      }
    }
  }

  for (const pat of customAllowList.value) {
    for (const cand of candidatePaths) {
      if (matchRegex(pat, cand)) {
        return {
          method: m,
          verdict: 'ALLOW',
          statusTitle: 'Allowed by allowPatterns',
          badgeClass: 'verdict-allow',
          statusCode: 200,
          statusText: 'OK (Safe Override)',
          reason: cand !== norm.normalized
            ? `Matches custom rule: ${pat} on candidate path '${cand}'`
            : `Matches custom rule: ${pat}`,
          isInspected
        }
      }
    }
  }

  const rawCode = statusCode.value || 403
  let finalCode = rawCode
  let finalStatusText = 'Forbidden'

  if (responseMode.value === 'redirect') {
    finalCode = 302
    finalStatusText = 'Found (Redirect)'
  } else if (responseMode.value === 'rateLimitChallenge') {
    finalCode = 429
    finalStatusText = 'Too Many Requests'
  } else if (responseMode.value === 'fakeSuccess') {
    finalCode = 200
    finalStatusText = 'OK (Decoy)'
  } else if (responseMode.value === 'silentDrop') {
    finalCode = 0
    finalStatusText = 'TCP Reset'
  }

  if (enableDefaultPatterns.value) {
    for (const rule of DEFAULT_BLOCK_RULES) {
      for (const cand of candidatePaths) {
        if (matchRegex(rule.pattern, cand)) {
          return {
            method: m,
            verdict: 'BLOCK',
            statusTitle: `Blocked (${rule.category})`,
            badgeClass: 'verdict-block',
            statusCode: finalCode,
            statusText: finalStatusText,
            reason: cand !== norm.normalized
              ? `Matches built-in pattern: ${rule.pattern} on candidate path '${cand}'`
              : `Matches built-in pattern: ${rule.pattern}`,
            isInspected
          }
        }
      }
    }
  }

  for (const pat of customBlockList.value) {
    for (const cand of candidatePaths) {
      if (matchRegex(pat, cand)) {
        return {
          method: m,
          verdict: 'BLOCK',
          statusTitle: 'Blocked by blockPatterns',
          badgeClass: 'verdict-block',
          statusCode: finalCode,
          statusText: finalStatusText,
          reason: cand !== norm.normalized
            ? `Matches custom pattern: ${pat} on candidate path '${cand}'`
            : `Matches custom pattern: ${pat}`,
          isInspected
        }
      }
    }
  }

  return {
    method: m,
    verdict: 'PASS',
    statusTitle: 'Allowed (Clean Request)',
    badgeClass: 'verdict-pass',
    statusCode: 200,
    statusText: 'OK (Clean Request)',
    reason: 'No patterns matched.',
    isInspected
  }
}

const evaluation = computed(() => {
  const norm = normalizePath(testPath.value)
  const res = evaluateForVerb(testMethod.value)
  return {
    ...res,
    normalizedPath: norm.normalized,
    transformations: norm.transformations,
    candidates: norm.candidates
  }
})

const verbEvaluations = computed(() => {
  const allMethods = Array.from(new Set([...STANDARD_METHODS, ...inspectedMethods.value]))
  return allMethods.map(m => evaluateForVerb(m))
})

const blockRegexGenerated = ref(false)
const allowRegexGenerated = ref(false)

const isBlockRegexDisabled = computed(() => {
  return !newBlockInput.value.trim() && (!testPath.value.trim() || testPath.value.trim() === '/')
})

const isAllowRegexDisabled = computed(() => {
  return !newAllowInput.value.trim() && (!testPath.value.trim() || testPath.value.trim() === '/')
})

function generateBlockRegex() {
  const source = newBlockInput.value.trim() || evaluation.value.normalizedPath || testPath.value.trim()
  if (!source || source === '/') return
  const compiled = smartCompileRegex(source)
  if (compiled) {
    newBlockInput.value = compiled
    blockRegexGenerated.value = true
    setTimeout(() => {
      blockRegexGenerated.value = false
    }, 2500)
  }
}

function generateAllowRegex() {
  const source = newAllowInput.value.trim() || evaluation.value.normalizedPath || testPath.value.trim()
  if (!source || source === '/') return
  const compiled = smartCompileRegex(source)
  if (compiled) {
    newAllowInput.value = compiled
    allowRegexGenerated.value = true
    setTimeout(() => {
      allowRegexGenerated.value = false
    }, 2500)
  }
}

function patternMatchesTest(pattern: string): boolean {
  const cands = evaluation.value.candidates || [evaluation.value.normalizedPath]
  for (const c of cands) {
    if (matchRegex(pattern, c)) return true
  }
  return false
}

// Simulated Response computation
const simulatedResponse = computed(() => {
  const ev = evaluation.value

  if (ev.verdict === 'BYPASS' && !inspectedMethods.value.includes(testMethod.value.toUpperCase())) {
    return {
      statusCode: 200,
      statusText: 'OK (Upstream Passthrough)',
      headers: {
        'Server': 'upstream-backend',
        'X-RouteWarden-Inspected': 'false',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 200,
        message: `HTTP verb ${testMethod.value} is not in inspected methods [${inspectedMethods.value.join(', ')}].`,
        note: 'Request bypassed RouteWarden inspection and was forwarded to upstream backend.',
        path: testPath.value
      }, null, 2),
      note: `HTTP verb ${testMethod.value} is not in inspected methods. RouteWarden immediately passed this request through to the backend service.`
    }
  }

  if (ev.verdict === 'PASS' || ev.verdict === 'ALLOW' || ev.verdict === 'BYPASS' || ev.verdict === 'DISABLED') {
    return {
      statusCode: 200,
      statusText: 'OK (Downstream App)',
      headers: {
        'Server': 'RouteWarden / Upstream App',
        'X-RouteWarden-Verdict': ev.verdict,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: 'Request permitted downstream', path: testPath.value, verdict: ev.verdict }, null, 2),
      note: 'RouteWarden permitted this request to pass downstream.'
    }
  }

  const code = statusCode.value || 403
  const headers: Record<string, string> = {
    'Server': 'RouteWarden',
    'X-RouteWarden-Blocked': 'true',
    'X-Content-Type-Options': 'nosniff'
  }

  if (responseMode.value === 'json') {
    headers['Content-Type'] = 'application/json; charset=utf-8'
    const body = customBody.value || JSON.stringify({ error: 'Forbidden', status: code, message: 'Access denied by RouteWarden security policy' }, null, 2)
    return { statusCode: code, statusText: 'Forbidden', headers, body }
  }

  if (responseMode.value === 'text') {
    headers['Content-Type'] = 'text/plain; charset=utf-8'
    return { statusCode: code, statusText: 'Forbidden', headers, body: customBody.value || 'Forbidden: Access denied by RouteWarden' }
  }

  if (responseMode.value === 'html') {
    headers['Content-Type'] = 'text/html; charset=utf-8'
    return { statusCode: code, statusText: 'Forbidden', headers, body: customBody.value || `<!DOCTYPE html>\n<html>\n<head><title>403 Forbidden</title></head>\n<body><h1>403 Forbidden</h1><p>Access denied by RouteWarden.</p></body>\n</html>` }
  }

  if (responseMode.value === 'xml') {
    headers['Content-Type'] = 'application/xml; charset=utf-8'
    return { statusCode: code, statusText: 'Forbidden', headers, body: customBody.value || `<?xml version="1.0" encoding="UTF-8"?>\n<error>\n  <code>${code}</code>\n  <message>Access Denied</message>\n</error>` }
  }

  if (responseMode.value === 'redirect') {
    headers['Location'] = redirectUrl.value
    return {
      statusCode: 302,
      statusText: 'Found (Redirect)',
      headers,
      body: `Redirecting to ${redirectUrl.value}...`,
      note: 'Client is redirected away to sinkhole or warning URL.'
    }
  }

  if (responseMode.value === 'proxy') {
    headers['X-RouteWarden-Honeypot-Proxy'] = proxyUrl.value
    return {
      statusCode: 200,
      statusText: 'OK (Proxied to Honeypot)',
      headers,
      body: `[Transparently proxying probe to honeypot at ${proxyUrl.value}]`,
      note: 'Probe traffic forwarded to internal honeypot container.'
    }
  }

  if (responseMode.value === 'silentDrop') {
    return {
      statusCode: 0,
      statusText: 'Connection Reset / Dropped',
      headers: {},
      body: '[TCP Connection Terminated Immediately via TCP RST (0 HTTP bytes)]',
      note: 'RouteWarden uses Go http.Hijacker to abruptly terminate the raw TCP socket.'
    }
  }

  if (responseMode.value === 'gzipBomb') {
    headers['Content-Encoding'] = 'gzip'
    headers['Content-Type'] = 'text/html'
    return {
      statusCode: code,
      statusText: 'Forbidden (Decompression Bomb)',
      headers,
      body: `[Binary Gzip Payload: ${gzipBombMB.value} MB compressed -> expands to ~${gzipBombMB.value * 1000} MB in scanner memory]`,
      note: 'Neutralizes automated scanners by consuming gigabytes of RAM during decompression.'
    }
  }

  if (responseMode.value === 'tarpit') {
    headers['Content-Type'] = 'text/plain'
    return {
      statusCode: code,
      statusText: 'Forbidden (Tarpit Delay Active)',
      headers,
      body: `[Tarpit: Streaming 1 byte every ${tarpitDelayMs.value}ms, up to ${tarpitMaxDurationSeconds.value}s max duration]`,
      note: 'Locks connection open and slows down automated dictionary scanners.'
    }
  }

  if (responseMode.value === 'fakeSuccess') {
    headers['Content-Type'] = 'application/json'
    return {
      statusCode: 200,
      statusText: 'OK (Deceptive Honeypot)',
      headers,
      body: customBody.value || JSON.stringify({ status: 'success', data: [], total: 0 }, null, 2),
      note: 'Returns a deceptive HTTP 200 to trick automated vulnerability scanners.'
    }
  }

  if (responseMode.value === 'rateLimitChallenge') {
    headers['Retry-After'] = String(retryAfterSeconds.value)
    headers['Content-Type'] = 'text/plain'
    return {
      statusCode: 429,
      statusText: 'Too Many Requests',
      headers,
      body: `Rate limit challenge: Please retry after ${retryAfterSeconds.value} seconds.`,
      note: 'Instructs client to back off with standard Retry-After header.'
    }
  }

  if (responseMode.value === 'infiniteStream') {
    headers['Content-Type'] = 'application/octet-stream'
    return {
      statusCode: code,
      statusText: 'Forbidden (Infinite Stream)',
      headers,
      body: `[Streaming ${streamSizeMB.value} MB of random pseudo-data stream at chunked intervals]`,
      note: 'Overwhelms scanner buffers with endless junk bytes.'
    }
  }

  if (responseMode.value === 'captcha') {
    headers['Content-Type'] = 'text/html; charset=utf-8'
    return {
      statusCode: code,
      statusText: 'Forbidden (CAPTCHA Challenge)',
      headers,
      body: `[Interactive ${captchaProvider.value} challenge HTML page rendered with siteKey: ${captchaSiteKey.value}]`,
      note: `Presents browser users with a ${captchaProvider.value} verification challenge titled "${captchaTitle.value}".`
    }
  }

  return { statusCode: code, statusText: 'Forbidden', headers, body: 'Access denied' }
})

const generatedSnippet = computed(() => {
  const blockList = customBlockList.value
  const allowList = customAllowList.value
  const ipList = allowedIpsInput.value.split(',').map(s => s.trim()).filter(Boolean)
  const trustedProxiesList = trustedProxiesInput.value.split(',').map(s => s.trim()).filter(Boolean)
  const methodsList = inspectedMethods.value
  const hasCustomMethods = methodsList.length > 0 && !(methodsList.length === 1 && methodsList[0] === 'GET')

  return generateGatewaySnippet({
    snippetFormat: snippetFormat.value,
    enabled: enabled.value,
    debug: debug.value,
    securityLog: securityLog.value,
    enableDefaultPatterns: enableDefaultPatterns.value,
    enableDefaultAllowPatterns: enableDefaultAllowPatterns.value,
    checkQuery: checkQuery.value,
    blockList,
    allowList,
    ipList,
    trustedProxiesList,
    methodsList,
    hasCustomMethods,
    responseMode: responseMode.value,
    statusCode: statusCode.value,
    customBody: customBody.value,
    redirectUrl: redirectUrl.value,
    proxyUrl: proxyUrl.value,
    gzipBombMB: gzipBombMB.value,
    tarpitDelayMs: tarpitDelayMs.value,
    tarpitMaxDurationSeconds: tarpitMaxDurationSeconds.value,
    retryAfterSeconds: retryAfterSeconds.value,
    streamSizeMB: streamSizeMB.value,
    captchaProvider: captchaProvider.value,
    captchaSiteKey: captchaSiteKey.value,
    captchaTitle: captchaTitle.value,
    testMethod: testMethod.value,
    testPath: testPath.value,
    testIp: testIp.value
  })
})

const highlightedSnippet = computed(() => {
  return highlightSnippet(generatedSnippet.value, snippetFormat.value)
})

const formatFilename = computed(() => {
  switch (snippetFormat.value) {
    case 'caddy': return 'Caddyfile'
    case 'nginx': return 'routewarden.conf'
    case 'traefik_yaml': return 'routewarden.yml'
    case 'traefik_toml': return 'routewarden.toml'
    case 'docker': return 'docker-compose.yml'
    case 'k8s':
    case 'k8s_traefik': return 'traefik-middleware.yaml'
    case 'k8s_caddy': return 'caddy-configmap.yaml'
    case 'k8s_nginx': return 'nginx-ingress.yaml'
    case 'cli_json': return 'routewarden.json'
    case 'cli_cmd': return 'terminal'
    default: return 'config'
  }
})

const isCaddyFormat = computed(() => snippetFormat.value === 'caddy' || snippetFormat.value === 'k8s_caddy')
const isNginxFormat = computed(() => snippetFormat.value === 'nginx' || snippetFormat.value === 'k8s_nginx')
const isTraefikFormat = computed(() => snippetFormat.value === 'traefik_yaml' || snippetFormat.value === 'traefik_toml' || snippetFormat.value === 'k8s_traefik' || snippetFormat.value === 'k8s')
const isDockerFormat = computed(() => snippetFormat.value === 'docker')
const isCliFormat = computed(() => snippetFormat.value === 'cli_json' || snippetFormat.value === 'cli_cmd')

// 6. Playground Deeplinking & Shareable URL
const shareFeedback = ref(false)

function buildShareUrl(): string {
  if (typeof window === 'undefined') return ''
  const url = new URL(window.location.href)
  url.search = ''
  url.searchParams.set('playground', 'open')

  if (testPath.value && testPath.value !== '/%252e%252e/.env') {
    url.searchParams.set('path', testPath.value)
  }
  if (testMethod.value && testMethod.value !== 'GET') {
    url.searchParams.set('method', testMethod.value)
  }
  if (testIp.value && testIp.value !== '198.51.100.42') {
    url.searchParams.set('ip', testIp.value)
  }
  if (testForwardedFor.value.trim()) {
    url.searchParams.set('forwardedFor', testForwardedFor.value.trim())
  }
  if (blockPatternsInput.value.trim()) {
    url.searchParams.set('block', blockPatternsInput.value.trim())
  }
  if (allowPatternsInput.value.trim()) {
    url.searchParams.set('allow', allowPatternsInput.value.trim())
  }
  if (!enabled.value) url.searchParams.set('enabled', '0')
  if (debug.value) url.searchParams.set('debug', '1')
  if (!securityLog.value) url.searchParams.set('securityLog', '0')
  if (!enableDefaultPatterns.value) url.searchParams.set('defaultBlock', '0')
  if (!enableDefaultAllowPatterns.value) url.searchParams.set('defaultAllow', '0')
  if (checkQuery.value) url.searchParams.set('checkQuery', '1')
  if (checkHeadersInput.value.trim()) url.searchParams.set('checkHeaders', checkHeadersInput.value.trim())
  if (allowedIpsInput.value.trim() && allowedIpsInput.value.trim() !== '127.0.0.1, 10.0.0.0/8') {
    url.searchParams.set('allowedIps', allowedIpsInput.value.trim())
  }
  if (trustedProxiesInput.value.trim()) {
    url.searchParams.set('trustedProxies', trustedProxiesInput.value.trim())
  }
  if (methodsInput.value.trim() && methodsInput.value.trim() !== 'GET') {
    url.searchParams.set('methods', methodsInput.value.trim())
  }
  if (responseMode.value !== 'json') url.searchParams.set('mode', responseMode.value)
  if (statusCode.value !== 403) url.searchParams.set('status', String(statusCode.value))
  if (customBody.value.trim()) url.searchParams.set('body', customBody.value.trim())
  if (responseMode.value === 'redirect' && redirectUrl.value) url.searchParams.set('redirectUrl', redirectUrl.value)
  if (responseMode.value === 'proxy' && proxyUrl.value) url.searchParams.set('proxyUrl', proxyUrl.value)
  if (responseMode.value === 'gzipBomb' && gzipBombMB.value !== 10) url.searchParams.set('gzipMB', String(gzipBombMB.value))
  if (responseMode.value === 'tarpit') {
    if (tarpitDelayMs.value !== 1000) url.searchParams.set('tarpitDelay', String(tarpitDelayMs.value))
    if (tarpitMaxDurationSeconds.value !== 60) url.searchParams.set('tarpitDuration', String(tarpitMaxDurationSeconds.value))
  }
  if (responseMode.value === 'rateLimitChallenge' && retryAfterSeconds.value !== 300) {
    url.searchParams.set('retryAfter', String(retryAfterSeconds.value))
  }
  if (responseMode.value === 'infiniteStream' && streamSizeMB.value !== 50) {
    url.searchParams.set('streamMB', String(streamSizeMB.value))
  }
  if (responseMode.value === 'captcha') {
    if (captchaProvider.value !== 'turnstile') url.searchParams.set('captchaProvider', captchaProvider.value)
    if (captchaSiteKey.value) url.searchParams.set('captchaKey', captchaSiteKey.value)
    if (captchaTitle.value) url.searchParams.set('captchaTitle', captchaTitle.value)
  }
  if (snippetFormat.value !== 'caddy') {
    url.searchParams.set('format', snippetFormat.value)
  }

  return url.toString()
}

async function copyShareLink() {
  try {
    const url = buildShareUrl()
    if (!url) return
    await navigator.clipboard.writeText(url)
    shareFeedback.value = true
    trackPlaygroundEvent('copy_share_link', { format: snippetFormat.value, mode: responseMode.value })
    setTimeout(() => {
      shareFeedback.value = false
    }, 2500)
  } catch {}
}

onMounted(() => {
  if (typeof window === 'undefined') return

  try {
    const params = new URLSearchParams(window.location.search)
    if (!window.location.search || window.location.search === '?') return

    const pPath = params.get('path') || params.get('url')
    if (pPath) testPath.value = pPath

    const pMethod = params.get('method')
    if (pMethod) testMethod.value = pMethod.toUpperCase()

    const pIp = params.get('ip')
    if (pIp) testIp.value = pIp

    const pForwarded = params.get('forwardedFor') || params.get('xff')
    if (pForwarded) testForwardedFor.value = pForwarded

    const pBlock = params.get('block') || params.get('blockPatterns') || params.get('pathPatterns')
    if (pBlock) blockPatternsInput.value = pBlock

    const pAllow = params.get('allow') || params.get('allowPatterns')
    if (pAllow) allowPatternsInput.value = pAllow

    if (params.has('enabled')) {
      enabled.value = params.get('enabled') !== '0' && params.get('enabled') !== 'false'
    }
    if (params.has('debug')) {
      debug.value = params.get('debug') === '1' || params.get('debug') === 'true'
    }
    if (params.has('securityLog')) {
      securityLog.value = params.get('securityLog') !== '0' && params.get('securityLog') !== 'false'
    }
    if (params.has('defaultBlock')) {
      enableDefaultPatterns.value = params.get('defaultBlock') !== '0' && params.get('defaultBlock') !== 'false'
    }
    if (params.has('defaultAllow')) {
      enableDefaultAllowPatterns.value = params.get('defaultAllow') !== '0' && params.get('defaultAllow') !== 'false'
    }
    if (params.has('checkQuery')) {
      checkQuery.value = params.get('checkQuery') === '1' || params.get('checkQuery') === 'true'
    }
    if (params.has('checkHeaders')) {
      checkHeadersInput.value = params.get('checkHeaders') || ''
    }
    if (params.has('allowedIps')) {
      allowedIpsInput.value = params.get('allowedIps') || ''
    }
    if (params.has('trustedProxies') || params.has('proxies')) {
      trustedProxiesInput.value = params.get('trustedProxies') || params.get('proxies') || ''
    }
    if (params.has('methods')) {
      methodsInput.value = params.get('methods') || 'GET'
    }

    const pMode = params.get('mode')
    const validModes: ResponseMode[] = [
      'json', 'html', 'text', 'xml', 'redirect', 'captcha',
      'silentDrop', 'gzipBomb', 'tarpit', 'fakeSuccess',
      'rateLimitChallenge', 'proxy', 'infiniteStream'
    ]
    if (pMode && validModes.includes(pMode as ResponseMode)) {
      responseMode.value = pMode as ResponseMode
    }

    if (params.has('status')) {
      const code = parseInt(params.get('status') || '', 10)
      if (!isNaN(code)) statusCode.value = code
    }

    if (params.has('body')) customBody.value = params.get('body') || ''
    if (params.has('redirectUrl')) redirectUrl.value = params.get('redirectUrl') || ''
    if (params.has('proxyUrl')) proxyUrl.value = params.get('proxyUrl') || ''
    if (params.has('gzipMB')) {
      const mb = parseInt(params.get('gzipMB') || '', 10)
      if (!isNaN(mb)) gzipBombMB.value = mb
    }
    if (params.has('tarpitDelay')) {
      const d = parseInt(params.get('tarpitDelay') || '', 10)
      if (!isNaN(d)) tarpitDelayMs.value = d
    }
    if (params.has('tarpitDuration')) {
      const dur = parseInt(params.get('tarpitDuration') || '', 10)
      if (!isNaN(dur)) tarpitMaxDurationSeconds.value = dur
    }
    if (params.has('retryAfter')) {
      const ra = parseInt(params.get('retryAfter') || '', 10)
      if (!isNaN(ra)) retryAfterSeconds.value = ra
    }
    if (params.has('streamMB')) {
      const sm = parseInt(params.get('streamMB') || '', 10)
      if (!isNaN(sm)) streamSizeMB.value = sm
    }
    if (params.has('captchaProvider')) {
      const prov = params.get('captchaProvider')
      if (prov === 'turnstile' || prov === 'hcaptcha' || prov === 'recaptcha') {
        captchaProvider.value = prov
      }
    }
    if (params.has('captchaKey')) captchaSiteKey.value = params.get('captchaKey') || ''
    if (params.has('captchaTitle')) captchaTitle.value = params.get('captchaTitle') || ''

    const pFmt = params.get('format')
    if (pFmt && ['caddy', 'nginx', 'traefik_yaml', 'traefik_toml', 'docker', 'k8s_traefik', 'k8s_caddy', 'k8s_nginx', 'k8s', 'cli_json', 'cli_cmd'].includes(pFmt)) {
      snippetFormat.value = pFmt as any
    }
  } catch (err) {
    console.error('Failed to parse URL query params in RouteWarden playground:', err)
  }
})
</script>

<template>
  <div class="rw-simple-tool">
    <!-- 1. Input & Live Verdict Strip -->
    <RequestInputStrip
      v-model:testMethod="testMethod"
      v-model:testPath="testPath"
      v-model:testIp="testIp"
      v-model:testForwardedFor="testForwardedFor"
      :evaluation="evaluation"
      :shareFeedback="shareFeedback"
      @apply-preset="applyPreset"
      @copy-share="copyShareLink"
    />

    <!-- 2 & 3. Patterns: Block & Allow side-by-side -->
    <div class="rw-patterns-row">
      <!-- 2. Block Patterns (Red Theme) -->
      <PatternColumn
        title="Block Patterns"
        theme="block"
        :patterns="customBlockList"
        v-model:newPatternInput="newBlockInput"
        placeholder="/admin/*, *.sql, .env..."
        :isRegexDisabled="isBlockRegexDisabled"
        :regexGenerated="blockRegexGenerated"
        :patternMatchesTest="patternMatchesTest"
        @add="addNewBlockPattern"
        @remove="removeBlockPattern"
        @generate-regex="generateBlockRegex"
      />

      <!-- 3. Allow Patterns (Green Theme) -->
      <PatternColumn
        title="Allow Patterns"
        theme="allow"
        :patterns="customAllowList"
        v-model:newPatternInput="newAllowInput"
        placeholder="/api/health, /public/*..."
        :isRegexDisabled="isAllowRegexDisabled"
        :regexGenerated="allowRegexGenerated"
        :patternMatchesTest="patternMatchesTest"
        @add="addNewAllowPattern"
        @remove="removeAllowPattern"
        @generate-regex="generateAllowRegex"
      />
    </div>

    <!-- 4. Built-in Flags & IPs -->
    <OptionsPanel
      v-model:enableDefaultPatterns="enableDefaultPatterns"
      v-model:enableDefaultAllowPatterns="enableDefaultAllowPatterns"
      v-model:checkQuery="checkQuery"
      v-model:enabled="enabled"
      v-model:debug="debug"
      v-model:securityLog="securityLog"
      v-model:checkHeadersInput="checkHeadersInput"
      v-model:allowedIpsInput="allowedIpsInput"
      v-model:trustedProxiesInput="trustedProxiesInput"
      v-model:methodsInput="methodsInput"
      :inspectedMethods="inspectedMethods"
      :allStandardMethodsSelected="allStandardMethodsSelected"
      @toggle-method="toggleInspectedMethod"
      @toggle-all="toggleAllMethods"
    />

    <!-- 5. Response Configuration & Simulated Output -->
    <ResponseOptionsPanel
      v-model:responseMode="responseMode"
      v-model:statusCode="statusCode"
      v-model:customBody="customBody"
      v-model:redirectUrl="redirectUrl"
      v-model:proxyUrl="proxyUrl"
      v-model:gzipBombMB="gzipBombMB"
      v-model:tarpitDelayMs="tarpitDelayMs"
      v-model:tarpitMaxDurationSeconds="tarpitMaxDurationSeconds"
      v-model:retryAfterSeconds="retryAfterSeconds"
      v-model:streamSizeMB="streamSizeMB"
      v-model:captchaProvider="captchaProvider"
      v-model:captchaSiteKey="captchaSiteKey"
      v-model:captchaTitle="captchaTitle"
      v-model:testMethod="testMethod"
      :verbEvaluations="verbEvaluations"
    />

    <!-- Differentiated Copyable HTTP Output Card -->
    <SimulatedResponseCard
      :response="simulatedResponse"
      :evaluation="evaluation"
      :testMethod="testMethod"
    />

    <!-- 6. Generated Gateway Configuration -->
    <ExportEditorCard
      v-model:selectedGateway="selectedGateway"
      v-model:snippetFormat="snippetFormat"
      :gateways="playgroundGateways"
      :gatewayTabs="gatewayTabs"
      :formatFilename="formatFilename"
      :highlightedSnippet="highlightedSnippet"
      :rawSnippet="generatedSnippet"
      :isCaddyFormat="isCaddyFormat"
      :isNginxFormat="isNginxFormat"
      :isTraefikFormat="isTraefikFormat"
      :isDockerFormat="isDockerFormat"
      :isCliFormat="isCliFormat"
    />
  </div>
</template>

<style scoped>
.rw-simple-tool {
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  font-size: 13px;
  color: var(--vp-c-text-1);
  padding: 0.25rem 0 calc(2rem + env(safe-area-inset-bottom, 0px));
}

.rw-simple-tool *, .rw-simple-tool *::before, .rw-simple-tool *::after {
  box-sizing: border-box;
}

/* Patterns Row: 2-Column Side-by-Side */
.rw-patterns-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr));
  gap: 0.85rem;
  width: 100%;
  min-width: 0;
  container-type: inline-size;
}

@container (max-width: 720px) {
  .rw-patterns-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .rw-patterns-row {
    grid-template-columns: 1fr;
  }
}
</style>
