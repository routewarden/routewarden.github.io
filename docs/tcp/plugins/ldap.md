---
title: LDAP & Active Directory Guard Plugin
description: Protect LDAP directory services (OpenLDAP, Active Directory) with ASN.1 BER bind inspection and automated brute-force defense.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../../.vitepress/theme/composables/useCodeSnippet'

// ─── 1. Installation Snippets ───────────────────────────────────────────────
const install_cli = buildSnippet({
  lang: 'bash',
  code: `# Install using short name
tcp-warden plugins install ldap

# Or install via Git repository URL
tcp-warden plugins install https://github.com/routewarden/plugins/ldap`
})

const install_yaml = buildSnippet({
  lang: 'yaml',
  code: `# tcp-warden.yaml
plugins:
  ldap:
    enabled: true
    source: "https://github.com/routewarden/plugins/ldap"`
})

const installSnippets = computed(() => ({
  tcp: [
    { filename: 'RouteWarden CLI', lang: 'bash', code: install_cli.cleanCode, html: install_cli.html, hasDiff: false },
    { filename: 'tcp-warden.yaml', lang: 'yaml', code: install_yaml.cleanCode, html: install_yaml.html, hasDiff: false },
  ]
}))

// ─── 2. Configuration Snippets ──────────────────────────────────────────────
const config_yaml = buildSnippet({
  lang: 'yaml',
  code: `services:
  ldap_bastion:
    listen: ":1390"
    upstream: "127.0.0.1:389"
    protocol: "ldap"
    rate_limit:
      connections_per_minute: 60
      burst: 10
    max_auth_failures: 3
    ban_after_failures: 3
    ban_duration: "2h"
    plugin_config:
      max_auth_failures: 3
      blocked_bind_dn_prefixes:
        - "cn=Administrator"
        - "cn=root"`
})

const configSnippets = computed(() => ({
  tcp: [
    { filename: 'tcp-warden.yaml', lang: 'yaml', code: config_yaml.cleanCode, html: config_yaml.html, hasDiff: false },
  ]
}))

const net_nftables = buildSnippet({
  lang: 'bash',
  code: `# Redirect external traffic destined for port 389 to RouteWarden port 1390
sudo nft add rule ip routewarden_nat prerouting iifname "eth0" tcp dport 389 redirect to :1390`
})

const net_iptables = buildSnippet({
  lang: 'bash',
  code: `# 1. Redirect incoming external port 389 to RouteWarden port 1390
sudo iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 389 -j REDIRECT --to-port 1390

# 2. Persist rules across reboots (Debian/Ubuntu)
sudo netfilter-persistent save`
})

const net_ldaps = buildSnippet({
  lang: 'yaml',
  code: `# LDAPS (port 636 over TLS)
services:
  ldaps_guard:
    listen: ":1636"
    upstream: "127.0.0.1:636"
    protocol: "generic"
    rate_limit:
      connections_per_minute: 60
      burst: 10`
})

const netFirewallSnippets = computed(() => ({
  tcp: [
    { filename: 'nftables (Modern Linux)', lang: 'bash', code: net_nftables.cleanCode, html: net_nftables.html, hasDiff: false },
    { filename: 'iptables (Legacy / Cloud VMs)', lang: 'bash', code: net_iptables.cleanCode, html: net_iptables.html, hasDiff: false },
  ]
}))

const net_compose = buildSnippet({
  lang: 'yaml',
  code: `services:
  routewarden:
    image: ghcr.io/routewarden/tcp-warden:latest
    ports:
      - "389:1390"  # Map host LDAP port 389 to RouteWarden
      - "636:1636"  # Map host LDAPS port 636 to RouteWarden
      - "9091:9091" # Management API
    volumes:
      - ./tcp-warden.yaml:/etc/routewarden/tcp-warden.yaml:ro
    depends_on:
      - openldap

  openldap:
    image: osixia/openldap:latest
    environment:
      - LDAP_ORGANISATION=Example Inc
      - LDAP_ADMIN_PASSWORD=adminpassword
    # Do NOT publish host ports (389/636); keep internal to bridge network`
})

const netLdapsSnippets = computed(() => ({
  tcp: [
    { filename: 'tcp-warden.yaml (LDAPS)', lang: 'yaml', code: net_ldaps.cleanCode, html: net_ldaps.html, hasDiff: false },
  ]
}))

const netComposeSnippets = computed(() => ({
  tcp: [
    { filename: 'docker-compose.yml', lang: 'yaml', code: net_compose.cleanCode, html: net_compose.html, hasDiff: false },
  ]
}))

// ─── 4. Testing & Verification Snippets ─────────────────────────────────────
const test_search = buildSnippet({
  lang: 'bash',
  code: `# Verify valid search query
ldapsearch -x -H ldap://127.0.0.1:1390 -b "dc=example,dc=org"`
})

const test_bind = buildSnippet({
  lang: 'bash',
  code: `# Trigger bind authentication failure
ldapwhoami -x -H ldap://127.0.0.1:1390 -D "cn=testuser,dc=example,dc=org" -w "wrongpassword"
# Returns: ldap_bind: Invalid credentials (49)`
})

const test_bans = buildSnippet({
  lang: 'bash',
  code: `# Inspect active bans via API
curl -s http://127.0.0.1:9091/api/v1/bans | jq .`
})

const testSnippets = computed(() => ({
  tcp: [
    { filename: '1. Valid Search', lang: 'bash', code: test_search.cleanCode, html: test_search.html, hasDiff: false },
    { filename: '2. Failed Bind', lang: 'bash', code: test_bind.cleanCode, html: test_bind.html, hasDiff: false },
    { filename: '3. Ban Status', lang: 'bash', code: test_bans.cleanCode, html: test_bans.html, hasDiff: false },
  ]
}))
</script>

# LDAP & Active Directory Guard (`ldap`)

The **LDAP Guard** plugin inspects Lightweight Directory Access Protocol version 3 (RFC 4511) connections. It decodes ASN.1 BER message envelopes, tracks BindRequest credentials, detects failed bind operations (`resultCode: 49 invalidCredentials`), and blocks unauthorized bind DN patterns to stop directory enumeration and credential stuffing against Active Directory and OpenLDAP servers.

---

## Capabilities & Threat Defense

| Threat / Attack Vector | Defense Mechanism | Action Taken |
| :--- | :--- | :--- |
| **Credential Stuffing & Password Spraying** | Intercepts `BindResponse` with `resultCode: 49`; enforces connection close when cap is reached (since v3.4.0) | IP banned after `max_auth_failures` threshold; connection terminated immediately |
| **Directory Enumeration** | Enforces rate limits per minute and burst caps | Connection throttled before overloading directory |
| **Protected DN Probing** | Filters Bind DN against `blocked_bind_dn_prefixes` | Blocked at the proxy layer |
| **DN Suffix Spoofing** | Validates `BindDN` against `allowed_bind_dn_suffixes` using case-folded literal suffix matching (since v3.4.0) | Prevents Unicode homoglyph and attribute-reordering evasion attacks |

---

## Installation

Install the plugin via CLI or declaratively:

<CodeViewer :snippets="installSnippets" />

---

## Configuration Reference

Add an LDAP guard service to `tcp-warden.yaml`:

<CodeViewer :snippets="configSnippets" />

### Configuration Options

| Field | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `listen` | `string` | `":1390"` | Local proxy listen address and port. |
| `upstream` | `string` | `"127.0.0.1:389"` | Target LDAP directory server address and port. |
| `protocol` | `string` | `"ldap"` | Must be set to `"ldap"`. |
| `max_auth_failures` | `int` | `3` | Failed bind attempts before banning. Since v3.4.0 the connection is actively closed with an LDAP `BindResponse` `resultCode: 52` (Unavailable) when the cap is reached. |
| `ban_duration` | `string` | `"2h"` | Duration of the automated IP ban (`"30m"`, `"2h"`, `"24h"`). |
| `plugin_config.blocked_bind_dn_prefixes` | `[]string` | `[]` | List of sensitive DN prefixes forbidden from authenticating via this proxy. |
| `plugin_config.allowed_bind_dn_suffixes` | `[]string` | `[]` | If non-empty, only `BindDN` values ending with one of these suffixes are accepted. Matching is case-folded and uses literal suffix comparison to prevent Unicode homoglyph evasion (since v3.4.0). |

---

## Network & Deployment Architecture

### Option A: Kernel Firewall Redirection (nftables / iptables)

Redirect external traffic destined for port `389` to RouteWarden port `1390`:

<CodeViewer :snippets="netFirewallSnippets" />

### Option B: LDAPS (Port 636) Protection

For secure LDAPS (LDAP over TLS), configure RouteWarden in front of the LDAPS listener:

<CodeViewer :snippets="netLdapsSnippets" />

### Option C: Docker Compose Network Isolation

Run the LDAP directory server inside an isolated container network, exposing both LDAP (`389`) and LDAPS (`636`) services only through RouteWarden:

<CodeViewer :snippets="netComposeSnippets" />

---

## Testing & Verification

Verify queries and monitor failed bind responses:

<CodeViewer :snippets="testSnippets" />
