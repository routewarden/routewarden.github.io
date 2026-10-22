---
title: Network & Firewall Integrations
description: Integration patterns for TCP Warden using nftables, iptables, reverse proxy port swapping, and Docker network isolation.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

// ─── 0. Architecture Topologies ─────────────────────────────────────────────
const arch_all = buildSnippet({
  lang: 'plaintext',
  code: `Pattern 1: nftables Redirection (Modern Linux Default)
Client ──► [eth0 : Port 22] ──(nft PREROUTING)──► RouteWarden (:2222) ──► sshd (127.0.0.1:22)

Pattern 2: iptables / UFW / firewalld (Legacy / Cloud VMs)
Client ──► [eth0 : Port 25] ──(iptables REDIRECT)──► RouteWarden (:2525) ──► postfix (127.0.0.1:25)

Pattern 3: Direct Port Swapping (Reverse Proxy)
Client ──► [Standard Port 5432] ──► RouteWarden (:5432) ──► postgres (127.0.0.1:5433)

Pattern 4: Docker Network Isolation (Containerized Stacks)
Client ──► [Host Port 6379] ──► RouteWarden ──(Internal Bridge)──► redis-server (no host ports)`
})

const arch_nftables = buildSnippet({
  lang: 'plaintext',
  code: `┌─────────────────────────────────────────────────────────────────────────────────┐
│ Linux Host (nftables kernel packet redirection)                                 │
│                                                                                 │
│ Inbound Packet (e.g. TCP :22, :25, :110, :143, :443)                           │
│       │                                                                         │
│       ▼                                                                         │
│ [eth0 Network Interface]                                                        │
│       │                                                                         │
│       ▼ (iifname "eth0" tcp dport 22 redirect to :2222)                         │
│ [nftables PREROUTING Chain]                                                     │
│       │                                                                         │
│       ▼                                                                         │
│ [RouteWarden L4 Proxy (:2222)] ──► Inspects Auth, GeoIP, Rate Limits, CrowdSec  │
│       │                                                                         │
│       ▼ (Loopback forwards via lo interface — bypasses external prerouting hook) │
│ [Backend Daemon (127.0.0.1:22)] ──► Legitimate connection approved              │
└─────────────────────────────────────────────────────────────────────────────────┘`
})

const arch_portswap = buildSnippet({
  lang: 'plaintext',
  code: `┌─────────────────────────────────────────────────────────────────────────────────┐
│ Direct Port Swapping (Loopback Isolation)                                       │
│                                                                                 │
│ External Client Connection                                                      │
│       │                                                                         │
│       ▼                                                                         │
│ [Standard Public Port (e.g. :5432, :6379, :3306)]                               │
│       │                                                                         │
│       ▼                                                                         │
│ [RouteWarden L4 Reverse Proxy] ──► Inspects Wire Protocol & Tracks Failures     │
│       │                                                                         │
│       ▼                                                                         │
│ [Backend Daemon Bound to 127.0.0.1:InternalPort (e.g. 127.0.0.1:5433)]          │
│                                                                                 │
│ ⚠️  Backend binds strictly to 127.0.0.1 so external clients cannot bypass proxy │
└─────────────────────────────────────────────────────────────────────────────────┘`
})

const arch_docker = buildSnippet({
  lang: 'plaintext',
  code: `┌─────────────────────────────────────────────────────────────────────────────────┐
│ Docker Compose Network Isolation                                                │
│                                                                                 │
│ Internet Clients                                                                │
│       │                                                                         │
│       ▼                                                                         │
│ [Host Network Interfaces (ports: "22:2222", "5432:5432", "6379:6379")]          │
│       │                                                                         │
│       ▼                                                                         │
│ [tcp-warden container (Entrypoint Proxy)]                                       │
│       │                                                                         │
│       ▼ (Private Bridge Network: internal-net)                                  │
│ ┌─────────────────────────────────────────────────────────────────────────────┐ │
│ │ Backend Containers (postgres-backend:5432, redis-backend:6379)               │ │
│ │ 🔒 NO published host ports — physically unreachable from outside host       │ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘`
})

const archSnippets = computed(() => ({
  tcp: [
    { filename: '1. All Patterns Overview', lang: 'plaintext', code: arch_all.cleanCode, html: arch_all.html, hasDiff: false },
    { filename: '2. Firewall NAT Flow', lang: 'plaintext', code: arch_nftables.cleanCode, html: arch_nftables.html, hasDiff: false },
    { filename: '3. Port Swapping Flow', lang: 'plaintext', code: arch_portswap.cleanCode, html: arch_portswap.html, hasDiff: false },
    { filename: '4. Docker Network Shield', lang: 'plaintext', code: arch_docker.cleanCode, html: arch_docker.html, hasDiff: false },
  ]
}))

// ─── 1. nftables Snippets ───────────────────────────────────────────────────
const nft_setup = buildSnippet({
  lang: 'bash',
  code: `# 1. Create a dedicated NAT table for TCP Warden
sudo nft add table ip routewarden_nat

# 2. Add the prerouting chain
sudo nft add chain ip routewarden_nat prerouting '{ type nat hook prerouting priority dstnat; policy accept; }'`
})

const nft_rules = buildSnippet({
  lang: 'bash',
  code: `# SSH: Redirect external port 22 -> TCP Warden port 2222
sudo nft add rule ip routewarden_nat prerouting iifname "eth0" tcp dport 22 redirect to :2222

# SMTP: Redirect external port 25 -> TCP Warden port 2525
sudo nft add rule ip routewarden_nat prerouting iifname "eth0" tcp dport 25 redirect to :2525

# POP3: Redirect external port 110 -> TCP Warden port 1110
sudo nft add rule ip routewarden_nat prerouting iifname "eth0" tcp dport 110 redirect to :1110

# IMAP: Redirect external port 143 -> TCP Warden port 1143
sudo nft add rule ip routewarden_nat prerouting iifname "eth0" tcp dport 143 redirect to :1143

# FTP Control: Redirect external port 21 -> TCP Warden port 2121
sudo nft add rule ip routewarden_nat prerouting iifname "eth0" tcp dport 21 redirect to :2121

# TLS SNI / HTTPS: Redirect external port 443 -> TCP Warden port 8443
sudo nft add rule ip routewarden_nat prerouting iifname "eth0" tcp dport 443 redirect to :8443

# HTTP: Redirect external port 80 -> TCP Warden port 8081
sudo nft add rule ip routewarden_nat prerouting iifname "eth0" tcp dport 80 redirect to :8081`
})

const nft_persist = buildSnippet({
  lang: 'bash',
  code: `# Save current nftables rules to system config
sudo nft list table ip routewarden_nat | sudo tee -a /etc/nftables.conf

# Enable and start nftables service
sudo systemctl enable --now nftables`
})

const nftSnippets = computed(() => ({
  tcp: [
    { filename: '1. Setup NAT Chain', lang: 'bash', code: nft_setup.cleanCode, html: nft_setup.html, hasDiff: false },
    { filename: '2. Service Rules', lang: 'bash', code: nft_rules.cleanCode, html: nft_rules.html, hasDiff: false },
    { filename: '3. Persist Rules', lang: 'bash', code: nft_persist.cleanCode, html: nft_persist.html, hasDiff: false },
  ]
}))

// ─── 2. iptables / UFW / firewalld Snippets ─────────────────────────────────
const iptables_rules = buildSnippet({
  lang: 'bash',
  code: `# SSH: Redirect external port 22 -> TCP Warden port 2222
sudo iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 22 -j REDIRECT --to-port 2222

# SMTP: Redirect external port 25 -> TCP Warden port 2525
sudo iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 25 -j REDIRECT --to-port 2525

# POP3: Redirect external port 110 -> TCP Warden port 1110
sudo iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 110 -j REDIRECT --to-port 1110

# IMAP: Redirect external port 143 -> TCP Warden port 1143
sudo iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 143 -j REDIRECT --to-port 1143

# FTP Control: Redirect external port 21 -> TCP Warden port 2121
sudo iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 21 -j REDIRECT --to-port 2121

# TLS SNI / HTTPS: Redirect external port 443 -> TCP Warden port 8443
sudo iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 443 -j REDIRECT --to-port 8443

# HTTP: Redirect external port 80 -> TCP Warden port 8081
sudo iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 80 -j REDIRECT --to-port 8081`
})

const iptables_persist = buildSnippet({
  lang: 'bash',
  code: `# Debian / Ubuntu (iptables-persistent)
sudo apt-get install -y iptables-persistent
sudo netfilter-persistent save

# RHEL / Rocky / AlmaLinux
sudo iptables-save | sudo tee /etc/sysconfig/iptables`
})

const ufw_rules = buildSnippet({
  lang: 'bash',
  code: `# Add to /etc/ufw/before.rules before the *filter section:
# *nat
# :PREROUTING ACCEPT [0:0]
# -A PREROUTING -i eth0 -p tcp --dport 22 -j REDIRECT --to-port 2222
# -A PREROUTING -i eth0 -p tcp --dport 5432 -j REDIRECT --to-port 5433
# COMMIT

# Reload UFW to apply
sudo ufw reload`
})

const firewalld_rules = buildSnippet({
  lang: 'bash',
  code: `# Forward incoming external port 22 to TCP Warden port 2222
sudo firewall-cmd --permanent --add-forward-port=port=22:proto=tcp:toport=2222

# Forward incoming external port 5432 to TCP Warden port 5433
sudo firewall-cmd --permanent --add-forward-port=port=5432:proto=tcp:toport=5433

# Reload firewalld to apply
sudo firewall-cmd --reload`
})

const iptablesSnippets = computed(() => ({
  tcp: [
    { filename: 'iptables (PREROUTING)', lang: 'bash', code: iptables_rules.cleanCode, html: iptables_rules.html, hasDiff: false },
    { filename: 'Rule Persistence', lang: 'bash', code: iptables_persist.cleanCode, html: iptables_persist.html, hasDiff: false },
    { filename: 'UFW (before.rules)', lang: 'bash', code: ufw_rules.cleanCode, html: ufw_rules.html, hasDiff: false },
    { filename: 'firewalld (RHEL/CentOS)', lang: 'bash', code: firewalld_rules.cleanCode, html: firewalld_rules.html, hasDiff: false },
  ]
}))

// ─── 3. Port Swapping Snippets ──────────────────────────────────────────────
const portswap_ssh = buildSnippet({
  lang: 'bash',
  code: `# 1. Edit /etc/ssh/sshd_config:
# Port 22222
# ListenAddress 127.0.0.1

# 2. Restart sshd daemon
sudo systemctl restart sshd`
})

const portswap_pg = buildSnippet({
  lang: 'bash',
  code: `# 1. Edit /etc/postgresql/<version>/main/postgresql.conf:
# port = 5433
# listen_addresses = '127.0.0.1'

# 2. Restart PostgreSQL daemon
sudo systemctl restart postgresql`
})

const portswap_redis = buildSnippet({
  lang: 'bash',
  code: `# 1. Edit /etc/redis/redis.conf:
# port 6380
# bind 127.0.0.1

# 2. Restart Redis server
sudo systemctl restart redis-server`
})

const portswap_mysql = buildSnippet({
  lang: 'bash',
  code: `# 1. Edit /etc/mysql/my.cnf:
# [mysqld]
# port = 3307
# bind-address = 127.0.0.1

# 2. Restart MySQL / MariaDB daemon
sudo systemctl restart mysql`
})

const portswapSnippets = computed(() => ({
  tcp: [
    { filename: 'SSH (sshd_config)', lang: 'bash', code: portswap_ssh.cleanCode, html: portswap_ssh.html, hasDiff: false },
    { filename: 'PostgreSQL (postgresql.conf)', lang: 'bash', code: portswap_pg.cleanCode, html: portswap_pg.html, hasDiff: false },
    { filename: 'Redis (redis.conf)', lang: 'bash', code: portswap_redis.cleanCode, html: portswap_redis.html, hasDiff: false },
    { filename: 'MySQL (my.cnf)', lang: 'bash', code: portswap_mysql.cleanCode, html: portswap_mysql.html, hasDiff: false },
  ]
}))

// ─── 4. Docker Compose Isolation Snippets ───────────────────────────────────
const docker_compose = buildSnippet({
  lang: 'yaml',
  code: `services:
  tcp-warden:
    image: ghcr.io/routewarden/tcp-warden:latest
    container_name: tcp-warden
    restart: unless-stopped
    ports:
      # Public listener ports (protected by TCP Warden)
      - "22:2222"       # SSH Guard
      - "80:8081"       # HTTP Protocol Guard
      - "443:8443"      # TLS SNI Guard
      - "25:2525"       # SMTP Mail Guard
      - "587:5870"      # SMTP Submission Guard
      - "143:1143"      # IMAP4 Mail Guard
      - "993:9930"      # IMAPS Guard
      - "389:1390"      # LDAP Guard
      - "636:1636"      # LDAPS Guard
      - "5432:5432"     # PostgreSQL Bastion
      - "6379:6379"     # Redis Guard
      - "9091:9091"     # TCP Warden Management API
    volumes:
      - ./tcp-warden.yaml:/etc/routewarden/tcp-warden.yaml:ro
      - tcp-warden-data:/var/lib/routewarden
    networks:
      - internal-net

  postgres-backend:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: appuser
      POSTGRES_PASSWORD: secretpassword
      POSTGRES_DB: appdb
    # Notice: NO host port publication! Only accessible by tcp-warden
    networks:
      - internal-net

  redis-backend:
    image: redis:7-alpine
    command: ["redis-server", "--requirepass", "secretpassword"]
    # Notice: NO host port publication! Only accessible by tcp-warden
    networks:
      - internal-net

networks:
  internal-net:
    driver: bridge

volumes:
  tcp-warden-data:`
})

const docker_warden_yaml = buildSnippet({
  lang: 'yaml',
  code: `services:
  ssh:
    listen: ":2222"
    upstream: "ssh-backend:22"
    protocol: "ssh"
    max_auth_failures: 3
    ban_duration: "2h"

  http:
    listen: ":8081"
    upstream: "web-backend:80"
    protocol: "http"

  postgres:
    listen: ":5432"
    upstream: "postgres-backend:5432"
    protocol: "postgres"
    max_auth_failures: 3
    ban_duration: "2h"

  redis:
    listen: ":6379"
    upstream: "redis-backend:6379"
    protocol: "redis"
    max_auth_failures: 5
    ban_duration: "1h"`
})

const dockerSnippets = computed(() => ({
  tcp: [
    { filename: 'docker-compose.yml', lang: 'yaml', code: docker_compose.cleanCode, html: docker_compose.html, hasDiff: false },
    { filename: 'tcp-warden.yaml', lang: 'yaml', code: docker_warden_yaml.cleanCode, html: docker_warden_yaml.html, hasDiff: false },
  ]
}))

// ─── 5. Privileged Port Capabilities ────────────────────────────────────────
const priv_systemd = buildSnippet({
  lang: 'bash',
  code: `# /etc/systemd/system/tcp-warden.service
[Unit]
Description=RouteWarden TCP L4 Security Proxy
After=network.target

[Service]
User=routewarden
Group=routewarden
AmbientCapabilities=CAP_NET_BIND_SERVICE
CapabilityBoundingSet=CAP_NET_BIND_SERVICE
ExecStart=/usr/local/bin/rwarden tcp up --config /etc/routewarden/tcp-warden.yaml
# Or standalone: ExecStart=/usr/local/bin/tcp-warden run --config /etc/routewarden/tcp-warden.yaml
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target`
})

const priv_docker = buildSnippet({
  lang: 'yaml',
  code: `# Direct binding to privileged ports (< 1024) in Docker Compose
services:
  tcp-warden:
    image: ghcr.io/routewarden/tcp-warden:latest
    cap_add:
      - NET_BIND_SERVICE
    ports:
      - "22:22"
      - "80:80"
      - "443:443"`
})

const privSnippets = computed(() => ({
  tcp: [
    { filename: 'Systemd Unit (Bare Metal)', lang: 'bash', code: priv_systemd.cleanCode, html: priv_systemd.html, hasDiff: false },
    { filename: 'Docker cap_add (Compose)', lang: 'yaml', code: priv_docker.cleanCode, html: priv_docker.html, hasDiff: false },
  ]
}))

// ─── 6. Verification Checklist Snippets ─────────────────────────────────────
const verify_listeners = buildSnippet({
  lang: 'bash',
  code: `# Check that TCP Warden and backends listen on distinct ports
ss -tlpn | grep -E ':(22|2222|5432|5433|6379|6380)'`
})

const verify_nat = buildSnippet({
  lang: 'bash',
  code: `# For nftables:
sudo nft list table ip routewarden_nat

# For iptables (view packet & byte counters):
sudo iptables -t nat -L PREROUTING -v -n --line-numbers`
})

const verify_events_bans = buildSnippet({
  lang: 'bash',
  code: `# 1. Stream live security events
curl -N http://127.0.0.1:9091/events

# 2. Query status and active bans via CLI
rwarden tcp status
# Or standalone: tcp-warden status

# 3. Query active bans via cURL
curl -s http://127.0.0.1:9091/api/banlist | jq .`
})

const verifySnippets = computed(() => ({
  tcp: [
    { filename: '1. Active Listeners', lang: 'bash', code: verify_listeners.cleanCode, html: verify_listeners.html, hasDiff: false },
    { filename: '2. Firewall NAT Counters', lang: 'bash', code: verify_nat.cleanCode, html: verify_nat.html, hasDiff: false },
    { filename: '3. Logs & Active Bans', lang: 'bash', code: verify_events_bans.cleanCode, html: verify_events_bans.html, hasDiff: false },
  ]
}))
</script>

# Network & Firewall Integrations

TCP Warden acts as an intelligent Layer 4 reverse proxy and protocol firewall. In order to inspect, rate-limit, and ban abusive clients, incoming traffic must pass through TCP Warden before reaching your backend services.

There are four primary architectures to achieve this:

<CodeViewer :snippets="archSnippets" />

---

## Architecture Comparison

| Method | Modifies Backend Config? | Requires Firewall Rules? | Client IP Preserved? | Recommended For |
| :--- | :--- | :--- | :--- | :--- |
| **`nftables`** | **No** (Zero touch) | Yes (`nft add rule`) | Yes | Modern Linux (Debian 10+, Ubuntu 20+, RHEL 8+) |
| **`iptables`** | **No** (Zero touch) | Yes (`iptables -t nat`) | Yes | Legacy Linux systems & Cloud VMs |
| **Port Swapping** | **Yes** (Move backend to loopback) | No | Yes (via L4 proxying) | Bare-metal environments without NAT access |
| **Docker Isolation** | **No** (Zero touch) | No | Yes | Containerized stacks & Docker Compose |

---

## Strategy 1: `nftables` Redirection (Modern Linux Default)

`nftables` provides kernel-level packet redirection with minimal overhead. Your backend service continues listening on its default port on `127.0.0.1`. The kernel intercepts incoming traffic on external network interfaces and redirects it to TCP Warden.

::: tip Port Range Recommendation: Privileged vs Unprivileged Ports
- **Privileged Ports (`<= 1024`):** Services like **SSH (`22`)**, **SMTP (`25`)**, **POP3 (`110`)**, **IMAP (`143`)**, **FTP (`21`)**, and **HTTP/TLS (`80` / `443`)** benefit most from `nftables`/`iptables` redirection because existing system daemons typically run as root on standard ports. Redirection routes traffic through TCP Warden without reconfiguring system services.
- **Unprivileged Ports (`> 1024`):** Services like **PostgreSQL (`5432`)**, **MySQL (`3306`)**, **Redis (`6379`)**, **MongoDB (`27017`)**, **AMQP (`5672`)**, and **MQTT (`1883`)** **do not require firewall rules**. You can simply bind TCP Warden directly to the standard port as a transparent reverse proxy (Strategy 3) or isolate them within a Docker network (Strategy 4).
:::

::: danger CRITICAL: LOOPBACK RECURSION PREVENTION
Always include `iifname "eth0"` (your external interface). **Never** redirect traffic on the loopback interface (`lo`). 

When TCP Warden forwards approved connections to `127.0.0.1:22`, the packet travels over `lo`. If the redirect rule matched all interfaces without `iifname`, TCP Warden's own connection would be caught and redirected back to TCP Warden, creating an infinite connection loop.
:::

<CodeViewer :snippets="nftSnippets" />

---

## Strategy 2: `iptables`, UFW, & firewalld Redirection

For hosts running legacy `iptables`, Ubuntu UFW, or RHEL/CentOS `firewalld`:

<CodeViewer :snippets="iptablesSnippets" />

---

## Strategy 3: Direct Port Swapping (Backend Reconfiguration)

If you prefer TCP Warden to bind directly to standard ports (`22`, `5432`, `6379`, `3306`) without using firewall NAT rules, update your backend daemon configurations so they release the standard port and bind strictly to loopback:

| Service | Configuration File | Required Setting Update | Service Restart Command |
| :--- | :--- | :--- | :--- |
| **SSH** | `/etc/ssh/sshd_config` | `Port 22222`<br>`ListenAddress 127.0.0.1` | `sudo systemctl restart sshd` |
| **SMTP (Postfix)** | `/etc/postfix/master.cf` | `127.0.0.1:2525 inet n - y - - smtpd` | `sudo systemctl restart postfix` |
| **POP3 & IMAP (Dovecot)**| `/etc/dovecot/conf.d/10-master.conf` | `inet_listener imap { port = 1144 }`<br>`inet_listener pop3 { port = 1111 }` | `sudo systemctl restart dovecot` |
| **PostgreSQL** | `/etc/postgresql/<ver>/main/postgresql.conf` | `port = 5433`<br>`listen_addresses = '127.0.0.1'` | `sudo systemctl restart postgresql` |
| **MySQL / MariaDB** | `/etc/mysql/my.cnf` | `port = 3307`<br>`bind-address = 127.0.0.1` | `sudo systemctl restart mysql` |
| **Redis** | `/etc/redis/redis.conf` | `port 6380`<br>`bind 127.0.0.1` | `sudo systemctl restart redis-server` |
| **MongoDB** | `/etc/mongod.conf` | `net.port: 27018`<br>`net.bindIp: 127.0.0.1` | `sudo systemctl restart mongod` |
| **RabbitMQ** | `/etc/rabbitmq/rabbitmq.conf` | `listeners.tcp.default = 127.0.0.1:5674` | `sudo systemctl restart rabbitmq-server` |
| **OpenLDAP** | `/etc/default/slapd` | `SLAPD_SERVICES="ldap://127.0.0.1:3890/"` | `sudo systemctl restart slapd` |
| **FTP (vsftpd)** | `/etc/vsftpd.conf` | `listen_port=2122`<br>`listen_address=127.0.0.1` | `sudo systemctl restart vsftpd` |

::: warning BIND ADDRESS REQUIREMENT
Always bind the backend service to `127.0.0.1` (loopback). If your backend service binds to `0.0.0.0` on its internal port, external attackers can bypass TCP Warden entirely by scanning and connecting directly to that port.
:::

<CodeViewer :snippets="portswapSnippets" />

---

## Strategy 4: Docker Compose Network Isolation

In containerized deployments, the backend database or service container should **never publish ports to the host**. Only TCP Warden exposes ports:

<CodeViewer :snippets="dockerSnippets" />

---

## Privileged Ports (< 1024) & Capabilities

On Linux systems, binding directly to ports below 1024 (`22` for SSH, `25` for SMTP, `80` for HTTP, `443` for HTTPS) normally requires root privileges.

### 1. In Docker: Host Port Mapping (Recommended)
When using Docker port mappings like `ports: - "22:2222"`, the host Docker daemon binds port `22` on the host, while TCP Warden runs safely as non-root `routewarden` (UID 1000) inside the container. **No root permissions are needed.**

### 2. In Docker: Direct Privileged Port Binding (`ports: - "22:22"`)
If you configure TCP Warden to bind directly to `:22` inside the container, grant the capability in `docker-compose.yml` or set `TARGET_USER=root`.

### 3. Outside Docker: Bare-Metal Linux (Systemd Service)
To bind privileged ports without running the daemon as root, configure `AmbientCapabilities=CAP_NET_BIND_SERVICE`:

<CodeViewer :snippets="privSnippets" />

---

## Verification & Troubleshooting Checklist

After configuring firewall redirection or port swapping, run through this checklist to ensure your setup is functioning correctly:

<CodeViewer :snippets="verifySnippets" />
