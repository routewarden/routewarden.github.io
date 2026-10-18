---
title: Installation — RouteWarden CLI
description: Installation methods for rwarden across macOS, Linux, Windows, Docker, and Go source.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

// ─── 1. macOS Snippets ────────────────────────────────────────────────────────
const mac_brew = buildSnippet({
  lang: 'bash',
  code: `# Install using the official RouteWarden Homebrew Tap
brew install routewarden/tap/rwarden

# Verify installation
rwarden version`,
})

const mac_curl = buildSnippet({
  lang: 'bash',
  code: `# Automated one-liner installer (system-wide)
curl -fsSL https://routewarden.github.io/install.sh | bash

# Or install to user directory (~/.local/bin) without sudo
curl -fsSL https://routewarden.github.io/install.sh | INSTALL_DIR=$HOME/.local/bin bash`,
})

const mac_manual = buildSnippet({
  lang: 'bash',
  code: `# Apple Silicon (M1/M2/M3/M4)
curl -fsSL https://github.com/routewarden/cli/releases/download/v5.0.0/rwarden_5.0.0_darwin_arm64.tar.gz | tar -xz
sudo mv rwarden /usr/local/bin/

# Intel Macs (x86_64)
# curl -fsSL https://github.com/routewarden/cli/releases/download/v5.0.0/rwarden_5.0.0_darwin_amd64.tar.gz | tar -xz
# sudo mv rwarden /usr/local/bin/`,
})

const macSnippets = computed(() => ({
  cli: [
    { filename: 'Homebrew (Recommended)', lang: 'bash', code: mac_brew.cleanCode, html: mac_brew.html, hasDiff: false },
    { filename: 'Automated Script (curl)', lang: 'bash', code: mac_curl.cleanCode, html: mac_curl.html, hasDiff: false },
    { filename: 'Manual Binary (tar.gz)', lang: 'bash', code: mac_manual.cleanCode, html: mac_manual.html, hasDiff: false },
  ],
}))

// ─── 2. Linux Snippets ────────────────────────────────────────────────────────
const linux_apt = buildSnippet({
  lang: 'bash',
  code: `# Download official .deb package (amd64)
curl -fsSLO https://github.com/routewarden/cli/releases/latest/download/rwarden_linux_amd64.deb

# Install with automatic dependency resolution via APT
sudo apt install ./rwarden_linux_amd64.deb

# Verify installation
rwarden version`,
})

const linux_brew = buildSnippet({
  lang: 'bash',
  code: `# Homebrew on Linux
brew install routewarden/tap/rwarden

# Verify installation
rwarden version`,
})

const linux_rpm = buildSnippet({
  lang: 'bash',
  code: `# Install official .rpm package (Fedora, RHEL, CentOS, Rocky)
sudo rpm -ivh https://github.com/routewarden/cli/releases/latest/download/rwarden_linux_amd64.rpm

# Verify installation
rwarden version`,
})

const linux_apk = buildSnippet({
  lang: 'bash',
  code: `# Alpine Linux (.apk)
curl -fsSLO https://github.com/routewarden/cli/releases/latest/download/rwarden_linux_amd64.apk
apk add --allow-untrusted ./rwarden_linux_amd64.apk

# Verify installation
rwarden version`,
})

const linux_curl = buildSnippet({
  lang: 'bash',
  code: `# Automated one-liner installer (system-wide)
curl -fsSL https://routewarden.github.io/install.sh | bash

# Or install to user directory (~/.local/bin) without sudo
curl -fsSL https://routewarden.github.io/install.sh | INSTALL_DIR=$HOME/.local/bin bash`,
})

const linux_manual = buildSnippet({
  lang: 'bash',
  code: `# Linux x86_64 (amd64)
curl -fsSL https://github.com/routewarden/cli/releases/download/v5.0.0/rwarden_5.0.0_linux_amd64.tar.gz | tar -xz
sudo mv rwarden /usr/local/bin/

# Linux ARM64 (e.g. Raspberry Pi / AWS Graviton)
# curl -fsSL https://github.com/routewarden/cli/releases/download/v5.0.0/rwarden_5.0.0_linux_arm64.tar.gz | tar -xz
# sudo mv rwarden /usr/local/bin/`,
})

const linuxSnippets = computed(() => ({
  cli: [
    { filename: 'Debian / Ubuntu (APT)', lang: 'bash', code: linux_apt.cleanCode, html: linux_apt.html, hasDiff: false },
    { filename: 'Homebrew (Linux)', lang: 'bash', code: linux_brew.cleanCode, html: linux_brew.html, hasDiff: false },
    { filename: 'RHEL / Fedora (RPM)', lang: 'bash', code: linux_rpm.cleanCode, html: linux_rpm.html, hasDiff: false },
    { filename: 'Alpine Linux (APK)', lang: 'bash', code: linux_apk.cleanCode, html: linux_apk.html, hasDiff: false },
    { filename: 'Automated Script (curl)', lang: 'bash', code: linux_curl.cleanCode, html: linux_curl.html, hasDiff: false },
    { filename: 'Manual Binary (tar.gz)', lang: 'bash', code: linux_manual.cleanCode, html: linux_manual.html, hasDiff: false },
  ],
}))

// ─── 3. Gatekeeper Fix ──────────────────────────────────────────────────────
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

// ─── 4. Docker Images ───────────────────────────────────────────────────────
const docker_cli = buildSnippet({
  lang: 'bash',
  code: `# Full CLI toolkit: validate, audit, test, or run sandbox
docker run --rm -v $(pwd)/routewarden.json:/routewarden.json ghcr.io/routewarden/cli:latest validate --config /routewarden.json

# Test path interactively
docker run --rm ghcr.io/routewarden/cli:latest test --path "/.env"`,
})

const docker_shipper = buildSnippet({
  lang: 'bash',
  code: `# Run ultra-lean remote log shipper (~6MB binary, no SQLite/UI)
docker run -d \\
  --name routewarden-shipper \\
  --restart unless-stopped \\
  -v /var/run/docker.sock:/var/run/docker.sock:ro \\
  -v ~/.routewarden:/root/.routewarden:ro \\
  ghcr.io/routewarden/shipper:latest`,
})

const docker_dashboard = buildSnippet({
  lang: 'bash',
  code: `# Run standalone SOC security dashboard (~11MB binary on port 7890)
docker run -d \\
  --name routewarden-dashboard \\
  --restart unless-stopped \\
  -p 7890:7890 \\
  -v /var/run/docker.sock:/var/run/docker.sock:ro \\
  -v ~/.routewarden/dashboard:/root/.routewarden/dashboard \\
  ghcr.io/routewarden/dashboard:latest`,
})

const dockerSnippets = computed(() => ({
  cli: [
    { filename: 'CLI Toolkit', lang: 'bash', code: docker_cli.cleanCode, html: docker_cli.html, hasDiff: false },
    { filename: 'Edge Shipper', lang: 'bash', code: docker_shipper.cleanCode, html: docker_shipper.html, hasDiff: false },
    { filename: 'SOC Dashboard', lang: 'bash', code: docker_dashboard.cleanCode, html: docker_dashboard.html, hasDiff: false },
  ],
}))

// ─── 5. From Source ─────────────────────────────────────────────────────────
const source_code = buildSnippet({
  lang: 'bash',
  code: `# Via Go Install (Go 1.22+)
go install github.com/routewarden/cli@latest

# Or build from Git repository:
git clone https://github.com/routewarden/cli.git
cd cli
go build -o /usr/local/bin/rwarden .`,
})

const sourceSnippets = computed(() => ({
  cli: [
    { filename: 'Build & Install', lang: 'bash', code: source_code.cleanCode, html: source_code.html, hasDiff: false },
  ],
}))

// ─── 6. Verification ────────────────────────────────────────────────────────
const verify_cli = buildSnippet({
  lang: 'bash',
  code: `rwarden version
# rwarden version 5.0.0`,
})

const verify_docker = buildSnippet({
  lang: 'bash',
  code: `docker run --rm ghcr.io/routewarden/cli:latest version
# rwarden version 5.0.0`,
})

const verifySnippets = computed(() => ({
  cli: [
    { filename: 'CLI', lang: 'bash', code: verify_cli.cleanCode, html: verify_cli.html, hasDiff: false },
    { filename: 'Docker', lang: 'bash', code: verify_docker.cleanCode, html: verify_docker.html, hasDiff: false },
  ],
}))

// ─── 7. Uninstallation ──────────────────────────────────────────────────────
const uninstall_code = buildSnippet({
  lang: 'bash',
  code: `# Homebrew (macOS & Linux):
brew uninstall rwarden

# Debian / Ubuntu (APT):
sudo apt remove rwarden

# RHEL / Fedora (RPM):
sudo rpm -e rwarden

# Alpine Linux (APK):
apk del rwarden

# System-wide binary (default):
sudo rm -f /usr/local/bin/rwarden

# User directory (~/.local/bin):
rm -f ~/.local/bin/rwarden`,
})

const uninstallSnippets = computed(() => ({
  cli: [
    { filename: 'Terminal', lang: 'bash', code: uninstall_code.cleanCode, html: uninstall_code.html, hasDiff: false },
  ],
}))
</script>

# Installation

`rwarden` is distributed as a single, statically compiled binary with zero external runtime dependencies. Choose the installation method for your operating system:

---

## macOS Installation

`rwarden` runs natively on Apple Silicon (M1/M2/M3/M4) and Intel (x86_64) Macs. Choose your preferred package manager or installer:

<CodeViewer :snippets="macSnippets" />

::: tip macOS Gatekeeper Notice
If macOS displays *"Apple could not verify “rwarden” is free of malware..."* when running a manually downloaded binary, macOS Gatekeeper has placed it in quarantine. You can remove the quarantine flag using:

<CodeViewer :snippets="gatekeeperSnippets" />

Alternatively, navigate to **System Settings > Privacy & Security** and click **"Allow Anyway"** next to the `rwarden` prompt. (Homebrew installs are not affected by this notice).
:::

---

## Linux Installation

`rwarden` supports all major Linux distributions (Ubuntu, Debian, Fedora, RHEL, CentOS, Rocky Linux, Alpine, Arch) with native package manager support:

<CodeViewer :snippets="linuxSnippets" />

---

## Pre-Built Release Binaries

Download standalone, statically compiled binaries for **Linux**, **macOS**, and **Windows** directly from [GitHub Releases](https://github.com/routewarden/cli/releases/latest):

| Platform | Architecture | Archive | Package / Command |
|:---|:---|:---|:---|
| **macOS** | Apple Silicon (`arm64`) | [rwarden_5.0.0_darwin_arm64.tar.gz](https://github.com/routewarden/cli/releases/download/v5.0.0/rwarden_5.0.0_darwin_arm64.tar.gz) | `brew install routewarden/tap/rwarden` |
| **macOS** | Intel (`amd64`) | [rwarden_5.0.0_darwin_amd64.tar.gz](https://github.com/routewarden/cli/releases/download/v5.0.0/rwarden_5.0.0_darwin_amd64.tar.gz) | `brew install routewarden/tap/rwarden` |
| **Linux** | 64-bit (`amd64`) | [rwarden_5.0.0_linux_amd64.tar.gz](https://github.com/routewarden/cli/releases/download/v5.0.0/rwarden_5.0.0_linux_amd64.tar.gz) | [rwarden_linux_amd64.deb](https://github.com/routewarden/cli/releases/latest/download/rwarden_linux_amd64.deb) / [rwarden_linux_amd64.rpm](https://github.com/routewarden/cli/releases/latest/download/rwarden_linux_amd64.rpm) |
| **Linux** | ARM64 (`arm64`) | [rwarden_5.0.0_linux_arm64.tar.gz](https://github.com/routewarden/cli/releases/download/v5.0.0/rwarden_5.0.0_linux_arm64.tar.gz) | [rwarden_linux_arm64.deb](https://github.com/routewarden/cli/releases/latest/download/rwarden_linux_arm64.deb) / [rwarden_linux_arm64.rpm](https://github.com/routewarden/cli/releases/latest/download/rwarden_linux_arm64.rpm) |
| **Windows**| 64-bit (`amd64`) | [rwarden_5.0.0_windows_amd64.zip](https://github.com/routewarden/cli/releases/download/v5.0.0/rwarden_5.0.0_windows_amd64.zip) | Standalone Zip |

All downloads and SHA256 checksums are published on the [GitHub Releases Page](https://github.com/routewarden/cli/releases/latest).

---

## Container Images (Docker / CI/CD)

RouteWarden publishes three official, security-hardened container images on GitHub Container Registry (`ghcr.io`):

<CodeViewer :snippets="dockerSnippets" />

### Official Container Distributions

| Image | Tag | Binary Size | Intended Workload |
|:---|:---|:---|:---|
| `ghcr.io/routewarden/cli` | `:latest`, `:5.0.0` | ~12 MB | **Full Toolkit**: Verification, audits, tests, path simulators, code generation, sandboxes, and Docker CLI container tailing |
| `ghcr.io/routewarden/shipper` | `:latest`, `:5.0.0` | **~6.2 MB** | **Ultra-Lean Remote Shipper**: Zero SQLite, zero UI assets. Dedicated to `rwarden push --docker` for edge nodes, IoT gateways, and low-RAM VPS instances |
| `ghcr.io/routewarden/dashboard` | `:latest`, `:5.0.0` | ~11 MB | **Standalone SOC Dashboard**: Turnkey web dashboard server on port `7890` with embedded SQLite persistence and SSE event stream |


---

## From Source (Go)

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
