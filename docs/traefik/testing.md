---
title: "Traefik Warden: Testing & Validation"
description: "Testing guidelines and Yaegi interpreter verification for Routewarden Traefik plugin development."
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

const test_race = buildSnippet({
  lang: 'bash',
  code: `go test -v -race ./...`,
})

const test_coverage = buildSnippet({
  lang: 'bash',
  code: `go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out`,
})

const test_suites = buildSnippet({
  lang: 'bash',
  code: `# Run only security evasion tests
go test -v -run TestRouteWarden_SecurityEvasionVectors ./...

# Run only IP / CIDR whitelist evaluation tests
go test -v -run TestIPFilter ./...

# Run only multi-middleware integration pipeline tests
go test -v -run TestPipeline ./...`,
})

const testSnippets = computed(() => ({
  traefik: [
    { filename: 'Race Detector', lang: 'bash', code: test_race.cleanCode, html: test_race.html, hasDiff: false },
    { filename: 'Code Coverage', lang: 'bash', code: test_coverage.cleanCode, html: test_coverage.html, hasDiff: false },
    { filename: 'Test Suites', lang: 'bash', code: test_suites.cleanCode, html: test_suites.html, hasDiff: false },
  ],
}))
</script>

# Testing & Verification

Routewarden contains a comprehensive, multi-layer testing architecture designed to guarantee correctness, concurrency safety, and total compliance with Traefik's Yaegi interpreter constraints.

---

## Running Automated Tests

<CodeViewer :snippets="testSnippets" />

*(Current statement coverage stands at **>92%** across all modules).*

---

## Test Architecture & Modular Coverage

Routewarden isolates unit testing per component and uses integration tests to validate full HTTP request cycles:

| Test File | Scope & Focus |
|---|---|
| [`config_test.go`](https://github.com/routewarden/traefik-warden/blob/main/config_test.go) | Default settings, regex dictionaries, validation of `CreateConfig()` and factory defaults. |
| [`path_normalizer_test.go`](https://github.com/routewarden/traefik-warden/blob/main/path_normalizer_test.go) | Recursive URL unescaping (`%252e%252e`), semicolon matrix parameters (`/;param/.env`), Windows backslash normalization, and null byte injection attacks. |
| [`ip_filter_test.go`](https://github.com/routewarden/traefik-warden/blob/main/ip_filter_test.go) | Exact IPv4/IPv6 addresses, CIDR subnet matching, parsing `X-Forwarded-For`, `X-Real-IP`, and invalid IP syntax error handling. |
| [`response_handler_test.go`](https://github.com/routewarden/traefik-warden/blob/main/response_handler_test.go) | Custom JSON formatting, HTML templates, Turnstile/hCaptcha/reCAPTCHA markup generation, redirects, silent drops, and status codes. |
| [`routewarden_test.go`](https://github.com/routewarden/traefik-warden/blob/main/routewarden_test.go) | Middleware integration, default patterns, custom regex rules, allowlist overrides, query inspection, and disabled mode pass-through. |
| [`integration_test.go`](https://github.com/routewarden/traefik-warden/blob/main/integration_test.go) | Full multi-middleware pipeline simulation (`Tracing ➡️ Routewarden ➡️ Upstream Backend Service`). |

---

## Continuous Integration (GitHub Actions)

Every pull request and push to `main` runs Routewarden's automated CI pipeline:
- Validates code formatting with `gofmt`
- Compiles with Go 1.22+ and 1.23+
- Executes `go test -v -race ./...`
