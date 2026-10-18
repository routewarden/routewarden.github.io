---
title: Multi-Node & Docker Compose Deployment
description: Production deployment recipes for central RouteWarden dashboards and distributed remote edge shippers.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../../.vitepress/theme/composables/useCodeSnippet'

// ─── 1. Central Server Snippets ──────────────────────────────────────────────
const central_compose = buildSnippet({
  lang: 'yaml',
  code: `services:
  routewarden-dashboard:
    image: ghcr.io/routewarden/cli:latest
    container_name: routewarden-dashboard
    restart: unless-stopped
    ports:
      - "7890:7890"
    volumes:
      # Persistent storage for master keypair and keystore
      - routewarden_data:/root/.routewarden
      # Optional: access Docker daemon to monitor local containers as well
      - /var/run/docker.sock:/var/run/docker.sock:ro
    command: ["dashboard", "--no-open", "--port", "7890"]

volumes:
  routewarden_data:`,
})

const centralComposeSnippets = computed(() => ({
  cli: [
    { filename: 'docker-compose.yml (Central Dashboard)', lang: 'yaml', code: central_compose.cleanCode, html: central_compose.html, hasDiff: false },
  ],
}))

const central_setup_cmd = buildSnippet({
  lang: 'bash',
  code: `# 1. Start the central dashboard
docker compose up -d

# 2. Generate an enrollment token for your remote node
docker exec -it routewarden-dashboard rwarden keys create edge-node-01`,
})

const centralSetupSnippets = computed(() => ({
  cli: [
    { filename: 'Central Server Commands', lang: 'bash', code: central_setup_cmd.cleanCode, html: central_setup_cmd.html, hasDiff: false },
  ],
}))

// ─── 2. Remote Edge Node Snippets ────────────────────────────────────────────
const remote_reg_cmd = buildSnippet({
  lang: 'bash',
  code: `# Run one-time registration on the remote host
rwarden register --url http://<central-ip>:7890 --key rw_sec_8f9a2b4c1e0d3f7a...`,
})

const remoteRegisterSnippets = computed(() => ({
  cli: [
    { filename: 'Remote Registration', lang: 'bash', code: remote_reg_cmd.cleanCode, html: remote_reg_cmd.html, hasDiff: false },
  ],
}))

const remote_compose = buildSnippet({
  lang: 'yaml',
  code: `services:
  traefik:
    image: traefik:v3.1
    container_name: edge-traefik
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    labels:
      # Mark container for RouteWarden auto-discovery
      - "routewarden=true"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./traefik.yml:/etc/traefik/traefik.yml:ro

  # Lightweight RouteWarden Shipper Companion (~10MB RAM)
  routewarden-shipper:
    image: ghcr.io/routewarden/cli:latest
    container_name: routewarden-shipper
    restart: unless-stopped
    volumes:
      # Read container logs
      - /var/run/docker.sock:/var/run/docker.sock:ro
      # Mount registered agent configuration
      - ~/.routewarden:/root/.routewarden:ro
    command: ["push", "--docker"]`,
})

const remoteComposeSnippets = computed(() => ({
  cli: [
    { filename: 'docker-compose.yml (Edge Companion)', lang: 'yaml', code: remote_compose.cleanCode, html: remote_compose.html, hasDiff: false },
  ],
}))

const launch_edge_cmd = buildSnippet({
  lang: 'bash',
  code: `docker compose up -d`,
})

const launchEdgeSnippets = computed(() => ({
  cli: [
    { filename: 'Start Companion Stack', lang: 'bash', code: launch_edge_cmd.cleanCode, html: launch_edge_cmd.html, hasDiff: false },
  ],
}))

// ─── 3. Systemd Unit Snippets ────────────────────────────────────────────────
const systemd_unit = buildSnippet({
  lang: 'ini',
  code: `[Unit]
Description=RouteWarden Remote Log Shipper
After=network.target nginx.service

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/rwarden push \\
  --config /etc/routewarden/agent.json \\
  --file /var/log/nginx/access.log \\
  --batch-size 100 \\
  --flush-interval 1s
Restart=always
RestartSec=5s

# Hardening
ProtectSystem=full
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target`,
})

const systemd_commands = buildSnippet({
  lang: 'bash',
  code: `# 1. Register agent with system path
sudo rwarden register \\
  --url http://<central-ip>:7890 \\
  --key rw_sec_8f9a2b4c1e0d... \\
  --config /etc/routewarden/agent.json

# 2. Enable and start systemd daemon
sudo systemctl daemon-reload
sudo systemctl enable --now rwarden-push
sudo systemctl status rwarden-push`,
})

const systemdSnippets = computed(() => ({
  cli: [
    { filename: '/etc/systemd/system/rwarden-push.service', lang: 'ini', code: systemd_unit.cleanCode, html: systemd_unit.html, hasDiff: false },
    { filename: 'Service Commands', lang: 'bash', code: systemd_commands.cleanCode, html: systemd_commands.html, hasDiff: false },
  ],
}))

// ─── 4. Kubernetes Sidecar Snippets ──────────────────────────────────────────
const k8s_yaml = buildSnippet({
  lang: 'yaml',
  code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ingress-gateway
spec:
  template:
    spec:
      volumes:
        - name: shared-logs
          emptyDir: {}
        - name: agent-config
          secret:
            secretName: routewarden-agent-secret
      containers:
        - name: gateway
          image: nginx:alpine
          volumeMounts:
            - name: shared-logs
              mountPath: /var/log/nginx

        - name: routewarden-shipper
          image: ghcr.io/routewarden/cli:latest
          command:
            - rwarden
            - push
            - --file=/var/log/nginx/access.log
            - --config=/etc/routewarden/agent.json
          volumeMounts:
            - name: shared-logs
              mountPath: /var/log/nginx:ro
            - name: agent-config
              mountPath: /etc/routewarden:ro
          resources:
            limits:
              cpu: 50m
              memory: 32Mi
            requests:
              cpu: 10m
              memory: 16Mi`,
})

const k8sSnippets = computed(() => ({
  cli: [
    { filename: 'k8s-sidecar-deployment.yaml', lang: 'yaml', code: k8s_yaml.cleanCode, html: k8s_yaml.html, hasDiff: false },
  ],
}))
</script>

# Multi-Node & Docker Compose Deployment

This guide provides battle-tested deployment recipes for running a central RouteWarden security dashboard and distributed edge shippers using Docker Compose, systemd, and Kubernetes.

---

## 1. Central Dashboard Server

On your central monitoring host (e.g. `dashboard.internal` or an internal security VM), deploy the RouteWarden dashboard.

### Docker Compose Recipe

<CodeViewer :snippets="centralComposeSnippets" />

### Initial Central Setup

<CodeViewer :snippets="centralSetupSnippets" />

---

## 2. Remote Edge Nodes (Docker Companion Pattern)

On your remote edge nodes running Traefik, Caddy, or NGINX, run `rwarden push` as a lightweight companion service alongside your gateway.

### Initial Remote Enrollment
Run the registration command once on the remote host to create `~/.routewarden/agent.json`:

<CodeViewer :snippets="remoteRegisterSnippets" />

### Docker Compose Companion Recipe

<CodeViewer :snippets="remoteComposeSnippets" />

Launch the edge stack:

<CodeViewer :snippets="launchEdgeSnippets" />

The companion container starts, loads your registered credentials, attaches to `edge-traefik`, and begins streaming encrypted batches immediately.

---

## 3. Remote Edge Nodes (Native Systemd Service)

For bare-metal servers or VMs running native NGINX or Caddy without Docker:

<CodeViewer :snippets="systemdSnippets" />

---

## 4. Kubernetes Sidecar Pattern

For Kubernetes clusters, deploy `rwarden` as a sidecar container sharing an emptyDir volume with your ingress controller:

<CodeViewer :snippets="k8sSnippets" />

---

## 5. Network & Firewall Requirements

| Port | Protocol | Direction | Source | Destination | Purpose |
|:---|:---|:---|:---|:---|:---|
| **7890** | TCP / HTTP | Inbound | Remote Edge Shippers | Central Dashboard | Encrypted Ingest (`/api/v1/events`), Heartbeats, & Web UI |

> [!TIP]
> The central dashboard port (`7890`) can be placed behind an internal WireGuard/Tailscale mesh VPN or reverse proxy with TLS if you prefer not to expose port 7890 directly to the public Internet.
