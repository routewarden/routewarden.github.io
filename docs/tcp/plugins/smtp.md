---
title: SMTP Mail Guard Plugin
description: Protect mail transfer agents (Postfix, Exim) with recipient limits, spam domain blocking, authentication brute-force bans, and STARTTLS handover.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../../.vitepress/theme/composables/useCodeSnippet'

// ─── 1. Installation Snippets ───────────────────────────────────────────────
const install_cli = buildSnippet({
  lang: 'bash',
  code: `# Install using short name
tcp-warden plugins install smtp

# Or install via Git repository URL
tcp-warden plugins install https://github.com/routewarden/plugins/smtp`
})

const install_yaml = buildSnippet({
  lang: 'yaml',
  code: `# tcp-warden.yaml
plugins:
  smtp:
    enabled: true
    source: "https://github.com/routewarden/plugins/smtp"`
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
  smtp_guard:
    listen: ":2525"
    upstream: "127.0.0.1:25"
    protocol: "smtp"
    rate_limit:
      connections_per_minute: 30
      burst: 10
    max_auth_failures: 3
    ban_after_failures: 3
    ban_duration: "2h"
    plugin_config:
      banner: "220 mail.example.com RouteWarden ESMTP Ready"
      max_recipients: 10
      blocked_sender_domains:
        - "*.tempmail.com"
        - "mailinator.com"
        - "spam.org"
      require_starttls: false`
})

const configSnippets = computed(() => ({
  tcp: [
    { filename: 'tcp-warden.yaml', lang: 'yaml', code: config_yaml.cleanCode, html: config_yaml.html, hasDiff: false },
  ]
}))

// ─── 3. Network Architecture Snippets ───────────────────────────────────────
const net_nftables = buildSnippet({
  lang: 'bash',
  code: `# Redirect incoming external port 25 traffic to RouteWarden port 2525
sudo nft add rule ip routewarden_nat prerouting iifname "eth0" tcp dport 25 redirect to :2525`
})

const net_iptables = buildSnippet({
  lang: 'bash',
  code: `# 1. Redirect incoming external port 25 to RouteWarden port 2525
sudo iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 25 -j REDIRECT --to-port 2525

# 2. Persist rules across reboots (Debian/Ubuntu)
sudo netfilter-persistent save`
})

const net_submission = buildSnippet({
  lang: 'yaml',
  code: `# Optional: Protecting submission port 587
services:
  smtp_submission:
    listen: ":5870"
    upstream: "127.0.0.1:587"
    protocol: "smtp"
    max_auth_failures: 3
    ban_after_failures: 3`
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
      - "25:2525"   # Map host SMTP port 25 to RouteWarden
      - "587:5870"  # Map host Submission port 587 to RouteWarden
      - "9091:9091" # Management API
    volumes:
      - ./tcp-warden.yaml:/etc/routewarden/tcp-warden.yaml:ro
    depends_on:
      - mailserver

  mailserver:
    image: mailserver/docker-mailserver:latest
    environment:
      - OVERRIDE_HOSTNAME=mail.example.com
    # Do NOT publish host ports (25/587); keep internal to bridge network`
})

const netSubmissionSnippets = computed(() => ({
  tcp: [
    { filename: 'tcp-warden.yaml', lang: 'yaml', code: net_submission.cleanCode, html: net_submission.html, hasDiff: false },
  ]
}))

const netComposeSnippets = computed(() => ({
  tcp: [
    { filename: 'docker-compose.yml', lang: 'yaml', code: net_compose.cleanCode, html: net_compose.html, hasDiff: false },
  ]
}))

// ─── 4. Testing & Verification Snippets ─────────────────────────────────────
const test_session = buildSnippet({
  lang: 'smtp',
  code: `# Connect to SMTP service via netcat
$ nc 127.0.0.1 2525
220 mail.example.com ESMTP RouteWarden
EHLO client.test
250-mail.example.com
250-8BITMIME
250 OK
MAIL FROM:<spammer@tempmail.com>
554 5.7.1 Sender domain rejected by RouteWarden
QUIT
221 2.0.0 Bye`
})

const test_recipients = buildSnippet({
  lang: 'smtp',
  code: `# Test recipient limit per session
$ nc 127.0.0.1 2525
220 mail.example.com ESMTP
EHLO client.test
250 OK
MAIL FROM:<sender@legit.org>
250 2.1.0 Ok
RCPT TO:<u1@test.com>
250 2.1.5 Ok
RCPT TO:<u2@test.com>
...
RCPT TO:<u11@test.com>
452 4.5.3 Too many recipients
QUIT`
})

const test_ban = buildSnippet({
  lang: 'bash',
  code: `# Check active bans after exceeding auth failures or spam violations
curl -s http://127.0.0.1:9091/api/banlist | jq .`
})

const testSnippets = computed(() => ({
  tcp: [
    { filename: '1. SMTP Protocol Session', lang: 'smtp', code: test_session.cleanCode, html: test_session.html, hasDiff: false },
    { filename: '2. Recipient Throttling', lang: 'smtp', code: test_recipients.cleanCode, html: test_recipients.html, hasDiff: false },
    { filename: '3. Ban Verification', lang: 'bash', code: test_ban.cleanCode, html: test_ban.html, hasDiff: false },
  ]
}))
</script>

# SMTP Mail Guard (`smtp`)

The **SMTP Mail Guard** plugin inspects SMTP and ESMTP mail transfer streams (RFC 5321). It enforces recipient count limits per session, blocks disposable or blacklisted sender domains on `MAIL FROM`, intercepts authentication failures (`535 Authentication credentials invalid`), and provides transparent handover upon `STARTTLS` negotiation.

---

## Capabilities & Threat Defense

| Threat / Attack Vector | Defense Mechanism | Action Taken |
| :--- | :--- | :--- |
| **Credential Brute-Force & Stuffing** | Tracks `535 Authentication failed` response codes; enforces connection close with `535 Too many failures` on excess attempts (since v3.4.0) | Abusive IP banned after `max_auth_failures` threshold; connection terminated immediately |
| **Recipient Flooding / Directory Harvest** | Counts `RCPT TO` commands per session | Rejects excess recipients with `452 Too many recipients` |
| **Spam & Disposable Senders** | Checks `MAIL FROM` domain against `blocked_sender_domains` | Rejects sender with `554 Sender domain rejected` |
| **STARTTLS Handover** | Detects successful `220 Ready to start TLS` | Transparently transitions to bidirectional TLS pipe |

---

## Installation

Install the plugin via CLI or declaratively:

<CodeViewer :snippets="installSnippets" />

---

## Configuration Reference

Add an SMTP guard service to `tcp-warden.yaml`:

<CodeViewer :snippets="configSnippets" />

### Configuration Options

| Field | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `listen` | `string` | `":2525"` | Local proxy listen address and port. |
| `upstream` | `string` | `"127.0.0.1:25"` | Target MTA (Postfix, Exim, Haraka) address and port. |
| `protocol` | `string` | `"smtp"` | Must be set to `"smtp"` or `"mail"`. |
| `max_auth_failures` | `int` | `3` | Failed `AUTH` exchanges before the client IP is banned. Since v3.4.0 the connection is actively closed with a `535 Too many failures` response when the cap is reached, preventing clients from retrying indefinitely. |
| `ban_duration` | `string` | `"2h"` | Duration of the automated IP ban (`"30m"`, `"2h"`, `"24h"`). |
| `plugin_config.banner` | `string` | `""` | Optional synthetic greeting banner returned to clients. |
| `plugin_config.max_recipients` | `int` | `10` | Max `RCPT TO` addresses allowed per single SMTP transaction. |
| `plugin_config.blocked_sender_domains` | `[]string` | `[...]` | List of sender domains to reject with `554`. Supports wildcards. |

---

## Network & Deployment Architecture

### Option A: Kernel Firewall Redirection (nftables / iptables)

Keep Postfix listening on port `25` on loopback, and redirect incoming external connections from interface `eth0`:

<CodeViewer :snippets="netFirewallSnippets" />

### Option B: Submission Port Protection (Port 587)

RouteWarden can also protect client submission ports (port `587`):

<CodeViewer :snippets="netSubmissionSnippets" />

### Option C: Docker Compose Network Isolation

Run the mail transfer agent inside an isolated container network, exposing both SMTP (`25`) and Submission (`587`) services only through RouteWarden:

<CodeViewer :snippets="netComposeSnippets" />

---

## Testing & Verification

Verify session commands, test domain rejection, and test recipient throttling:

<CodeViewer :snippets="testSnippets" />
