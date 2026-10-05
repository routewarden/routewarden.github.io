---
title: Standalone Docker Compose Deployment — RouteWarden Dashboard
description: Deploy RouteWarden's security observability stack in production using standalone Docker Compose, configure Grafana environment variables, OAuth SSO, and persistent storage.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../../.vitepress/theme/composables/useCodeSnippet'

// ─── 1. Export Snippets ─────────────────────────────────────────────────────
const export_cmd = buildSnippet({
  lang: 'bash',
  code: `# 1. Export stack configuration files to local directory
rwarden dashboard export ./observability
cd ./observability

# 2. Start containers with Docker Compose
docker compose up -d`,
})

const export_cmd_docker = buildSnippet({
  lang: 'bash',
  code: `# Export configs using the RouteWarden CLI container image
# (no local rwarden binary required)
docker run --rm \\
  -v "$(pwd)/observability:/data" \\
  ghcr.io/routewarden/cli:latest \\
  dashboard export /data

# The exported directory now contains:
#  observability/
#  ├── docker-compose.yml
#  ├── config.alloy
#  ├── loki-config.yaml
#  └── grafana/
#      ├── provisioning/
#      └── dashboards/routewarden-overview.json

# Bring the full stack up with Docker Compose
cd observability
docker compose up -d

# Check logs
docker compose logs -f

# Tear down (volumes are preserved)
docker compose down`,
})

const exportSnippets = computed(() => ({
  cli: [
    { filename: 'rwarden export', lang: 'bash', code: export_cmd.cleanCode, html: export_cmd.html, hasDiff: false },
    { filename: 'Docker container', lang: 'bash', code: export_cmd_docker.cleanCode, html: export_cmd_docker.html, hasDiff: false },
  ],
}))

// ─── 2. Compose File Snippet ────────────────────────────────────────────────
const compose_file = buildSnippet({
  lang: 'yaml',
  code: `services:
  loki:
    image: grafana/loki:3.0.0
    container_name: routewarden-loki
    restart: unless-stopped
    command: -config.file=/etc/loki/loki-config.yaml
    ports:
      - "3100:3100"
    volumes:
      - ./loki-config.yaml:/etc/loki/loki-config.yaml:ro
      - loki-data:/loki
    networks:
      - routewarden-observability

  alloy:
    image: grafana/alloy:v1.1.0
    container_name: routewarden-alloy
    restart: unless-stopped
    command: run --server.http.listen-addr=0.0.0.0:12345 --storage.path=/var/lib/alloy/data /etc/alloy/config.alloy
    ports:
      - "12345:12345"
      - "1514:1514/udp"
    volumes:
      - ./config.alloy:/etc/alloy/config.alloy:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - /var/log:/var/log:ro
    depends_on:
      - loki
    networks:
      - routewarden-observability

  grafana:
    image: grafana/grafana:11.0.0
    container_name: routewarden-grafana
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
      - GF_AUTH_ANONYMOUS_ENABLED=true
      - GF_AUTH_ANONYMOUS_ORG_ROLE=Viewer
      - GF_DASHBOARDS_DEFAULT_HOME_DASHBOARD_PATH=/var/lib/grafana/dashboards/routewarden-overview.json
    volumes:
      - ./grafana/provisioning:/etc/grafana/provisioning:ro
      - ./grafana/dashboards:/var/lib/grafana/dashboards:ro
      - grafana-data:/var/lib/grafana
    depends_on:
      - loki
    networks:
      - routewarden-observability

volumes:
  loki-data:
  grafana-data:

networks:
  routewarden-observability:
    name: routewarden-observability`,
})

const composeSnippets = computed(() => ({
  cli: [
    { filename: 'docker-compose.yml', lang: 'yaml', code: compose_file.cleanCode, html: compose_file.html, hasDiff: false },
  ],
}))

// ─── 3. Grafana Environment Configuration Snippets ──────────────────────────
const grafana_env_override = buildSnippet({
  lang: 'yaml',
  code: `# docker-compose.override.yml — place next to docker-compose.yml
# Run: docker compose up -d  (override is merged automatically)
services:
  grafana:
    environment:
      # ── Admin credentials ──────────────────────────────────────────────────
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=your-strong-password
      - GF_SECURITY_SECRET_KEY=your-32-char-secret-key

      # ── Anonymous access (read-only, no login required) ───────────────────
      - GF_AUTH_ANONYMOUS_ENABLED=true
      - GF_AUTH_ANONYMOUS_ORG_NAME=Main Org.
      - GF_AUTH_ANONYMOUS_ORG_ROLE=Viewer

      # ── Disable user sign-up (recommended for public-facing instances) ────
      - GF_USERS_ALLOW_SIGN_UP=false
      - GF_USERS_AUTO_ASSIGN_ORG_ROLE=Viewer

      # ── Server & base URL ─────────────────────────────────────────────────
      - GF_SERVER_ROOT_URL=https://grafana.example.com
      - GF_SERVER_DOMAIN=grafana.example.com

      # ── SMTP / email alerting ─────────────────────────────────────────────
      - GF_SMTP_ENABLED=true
      - GF_SMTP_HOST=smtp.example.com:587
      - GF_SMTP_USER=grafana@example.com
      - GF_SMTP_PASSWORD=smtp-password
      - GF_SMTP_FROM_ADDRESS=grafana@example.com
      - GF_SMTP_FROM_NAME=RouteWarden Alerts

      # ── Default home dashboard (pre-provisioned RouteWarden panel) ────────
      - GF_DASHBOARDS_DEFAULT_HOME_DASHBOARD_PATH=/var/lib/grafana/dashboards/routewarden-overview.json`,
})

const grafana_env_oauth = buildSnippet({
  lang: 'yaml',
  code: `# docker-compose.override.yml — GitHub OAuth SSO example
services:
  grafana:
    environment:
      # ── GitHub OAuth ───────────────────────────────────────────────────────
      - GF_AUTH_GITHUB_ENABLED=true
      - GF_AUTH_GITHUB_CLIENT_ID=your-github-client-id
      - GF_AUTH_GITHUB_CLIENT_SECRET=your-github-client-secret
      - GF_AUTH_GITHUB_SCOPES=user:email,read:org
      - GF_AUTH_GITHUB_AUTH_URL=https://github.com/login/oauth/authorize
      - GF_AUTH_GITHUB_TOKEN_URL=https://github.com/login/oauth/access_token
      - GF_AUTH_GITHUB_API_URL=https://api.github.com/user
      # Restrict to members of a specific GitHub org/team:
      - GF_AUTH_GITHUB_ALLOWED_ORGANIZATIONS=my-org
      - GF_AUTH_GITHUB_TEAM_IDS=123456

      # ── Google OAuth ───────────────────────────────────────────────────────
      # - GF_AUTH_GOOGLE_ENABLED=true
      # - GF_AUTH_GOOGLE_CLIENT_ID=your-google-client-id
      # - GF_AUTH_GOOGLE_CLIENT_SECRET=your-google-client-secret
      # - GF_AUTH_GOOGLE_ALLOWED_DOMAINS=example.com
      # - GF_AUTH_GOOGLE_SCOPES=https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email`,
})

const grafana_env_cli = buildSnippet({
  lang: 'bash',
  code: `# Pass env vars directly to rwarden dashboard up
# All GF_* variables are forwarded to the Grafana container
rwarden dashboard up \\
  --port 3000 \\
  --env GF_SECURITY_ADMIN_PASSWORD=mysecret \\
  --env GF_SMTP_ENABLED=true \\
  --env GF_SMTP_HOST=smtp.example.com:587 \\
  --env GF_AUTH_GITHUB_ENABLED=true \\
  --env GF_AUTH_GITHUB_CLIENT_ID=abc123 \\
  --env GF_AUTH_GITHUB_CLIENT_SECRET=xyz789

# Or export first, edit docker-compose.override.yml, then bring the stack up:
rwarden dashboard export ./observability
cd ./observability
# Edit docker-compose.override.yml with your GF_* values
docker compose up -d`,
})

const grafanaEnvSnippets = computed(() => ({
  cli: [
    { filename: 'docker-compose.override.yml', lang: 'yaml', code: grafana_env_override.cleanCode, html: grafana_env_override.html, hasDiff: false },
    { filename: 'OAuth / SSO', lang: 'yaml', code: grafana_env_oauth.cleanCode, html: grafana_env_oauth.html, hasDiff: false },
    { filename: 'rwarden dashboard up', lang: 'bash', code: grafana_env_cli.cleanCode, html: grafana_env_cli.html, hasDiff: false },
  ],
}))
</script>

# Standalone Docker Compose Deployment

If you prefer deploying the security observability stack without relying on the local CLI binary (for example, in GitOps pipelines, headless production servers, Kubernetes, or Docker Swarm), you can export the full stack files and operate them using native Docker Compose.

---

## 1. Export Stack Files

You can extract the full stack assets using either the `rwarden` binary or RouteWarden's official container image:

<CodeViewer :snippets="exportSnippets" />

The exported directory contains everything required to spin up the stack in isolation:
- `docker-compose.yml`: Service definitions for Loki, Alloy, and Grafana.
- `config.alloy`: Pipeline configuration for Docker container discovery, UDP syslog, JSON parsing, and label normalization.
- `loki-config.yaml`: Standalone Loki TSDB storage and retention rules.
- `grafana/provisioning/`: Auto-provisioning manifests for datasources and dashboard providers.
- `grafana/dashboards/routewarden-overview.json`: Complete pre-configured Grafana dashboard.

---

## 2. Full `docker-compose.yml` Reference

<CodeViewer :snippets="composeSnippets" />

---

## 3. Grafana Environment Configuration & Customization

All Grafana behaviour — credentials, SMTP, OAuth, anonymous access, and the home dashboard path — is controlled via `GF_*` environment variables.

Use a `docker-compose.override.yml` alongside the exported `docker-compose.yml` so your customizations are preserved when updating or re-exporting:

<CodeViewer :snippets="grafanaEnvSnippets" />

### Key `GF_*` Variables

| Variable | Default | Purpose |
|:--|:--|:--|
| `GF_SECURITY_ADMIN_USER` | `admin` | Admin username |
| `GF_SECURITY_ADMIN_PASSWORD` | `admin` | Admin password — **change in production** |
| `GF_SECURITY_SECRET_KEY` | random | Cookie signing key — set a stable value to survive restarts |
| `GF_AUTH_ANONYMOUS_ENABLED` | `true` | Allow read-only access without login |
| `GF_AUTH_ANONYMOUS_ORG_ROLE` | `Viewer` | Role granted to anonymous users |
| `GF_USERS_ALLOW_SIGN_UP` | `false` | Disable public self-registration |
| `GF_SERVER_ROOT_URL` | `http://localhost:3000` | Public URL — required for OAuth redirect URIs |
| `GF_SMTP_ENABLED` | `false` | Enable email alerting |
| `GF_AUTH_GITHUB_ENABLED` | `false` | GitHub OAuth SSO |
| `GF_AUTH_GOOGLE_ENABLED` | `false` | Google OAuth SSO |
| `GF_SECURITY_ALLOW_EMBEDDING` | `true` | Allow embedding dashboard panels via iframe in portals |
| `GF_FEATURE_TOGGLES_ENABLE` | `publicDashboards` | Enable public dashboard links creation |
| `GF_DASHBOARDS_DEFAULT_HOME_DASHBOARD_PATH` | provisioned path | Dashboard shown on first load |

> [!TIP]
> When using `rwarden dashboard up`, pass `--env GF_SECURITY_ADMIN_PASSWORD=secret` for quick one-shot overrides. For persistent configuration, prefer `docker-compose.override.yml` so settings survive CLI re-runs.

---

## 4. Accessing the Dashboard & Services

| Service | Port | Default Credentials | Description |
|:---|:---|:---|:---|
| **Grafana** | `3000` | `admin / admin` (anonymous viewer enabled) | Threat Intelligence Dashboard Web UI |
| **Loki API** | `3100` | No auth required | TSDB storage engine & LogQL HTTP API |
| **Alloy UI** | `12345` | No auth required | Collector status & component inspector |
| **Alloy Syslog** | `1514/udp` | Network UDP | Ingestion endpoint for remote network firewalls |
