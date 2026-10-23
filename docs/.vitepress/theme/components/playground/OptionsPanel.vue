<script setup lang="ts">
import { STANDARD_METHODS } from './rules'

const props = defineProps<{
  inspectedMethods: string[]
  allStandardMethodsSelected: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle-method', method: string): void
  (e: 'toggle-all'): void
}>()

const enableDefaultPatterns = defineModel<boolean>('enableDefaultPatterns', { required: true })
const enableDefaultAllowPatterns = defineModel<boolean>('enableDefaultAllowPatterns', { required: true })
const checkQuery = defineModel<boolean>('checkQuery', { required: true })
const enabled = defineModel<boolean>('enabled', { required: true })
const debug = defineModel<boolean>('debug', { required: true })
const securityLog = defineModel<boolean>('securityLog', { required: true })
const checkHeadersInput = defineModel<string>('checkHeadersInput', { required: true })
const allowedIpsInput = defineModel<string>('allowedIpsInput', { required: true })
const trustedProxiesInput = defineModel<string>('trustedProxiesInput', { default: '' })
const methodsInput = defineModel<string>('methodsInput', { required: true })
</script>

<template>
  <div class="rw-options-card">
    <!-- Header -->
    <div class="rw-options-header">
      <div class="rw-header-left">
        <span class="rw-opt-icon" aria-hidden="true">⚙️</span>
        <span class="rw-opt-title">Security &amp; Inspection Settings</span>
      </div>
      <div class="rw-header-badge">
        <span>CORE POLICY</span>
      </div>
    </div>

    <!-- Section 1: Engine Toggles / Switches -->
    <div class="rw-toggles-grid">
      <!-- Built-in Blocklist -->
      <button
        type="button"
        class="rw-toggle-chip"
        :class="{ active: enableDefaultPatterns }"
        title="Block sensitive file patterns (.env, .git, *.sql, wp-config, etc.)"
        @click="enableDefaultPatterns = !enableDefaultPatterns"
      >
        <span class="rw-toggle-switch">
          <span class="rw-switch-thumb"></span>
        </span>
        <span class="rw-chip-label">Default Blocklist</span>
      </button>

      <!-- Built-in Allowlist -->
      <button
        type="button"
        class="rw-toggle-chip"
        :class="{ active: enableDefaultAllowPatterns }"
        title="Allow known safe routes (/.well-known/acme-challenge, robots.txt, sitemap.xml)"
        @click="enableDefaultAllowPatterns = !enableDefaultAllowPatterns"
      >
        <span class="rw-toggle-switch">
          <span class="rw-switch-thumb"></span>
        </span>
        <span class="rw-chip-label">Default Allowlist</span>
      </button>

      <!-- Check Query -->
      <button
        type="button"
        class="rw-toggle-chip"
        :class="{ active: checkQuery }"
        title="Inspect query string parameters for embedded path traversal probes (?path=...)"
        @click="checkQuery = !checkQuery"
      >
        <span class="rw-toggle-switch">
          <span class="rw-switch-thumb"></span>
        </span>
        <span class="rw-chip-label">Inspect Query</span>
      </button>

      <!-- Security Log -->
      <button
        type="button"
        class="rw-toggle-chip"
        :class="{ active: securityLog }"
        title="Emit single-line structured JSON security events on stdout for CrowdSec and SIEM"
        @click="securityLog = !securityLog"
      >
        <span class="rw-toggle-switch">
          <span class="rw-switch-thumb"></span>
        </span>
        <span class="rw-chip-label">Security Log (SIEM)</span>
      </button>

      <!-- Debug Mode -->
      <button
        type="button"
        class="rw-toggle-chip"
        :class="{ active: debug }"
        title="Output verbose debugging telemetry to gateway logs"
        @click="debug = !debug"
      >
        <span class="rw-toggle-switch">
          <span class="rw-switch-thumb"></span>
        </span>
        <span class="rw-chip-label">Debug Mode</span>
      </button>

      <!-- Master Enabled -->
      <button
        type="button"
        class="rw-toggle-chip"
        :class="{ active: enabled }"
        title="Master switch for RouteWarden security middleware"
        @click="enabled = !enabled"
      >
        <span class="rw-toggle-switch">
          <span class="rw-switch-thumb"></span>
        </span>
        <span class="rw-chip-label">Protection Active</span>
      </button>
    </div>

    <!-- Section 2: Network & Custom Headers -->
    <div class="rw-network-grid">
      <!-- Allowed IPs -->
      <div class="rw-input-block" title="Allowed client IP addresses or CIDR subnets that bypass inspection">
        <label class="rw-input-label">
          <span class="rw-label-icon">🌐</span>
          <span>Allowed IPs &amp; CIDRs</span>
          <code>allowedIps</code>
        </label>
        <input
          v-model="allowedIpsInput"
          class="rw-text-input"
          placeholder="127.0.0.1, 10.0.0.0/8"
          autocomplete="off"
          spellcheck="false"
        />
      </div>

      <!-- Trusted Proxies -->
      <div class="rw-input-block" title="Trusted reverse proxies or CIDRs permitted to supply X-Forwarded-For / X-Real-IP">
        <label class="rw-input-label">
          <span class="rw-label-icon">🔒</span>
          <span>Trusted Proxies</span>
          <code>trustedProxies</code>
        </label>
        <input
          v-model="trustedProxiesInput"
          class="rw-text-input"
          placeholder="10.0.0.0/8, 172.16.0.0/12"
          autocomplete="off"
          spellcheck="false"
        />
      </div>

      <!-- Check Custom Headers -->
      <div class="rw-input-block" title="Inspect custom HTTP headers for path smuggling (e.g. X-Forwarded-Uri, X-Rewrite-URL)">
        <label class="rw-input-label">
          <span class="rw-label-icon">📋</span>
          <span>Check Headers</span>
          <code>checkHeaders</code>
        </label>
        <input
          v-model="checkHeadersInput"
          class="rw-text-input"
          placeholder="X-Forwarded-Uri, X-Rewrite-URL"
          autocomplete="off"
          spellcheck="false"
        />
      </div>
    </div>

    <!-- Section 3: Inspected HTTP Verbs -->
    <div class="rw-verbs-section">
      <div class="rw-verbs-header">
        <div class="rw-vh-left">
          <span class="rw-vh-label">Inspected HTTP Verbs</span>
          <code class="rw-vh-code">methods</code>
          <span class="rw-vh-note">— Uninspected verbs bypass directly to upstream</span>
        </div>
        <button
          type="button"
          class="rw-btn-quick-toggle"
          @click="emit('toggle-all')"
        >
          {{ allStandardMethodsSelected ? 'GET Only' : 'Inspect All' }}
        </button>
      </div>

      <div class="rw-verbs-controls">
        <div class="rw-verbs-pills">
          <button
            v-for="m in STANDARD_METHODS"
            :key="m"
            type="button"
            class="rw-method-chip"
            :class="{ active: inspectedMethods.includes(m) }"
            :title="inspectedMethods.includes(m) ? `Click to exclude ${m} from inspection` : `Click to inspect ${m} requests`"
            @click="emit('toggle-method', m)"
          >
            <span class="rw-mc-icon">{{ inspectedMethods.includes(m) ? '✓' : '+' }}</span>
            <span class="rw-mc-text">{{ m }}</span>
          </button>
        </div>

        <input
          v-model="methodsInput"
          class="rw-custom-verbs-input"
          placeholder="Custom verbs: GET, POST..."
          title="Comma-separated inspected HTTP verbs"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.rw-options-card {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 0.65rem 0.75rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.dark .rw-options-card {
  background: #0f1422;
  border-color: rgba(255, 255, 255, 0.08);
}

/* Header */
.rw-options-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding-bottom: 0.35rem;
  border-bottom: 1px solid var(--vp-c-divider);
}

.rw-header-left {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.rw-opt-icon {
  font-size: 12px;
}

.rw-opt-title {
  font-family: var(--vp-font-family-mono);
  font-size: 11.5px;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.rw-header-badge {
  font-family: var(--vp-font-family-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.5px;
  padding: 1px 5px;
  border-radius: 3px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-3);
}

/* Section 1: Toggles Grid */
.rw-toggles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 0.35rem;
}

.rw-toggle-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 4px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
  text-align: left;
}

.rw-toggle-chip:hover {
  border-color: var(--vp-c-brand-1);
}

.rw-toggle-chip.active {
  background: rgba(16, 185, 129, 0.08);
  border-color: rgba(16, 185, 129, 0.35);
}
.dark .rw-toggle-chip.active {
  background: rgba(16, 185, 129, 0.12);
  border-color: rgba(16, 185, 129, 0.4);
}

.rw-toggle-switch {
  position: relative;
  width: 22px;
  height: 12px;
  border-radius: 10px;
  background: var(--vp-c-divider);
  transition: background 0.2s ease;
  flex-shrink: 0;
}

.rw-toggle-chip.active .rw-toggle-switch {
  background: var(--vp-c-brand-1);
}

.rw-switch-thumb {
  position: absolute;
  top: 1px;
  left: 1px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.2s ease;
}

.rw-toggle-chip.active .rw-switch-thumb {
  transform: translateX(10px);
}

.rw-chip-label {
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-weight: 500;
  color: var(--vp-c-text-2);
  white-space: nowrap;
}

.rw-toggle-chip.active .rw-chip-label {
  color: var(--vp-c-text-1);
  font-weight: 600;
}

/* Section 2: Network Grid */
.rw-network-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 0.5rem;
  padding-top: 0.2rem;
}

.rw-input-block {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.rw-input-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: var(--vp-font-family-mono);
  font-size: 10.5px;
  font-weight: 600;
  color: var(--vp-c-text-2);
}

.rw-label-icon {
  font-size: 10px;
}

.rw-input-label code {
  font-size: 9.5px;
  color: var(--vp-c-text-3);
  background: transparent;
  padding: 0;
}

.rw-text-input {
  width: 100%;
  padding: 4px 7px;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  outline: none;
  transition: all 0.15s ease;
}

.rw-text-input:focus {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 0 2px var(--vp-c-brand-soft);
}

/* Section 3: HTTP Verbs */
.rw-verbs-section {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding-top: 0.35rem;
  border-top: 1px dashed var(--vp-c-divider);
}

.rw-verbs-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.rw-vh-left {
  display: flex;
  align-items: baseline;
  gap: 5px;
  flex-wrap: wrap;
}

.rw-vh-label {
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.rw-vh-code {
  font-size: 9.5px;
  color: var(--vp-c-text-3);
  padding: 0 2px;
}

.rw-vh-note {
  font-size: 10px;
  color: var(--vp-c-text-3);
}

.rw-btn-quick-toggle {
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  font-weight: 600;
  padding: 1.5px 7px;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-brand-1);
  cursor: pointer;
  transition: all 0.15s ease;
}

.rw-btn-quick-toggle:hover {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand-1);
}

.rw-verbs-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.rw-verbs-pills {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.rw-method-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 7px;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono);
  font-size: 10.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.rw-method-chip:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-text-1);
}

.rw-method-chip.active {
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
  border-color: rgba(16, 185, 129, 0.4);
}
.dark .rw-method-chip.active {
  color: #34d399;
}

.rw-mc-icon {
  font-size: 9px;
  font-weight: 800;
}

.rw-custom-verbs-input {
  width: 140px;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-family: var(--vp-font-family-mono);
  font-size: 10.5px;
  outline: none;
}

.rw-custom-verbs-input:focus {
  border-color: var(--vp-c-brand-1);
}
</style>
