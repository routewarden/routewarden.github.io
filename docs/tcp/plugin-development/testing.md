---
title: Plugin Testing & Quality Assurance
description: In-memory network socket testing with net.Pipe() and multithreaded race detection for TCP Warden plugins.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../../.vitepress/theme/composables/useCodeSnippet'

// ─── Step 4: Unit Tests (plugin_test.go) ────────────────────────────────────
const test_go = buildSnippet({
  lang: 'go',
  code: `package echo_guard

import (
	"bufio"
	"net"
	"testing"
	"time"

	"github.com/routewarden/cli/proxy/plugins/sdk"
)

func TestInspector_BlockedTraffic(t *testing.T) {
	// Create two in-memory duplex pipes (client side and upstream side)
	clientA, clientB := net.Pipe()
	defer clientA.Close()
	defer clientB.Close()

	upA, upB := net.Pipe()
	defer upA.Close()
	defer upB.Close()

	insp := &Inspector{BlockedWords: []string{"malicious"}}
	ctx := &sdk.DefaultContext{ServiceName: "test-echo", ClientAddress: "127.0.0.1"}

	done := make(chan struct {
		blocked bool
		reason  string
	}, 1)

	go func() {
		_, blocked, reason, _ := insp.Run(ctx, clientB, upA)
		done <- struct {
			blocked bool
			reason  string
		}{blocked, reason}
	}()

	// Simulate client writing a blocked payload
	_, _ = clientA.Write([]byte("hello malicious world\\n"))

	select {
	case res := <-done:
		if !res.blocked {
			t.Error("expected keyword to be blocked")
		}
		if res.reason != "blocked keyword: malicious" {
			t.Errorf("unexpected reason: %s", res.reason)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("test timed out")
	}
}

func TestInspector_AllowedTraffic(t *testing.T) {
	clientA, clientB := net.Pipe()
	defer clientA.Close()
	defer clientB.Close()

	upA, upB := net.Pipe()
	defer upA.Close()
	defer upB.Close()

	// Capture what the upstream server receives
	upstreamReceived := make(chan string, 1)
	go func() {
		reader := bufio.NewReader(upB)
		line, _ := reader.ReadString('\\n')
		upstreamReceived <- line
	}()

	insp := &Inspector{BlockedWords: []string{"malicious"}}
	ctx := &sdk.DefaultContext{ServiceName: "test-echo", ClientAddress: "127.0.0.1"}

	go func() {
		_, _, _, _ = insp.Run(ctx, clientB, upA)
	}()

	// Send clean traffic
	_, _ = clientA.Write([]byte("hello clean world\\n"))

	select {
	case received := <-upstreamReceived:
		if received != "hello clean world\\n" {
			t.Errorf("expected clean message, got: %s", received)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("test timed out waiting for upstream forwarding")
	}
}`,
})

const testGoSnippets = computed(() => ({
  tcp: [
    { filename: 'plugin_test.go', lang: 'go', code: test_go.cleanCode, html: test_go.html, hasDiff: false },
  ]
}))

// ─── Test Commands Snippet ──────────────────────────────────────────────────
const test_cmd = buildSnippet({
  lang: 'bash',
  code: `# 1. Run unit tests with multithreaded race detector enabled
go test -v -race -count=1 ./...

# 2. Run in-memory self-tests across all installed plugins (Unified CLI)
rwarden tcp plugins test

# Or using standalone binary:
# tcp-warden plugins test`,
})

const testCmdSnippets = computed(() => ({
  tcp: [
    { filename: 'Terminal', lang: 'bash', code: test_cmd.cleanCode, html: test_cmd.html, hasDiff: false },
  ]
}))

// ─── Self-Test Snippet ──────────────────────────────────────────────────────
const selftest_go = buildSnippet({
  lang: 'go',
  code: `func (p *Plugin) SelfTest() error {
	insp := &Inspector{BlockedWords: []string{"test"}}
	if len(insp.BlockedWords) == 0 {
		return errors.New("self-test failed: uninitialized slice")
	}
	return nil
}`,
})

const selfTestSnippets = computed(() => ({
  tcp: [
    { filename: 'plugin.go', lang: 'go', code: selftest_go.cleanCode, html: selftest_go.html, hasDiff: false },
  ]
}))
</script>

# Plugin Testing & QA

TCP Warden plugins handle real-time production network traffic. To ensure stability, every plugin must pass strict unit testing with multithreading race condition detection before deployment.

---

## Why Test with `net.Pipe()`?

Testing network proxies typically requires binding localhost ports, managing background server processes, and cleaning up sockets.

Go's standard library provides **`net.Pipe()`**, which creates a synchronous, in-memory duplex network connection:

- **Zero Open Ports**: Tests run without binding real ports or needing firewall permissions.
- **Instant Execution**: In-memory pipes transfer bytes in microseconds.
- **Deterministic**: Network timing, partial reads, and disconnects can be simulated reliably.

```
[ Test Code ] ──(Write)──► clientA ◄═══ net.Pipe() ═══► clientB ──► [ Inspector.Run() ]
                                                                             │
[ Test Code ] ◄──(Read)───   upB   ◄═══ net.Pipe() ═══►   upA   ◄────────────┘
```

---

## Writing In-Memory Unit Tests

Below is a complete test suite verifying both attack interception and legitimate traffic forwarding:

<CodeViewer :snippets="testGoSnippets" />

---

## Running Tests with the Race Detector

Always run tests with Go's built-in race condition detector (`-race`). The TCP proxy relies on concurrent goroutines for bidirectional traffic forwarding:

<CodeViewer :snippets="testCmdSnippets" />

::: danger Race Detector Failures Abort Installation
The 4-step safety pipeline automatically runs `go test -race` when installing plugins. If any race condition is found, installation is immediately rejected.
:::

---

## Implementing Daemon Self-Tests (`SelfTest`)

Every plugin can implement the `SelfTest() error` method on `sdk.Plugin`:

<CodeViewer :snippets="selfTestSnippets" />

Self-tests are executed:
1. When starting the daemon (`rwarden tcp up` or `tcp-warden run`).
2. When validating configurations (`rwarden tcp validate` or `tcp-warden validate`).
3. On demand via `rwarden tcp plugins test` (or `tcp-warden plugins test`).

---

## Next Steps

- **[Packaging & Publishing](./publishing)**: Learn how to install your plugin locally, distribute via Git, and review the pre-publication checklist.
