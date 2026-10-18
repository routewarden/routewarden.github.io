---
title: Multi-Node & Docker Compose Deployment
description: Production deployment recipes for central RouteWarden dashboards and distributed remote edge shippers.
---

# Multi-Node & Docker Compose Deployment

This guide provides battle-tested deployment recipes for running a central RouteWarden security dashboard and distributed edge shippers using Docker Compose, systemd, and Kubernetes.

---

## 1. Central Dashboard Server

On your central monitoring host (e.g. `dashboard.internal` or an internal security VM), deploy the RouteWarden dashboard.

### `docker-compose.yml` (Central Dashboard)

```yaml
services:
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
  routewarden_data:
```

### Initial Central Setup
1. Start the central dashboard:
   ```bash
   docker compose up -d
   ```
2. Generate an enrollment token for your first remote server:
   ```bash
   docker exec -it routewarden-dashboard rwarden keys create edge-node-01
   ```

---

## 2. Remote Edge Nodes (Docker Companion Pattern)

On your remote edge nodes running Traefik, Caddy, or NGINX, run `rwarden push` as a lightweight companion service alongside your gateway.

### Initial Remote Enrollment
Run the registration command once on the remote host to create `~/.routewarden/agent.json`:

```bash
rwarden register --url http://<central-ip>:7890 --key rw_sec_8f9a2b4c1e0d3f7a...
```

### `docker-compose.yml` (Remote Edge Server)

```yaml
services:
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
    command: ["push", "--docker"]
```

Launch the edge stack:
```bash
docker compose up -d
```

The companion container starts, loads your registered credentials, attaches to `edge-traefik`, and begins streaming encrypted batches immediately.

---

## 3. Remote Edge Nodes (Native Systemd Service)

For bare-metal servers or VMs running native NGINX or Caddy without Docker:

### 1. Register the Agent
```bash
sudo rwarden register \
  --url http://<central-ip>:7890 \
  --key rw_sec_8f9a2b4c1e0d... \
  --config /etc/routewarden/agent.json
```

### 2. Create Systemd Unit (`/etc/systemd/system/rwarden-push.service`)

```ini
[Unit]
Description=RouteWarden Remote Log Shipper
After=network.target nginx.service

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/rwarden push \
  --config /etc/routewarden/agent.json \
  --file /var/log/nginx/access.log \
  --batch-size 100 \
  --flush-interval 1s
Restart=always
RestartSec=5s

# Hardening
ProtectSystem=full
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
```

### 3. Enable and Start
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now rwarden-push
sudo systemctl status rwarden-push
```

---

## 4. Kubernetes Sidecar Pattern

For Kubernetes clusters, deploy `rwarden` as a sidecar container sharing an emptyDir volume with your ingress controller:

```yaml
apiVersion: apps/v1
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
              memory: 16Mi
```

---

## 5. Network & Firewall Requirements

| Port | Protocol | Direction | Source | Destination | Purpose |
|:---|:---|:---|:---|:---|:---|
| **7890** | TCP / HTTP | Inbound | Remote Edge Shippers | Central Dashboard | Encrypted Ingest (`/api/v1/events`), Heartbeats, & Web UI |

> [!TIP]
> The central dashboard port (`7890`) can be placed behind an internal WireGuard/Tailscale mesh VPN or reverse proxy with TLS if you prefer not to expose port 7890 directly to the public Internet.
