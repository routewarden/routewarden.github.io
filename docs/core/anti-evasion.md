---
title: "Anti-Evasion Security Engine"
description: "In-depth explanation of Routewarden multi-pass URL normalization, path traversal, and anti-evasion defenses."
---

# Anti-Evasion Security Engine

Attackers frequently employ URL obfuscation techniques to disguise sensitive paths from simple reverse proxy filters. Routewarden implements an anti-evasion normalization pipeline before evaluating regex patterns.

---

## Evasion Techniques Defeated

### 1. Multi-Layer URL Encoding
Attackers encode dots and slashes multiple times to bypass naive single-pass decoders.
- **Payload**: `/%252e%252e/.env` or `/%252eenv`
- **Defense**: Routewarden unescapes URLs recursively until the string stabilizes, successfully reducing `%252e` to `.` and catching the hidden payload.

### 2. Semicolon Matrix Parameters
Some application frameworks (Java/Spring, PHP, Tomcat) interpret semicolons as path parameters or session IDs (`/app;jsessionid=.../.env`). Reverse proxies that only inspect paths before the semicolon may incorrectly forward the request.
- **Payload**: `/public;param=1/.env`
- **Defense**: Routewarden analyzes both the raw candidate path and stripped segment permutations.

### 3. Backslash Path Separators
On Windows/IIS servers or backend services that treat `\` identically to `/`, attackers use backslashes to bypass forward-slash based regexes.
- **Payload**: `/static\..\.env` or `\.env`
- **Defense**: Routewarden converts backslashes to forward slashes during path normalization.

### 4. Null Byte Injection
Attackers append null bytes to confuse string termination in C-based runtimes or legacy file parsers.
- **Payload**: `/.env%00.html`
- **Defense**: Encoded and raw null bytes (`\x00`, `%00`) are stripped during candidate expansion.

### 5. Directory Traversal Canonicalization
Complex dot-segment sequences attempting to climb out of public folders (`/assets/../../.env`) are collapsed via Go's `path.Clean` logic.

### 6. Malformed Percent-Encoding (Denial-of-Decoding)
Attackers append invalid percent sequences (e.g. `%zz` or unescaped `%`) alongside multi-layer encoded traversals (`/%252e%252e/.env%zz`). Standard decoders error out and abandon unescaping, while downstream servers decode valid segments.
- **Payload**: `/%252e%252e/.env%zz` or `/search?file=/%252e%252e/.env%`
- **Defense**: Routewarden uses lenient percent decoding across all gateways (`cli`, `traefik`, `caddy`, `nginx`, `docs`), unescaping valid 2-hex digit sequences while preserving malformed characters to prevent denial-of-decoding bypasses.

### 7. Encoded Query & Fragment Delimiters (`%3f`, `%23`)
Encoded question marks and hash fragments decode to literal `?` and `#` during multi-layer normalization.
- **Payload**: `/backup.sql%3fparam=value` or `/database.sql%23section`
- **Defense**: Candidate extraction strips both query (`?`) and fragment (`#`) delimiters from normalized paths before evaluating end-anchored regex patterns.

### 8. Trailing Directory Slash Normalization
End-anchored directory block rules (e.g. `(?i)^/admin/$`) can be bypassed if the normalizer collapses trailing slashes to `/admin`.
- **Payload**: `/admin/` vs `/admin`
- **Defense**: Candidate path generation produces both canonical cleaned paths and trailing slash variants (`p + "/"`), ensuring directory anchor rules match regardless of trailing slash presence.

### 9. Header Whitespace & Quote Stripping
Monitored forwarded and rewrite headers (`checkHeaders`) containing leading/trailing whitespace or quotation marks.
- **Payload**: `X-Forwarded-Prefix:  /.env ` or `X-Forwarded-Prefix: "/wp-config.php"`
- **Defense**: Whitespace is trimmed and single/double quotes are stripped before candidate path expansion.
