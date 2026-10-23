<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  response: {
    statusCode: number
    statusText: string
    headers: Record<string, string>
    body: string
    note?: string
  }
  evaluation: {
    verdict: string
    badgeClass: string
    normalizedPath: string
    reason: string
  }
  testMethod: string
}>()

const copyResponseSuccess = ref(false)

async function copyResponse() {
  try {
    const r = props.response
    let text = `${props.testMethod} ${props.evaluation.normalizedPath} HTTP/1.1\n`
    text += `HTTP/1.1 ${r.statusCode} ${r.statusText}\n`
    for (const [k, v] of Object.entries(r.headers)) {
      text += `${k}: ${v}\n`
    }
    if (r.body) {
      text += `\n${r.body}\n`
    }
    await navigator.clipboard.writeText(text.trim())
    copyResponseSuccess.value = true
    setTimeout(() => {
      copyResponseSuccess.value = false
    }, 2000)
  } catch {}
}
</script>

<template>
  <div class="rw-http-inspector" :class="`card-${evaluation.badgeClass}`">
    <!-- Terminal Titlebar -->
    <div class="rw-inspector-header">
      <div class="rw-ih-left">
        <span class="rw-ih-dots" aria-hidden="true">
          <span class="dot dot-red"></span>
          <span class="dot dot-yellow"></span>
          <span class="dot dot-green"></span>
        </span>
        <span class="rw-ih-badge">LIVE RESPONSE</span>
        <span class="rw-ih-req">{{ testMethod }} {{ evaluation.normalizedPath }}</span>
        <span class="rw-ih-status">
          {{ response.statusCode }} {{ response.statusText }}
        </span>
        <span class="rw-ih-reason" :title="evaluation.reason">— {{ evaluation.reason }}</span>
      </div>

      <div class="rw-ih-right">
        <button
          type="button"
          class="rw-btn-copy-http"
          :class="{ copied: copyResponseSuccess }"
          title="Copy raw HTTP response (status, headers, body)"
          @click="copyResponse"
        >
          <span class="rw-copy-icon">{{ copyResponseSuccess ? '✓' : '⎘' }}</span>
          <span>{{ copyResponseSuccess ? 'Copied' : 'Copy HTTP' }}</span>
        </button>
      </div>
    </div>

    <!-- HTTP Headers Table/Chips -->
    <div v-if="Object.keys(response.headers).length > 0" class="rw-headers-pane">
      <div class="rw-headers-list">
        <div v-for="(val, key) in response.headers" :key="key" class="rw-hdr-row">
          <span class="rw-hdr-key">{{ key }}:</span>
          <span class="rw-hdr-val">{{ val }}</span>
        </div>
      </div>
    </div>

    <!-- HTTP Body Preview -->
    <div class="rw-body-pane">
      <pre class="rw-body-pre" tabindex="0" title="Simulated HTTP response body"><code>{{ response.body }}</code></pre>
    </div>

    <!-- Security Advisory Note (Defense Explanation) -->
    <div v-if="response.note" class="rw-defense-note">
      <span class="rw-dn-icon">💡</span>
      <span class="rw-dn-text">{{ response.note }}</span>
    </div>
  </div>
</template>

<style scoped>
.rw-http-inspector {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
  font-family: var(--vp-font-family-mono);
  display: flex;
  flex-direction: column;
  height: 100%;
}

.dark .rw-http-inspector {
  background: #090c14;
  border-color: rgba(255, 255, 255, 0.08);
}

/* Card Verdict Theming */
.rw-http-inspector.card-verdict-block {
  border-color: rgba(239, 68, 68, 0.35);
}
.rw-http-inspector.card-verdict-block .rw-inspector-header {
  background: rgba(239, 68, 68, 0.06);
  border-bottom-color: rgba(239, 68, 68, 0.2);
}
.rw-http-inspector.card-verdict-block .rw-ih-status {
  color: #dc2626;
}
.dark .rw-http-inspector.card-verdict-block .rw-ih-status {
  color: #f87171;
}

.rw-http-inspector.card-verdict-allow {
  border-color: rgba(16, 185, 129, 0.35);
}
.rw-http-inspector.card-verdict-allow .rw-inspector-header {
  background: rgba(16, 185, 129, 0.06);
  border-bottom-color: rgba(16, 185, 129, 0.2);
}
.rw-http-inspector.card-verdict-allow .rw-ih-status {
  color: #059669;
}
.dark .rw-http-inspector.card-verdict-allow .rw-ih-status {
  color: #34d399;
}

.rw-http-inspector.card-verdict-bypass {
  border-color: rgba(14, 165, 233, 0.35);
}
.rw-http-inspector.card-verdict-bypass .rw-inspector-header {
  background: rgba(14, 165, 233, 0.06);
  border-bottom-color: rgba(14, 165, 233, 0.2);
}
.rw-http-inspector.card-verdict-bypass .rw-ih-status {
  color: #0284c7;
}
.dark .rw-http-inspector.card-verdict-bypass .rw-ih-status {
  color: #38bdf8;
}

.rw-http-inspector.card-verdict-pass {
  border-color: rgba(100, 116, 139, 0.3);
}
.rw-http-inspector.card-verdict-pass .rw-inspector-header {
  background: rgba(100, 116, 139, 0.06);
  border-bottom-color: rgba(100, 116, 139, 0.2);
}
.rw-http-inspector.card-verdict-pass .rw-ih-status {
  color: #64748b;
}
.dark .rw-http-inspector.card-verdict-pass .rw-ih-status {
  color: #94a3b8;
}

/* Header */
.rw-inspector-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 4px 10px;
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
  min-height: 34px;
  box-sizing: border-box;
}

.rw-ih-left {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  min-width: 0;
  flex: 1;
  overflow: hidden;
}

.rw-ih-dots {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}
.dot-red { background: #ef4444; }
.dot-yellow { background: #f59e0b; }
.dot-green { background: #10b981; }

.rw-ih-badge {
  font-size: 8.5px;
  font-weight: 800;
  letter-spacing: 0.5px;
  padding: 1px 5px;
  border-radius: 3px;
  background: rgba(16, 185, 129, 0.15);
  color: var(--vp-c-brand-1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  flex-shrink: 0;
}

.rw-ih-req {
  color: var(--vp-c-text-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
  min-width: 0;
  flex-shrink: 1;
}

.rw-ih-status {
  font-weight: 700;
  white-space: nowrap;
  flex-shrink: 0;
}

.rw-ih-reason {
  color: var(--vp-c-text-3);
  font-size: 10.5px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  flex: 1;
}

.rw-ih-right {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
}

.rw-btn-copy-http {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10.5px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.rw-btn-copy-http:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.rw-btn-copy-http.copied {
  background: #059669 !important;
  color: #fff !important;
  border-color: #059669 !important;
}

.rw-copy-icon {
  font-size: 10px;
}

/* Headers Pane */
.rw-headers-pane {
  padding: 4px 10px;
  background: var(--vp-c-bg-soft);
  border-bottom: 1px dashed var(--vp-c-divider);
}

.rw-headers-list {
  display: flex;
  flex-direction: column;
  gap: 1.5px;
}

.rw-hdr-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 10.5px;
  line-height: 1.4;
}

.rw-hdr-key {
  color: var(--vp-c-brand-1);
  font-weight: 600;
}

.rw-hdr-val {
  color: var(--vp-c-text-2);
  word-break: break-all;
}

/* Body Pane */
.rw-body-pane {
  padding: 6px 10px;
  background: transparent;
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.rw-body-pre {
  margin: 0 !important;
  padding: 0 !important;
  background: transparent !important;
  font-family: inherit;
  font-size: 11px;
  line-height: 1.5;
  color: var(--vp-c-text-1);
  white-space: pre-wrap;
  word-break: break-all;
  user-select: text;
  cursor: text;
  outline: none;
}

/* Security Note */
.rw-defense-note {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: var(--vp-c-bg-alt);
  border-top: 1px solid var(--vp-c-divider);
  font-size: 10.5px;
  color: var(--vp-c-text-2);
}

.rw-dn-icon {
  font-size: 11px;
}

.rw-dn-text {
  line-height: 1.35;
}
</style>
