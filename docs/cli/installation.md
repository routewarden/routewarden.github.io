---
title: Installation — RouteWarden CLI
description: Installation methods for rwarden across macOS, Linux, Windows, Docker, and Go source.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

// ─── 1. One-Liner Script ────────────────────────────────────────────────────
const install_default = buildSnippet({
  lang: 'bash',
  code: `curl -fsSL https://routewarden.github.io/install.sh | bash`,
})

const install_custom = buildSnippet({
  lang: 'bash',
  code: `curl -fsSL https://routewarden.github.io/install.sh | INSTALL_DIR=$HOME/.local/bin bash`,
})

const scriptSnippets = computed(() => ({
  cli: [
    { filename: 'System-Wide (Default)', lang: 'bash', code: install_default.cleanCode, html: install_default.html, hasDiff: false },
    { filename: 'User Directory (~/.local/bin)', lang: 'bash', code: install_custom.cleanCode, html: install_custom.html, hasDiff: false },
  ],
}))

// ─── 2. Gatekeeper Fix ──────────────────────────────────────────────────────
const gatekeeper_code = buildSnippet({
  lang: 'bash',
  code: `# Remove quarantine attribute from PATH binary
xattr -d com.apple.quarantine $(which rwarden)

# Or for a downloaded binary directly:
xattr -d com.apple.quarantine rwarden`,
})

const gatekeeperSnippets = computed(() => ({
  cli: [
    { filename: 'Terminal (macOS)', lang: 'bash', code: gatekeeper_code.cleanCode, html: gatekeeper_code.html, hasDiff: false },
  ],
}))

// ─── 3. Docker Image ────────────────────────────────────────────────────────
const docker_validate = buildSnippet({
  lang: 'bash',
  code: `# Validate configuration file directly
docker run --rm -v $(pwd)/routewarden.json:/routewarden.json ghcr.io/routewarden/cli:latest validate --config /routewarden.json

# Test path interactively
docker run --rm ghcr.io/routewarden/cli:latest test --path "/.env"`,
})

const dockerSnippets = computed(() => ({
  cli: [
    { filename: 'Docker CLI', lang: 'bash', code: docker_validate.cleanCode, html: docker_validate.html, hasDiff: false },
  ],
}))

// ─── 4. From Source ─────────────────────────────────────────────────────────
const source_code = buildSnippet({
  lang: 'bash',
  code: `git clone https://github.com/routewarden/cli.git
cd cli
go build -o /usr/local/bin/rwarden .`,
})

const sourceSnippets = computed(() => ({
  cli: [
    { filename: 'Build & Install', lang: 'bash', code: source_code.cleanCode, html: source_code.html, hasDiff: false },
  ],
}))

// ─── 5. Verification ────────────────────────────────────────────────────────
const verify_cli = buildSnippet({
  lang: 'bash',
  code: `rwarden version
# rwarden version 4.4.0`,
})

const verify_docker = buildSnippet({
  lang: 'bash',
  code: `docker run --rm ghcr.io/routewarden/cli:latest version
# rwarden version 4.4.0`,
})

const verifySnippets = computed(() => ({
  cli: [
    { filename: 'CLI', lang: 'bash', code: verify_cli.cleanCode, html: verify_cli.html, hasDiff: false },
    { filename: 'Docker', lang: 'bash', code: verify_docker.cleanCode, html: verify_docker.html, hasDiff: false },
  ],
}))

// ─── 6. Uninstallation ──────────────────────────────────────────────────────
const uninstall_code = buildSnippet({
  lang: 'bash',
  code: `# If installed system-wide (default):
sudo rm -f /usr/local/bin/rwarden

# If installed in user directory:
rm -f ~/.local/bin/rwarden`,
})

const uninstallSnippets = computed(() => ({
  cli: [
    { filename: 'Terminal', lang: 'bash', code: uninstall_code.cleanCode, html: uninstall_code.html, hasDiff: false },
  ],
}))
</script>

# Installation

`rwarden` is distributed as a single, statically compiled binary with zero external runtime dependencies. Choose the installation method that fits your environment.

---

## 1. One-Liner Script (macOS & Linux)

Download and install the latest release binary automatically:

<CodeViewer :snippets="scriptSnippets" />

---

## 2. Pre-Built Release Binaries

Download standalone, statically compiled binaries for **Linux**, **macOS**, and **Windows** directly from [GitHub Releases](https://github.com/routewarden/cli/releases/latest):

| Platform | Architecture | Archive |
|:---|:---|:---|
| **macOS** | Apple Silicon (`arm64`) | [rwarden_4.4.0_darwin_arm64.tar.gz](https://github.com/routewarden/cli/releases/download/v4.4.0/rwarden_4.4.0_darwin_arm64.tar.gz) |
| **macOS** | Intel (`amd64`) | [rwarden_4.4.0_darwin_amd64.tar.gz](https://github.com/routewarden/cli/releases/download/v4.4.0/rwarden_4.4.0_darwin_amd64.tar.gz) |
| **Linux** | 64-bit (`amd64`) | [rwarden_4.4.0_linux_amd64.tar.gz](https://github.com/routewarden/cli/releases/download/v4.4.0/rwarden_4.4.0_linux_amd64.tar.gz) |
| **Linux** | ARM64 (`arm64`) | [rwarden_4.4.0_linux_arm64.tar.gz](https://github.com/routewarden/cli/releases/download/v4.4.0/rwarden_4.4.0_linux_arm64.tar.gz) |
| **Windows**| 64-bit (`amd64`) | [rwarden_4.4.0_windows_amd64.zip](https://github.com/routewarden/cli/releases/download/v4.4.0/rwarden_4.4.0_windows_amd64.zip) |

::: tip macOS Gatekeeper Notice
If macOS displays *"Apple could not verify “rwarden” is free of malware..."* when running a downloaded binary, macOS Gatekeeper has placed it in quarantine. You can remove the quarantine flag using:

<CodeViewer :snippets="gatekeeperSnippets" />

Alternatively, navigate to **System Settings > Privacy & Security** and click **"Allow Anyway"** next to the `rwarden` prompt.
:::

All downloads and SHA256 checksums are published on the [GitHub Releases Page](https://github.com/routewarden/cli/releases/latest).

---

## 3. Container Image (Docker / CI/CD)

Run `rwarden` inside a container without installing local binaries:

<CodeViewer :snippets="dockerSnippets" />

---

## 4. From Source (Go)

If you have Go 1.22+ installed, compile and install from source:

<CodeViewer :snippets="sourceSnippets" />

---

## Verification

Verify that `rwarden` is accessible in your system `$PATH`:

<CodeViewer :snippets="verifySnippets" />

---

## Uninstallation

`rwarden` is a single self-contained binary with no background daemon services or system hooks. To remove it:

<CodeViewer :snippets="uninstallSnippets" />
