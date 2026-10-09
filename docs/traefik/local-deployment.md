---
title: Local Development & Deployment
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

// ─── 1. Directory Tree ────────────────────────────────────────────────────────
const dirTree = buildSnippet({
  lang: 'plaintext',
  code: `plugins-local/
└── src/
    └── github.com/
        └── routewarden/
            └── traefik-warden/
                ├── .traefik.yml
                ├── config.go
                ├── ip_filter.go
                ├── path_normalizer.go
                ├── response_handler.go
                └── routewarden.go`,
})

const dirSnippets = computed(() => ({
  traefik: [
    { filename: 'Directory Structure', lang: 'plaintext', code: dirTree.cleanCode, html: dirTree.html, hasDiff: false },
  ],
}))

// ─── 2. Configuration Preview ─────────────────────────────────────────────────
const cfg_yaml = buildSnippet({
  lang: 'yaml',
  code: `# traefik.yml (Static)
experimental: # [!code ++]
  localPlugins: # [!code ++]
    routewarden: # [!code ++]
      moduleName: github.com/routewarden/traefik-warden # [!code ++]

# dynamic_conf.yml (Dynamic Middleware & Router)
http:
  middlewares:
    local-warden:
      plugin:
        routewarden:
          enabled: true
          enableDefaultPatterns: true
          response:
            mode: json
            statusCode: 403
            body: '{"error":"Forbidden","environment":"local-dev"}'

  routers:
    app-router:
      rule: "Host(\`localhost\`)"
      entryPoints:
        - web
      middlewares:
        - local-warden
      service: app-service`,
})

const cfg_toml = buildSnippet({
  lang: 'toml',
  code: `# traefik.toml (Static)
[experimental.localPlugins.routewarden] # [!code ++]
  moduleName = "github.com/routewarden/traefik-warden" # [!code ++]

# dynamic_conf.toml (Dynamic Middleware & Router)
[http.routers.app-router]
  rule = "Host(\`localhost\`)"
  entryPoints = ["web"]
  middlewares = ["local-warden"]
  service = "app-service"

[http.middlewares.local-warden.plugin.routewarden]
  enabled = true
  enableDefaultPatterns = true

[http.middlewares.local-warden.plugin.routewarden.response]
  mode = "json"
  statusCode = 403
  body = '{"error":"Forbidden","environment":"local-dev"}'`,
})

const cfg_cli = buildSnippet({
  lang: 'bash',
  code: `# Traefik CLI flags
traefik \\
  --api.insecure=true \\
  --providers.docker=true \\
  --entrypoints.web.address=:80 \\
  --experimental.localplugins.routewarden.modulename=github.com/routewarden/traefik-warden \\ # [!code ++]
  --log.level=DEBUG`,
})

const configPreviewSnippets = computed(() => ({
  traefik: [
    { filename: 'traefik.yml', lang: 'yaml', code: cfg_yaml.cleanCode, html: cfg_yaml.html, hasDiff: cfg_yaml.hasDiff },
    { filename: 'traefik.toml', lang: 'toml', code: cfg_toml.cleanCode, html: cfg_toml.html, hasDiff: cfg_toml.hasDiff },
    { filename: 'CLI Flags', lang: 'bash', code: cfg_cli.cleanCode, html: cfg_cli.html, hasDiff: cfg_cli.hasDiff },
  ],
}))

// ─── 3. Local Docker Compose Setup ────────────────────────────────────────────
const compose_setup = buildSnippet({
  lang: 'yaml',
  code: `services:
  traefik:
    image: traefik:latest
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      
      # Declare RouteWarden as a LOCAL plugin:
      - "--experimental.localPlugins.routewarden.modulename=github.com/routewarden/traefik-warden" # [!code ++]
      
      # Log level debug helps verify plugin loading
      - "--log.level=DEBUG"
    ports:
      - "80:80"
      - "8080:8080" # Traefik Web UI & Middleware Explorer
    volumes:
      - "/var/run/docker.sock:/var/run/docker.sock:ro"
      # Mount your local repository directory into Traefik's plugins-local path:
      - ".:/plugins-local/src/github.com/routewarden/traefik-warden:ro" # [!code ++]

  webapp:
    image: nginx:alpine
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.webapp.rule=Host(\`localhost\`)"
      - "traefik.http.routers.webapp.entrypoints=web"
      - "traefik.http.routers.webapp.middlewares=local-warden"

      # Middleware configuration
      - "traefik.http.middlewares.local-warden.plugin.routewarden.enabled=true" # [!code ++]
      - "traefik.http.middlewares.local-warden.plugin.routewarden.enableDefaultPatterns=true" # [!code ++]
      - "traefik.http.middlewares.local-warden.plugin.routewarden.response.mode=json" # [!code ++]
      - "traefik.http.middlewares.local-warden.plugin.routewarden.response.statusCode=403" # [!code ++]
      - 'traefik.http.middlewares.local-warden.plugin.routewarden.response.body={"error":"Forbidden","environment":"local-dev"}' # [!code ++]`,
})

const composeSnippets = computed(() => ({
  traefik: [
    { filename: 'docker-compose.yml', lang: 'docker', code: compose_setup.cleanCode, html: compose_setup.html, hasDiff: compose_setup.hasDiff },
  ],
}))

// ─── 4. Walkthrough Commands & Verification ───────────────────────────────────
const walk_start = buildSnippet({
  lang: 'bash',
  code: `docker compose up`,
})

const walk_startSnippets = computed(() => ({
  traefik: [
    { filename: 'Terminal', lang: 'bash', code: walk_start.cleanCode, html: walk_start.html, hasDiff: false },
  ],
}))

const walk_logs = buildSnippet({
  lang: 'plaintext',
  code: `level=info msg="Loading plugin: routewarden with module: github.com/routewarden/traefik-warden"
level=info msg="Plugin routewarden loaded successfully"`,
})

const walk_logsSnippets = computed(() => ({
  traefik: [
    { filename: 'traefik.log', lang: 'plaintext', code: walk_logs.cleanCode, html: walk_logs.html, hasDiff: false },
  ],
}))

const walk_test_normal = buildSnippet({
  lang: 'bash',
  code: `curl -I http://localhost/
# HTTP/1.1 200 OK`,
})

const walk_test_sensitive = buildSnippet({
  lang: 'bash',
  code: `curl -i http://localhost/.env
# HTTP/1.1 403 Forbidden
# {"error":"Forbidden","environment":"local-dev"}`,
})

const walk_test_evasion = buildSnippet({
  lang: 'bash',
  code: `curl -i "http://localhost/%2eenv"
# HTTP/1.1 403 Forbidden`,
})

const walk_testSnippets = computed(() => ({
  traefik: [
    { filename: 'Normal Request', lang: 'bash', code: walk_test_normal.cleanCode, html: walk_test_normal.html, hasDiff: false },
    { filename: 'Sensitive Route (.env)', lang: 'bash', code: walk_test_sensitive.cleanCode, html: walk_test_sensitive.html, hasDiff: false },
    { filename: 'URL-Encoded Evasion', lang: 'bash', code: walk_test_evasion.cleanCode, html: walk_test_evasion.html, hasDiff: false },
  ],
}))

const walk_restart = buildSnippet({
  lang: 'bash',
  code: `docker compose restart traefik`,
})

const walk_restartSnippets = computed(() => ({
  traefik: [
    { filename: 'Terminal', lang: 'bash', code: walk_restart.cleanCode, html: walk_restart.html, hasDiff: false },
  ],
}))

// ─── 5. Air-Gapped & Enterprise Production Setup ─────────────────────────────
const bundle_git = buildSnippet({
  lang: 'bash',
  code: `# Clone repository onto an internet-connected machine
git clone https://github.com/routewarden/traefik-warden.git`,
})

const bundle_tar = buildSnippet({
  lang: 'bash',
  code: `# Download and extract verified release archive
curl -sSL https://github.com/routewarden/traefik-warden/archive/refs/tags/v1.4.2.tar.gz | tar -xz
mv traefik-warden-1.4.2 traefik-warden`,
})

const bundleSnippets = computed(() => ({
  traefik: [
    { filename: 'Git Clone', lang: 'bash', code: bundle_git.cleanCode, html: bundle_git.html, hasDiff: false },
    { filename: 'Release Tarball', lang: 'bash', code: bundle_tar.cleanCode, html: bundle_tar.html, hasDiff: false },
  ],
}))

const prod_compose = buildSnippet({
  lang: 'yaml',
  code: `# docker-compose.yml (Air-Gapped Production via /plugins-local)
services:
  traefik:
    image: traefik:latest
    command:
      - "--providers.docker=true"
      - "--providers.file.filename=/etc/traefik/dynamic.yml"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      # Enable offline local plugin:
      - "--experimental.localplugins.routewarden.modulename=github.com/routewarden/traefik-warden" # [!code ++]
      # Attach globally to entrypoints:
      - "--entrypoints.web.http.middlewares=routewarden@file" # [!code ++]
      - "--entrypoints.websecure.http.middlewares=routewarden@file" # [!code ++]
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./dynamic.yml:/etc/traefik/dynamic.yml:ro
      # Mount RouteWarden into required /plugins-local destination:
      - ./traefik-warden:/plugins-local/src/github.com/routewarden/traefik-warden:ro # [!code ++]`,
})

const prodComposeSnippets = computed(() => ({
  traefik: [
    { filename: 'docker-compose.yml', lang: 'docker', code: prod_compose.cleanCode, html: prod_compose.html, hasDiff: prod_compose.hasDiff },
  ],
}))

const k8s_helm = buildSnippet({
  lang: 'yaml',
  code: `# Helm values.yaml for Traefik
additionalArguments:
  - "--experimental.localplugins.routewarden.modulename=github.com/routewarden/traefik-warden" # [!code ++]

extraVolumes:
  - name: routewarden-plugin
    configMap:
      name: routewarden-plugin-source

extraVolumeMounts:
  - name: routewarden-plugin
    mountPath: /plugins-local/src/github.com/routewarden/traefik-warden # [!code ++]
    readOnly: true`,
})

const k8s_daemon = buildSnippet({
  lang: 'yaml',
  code: `# Traefik Kubernetes Pod / Deployment volume mount
spec:
  containers:
    - name: traefik
      image: traefik:latest
      args:
        - "--experimental.localplugins.routewarden.modulename=github.com/routewarden/traefik-warden" # [!code ++]
      volumeMounts:
        - name: plugin-volume
          mountPath: /plugins-local/src/github.com/routewarden/traefik-warden # [!code ++]
          readOnly: true
  volumes:
    - name: plugin-volume
      hostPath:
        path: /opt/traefik-plugins/github.com/routewarden/traefik-warden`,
})

const k8sAirgappedSnippets = computed(() => ({
  traefik: [
    { filename: 'Helm values.yaml', lang: 'yaml', code: k8s_helm.cleanCode, html: k8s_helm.html, hasDiff: k8s_helm.hasDiff },
    { filename: 'Deployment.yaml', lang: 'yaml', code: k8s_daemon.cleanCode, html: k8s_daemon.html, hasDiff: k8s_daemon.hasDiff },
  ],
}))
</script>

# Local & Air-Gapped Deployment (/plugins-local)

This guide explains how to install, develop, and run RouteWarden in **air-gapped**, **offline**, and **local enterprise environments** using Traefik's native `/plugins-local` mechanism without external downloads from GitHub or the Traefik Plugin Catalog.

---

## 1. How Traefik Local Plugins Work

Traefik allows loading plugins directly from the host filesystem using the `experimental.localPlugins` configuration key. This provides several key advantages:

- **100% Offline / Air-Gapped**: Traefik never calls out to `plugins.traefik.io` or GitHub, eliminating network timeouts, proxy issues, or firewall blocks.
- **Zero Build Steps**: Traefik's embedded Yaegi Go interpreter compiles the `.go` source files directly in memory at launch.
- **Instant Live Iteration**: Code changes take effect immediately on container restart without rebuilding container images or tagging releases.

When using `localPlugins`, Traefik strictly requires the source code to be mounted into a specific path matching Go's import hierarchy under `/plugins-local/src/`:

<CodeViewer :snippets="dirSnippets" />

---

## 2. Local Traefik Configuration Preview

<CodeViewer :snippets="configPreviewSnippets" />

---

## 3. Local Docker Compose Setup

Here is a complete, ready-to-run `docker-compose.yml` for developing and testing RouteWarden locally:

<CodeViewer :snippets="composeSnippets" />

---

## 4. Step-by-Step Local Walkthrough

### Step 1: Start the Cluster
From the root of the RouteWarden repository:

<CodeViewer :snippets="walk_startSnippets" />

### Step 2: Verify Plugin Initialization
Watch the Traefik startup logs. You should see Traefik's Yaegi interpreter successfully compiling the local plugin:

<CodeViewer :snippets="walk_logsSnippets" />

### Step 3: Inspect via Traefik Dashboard
Open your browser to: `http://localhost:8080/dashboard/#/http/middlewares`

You will see `local-warden@docker` listed with its active configuration.

### Step 4: Test Blocking Live

<CodeViewer :snippets="walk_testSnippets" />

### Step 5: Live Code Iteration
Because the repository root is mounted with `- .:/plugins-local/src/github.com/routewarden/traefik-warden:ro`, whenever you modify Go code, simply restart Traefik to recompile:

<CodeViewer :snippets="walk_restartSnippets" />

*(No Docker rebuild or external plugin download required!)*

---

## 5. Air-Gapped & Enterprise Production Setup

When deploying to production clusters with no public internet access (e.g., banking, healthcare, government, or private VPCs), follow these steps to bundle RouteWarden offline.

### Step 1: Prepare the Offline Plugin Bundle
On an internet-connected workstation, clone the repository or download the release archive:

<CodeViewer :snippets="bundleSnippets" />

Transfer the `traefik-warden/` directory to your air-gapped host (e.g., via secure artifact repository, internal registry, USB drive, or SCP).

### Step 2: Production Docker Compose Setup
Place the `traefik-warden` directory adjacent to your `docker-compose.yml`:

<CodeViewer :snippets="prodComposeSnippets" />

### Step 3: Kubernetes Air-Gapped Deployment
In Kubernetes environments using the official Traefik Helm chart or direct manifests, mount the plugin source:

<CodeViewer :snippets="k8sAirgappedSnippets" />

---

## 6. Common Pitfalls & Troubleshooting

| Symptom | Cause | Solution |
|---|---|---|
| `unable to find plugin "routewarden"` | Incorrect container mount path | Ensure the destination path inside the container is exactly `/plugins-local/src/github.com/routewarden/traefik-warden`, NOT `/plugins-local/traefik-warden`. |
| `permission denied` | File permission restrictions | Ensure the Traefik process has read access (`chmod -R 755 traefik-warden`). |
| `missing plugin manifest` | Missing `.traefik.yml` file | Verify that `.traefik.yml` is present in the root of the mounted directory. |
| `module name mismatch` | CLI flag does not match directory | Verify `--experimental.localplugins.routewarden.modulename=github.com/routewarden/traefik-warden` exactly matches the subpath `/plugins-local/src/github.com/routewarden/traefik-warden`. |

