---
title: Remote Agent Enrollment (rwarden register)
description: Connect and authenticate remote edge servers to the central Routewarden dashboard in a one-time cryptographic handshake.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../../.vitepress/theme/composables/useCodeSnippet'

// ─── 1. Registration Snippets ────────────────────────────────────────────────
const reg_cmd = buildSnippet({
  lang: 'bash',
  code: `# One-time registration with central dashboard
rwarden register --url http://198.51.100.10:7890 --key rw_sec_8f9a2b4c1e0d3f7a...

# Or using flag aliases (-u and -k)
rwarden register -u http://198.51.100.10:7890 -k rw_sec_8f9a2b4c1e0d...

# Pre-configure telemetry filtering (forward status codes/ranges by default)
rwarden register -u http://198.51.100.10:7890 -k rw_sec_8f9a... --status "400-599, 301"`,
})

const registerSnippets = computed(() => ({
  cli: [
    { filename: 'rwarden register', lang: 'bash', code: reg_cmd.cleanCode, html: reg_cmd.html, hasDiff: false },
  ],
}))

const reg_output = buildSnippet({
  lang: 'plaintext',
  code: `⏳ Connecting to Routewarden Central Dashboard at http://198.51.100.10:7890...
✅ Successfully registered with Routewarden Central Dashboard!
─────────────────────────────────────────────────────────────
  Dashboard URL:     http://198.51.100.10:7890
  Agent Name:        edge-frankfurt-01
  Agent ID:          agent_8f9a2b4c1e0d3f7a
  Server Public Key: xJ9+4kL2vM8n2xP1qZ5wY3tA0bC...
  Config Saved:      /root/.routewarden/agent.json
─────────────────────────────────────────────────────────────
🚀 You are ready to stream! Start pushing logs with:
   rwarden push
   rwarden push --docker
   rwarden push --file /var/log/nginx/access.log`,
})

const registerOutputSnippets = computed(() => ({
  cli: [
    { filename: 'Handshake Response', lang: 'plaintext', code: reg_output.cleanCode, html: reg_output.html, hasDiff: false },
  ],
}))

// ─── 2. Configuration File Snippet ───────────────────────────────────────────
const config_json = buildSnippet({
  lang: 'json',
  code: `{
  "dashboard_url": "http://198.51.100.10:7890",
  "agent_token": "rw_sec_8f9a2b4c1e0d3f7a9b2c4e6f8a0d1c3e4f5a6b7c8d9e0f1a",
  "agent_id": "agent_8f9a2b4c1e0d3f7a",
  "agent_name": "edge-frankfurt-01",
  "server_public_key": "xJ9+4kL2vM8n2xP1qZ5wY3tA0bC...",
  "registered_at": "2026-10-18T12:00:00Z",
  "status_codes": "400-599, 301"
}`,
})

const configSnippets = computed(() => ({
  cli: [
    { filename: '~/.routewarden/agent.json', lang: 'json', code: config_json.cleanCode, html: config_json.html, hasDiff: false },
  ],
}))

// ─── 3. Custom Config Path Snippet ───────────────────────────────────────────
const custom_cfg_cmd = buildSnippet({
  lang: 'bash',
  code: `# Register with custom file destination
rwarden register \\
  --url http://198.51.100.10:7890 \\
  --key rw_sec_8f9a2b4c1e0d... \\
  --config /etc/routewarden/agent.json

# When pushing, pass the same config path:
rwarden push --config /etc/routewarden/agent.json`,
})

const customConfigSnippets = computed(() => ({
  cli: [
    { filename: 'Custom Config (--config)', lang: 'bash', code: custom_cfg_cmd.cleanCode, html: custom_cfg_cmd.html, hasDiff: false },
  ],
}))

const handshake_flow = buildSnippet({
  lang: 'text',
  code: `[ Remote Host ]                                         [ Central Dashboard ]
       │                                                         │
       │   POST /api/v1/register (Authorization: Bearer <key>)   │
       ├────────────────────────────────────────────────────────►│
       │                                                         │ 1. Validate SHA-256(token)
       │                                                         │ 2. Check revocation status
       │                                                         │ 3. Fetch server public key
       │   200 OK { agent_id, agent_name, public_key }           │
       │◄────────────────────────────────────────────────────────┤
       │                                                         │
  Save ~/.routewarden/agent.json (0600)                          │`,
})

const handshakeFlowSnippets = computed(() => ({
  cli: [
    { filename: 'Enrollment Handshake Flow', lang: 'text', code: handshake_flow.cleanCode, html: handshake_flow.html, hasDiff: false },
  ],
}))
</script>

# Remote Agent Enrollment (`rwarden register`)

Before a remote server can stream encrypted security events, it must complete a one-time enrollment handshake with the central dashboard.

The `rwarden register` command connects to your central dashboard, authenticates with your assigned agent key, fetches the server's master **X25519 public key**, and saves an encrypted agent profile on the remote host.

---

## 1. Running the Registration Command

On your remote edge node or cloud VM:

<CodeViewer :snippets="registerSnippets" />

Output:

<CodeViewer :snippets="registerOutputSnippets" />

---

## 2. What Happens During Registration?

<CodeViewer :snippets="handshakeFlowSnippets" />

1. **Authentication**: The client sends an HTTP POST request to `/api/v1/register` containing your agent secret key in the `Authorization: Bearer` header.
2. **Server Verification**: The central dashboard computes the SHA-256 hash of the received token and matches it against `api_keys.json`.
3. **Public Key Delivery**: If authenticated, the central server responds with its master **X25519 public key**, the permanent `agent_id`, and `agent_name`.
4. **Configuration Persistence**: The client writes `~/.routewarden/agent.json` with strict **`0600`** permissions (read/write only by owner).

---

## 3. Configuration File (`agent.json`)

After registration, `agent.json` stores your connection profile and telemetry filtering defaults:

<CodeViewer :snippets="configSnippets" />

> [!TIP]
> The telemetry filtering flags (`--status`, `--include-failed`, `--all-traffic`) can be configured independently during registration. When saved, `rwarden push` automatically inherits these settings so background services run with your chosen filter without needing extra CLI flags. Any flags explicitly passed to `rwarden push` will override `agent.json`.

---

## 4. Custom Configuration Path

If running in multi-tenant environments, container sidecars, or under non-root users, you can specify a custom configuration file path using `--config`:

<CodeViewer :snippets="customConfigSnippets" />

---

## 5. Re-Registration & Key Rotation

If an agent key is rotated or revoked on the central server:
1. Generate a new key: `rwarden keys create <name>`
2. Run `rwarden register` on the remote node with the new key.
3. The existing `agent.json` will be safely updated in place with the new credentials.

---

## 6. Registration Flags Reference

| Flag | Shorthand | Type | Required | Description |
|:---|:---|:---|:---|:---|
| `--url` | `-u` | string | **Yes** | Central Routewarden dashboard URL (e.g. `http://dashboard.internal:7890`) |
| `--key` | `-k` | string | **Yes** | 24-byte secret agent token created via `rwarden keys create` |
| `--config` | — | string | No | Custom path to store agent configuration (default: `~/.routewarden/agent.json`) |
| `--status` | `-s` | string | No | Persist default HTTP status codes or ranges to forward (e.g. `'400-599, 301'`, `'4xx, 5xx'`) |
| `--include-failed` | `-F` | bool | No | Legacy alias: persist setting to ship all failed HTTP requests (status >= 400: 4xx, 5xx) |
| `--all-traffic` | — | bool | No | Persist default setting to ship all HTTP access traffic including 200 OK responses |

