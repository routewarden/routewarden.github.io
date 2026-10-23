<script setup lang="ts">
import { computed } from 'vue'
import { PRESETS, type PresetItem } from './rules'

const props = defineProps<{
  evaluation: {
    verdict: string
    badgeClass: string
    normalizedPath: string
    transformations: string[]
  }
  shareFeedback: boolean
}>()

const emit = defineEmits<{
  (e: 'apply-preset', preset: PresetItem): void
  (e: 'copy-share'): void
}>()

const testMethod = defineModel<string>('testMethod', { required: true })
const testPath = defineModel<string>('testPath', { required: true })
const testIp = defineModel<string>('testIp', { required: true })
const testForwardedFor = defineModel<string>('testForwardedFor', { default: '' })

const methodColorClass = computed(() => {
  const m = testMethod.value.toUpperCase()
  if (m === 'GET') return 'method-get'
  if (m === 'POST') return 'method-post'
  if (m === 'PUT' || m === 'PATCH') return 'method-put'
  if (m === 'DELETE') return 'method-delete'
  return 'method-other'
})

function clearPath() {
  testPath.value = '/'
}
</script>

<template>
  <div class="rw-hero-strip">
    <!-- Top Action Bar: Method + Path + Verdict + Share -->
    <div class="rw-request-bar">
      <!-- Method Selector Pill -->
      <div class="rw-method-wrapper" :class="methodColorClass">
        <select
          v-model="testMethod"
          class="rw-method-select"
          title="Simulated HTTP request verb"
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
          <option value="PATCH">PATCH</option>
          <option value="HEAD">HEAD</option>
          <option value="OPTIONS">OPTIONS</option>
        </select>
        <span class="rw-method-arrow">▾</span>
      </div>

      <!-- Path Input with Terminal Prompt -->
      <div class="rw-path-input-group">
        <span class="rw-prompt-symbol" aria-hidden="true">❯</span>
        <input
          v-model="testPath"
          class="rw-path-input"
          placeholder="/admin/.env"
          autocomplete="off"
          spellcheck="false"
          aria-label="Target test path"
        />
        <button
          v-if="testPath && testPath !== '/'"
          type="button"
          class="rw-btn-clear"
          title="Clear path"
          @click="clearPath"
        >✕</button>
      </div>

      <!-- Live Verdict Badge -->
      <div
        class="rw-verdict-badge"
        :class="evaluation.badgeClass"
        title="Live RouteWarden verdict for this request"
      >
        <span class="rw-verdict-dot">●</span>
        <span class="rw-verdict-text">{{ evaluation.verdict }}</span>
      </div>

      <!-- Share Link Button -->
      <button
        type="button"
        class="rw-btn-share"
        :class="{ copied: shareFeedback }"
        title="Copy shareable link with current playground parameters"
        @click="emit('copy-share')"
      >
        <span class="rw-share-icon" aria-hidden="true">{{ shareFeedback ? '✓' : '⎘' }}</span>
        <span class="rw-share-text">{{ shareFeedback ? 'Copied' : 'Share' }}</span>
      </button>
    </div>

    <!-- Secondary Context Bar: Network Metadata & Presets -->
    <div class="rw-context-bar">
      <!-- Network Inputs -->
      <div class="rw-net-inputs">
        <div class="rw-net-field" title="Direct client IP (RemoteAddr)">
          <span class="rw-net-label">IP</span>
          <input
            v-model="testIp"
            class="rw-net-input"
            placeholder="198.51.100.42"
          />
        </div>

        <div class="rw-net-field" title="Simulated X-Forwarded-For header">
          <span class="rw-net-label">XFF</span>
          <input
            v-model="testForwardedFor"
            class="rw-net-input"
            placeholder="203.0.113.195"
          />
        </div>
      </div>

      <!-- Quick Preset Chips -->
      <div class="rw-presets-wrap">
        <span class="rw-presets-label">Presets:</span>
        <div class="rw-presets-list">
          <button
            v-for="p in PRESETS"
            :key="p.label"
            type="button"
            class="rw-preset-pill"
            @click="emit('apply-preset', p)"
          >
            {{ p.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- Anti-Evasion Normalization Trace (Active when evasions detected) -->
    <div v-if="evaluation.transformations.length > 0" class="rw-anti-evasion-trace">
      <div class="rw-aet-icon" aria-hidden="true">⚡</div>
      <div class="rw-aet-content">
        <span class="rw-aet-title">Anti-Evasion Engine:</span>
        <code class="rw-aet-code">{{ evaluation.normalizedPath }}</code>
        <span class="rw-aet-tags">
          <span v-for="t in evaluation.transformations" :key="t" class="rw-aet-tag">
            {{ t.replace(/_/g, ' ') }}
          </span>
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rw-hero-strip {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 0.65rem 0.75rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.dark .rw-hero-strip {
  background: #0f1422;
  border-color: rgba(16, 185, 129, 0.2);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
}

/* Primary Request Bar */
.rw-request-bar {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  padding: 3px 5px;
  transition: all 0.2s ease;
}

.dark .rw-request-bar {
  background: #090c14;
  border-color: rgba(255, 255, 255, 0.08);
}

.rw-request-bar:focus-within {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 0 2px var(--vp-c-brand-soft);
}

/* Method Selector */
.rw-method-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  border-radius: 4px;
  padding: 0 6px;
  height: 28px;
  font-family: var(--vp-font-family-mono);
  font-weight: 700;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.rw-method-wrapper.method-get {
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
}
.dark .rw-method-wrapper.method-get {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
}

.rw-method-wrapper.method-post {
  background: rgba(245, 158, 11, 0.12);
  color: #d97706;
}
.dark .rw-method-wrapper.method-post {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
}

.rw-method-wrapper.method-put {
  background: rgba(14, 165, 233, 0.12);
  color: #0284c7;
}
.dark .rw-method-wrapper.method-put {
  background: rgba(14, 165, 233, 0.15);
  color: #38bdf8;
}

.rw-method-wrapper.method-delete {
  background: rgba(239, 68, 68, 0.12);
  color: #dc2626;
}
.dark .rw-method-wrapper.method-delete {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
}

.rw-method-wrapper.method-other {
  background: rgba(168, 85, 247, 0.12);
  color: #7c3aed;
}
.dark .rw-method-wrapper.method-other {
  background: rgba(168, 85, 247, 0.15);
  color: #c084fc;
}

.rw-method-select {
  appearance: none;
  background: transparent;
  border: none;
  outline: none;
  font-family: inherit;
  font-size: inherit;
  font-weight: inherit;
  color: inherit;
  cursor: pointer;
  padding-right: 12px;
}

.rw-method-arrow {
  position: absolute;
  right: 4px;
  font-size: 8px;
  pointer-events: none;
  opacity: 0.65;
}

/* Path Input Group */
.rw-path-input-group {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  gap: 0.35rem;
  padding: 0 4px;
}

.rw-prompt-symbol {
  color: var(--vp-c-brand-1);
  font-family: var(--vp-font-family-mono);
  font-weight: 700;
  font-size: 12px;
  user-select: none;
  opacity: 0.85;
}

.rw-path-input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  color: var(--vp-c-text-1);
  padding: 4px 0;
}

.rw-path-input::placeholder {
  color: var(--vp-c-text-3);
  opacity: 0.6;
}

.rw-btn-clear {
  background: transparent;
  border: none;
  color: var(--vp-c-text-3);
  font-size: 11px;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 3px;
  line-height: 1;
  transition: all 0.15s ease;
}
.rw-btn-clear:hover {
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-1);
}

/* Verdict Badge */
.rw-verdict-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-family: var(--vp-font-family-mono);
  font-size: 10.5px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 4px;
  letter-spacing: 0.5px;
  flex-shrink: 0;
  user-select: none;
  transition: all 0.2s ease;
}

.rw-verdict-dot {
  font-size: 8px;
}

.verdict-block {
  background: rgba(239, 68, 68, 0.12);
  color: #dc2626;
  border: 1px solid rgba(239, 68, 68, 0.3);
}
.dark .verdict-block {
  background: rgba(239, 68, 68, 0.18);
  color: #f87171;
  border-color: rgba(248, 113, 113, 0.35);
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.2);
}

.verdict-allow {
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
  border: 1px solid rgba(16, 185, 129, 0.3);
}
.dark .verdict-allow {
  background: rgba(16, 185, 129, 0.18);
  color: #34d399;
  border-color: rgba(52, 211, 153, 0.35);
  box-shadow: 0 0 10px rgba(16, 185, 129, 0.2);
}

.verdict-bypass {
  background: rgba(14, 165, 233, 0.12);
  color: #0284c7;
  border: 1px solid rgba(14, 165, 233, 0.3);
}
.dark .verdict-bypass {
  background: rgba(14, 165, 233, 0.18);
  color: #38bdf8;
  border-color: rgba(56, 189, 248, 0.35);
  box-shadow: 0 0 10px rgba(14, 165, 233, 0.2);
}

.verdict-pass {
  background: rgba(100, 116, 139, 0.12);
  color: #475569;
  border: 1px solid rgba(100, 116, 139, 0.25);
}
.dark .verdict-pass {
  background: rgba(100, 116, 139, 0.18);
  color: #94a3b8;
  border-color: rgba(148, 163, 184, 0.25);
}

/* Share Button */
.rw-btn-share {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  height: 28px;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-2);
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.rw-btn-share:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}

.rw-btn-share.copied {
  border-color: #059669;
  background: rgba(16, 185, 129, 0.15);
  color: #059669;
}
.dark .rw-btn-share.copied {
  border-color: #10b981;
  color: #34d399;
}

.rw-share-icon {
  font-size: 11px;
}

/* Secondary Context Bar */
.rw-context-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  font-size: 11px;
  flex-wrap: wrap;
}

.rw-net-inputs {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.rw-net-field {
  display: inline-flex;
  align-items: center;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  padding: 1px 5px;
  gap: 4px;
  transition: border-color 0.15s ease;
}

.rw-net-field:focus-within {
  border-color: var(--vp-c-brand-1);
}

.rw-net-label {
  font-family: var(--vp-font-family-mono);
  font-size: 9.5px;
  font-weight: 700;
  color: var(--vp-c-text-3);
  text-transform: uppercase;
}

.rw-net-input {
  border: none;
  outline: none;
  background: transparent;
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  color: var(--vp-c-text-1);
  width: 95px;
  padding: 2px 0;
}

.rw-presets-wrap {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.rw-presets-label {
  font-family: var(--vp-font-family-mono);
  font-size: 10.5px;
  font-weight: 600;
  color: var(--vp-c-text-3);
}

.rw-presets-list {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.rw-preset-pill {
  font-family: var(--vp-font-family-mono);
  font-size: 10.5px;
  padding: 1.5px 6px;
  border-radius: 4px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.12s ease;
}

.rw-preset-pill:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}

/* Anti-Evasion Trace */
.rw-anti-evasion-trace {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 4px 8px;
  border-radius: 4px;
  background: rgba(14, 165, 233, 0.08);
  border: 1px solid rgba(14, 165, 233, 0.25);
  font-size: 11px;
  font-family: var(--vp-font-family-mono);
}

.dark .rw-anti-evasion-trace {
  background: rgba(14, 165, 233, 0.12);
  border-color: rgba(56, 189, 248, 0.3);
}

.rw-aet-icon {
  color: #0284c7;
  font-size: 11px;
}
.dark .rw-aet-icon {
  color: #38bdf8;
}

.rw-aet-content {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
  min-width: 0;
}

.rw-aet-title {
  color: var(--vp-c-text-2);
  font-weight: 600;
  font-size: 10px;
  text-transform: uppercase;
}

.rw-aet-code {
  color: var(--vp-c-brand-1);
  font-weight: 600;
  font-size: 11px;
}

.rw-aet-tags {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.rw-aet-tag {
  background: rgba(14, 165, 233, 0.15);
  color: #0284c7;
  font-size: 9.5px;
  font-weight: 600;
  padding: 0.5px 5px;
  border-radius: 3px;
}
.dark .rw-aet-tag {
  background: rgba(56, 189, 248, 0.2);
  color: #38bdf8;
}

@media (max-width: 680px) {
  .rw-request-bar {
    flex-wrap: wrap;
  }
  .rw-path-input-group {
    order: 3;
    width: 100%;
    margin-top: 3px;
    border-top: 1px solid var(--vp-c-divider);
    padding-top: 4px;
  }
  .rw-net-input {
    width: 80px;
  }
}
</style>
