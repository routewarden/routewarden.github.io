<script setup lang="ts">
import { computed } from 'vue'
import type { ResponseMode } from './generator'

export interface VerbEvalResult {
  method: string
  verdict: 'BLOCK' | 'ALLOW' | 'BYPASS' | 'PASS' | 'DISABLED'
  statusTitle: string
  badgeClass: string
  statusCode: number
  statusText: string
  reason: string
  isInspected: boolean
}

defineProps<{
  verbEvaluations: VerbEvalResult[]
}>()

const responseMode = defineModel<ResponseMode>('responseMode', { required: true })
const statusCode = defineModel<number>('statusCode', { required: true })
const customBody = defineModel<string>('customBody', { required: true })
const redirectUrl = defineModel<string>('redirectUrl', { required: true })
const proxyUrl = defineModel<string>('proxyUrl', { required: true })
const gzipBombMB = defineModel<number>('gzipBombMB', { required: true })
const tarpitDelayMs = defineModel<number>('tarpitDelayMs', { required: true })
const tarpitMaxDurationSeconds = defineModel<number>('tarpitMaxDurationSeconds', { required: true })
const retryAfterSeconds = defineModel<number>('retryAfterSeconds', { required: true })
const streamSizeMB = defineModel<number>('streamSizeMB', { required: true })
const captchaProvider = defineModel<'turnstile' | 'hcaptcha' | 'recaptcha'>('captchaProvider', { required: true })
const captchaSiteKey = defineModel<string>('captchaSiteKey', { required: true })
const captchaTitle = defineModel<string>('captchaTitle', { required: true })
const testMethod = defineModel<string>('testMethod', { required: true })

const isStatusDisabled = computed(() => {
  return ['silentDrop', 'fakeSuccess', 'redirect', 'rateLimitChallenge'].includes(responseMode.value)
})
</script>

<template>
  <div class="rw-response-panel">
    <!-- Header: Action Mode & HTTP Status -->
    <div class="rw-resp-header">
      <div class="rw-resp-header-left">
        <span class="rw-resp-icon" aria-hidden="true">🛡️</span>
        <span class="rw-resp-title">Response Mode &amp; Active Defense</span>
      </div>

      <div class="rw-resp-header-right">
        <!-- Response Mode Selector -->
        <div class="rw-select-wrap">
          <span class="rw-sw-label">Mode:</span>
          <select v-model="responseMode" class="rw-mode-select">
            <optgroup label="Standard HTTP Responses">
              <option value="json">JSON Object</option>
              <option value="html">HTML Document</option>
              <option value="text">Plain Text</option>
              <option value="xml">XML Document</option>
            </optgroup>
            <optgroup label="Active Defense Traps">
              <option value="silentDrop">Silent Drop (TCP RST)</option>
              <option value="gzipBomb">Gzip Decompression Bomb</option>
              <option value="tarpit">Tarpit (Slow Drip)</option>
              <option value="infiniteStream">Infinite Junk Stream</option>
            </optgroup>
            <optgroup label="Deception &amp; Verification">
              <option value="fakeSuccess">Deceptive HTTP 200</option>
              <option value="redirect">Sinkhole Redirect</option>
              <option value="proxy">Honeypot Reverse Proxy</option>
              <option value="captcha">Interactive CAPTCHA</option>
              <option value="rateLimitChallenge">Rate Limit Challenge (429)</option>
            </optgroup>
          </select>
        </div>

        <!-- Status Code Input -->
        <div v-if="!isStatusDisabled" class="rw-status-wrap">
          <span class="rw-sw-label">Status:</span>
          <input
            v-model.number="statusCode"
            type="number"
            min="200"
            max="599"
            class="rw-status-input"
            title="HTTP Status code returned on block"
          />
        </div>
      </div>
    </div>

    <!-- Active Defense Parameters Deck -->
    <div class="rw-mode-config-card">
      <!-- Redirect -->
      <div v-if="responseMode === 'redirect'" class="rw-field-row">
        <span class="rw-field-label">Redirect Target:</span>
        <input
          v-model="redirectUrl"
          class="rw-field-input"
          placeholder="https://sinkhole.example.com/blocked"
        />
      </div>

      <!-- Proxy -->
      <div v-if="responseMode === 'proxy'" class="rw-field-row">
        <span class="rw-field-label">Honeypot Upstream:</span>
        <input
          v-model="proxyUrl"
          class="rw-field-input"
          placeholder="http://honeypot-internal:8080"
        />
      </div>

      <!-- Gzip Bomb -->
      <div v-if="responseMode === 'gzipBomb'" class="rw-field-row">
        <span class="rw-field-label">Compressed Size:</span>
        <div class="rw-unit-field">
          <input v-model.number="gzipBombMB" type="number" min="1" max="100" class="rw-mini-num" />
          <span class="rw-unit-text">MB (expands to ~{{ gzipBombMB * 1000 }} MB in scanner memory)</span>
        </div>
      </div>

      <!-- Tarpit -->
      <div v-if="responseMode === 'tarpit'" class="rw-field-row rw-wrap-row">
        <div class="rw-sub-field">
          <span class="rw-field-label">Drip Delay:</span>
          <div class="rw-unit-field">
            <input v-model.number="tarpitDelayMs" type="number" min="50" step="100" class="rw-mini-num" />
            <span class="rw-unit-text">ms / byte</span>
          </div>
        </div>
        <div class="rw-sub-field">
          <span class="rw-field-label">Max Duration:</span>
          <div class="rw-unit-field">
            <input v-model.number="tarpitMaxDurationSeconds" type="number" min="1" class="rw-mini-num" />
            <span class="rw-unit-text">seconds</span>
          </div>
        </div>
      </div>

      <!-- Rate Limit Challenge -->
      <div v-if="responseMode === 'rateLimitChallenge'" class="rw-field-row">
        <span class="rw-field-label">Retry-After:</span>
        <div class="rw-unit-field">
          <input v-model.number="retryAfterSeconds" type="number" min="1" class="rw-mini-num" />
          <span class="rw-unit-text">seconds</span>
        </div>
      </div>

      <!-- Infinite Stream -->
      <div v-if="responseMode === 'infiniteStream'" class="rw-field-row">
        <span class="rw-field-label">Stream Cap:</span>
        <div class="rw-unit-field">
          <input v-model.number="streamSizeMB" type="number" min="1" class="rw-mini-num" />
          <span class="rw-unit-text">MB of chunked pseudo-random data</span>
        </div>
      </div>

      <!-- CAPTCHA -->
      <div v-if="responseMode === 'captcha'" class="rw-field-row rw-wrap-row">
        <div class="rw-sub-field">
          <span class="rw-field-label">Provider:</span>
          <select v-model="captchaProvider" class="rw-mini-select">
            <option value="turnstile">Cloudflare Turnstile</option>
            <option value="hcaptcha">hCaptcha</option>
            <option value="recaptcha">Google reCAPTCHA v2</option>
          </select>
        </div>
        <div class="rw-sub-field rw-flex-1">
          <span class="rw-field-label">Site Key:</span>
          <input v-model="captchaSiteKey" class="rw-field-input mono" placeholder="0x4AAAAAA..." />
        </div>
        <div class="rw-sub-field rw-flex-1">
          <span class="rw-field-label">Page Title:</span>
          <input v-model="captchaTitle" class="rw-field-input" placeholder="Verification Title" />
        </div>
      </div>

      <!-- Silent Drop Notice -->
      <div v-if="responseMode === 'silentDrop'" class="rw-silent-box">
        <span class="rw-badge-tcp-rst">TCP RST</span>
        <span class="rw-silent-text">
          Abruptly terminates the raw TCP socket via Go <code>http.Hijacker</code>. Exactly 0 HTTP bytes, headers, or status codes sent to scanner.
        </span>
      </div>

      <!-- Custom Body Override -->
      <div v-if="['json', 'text', 'html', 'xml', 'fakeSuccess'].includes(responseMode)" class="rw-field-row">
        <span class="rw-field-label">Custom Payload:</span>
        <div class="rw-custom-body-wrap">
          <input
            v-model="customBody"
            class="rw-field-input"
            :placeholder="responseMode === 'json' ? 'Leave empty for default JSON or enter custom payload...' : 'Leave empty for default or enter custom body...'"
          />
          <button
            v-if="customBody"
            type="button"
            class="rw-btn-reset"
            title="Reset to default payload"
            @click="customBody = ''"
          >✕</button>
        </div>
      </div>
    </div>

    <!-- Live HTTP Verb Evaluation Matrix -->
    <div class="rw-verb-matrix-card">
      <div class="rw-vm-header">
        <div class="rw-vm-title-wrap">
          <span class="rw-vm-title">⚡ HTTP Verb Security Matrix</span>
          <span class="rw-vm-desc">— Live verdict for each method; click any verb to simulate</span>
        </div>
      </div>

      <div class="rw-matrix-chips">
        <button
          v-for="ve in verbEvaluations"
          :key="ve.method"
          type="button"
          class="rw-matrix-pill"
          :class="[
            ve.badgeClass,
            {
              'is-active-method': testMethod === ve.method,
              'is-uninspected': !ve.isInspected
            }
          ]"
          :title="`Click to simulate HTTP ${ve.method} (${ve.reason})`"
          @click="testMethod = ve.method"
        >
          <span class="rw-mp-dot">●</span>
          <span class="rw-mp-name">{{ ve.method }}</span>
          <span class="rw-mp-verdict">{{ ve.verdict }}</span>
          <span class="rw-mp-code">{{ ve.statusCode }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rw-response-panel {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 0.65rem 0.75rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.dark .rw-response-panel {
  background: #0f1422;
  border-color: rgba(255, 255, 255, 0.08);
}

/* Header */
.rw-resp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding-bottom: 0.35rem;
  border-bottom: 1px solid var(--vp-c-divider);
  flex-wrap: wrap;
}

.rw-resp-header-left {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.rw-resp-icon {
  font-size: 12px;
}

.rw-resp-title {
  font-family: var(--vp-font-family-mono);
  font-size: 11.5px;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.rw-resp-header-right {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.rw-select-wrap, .rw-status-wrap {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
}

.rw-sw-label {
  color: var(--vp-c-text-3);
  font-weight: 600;
}

.rw-mode-select, .rw-mini-select {
  padding: 2.5px 6px;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  outline: none;
  cursor: pointer;
  transition: all 0.15s ease;
}

.rw-mode-select:focus, .rw-mini-select:focus {
  border-color: var(--vp-c-brand-1);
}

.rw-status-input {
  width: 58px;
  padding: 2.5px 5px;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  text-align: center;
  outline: none;
}

.rw-status-input:focus {
  border-color: var(--vp-c-brand-1);
}

/* Parameters Card */
.rw-mode-config-card {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.rw-field-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
}

.rw-wrap-row {
  flex-wrap: wrap;
}

.rw-sub-field {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.rw-flex-1 {
  flex: 1;
  min-width: 140px;
}

.rw-field-label {
  color: var(--vp-c-text-2);
  font-weight: 600;
  white-space: nowrap;
}

.rw-field-input {
  flex: 1;
  min-width: 120px;
  padding: 3px 6px;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-1);
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  outline: none;
}
.rw-field-input:focus {
  border-color: var(--vp-c-brand-1);
}

.rw-custom-body-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
}

.rw-btn-reset {
  background: transparent;
  border: none;
  color: var(--vp-c-text-3);
  font-size: 10px;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 3px;
}
.rw-btn-reset:hover {
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-1);
}

.rw-unit-field {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.rw-mini-num {
  width: 55px;
  padding: 2.5px 5px;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-1);
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  text-align: center;
  outline: none;
}

.rw-unit-text {
  color: var(--vp-c-text-3);
  font-size: 10.5px;
}

.rw-silent-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
}

.rw-badge-tcp-rst {
  padding: 1px 6px;
  border-radius: 3px;
  background: rgba(239, 68, 68, 0.15);
  color: #dc2626;
  font-weight: 700;
  font-size: 10px;
  flex-shrink: 0;
}
.dark .rw-badge-tcp-rst {
  color: #f87171;
}

.rw-silent-text {
  color: var(--vp-c-text-2);
}

/* Verb Matrix */
.rw-verb-matrix-card {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding-top: 0.2rem;
}

.rw-vm-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.rw-vm-title {
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.rw-vm-desc {
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  color: var(--vp-c-text-3);
}

.rw-matrix-chips {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  flex-wrap: wrap;
}

.rw-matrix-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2.5px 7px;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  font-family: var(--vp-font-family-mono);
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

.rw-matrix-pill:hover {
  transform: translateY(-1px);
  filter: brightness(1.05);
}

.rw-matrix-pill.is-active-method {
  box-shadow: 0 0 0 2px var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}

.rw-mp-dot {
  font-size: 7px;
}
.rw-matrix-pill.verdict-block .rw-mp-dot { color: #ef4444; }
.rw-matrix-pill.verdict-allow .rw-mp-dot { color: #10b981; }
.rw-matrix-pill.verdict-bypass .rw-mp-dot { color: #0ea5e9; }
.rw-matrix-pill.verdict-pass .rw-mp-dot { color: #64748b; }

.rw-mp-name {
  font-size: 10.5px;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.rw-mp-verdict {
  font-size: 9px;
  font-weight: 800;
  padding: 0.5px 4px;
  border-radius: 3px;
  letter-spacing: 0.3px;
}
.rw-matrix-pill.verdict-block .rw-mp-verdict {
  background: rgba(239, 68, 68, 0.18);
  color: #dc2626;
}
.dark .rw-matrix-pill.verdict-block .rw-mp-verdict { color: #f87171; }

.rw-matrix-pill.verdict-allow .rw-mp-verdict {
  background: rgba(16, 185, 129, 0.18);
  color: #059669;
}
.dark .rw-matrix-pill.verdict-allow .rw-mp-verdict { color: #34d399; }

.rw-matrix-pill.verdict-bypass .rw-mp-verdict {
  background: rgba(14, 165, 233, 0.18);
  color: #0284c7;
}
.dark .rw-matrix-pill.verdict-bypass .rw-mp-verdict { color: #38bdf8; }

.rw-matrix-pill.verdict-pass .rw-mp-verdict {
  background: rgba(100, 116, 139, 0.18);
  color: #475569;
}
.dark .rw-matrix-pill.verdict-pass .rw-mp-verdict { color: #94a3b8; }

.rw-mp-code {
  font-size: 9.5px;
  color: var(--vp-c-text-3);
  font-weight: 600;
}
</style>
