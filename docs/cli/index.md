---
title: RouteWarden CLI (rwarden)
description: Developer CLI, policy compiler, configuration validator, and real-time security dashboard for RouteWarden.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

// ─── 1. Installation ────────────────────────────────────────────────────────
const install_mac = buildSnippet({
  lang: 'bash',
  code: `# Homebrew (macOS)
brew install routewarden/tap/rwarden

# Or automated installer:
curl -fsSL https://routewarden.github.io/install.sh | bash

# Verify installation
rwarden version`,
})

const install_linux = buildSnippet({
  lang: 'bash',
  code: `# Debian / Ubuntu (APT)
curl -fsSLO https://github.com/routewarden/cli/releases/latest/download/rwarden_linux_amd64.deb
sudo apt install ./rwarden_linux_amd64.deb

# Or Homebrew on Linux:
# brew install routewarden/tap/rwarden

# Or automated installer:
# curl -fsSL https://routewarden.github.io/install.sh | bash

# Verify installation
rwarden version`,
})

const install_script = buildSnippet({
  lang: 'bash',
  code: `# Universal one-liner (macOS & Linux)
curl -fsSL https://routewarden.github.io/install.sh | bash

# Custom directory (~/.local/bin)
curl -fsSL https://routewarden.github.io/install.sh | INSTALL_DIR=$HOME/.local/bin bash`,
})

const install_docker = buildSnippet({
  lang: 'bash',
  code: `docker run --rm ghcr.io/routewarden/cli:latest version`,
})

const installSnippets = computed(() => ({
  cli: [
    { filename: 'macOS (Homebrew / curl)', lang: 'bash', code: install_mac.cleanCode, html: install_mac.html, hasDiff: false },
    { filename: 'Linux (APT / Homebrew / curl)', lang: 'bash', code: install_linux.cleanCode, html: install_linux.html, hasDiff: false },
    { filename: 'Universal Script', lang: 'bash', code: install_script.cleanCode, html: install_script.html, hasDiff: false },
    { filename: 'Docker', lang: 'bash', code: install_docker.cleanCode, html: install_docker.html, hasDiff: false },
  ],
}))

// ─── 2. Test Path Simulation ────────────────────────────────────────────────
const test_cmd = buildSnippet({
  lang: 'bash',
  code: `rwarden test "/static/%252e%252e/.env"`,
})

const test_docker = buildSnippet({
  lang: 'bash',
  code: `docker run --rm ghcr.io/routewarden/cli:latest test "/static/%252e%252e/.env"`,
})

const test_output = buildSnippet({
  lang: 'plaintext',
  code: `🔍 Testing: GET /static/%252e%252e/.env
  Candidate paths extracted (2):
    - /static/%252e%252e/.env
    - /.env

Result: 🛑 BLOCKED (HTTP Status 403)
  Reason:  block_pattern_match
  Target:  /.env
  Pattern: (?i)\\.env`,
})

const testCmdSnippets = computed(() => ({
  cli: [
    { filename: 'rwarden test', lang: 'bash', code: test_cmd.cleanCode, html: test_cmd.html, hasDiff: false },
    { filename: 'Docker', lang: 'bash', code: test_docker.cleanCode, html: test_docker.html, hasDiff: false },
  ],
}))

const testOutputSnippets = computed(() => ({
  cli: [
    { filename: 'Simulation Output', lang: 'plaintext', code: test_output.cleanCode, html: test_output.html, hasDiff: false },
  ],
}))

// ─── 3. Validate Policy ─────────────────────────────────────────────────────
const validate_cmd = buildSnippet({
  lang: 'bash',
  code: `rwarden validate routewarden.json`,
})

const validate_docker = buildSnippet({
  lang: 'bash',
  code: `docker run --rm -v $(pwd):/work -w /work ghcr.io/routewarden/cli:latest validate routewarden.json`,
})

const validateSnippets = computed(() => ({
  cli: [
    { filename: 'rwarden validate', lang: 'bash', code: validate_cmd.cleanCode, html: validate_cmd.html, hasDiff: false },
    { filename: 'Docker', lang: 'bash', code: validate_docker.cleanCode, html: validate_docker.html, hasDiff: false },
  ],
}))

// ─── 4. Launch Dashboard ────────────────────────────────────────────────────
const dashboard_cmd = buildSnippet({
  lang: 'bash',
  code: `# Launch real-time GoAccess dashboard (opens http://localhost:7890)
rwarden dashboard

# Or export standalone GoAccess compose files
rwarden dashboard export ./dashboard`,
})

const dashboard_docker = buildSnippet({
  lang: 'bash',
  code: `# Export and launch GoAccess dashboard using container
docker run --rm -v $(pwd):/work -w /work ghcr.io/routewarden/cli:latest dashboard export ./dashboard
cd ./dashboard && docker compose up -d`,
})

const dashboardSnippets = computed(() => ({
  cli: [
    { filename: 'rwarden dashboard', lang: 'bash', code: dashboard_cmd.cleanCode, html: dashboard_cmd.html, hasDiff: false },
    { filename: 'Docker', lang: 'bash', code: dashboard_docker.cleanCode, html: dashboard_docker.html, hasDiff: false },
  ],
}))
</script>

# RouteWarden CLI (`rwarden`)

`rwarden` is the official developer CLI, policy compiler, configuration validator, and real-time observability dashboard for the RouteWarden security suite.

It enables security and platform teams to evaluate path rules offline, validate configurations against official JSON schemas, compile universal policies for Traefik, Caddy, NGINX, and TCP Warden, and spin up an embedded web dashboard with zero runtime dependencies.

---

## Key Features

- **Offline Path & Anti-Evasion Simulator (`test`)**:
  Simulate full multi-layer URL decoding, query parameter inspection, backslash normalization, semicolon parameter stripping, and IP allowlist evaluation without running any reverse proxy.
- **Strict Schema & Syntax Validation (`validate`)**:
  Validate `routewarden.json` (HTTP gateways) and `tcp-warden.yaml` (L4 daemon) against their formal JSON schemas with clear diagnostics for syntax errors, regex mistakes, and invalid CIDR notations.
- **Multi-Target Policy Generator (`generate`)**:
  Compile a single, universal `routewarden.json` security policy into target-specific configurations:
  - Traefik Dynamic Configuration (YAML and TOML)
  - Traefik Docker Compose Labels
  - Caddyfile directive blocks
  - NGINX / OpenResty Lua initialization tables
  - TCP Warden YAML configuration
- **Ephemeral Gateway Sandbox (`sandbox`)**:
  Launch isolated, pre-configured Traefik, Caddy, or NGINX containers in Docker to verify your rules and response modes live against automated attack test suites.
- **Real-Time Security Dashboard (`dashboard`)**:
  Turnkey, ultra-lightweight real-time security dashboard powered by GoAccess (~15MB RAM). Auto-discovers containers labeled `routewarden=true`, multiplexes logs live, and serves a streaming web UI at `http://localhost:7890`.
- **Official JSON Schema Export (`schema`)**:
  Export official JSON Schemas for instant IDE autocomplete (VS Code, JetBrains, Neovim) and CI/CD automated linting.

---

## Quick Start

### 1. Install `rwarden`

Install the official pre-compiled CLI binary for **macOS** or **Linux**, or run without installation via Docker:

<CodeViewer :snippets="installSnippets" />

> 📖 **Complete Installation Guide**: Need `.deb`, `.rpm`, `.apk` package managers, standalone binary downloads for Linux/macOS/Windows, or source builds? See the [CLI Installation Guide](/cli/installation).

### 2. Test a Sensitive Path

Simulate candidate path extraction and anti-evasion matching on an encoded exploit string:

<CodeViewer :snippets="testCmdSnippets" />

Output:

<CodeViewer :snippets="testOutputSnippets" />

### 3. Validate Policy Offline

Verify your policy before committing or deploying:

<CodeViewer :snippets="validateSnippets" />

### 4. Launch the Security Dashboard

Start the live GoAccess dashboard with automated gateway container log discovery:

<CodeViewer :snippets="dashboardSnippets" />

Open `http://localhost:7890` to observe live blocked probes, attack analytics, and threat intelligence in GoAccess.


---

## Documentation Sections

| Section | Description |
|:---|:---|
| [**Installation**](/cli/installation) | Install script, pre-built binary archives, Docker container, and source build |
| [**Commands Reference**](/cli/commands) | Complete CLI syntax and options for `test`, `validate`, `schema`, `generate`, and `sandbox` |
| [**Security Dashboard**](/cli/dashboard) | Live event streaming, Docker discovery, analytics, IP threat scoring, and REST API |
| [**JSON Schema & CI/CD**](/cli/schema) | IDE integration (VS Code, JetBrains, Neovim), `routewarden.json` workflows, and CI/CD pipelines |
| [**Changelog & Releases**](/cli/changelog) | Release notes and version history for `rwarden` |
