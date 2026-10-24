/**
 * useCodeSnippet — Utility to build highlighted, diff-aware HTML for CodeViewer snippets.
 *
 * Supports diff markers in code strings:
 *   - Lines ending with  `# [!code ++]` or `// [!code ++]`  → <span class="line diff add">
 *   - Lines ending with  `# [!code --]` or `// [!code --]`  → <span class="line diff remove">
 *   - All other lines → <span class="line">
 *
 * The returned HTML is intended for use with `v-html` inside `.rw-snippet-html`.
 */

export type SnippetLang =
  | 'yaml'
  | 'toml'
  | 'caddy'
  | 'nginx'
  | 'lua'
  | 'json'
  | 'docker'
  | 'dockerfile'
  | 'bash'
  | 'sh'
  | 'shell'
  | 'zsh'
  | 'go'
  | 'golang'
  | 'pop3'
  | 'imap'
  | 'smtp'
  | 'ftp'
  | 'sse'
  | 'mermaid'
  | 'plaintext'

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function stripDiffMarker(line: string): { text: string; type: 'add' | 'remove' | null } {
  // Strip trailing diff markers (or before trailing line-continuation backslash: `\ # [!code ++]`)
  const addMarker = / # \[!code \+\+\]| \/\/ \[!code \+\+\]| <!-- \[!code \+\+\] -->/
  const removeMarker = / # \[!code --\]| \/\/ \[!code --\]| <!-- \[!code --\] -->/

  if (addMarker.test(line)) {
    return { text: line.replace(addMarker, ''), type: 'add' }
  }
  if (removeMarker.test(line)) {
    return { text: line.replace(removeMarker, ''), type: 'remove' }
  }
  return { text: line, type: null }
}

// ─── Per-lang token highlighters ────────────────────────────────────────────

function highlightValue(val: string): string {
  // If there's an inline comment (e.g. # comment), preserve and highlight it at end
  let commentStr = ''
  let valPart = val
  const commentMatch = val.match(/(\s+#.*)$/)
  if (commentMatch) {
    commentStr = `<span class="tok-comment">${esc(commentMatch[1])}</span>`
    valPart = val.slice(0, val.length - commentMatch[1].length)
  }

  const tokens = valPart.replace(
    /(\"(?:\\.|[^\"\\])*\"|'[^']*'|`[^`]*`|\b(?:true|false|on|off)\b|\b\d{1,3}(?:\.\d{1,3}){3}(?:\/\d{1,2})?\b|\b\d+\b|\b(?:GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\b|[\[\]{},=]|[^\"'\[\]{},=\s]+|\s+)/g,
    (m) => {
      if (/^\"(?:\\.|[^\"\\])*\"$/.test(m) || /^'[^']*'$/.test(m) || /^`[^`]*`$/.test(m)) return `<span class="tok-str">${esc(m)}</span>`
      if (/^(true|false|on|off)$/.test(m)) return `<span class="tok-bool">${m}</span>`
      if (/^\d{1,3}(?:\.\d{1,3}){3}(?:\/\d{1,2})?$/.test(m)) return `<span class="tok-num">${m}</span>`
      if (/^\d+$/.test(m)) return `<span class="tok-num">${m}</span>`
      if (/^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)$/.test(m)) return `<span class="tok-verb">${m}</span>`
      if (/^[\[\]{},=]$/.test(m)) return `<span class="tok-punct">${m}</span>`
      if (/^\s+$/.test(m)) return m
      return `<span class="tok-val">${esc(m)}</span>`
    }
  )

  return tokens + commentStr
}

const YAML_STRUCT_KEYS = new Set(['http', 'middlewares', 'plugin', 'services', 'traefik', 'spec', 'metadata', 'apiVersion', 'kind', 'data', 'routers', 'entryPoints', 'loadBalancer', 'servers', 'response', 'experimental', 'localPlugins'])

function highlightYamlLine(line: string): string {
  if (/^\s*#/.test(line)) return `<span class="tok-comment">${esc(line)}</span>`
  const listStr = line.match(/^(\s*-\s+)(\"(?:\\.|[^\"\\])*\"|[^\"\\s].*)$/)
  if (listStr) {
    return `${listStr[1].replace('-', '<span class="tok-punct">-</span>')}${highlightValue(listStr[2])}`
  }
  const kv = line.match(/^(\s*)([a-zA-Z0-9_.-]+):(\s*)(.*)$/)
  if (kv) {
    const [, indent, key, space, val] = kv
    const keyClass = YAML_STRUCT_KEYS.has(key) ? 'tok-keyword' : 'tok-key'
    return `${indent}<span class="${keyClass}">${esc(key)}</span><span class="tok-punct">:</span>${space}${highlightValue(val)}`
  }
  return esc(line)
}

function highlightTomlLine(line: string): string {
  if (/^\s*#/.test(line)) return `<span class="tok-comment">${esc(line)}</span>`
  const sec = line.match(/^(\s*)(\[[^\]]+\])(\s*)$/)
  if (sec) return `${sec[1]}<span class="tok-section">${esc(sec[2])}</span>${sec[3]}`
  const kv = line.match(/^(\s*)([a-zA-Z0-9_.-]+)(\s*=\s*)(.*)$/)
  if (kv) {
    const [, indent, key, , val] = kv
    return `${indent}<span class="tok-key">${esc(key)}</span> <span class="tok-punct">=</span> ${highlightValue(val)}`
  }
  return highlightValue(line)
}

function highlightCaddyLine(line: string): string {
  if (/^\s*#/.test(line)) return `<span class="tok-comment">${esc(line)}</span>`
  if (/^\s*\}\s*$/.test(line)) {
    const m = line.match(/^(\s*)(\})(\s*)$/)
    if (m) return `${m[1]}<span class="tok-punct">}</span>${m[3]}`
  }
  const m = line.match(/^(\s*)([a-zA-Z0-9_.:-]+)(.*)$/)
  if (!m) return esc(line)
  const [, indent, firstWord, rest] = m
  let wordClass = 'tok-key'
  if (['routewarden', 'route_warden', 'reverse_proxy', 'order', 'tls'].includes(firstWord)) {
    wordClass = 'tok-keyword'
  } else if (firstWord.includes('.') && rest.includes('{')) {
    wordClass = 'tok-section'
  }
  return `${indent}<span class="${wordClass}">${esc(firstWord)}</span>${highlightValue(rest)}`
}

function highlightNginxLine(line: string): string {
  if (/^\s*(#|--)/.test(line)) return `<span class="tok-comment">${esc(line)}</span>`
  const kwMatch = line.match(/^(\s*)(init_by_lua_block|access_by_lua_block|server|location|local|return|http)(\s*.*)$/)
  if (kwMatch) {
    const [, indent, kw, rest] = kwMatch
    return `${indent}<span class="tok-keyword">${esc(kw)}</span>${highlightValue(rest)}`
  }
  const kv = line.match(/^(\s*)([a-zA-Z0-9_.-]+)(\s*=\s*)(.*)$/)
  if (kv) {
    const [, indent, key, eq, val] = kv
    return `${indent}<span class="tok-key">${esc(key)}</span><span class="tok-punct">${eq}</span>${highlightValue(val)}`
  }
  const ngx = line.match(/^(\s*)(listen|server_name|proxy_pass|proxy_set_header|root|index|lua_package_path|set_real_ip_from|real_ip_header|real_ip_recursive|allow|deny|ssl_certificate|ssl_certificate_key|access_log|error_log)(\s+)(.*);$/)
  if (ngx) {
    const [, indent, directive, space, rest] = ngx
    return `${indent}<span class="tok-keyword">${esc(directive)}</span>${space}${highlightValue(rest)}<span class="tok-punct">;</span>`
  }
  return esc(line)
}

function highlightJsonInline(text: string): string {
  const tokenRegex = /(\"(?:\\.|[^\"\\])*\")(\s*:\s*)|(\"(?:\\.|[^\"\\])*\"|'[^']*')|(\b(?:true|false|null)\b)|(-?\b\d+(?:\.\d+)?\b)|([{}[\],:])/g

  let lastIndex = 0
  let result = ''
  let match: RegExpExecArray | null

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result += esc(text.slice(lastIndex, match.index))
    }

    const [, keyStr, colon, valStr, boolOrNull, num, punct] = match

    if (keyStr !== undefined) {
      const isSchemaKey = keyStr === '"$schema"'
      const keyClass = isSchemaKey ? 'tok-keyword' : 'tok-key'
      result += `<span class="${keyClass}">${esc(keyStr)}</span><span class="tok-punct">${esc(colon)}</span>`
    } else if (valStr !== undefined) {
      result += `<span class="tok-str">${esc(valStr)}</span>`
    } else if (boolOrNull !== undefined) {
      result += `<span class="tok-bool">${esc(boolOrNull)}</span>`
    } else if (num !== undefined) {
      result += `<span class="tok-num">${num}</span>`
    } else if (punct !== undefined) {
      result += `<span class="tok-punct">${esc(punct)}</span>`
    }

    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    result += esc(text.slice(lastIndex))
  }

  return result
}

function highlightJsonLine(line: string): string {
  // Comment lines (non-standard but used in examples)
  if (/^\s*\/\//.test(line)) return `<span class="tok-comment">${esc(line)}</span>`
  return highlightJsonInline(line)
}

function highlightDockerComposeLine(line: string): string {
  if (/^\s*#/.test(line)) return `<span class="tok-comment">${esc(line)}</span>`
  // Docker label string
  const labelMatch = line.match(/^(\s*-\s*)\"([^=]+)=(.*)\"$/)
  if (labelMatch) {
    const [, indentDash, labelKey, labelVal] = labelMatch
    const dash = indentDash.replace('-', '<span class="tok-punct">-</span>')
    const valHtml = /^(true|false)$/.test(labelVal)
      ? `<span class="tok-bool">${labelVal}</span>`
      : /^\d+$/.test(labelVal)
        ? `<span class="tok-num">${labelVal}</span>`
        : `<span class="tok-str">${esc(labelVal)}</span>`
    return `${dash}<span class="tok-punct">&quot;</span><span class="tok-key">${esc(labelKey)}</span><span class="tok-punct">=</span>${valHtml}<span class="tok-punct">&quot;</span>`
  }
  const kv = line.match(/^(\s*)([a-zA-Z0-9_.-]+):(\s*)(.*)$/)
  if (kv) {
    const [, indent, key, space, val] = kv
    const DOCKER_STRUCT = new Set(['version', 'services', 'networks', 'volumes', 'labels', 'environment', 'depends_on', 'ports', 'command'])
    const keyClass = DOCKER_STRUCT.has(key) ? 'tok-keyword' : 'tok-key'
    return `${indent}<span class="${keyClass}">${esc(key)}</span><span class="tok-punct">:</span>${space}${highlightValue(val)}`
  }
  return esc(line)
}

function highlightDockerfileLine(line: string): string {
  if (/^\s*#/.test(line)) return `<span class="tok-comment">${esc(line)}</span>`
  const instr = line.match(/^(FROM|RUN|COPY|ADD|ENV|EXPOSE|WORKDIR|CMD|ENTRYPOINT|ARG|LABEL|USER|VOLUME|STOPSIGNAL|HEALTHCHECK|SHELL)(\s+.*)$/)
  if (instr) {
    const [, cmd, rest] = instr
    return `<span class="tok-keyword">${cmd}</span>${esc(rest)}`
  }
  return esc(line)
}

const BASH_COMMANDS = new Set([
  'tcp-warden', 'route-warden', 'routewarden', 'traefik', 'xcaddy', 'caddy', 'nginx', 'rwarden',
  'docker-compose', 'docker', 'kubectl', 'helm', 'podman',
  'go', 'git', 'npm', 'npx', 'pnpm', 'yarn', 'node', 'bun', 'cargo', 'rustc', 'make',
  'curl', 'wget', 'nc', 'netcat', 'nmap', 'telnet', 'openssl', 'ssh', 'scp',
  'bash', 'sh', 'zsh', 'echo', 'export', 'source', 'grep', 'sed', 'awk',
  'cat', 'ls', 'cd', 'mkdir', 'rm', 'cp', 'mv', 'chmod', 'chown',
  'sudo', 'systemctl', 'journalctl', 'service',
  'cscli', 'crowdsec', 'psql', 'mysql', 'redis-cli', 'mongosh',
  'if', 'then', 'else', 'elif', 'fi', 'for', 'in', 'do', 'done', 'while', 'until', 'case', 'esac', 'function', 'return', 'exit'
])

const BASH_SUBCOMMANDS = new Set([
  'plugins', 'install', 'uninstall', 'enable', 'disable', 'list', 'validate', 'run',
  'start', 'stop', 'restart', 'reload', 'status',
  'test', 'build', 'init', 'add', 'commit', 'push', 'pull', 'checkout', 'clone', 'branch',
  'exec', 'logs', 'up', 'down', 'compose', 'ps', 'version', 'help',
  'apply', 'delete', 'get', 'describe', 'create', 'alerts', 'decisions', 'bouncers'
])

function highlightBashLine(line: string): string {
  if (/^\s*#/.test(line)) return `<span class="tok-comment">${esc(line)}</span>`

  const tokenRegex = /(\"(?:\\.|[^\"\\])*\"|'[^']*')|(\s+#.*$)|(https?:\/\/[^\s\"'>)]+)|(\$(?:\{[a-zA-Z0-9_.-]+\}|[a-zA-Z_][a-zA-Z0-9_]*|\?|\#|\*|@|\$|\d))|(--[a-zA-Z0-9_.-]+(?:=[^\s\\]+)?|-[a-zA-Z0-9]+)|(&&|\|\||>>|>|<|\||;|\\)|(\b\d+\b)|([a-zA-Z0-9_]+(?:-[a-zA-Z0-9_]+)*)/g

  let lastIndex = 0
  let result = ''
  let match: RegExpExecArray | null

  while ((match = tokenRegex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      result += esc(line.slice(lastIndex, match.index))
    }

    const [full, str, comment, url, variable, flag, op, num, word] = match

    if (str !== undefined) {
      result += `<span class="tok-str">${esc(str)}</span>`
    } else if (comment !== undefined) {
      result += `<span class="tok-comment">${esc(comment)}</span>`
    } else if (url !== undefined) {
      result += `<span class="tok-str">${esc(url)}</span>`
    } else if (variable !== undefined) {
      result += `<span class="tok-section">${esc(variable)}</span>`
    } else if (flag !== undefined) {
      const eqIdx = flag.indexOf('=')
      if (eqIdx !== -1) {
        const flagName = flag.slice(0, eqIdx)
        const flagVal = flag.slice(eqIdx + 1)
        result += `<span class="tok-key">${esc(flagName)}</span><span class="tok-punct">=</span>${highlightValue(flagVal)}`
      } else {
        result += `<span class="tok-key">${esc(flag)}</span>`
      }
    } else if (op !== undefined) {
      result += `<span class="tok-punct">${esc(op)}</span>`
    } else if (num !== undefined) {
      result += `<span class="tok-num">${num}</span>`
    } else if (word !== undefined) {
      const prevChar = match.index > 0 ? line[match.index - 1] : ' '
      const nextChar = match.index + full.length < line.length ? line[match.index + full.length] : ' '
      const isPathOrExt = prevChar === '/' || prevChar === '.' || nextChar === '.' || nextChar === '/'

      if (!isPathOrExt && BASH_COMMANDS.has(word)) {
        result += `<span class="tok-keyword">${esc(word)}</span>`
      } else if (!isPathOrExt && BASH_SUBCOMMANDS.has(word)) {
        result += `<span class="tok-verb">${esc(word)}</span>`
      } else {
        result += esc(word)
      }
    }

    lastIndex = match.index + full.length
  }

  if (lastIndex < line.length) {
    result += esc(line.slice(lastIndex))
  }

  return result
}

function highlightLuaLine(line: string): string {
  // Comments: -- comment
  const commentMatch = line.match(/^(\s*)(--.*)$/)
  if (commentMatch) {
    const [, indent, comment] = commentMatch
    return `${indent}<span class="tok-comment">${esc(comment)}</span>`
  }

  // Trailing comment
  let codePart = line
  let trailingComment = ''
  const trailingIdx = line.indexOf('--')
  if (trailingIdx !== -1) {
    codePart = line.slice(0, trailingIdx)
    trailingComment = `<span class="tok-comment">${esc(line.slice(trailingIdx))}</span>`
  }

  // Bracket key: ["X-Frame-Options"] = "DENY"
  const bracketKey = codePart.match(/^(\s*)(\[\"[^\"]+\"\])(\s*=\s*)(.*)$/)
  if (bracketKey) {
    const [, indent, key, eq, val] = bracketKey
    return `${indent}<span class="tok-key">${esc(key)}</span><span class="tok-punct">${eq}</span>${highlightValue(val)}${trailingComment}`
  }

  // Key-value pair: key = val, or key = val
  const kv = codePart.match(/^(\s*)([a-zA-Z0-9_]+)(\s*=\s*)(.*)$/)
  if (kv) {
    const [, indent, key, eq, val] = kv
    const isWarden = key === 'warden'
    const keyClass = isWarden ? 'tok-keyword' : 'tok-key'
    return `${indent}<span class="${keyClass}">${esc(key)}</span><span class="tok-punct">${eq}</span>${highlightValue(val)}${trailingComment}`
  }

  // Function calls like routewarden.new({
  const callMatch = codePart.match(/^(\s*)([a-zA-Z0-9_.]+)(\s*\()(.*)$/)
  if (callMatch) {
    const [, indent, fn, openParen, rest] = callMatch
    return `${indent}<span class="tok-keyword">${esc(fn)}</span><span class="tok-punct">${openParen}</span>${highlightValue(rest)}${trailingComment}`
  }

  // Return, local, etc.
  const kwMatch = codePart.match(/^(\s*)(local|return|function|if|then|else|elseif|end)(\s+.*|\s*)$/)
  if (kwMatch) {
    const [, indent, kw, rest] = kwMatch
    return `${indent}<span class="tok-keyword">${esc(kw)}</span>${highlightValue(rest)}${trailingComment}`
  }

  if (trailingComment) {
    return `${highlightValue(codePart)}${trailingComment}`
  }

  return highlightValue(line)
}

const GO_KEYWORDS = new Set([
  'break', 'case', 'chan', 'const', 'continue', 'default', 'defer', 'else',
  'fallthrough', 'for', 'func', 'go', 'goto', 'if', 'import',
  'map', 'package', 'range', 'return', 'select', 'switch', 'type',
  'var', 'make', 'new', 'len', 'cap', 'append', 'copy', 'delete', 'close',
  'panic', 'recover'
])

const GO_TYPES = new Set([
  'struct', 'interface',
  'bool', 'byte', 'complex64', 'complex128', 'error', 'float32', 'float64',
  'int', 'int8', 'int16', 'int32', 'int64', 'rune', 'string',
  'uint', 'uint8', 'uint16', 'uint32', 'uint64', 'uintptr', 'any'
])

const GO_CONSTANTS = new Set(['true', 'false', 'nil', 'iota'])

function highlightGoLine(line: string): string {
  if (/^\s*\/\//.test(line)) return `<span class="tok-comment">${esc(line)}</span>`

  const tokenRegex = /(\/\/[^\n]*)|(\"(?:\\.|[^\"\\])*\"|`[^`]*`|'(?:\\.|[^'\\])*')|(\b\d+(?:\.\d+)?\b)|(\b[a-zA-Z_][a-zA-Z0-9_]*\b)(?=\s*\()|(\b[a-zA-Z_][a-zA-Z0-9_]*\b)|(:=|<-|==|!=|<=|>=|&&|\|\||\+\+|--|\+=|-=|\.{3}|[{}()\[\].,:;=+\-*/%&|^!<>])/g

  let lastIndex = 0
  let result = ''
  let match: RegExpExecArray | null

  while ((match = tokenRegex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      result += esc(line.slice(lastIndex, match.index))
    }

    const [full, comment, str, num, fnCall, ident, punct] = match

    if (comment !== undefined) {
      result += `<span class="tok-comment">${esc(comment)}</span>`
    } else if (str !== undefined) {
      result += `<span class="tok-str">${esc(str)}</span>`
    } else if (num !== undefined) {
      result += `<span class="tok-num">${num}</span>`
    } else if (fnCall !== undefined) {
      if (GO_KEYWORDS.has(fnCall)) {
        result += `<span class="tok-keyword">${esc(fnCall)}</span>`
      } else if (GO_TYPES.has(fnCall)) {
        result += `<span class="tok-section">${esc(fnCall)}</span>`
      } else {
        result += `<span class="tok-verb">${esc(fnCall)}</span>`
      }
    } else if (ident !== undefined) {
      if (GO_KEYWORDS.has(ident)) {
        result += `<span class="tok-keyword">${esc(ident)}</span>`
      } else if (GO_TYPES.has(ident)) {
        result += `<span class="tok-section">${esc(ident)}</span>`
      } else if (GO_CONSTANTS.has(ident)) {
        result += `<span class="tok-bool">${esc(ident)}</span>`
      } else if (/^[A-Z]/.test(ident)) {
        result += `<span class="tok-key">${esc(ident)}</span>`
      } else {
        result += esc(ident)
      }
    } else if (punct !== undefined) {
      result += `<span class="tok-punct">${esc(punct)}</span>`
    }

    lastIndex = match.index + full.length
  }

  if (lastIndex < line.length) {
    result += esc(line.slice(lastIndex))
  }

  return result
}

const POP3_COMMANDS = new Set([
  'USER', 'PASS', 'QUIT', 'STAT', 'LIST', 'RETR', 'DELE', 'NOOP', 'RSET', 'TOP', 'UIDL', 'APOP', 'CAPA', 'STLS', 'AUTH'
])

function highlightPop3Line(line: string): string {
  if (/^\s*(#|\/\/)/.test(line)) {
    return `<span class="tok-comment">${esc(line)}</span>`
  }

  // Shell command prompt: $ nc 127.0.0.1 1110
  if (/^\s*\$\s+/.test(line)) {
    const cmdPart = line.replace(/^\s*\$\s+/, '')
    return `<span class="tok-punct">$</span> ${highlightBashLine(cmdPart)}`
  }

  // Positive response: +OK ...
  const okMatch = line.match(/^(\s*)(\+OK)(.*)$/i)
  if (okMatch) {
    const [, indent, ok, rest] = okMatch
    return `${indent}<span class="tok-bool">${esc(ok)}</span>${highlightValue(rest)}`
  }

  // Negative response: -ERR [AUTH] ...
  const errMatch = line.match(/^(\s*)(-ERR)(.*)$/i)
  if (errMatch) {
    const [, indent, errTok, rest] = errMatch
    const tagMatch = rest.match(/^(\s*)(\[[a-zA-Z0-9_/]+\])(.*)$/)
    if (tagMatch) {
      const [, sp1, tag, msg] = tagMatch
      return `${indent}<span class="tok-key" style="color: #ef4444; font-weight: 700;">${esc(errTok)}</span>${sp1}<span class="tok-section">${esc(tag)}</span>${highlightValue(msg)}`
    }
    return `${indent}<span class="tok-key" style="color: #ef4444; font-weight: 700;">${esc(errTok)}</span>${highlightValue(rest)}`
  }

  // POP3 Client commands: USER, PASS, QUIT, etc.
  const cmdMatch = line.match(/^(\s*)([a-zA-Z]{3,5})(\s+.*)?$/)
  if (cmdMatch) {
    const [, indent, cmd, rest] = cmdMatch
    if (POP3_COMMANDS.has(cmd.toUpperCase())) {
      const highlightedRest = rest ? highlightValue(rest) : ''
      return `${indent}<span class="tok-keyword">${esc(cmd.toUpperCase())}</span>${highlightedRest}`
    }
  }

  return highlightBashLine(line)
}

function highlightImapLine(line: string): string {
  if (/^\s*(#|\/\/)/.test(line)) {
    return `<span class="tok-comment">${esc(line)}</span>`
  }

  // Shell command prompt: $ nc 127.0.0.1 1143
  if (/^\s*\$\s+/.test(line)) {
    const cmdPart = line.replace(/^\s*\$\s+/, '')
    return `<span class="tok-punct">$</span> ${highlightBashLine(cmdPart)}`
  }

  // Untagged greeting: * OK Dovecot ready.
  const untaggedMatch = line.match(/^(\s*)(\*\s+OK)(.*)$/i)
  if (untaggedMatch) {
    const [, indent, ok, rest] = untaggedMatch
    return `${indent}<span class="tok-bool">${esc(ok)}</span>${highlightValue(rest)}`
  }

  // Tagged response: a001 OK ... or a001 NO [AUTHENTICATIONFAILED] ...
  const taggedResp = line.match(/^(\s*)([a-zA-Z0-9]+)\s+(OK|NO|BAD)(.*)$/i)
  if (taggedResp) {
    const [, indent, tag, status, rest] = taggedResp
    const statusClass = status.toUpperCase() === 'OK' ? 'tok-bool' : 'tok-key'
    const styleAttr = status.toUpperCase() !== 'OK' ? ' style="color: #ef4444; font-weight: 700;"' : ''
    const bracketMatch = rest.match(/^(\s*)(\[[a-zA-Z0-9_/]+\])(.*)$/)
    if (bracketMatch) {
      const [, sp1, bracketTag, msg] = bracketMatch
      return `${indent}<span class="tok-section">${esc(tag)}</span> <span class="${statusClass}"${styleAttr}>${esc(status)}</span>${sp1}<span class="tok-section">${esc(bracketTag)}</span>${highlightValue(msg)}`
    }
    return `${indent}<span class="tok-section">${esc(tag)}</span> <span class="${statusClass}"${styleAttr}>${esc(status)}</span>${highlightValue(rest)}`
  }

  // Tagged command: a001 LOGIN testuser pass
  const taggedCmd = line.match(/^(\s*)([a-zA-Z0-9]+)\s+([a-zA-Z]+)(.*)$/)
  if (taggedCmd) {
    const [, indent, tag, cmd, rest] = taggedCmd
    return `${indent}<span class="tok-section">${esc(tag)}</span> <span class="tok-keyword">${esc(cmd.toUpperCase())}</span>${highlightValue(rest)}`
  }

  return highlightBashLine(line)
}

function highlightSmtpLine(line: string): string {
  if (/^\s*(#|\/\/)/.test(line)) {
    return `<span class="tok-comment">${esc(line)}</span>`
  }

  // Shell command prompt: $ nc 127.0.0.1 2525
  if (/^\s*\$\s+/.test(line)) {
    const cmdPart = line.replace(/^\s*\$\s+/, '')
    return `<span class="tok-punct">$</span> ${highlightBashLine(cmdPart)}`
  }

  // Ellipsis line: ...
  if (/^\s*\.\.\.\s*$/.test(line)) {
    return `<span class="tok-punct">${esc(line)}</span>`
  }

  // SMTP Response Codes: e.g. "220 mail.example.com", "250-mail.example.com", "554 5.7.1 ...", "452 4.5.3 ..."
  const respMatch = line.match(/^(\s*)(\d{3})([ -])(.*)$/)
  if (respMatch) {
    const [, indent, code, sep, rest] = respMatch
    let codeClass = 'tok-num'
    let styleAttr = ''
    if (code.startsWith('2')) {
      codeClass = 'tok-bool'
    } else if (code.startsWith('3')) {
      codeClass = 'tok-section'
    } else if (code.startsWith('4')) {
      codeClass = 'tok-key'
      styleAttr = ' style="color: #f59e0b; font-weight: 700;"'
    } else if (code.startsWith('5')) {
      codeClass = 'tok-key'
      styleAttr = ' style="color: #ef4444; font-weight: 700;"'
    }

    // Check if rest has enhanced status code like 5.7.1 or 2.1.0 or 4.5.3
    const enhMatch = rest.match(/^(\s*)(\d\.\d+\.\d+)(.*)$/)
    if (enhMatch) {
      const [, sp1, enhCode, msg] = enhMatch
      return `${indent}<span class="${codeClass}"${styleAttr}>${code}</span><span class="tok-punct">${esc(sep)}</span>${sp1}<span class="tok-section">${esc(enhCode)}</span>${highlightValue(msg)}`
    }

    return `${indent}<span class="${codeClass}"${styleAttr}>${code}</span><span class="tok-punct">${esc(sep)}</span>${highlightValue(rest)}`
  }

  // MAIL FROM:<...> or RCPT TO:<...>
  const mailRcptMatch = line.match(/^(\s*)(MAIL\s+FROM:|RCPT\s+TO:)(\s*)(<[^>]*>)?(.*)$/i)
  if (mailRcptMatch) {
    const [, indent, verb, sp1, addr, rest] = mailRcptMatch
    const addrHtml = addr ? `<span class="tok-str">${esc(addr)}</span>` : ''
    return `${indent}<span class="tok-keyword">${esc(verb.toUpperCase())}</span>${sp1}${addrHtml}${highlightValue(rest)}`
  }

  // Standard SMTP client commands: EHLO, HELO, AUTH LOGIN, etc.
  const SMTP_COMMANDS = new Set([
    'EHLO', 'HELO', 'QUIT', 'DATA', 'RSET', 'NOOP', 'STARTTLS', 'AUTH', 'VRFY', 'EXPN', 'HELP', 'BDAT'
  ])
  const cmdMatch = line.match(/^(\s*)([a-zA-Z]{3,8})(\s+.*)?$/)
  if (cmdMatch) {
    const [, indent, cmd, rest] = cmdMatch
    if (SMTP_COMMANDS.has(cmd.toUpperCase())) {
      return `${indent}<span class="tok-keyword">${esc(cmd.toUpperCase())}</span>${rest ? highlightValue(rest) : ''}`
    }
  }

  return highlightBashLine(line)
}

const FTP_COMMANDS = new Set([
  'USER', 'PASS', 'QUIT', 'BYE', 'PORT', 'PASV', 'TYPE', 'MODE', 'STRU',
  'RETR', 'STOR', 'APPE', 'REST', 'RNFR', 'RNTO', 'ABOR', 'DELE', 'RMD',
  'MKD', 'PWD', 'LIST', 'NLST', 'SITE', 'SYST', 'STAT', 'HELP', 'NOOP',
  'AUTH', 'PBSZ', 'PROT', 'FEAT', 'OPTS', 'EPSV', 'EPRT'
])

function highlightFtpLine(line: string): string {
  if (/^\s*(#|\/\/)/.test(line)) {
    return `<span class="tok-comment">${esc(line)}</span>`
  }

  // Shell command prompt: $ ftp -n 127.0.0.1 2121
  if (/^\s*\$\s+/.test(line)) {
    const cmdPart = line.replace(/^\s*\$\s+/, '')
    return `<span class="tok-punct">$</span> ${highlightBashLine(cmdPart)}`
  }

  // FTP client prompt: ftp> quote USER anonymous
  const promptMatch = line.match(/^(\s*)(ftp>)(.*)$/i)
  if (promptMatch) {
    const [, indent, prompt, rest] = promptMatch
    const promptHtml = `${indent}<span class="tok-section">${esc(prompt)}</span>`

    // Check for "quote <CMD>" or direct "<CMD>"
    const quoteMatch = rest.match(/^(\s+)(quote\s+)([a-zA-Z]{3,6})(\s+.*)?$/i)
    if (quoteMatch) {
      const [, sp1, quoteWord, cmd, arg] = quoteMatch
      const cmdHtml = FTP_COMMANDS.has(cmd.toUpperCase())
        ? `<span class="tok-keyword">${esc(cmd.toUpperCase())}</span>`
        : esc(cmd)
      return `${promptHtml}${sp1}<span class="tok-verb">${esc(quoteWord)}</span>${cmdHtml}${arg ? highlightValue(arg) : ''}`
    }

    const directCmdMatch = rest.match(/^(\s+)([a-zA-Z]{3,6})(\s+.*)?$/)
    if (directCmdMatch) {
      const [, sp1, cmd, arg] = directCmdMatch
      if (FTP_COMMANDS.has(cmd.toUpperCase())) {
        return `${promptHtml}${sp1}<span class="tok-keyword">${esc(cmd.toUpperCase())}</span>${arg ? highlightValue(arg) : ''}`
      }
    }

    return `${promptHtml}${highlightValue(rest)}`
  }

  // FTP Status responses: e.g. "220 (vsFTPd 3.0.3)", "530 Login incorrect.", "331 Please specify..."
  const respMatch = line.match(/^(\s*)(\d{3})([ -])(.*)$/)
  if (respMatch) {
    const [, indent, code, sep, rest] = respMatch
    let codeClass = 'tok-num'
    let styleAttr = ''
    if (code.startsWith('2')) {
      codeClass = 'tok-bool'
    } else if (code.startsWith('3')) {
      codeClass = 'tok-section'
    } else if (code.startsWith('4') || code.startsWith('5')) {
      codeClass = 'tok-key'
      styleAttr = ' style="color: #ef4444; font-weight: 700;"'
    }

    return `${indent}<span class="${codeClass}"${styleAttr}>${code}</span><span class="tok-punct">${esc(sep)}</span>${highlightValue(rest)}`
  }

  // Direct FTP commands outside prompt: USER anonymous, PASS foo
  const cmdMatch = line.match(/^(\s*)([a-zA-Z]{3,6})(\s+.*)?$/)
  if (cmdMatch) {
    const [, indent, cmd, rest] = cmdMatch
    if (FTP_COMMANDS.has(cmd.toUpperCase())) {
      return `${indent}<span class="tok-keyword">${esc(cmd.toUpperCase())}</span>${rest ? highlightValue(rest) : ''}`
    }
  }

  return highlightBashLine(line)
}

function highlightSseLine(line: string): string {
  // SSE Comment or heartbeat: : heartbeat
  if (/^\s*:/.test(line)) {
    return `<span class="tok-comment">${esc(line)}</span>`
  }

  // event: ...
  const eventMatch = line.match(/^(\s*)(event)(\s*:\s*)(.*)$/)
  if (eventMatch) {
    const [, indent, kw, colon, val] = eventMatch
    return `${indent}<span class="tok-keyword">${esc(kw)}</span><span class="tok-punct">${esc(colon)}</span><span class="tok-section">${esc(val)}</span>`
  }

  // data: ...
  const dataMatch = line.match(/^(\s*)(data)(\s*:\s*)(.*)$/)
  if (dataMatch) {
    const [, indent, kw, colon, val] = dataMatch
    return `${indent}<span class="tok-keyword">${esc(kw)}</span><span class="tok-punct">${esc(colon)}</span>${highlightJsonInline(val)}`
  }

  // id: or retry:
  const fieldMatch = line.match(/^(\s*)(id|retry)(\s*:\s*)(.*)$/)
  if (fieldMatch) {
    const [, indent, kw, colon, val] = fieldMatch
    return `${indent}<span class="tok-keyword">${esc(kw)}</span><span class="tok-punct">${esc(colon)}</span>${highlightValue(val)}`
  }

  return esc(line)
}

function highlightPlaintextLine(line: string): string {
  // If line contains arrows, box-drawing, or diagram characters, enrich with styled tokens
  if (/([─│┌┐└┘├┤┬┴┼═║╔╗╚╝╠╣╦╩╬►▼▲◄]|\-\->|<--)/.test(line)) {
    return line.replace(
      /([─│┌┐└┘├┤┬┴┼═║╔╗╚╝╠╣╦╩╬►▼▲◄]+|\-\->|<--)|(\[[^\]]+\])|(\bPattern\s+\d+:?)|(\b(?:Routewarden|Client|Backend|Internet|Proxy|Host|Daemon|Chain|Hook|Bridge)\b)/g,
      (m, box, bracket, pattern, kw) => {
        if (box) return `<span class="tok-punct" style="color: var(--vp-c-brand-1, #6366f1); font-weight: bold;">${esc(box)}</span>`
        if (bracket) return `<span class="tok-section">${esc(bracket)}</span>`
        if (pattern) return `<span class="tok-keyword">${esc(pattern)}</span>`
        if (kw) return `<span class="tok-key">${esc(kw)}</span>`
        return esc(m)
      }
    )
  }
  return esc(line)
}

function highlightMermaidLine(line: string): string {
  // Comments: %% ...
  if (/^\s*%%/.test(line)) {
    return `<span class="tok-comment">${esc(line)}</span>`
  }

  const indentMatch = line.match(/^(\s*)(.*)$/)
  if (!indentMatch) return esc(line)
  const [, indent, rest] = indentMatch
  if (!rest) return ''

  // Flowchart/Graph declaration: flowchart LR, graph TD, sequenceDiagram, etc.
  const headerMatch = rest.match(/^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|gantt|pie|gitGraph|mindmap|quadrantChart)\s+([A-Za-z0-9_-]+)?$/i)
  if (headerMatch) {
    const [, kw, dir] = headerMatch
    return `${indent}<span class="tok-keyword">${esc(kw)}</span>${dir ? ` <span class="tok-verb">${esc(dir)}</span>` : ''}`
  }

  // Subgraph declaration: subgraph ID ["Label"]
  const subMatch = rest.match(/^(subgraph)\s+([A-Za-z0-9_.-]+)(?:\s+(\[.*?\]|\(.*?\)))?$/)
  if (subMatch) {
    const [, kw, id, label] = subMatch
    let labelHtml = ''
    if (label) {
      labelHtml = ' ' + label.replace(
        /^(\[|\()(.*?)(\]|\))$/,
        (_, open, inner, close) => `<span class="tok-punct">${esc(open)}</span><span class="tok-str">${esc(inner)}</span><span class="tok-punct">${esc(close)}</span>`
      )
    }
    return `${indent}<span class="tok-keyword">${esc(kw)}</span> <span class="tok-key">${esc(id)}</span>${labelHtml}`
  }

  // Subgraph end
  if (/^end\b/.test(rest)) {
    return `${indent}<span class="tok-keyword">end</span>${esc(rest.slice(3))}`
  }

  // Tokenize connections, nodes, labels, and keywords
  const tokenRegex = /(\"(?:\\.|[^\"\\])*\"|\|[^|]+\||-->|---|-.->|==>|<-->|<==>|--o|--x|--|\[\[|\]\]|\[\(|\)\]|\(\(|\)\)|\[\/|\/\]|\[\\|\\\]|[\[\]\(\){}]|\b(?:subgraph|end|direction|classDef|class|style|click|linkStyle|fill|stroke)\b|\b(?:LR|RL|TD|TB|BT)\b|[a-zA-Z0-9_.-]+|[^\s\"a-zA-Z0-9_.-]+|\s+)/g

  const tokens = rest.replace(tokenRegex, (m) => {
    // String literal
    if (/^\"(?:\\.|[^\"\\])*\"$/.test(m)) {
      return `<span class="tok-str">${esc(m)}</span>`
    }
    // Edge label |...|
    if (/^\|[^|]+\|$/.test(m)) {
      const inner = m.slice(1, -1)
      return `<span class="tok-punct">|</span><span class="tok-section">${esc(inner)}</span><span class="tok-punct">|</span>`
    }
    // Arrows / connectors
    if (/^(?:-->|---|-.->|==>|<-->|<==>|--o|--x|--)$/.test(m)) {
      return `<span class="tok-punct" style="color: var(--vp-c-brand-1, #6366f1); font-weight: 700;">${esc(m)}</span>`
    }
    // Brackets and delimiters
    if (/^[\[\]\(\){}]|\[\[|\]\]|\[\(|\)\]|\(\(|\)\)|\[\/|\/\]|\[\\|\\\]$/.test(m)) {
      return `<span class="tok-punct">${esc(m)}</span>`
    }
    // Keywords
    if (/^(subgraph|end|direction|classDef|class|style|click|linkStyle|fill|stroke)$/.test(m)) {
      return `<span class="tok-keyword">${esc(m)}</span>`
    }
    // Orientations
    if (/^(LR|RL|TD|TB|BT)$/.test(m)) {
      return `<span class="tok-verb">${esc(m)}</span>`
    }
    // Whitespace
    if (/^\s+$/.test(m)) {
      return m
    }
    // Node identifier or words
    if (/^[a-zA-Z0-9_.-]+$/.test(m)) {
      return `<span class="tok-key">${esc(m)}</span>`
    }
    return esc(m)
  })

  return indent + tokens
}

function highlightLine(line: string, lang: SnippetLang): string {
  switch (lang) {
    case 'yaml': return highlightYamlLine(line)
    case 'toml': return highlightTomlLine(line)
    case 'caddy': return highlightCaddyLine(line)
    case 'nginx': return highlightNginxLine(line)
    case 'lua': return highlightLuaLine(line)
    case 'json': return highlightJsonLine(line)
    case 'docker': return highlightDockerComposeLine(line)
    case 'dockerfile': return highlightDockerfileLine(line)
    case 'bash':
    case 'sh':
    case 'shell':
    case 'zsh': return highlightBashLine(line)
    case 'go':
    case 'golang': return highlightGoLine(line)
    case 'pop3': return highlightPop3Line(line)
    case 'imap': return highlightImapLine(line)
    case 'smtp': return highlightSmtpLine(line)
    case 'ftp': return highlightFtpLine(line)
    case 'sse': return highlightSseLine(line)
    case 'mermaid': return highlightMermaidLine(line)
    case 'plaintext': return highlightPlaintextLine(line)
    default: return esc(line)
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

export interface SnippetOptions {
  /** The raw code string, may contain [!code ++] / [!code --] markers */
  code: string
  lang: SnippetLang
}

/**
 * Returns { html, hasDiff, cleanCode } for a given snippet.
 *
 * - `html`      — highlighted HTML string, safe for `v-html` inside `.rw-snippet-html`
 * - `hasDiff`   — true if any line was annotated with [!code ++] or [!code --]
 * - `cleanCode` — the code without any [!code *] markers (for clipboard copy)
 */
export function buildSnippet(opts: SnippetOptions): { html: string; hasDiff: boolean; cleanCode: string } {
  const rawLines = opts.code.split('\n')
  let hasDiff = false
  const cleanLines: string[] = []
  const htmlLines: string[] = []

  for (const rawLine of rawLines) {
    const { text, type } = stripDiffMarker(rawLine)
    if (type) hasDiff = true
    cleanLines.push(text)

    const highlighted = highlightLine(text, opts.lang)
    if (type === 'add') {
      htmlLines.push(`<span class="line diff add">${highlighted}</span>`)
    } else if (type === 'remove') {
      htmlLines.push(`<span class="line diff remove">${highlighted}</span>`)
    } else {
      htmlLines.push(`<span class="line">${highlighted}</span>`)
    }
  }

  const preClass = hasDiff ? 'has-diff' : ''
  // Join without \n to avoid whitespace text-nodes that create gaps between display:block .line spans
  const html = `<pre class="${preClass}"><code>${htmlLines.join('')}</code></pre>`

  return {
    html,
    hasDiff,
    cleanCode: cleanLines.join('\n')
  }
}
