---
title: Remote Agent Key Management (rwarden keys)
description: Generate, audit, and revoke distributed API authentication credentials for remote RouteWarden shippers.
---

# Remote Agent Key Management (`rwarden keys`)

To ensure secure communication across untrusted networks, RouteWarden enforces cryptographic authentication for all remote shippers. The `rwarden keys` subcommand provides complete lifecycle management for agent credentials.

All key management commands run on the **central server** hosting the RouteWarden dashboard.

---

## 1. Create an Agent Key (`keys create`)

Generate a new unique enrollment key for a remote node:

```bash
rwarden keys create <agent-name>
```

### Example

```bash
rwarden keys create edge-frankfurt-01
```

### Output

```text
🔑 Agent Key Created Successfully!
─────────────────────────────────────────────────────────────
  Agent Name:   edge-frankfurt-01
  Agent ID:     agent_8f9a2b4c1e0d3f7a
  Token:        rw_sec_8f9a2b4c1e0d3f7a9b2c4e6f8a0d1c3e4f5a6b7c8d9e0f1a
─────────────────────────────────────────────────────────────
💡 To connect a remote server, run this on the remote host:
   rwarden register --url http://<dashboard-ip>:7890 --key rw_sec_8f9a2b4c1e0d3f7a9b2c4e6f8a0d1c3e4f5a6b7c8d9e0f1a

   rwarden push
```

### Token Security Model
- **Token Generation**: Each token contains 24 cryptographically secure random bytes from `crypto/rand`, prefixed with `rw_sec_`.
- **Zero Plaintext Storage**: The central server **never** stores the raw secret token. Only the **SHA-256 hash** of the token is saved in `api_keys.json`.
- **Unique Naming**: Active agent names must be unique. If an agent key is compromised and revoked, the same name can safely be re-registered with a brand-new token.

---

## 2. List Registered Agents (`keys list`)

Inspect all enrolled agents, their authorization status, token prefixes, and last-seen activity:

```bash
rwarden keys list
```

### Example Output

```text
🔑 Registered Remote Agents (3):
ID                 NAME                 TOKEN PREFIX     STATUS     LAST SEEN
────────────────────────────────────────────────────────────────────────────────
agent_8f9a2b4c1e0d edge-frankfurt-01    rw_sec_8f9a2b... ACTIVE     2026-10-18T12:00:15Z
agent_1a2b3c4d5e6f aws-us-east-1        rw_sec_1a2b3c... ACTIVE     2026-10-18T11:59:40Z
agent_7a8b9c0d1e2f legacy-vps           rw_sec_7a8b9c... REVOKED    2026-10-15T09:12:00Z
```

### Column Breakdown
- **ID**: Unique 16-character identifier assigned to the remote agent.
- **NAME**: User-friendly hostname or cluster label (e.g. `edge-frankfurt-01`).
- **TOKEN PREFIX**: First 10 characters of the secret token for auditing without exposing the secret.
- **STATUS**: `ACTIVE` (authorized to stream) or `REVOKED` (immediately rejected with HTTP 401).
- **LAST SEEN**: RFC3339 timestamp of the most recent log batch or heartbeat received from the agent.

---

## 3. Revoke an Agent Key (`keys revoke`)

Instantly invalidate an agent's token to immediately quarantine a compromised or decommissioned node:

```bash
# Revoke by name
rwarden keys revoke edge-frankfurt-01

# Or revoke by unique agent ID
rwarden keys revoke agent_8f9a2b4c1e0d
```

### Immediate Enforcement
When a key is marked revoked:
1. Subsequent log batches sent to `POST /api/v1/events` return **HTTP 401 Unauthorized**.
2. Automated heartbeats sent to `POST /api/v1/heartbeat` are rejected.
3. The agent's historical records remain in `api_keys.json` with `"revoked": true` for security auditability.
4. The central dashboard stops incrementing event counts for this agent.

---

## Storage & Configuration Options

By default, agent keys and server keypairs are stored in:
`~/.routewarden/dashboard/api_keys.json`

You can specify a custom storage directory using the `--dir` flag on any `keys` command:

```bash
# Create key in custom storage directory
rwarden keys create edge-02 --dir /etc/routewarden/dashboard

# List keys from custom storage directory
rwarden keys list --dir /etc/routewarden/dashboard

# Revoke key in custom storage directory
rwarden keys revoke edge-02 --dir /etc/routewarden/dashboard
```

### File Permissions
- `server.key` (master private key): Enforced **`0600`** permissions (read/write only by owner).
- `server.pub` (master public key): Enforced **`0644`** permissions.
- `api_keys.json` (keystore): Enforced **`0600`** permissions.
