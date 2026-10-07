import test from 'node:test'
import assert from 'node:assert/strict'
import {
  extractCandidatePaths,
  isIpWhitelisted,
  isIpTrustedProxy,
  resolveEffectiveClientIp,
  matchRegex,
  escapeRegex,
  smartCompileRegex
} from '../docs/.vitepress/theme/components/playground/engine.ts'
import {
  DEFAULT_BLOCK_RULES,
  DEFAULT_ALLOW_RULES,
  PRESETS,
  STANDARD_METHODS
} from '../docs/.vitepress/theme/components/playground/rules.ts'
import { generateGatewaySnippet } from '../docs/.vitepress/theme/components/playground/generator.ts'

// Pure evaluator mirroring PatternChecker.vue's evaluateForVerb
function evaluateRequest(options) {
  const {
    enabled = true,
    inspectedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD'],
    testMethod = 'GET',
    testPath = '/',
    testIp = '203.0.113.1',
    testForwardedFor = '',
    trustedProxiesInput = '',
    allowedIpsInput = '',
    enableDefaultAllowPatterns = true,
    customAllowList = [],
    enableDefaultPatterns = true,
    customBlockList = [],
    checkQuery = false,
    responseMode = 'json',
    statusCode = 403
  } = options

  const m = (testMethod || 'GET').trim().toUpperCase()
  const isInspected = inspectedMethods.includes(m)

  if (!enabled) {
    return { verdict: 'DISABLED', statusCode: 200 }
  }

  if (!isInspected) {
    return { verdict: 'BYPASS', statusCode: 200, reason: 'Method uninspected' }
  }

  const clientIpRes = resolveEffectiveClientIp(testIp, testForwardedFor, '', trustedProxiesInput)
  const effectiveIp = clientIpRes.effectiveIp

  if (isIpWhitelisted(effectiveIp, allowedIpsInput)) {
    return {
      verdict: 'BYPASS',
      statusCode: 200,
      reason: 'IP whitelisted',
      effectiveIp,
      clientIpRes
    }
  }

  const norm = extractCandidatePaths(testPath, checkQuery)
  const candidatePaths = norm.candidates.length > 0 ? norm.candidates : [norm.normalized]

  if (enableDefaultAllowPatterns) {
    for (const rule of DEFAULT_ALLOW_RULES) {
      for (const cand of candidatePaths) {
        if (matchRegex(rule.pattern, cand)) {
          return { verdict: 'ALLOW', statusCode: 200, ruleId: rule.id }
        }
      }
    }
  }

  for (const pat of customAllowList) {
    for (const cand of candidatePaths) {
      if (matchRegex(pat, cand)) {
        return { verdict: 'ALLOW', statusCode: 200, customPattern: pat }
      }
    }
  }

  let finalCode = statusCode || 403
  if (responseMode === 'redirect') finalCode = 302
  else if (responseMode === 'rateLimitChallenge') finalCode = 429
  else if (responseMode === 'fakeSuccess') finalCode = 200
  else if (responseMode === 'silentDrop') finalCode = 0

  if (enableDefaultPatterns) {
    for (const rule of DEFAULT_BLOCK_RULES) {
      for (const cand of candidatePaths) {
        if (matchRegex(rule.pattern, cand)) {
          return { verdict: 'BLOCK', statusCode: finalCode, ruleId: rule.id }
        }
      }
    }
  }

  for (const pat of customBlockList) {
    for (const cand of candidatePaths) {
      if (matchRegex(pat, cand)) {
        return { verdict: 'BLOCK', statusCode: finalCode, customPattern: pat }
      }
    }
  }

  return { verdict: 'PASS', statusCode: 200 }
}

const DEFAULT_SNIPPET_OPTS = {
  snippetFormat: 'traefik_yaml',
  enabled: true,
  debug: false,
  securityLog: true,
  enableDefaultPatterns: true,
  enableDefaultAllowPatterns: true,
  checkQuery: false,
  blockList: ['(?i)^/admin'],
  allowList: ['(?i)^/\\.well-known'],
  ipList: ['10.0.0.0/8'],
  methodsList: ['GET', 'POST'],
  hasCustomMethods: true,
  responseMode: 'json',
  statusCode: 403,
  customBody: '{"error":"Access Denied"}',
  redirectUrl: 'https://example.com/blocked',
  proxyUrl: 'http://honeypot:8080',
  gzipBombMB: 10,
  tarpitDelayMs: 5000,
  tarpitMaxDurationSeconds: 30,
  retryAfterSeconds: 60,
  streamSizeMB: 100,
  captchaProvider: 'turnstile',
  captchaSiteKey: '0x4AAAAAA',
  captchaTitle: 'Security Verification',
  testMethod: 'GET',
  testPath: '/.env',
  testIp: '198.51.100.42'
}

test('playground engine & generator: comprehensive test matrix (100+ cases)', async (t) => {
  // ==========================================
  // Section 1: Built-in Block Rules Detection (10 rules x 3 attack vectors = 30 tests)
  // ==========================================
  await t.test('Section 1: Default Block Rules Matrix', async (st) => {
    const vectors = [
      // 1. block-env (.env and config files)
      { ruleId: 'block-env', path: '/.env', expected: 'BLOCK' },
      { ruleId: 'block-env', path: '/sub/.env.production', expected: 'BLOCK' },
      { ruleId: 'block-env', path: '/database.backup.sql', expected: 'BLOCK' },
      { ruleId: 'block-env', path: '/config.ini', expected: 'BLOCK' },
      // 2. block-vcs (.git, .svn, .hg)
      { ruleId: 'block-vcs', path: '/.git/HEAD', expected: 'BLOCK' },
      { ruleId: 'block-vcs', path: '/.svn/entries', expected: 'BLOCK' },
      { ruleId: 'block-vcs', path: '/project/.hg/store', expected: 'BLOCK' },
      // 3. block-cloud (.aws, .ssh, .kube, .docker)
      { ruleId: 'block-cloud', path: '/.aws/credentials', expected: 'BLOCK' },
      { ruleId: 'block-cloud', path: '/.ssh/id_rsa', expected: 'BLOCK' },
      { ruleId: 'block-cloud', path: '/.kube/config', expected: 'BLOCK' },
      { ruleId: 'block-cloud', path: '/.docker/config.json', expected: 'BLOCK' },
      // 4. block-archives
      { ruleId: 'block-archives', path: '/dump.tar.gz', expected: 'BLOCK' },
      { ruleId: 'block-archives', path: '/backup.zip', expected: 'BLOCK' },
      { ruleId: 'block-archives', path: '/db.sqlite3', expected: 'BLOCK' },
      // 5. block-admin
      { ruleId: 'block-admin', path: '/phpinfo.php', expected: 'BLOCK' },
      { ruleId: 'block-admin', path: '/server-status', expected: 'BLOCK' },
      { ruleId: 'block-admin', path: '/actuator/health', expected: 'BLOCK' },
      { ruleId: 'block-admin', path: '/actuator/env', expected: 'BLOCK' },
      // 6. block-packages
      { ruleId: 'block-packages', path: '/package-lock.json', expected: 'BLOCK' },
      { ruleId: 'block-packages', path: '/composer.lock', expected: 'BLOCK' },
      { ruleId: 'block-packages', path: '/Pipfile.lock', expected: 'BLOCK' },
      { ruleId: 'block-packages', path: '/yarn.lock', expected: 'BLOCK' },
      // 7. block-keys
      { ruleId: 'block-keys', path: '/server.pem', expected: 'BLOCK' },
      { ruleId: 'block-keys', path: '/cert.key', expected: 'BLOCK' },
      { ruleId: 'block-keys', path: '/keystore.p12', expected: 'BLOCK' },
      // 8. block-container
      { ruleId: 'block-container', path: '/Dockerfile', expected: 'BLOCK' },
      { ruleId: 'block-container', path: '/Dockerfile.dev', expected: 'BLOCK' },
      { ruleId: 'block-container', path: '/sub/Dockerfile.prod', expected: 'BLOCK' },
      // 9. block-metadata
      { ruleId: 'block-metadata', path: '/.DS_Store', expected: 'BLOCK' },
      // 10. block-cms-configs
      { ruleId: 'block-cms-configs', path: '/wp-config.php', expected: 'BLOCK' },
      { ruleId: 'block-cms-configs', path: '/configuration.php', expected: 'BLOCK' },
      { ruleId: 'block-cms-configs', path: '/local_settings.py', expected: 'BLOCK' }
    ]

    for (const v of vectors) {
      await st.test(`blocks ${v.path} via ${v.ruleId}`, () => {
        const res = evaluateRequest({ testPath: v.path })
        assert.equal(res.verdict, v.expected)
        assert.equal(res.ruleId, v.ruleId)
      })
    }
  })

  // ==========================================
  // Section 2: Anti-Evasion Attack Vectors (20 tests)
  // ==========================================
  await t.test('Section 2: Anti-Evasion Bypass Resiliency', async (st) => {
    const evasionVectors = [
      { name: 'Double percent-encoded dot', raw: '/%252e%252e/.env' },
      { name: 'Triple percent-encoded dot', raw: '/%25252e%25252e/.env' },
      { name: 'Encoded slash %2f', raw: '/app%2f.env' },
      { name: 'Semicolon matrix param jsessionid', raw: '/context;jsessionid=xyz/.env' },
      { name: 'Semicolon multiple params', raw: '/ctx;p1=1;p2=2/.git/HEAD' },
      { name: 'Windows backslash root', raw: '\\.env' },
      { name: 'Windows backslash deep path', raw: '\\var\\www\\.aws\\credentials' },
      { name: 'Mixed forward and backslashes', raw: '/public\\..\\private\\id_rsa.key' },
      { name: 'Directory traversal upward', raw: '/public/images/../../.env' },
      { name: 'Directory traversal with current dir dots', raw: '/././sub/./.git/config' },
      { name: 'Null byte injection (%00)', raw: '/.env%00.jpg' },
      { name: 'Raw null byte injection (\\0)', raw: '/.env\0.png' },
      { name: 'Uppercase extension bypass (.ENV)', raw: '/project/.ENV' },
      { name: 'Mixed case extension (.SqL)', raw: '/database.SqL' },
      { name: 'Query parameter evasion without checkQuery', raw: '/search?file=/.env' },
      { name: 'Query parameter evasion with checkQuery', raw: '/search?file=/.env', checkQuery: true, shouldBlock: true },
      { name: 'Encoded traversal %2e%2e%2f', raw: '/%2e%2e%2f.git/HEAD' },
      { name: 'Repeated slashes', raw: '///.env' },
      { name: 'Trailing slash on sensitive folder', raw: '/.git/' },
      { name: 'Matrix param with traversal', raw: '/static;v=1/../.env' }
    ]

    for (const ev of evasionVectors) {
      await st.test(`defeats ${ev.name}: ${ev.raw}`, () => {
        const res = evaluateRequest({
          testPath: ev.raw,
          checkQuery: !!ev.checkQuery
        })
        if (ev.shouldBlock) {
          assert.equal(res.verdict, 'BLOCK')
        } else if (ev.name.includes('without checkQuery')) {
          assert.equal(res.verdict, 'PASS')
        } else {
          assert.equal(res.verdict, 'BLOCK')
        }
      })
    }
  })

  // ==========================================
  // Section 3: Safe Allow Rules & Whitelist Overrides (15 tests)
  // ==========================================
  await t.test('Section 3: Safe Allow Rules and Custom AllowPatterns', async (st) => {
    const allowVectors = [
      { path: '/robots.txt', expected: 'ALLOW', ruleId: 'allow-robots' },
      { path: '/sitemap.xml', expected: 'ALLOW', ruleId: 'allow-sitemap' },
      { path: '/sitemap_index.xml', expected: 'ALLOW', ruleId: 'allow-sitemap' },
      { path: '/ads.txt', expected: 'ALLOW', ruleId: 'allow-ads' },
      { path: '/security.txt', expected: 'ALLOW', ruleId: 'allow-security' },
      { path: '/.well-known/security.txt', expected: 'ALLOW', ruleId: 'allow-wellknown' },
      { path: '/.well-known/acme-challenge/test-token', expected: 'ALLOW', ruleId: 'allow-wellknown' },
      { path: '/.well-known/openid-configuration', expected: 'ALLOW', ruleId: 'allow-wellknown' }
    ]

    for (const av of allowVectors) {
      await st.test(`allows RFC/safe path ${av.path}`, () => {
        const res = evaluateRequest({ testPath: av.path })
        assert.equal(res.verdict, av.expected)
        assert.equal(res.ruleId, av.ruleId)
      })
    }

    // Custom allow overrides
    await st.test('custom allow pattern overrides built-in block rule', () => {
      const res = evaluateRequest({
        testPath: '/public/sample.sql',
        customAllowList: ['^/public/.*\\.sql$']
      })
      assert.equal(res.verdict, 'ALLOW')
      assert.equal(res.customPattern, '^/public/.*\\.sql$')
    })

    await st.test('disabling default allow rules allows block rules to catch them if matched', () => {
      const res = evaluateRequest({
        testPath: '/robots.txt',
        enableDefaultAllowPatterns: false,
        customBlockList: ['^/robots\\.txt$']
      })
      assert.equal(res.verdict, 'BLOCK')
    })
  })

  // ==========================================
  // Section 4: All 13 RouteWarden Response Modes (13 tests)
  // ==========================================
  await t.test('Section 4: Response Modes Status Code Verification', async (st) => {
    const modes = [
      { mode: 'json', expectedCode: 403 },
      { mode: 'html', expectedCode: 403 },
      { mode: 'text', expectedCode: 403 },
      { mode: 'xml', expectedCode: 403 },
      { mode: 'redirect', expectedCode: 302 },
      { mode: 'captcha', expectedCode: 403 },
      { mode: 'silentDrop', expectedCode: 0 },
      { mode: 'gzipBomb', expectedCode: 403 },
      { mode: 'tarpit', expectedCode: 403 },
      { mode: 'fakeSuccess', expectedCode: 200 },
      { mode: 'rateLimitChallenge', expectedCode: 429 },
      { mode: 'proxy', expectedCode: 403 },
      { mode: 'infiniteStream', expectedCode: 403 }
    ]

    for (const m of modes) {
      await st.test(`mode "${m.mode}" evaluates with status code ${m.expectedCode}`, () => {
        const res = evaluateRequest({
          testPath: '/.env',
          responseMode: m.mode,
          statusCode: 403
        })
        assert.equal(res.verdict, 'BLOCK')
        assert.equal(res.statusCode, m.expectedCode)
      })
    }

    // Custom status code override (e.g. 404 Not Found stealth)
    await st.test('custom status code 404 replaces default 403 for json mode', () => {
      const res = evaluateRequest({
        testPath: '/.env',
        responseMode: 'json',
        statusCode: 404
      })
      assert.equal(res.verdict, 'BLOCK')
      assert.equal(res.statusCode, 404)
    })
  })

  // ==========================================
  // Section 5: HTTP Method Filtering (8 tests)
  // ==========================================
  await t.test('Section 5: HTTP Method Inspection Verification', async (st) => {
    for (const method of STANDARD_METHODS) {
      await st.test(`method ${method} blocks when in inspected methods`, () => {
        const res = evaluateRequest({
          testMethod: method,
          inspectedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
          testPath: '/.env'
        })
        assert.equal(res.verdict, 'BLOCK')
      })
    }

    await st.test('method POST bypasses when only GET is inspected', () => {
      const res = evaluateRequest({
        testMethod: 'POST',
        inspectedMethods: ['GET'],
        testPath: '/.env'
      })
      assert.equal(res.verdict, 'BYPASS')
      assert.equal(res.statusCode, 200)
    })
  })

  // ==========================================
  // Section 6: IP Whitelisting & Subnet Range Checks (12 tests)
  // ==========================================
  await t.test('Section 6: IP Whitelisting and CIDR Calculation', async (st) => {
    const list = '127.0.0.1, 10.0.0.0/8, 172.16.0.0/12, 192.168.1.0/24'

    const ipChecks = [
      { ip: '127.0.0.1', expectedMatch: true },
      { ip: '127.0.0.2', expectedMatch: false },
      { ip: '10.5.20.1', expectedMatch: true },
      { ip: '11.0.0.1', expectedMatch: false },
      { ip: '172.16.5.1', expectedMatch: true },
      { ip: '172.31.255.254', expectedMatch: true },
      { ip: '172.32.0.1', expectedMatch: false },
      { ip: '192.168.1.100', expectedMatch: true },
      { ip: '192.168.2.100', expectedMatch: false },
      { ip: '0.0.0.0', expectedMatch: false }
    ]

    for (const c of ipChecks) {
      await st.test(`ipInSubnet check for ${c.ip} -> ${c.expectedMatch}`, () => {
        assert.equal(isIpWhitelisted(c.ip, list), c.expectedMatch)
        const res = evaluateRequest({
          testIp: c.ip,
          allowedIpsInput: list,
          testPath: '/.env'
        })
        if (c.expectedMatch) {
          assert.equal(res.verdict, 'BYPASS')
        } else {
          assert.equal(res.verdict, 'BLOCK')
        }
      })
    }
  })

  // ==========================================
  // Section 7: Smart Compile Regex Heuristics (10 tests)
  // ==========================================
  await t.test('Section 7: Smart RE2 Pattern Compiler', async (st) => {
    const testCases = [
      { input: '*.env', testStr: '/project/.env', shouldMatch: true },
      { input: '*.sql, *.bak', testStr: '/database.bak', shouldMatch: true },
      { input: '*.sql, *.bak', testStr: '/database.sql', shouldMatch: true },
      { input: '*.sql, *.bak', testStr: '/database.safe', shouldMatch: false },
      { input: '.git', testStr: '/sub/.git/config', shouldMatch: true },
      { input: '/admin/*', testStr: '/admin/dashboard', shouldMatch: true },
      { input: '/admin/*', testStr: '/api/v1/users', shouldMatch: false },
      { input: '/login.php', testStr: '/login.php', shouldMatch: true },
      { input: '*', testStr: '/anything/goes', shouldMatch: true },
      { input: '(?i)^/custom/.*', testStr: '/CUSTOM/TEST', shouldMatch: true }
    ]

    for (const tc of testCases) {
      await st.test(`compiles "${tc.input}" to test "${tc.testStr}"`, () => {
        const pattern = smartCompileRegex(tc.input)
        assert.ok(pattern.length > 0)
        assert.equal(matchRegex(pattern, tc.testStr), tc.shouldMatch)
      })
    }
  })

  // ==========================================
  // Section 8: Gateway Config Snippet Generator All Formats (10 formats x 2 options = 20 tests)
  // ==========================================
  await t.test('Section 8: Gateway Snippet Generator Across All Formats', async (st) => {
    const formats = [
      { format: 'traefik_yaml', key: 'plugin:', altKey: 'routewarden:' },
      { format: 'traefik_toml', key: '[http.middlewares', altKey: 'plugin.routewarden' },
      { format: 'docker', key: 'traefik.http.middlewares', altKey: 'labels:' },
      { format: 'caddy', key: 'route_warden', altKey: 'reverse_proxy' },
      { format: 'nginx', key: 'resty.routewarden', altKey: 'init_by_lua_block' },
      { format: 'k8s_traefik', key: 'traefik.io/v1alpha1', altKey: 'kind: Middleware' },
      { format: 'k8s_caddy', key: 'caddy-config', altKey: 'route_warden' },
      { format: 'k8s_nginx', key: 'networking.k8s.io/v1', altKey: 'nginx.ingress.kubernetes.io' },
      { format: 'cli_cmd', key: 'rwarden test', altKey: '--method' },
      { format: 'cli_json', key: 'https://routewarden.github.io/schema.json', altKey: 'blockPatterns' }
    ]

    for (const f of formats) {
      await st.test(`generates valid snippet for format: ${f.format}`, () => {
        const code = generateGatewaySnippet({
          ...DEFAULT_SNIPPET_OPTS,
          snippetFormat: f.format
        })
        assert.ok(code.length > 0, `Generated snippet for ${f.format} should not be empty`)
        assert.ok(code.includes(f.key), `Snippet for ${f.format} should contain "${f.key}"`)
        assert.ok(code.includes(f.altKey), `Snippet for ${f.format} should contain "${f.altKey}"`)
      })

      // Test with middleware disabled (except cli_cmd which is offline runner)
      if (f.format !== 'cli_cmd') {
        await st.test(`generates disabled config for format: ${f.format}`, () => {
          const code = generateGatewaySnippet({
            ...DEFAULT_SNIPPET_OPTS,
            enabled: false,
            snippetFormat: f.format
          })
          assert.ok(code.toLowerCase().includes('false'), `Snippet for ${f.format} should reflect disabled status`)
        })
      }
    }
  })

  // ==========================================
  // Section 9: Presets Sanity Check (10 tests)
  // ==========================================
  await t.test('Section 9: Built-in Playground Presets Verification', async (st) => {
    for (const preset of PRESETS) {
      await st.test(`preset "${preset.label}" (${preset.path}) behaves as expected`, () => {
        const res = evaluateRequest({
          testMethod: preset.method,
          testPath: preset.path,
          testIp: preset.ip,
          testForwardedFor: preset.xForwardedFor || '',
          trustedProxiesInput: preset.trustedProxies || '',
          allowedIpsInput: '10.5.0.0/16' // For IP Bypass preset testing
        })

        if (preset.label === 'robots.txt' || preset.label === '.well-known') {
          assert.equal(res.verdict, 'ALLOW')
        } else if (preset.label === 'IP Bypass') {
          assert.equal(res.verdict, 'BYPASS')
        } else {
          assert.equal(res.verdict, 'BLOCK')
        }
      })
    }
  })

  // ========================================================
  // Section 10: Trusted Proxies Client IP Resolution Engine
  // ========================================================
  await t.test('Section 10: Trusted Proxies IP Resolution Engine', async (st) => {
    await st.test('isIpTrustedProxy validates exact IPs and CIDR ranges', () => {
      const trustedConfig = '10.0.0.0/8, 172.16.0.0/12, 192.168.1.100, 2001:db8::/32'

      assert.equal(isIpTrustedProxy('10.1.2.3', trustedConfig), true)
      assert.equal(isIpTrustedProxy('172.20.5.1', trustedConfig), true)
      assert.equal(isIpTrustedProxy('192.168.1.100', trustedConfig), true)
      assert.equal(isIpTrustedProxy('192.168.1.101', trustedConfig), false)
      assert.equal(isIpTrustedProxy('203.0.113.195', trustedConfig), false)
      assert.equal(isIpTrustedProxy('2001:db8:1::1', trustedConfig), true)
      assert.equal(isIpTrustedProxy('2001:db9::1', trustedConfig), false)
    })

    await st.test('Legacy mode: without trustedProxies configured, XFF is trusted', () => {
      const res = resolveEffectiveClientIp('198.51.100.42', '203.0.113.50, 10.0.0.1', '', '')
      assert.equal(res.effectiveIp, '203.0.113.50')
      assert.equal(res.usedForwardedHeader, true)
      assert.equal(res.directPeerIp, '198.51.100.42')
    })

    await st.test('Legacy mode: uses X-Real-IP if XFF is empty', () => {
      const res = resolveEffectiveClientIp('198.51.100.42', '', '203.0.113.99', '')
      assert.equal(res.effectiveIp, '203.0.113.99')
      assert.equal(res.usedForwardedHeader, true)
    })

    await st.test('Trusted proxy mode: honours XFF from trusted peer CIDR', () => {
      const res = resolveEffectiveClientIp('10.0.5.12:44321', '198.51.100.77, 10.0.5.1', '', '10.0.0.0/8')
      assert.equal(res.effectiveIp, '198.51.100.77')
      assert.equal(res.isTrustedProxy, true)
      assert.equal(res.usedForwardedHeader, true)
      assert.equal(res.directPeerIp, '10.0.5.12')
    })

    await st.test('Trusted proxy mode: ignores spoofed XFF from untrusted peer', () => {
      // Attacker at 198.51.100.42 sends XFF claiming to be whitelisted 10.5.0.25
      const res = resolveEffectiveClientIp('198.51.100.42', '10.5.0.25', '', '10.0.0.0/8')
      assert.equal(res.effectiveIp, '198.51.100.42')
      assert.equal(res.isTrustedProxy, false)
      assert.equal(res.usedForwardedHeader, false)
      assert.ok(res.reason.includes('untrusted'))
    })

    await st.test('Trusted proxy mode: ignores spoofed X-Real-IP from untrusted peer', () => {
      const res = resolveEffectiveClientIp('198.51.100.42', '', '127.0.0.1', '10.0.0.0/8')
      assert.equal(res.effectiveIp, '198.51.100.42')
      assert.equal(res.isTrustedProxy, false)
      assert.equal(res.usedForwardedHeader, false)
    })

    await st.test('Trusted proxy mode: falls back to direct peer when trusted proxy provides no forwarding headers', () => {
      const res = resolveEffectiveClientIp('10.0.0.1', '', '', '10.0.0.0/8')
      assert.equal(res.effectiveIp, '10.0.0.1')
      assert.equal(res.isTrustedProxy, true)
      assert.equal(res.usedForwardedHeader, false)
    })

    await st.test('End-to-end evaluation: spoofed XFF does not bypass IP whitelist', () => {
      const evalRes = evaluateRequest({
        testPath: '/.env',
        testIp: '198.51.100.42', // untrusted external attacker
        testForwardedFor: '10.5.0.25', // spoofed internal whitelisted IP
        trustedProxiesInput: '10.0.0.0/8',
        allowedIpsInput: '10.5.0.0/16'
      })
      assert.equal(evalRes.verdict, 'BLOCK')
    })

    await st.test('End-to-end evaluation: verified XFF from trusted proxy successfully bypasses IP whitelist', () => {
      const evalRes = evaluateRequest({
        testPath: '/.env',
        testIp: '10.0.0.1', // trusted load balancer
        testForwardedFor: '10.5.0.25', // client IP in whitelist
        trustedProxiesInput: '10.0.0.0/8',
        allowedIpsInput: '10.5.0.0/16'
      })
      assert.equal(evalRes.verdict, 'BYPASS')
      assert.equal(evalRes.effectiveIp, '10.5.0.25')
    })
  })

  // ========================================================
  // Section 11: Snippet Generation with trustedProxies
  // ========================================================
  await t.test('Section 11: Snippet Generation with trustedProxies Support', async (st) => {
    const proxies = ['10.0.0.0/8', '172.16.0.0/12', '192.168.1.0/24']

    await st.test('Caddyfile formats trusted_proxies properly', () => {
      const code = generateGatewaySnippet({
        ...DEFAULT_SNIPPET_OPTS,
        snippetFormat: 'caddy',
        trustedProxiesList: proxies
      })
      assert.ok(code.includes('trusted_proxies "10.0.0.0/8" "172.16.0.0/12" "192.168.1.0/24"'))
    })

    await st.test('NGINX Lua formats trusted_proxies table properly', () => {
      const code = generateGatewaySnippet({
        ...DEFAULT_SNIPPET_OPTS,
        snippetFormat: 'nginx',
        trustedProxiesList: proxies
      })
      assert.ok(code.includes('trusted_proxies = {'))
      assert.ok(code.includes('"10.0.0.0/8",'))
      assert.ok(code.includes('"172.16.0.0/12",'))
    })

    await st.test('Traefik YAML formats trustedProxies list properly', () => {
      const code = generateGatewaySnippet({
        ...DEFAULT_SNIPPET_OPTS,
        snippetFormat: 'traefik_yaml',
        trustedProxiesList: proxies
      })
      assert.ok(code.includes('trustedProxies:'))
      assert.ok(code.includes('- "10.0.0.0/8"'))
      assert.ok(code.includes('- "172.16.0.0/12"'))
    })

    await st.test('Traefik TOML formats trustedProxies array properly', () => {
      const code = generateGatewaySnippet({
        ...DEFAULT_SNIPPET_OPTS,
        snippetFormat: 'traefik_toml',
        trustedProxiesList: proxies
      })
      assert.ok(code.includes('trustedProxies = ['))
      assert.ok(code.includes('"10.0.0.0/8",'))
      assert.ok(code.includes('"172.16.0.0/12",'))
    })

    await st.test('Docker Compose formats trustedProxies labels properly', () => {
      const code = generateGatewaySnippet({
        ...DEFAULT_SNIPPET_OPTS,
        snippetFormat: 'docker',
        trustedProxiesList: proxies
      })
      assert.ok(code.includes('trustedProxies[0]=10.0.0.0/8'))
      assert.ok(code.includes('trustedProxies[1]=172.16.0.0/12'))
      assert.ok(code.includes('trustedProxies[2]=192.168.1.0/24'))
    })

    await st.test('Kubernetes Traefik CRD formats trustedProxies properly', () => {
      const code = generateGatewaySnippet({
        ...DEFAULT_SNIPPET_OPTS,
        snippetFormat: 'k8s_traefik',
        trustedProxiesList: proxies
      })
      assert.ok(code.includes('trustedProxies:'))
      assert.ok(code.includes('- "10.0.0.0/8"'))
    })

    await st.test('Kubernetes Caddy formats trusted_proxies properly', () => {
      const code = generateGatewaySnippet({
        ...DEFAULT_SNIPPET_OPTS,
        snippetFormat: 'k8s_caddy',
        trustedProxiesList: proxies
      })
      assert.ok(code.includes('trusted_proxies "10.0.0.0/8" "172.16.0.0/12" "192.168.1.0/24"'))
    })

    await st.test('Kubernetes NGINX formats trusted_proxies properly', () => {
      const code = generateGatewaySnippet({
        ...DEFAULT_SNIPPET_OPTS,
        snippetFormat: 'k8s_nginx',
        trustedProxiesList: proxies
      })
      assert.ok(code.includes('trusted_proxies = {'))
      assert.ok(code.includes('"10.0.0.0/8",'))
      assert.ok(code.includes('"172.16.0.0/12",'))
    })

    await st.test('CLI routewarden.json formats trustedProxies properly', () => {
      const code = generateGatewaySnippet({
        ...DEFAULT_SNIPPET_OPTS,
        snippetFormat: 'cli_json',
        trustedProxiesList: proxies
      })
      assert.ok(code.includes('"trustedProxies": ['))
      assert.ok(code.includes('"10.0.0.0/8"'))
    })
  })

  await t.test('Section 12: Comprehensive customBlockList and customAllowList Verification', async (st) => {
    const customBlocks = ['(?i)^/admin/.*$', '(?i)\\.(key|pem|conf|secret)$', '(?i)^/internal/debug$']
    const customAllows = [
      '(?i)^/admin/public/health$',
      '(?i)^/admin/assets/.*$',
      '(?i)^/public/sample\\.conf$',
      '(?i)^/\\.well-known/acme-challenge/.*$'
    ]

    await st.test('custom block pattern blocks /admin/dashboard', () => {
      const res = evaluateRequest({
        testPath: '/admin/dashboard',
        customBlockList: customBlocks,
        customAllowList: customAllows
      })
      assert.equal(res.verdict, 'BLOCK')
      assert.equal(res.statusCode, 403)
    })

    await st.test('custom block pattern blocks case-insensitively /ADMIN/Settings', () => {
      const res = evaluateRequest({
        testPath: '/ADMIN/Settings',
        customBlockList: customBlocks,
        customAllowList: customAllows
      })
      assert.equal(res.verdict, 'BLOCK')
      assert.equal(res.statusCode, 403)
    })

    await st.test('custom block pattern blocks sensitive extension /certs/server.key', () => {
      const res = evaluateRequest({
        testPath: '/certs/server.key',
        customBlockList: customBlocks,
        customAllowList: customAllows
      })
      assert.equal(res.verdict, 'BLOCK')
      assert.equal(res.statusCode, 403)
    })

    await st.test('custom allow pattern overrides block for /admin/public/health', () => {
      const res = evaluateRequest({
        testPath: '/admin/public/health',
        customBlockList: customBlocks,
        customAllowList: customAllows
      })
      assert.equal(res.verdict, 'ALLOW')
      assert.equal(res.statusCode, 200)
    })

    await st.test('custom allow pattern overrides block for /admin/assets/app.js', () => {
      const res = evaluateRequest({
        testPath: '/admin/assets/app.js',
        customBlockList: customBlocks,
        customAllowList: customAllows
      })
      assert.equal(res.verdict, 'ALLOW')
      assert.equal(res.statusCode, 200)
    })

    await st.test('custom allow pattern overrides block for /public/sample.conf', () => {
      const res = evaluateRequest({
        testPath: '/public/sample.conf',
        customBlockList: customBlocks,
        customAllowList: customAllows
      })
      assert.equal(res.verdict, 'ALLOW')
      assert.equal(res.statusCode, 200)
    })

    await st.test('custom allow pattern overrides default block for /.well-known/acme-challenge/token', () => {
      const res = evaluateRequest({
        testPath: '/.well-known/acme-challenge/token',
        customBlockList: customBlocks,
        customAllowList: customAllows
      })
      assert.equal(res.verdict, 'ALLOW')
      assert.equal(res.statusCode, 200)
    })

    await st.test('clean unblocked route /api/v1/products passes', () => {
      const res = evaluateRequest({
        testPath: '/api/v1/products',
        customBlockList: customBlocks,
        customAllowList: customAllows
      })
      assert.equal(res.verdict, 'PASS')
      assert.equal(res.statusCode, 200)
    })

    await st.test('whitelisted IP bypasses custom block patterns', () => {
      const res = evaluateRequest({
        testPath: '/admin/dashboard',
        testIp: '192.168.100.50',
        allowedIpsInput: '192.168.100.50',
        customBlockList: customBlocks,
        customAllowList: customAllows
      })
      assert.equal(res.verdict, 'BYPASS')
      assert.equal(res.reason, 'IP whitelisted')
    })
  })
})


