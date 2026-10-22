---
title: DNS Guard Plugin (UDP & TCP)
description: High-performance Layer 4 DNS proxy and firewall inspecting DNS queries over both UDP and TCP, with domain filtering, query type restrictions, DNS rebinding protection, and anti-amplification defenses.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../../.vitepress/theme/composables/useCodeSnippet'

// ─── 1. Installation Snippets ───────────────────────────────────────────────
const install_cli = buildSnippet({
  lang: 'bash',
  code: `# Install via RouteWarden CLI
rwarden tcp plugins install dns

# Or standalone binary
tcp-warden plugins install dns

# Or install via Git repository URL
rwarden tcp plugins install https://github.com/routewarden/plugins/dns`
})

const install_yaml = buildSnippet({
  lang: 'yaml',
  code: `# tcp-warden.yaml
plugins:
  dns:
    enabled: true
    source: "https://github.com/routewarden/plugins/dns"`
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
  dns_firewall:
    listen: ":53"
    upstream: "1.1.1.1:53"
    transport: "both"         # Bind listeners on both UDP and TCP
    protocol: "dns"
    rate_limit:
      connections_per_minute: 1200
      burst: 200
    udp:
      session_timeout: "15s"
      max_sessions: 20000
      read_buffer_size: 4096
    plugin_config:
      blocked_domains:
        - "*.badware.test"
        - "c2.threat.org"
        - "tracking.ads.*"
      allowed_domains: []     # Optional allowlist: if populated, only matching domains pass
      blocked_qtypes:
        - "ANY"               # Stop ANY query reflection amplification floods
        - "AXFR"              # Block unauthorized DNS zone transfers
      block_private_ips: true # Mitigate DNS rebinding (blocks 127.0.0.0/8, 10.0.0.0/8, 192.168.0.0/16 in answers)
      min_ttl: 60             # Enforce minimum TTL in upstream responses to prevent cache thrashing
      max_packet_size: 4096   # Cap EDNS0 buffer size to mitigate large UDP reflection`
})

const configSnippets = computed(() => ({
  tcp: [
    { filename: 'tcp-warden.yaml', lang: 'yaml', code: config_yaml.cleanCode, html: config_yaml.html, hasDiff: false },
  ]
}))

// ─── 3. Network Redirection Snippets ────────────────────────────────────────
const net_nftables = buildSnippet({
  lang: 'bash',
  code: `# 1. Redirect external DNS (port 53) UDP and TCP to RouteWarden port 5353
sudo nft add rule ip routewarden_nat prerouting iifname "eth0" udp dport 53 redirect to :5353
sudo nft add rule ip routewarden_nat prerouting iifname "eth0" tcp dport 53 redirect to :5353`
})

const net_iptables = buildSnippet({
  lang: 'bash',
  code: `# 1. Redirect incoming port 53 UDP & TCP to RouteWarden port 5353
sudo iptables -t nat -A PREROUTING -i eth0 -p udp --dport 53 -j REDIRECT --to-port 5353
sudo iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 53 -j REDIRECT --to-port 5353

# 2. Persist rules across reboots (Debian/Ubuntu)
sudo netfilter-persistent save`
})

const net_compose = buildSnippet({
  lang: 'yaml',
  code: `services:
  routewarden:
    image: ghcr.io/routewarden/tcp-warden:latest
    network_mode: host      # Host networking allows direct binding to port 53 UDP & TCP
    volumes:
      - ./tcp-warden.yaml:/etc/routewarden/tcp-warden.yaml:ro
      - routewarden-data:/var/lib/routewarden
    depends_on:
      - coredns

  coredns:
    image: coredns/coredns:latest
    command: -conf /etc/coredns/Corefile
    volumes:
      - ./Corefile:/etc/coredns/Corefile:ro
    # Listen only on localhost 127.0.0.1:5353; RouteWarden guards the public interface
    ports:
      - "127.0.0.1:5353:53/udp"
      - "127.0.0.1:5353:53/tcp"

volumes:
  routewarden-data:`
})

const netFirewallSnippets = computed(() => ({
  tcp: [
    { filename: 'nftables (Modern Linux)', lang: 'bash', code: net_nftables.cleanCode, html: net_nftables.html, hasDiff: false },
    { filename: 'iptables (Legacy / Cloud VMs)', lang: 'bash', code: net_iptables.cleanCode, html: net_iptables.html, hasDiff: false },
  ]
}))

const netComposeSnippets = computed(() => ({
  tcp: [
    { filename: 'docker-compose.yml', lang: 'yaml', code: net_compose.cleanCode, html: net_compose.html, hasDiff: false },
  ]
}))

// ─── 4. Testing & Verification Snippets ─────────────────────────────────────
const test_udp_query = buildSnippet({
  lang: 'bash',
  code: `# Standard query over UDP port 53
dig @127.0.0.1 -p 53 example.com A`
})

const test_tcp_query = buildSnippet({
  lang: 'bash',
  code: `# Force query over TCP (+tcp)
dig @127.0.0.1 -p 53 +tcp example.com A`
})

const test_blocked_domain = buildSnippet({
  lang: 'bash',
  code: `# Query a blocked domain — receives immediate NXDOMAIN or REFUSED
dig @127.0.0.1 -p 53 c2.threat.org A`
})

const test_blocked_type = buildSnippet({
  lang: 'bash',
  code: `# Query with blocked type ANY — connection dropped / refused
dig @127.0.0.1 -p 53 example.com ANY`
})

const testSnippets = computed(() => ({
  tcp: [
    { filename: '1. UDP Query', lang: 'bash', code: test_udp_query.cleanCode, html: test_udp_query.html, hasDiff: false },
    { filename: '2. TCP Query', lang: 'bash', code: test_tcp_query.cleanCode, html: test_tcp_query.html, hasDiff: false },
    { filename: '3. Blocked Domain', lang: 'bash', code: test_blocked_domain.cleanCode, html: test_blocked_domain.html, hasDiff: false },
    { filename: '4. Blocked Query Type', lang: 'bash', code: test_blocked_type.cleanCode, html: test_blocked_type.html, hasDiff: false },
  ]
}))
</script>

# DNS Guard Plugin (`dns`)

The **DNS Guard Plugin** provides protocol-aware Layer 4 inspection for DNS traffic over both **UDP** and **TCP** (RFC 1035). It acts as an inline datagram firewall for DNS resolvers and authoritatives, blocking malicious domains, unauthorized zone transfers (`AXFR`), `ANY` query amplification vectors, and DNS rebinding attacks before queries reach your upstream DNS server.

---

## Capabilities & Threat Defense

| Threat / Attack Vector | Defense Mechanism | Action Taken |
| :--- | :--- | :--- |
| **DNS Amplification (EDNS0 / ANY)** | Filters query types against `blocked_qtypes` and caps `max_packet_size` | Queries dropped silently or refused without amplification response |
| **Malicious Domain Lookups (C2 / Phishing)** | Domain pattern matching (`blocked_domains` / `allowed_domains`) with wildcard support | Returns immediate synthetic `NXDOMAIN` / `REFUSED` response |
| **DNS Rebinding Attacks** | `block_private_ips` scans upstream response records for RFC1918 / loopback ranges | Response stripped or replaced to prevent intranet takeover |
| **Zone Transfer Exfiltration** | Blocks `AXFR` (query type 252) and `IXFR` (type 251) queries | Dropped or rejected, shielding internal zone topology |
| **Cache Poisoning / Thrashing** | `min_ttl` enforces minimum time-to-live values on upstream replies | Overwrites low TTLs before forwarding to clients |
| **Resolver Memory Exhaustion** | `udp.max_sessions` and `udp.session_timeout` reap idle client mapping tables | Prevents NAT session exhaustion and state table depletion |

---

## Installation

Install the DNS plugin using the CLI or declaratively:

<CodeViewer :snippets="installSnippets" />

---

## Configuration Reference

Configure a dual-transport DNS service in `tcp-warden.yaml`:

<CodeViewer :snippets="configSnippets" />

### Configuration Options

| Field | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `listen` | `string` | `":53"` | Listen address and port. |
| `upstream` | `string` | `"1.1.1.1:53"` | Upstream resolver or recursive DNS backend. |
| `transport` | `string` | `"both"` | Network transport: `"udp"`, `"tcp"`, or `"both"` (binds both sockets simultaneously). |
| `protocol` | `string` | `"dns"` | Must be set to `"dns"`. |
| `plugin_config.blocked_domains` | `[]string` | `[]` | List of blocked domain patterns. Supports leading/trailing wildcards (e.g. `*.ads.*`, `c2.threat.org`). |
| `plugin_config.allowed_domains` | `[]string` | `[]` | List of allowed domain patterns. If specified and non-empty, only matching domains are allowed through. |
| `plugin_config.blocked_qtypes` | `[]string` | `[]` | DNS record types to reject (e.g., `["ANY", "AXFR", "TXT"]`). |
| `plugin_config.allowed_qtypes` | `[]string` | `[]` | Optional allowlist of DNS record types (e.g., `["A", "AAAA", "CNAME", "PTR"]`). |
| `plugin_config.block_private_ips` | `bool` | `false` | When true, upstream responses resolving to private/internal IPs (`127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`) are blocked to prevent DNS rebinding. |
| `plugin_config.min_ttl` | `int` | `0` | Minimum TTL in seconds. Responses with TTLs lower than this value have their TTL rewritten to `min_ttl`. |
| `plugin_config.max_packet_size` | `int` | `4096` | Maximum allowed UDP DNS packet size in bytes. Drops oversized datagrams used in reflection attacks. |

---

## Network & Deployment Architecture

### Option A: Kernel Firewall Redirection (nftables / iptables)

Redirect incoming external port `53` traffic (both UDP and TCP) to RouteWarden port `5353`:

<CodeViewer :snippets="netFirewallSnippets" />

### Option B: Docker Compose with CoreDNS Backend

Run RouteWarden on the host network to guard an internal CoreDNS or Unbound instance:

<CodeViewer :snippets="netComposeSnippets" />

---

## Testing & Verification

Verify standard resolution, forced TCP queries, and blocked domain defense:

<CodeViewer :snippets="testSnippets" />
