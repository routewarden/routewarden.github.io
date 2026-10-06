---
title: BitTorrent Guard Plugin (TCP & UDP)
description: Protocol-aware Layer 4 BitTorrent firewall and traffic controller supporting Peer Wire Protocol (TCP), DHT (UDP), and uTP (UDP) with info-hash filtering, client peer ID verification, and anti-amplification protection.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../../.vitepress/theme/composables/useCodeSnippet'

// ─── 1. Installation Snippets ───────────────────────────────────────────────
const install_cli = buildSnippet({
  lang: 'bash',
  code: `# Install using short name
tcp-warden plugins install bittorrent

# Or install via Git repository URL
tcp-warden plugins install https://github.com/routewarden/plugins/bittorrent`
})

const install_yaml = buildSnippet({
  lang: 'yaml',
  code: `# tcp-warden.yaml
plugins:
  bittorrent:
    enabled: true
    source: "https://github.com/routewarden/plugins/bittorrent"`
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
  torrent_gateway:
    listen: ":6881"
    upstream: "10.0.0.50:6881"
    transport: "both"                 # Inspects Peer Wire over TCP + DHT/uTP over UDP
    protocol: "bittorrent"
    rate_limit:
      connections_per_minute: 600
      burst: 100
    udp:
      session_timeout: "30s"
      max_sessions: 15000
      read_buffer_size: 65535
    plugin_config:
      # Block or allow specific torrents by SHA-1 info-hash (40 hex chars)
      blocked_info_hashes:
        - "aabbccddeeff00112233445566778899aabbccdd"
      allowed_info_hashes: []         # If non-empty, ONLY these torrents are permitted

      # Client identity validation
      require_peer_id_format: true    # Enforces standard Azureus style (-CCVVVV-...) to drop bots
      allowed_peer_id_prefixes:
        - "-qB-"                      # qBittorrent
        - "-TR-"                      # Transmission
        - "-DE-"                      # Deluge
        - "-lt-"                      # libtorrent
      blocked_peer_id_prefixes: []

      # Private tracker and discovery controls
      private_tracker_mode: false     # When true, rejects peers advertising DHT extensions (BEP 5)
      block_dht: false                # Block all UDP DHT discovery traffic
      block_utp: false                # Block Micro Transport Protocol (BEP 29) over UDP
      blocked_dht_methods:
        - "announce_peer"             # Mitigate DHT poisoning and unwanted peer injection
      max_dht_packet_size: 1500       # Mitigate UDP amplification attacks`
})

const configSnippets = computed(() => ({
  tcp: [
    { filename: 'tcp-warden.yaml', lang: 'yaml', code: config_yaml.cleanCode, html: config_yaml.html, hasDiff: false },
  ]
}))

// ─── 3. Network Redirection Snippets ────────────────────────────────────────
const net_nftables = buildSnippet({
  lang: 'bash',
  code: `# Redirect incoming BitTorrent ports (TCP & UDP 6881-6889) to RouteWarden port 6881
sudo nft add rule ip routewarden_nat prerouting iifname "eth0" tcp dport 6881-6889 redirect to :6881
sudo nft add rule ip routewarden_nat prerouting iifname "eth0" udp dport 6881-6889 redirect to :6881`
})

const net_iptables = buildSnippet({
  lang: 'bash',
  code: `# Redirect incoming BitTorrent TCP & UDP to RouteWarden port 6881
sudo iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 6881:6889 -j REDIRECT --to-port 6881
sudo iptables -t nat -A PREROUTING -i eth0 -p udp --dport 6881:6889 -j REDIRECT --to-port 6881

# Persist rules across reboots (Debian/Ubuntu)
sudo netfilter-persistent save`
})

const net_compose = buildSnippet({
  lang: 'yaml',
  code: `services:
  routewarden:
    image: ghcr.io/routewarden/tcp-warden:latest
    network_mode: host
    volumes:
      - ./tcp-warden.yaml:/etc/routewarden/tcp-warden.yaml:ro
      - routewarden-data:/var/lib/routewarden
    depends_on:
      - qbittorrent

  qbittorrent:
    image: lscr.io/linuxserver/qbittorrent:latest
    network_mode: host
    environment:
      - WEBUI_PORT=8080
      - TORRENTING_PORT=6882          # Client listens on internal port; RouteWarden guards 6881
    volumes:
      - ./config:/config
      - ./downloads:/downloads

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
const test_tcp_handshake = buildSnippet({
  lang: 'bash',
  code: `# Send a synthetic BitTorrent 68-byte handshake (PSTR: "BitTorrent protocol")
printf '\\x13BitTorrent protocol\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\xaa\\xbb\\xcc\\xdd\\xee\\xff\\x00\\x11\\x22\\x33\\x44\\x55\\x66\\x77\\x88\\x99\\xaa\\xbb\\xcc\\xdd-qB4500-123456789012' | nc 127.0.0.1 6881`
})

const test_dht_query = buildSnippet({
  lang: 'bash',
  code: `# Send a bencoded DHT ping query over UDP
echo -n "d1:ad2:id20:0123456789abcdefghije1:q4:ping1:t2:aa1:y1:qe" | nc -u -w1 127.0.0.1 6881`
})

const test_blocked_hash = buildSnippet({
  lang: 'bash',
  code: `# Handshake using a blocked info-hash is dropped immediately
printf '\\x13BitTorrent protocol\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\xaa\\xbb\\xcc\\xdd\\xee\\xff\\x00\\x11\\x22\\x33\\x44\\x55\\x66\\x77\\x88\\x99\\xaa\\xbb\\xcc\\xdd-qB4500-123456789012' | nc 127.0.0.1 6881
# Connection terminated before proxying`
})

const testSnippets = computed(() => ({
  tcp: [
    { filename: '1. Valid Handshake', lang: 'bash', code: test_tcp_handshake.cleanCode, html: test_tcp_handshake.html, hasDiff: false },
    { filename: '2. DHT Ping Query', lang: 'bash', code: test_dht_query.cleanCode, html: test_dht_query.html, hasDiff: false },
    { filename: '3. Blocked Info-Hash', lang: 'bash', code: test_blocked_hash.cleanCode, html: test_blocked_hash.html, hasDiff: false },
  ]
}))
</script>

# BitTorrent Guard Plugin (`bittorrent`)

The **BitTorrent Guard Plugin** provides protocol-aware security and policy enforcement for all three transports of the BitTorrent ecosystem:
- **Peer Wire Protocol** over **TCP** (BEP 3)
- **Mainline DHT (Distributed Hash Table)** over **UDP** (BEP 5)
- **Micro Transport Protocol (uTP)** over **UDP** (BEP 29)

It inspects initial handshakes, decodes bencoded DHT RPC dictionaries, enforces client peer ID policies, and stops DHT amplification attacks.

---

## Capabilities & Threat Defense

| Threat / Attack Vector | Defense Mechanism | Action Taken |
| :--- | :--- | :--- |
| **Unauthorized / Copyright Torrents** | SHA-1 Info-hash filtering (`blocked_info_hashes` / `allowed_info_hashes`) | Handshake dropped before swarm data transfer begins |
| **Malicious Bots & Scanners** | Enforces `-CCVVVV-` format (`require_peer_id_format`) and client prefixes (`allowed_peer_id_prefixes`) | Non-compliant or unknown client peer IDs rejected |
| **DHT Amplification Attacks** | Enforces `max_dht_packet_size` and filters query types | Large reflection payloads and crafted queries discarded silently |
| **DHT Swarm Poisoning** | `blocked_dht_methods: ["announce_peer"]` blocks unwanted peer advertisements | Bencoded `announce_peer` RPCs dropped before polluting DHT index |
| **Private Swarm DHT Leaks** | `private_tracker_mode: true` checks extension bits in handshake | Peers advertising DHT capability (BEP 5 bit) dropped to preserve private swarms |
| **uTP Channel Abuse** | `block_utp: true` drops UDP datagrams matching the 20-byte uTP header (BEP 29) | Forces clients onto TCP for uniform stream rate limiting |

---

## Installation

Install the BitTorrent plugin using the CLI or declaratively:

<CodeViewer :snippets="installSnippets" />

---

## Configuration Reference

Configure a multi-transport BitTorrent guard in `tcp-warden.yaml`:

<CodeViewer :snippets="configSnippets" />

### Configuration Options

| Field | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `listen` | `string` | `":6881"` | Local proxy listen address and port. |
| `upstream` | `string` | `"10.0.0.50:6881"` | Upstream BitTorrent client or seeder node. |
| `transport` | `string` | `"both"` | Network transport: `"both"` (binds TCP for Peer Wire and UDP for DHT/uTP), `"tcp"`, or `"udp"`. |
| `protocol` | `string` | `"bittorrent"` | Must be set to `"bittorrent"`, `"bittorrent-tcp"`, `"bittorrent-dht"`, or `"bittorrent-utp"`. |
| `plugin_config.blocked_info_hashes` | `[]string` | `[]` | List of 40-character hex SHA-1 info-hashes to block. Case-insensitive. |
| `plugin_config.allowed_info_hashes` | `[]string` | `[]` | If non-empty, only matching info-hashes are permitted (whitelist / corporate distribution mode). |
| `plugin_config.require_peer_id_format` | `bool` | `false` | When true, rejects peers whose 20-byte peer ID does not conform to the standard Azureus convention (`-CCVVVV-...`). |
| `plugin_config.allowed_peer_id_prefixes` | `[]string` | `[]` | List of allowed client peer ID prefixes (e.g. `["-qB-", "-TR-", "-DE-"]`). |
| `plugin_config.blocked_peer_id_prefixes` | `[]string` | `[]` | Explicitly blocked client prefixes. |
| `plugin_config.private_tracker_mode` | `bool` | `false` | When true, peers advertising DHT support in their 8-byte handshake extension flags are dropped. |
| `plugin_config.block_dht` | `bool` | `false` | When true, drops all UDP DHT queries and responses. |
| `plugin_config.block_utp` | `bool` | `false` | When true, drops all UDP uTP packets (forcing TCP transport). |
| `plugin_config.blocked_dht_methods` | `[]string` | `[]` | DHT query methods to block (e.g., `["announce_peer", "get_peers"]`). |
| `plugin_config.allowed_dht_methods` | `[]string` | `[]` | If non-empty, only these DHT methods are accepted. Queries whose method name cannot be parsed from the bencode payload are **dropped** when an allowlist is active (since v3.4.0). |
| `plugin_config.max_dht_packet_size` | `int` | `1500` | Maximum allowed UDP DHT packet size in bytes to prevent amplification. |

---

## Network & Deployment Architecture

### Option A: Kernel Firewall Redirection (nftables / iptables)

Redirect external BitTorrent traffic across TCP & UDP ports to RouteWarden port `6881`:

<CodeViewer :snippets="netFirewallSnippets" />

### Option B: Docker Compose with Dedicated Torrent Client

Isolate your download client container behind RouteWarden:

<CodeViewer :snippets="netComposeSnippets" />

---

## Testing & Verification

Verify TCP handshakes, DHT RPC inspection, and info-hash blocking:

<CodeViewer :snippets="testSnippets" />
