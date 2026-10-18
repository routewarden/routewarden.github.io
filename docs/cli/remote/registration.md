---
title: Remote Agent Enrollment (rwarden register)
description: Connect and authenticate remote edge servers to the central RouteWarden dashboard in a one-time cryptographic handshake.
---

# Remote Agent Enrollment (`rwarden register`)

Before a remote server can stream encrypted security events, it must complete a one-time enrollment handshake with the central dashboard.

The `rwarden register` command connects to your central dashboard, authenticates with your assigned agent key, fetches the server's master **X25519 public key**, and saves an encrypted agent profile on the remote host.

---

## 1. Running the Registration Command

On your remote edge node or cloud VM:

```bash
rwarden register --url http://<dashboard-ip>:7890 --key rw_sec_8f9a2b4c1e0d3f7a...
```

### Flag Aliases
You can use standard shorthand flags:
```bash
rwarden register -u http://198.51.100.10:7890 -k rw_sec_8f9a2b4c1e0d...
```

### Successful Handshake Output

```text
⏳ Connecting to RouteWarden Central Dashboard at http://198.51.100.10:7890...
✅ Successfully registered with RouteWarden Central Dashboard!
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
   rwarden push --file /var/log/nginx/access.log
```

---

## 2. What Happens During Registration?

```text
[ Remote Host ]                                         [ Central Dashboard ]
       │                                                         │
       │   POST /api/v1/register (Authorization: Bearer <key>)   │
       ├────────────────────────────────────────────────────────►│
       │                                                         │ 1. Validate SHA-256(token)
       │                                                         │ 2. Check revocation status
       │                                                         │ 3. Fetch server public key
       │   200 OK { agent_id, agent_name, public_key }           │
       │◄────────────────────────────────────────────────────────┤
       │                                                         │
  Save ~/.routewarden/agent.json (0600)                          │
```

1. **Authentication**: The client sends an HTTP POST request to `/api/v1/register` containing your agent secret key in the `Authorization: Bearer` header.
2. **Server Verification**: The central dashboard computes the SHA-256 hash of the received token and matches it against `api_keys.json`.
3. **Public Key Delivery**: If authenticated, the central server responds with its master **X25519 public key**, the permanent `agent_id`, and `agent_name`.
4. **Configuration Persistence**: The client writes `~/.routewarden/agent.json` with strict **`0600`** permissions (read/write only by owner).

---

## 3. Configuration File (`agent.json`)

After registration, `agent.json` stores your connection profile:

```json
{
  "dashboard_url": "http://198.51.100.10:7890",
  "agent_token": "rw_sec_8f9a2b4c1e0d3f7a9b2c4e6f8a0d1c3e4f5a6b7c8d9e0f1a",
  "agent_id": "agent_8f9a2b4c1e0d3f7a",
  "agent_name": "edge-frankfurt-01",
  "server_public_key": "xJ9+4kL2vM8n2xP1qZ5wY3tA0bC...",
  "registered_at": "2026-10-18T12:00:00Z"
}
```

> [!TIP]
> Because `agent.json` contains the server public key and agent token, you can run `rwarden push` without any arguments or environment variables.

---

## 4. Custom Configuration Path

If running in multi-tenant environments, container sidecars, or under non-root users, you can specify a custom configuration file path using `--config`:

```bash
rwarden register \
  --url http://198.51.100.10:7890 \
  --key rw_sec_8f9a2b4c1e0d... \
  --config /etc/routewarden/agent.json
```

When pushing, pass the same path:
```bash
rwarden push --config /etc/routewarden/agent.json
```

---

## 5. Re-Registration & Key Rotation

If an agent key is rotated or revoked on the central server:
1. Generate a new key: `rwarden keys create <name>`
2. Run `rwarden register` on the remote node with the new key.
3. The existing `agent.json` will be safely updated in place with the new credentials.
