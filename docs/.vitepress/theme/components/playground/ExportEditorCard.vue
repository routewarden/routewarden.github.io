<script setup lang="ts">
import { computed } from 'vue'
import GatewaySelector from '../GatewaySelector.vue'
import CopyButton from '../CopyButton.vue'
import type { GatewayId, GatewayOption } from '../../composables/useGatewaySelection'

export interface FormatTab {
  id: string
  label: string
}

const props = defineProps<{
  gateways: GatewayOption[]
  gatewayTabs: FormatTab[]
  formatFilename: string
  highlightedSnippet: string
  rawSnippet: string
  isCaddyFormat: boolean
  isNginxFormat: boolean
  isTraefikFormat: boolean
  isDockerFormat: boolean
  isCliFormat: boolean
}>()

const selectedGateway = defineModel<GatewayId>('selectedGateway', { required: true })
const snippetFormat = defineModel<string>('snippetFormat', { required: true })

const lineCount = computed(() => {
  if (!props.rawSnippet) return 0
  return props.rawSnippet.trim().split('\n').length
})
</script>

<template>
  <div class="rw-editor-box">
    <!-- Header bar: format tabs + Gateway dropdown + Filename badge -->
    <div class="rw-editor-header">
      <div class="rw-editor-header-left">
        <span class="rw-editor-brand-tag">CONFIG SNIPPET</span>
        <!-- Underline-style format tabs for the active gateway -->
        <div class="rw-editor-tabs" role="tablist" aria-label="Export format">
          <button
            v-for="tab in gatewayTabs"
            :key="tab.id"
            role="tab"
            type="button"
            class="rw-editor-tab"
            :class="[
              `tab-${selectedGateway}`,
              { active: snippetFormat === tab.id }
            ]"
            :aria-selected="snippetFormat === tab.id"
            @click="snippetFormat = tab.id"
          >{{ tab.label }}</button>
        </div>
      </div>

      <div class="rw-editor-header-right">
        <!-- Gateway Selector Dropdown -->
        <GatewaySelector
          :gateways="gateways"
          v-model="selectedGateway"
        />

        <!-- Filename badge -->
        <span
          class="rw-filename-label"
          :class="{
            'fn-caddy': isCaddyFormat,
            'fn-nginx': isNginxFormat,
            'fn-traefik': isTraefikFormat,
            'fn-docker': isDockerFormat,
            'fn-cli': isCliFormat
          }"
        >
          <span class="rw-fn-dot">●</span>
          {{ formatFilename }}
        </span>
      </div>
    </div>

    <!-- Code panel with syntax highlighting -->
    <div class="rw-editor-body">
      <pre class="rw-export-pre" tabindex="0" title="Generated configuration snippet"><code v-html="highlightedSnippet"></code></pre>
    </div>

    <!-- Bottom Status Bar -->
    <div class="rw-editor-footer">
      <div class="rw-footer-left">
        <span class="rw-footer-badge">
          <span class="rw-footer-dot">●</span>
          <span>READY TO DEPLOY</span>
        </span>
        <span class="rw-footer-stats">{{ lineCount }} lines</span>
      </div>

      <div class="rw-footer-right">
        <CopyButton
          :code="rawSnippet"
          title="Copy generated configuration"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.rw-editor-box {
  background: var(--vp-c-bg-alt);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  height: 100%;
}

.dark .rw-editor-box {
  background: #090c14;
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.rw-editor-header {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  padding: 0 10px;
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
  gap: 8px;
  min-height: 34px;
  flex-wrap: wrap;
}

.dark .rw-editor-header {
  background: rgba(15, 23, 42, 0.7);
  border-bottom-color: rgba(255, 255, 255, 0.07);
}

.rw-editor-header-left {
  display: flex;
  align-items: stretch;
  gap: 8px;
  overflow-x: auto;
  min-width: 0;
  flex: 1;
  scrollbar-width: none;
}
.rw-editor-header-left::-webkit-scrollbar {
  display: none;
}

.rw-editor-brand-tag {
  font-family: var(--vp-font-family-mono);
  font-size: 8.5px;
  font-weight: 800;
  letter-spacing: 0.5px;
  padding: 1px 5px;
  border-radius: 3px;
  background: rgba(16, 185, 129, 0.15);
  color: var(--vp-c-brand-1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  margin-right: 4px;
  align-self: center;
  white-space: nowrap;
}

.rw-editor-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  padding: 4px 0;
  margin-left: auto;
}

/* Editor underline tabs */
.rw-editor-tabs {
  display: inline-flex;
  align-items: stretch;
  gap: 0;
  overflow-x: auto;
}

.rw-editor-tab {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 9px;
  height: 100%;
  min-height: 34px;
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-weight: 500;
  color: var(--vp-c-text-3);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease;
  white-space: nowrap;
}

.rw-editor-tab:hover {
  color: var(--vp-c-text-1);
  border-bottom-color: var(--vp-c-divider);
}

.dark .rw-editor-tab:hover {
  border-bottom-color: rgba(255, 255, 255, 0.15);
}

.rw-editor-tab.active {
  color: var(--vp-c-brand-1);
  font-weight: 600;
  border-bottom-color: var(--vp-c-brand-1);
}

.dark .rw-editor-tab.active {
  color: var(--vp-c-brand-1);
  border-bottom-color: var(--vp-c-brand-1);
  text-shadow: 0 0 10px rgba(16, 185, 129, 0.35);
}

/* Editor code body */
.rw-editor-body {
  overflow-x: auto;
  overflow-y: auto;
  background: transparent;
  flex: 1;
  min-height: 0;
}

.rw-export-pre {
  margin: 0 !important;
  padding: 10px 14px !important;
  background: transparent !important;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  line-height: 1.5;
  color: var(--vp-c-text-1);
  white-space: pre-wrap;
  word-break: break-word;
  user-select: text;
  cursor: text;
  outline: none;
}

/* Filename Label Gateway Differentiation */
.rw-filename-label {
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  transition: all 0.2s ease;
}

.rw-fn-dot {
  font-size: 7px;
}

.rw-filename-label.fn-caddy {
  background: rgba(16, 185, 129, 0.08);
  border-color: rgba(16, 185, 129, 0.3);
  color: #059669;
}
.rw-filename-label.fn-caddy .rw-fn-dot { color: #10b981; }
.dark .rw-filename-label.fn-caddy { color: #34d399; }

.rw-filename-label.fn-nginx {
  background: rgba(16, 185, 129, 0.08);
  border-color: rgba(5, 150, 105, 0.3);
  color: #047857;
}
.rw-filename-label.fn-nginx .rw-fn-dot { color: #059669; }
.dark .rw-filename-label.fn-nginx { color: #34d399; }

.rw-filename-label.fn-traefik {
  background: rgba(37, 99, 235, 0.08);
  border-color: rgba(37, 99, 235, 0.3);
  color: #2563eb;
}
.rw-filename-label.fn-traefik .rw-fn-dot { color: #3b82f6; }
.dark .rw-filename-label.fn-traefik { color: #38bdf8; }

.rw-filename-label.fn-docker {
  background: rgba(14, 165, 233, 0.08);
  border-color: rgba(14, 165, 233, 0.3);
  color: #0284c7;
}
.rw-filename-label.fn-docker .rw-fn-dot { color: #0ea5e9; }
.dark .rw-filename-label.fn-docker { color: #38bdf8; }

.rw-filename-label.fn-cli {
  background: rgba(245, 158, 11, 0.08);
  border-color: rgba(245, 158, 11, 0.3);
  color: #d97706;
}
.rw-filename-label.fn-cli .rw-fn-dot { color: #f59e0b; }
.dark .rw-filename-label.fn-cli { color: #fbbf24; }

/* Bottom Status Bar */
.rw-editor-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 10px;
  background: var(--vp-c-bg-soft);
  border-top: 1px solid var(--vp-c-divider);
  font-family: var(--vp-font-family-mono);
  font-size: 10.5px;
}

.rw-footer-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rw-footer-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 700;
  font-size: 9px;
  color: var(--vp-c-brand-1);
}

.rw-footer-dot {
  font-size: 7px;
}

.rw-footer-stats {
  color: var(--vp-c-text-3);
}

.rw-footer-right {
  display: flex;
  align-items: center;
}
</style>

<style>
/* Unscoped token rules for dynamically injected v-html elements */
.rw-export-pre .tok-comment { color: #94a3b8 !important; font-style: italic; }
.dark .rw-export-pre .tok-comment { color: #64748b !important; }
.rw-export-pre .tok-keyword { color: #7c3aed !important; font-weight: 600; }
.dark .rw-export-pre .tok-keyword { color: #c084fc !important; }
.rw-export-pre .tok-section { color: #6d28d9 !important; font-weight: 700; }
.dark .rw-export-pre .tok-section { color: #d8b4fe !important; }
.rw-export-pre .tok-key { color: #0284c7 !important; font-weight: 600; }
.dark .rw-export-pre .tok-key { color: #38bdf8 !important; }
.rw-export-pre .tok-str { color: #059669 !important; }
.dark .rw-export-pre .tok-str { color: #34d399 !important; }
.rw-export-pre .tok-num { color: #d97706 !important; font-weight: 600; }
.dark .rw-export-pre .tok-num { color: #fbbf24 !important; }
.rw-export-pre .tok-bool { color: #db2777 !important; font-weight: 600; }
.dark .rw-export-pre .tok-bool { color: #f472b6 !important; }
.rw-export-pre .tok-verb { color: #2563eb !important; font-weight: 700; }
.dark .rw-export-pre .tok-verb { color: #60a5fa !important; }
.rw-export-pre .tok-punct { color: var(--vp-c-text-3) !important; }
.rw-export-pre .tok-val { color: var(--vp-c-text-1) !important; }
</style>
