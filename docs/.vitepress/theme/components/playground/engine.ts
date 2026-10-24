/**
 * Anti-Evasion Normalization & Candidate Path Extraction
 * Mirrors Routewarden's Go core normalization engine.
 */
export interface CandidateExtractionResult {
  normalized: string
  candidates: string[]
  rawPathOnly: string
  rawQuery: string
  transformations: string[]
}

export function extractCandidatePaths(rawPath: string, shouldCheckQuery = false): CandidateExtractionResult {
  const transformations: string[] = []
  const candidatesSet = new Set<string>()

  let input = (rawPath || '').trim()
  if (!input) {
    return {
      normalized: '/',
      candidates: ['/'],
      rawPathOnly: '/',
      rawQuery: '',
      transformations: ['Empty path resolved to /']
    }
  }

  // 1. Separate path and query string
  let pathPart = input
  let queryPart = ''
  const qIdx = input.indexOf('?')
  if (qIdx >= 0) {
    pathPart = input.substring(0, qIdx)
    queryPart = input.substring(qIdx + 1)
    transformations.push(`Separated query string: ?${queryPart}`)
  }

  if (!pathPart.startsWith('/')) {
    pathPart = '/' + pathPart
  }

  candidatesSet.add(pathPart)

  // 2. Multi-layer URL decoding
  let prev = pathPart
  let passes = 0
  while (passes < 5) {
    try {
      const unescaped = decodeURIComponent(prev)
      if (unescaped === prev) break
      prev = unescaped
      passes++
    } catch {
      break
    }
  }
  if (passes > 0) {
    transformations.push(`Decoded ${passes} layer(s) percent-encoding`)
    candidatesSet.add(prev)
  }

  let working = prev

  // 3. Null bytes stripping
  if (working.includes('\0') || working.includes('%00')) {
    working = working.replace(/\0|%00/gi, '')
    transformations.push('Stripped null bytes (\\x00 / %00)')
    candidatesSet.add(working)
  }

  // 4. Backslash conversion
  if (working.includes('\\')) {
    working = working.replace(/\\/g, '/')
    transformations.push('Converted \\ to /')
    candidatesSet.add(working)
  }

  // 5. Matrix parameters stripping
  if (working.includes(';')) {
    const withoutMatrix = working.replace(/;[^/]+/g, '')
    transformations.push('Stripped matrix params (;...)')
    candidatesSet.add(withoutMatrix)
    working = withoutMatrix
  }

  // 6. Canonical traversal resolution
  const segments = working.split('/').filter(s => s.length > 0 && s !== '.')
  const resolved: string[] = []
  let traversalDetected = false

  for (const seg of segments) {
    if (seg === '..') {
      traversalDetected = true
      resolved.pop()
    } else {
      resolved.push(seg)
    }
  }

  if (traversalDetected) {
    transformations.push('Canonicalized traversal (/../)')
  }

  const canonical = '/' + resolved.join('/')
  candidatesSet.add(canonical)

  // 7. Query candidates if checkQuery is active
  if (shouldCheckQuery && queryPart) {
    candidatesSet.add(input)
    candidatesSet.add(`${canonical}?${queryPart}`)
    candidatesSet.add(queryPart)
    try {
      const decodedQuery = decodeURIComponent(queryPart)
      if (decodedQuery !== queryPart) {
        candidatesSet.add(decodedQuery)
        candidatesSet.add(`${canonical}?${decodedQuery}`)
      }
    } catch {}
  }

  const candidates = Array.from(candidatesSet).filter(Boolean)
  return {
    normalized: canonical,
    candidates,
    rawPathOnly: pathPart,
    rawQuery: queryPart,
    transformations
  }
}

export function cleanIp(raw: string): string {
  let s = (raw || '').trim()
  if (s.startsWith('[') && s.includes(']')) {
    s = s.substring(1, s.indexOf(']'))
  } else if (s.includes(':') && s.split(':').length === 2 && !s.includes('::')) {
    // IPv4:port
    s = s.split(':')[0]
  }
  return s.trim()
}

export function isIpWhitelisted(ip: string, allowedListStr: string): boolean {
  if (!ip || !allowedListStr) return false
  const clientIp = cleanIp(ip)
  const entries = allowedListStr.split(',').map(s => cleanIp(s)).filter(Boolean)

  for (const entry of entries) {
    if (entry === clientIp) return true
    if (entry.includes(':') && clientIp.includes(':') && !entry.includes('/')) {
      const ipBig = parseIpv6(clientIp)
      const entryBig = parseIpv6(entry)
      if (ipBig !== null && entryBig !== null && ipBig === entryBig) return true
    }
    if (entry.includes('/')) {
      const [subnet, bitsStr] = entry.split('/')
      const bits = parseInt(bitsStr, 10)
      if (!isNaN(bits) && subnet && clientIp) {
        if (ipInSubnet(clientIp, subnet, bits)) return true
      }
    }
  }
  return false
}

export function isIpTrustedProxy(ip: string, trustedProxiesStr: string): boolean {
  return isIpWhitelisted(ip, trustedProxiesStr)
}

export interface ClientIpResolution {
  effectiveIp: string
  isTrustedProxy: boolean
  usedForwardedHeader: boolean
  directPeerIp: string
  reason?: string
}

export function resolveEffectiveClientIp(
  remoteAddr: string,
  forwardedFor?: string,
  realIp?: string,
  trustedProxiesStr?: string
): ClientIpResolution {
  const directPeer = cleanIp(remoteAddr) || '127.0.0.1'
  const xff = (forwardedFor || '').trim()
  const xReal = cleanIp(realIp || '')
  const trustedProxies = (trustedProxiesStr || '').trim()

  // 1. Legacy mode: no trusted proxies configured -> trust forwarding headers unconditionally
  if (!trustedProxies) {
    if (xff) {
      const parts = xff.split(',')
      const first = cleanIp(parts[0])
      if (first) {
        return {
          effectiveIp: first,
          isTrustedProxy: false,
          usedForwardedHeader: true,
          directPeerIp: directPeer,
          reason: `Forwarded IP ${first} accepted (legacy mode: all proxies trusted)`
        }
      }
    }
    if (xReal) {
      return {
        effectiveIp: xReal,
        isTrustedProxy: false,
        usedForwardedHeader: true,
        directPeerIp: directPeer,
        reason: `X-Real-IP ${xReal} accepted (legacy mode: all proxies trusted)`
      }
    }
    return {
      effectiveIp: directPeer,
      isTrustedProxy: false,
      usedForwardedHeader: false,
      directPeerIp: directPeer
    }
  }

  // 2. Trusted proxies configured: verify direct peer
  const isPeerTrusted = isIpWhitelisted(directPeer, trustedProxies)

  if (isPeerTrusted) {
    if (xff) {
      const parts = xff.split(',')
      const first = cleanIp(parts[0])
      if (first) {
        return {
          effectiveIp: first,
          isTrustedProxy: true,
          usedForwardedHeader: true,
          directPeerIp: directPeer,
          reason: `Forwarded IP ${first} verified via trusted proxy ${directPeer}`
        }
      }
    }
    if (xReal) {
      return {
        effectiveIp: xReal,
        isTrustedProxy: true,
        usedForwardedHeader: true,
        directPeerIp: directPeer,
        reason: `X-Real-IP ${xReal} verified via trusted proxy ${directPeer}`
      }
    }
    return {
      effectiveIp: directPeer,
      isTrustedProxy: true,
      usedForwardedHeader: false,
      directPeerIp: directPeer
    }
  }

  // 3. Direct peer is UNTRUSTED: ignore forwarding headers to prevent bypass
  const hadForwardedHeader = Boolean(xff || xReal)
  return {
    effectiveIp: directPeer,
    isTrustedProxy: false,
    usedForwardedHeader: false,
    directPeerIp: directPeer,
    reason: hadForwardedHeader
      ? `Ignored unverified forwarding headers from untrusted peer ${directPeer} (spoofing prevented)`
      : undefined
  }
}

function parseIpv6(ip: string): bigint | null {
  const clean = cleanIp(ip).toLowerCase()
  if (!clean.includes(':')) return null

  let sections: string[]
  if (clean.includes('::')) {
    const parts = clean.split('::')
    if (parts.length > 2) return null
    const left = parts[0] ? parts[0].split(':').filter(Boolean) : []
    const right = parts[1] ? parts[1].split(':').filter(Boolean) : []
    const missing = 8 - (left.length + right.length)
    if (missing < 0) return null
    sections = [...left, ...Array(missing).fill('0'), ...right]
  } else {
    sections = clean.split(':').filter(Boolean)
  }

  if (sections.length !== 8) return null

  let res = 0n
  for (const sec of sections) {
    const val = parseInt(sec, 16)
    if (isNaN(val) || val < 0 || val > 0xffff) return null
    res = (res << 16n) | BigInt(val)
  }
  return res
}

function ipv6InSubnet(ip: string, subnet: string, maskBits: number): boolean {
  if (maskBits < 0 || maskBits > 128) return false
  const ipBig = parseIpv6(ip)
  const subnetBig = parseIpv6(subnet)
  if (ipBig === null || subnetBig === null) return false
  if (maskBits === 0) return true
  const mask = ((1n << 128n) - 1n) ^ ((1n << BigInt(128 - maskBits)) - 1n)
  return (ipBig & mask) === (subnetBig & mask)
}

function ipToLong(ip: string): number {
  const parts = ip.split('.').map(p => parseInt(p, 10))
  if (parts.length !== 4 || parts.some(isNaN)) return 0
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0
}

function ipInSubnet(ip: string, subnet: string, maskBits: number): boolean {
  try {
    if (ip.includes(':') || subnet.includes(':')) {
      return ipv6InSubnet(ip, subnet, maskBits)
    }
    const ipNum = ipToLong(ip)
    const subnetNum = ipToLong(subnet)
    if (ip.split('.').length !== 4 || subnet.split('.').length !== 4) return false
    const mask = maskBits === 0 ? 0 : (~0 << (32 - maskBits)) >>> 0
    return (ipNum & mask) === (subnetNum & mask)
  } catch {
    return false
  }
}

export function matchRegex(pattern: string, str: string): boolean {
  try {
    let clean = pattern.trim()
    let flags = ''
    if (clean.startsWith('(?i)')) {
      flags += 'i'
      clean = clean.slice(4)
    }
    // Replace unescaped wildcard * with regex .* when not already preceded by . or \
    clean = clean.replace(/(?<![.\\])\*/g, '.*')
    const rx = new RegExp(clean, flags)
    return rx.test(str)
  } catch {
    return false
  }
}

export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Smart RE2 pattern compiler
export function smartCompileRegex(input: string): string {
  const raw = input.trim()
  if (!raw) return ''

  // If already a regex starting with (?i), ^, or ending with $
  if (raw.startsWith('(?i)') || raw.startsWith('^') || raw.endsWith('$')) {
    return raw.replace(/(?<![.\\])\*/g, '.*')
  }

  // Exact asterisk wildcard alone
  if (raw === '*') {
    return '.*'
  }

  // File extension wildcard: e.g. *.sql or *.sql, *.bak or *.php
  if (raw.startsWith('*.') || (/^[a-zA-Z0-9_-]+(,\s*[a-zA-Z0-9_-]+)*$/.test(raw) && !raw.includes('/'))) {
    const exts = raw.split(/[\s,]+/).map(e => e.replace(/^\*\.?|^\./, '').trim()).filter(Boolean)
    if (exts.length > 0) {
      const escaped = exts.map(escapeRegex).join('|')
      return `(?i).*\\.(${escaped})$`
    }
  }

  // Hidden/dot files without slashes: e.g. .env or .git
  if (raw.startsWith('.') && !raw.includes('/')) {
    const clean = escapeRegex(raw)
    return `(?i)(^|/)${clean}(/.*|$)`
  }

  // Wildcard patterns containing * (e.g. /admin/*, /*, /api/*/export, .well-known/*, db*.sql, etc.)
  if (raw.includes('*')) {
    const escaped = raw.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    const withDotStar = escaped.replace(/(?<![.\\])\*/g, '.*')
    if (withDotStar.startsWith('/')) {
      return `(?i)^${withDotStar}$`
    } else if (withDotStar.startsWith('\\.')) {
      return `(?i)(^|/)${withDotStar}$`
    } else {
      return `(?i).*${withDotStar}$`
    }
  }

  // Exact file with extension (e.g. /phpinfo.php or favicon.ico)
  if (/\.[a-zA-Z0-9]{1,6}$/.test(raw)) {
    if (raw.startsWith('/')) {
      const escaped = escapeRegex(raw)
      return `(?i)^${escaped}$`
    } else {
      const escaped = escapeRegex(raw)
      return `(?i)(^|/)${escaped}$`
    }
  }

  const clean = raw.startsWith('/') ? raw : '/' + raw
  const base = clean.replace(/\/+$/, '')
  const escaped = escapeRegex(base)
  return `(?i)^${escaped}(/.*)?$`
}
