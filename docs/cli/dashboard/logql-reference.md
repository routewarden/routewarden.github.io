---
title: LogQL Queries & Alerting Reference — RouteWarden Dashboard
description: Comprehensive LogQL cheat sheet, stream labels reference, metric aggregation queries, and Grafana alert rule configurations for RouteWarden logs.
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../../.vitepress/theme/composables/useCodeSnippet'

// ─── Alert Rule Snippets ───────────────────────────────────────────────────
const alert_spike = buildSnippet({
  lang: 'yaml',
  code: `# Grafana Alert Rule: High Attack Volume Spike
# Triggers if any gateway records more than 30 blocked attacks in 1 minute
apiVersion: 1
groups:
  - name: routewarden-alerts
    rules:
      - alert: RouteWardenHighAttackVolume
        expr: sum by (gateway) (rate({app="routewarden", verdict="BLOCK"}[1m])) > 0.5
        for: 1m
        labels:
          severity: critical
          team: secops
        annotations:
          summary: "Attack surge detected on gateway {{ $labels.gateway }}"
          description: "Gateway {{ $labels.gateway }} is blocking > 30 malicious requests/min."`,
})

const alert_honeypot = buildSnippet({
  lang: 'yaml',
  code: `# Grafana Alert Rule: Honeypot / Tarpit Engagement Triggered
# Triggers immediately whenever an attacker falls into a deception trap
apiVersion: 1
groups:
  - name: routewarden-deception
    rules:
      - alert: RouteWardenHoneypotTriggered
        expr: count_over_time({app="routewarden", response_mode=~"tarpit|gzipBomb|fakeSuccess"}[1m]) > 0
        for: 0m
        labels:
          severity: warning
          team: secops
        annotations:
          summary: "Attacker trapped in {{ $labels.response_mode }} response mode"
          description: "Targeted reconnaissance hit a deception trap on path {{ $labels.path }}."`,
})

const alertSnippets = computed(() => ({
  cli: [
    { filename: 'Attack Spike Alert', lang: 'yaml', code: alert_spike.cleanCode, html: alert_spike.html, hasDiff: false },
    { filename: 'Honeypot Trap Alert', lang: 'yaml', code: alert_honeypot.cleanCode, html: alert_honeypot.html, hasDiff: false },
  ],
}))
</script>

# LogQL Queries & Alerting Reference

RouteWarden normalizes all reverse proxy and daemon security logs into indexed **stream labels** and **structured metadata** within Grafana Loki. This enables lightning-fast LogQL queries, real-time threat dashboards, and automated alert rules.

---

## Stream Labels vs Structured Metadata

To maintain optimal query performance and prevent index explosion, RouteWarden partitions data into two tiers:

### Indexed Stream Labels
Fast, indexed dimensions used in stream selectors (e.g. `{app="routewarden", verdict="BLOCK"}`):

| Label | Description | Example Values |
|:---|:---|:---|
| `app` | Application identifier | `"routewarden"` |
| `verdict` | Overall defense decision | `"BLOCK"`, `"ALLOW"`, `"THROTTLED"` |
| `gateway` | Edge proxy or daemon name | `"traefik"`, `"caddy"`, `"nginx"`, `"tcp-warden"` |
| `level` | Log severity level | `"warn"`, `"info"`, `"error"` |
| `service` | Protected protocol or service | `"http"`, `"ssh"`, `"dns"` |
| `protocol` | Application layer protocol | `"http"`, `"ssh"`, `"dns"` |
| `transport` | Transport layer | `"tcp"`, `"udp"` |
| `country_code` | Two-letter ISO country code | `"US"`, `"DE"`, `"FR"`, `"LAN"` |
| `status_code` | HTTP status code returned | `"403"`, `"404"`, `"429"`, `"200"` |
| `response_mode` | Action taken by RouteWarden | `"json"`, `"silentDrop"`, `"tarpit"`, `"gzipBomb"` |
| `reason` | Block categorization | `"blocked_domain"`, `"ip_denied"`, `"path_match"` |

### Structured Metadata
High-cardinality fields stored inside the log record line without polluting the Loki TSDB index:

| Field | Description | Example |
|:---|:---|:---|
| `client_ip` | Originating client IP address | `"203.0.113.195"` |
| `path` | Request URI or resource accessed | `"/.env"`, `"/api/v1/auth"` |
| `matched_pattern` | Triggered regex signature or glob | `"*.env"`, `"(?i)select.*from"` |
| `rule_id` | Identifier of triggered defense rule | `"sensitive-files-env"` |
| `country_name` | Full country name | `"United States"`, `"Local Network"` |
| `flag_emoji` | Country flag emoji representation | `"🇺🇸"`, `"🏠"` |

---

## LogQL Query Cheat Sheet

Use these LogQL queries in Grafana **Explore**, panels, or alert definitions:

### Filter Queries

| Goal | LogQL Expression |
|:---|:---|
| **All Blocked Requests** | `{app="routewarden", verdict="BLOCK"}` |
| **All Attacks on `.env` Files** | `{app="routewarden", verdict="BLOCK"} \| json \| path =~ ".*\\.env.*"` |
| **All Attacks on `.git` Repositories** | `{app="routewarden", verdict="BLOCK"} \| json \| path =~ ".*\\.git.*"` |
| **Blocks on Specific Gateway** | `{app="routewarden", gateway="traefik", verdict="BLOCK"}` |
| **Layer 4 TCP & UDP Blocks** | `{app="routewarden", gateway="tcp-warden", verdict="BLOCK"}` |
| **Layer 4 UDP DNS Drops** | `{app="routewarden", transport="udp", service="dns", verdict="BLOCK"}` |
| **Tarpit & Deception Hits** | `{app="routewarden", response_mode=~"tarpit\|gzipBomb\|fakeSuccess"}` |

### Metric Aggregations & Top Tables

| Goal | LogQL Expression |
|:---|:---|
| **Blocks Rate (per minute by gateway)** | `sum by (gateway) (rate({app="routewarden", verdict="BLOCK"}[1m]))` |
| **Attack Ratio (%) over 5m** | `(sum(rate({app="routewarden", verdict="BLOCK"}[5m])) / sum(rate({app="routewarden"}[5m]))) * 100` |
| **Top 10 Offending IPs** | `topk(10, sum by (client_ip) (count_over_time({app="routewarden", verdict="BLOCK"} \| json [$__range])))` |
| **Top 10 Target Paths** | `topk(10, sum by (path) (count_over_time({app="routewarden", verdict=~"$verdict"} \| json [$__range])))` |
| **Attack Volume by Country** | `sum by (country_code) (count_over_time({app="routewarden", verdict="BLOCK"}[1h]))` |
| **Defense Action Breakdown** | `sum by (response_mode) (count_over_time({app="routewarden", verdict=~"$verdict", response_mode!=""} [$__range]))` |
| **Top 10 Protected Services** | `topk(10, sum by (service) (count_over_time({app="routewarden", verdict=~"$verdict", service!=""} [$__range])))` |
| **p95 Latency & Tarpit Duration** | `quantile_over_time(0.95, {app="routewarden"} \| json \| unwrap duration_ms [$__interval])` |

---

## Grafana Alert Rules

You can turn LogQL queries into automated alert rules that notify your security team via Slack, Discord, PagerDuty, or Webhooks:

<CodeViewer :snippets="alertSnippets" />
