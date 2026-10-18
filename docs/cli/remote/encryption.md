---
title: End-to-End Cryptography & Security Model
description: Deep dive into RouteWarden's asymmetric X25519 ECDH + AES-256-GCM encryption architecture for remote log shipping.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../../.vitepress/theme/composables/useCodeSnippet'

// ─── Wire Schemas ────────────────────────────────────────────────────────────
const encrypted_wire = buildSnippet({
  lang: 'json',
  code: `{
  "ephemeral_pub": "T6kR8n... (Base64-encoded 32-byte X25519 public key)",
  "nonce": "kM9+1x... (Base64-encoded 12-byte GCM nonce)",
  "ciphertext": "aB3/8z... (Base64-encoded AES-256-GCM ciphertext + 16-byte tag)"
}`,
})

const encryptedWireSnippets = computed(() => ({
  cli: [
    { filename: 'Encrypted Wire JSON (POST /api/v1/events)', lang: 'json', code: encrypted_wire.cleanCode, html: encrypted_wire.html, hasDiff: false },
  ],
}))

const decrypted_batch = buildSnippet({
  lang: 'json',
  code: `{
  "agent_id": "agent_8f9a2b4c1e0d3f7a",
  "hostname": "edge-frankfurt-01",
  "events": [
    "{\\"time\\":\\"2026-10-18T12:00:00Z\\",\\"client_ip\\":\\"198.51.100.25\\",\\"method\\":\\"GET\\",\\"path\\":\\"/.env\\",\\"verdict\\":\\"BLOCK\\",\\"rule\\":\\"traversal\\"}",
    "{\\"time\\":\\"2026-10-18T12:00:01Z\\",\\"client_ip\\":\\"203.0.113.88\\",\\"method\\":\\"POST\\",\\"path\\":\\"/xmlrpc.php\\",\\"verdict\\":\\"TARPIT\\",\\"rule\\":\\"bruteforce\\"}"
  ]
}`,
})

const decryptedBatchSnippets = computed(() => ({
  cli: [
    { filename: 'Decrypted Event Batch Schema', lang: 'json', code: decrypted_batch.cleanCode, html: decrypted_batch.html, hasDiff: false },
  ],
}))
</script>

# End-to-End Cryptography & Security Model

Security logs often contain sensitive operational data: customer IP addresses, authorization tokens in query strings, user agents, and internal API paths.

In distributed deployments where edge nodes stream telemetry across the public Internet, standard TLS alone may be terminated by intermediate reverse proxies, CDNs, or load balancers. RouteWarden solves this by implementing **application-layer asymmetric end-to-end encryption**.

---

## 1. Cryptographic Primitive Stack

RouteWarden relies strictly on audited, modern cryptographic primitives from the Go standard library (`crypto/ecdh`, `crypto/aes`, `crypto/cipher`, `crypto/sha256`) with **zero third-party dependencies**:

| Layer | Primitive | Purpose |
|:---|:---|:---|
| **Key Agreement** | **X25519 ECDH** (Curve25519) | Asymmetric Diffie-Hellman key exchange producing a shared secret. |
| **Key Derivation** | **HKDF-SHA256** | Expands the raw ECDH shared secret into a 256-bit symmetric session key. |
| **Symmetric Encryption** | **AES-256-GCM** | Authenticated Encryption with Associated Data (AEAD) ensuring confidentiality and tamper resistance. |
| **Authentication & Tokens**| **CSPRNG + SHA-256** | 24-byte cryptographically secure random token generation with hashed verification. |

---

## 2. Encryption Flow (Per-Batch Lifecycle)

Each batch of security events is encrypted independently with an ephemeral keypair:

```text
[ Remote Shipper ]                                              [ Central Dashboard ]
       │                                                                 │
       │  1. Generate ephemeral X25519 keypair (priv_e, pub_e)           │
       │  2. Compute shared_secret = ECDH(priv_e, server_pub)           │
       │  3. Derive session_key = HKDF-SHA256(shared_secret)             │
       │  4. Encrypt payload with AES-256-GCM (nonce, ciphertext, tag)   │
       │                                                                 │
       │     POST /api/v1/events                                         │
       │     { ephemeral_pub, nonce, ciphertext }                        │
       ├────────────────────────────────────────────────────────────────►│
       │                                                                 │ 5. Compute shared_secret = ECDH(server_priv, ephemeral_pub)
       │                                                                 │ 6. Derive session_key = HKDF-SHA256(shared_secret)
       │                                                                 │ 7. Decrypt & verify tag with AES-256-GCM
       │                                                                 │ 8. Ingest verified logs into GoAccess engine
```

### Properties of this Design:
- **Perfect Forward Secrecy (PFS)**: A new ephemeral X25519 keypair is generated for every single batch. Even if a shipper node is physically compromised, past encrypted transmissions captured on the wire cannot be decrypted.
- **Asymmetric Key Storage**: Remote shipper nodes only ever store the central server's **public key**. The master private key remains strictly on the central dashboard server. Compromising an edge node gives an attacker zero ability to decrypt traffic from other edge nodes.
- **AEAD Tamper Proofing**: AES-256-GCM produces a 128-bit authentication tag. Any tampering or bit-flipping on the wire causes decryption to fail cleanly with `400 Bad Request`, rejecting corrupted or forged events.

---

## 3. Payload Wire Format

The encrypted JSON payload sent to `POST /api/v1/events` has the following schema:

<CodeViewer :snippets="encryptedWireSnippets" />

Once decrypted by the central server, the plaintext matches RouteWarden's internal batch schema:

<CodeViewer :snippets="decryptedBatchSnippets" />

---

## 4. Threat Model & Security FAQ

### Q: Why not just use HTTPS?
Standard HTTPS terminates at the first reverse proxy, TLS load balancer, or Cloudflare/Fastly edge. In multi-tenant environments or cloud architectures where traffic passes through third-party infrastructure, your raw security logs are exposed in plaintext at each termination point. RouteWarden's application-layer encryption ensures that only the central dashboard holds the private key to read the logs.

### Q: Why not mutual TLS (mTLS)?
While mTLS provides strong authentication, managing x509 certificate authorities, CRLs/OCSP, and client certificate rotation across hundreds of dynamic edge nodes is notoriously complex and error-prone. RouteWarden provides the same cryptographic guarantees with a lightweight, CrowdSec-style token + public key model.

### Q: What happens if an agent key is leaked?
You can instantly revoke the key using `rwarden keys revoke <name>`. Because the server checks authorization on every request, the leaked key will be rejected immediately with HTTP 401.
