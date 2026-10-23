---
title: Reusing an Existing Logging Infrastructure — Routewarden Dashboard
description: How to pipe Routewarden security analytics into your existing log forwarder, SIEM, or monitoring pipeline without deploying redundant containers.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../../.vitepress/theme/composables/useCodeSnippet'

// ─── Reusing an Existing Stack Snippets ─────────────────────────────────────
const existing_pipe = buildSnippet({
  lang: 'bash',
  code: `# 1. Stream raw Combined logs from auto-discovered containers into stdout or jq
rwarden monitor --raw | jq .

# 2. Forward stream to an existing file or log pipeline
rwarden monitor --raw >> /var/log/central-security.log`,
})

const existing_file = buildSnippet({
  lang: 'bash',
  code: `# Tail an existing access log file into the Routewarden dashboard
rwarden dashboard --file /var/log/nginx/access.log`,
})

const existingSnippets = computed(() => ({
  cli: [
    { filename: 'Piping to External Tools', lang: 'bash', code: existing_pipe.cleanCode, html: existing_pipe.html, hasDiff: false },
    { filename: 'Tailing Existing Log File', lang: 'bash', code: existing_file.cleanCode, html: existing_file.html, hasDiff: false },
  ],
}))
</script>

# Reusing an Existing Logging Infrastructure

If you already have a log forwarder, web server, or SIEM pipeline running on your server, you **do not need** to deploy duplicate monitoring services.

---

## 1. Direct Piping via `rwarden monitor --raw`

The `rwarden monitor` command includes a `--raw` flag that auto-discovers all containers tagged with `routewarden=true` and outputs clean, unformatted log lines formatted in standard Apache/Nginx Combined log format.

You can pipe this stream directly into your existing tools:

<CodeViewer :snippets="existingSnippets" />

---

## 2. Advantages of the Pipeline Model

- **No New Daemons**: Multiplexes existing Docker container logs without launching new background containers.
- **Zero Disk Footprint**: Pipes directly in memory through Unix pipes into external analyzers.
- **Instant Triage**: You can stop and restart the stream anytime with `Ctrl+C`.
