---
title: Reusing an Existing Logging Infrastructure — RouteWarden Dashboard
description: How to pipe RouteWarden security analytics into your existing GoAccess instance, syslog forwarder, or monitoring pipeline without deploying redundant containers.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../../.vitepress/theme/composables/useCodeSnippet'

// ─── Reusing an Existing Stack Snippets ─────────────────────────────────────
const existing_pipe = buildSnippet({
  lang: 'bash',
  code: `# 1. Stream raw Combined logs from auto-discovered containers into local GoAccess
rwarden monitor --raw | goaccess --log-format=COMBINED -

# 2. Pipe into existing GoAccess with real-time HTML report
rwarden monitor --raw | goaccess \\
  --log-format=COMBINED \\
  --real-time-html \\
  --port=7890 \\
  --addr=0.0.0.0 \\
  -o /var/www/html/security.html -`,
})

const existing_file = buildSnippet({
  lang: 'bash',
  code: `# Tail an existing access log file into the RouteWarden dashboard
rwarden dashboard --file /var/log/nginx/access.log`,
})

const existingSnippets = computed(() => ({
  cli: [
    { filename: 'Piping to GoAccess', lang: 'bash', code: existing_pipe.cleanCode, html: existing_pipe.html, hasDiff: false },
    { filename: 'Tailing Existing Log File', lang: 'bash', code: existing_file.cleanCode, html: existing_file.html, hasDiff: false },
  ],
}))
</script>

# Reusing an Existing Logging Infrastructure

If you already have a log forwarder, web server, or GoAccess instance running on your server, you **do not need** to deploy duplicate monitoring services.

---

## 1. Direct Piping via `rwarden monitor --raw`

The `rwarden monitor` command includes a `--raw` flag that auto-discovers all containers tagged with `routewarden=true` and outputs clean, unformatted log lines formatted in standard Apache/Nginx Combined log format.

You can pipe this stream directly into your existing tools:

<CodeViewer :snippets="existingSnippets" />

---

## 2. Advantages of the Pipeline Model

- **No New Daemons**: Multiplexes existing Docker container logs without launching new background containers.
- **Zero Disk Footprint**: Pipes directly in memory through Unix pipes into GoAccess.
- **Instant Triage**: You can stop and restart the stream anytime with `Ctrl+C`.
