---
title: Plugin Packaging & Publishing
description: Local testing, Git distribution, version management, and developer checklist for TCP Warden plugins.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../../.vitepress/theme/composables/useCodeSnippet'

// ─── Local Testing Snippets ─────────────────────────────────────────────────
const local_cli = buildSnippet({
  lang: 'bash',
  code: `# 1. Install local plugin into RouteWarden TCP
rwarden tcp plugins install ./echo_guard

# 2. Verify it appears as ACTIVE
rwarden tcp plugins list

# 3. Validate configuration syntax
rwarden tcp validate -c tcp-warden.yaml

# 4. Start the proxy in background
rwarden tcp up -d

# Or using standalone binary:
# tcp-warden plugins install ./echo_guard && tcp-warden run`,
})

const local_yaml = buildSnippet({
  lang: 'yaml',
  code: `# tcp-warden.yaml
services:
  echo_service:
    listen: ":9000"
    upstream: "127.0.0.1:9001"
    protocol: "echo_guard"
    max_auth_failures: 3
    ban_duration: "1h"
    plugin_config:
      blocked_words:
        - "malicious"
        - "exploit"`,
})

const localSnippets = computed(() => ({
  tcp: [
    { filename: 'CLI Commands', lang: 'bash', code: local_cli.cleanCode, html: local_cli.html, hasDiff: false },
    { filename: 'tcp-warden.yaml', lang: 'yaml', code: local_yaml.cleanCode, html: local_yaml.html, hasDiff: false },
  ]
}))

// ─── Git Distribution Snippet ───────────────────────────────────────────────
const git_install = buildSnippet({
  lang: 'bash',
  code: `# Install directly from a public or private Git repository
rwarden tcp plugins install https://github.com/my-org/my-protocol-guard

# Or using standalone binary:
# tcp-warden plugins install https://github.com/my-org/my-protocol-guard

# Or declare in tcp-warden.yaml for auto-installation on boot
plugins:
  my_guard:
    enabled: true
    source: "https://github.com/my-org/my-protocol-guard"`,
})

const gitSnippets = computed(() => ({
  tcp: [
    { filename: 'Git Installation', lang: 'bash', code: git_install.cleanCode, html: git_install.html, hasDiff: false },
  ]
}))

// ─── Git Tagging Snippet ────────────────────────────────────────────────────
const git_tagging = buildSnippet({
  lang: 'bash',
  code: `# 1. Update version in plugin.yaml:
#    version: "1.0.0"

# 2. Commit and create a Git release tag
git commit -am "chore: release v1.0.0"
git tag v1.0.0
git push origin v1.0.0`,
})

const gitTagSnippets = computed(() => ({
  tcp: [
    { filename: 'Git Tagging', lang: 'bash', code: git_tagging.cleanCode, html: git_tagging.html, hasDiff: false },
  ]
}))
</script>

# Packaging & Publishing

Once your plugin passes unit tests and handles protocol streams correctly, you can package, test, and distribute it to other servers and teams.

---

## 1. Local Testing with TCP Warden

Test your plugin end-to-end on your local machine before committing code:

<CodeViewer :snippets="localSnippets" />

---

## 2. Distributing via Git

You can host plugins in any Git repository (GitHub, GitLab, self-hosted Gitea). TCP Warden pulls the repository, verifies the manifest, compiles the plugin, and runs tests automatically:

<CodeViewer :snippets="gitSnippets" />

---

## 3. Versioning & Git Tags

Plugin versions follow standard [Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`). To publish a new version of your plugin:

1. Bump the `version` field in `plugin.yaml` (e.g., `version: "1.0.0"`).
2. Commit your changes and push a Git tag:

<CodeViewer :snippets="gitTagSnippets" />

Users installing your plugin can pin to specific tags, branches, or commit hashes directly in their `tcp-warden.yaml` configuration.

---

## 4. Pre-Publication Checklist

Before tagging a release or submitting a plugin to the official registry, review this checklist:

| Item | Requirement | Why It Matters |
| :--- | :--- | :--- |
| **Embedded Manifest** | Uses `//go:embed plugin.yaml` and `sdk.MustParseManifest`. | Eliminates loose file dependencies at runtime. |
| **Manifest Version** | Sets `manifest_version: "1.0.0"`. | Ensures compatibility with the TCP Warden Plugin SDK. |
| **Buffer Preservation** | Wraps read sockets in `&protocol.BufferedConn{}`. | Prevents silent data corruption and dropped handshake bytes. |
| **Auth Failure Reporting** | Calls `ctx.OnAuthFailure()` on bad logins. | Feeds TCP Warden's automated sliding-window ban engine. |
| **Security Auditing** | Calls `ctx.OnSecurityEvent()` on blocked attacks. | Enables real-time SSE streaming and CrowdSec log ingestion. |
| **Bounded Reads** | Implements max buffer limits when reading sockets. | Prevents out-of-memory crashes from malicious oversized packets. |
| **Multithreading Safety** | `go test -race -count=1 ./...` passes cleanly. | Guarantees zero race conditions under high concurrent loads. |

---

## Contributing to Official Plugins

To contribute your plugin to the official **[`routewarden/plugins`](https://github.com/routewarden/plugins)** repository:
1. Ensure all tests in your plugin pass with `-race`.
2. Follow the directory layout: `plugin.yaml`, `plugin.go`, `inspector.go`, `plugin_test.go`, and `README.md`.
3. Open a Pull Request against `routewarden/plugins`. Once merged, users can install your plugin instantly using `rwarden tcp plugins install <name>` (or `tcp-warden plugins install <name>`).
