---
title: Plugin SDK & Lifecycle Reference
description: Understanding the Go interfaces, embedded manifests, and auth failure tracking in TCP Warden plugins.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../../.vitepress/theme/composables/useCodeSnippet'

// ─── Step 1: Manifest (plugin.yaml) ──────────────────────────────────────────
const manifest_yaml = buildSnippet({
  lang: 'yaml',
  code: `# plugin.yaml
manifest_version: "1.0.0"
name: echo_guard
version: "1.1.0"
description: "Protocol inspector filtering sensitive keywords"
author: "Your Name <you@example.com>"
protocols:
  - echo_guard
default_service:
  listen: ":9000"
  upstream: "127.0.0.1:9001"
  protocol: "echo_guard"
  plugin_config:
    blocked_words:
      - "malicious"
      - "exploit"`,
})

const manifestSnippets = computed(() => ({
  tcp: [
    { filename: 'plugin.yaml', lang: 'yaml', code: manifest_yaml.cleanCode, html: manifest_yaml.html, hasDiff: false },
  ]
}))

// ─── Step 2: Plugin Lifecycle (plugin.go) ───────────────────────────────────
const plugin_go = buildSnippet({
  lang: 'go',
  code: `package echo_guard

import (
	_ "embed"
	"errors"
	"strings"

	"github.com/routewarden/cli/proxy/plugins"
	"github.com/routewarden/cli/proxy/plugins/sdk"
)

//go:embed plugin.yaml
var manifestYAML []byte

var manifest = sdk.MustParseManifest(manifestYAML)

func init() {
	// Register the plugin with TCP Warden on import
	plugins.Register(&Plugin{})
}

type Plugin struct{}

// Manifest returns the embedded metadata for this plugin
func (p *Plugin) Manifest() sdk.Manifest {
	return manifest
}

// ValidateConfig validates plugin_config before the proxy starts
func (p *Plugin) ValidateConfig(cfg map[string]any) error {
	if rawWords, ok := cfg["blocked_words"]; ok {
		words, ok := rawWords.([]any)
		if !ok {
			return errors.New("'blocked_words' must be a list of strings")
		}
		if len(words) == 0 {
			return errors.New("'blocked_words' cannot be empty")
		}
	}
	return nil
}

// CreateInspector instantiates the protocol inspector for a service
func (p *Plugin) CreateInspector(cfg map[string]any) (sdk.Inspector, error) {
	var words []string
	if rawWords, ok := cfg["blocked_words"].([]any); ok {
		for _, w := range rawWords {
			if s, ok := w.(string); ok {
				words = append(words, strings.ToLower(s))
			}
		}
	}
	return &Inspector{BlockedWords: words}, nil
}

// SelfTest performs an instant in-memory sanity check on startup
func (p *Plugin) SelfTest() error {
	insp := &Inspector{BlockedWords: []string{"test"}}
	if len(insp.BlockedWords) == 0 {
		return errors.New("self-test failed: uninitialized slice")
	}
	return nil
}`,
})

const pluginGoSnippets = computed(() => ({
  tcp: [
    { filename: 'plugin.go', lang: 'go', code: plugin_go.cleanCode, html: plugin_go.html, hasDiff: false },
  ]
}))

// ─── Step 3: Stream Inspector (inspector.go) ────────────────────────────────
const inspector_go = buildSnippet({
  lang: 'go',
  code: `package echo_guard

import (
	"bufio"
	"fmt"
	"net"
	"strings"

	"github.com/routewarden/cli/proxy/plugins/sdk"
	"github.com/routewarden/cli/proxy/protocol"
)

type Inspector struct {
	BlockedWords []string
}

// Run executes the active inspection and proxying loop for a single connection
func (insp *Inspector) Run(ctx sdk.Context, client, upstream net.Conn) (sdk.ProxyResult, bool, string, error) {
	clientReader := bufio.NewReader(client)

	// Read first line / handshake packet
	line, err := clientReader.ReadString('\\n')
	if err != nil {
		return sdk.ProxyResult{Err: err}, false, "", nil
	}

	lowerLine := strings.ToLower(line)
	for _, word := range insp.BlockedWords {
		if strings.Contains(lowerLine, word) {
			// Trigger security audit event
			if ctx != nil {
				ctx.OnSecurityEvent("blocked", "blocked keyword: "+word)
			}
			return sdk.ProxyResult{}, true, fmt.Sprintf("blocked keyword: %s", word), nil
		}
	}

	// CRITICAL: Preserve buffered bytes before calling bidirectional proxy
	bufferedClient := &protocol.BufferedConn{
		Conn:   client,
		Reader: clientReader,
	}

	res := protocol.Proxy(bufferedClient, upstream)
	return sdk.ProxyResult{
		BytesIn:  res.BytesIn,
		BytesOut: res.BytesOut,
		Err:      res.Err,
	}, false, "", nil
}`,
})

const inspectorGoSnippets = computed(() => ({
  tcp: [
    { filename: 'inspector.go', lang: 'go', code: inspector_go.cleanCode, html: inspector_go.html, hasDiff: false },
  ]
}))

// ─── Step 4: Auth Failure Tracking ──────────────────────────────────────────
const auth_guard_go = buildSnippet({
  lang: 'go',
  code: `// When verifying credentials (e.g., password, auth token, or SSH handshake):
if !isValidToken(token) {
    // 1. Tell TCP Warden this client failed authentication
    // TCP Warden will increment its sliding-window failure counter.
    // If failures reach 'max_auth_failures', the IP is banned automatically!
    if ctx != nil {
        ctx.OnAuthFailure()
        ctx.OnSecurityEvent("auth_failure", "invalid_password")
    }

    // 2. Reject connection
    return sdk.ProxyResult{}, true, "authentication failed", nil
}`,
})

const authSnippets = computed(() => ({
  tcp: [
    { filename: 'Auth Failure Tracking', lang: 'go', code: auth_guard_go.cleanCode, html: auth_guard_go.html, hasDiff: false },
  ]
}))

// ─── Step 5: UDP Plugin & Inspector (udp.go) ────────────────────────────────
const udp_plugin_go = buildSnippet({
  lang: 'go',
  code: `package my_udp_plugin

import (
	"strings"

	"github.com/routewarden/cli/proxy/plugins/sdk"
)

// 1. Opt into UDP support by implementing sdk.UDPPlugin
type Plugin struct{}

func (p *Plugin) UDPManifest() sdk.Manifest {
	return manifest
}

func (p *Plugin) CreateUDPInspector(cfg map[string]any) (sdk.UDPInspector, error) {
	return &UDPInspector{}, nil
}

// 2. Implement sdk.UDPInspector for per-session packet inspection
type UDPInspector struct{}

func (u *UDPInspector) InspectPacket(ctx sdk.Context, pkt *sdk.UDPPacket) (sdk.UDPVerdict, string, error) {
	// pkt.Payload: raw datagram bytes (mutable in-place)
	// pkt.ClientAddr: original client's *net.UDPAddr
	// pkt.IsReply: true if traveling upstream -> client

	if !pkt.IsReply && strings.Contains(string(pkt.Payload), "BLOCKED_KEYWORD") {
		if ctx != nil {
			ctx.OnSecurityEvent("blocked", "blocked UDP payload keyword")
		}
		// Return UDPVerdictDrop to discard without reply (safest against reflection attacks)
		return sdk.UDPVerdictDrop, "blocked keyword in datagram", nil
	}

	return sdk.UDPVerdictAllow, "", nil
}

func (u *UDPInspector) Close() error {
	// Clean up session resources when UDP session table reaps this client
	return nil
}`,
})

const udpSnippets = computed(() => ({
  tcp: [
    { filename: 'udp_inspector.go', lang: 'go', code: udp_plugin_go.cleanCode, html: udp_plugin_go.html, hasDiff: false },
  ]
}))
</script>

# Plugin SDK & Lifecycle

This reference details the Go interfaces, embedded manifest schemas, and lifecycle hooks provided by the **RouteWarden Plugin SDK** (`github.com/routewarden/cli/proxy/plugins/sdk`).

---

## 1. The Plugin Manifest (`plugin.yaml`)

Every plugin contains a `plugin.yaml` file declaring its identity, supported protocols, and default service configuration:

<CodeViewer :snippets="manifestSnippets" />

### Manifest Version vs. Plugin Version

Each plugin tracks two distinct version numbers:

| Field | Meaning | When to Bump |
| :--- | :--- | :--- |
| `manifest_version` | The specification format version (currently `"1.0.0"`). | Only when the core TCP Warden manifest schema itself changes. |
| `version` | Your plugin's release version (SemVer, e.g. `"1.1.0"`). | Whenever you update your plugin code, fix bugs, or release new features. |

::: tip Why Two Versions?
Decoupling the manifest schema from your plugin version ensures that bumping your release version never breaks manifest compatibility checks.
:::

---

## 2. Implementing `sdk.Plugin` (`plugin.go`)

The `sdk.Plugin` interface defines how TCP Warden initializes and validates your plugin:

<CodeViewer :snippets="pluginGoSnippets" />

### Core Lifecycle Methods

- **`Manifest()`**: Returns the embedded manifest metadata. Use Go's `//go:embed plugin.yaml` so metadata is compiled directly into the binary.
- **`ValidateConfig(cfg)`**: Called before listeners start. Validates user options under `plugin_config` in `tcp-warden.yaml`.
- **`CreateInspector(cfg)`**: Factory function that creates a new inspector instance for each service listener using this protocol.
- **`SelfTest()`**: Fast in-memory sanity check called during daemon startup and `tcp-warden plugins test`.

---

## 3. Implementing `sdk.Inspector` (`inspector.go`)

The inspector handles incoming TCP streams. Its `Run()` method is invoked whenever an approved client connects:

<CodeViewer :snippets="inspectorGoSnippets" />

::: danger Always Wrap Buffered Connections
When inspecting the initial protocol handshake with `bufio.NewReader`, Go buffers incoming bytes in memory. If you pass the raw socket to `protocol.Proxy()` without the buffered reader, those bytes will be lost!

Always wrap the client connection in `&protocol.BufferedConn{Conn: client, Reader: clientReader}` when transitioning to bidirectional streaming.
:::

---

## 4. Automated Brute-Force & Failure Tracking

One of TCP Warden's key features is automatic brute-force defense. Plugins do not need to manage IP counters or ban tables themselves—simply notify the context when an authentication check fails:

<CodeViewer :snippets="authSnippets" />

### How `ctx.OnAuthFailure()` Works:
1. Client sends invalid credentials or unauthorized handshake tokens.
2. The inspector calls `ctx.OnAuthFailure()`.
3. TCP Warden increments the failure counter for that client IP.
4. If failures exceed `max_auth_failures` within the sliding time window, TCP Warden adds the IP to its SQLite database and bans it across all services.

---

## 5. Implementing `sdk.UDPPlugin` & `sdk.UDPInspector` (UDP Protocols)

TCP Warden v3.0.0 introduces datagram-level protocol inspection for UDP services. Because UDP is stateless and connectionless, inspection differs from stream-based TCP:

<CodeViewer :snippets="udpSnippets" />

### Core UDP Architecture

- **Optional Interface Extension**: Plugins declare UDP capability by implementing `sdk.UDPPlugin`. The host daemon uses Go type assertions at runtime (`plugin.(sdk.UDPPlugin)`), so existing TCP-only plugins remain 100% compatible without changes.
- **Session Tables & NAT Mappings**: TCP Warden maintains an internal `UDPSessionTable` tracking client address keys (`IP:port`). One `UDPInspector` instance is instantiated per unique client session via `CreateUDPInspector()`.
- **Bidirectional Packet Inspection**: `InspectPacket()` is called on every datagram in both directions. The `pkt.IsReply` boolean indicates whether the packet is traveling client → upstream or upstream → client.
- **In-Place Payload Mutation**: Inspectors can mutate `pkt.Payload` directly in-place (e.g. rewriting DNS answers, TTL values, or filtering DHT fields) before the datagram is forwarded.
- **Verdicts (`sdk.UDPVerdict`)**:
  - `UDPVerdictAllow`: Datagram is forwarded to destination.
  - `UDPVerdictDrop`: Datagram is silently discarded. (Recommended for security drops to prevent UDP reflection and amplification attacks).
  - `UDPVerdictReject`: Generates a protocol-level rejection where supported.
- **Session Cleanup (`Close()`)**: Invoked when the client session is reaped after `udp.session_timeout` or daemon shutdown.

---

## Next Steps

- **[In-Memory Testing & QA](./testing)**: Write unit tests using `net.Pipe()` with zero open network ports.
- **[Packaging & Publishing](./publishing)**: Learn how to test locally and publish your plugin.
