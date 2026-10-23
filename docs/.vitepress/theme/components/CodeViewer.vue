<script setup lang="ts">
import { ref, computed, useSlots } from 'vue'
import { useGatewaySelection, type GatewayId } from '../composables/useGatewaySelection'
import CopyButton from './CopyButton.vue'

export interface CodeViewerSnippet {
  filename: string
  lang?: string
  code: string
  html?: string
  /** If true, this file has diff markup and benefits from the diff toggle */
  hasDiff?: boolean
}

export type CodeViewerSnippets = Record<string, CodeViewerSnippet[] | CodeViewerSnippet>

const props = withDefaults(
  defineProps<{
    snippets?: CodeViewerSnippets
  }>(),
  {
    snippets: undefined
  }
)

const slots = useSlots()
const { activeGateway, activeTabIndex, gateways } = useGatewaySelection()

const headerRef = ref<HTMLElement | null>(null)
const bodyRef = ref<HTMLElement | null>(null)
const tabsMountRef = ref<HTMLElement | null>(null)

// Diff toggle — ON by default so diff highlights show
const showDiff = ref(true)

// Available gateway keys detected from either snippets prop or available slots
const availableGateways = computed(() => {
  const recognized = new Set<string>()

  if (props.snippets) {
    Object.keys(props.snippets).forEach(key => recognized.add(key))
  }

  // Also check named slots like #traefik, #caddy, #nginx, #cli, #tcp
  gateways.forEach(g => {
    if (slots[g.id]) {
      recognized.add(g.id)
    }
  })

  // Filter to keep canonical order of GATEWAYS
  const filtered = gateways.filter(g => recognized.has(g.id))
  return filtered.length > 0 ? filtered : gateways
})

// Whether this CodeViewer has multiple gateways to pick between
const hasMultipleGateways = computed(() => availableGateways.value.length > 1)

// If activeGateway is present among availableGateways, use it.
// Otherwise, auto-select the first available gateway for this code viewer so it never renders empty.
const effectiveGateway = computed<GatewayId>(() => {
  const list = availableGateways.value
  if (list.length === 0) return activeGateway.value
  const found = list.find(g => g.id === activeGateway.value)
  return found ? found.id : list[0].id
})

// Current snippet files for active gateway (if using snippets prop)
const currentFiles = computed<CodeViewerSnippet[]>(() => {
  if (!props.snippets) return []
  const entry = props.snippets[effectiveGateway.value] || props.snippets[Object.keys(props.snippets)[0]]
  if (!entry) return []
  return Array.isArray(entry) ? entry : [entry]
})

// Whether the active gateway has multiple files
const hasMultipleFiles = computed(() => currentFiles.value.length > 1)

// Local tab index for this specific code viewer
const activeFileIndex = ref(0)

// Guarded index to ensure we never point outside currentFiles
const safeFileIndex = computed(() => {
  if (currentFiles.value.length === 0) return 0
  return (activeFileIndex.value >= 0 && activeFileIndex.value < currentFiles.value.length)
    ? activeFileIndex.value
    : 0
})

const currentFile = computed<CodeViewerSnippet | null>(() => {
  if (currentFiles.value.length === 0) return null
  return currentFiles.value[safeFileIndex.value] || currentFiles.value[0]
})

// Whether any file in the current gateway has diff markup
const currentHasDiff = computed(() => {
  return currentFiles.value.some(f => f.hasDiff)
})

// Calculate line count for terminal status bar
const lineCount = computed(() => {
  if (currentFile.value?.code) {
    return currentFile.value.code.trim().split('\n').length
  }
  return 0
})

// Code string for Copy button (snippets or slot-extracted)
const codeToCopy = computed(() => {
  if (currentFile.value?.code) return currentFile.value.code
  if (bodyRef.value) {
    const codeEl = bodyRef.value.querySelector('pre code') || bodyRef.value.querySelector('pre')
    return codeEl ? codeEl.textContent || '' : ''
  }
  return ''
})

// When switching gateways via the selector in this CodeViewer, update page gateway
function handleGatewayChange(newGw: GatewayId) {
  activeFileIndex.value = 0
  activeGateway.value = newGw
}
</script>

<template>
  <div class="rw-code-viewer-container">
    <div class="rw-code-viewer-box">
      <!-- ── Streamlined Topbar Header ────────────────────────────────────── -->
      <div class="rw-code-viewer-header" ref="headerRef">
        <div class="rw-code-viewer-header-left">
          <!-- Case 1: Multiple Gateways -> Render Gateway Tabs as first-class tabs -->
          <div
            v-if="hasMultipleGateways"
            class="rw-tab-bar"
            role="tablist"
            aria-label="Gateway configurations"
          >
            <button
              v-for="gw in availableGateways"
              :key="gw.id"
              role="tab"
              type="button"
              class="rw-tab"
              :class="{ active: effectiveGateway === gw.id }"
              :aria-selected="effectiveGateway === gw.id"
              @click="handleGatewayChange(gw.id)"
            >
              {{ gw.label }}
            </button>
          </div>

          <!-- Case 2: Single Gateway with Multiple Files -> Render File Tabs -->
          <div
            v-else-if="hasMultipleFiles"
            class="rw-tab-bar"
            role="tablist"
            aria-label="Configuration files"
          >
            <button
              v-for="(file, idx) in currentFiles"
              :key="file.filename"
              role="tab"
              type="button"
              class="rw-tab"
              :class="{ active: safeFileIndex === idx }"
              :aria-selected="safeFileIndex === idx"
              @click="activeFileIndex = idx"
            >
              {{ file.filename }}
            </button>
          </div>

          <!-- Case 3: Single Gateway with Single File -> Clean File Title -->
          <div v-else-if="currentFile" class="rw-single-file-title">
            <span class="rw-filename">{{ currentFile.filename }}</span>
            <span v-if="currentFile.lang" class="rw-lang-pill">{{ currentFile.lang }}</span>
          </div>

          <!-- Fallback: Slot-based or Markdown code-group mount point -->
          <div v-else class="rw-single-file-title">
            <span class="rw-filename">Config</span>
          </div>

          <!-- Mount point for lifted inner markdown tabs -->
          <div class="rw-slot-tabs-mount" ref="tabsMountRef"></div>

          <!-- Fallback: header-left slot -->
          <slot name="header-left" />
        </div>

        <div class="rw-code-viewer-header-right">
          <!-- Diff toggle — sleek minimal button -->
          <button
            v-if="currentHasDiff"
            type="button"
            class="rw-diff-btn"
            :class="{ active: showDiff }"
            title="Toggle diff highlighting"
            @click="showDiff = !showDiff"
          >
            <span class="rw-diff-dot">●</span>
            <span>Diff</span>
          </button>

          <!-- Copy Button -->
          <CopyButton
            v-if="codeToCopy"
            :code="codeToCopy"
          />
        </div>
      </div>

      <!-- ── Secondary Sub-file Bar (Only when Multi-Gateway AND Multi-File) ─ -->
      <div v-if="hasMultipleGateways && hasMultipleFiles" class="rw-subfile-bar">
        <span class="rw-subfile-label">File:</span>
        <div class="rw-subfile-pills">
          <button
            v-for="(file, idx) in currentFiles"
            :key="file.filename"
            type="button"
            class="rw-subfile-pill"
            :class="{ active: safeFileIndex === idx }"
            @click="activeFileIndex = idx"
          >
            {{ file.filename }}
          </button>
        </div>
      </div>

      <!-- ── Code Block Content ───────────────────────────────────────────── -->
      <div class="rw-code-viewer-body" :class="{ 'rw-hide-diff': !showDiff }" ref="bodyRef">
        <!-- If snippets prop is passed with pre-rendered HTML -->
        <div
          v-if="currentFile && currentFile.html"
          class="rw-snippet-html"
          v-html="currentFile.html"
        ></div>

        <pre v-else-if="currentFile" class="rw-raw-pre"><code>{{ currentFile.code }}</code></pre>

        <!-- Or if slot-based content is passed (markdown code blocks) -->
        <div v-else class="rw-slot-body">
          <div v-if="effectiveGateway === 'traefik' && slots.traefik">
            <slot name="traefik" />
          </div>
          <div v-else-if="effectiveGateway === 'caddy' && slots.caddy">
            <slot name="caddy" />
          </div>
          <div v-else-if="effectiveGateway === 'nginx' && slots.nginx">
            <slot name="nginx" />
          </div>
          <div v-else-if="effectiveGateway === 'tcp' && slots.tcp">
            <slot name="tcp" />
          </div>
          <div v-else-if="effectiveGateway === 'cli' && slots.cli">
            <slot name="cli" />
          </div>
          <div v-else>
            <slot />
          </div>
        </div>
      </div>

      <!-- ── Terminal Telemetry Status Bar (Footer) ───────────────────────── -->
      <div class="rw-code-viewer-footer">
        <div class="rw-footer-left">
          <span class="rw-footer-dot">●</span>
          <span class="rw-footer-mode">READONLY</span>
          <span class="rw-footer-sep">│</span>
          <span class="rw-footer-encoding">UTF-8</span>
          <span v-if="currentFile?.lang" class="rw-footer-lang-item">
            <span class="rw-footer-sep">│</span>
            <span class="rw-footer-lang">{{ currentFile.lang.toUpperCase() }}</span>
          </span>
        </div>
        <div class="rw-footer-right">
          <span v-if="lineCount > 0" class="rw-footer-lines">{{ lineCount }} LINES</span>
          <span v-if="lineCount > 0" class="rw-footer-sep">│</span>
          <span class="rw-footer-engine">ROUTEWARDEN-CORE</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rw-code-viewer-container {
  margin: 1.5rem 0;
  font-family: var(--vp-font-family-mono);
}

.rw-code-viewer-box {
  background: var(--vp-c-bg-alt);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.dark .rw-code-viewer-box {
  background: #080b11;
  border-color: rgba(16, 185, 129, 0.22);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(16, 185, 129, 0.02);
}

.dark .rw-code-viewer-box:hover {
  border-color: rgba(16, 185, 129, 0.35);
}

/* ── Topbar Header Bar ──────────────────────────────────────── */
.rw-code-viewer-header {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  padding: 0 10px;
  background: #f1f5f9;
  border-bottom: 1px solid var(--vp-c-divider);
  gap: 12px;
  min-height: 38px;
}

.dark .rw-code-viewer-header {
  background: #0d121c;
  border-bottom-color: rgba(148, 163, 184, 0.16);
}

.rw-code-viewer-header-left {
  display: flex;
  align-items: stretch;
  gap: 0;
  overflow-x: auto;
  max-width: 100%;
  flex: 1;
  min-width: 0;
  scrollbar-width: none;
}

.rw-code-viewer-header-left::-webkit-scrollbar {
  display: none;
}

/* Tab Bar Navigation */
.rw-tab-bar {
  display: inline-flex;
  align-items: stretch;
  gap: 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.rw-tab-bar::-webkit-scrollbar {
  display: none;
}

/* Individual Tab */
.rw-tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 14px;
  height: 100%;
  min-height: 38px;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  font-weight: 500;
  color: var(--vp-c-text-2);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
  letter-spacing: 0.02em;
}

.rw-tab:hover {
  color: var(--vp-c-text-1);
  background: rgba(255, 255, 255, 0.03);
  border-bottom-color: var(--vp-c-divider);
}

.dark .rw-tab:hover {
  background: rgba(34, 211, 238, 0.04);
  border-bottom-color: rgba(34, 211, 238, 0.25);
}

/* Active Tab */
.rw-tab.active {
  color: var(--vp-c-brand-1) !important;
  font-weight: 700 !important;
  border-bottom-color: var(--vp-c-brand-1) !important;
  background: rgba(16, 185, 129, 0.06) !important;
}

.dark .rw-tab.active {
  color: var(--vp-c-brand-1) !important;
  border-bottom-color: var(--vp-c-brand-1) !important;
  background: #090e17 !important;
  text-shadow: 0 0 10px rgba(16, 185, 129, 0.35);
}

/* Single File Title (when no tabs needed) */
.rw-single-file-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 8px;
  height: 100%;
  min-height: 38px;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  user-select: none;
}

.rw-filename {
  letter-spacing: 0.02em;
  color: var(--vp-c-text-1);
}

.rw-lang-pill {
  font-size: 9.5px;
  font-weight: 700;
  color: var(--rw-c-cyan);
  background: rgba(34, 211, 238, 0.08);
  border: 1px solid rgba(34, 211, 238, 0.25);
  padding: 1px 5px;
  border-radius: 2px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

/* Header Right Actions */
.rw-code-viewer-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  padding: 0;
}

/* Diff Toggle Button */
.rw-diff-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 3px;
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  cursor: pointer;
  user-select: none;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-3);
  transition: all 0.15s ease;
  line-height: 1.4;
}

.dark .rw-diff-btn {
  background: #0d121c;
  border-color: rgba(148, 163, 184, 0.2);
}

.rw-diff-dot {
  font-size: 8px;
  line-height: 1;
  color: var(--vp-c-text-3);
  transition: color 0.15s ease;
}

.rw-diff-btn:hover {
  border-color: var(--rw-c-cyan);
  color: var(--rw-c-cyan);
}

.rw-diff-btn.active {
  color: var(--vp-c-brand-1);
  border-color: rgba(16, 185, 129, 0.35);
  background: rgba(16, 185, 129, 0.08);
}

.rw-diff-btn.active .rw-diff-dot {
  color: var(--vp-c-brand-1);
  text-shadow: 0 0 6px var(--vp-c-brand-1);
}

.dark .rw-diff-btn.active {
  background: rgba(16, 185, 129, 0.12);
  border-color: var(--vp-c-brand-1);
}

/* ── Secondary Sub-file Bar ─────────────────────────────────── */
.rw-subfile-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  background: rgba(0, 0, 0, 0.02);
  border-bottom: 1px solid var(--vp-c-divider);
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
}

.dark .rw-subfile-bar {
  background: #0a0e16;
  border-bottom-color: rgba(148, 163, 184, 0.1);
}

.rw-subfile-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
}

.rw-subfile-pills {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  overflow-x: auto;
}

.rw-subfile-pill {
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 3px;
  background: transparent;
  border: 1px solid transparent;
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.rw-subfile-pill:hover {
  color: var(--vp-c-text-1);
  background: rgba(255, 255, 255, 0.04);
}

.rw-subfile-pill.active {
  color: var(--vp-c-brand-1);
  font-weight: 600;
  background: rgba(16, 185, 129, 0.1);
  border-color: rgba(16, 185, 129, 0.3);
}

/* ── Code Body Area ─────────────────────────────────────────── */
.rw-code-viewer-body {
  min-width: 0;
  background: #ffffff;
}

.dark .rw-code-viewer-body {
  background: #080b11;
}

.rw-raw-pre {
  margin: 0 !important;
  padding: 14px 18px !important;
  background: transparent !important;
  font-family: var(--vp-font-family-mono);
  font-size: 12.5px !important;
  line-height: 1.55 !important;
  overflow-x: auto;
}

/* Snippet HTML rendering */
.rw-snippet-html {
  min-width: 0;
}

/* Reset all inner markdown blocks & code-groups inside CodeViewer */
.rw-code-viewer-container :deep(.rw-slot-body div[class*='language-']),
.rw-code-viewer-container :deep(.rw-slot-body .vp-code-group),
.rw-code-viewer-container :deep(.rw-slot-body .vp-code-group div[class*='language-']) {
  margin: 0 !important;
  border: none !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  padding-top: 0 !important;
  background: transparent !important;
}

.rw-code-viewer-container :deep(.rw-slot-body div[class*='language-']::before),
.rw-code-viewer-container :deep(.rw-slot-body div[class*='language-']::after),
.rw-code-viewer-container :deep(.rw-slot-body .vp-code-group div[class*='language-']::before),
.rw-code-viewer-container :deep(.rw-slot-body .vp-code-group div[class*='language-']::after) {
  display: none !important;
}

.rw-code-viewer-container :deep(.rw-slot-body div[class*='language-'] .lang) {
  display: none !important;
}

/* Hide duplicate copy button from the inner code block */
.rw-code-viewer-container :deep(.rw-slot-body div[class*='language-'] .copy) {
  display: none !important;
}

/* Hide duplicate gateway select inside inner code-groups */
.rw-code-viewer-container :deep(.rw-slot-body .rw-group-gateway-wrapper) {
  display: none !important;
}

/* Snippet HTML — pre block styling */
.rw-code-viewer-container :deep(.rw-snippet-html pre) {
  margin: 0 !important;
  padding: 14px 0 !important;
  background: transparent !important;
  font-family: var(--vp-font-family-mono);
  font-size: 12.5px !important;
  overflow-x: auto;
}

/* Collapse whitespace text-nodes and allow code to expand to full content width */
.rw-code-viewer-container :deep(.rw-snippet-html pre code),
.rw-code-viewer-container :deep(.rw-raw-pre code),
.rw-code-viewer-container :deep(pre code),
.rw-code-viewer-container :deep(code) {
  display: block;
  width: fit-content;
  min-width: 100%;
  box-sizing: border-box;
  line-height: 0;
  background: transparent !important;
  background-color: transparent !important;
  border-radius: 0 !important;
  padding: 0 !important;
}

/* Each line span restores its own line-height and spans full width of code */
.rw-code-viewer-container :deep(.rw-snippet-html .line) {
  display: block;
  width: 100%;
  box-sizing: border-box;
  padding: 0 18px;
  line-height: 1.55;
  font-family: var(--vp-font-family-mono);
}

/* Empty lines get a compact gap */
.rw-code-viewer-container :deep(.rw-snippet-html .line:empty) {
  height: 0.75em;
}

.rw-code-viewer-container :deep(.rw-snippet-html pre.has-diff .line),
.rw-code-viewer-container :deep(.rw-snippet-html pre:has(.line.diff) .line) {
  padding: 0 18px 0 28px;
}

/* Added lines (diff +) */
.rw-code-viewer-container :deep(.rw-snippet-html .line.diff.add) {
  background: rgba(16, 185, 129, 0.1);
  border-left: 3px solid #10b981;
  padding: 0 18px 0 25px;
  position: relative;
}

.rw-code-viewer-container :deep(.rw-snippet-html .line.diff.add::before) {
  content: '+';
  position: absolute;
  left: 8px;
  top: 0;
  font-size: 11.5px;
  font-weight: 800;
  color: #10b981;
  line-height: inherit;
  user-select: none;
  pointer-events: none;
}

.dark .rw-code-viewer-container :deep(.rw-snippet-html .line.diff.add) {
  background: rgba(16, 185, 129, 0.13);
  border-left-color: #10b981;
}

.dark .rw-code-viewer-container :deep(.rw-snippet-html .line.diff.add::before) {
  color: #10b981;
  text-shadow: 0 0 6px rgba(16, 185, 129, 0.6);
}

/* Removed lines (diff -) */
.rw-code-viewer-container :deep(.rw-snippet-html .line.diff.remove) {
  background: rgba(244, 63, 94, 0.08);
  border-left: 3px solid #f43f5e;
  padding: 0 18px 0 25px;
  position: relative;
  opacity: 0.75;
}

.rw-code-viewer-container :deep(.rw-snippet-html .line.diff.remove::before) {
  content: '-';
  position: absolute;
  left: 8px;
  top: 0;
  font-size: 11.5px;
  font-weight: 800;
  color: #f43f5e;
  line-height: inherit;
  user-select: none;
  pointer-events: none;
}

.dark .rw-code-viewer-container :deep(.rw-snippet-html .line.diff.remove) {
  background: rgba(244, 63, 94, 0.12);
  border-left-color: #f43f5e;
}

.dark .rw-code-viewer-container :deep(.rw-snippet-html .line.diff.remove::before) {
  color: #f43f5e;
  text-shadow: 0 0 6px rgba(244, 63, 94, 0.5);
}

/* Diff hidden state */
.rw-hide-diff :deep(.rw-snippet-html pre.has-diff .line),
.rw-hide-diff :deep(.rw-snippet-html pre:has(.line.diff) .line),
.dark .rw-hide-diff :deep(.rw-snippet-html pre.has-diff .line),
.dark .rw-hide-diff :deep(.rw-snippet-html pre:has(.line.diff) .line) {
  padding-left: 18px !important;
}

.rw-hide-diff :deep(.line.diff.add),
.rw-hide-diff :deep(.line.diff.remove),
.dark .rw-hide-diff :deep(.line.diff.add),
.dark .rw-hide-diff :deep(.line.diff.remove) {
  background: transparent !important;
  border-left: none !important;
  border-left-color: transparent !important;
  padding-left: 18px !important;
  opacity: 1 !important;
}

.rw-hide-diff :deep(.line.diff.add::before),
.rw-hide-diff :deep(.line.diff.remove::before),
.dark .rw-hide-diff :deep(.line.diff.add::before),
.dark .rw-hide-diff :deep(.line.diff.remove::before) {
  display: none !important;
  content: none !important;
}

/* ── Terminal Telemetry Status Bar (Footer) ─────────────────── */
.rw-code-viewer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 12px;
  background: #f8fafc;
  border-top: 1px solid var(--vp-c-divider);
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--vp-c-text-3);
  user-select: none;
}

.dark .rw-code-viewer-footer {
  background: #06090e;
  border-top-color: rgba(148, 163, 184, 0.12);
  color: #64748b;
}

.rw-footer-left,
.rw-footer-right {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.rw-footer-dot {
  color: var(--vp-c-brand-1);
  font-size: 7px;
  text-shadow: 0 0 4px var(--vp-c-brand-1);
}

.rw-footer-mode {
  color: var(--vp-c-text-2);
}

.rw-footer-sep {
  color: var(--vp-c-divider);
  font-weight: 400;
}

.dark .rw-footer-sep {
  color: rgba(255, 255, 255, 0.1);
}

.rw-footer-encoding {
  color: var(--vp-c-text-3);
}

.rw-footer-lang {
  color: var(--rw-c-cyan);
  font-weight: 700;
}

.rw-footer-lines {
  color: var(--vp-c-text-2);
}

.rw-footer-engine {
  color: var(--vp-c-text-3);
  letter-spacing: 0.08em;
}

/* ── Mobile Responsive Adjustments ─────────────────────────── */
@media (max-width: 640px) {
  .rw-code-viewer-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    padding: 6px 10px;
  }
  .rw-code-viewer-header-left {
    width: 100%;
  }
  .rw-code-viewer-header-right {
    width: 100%;
    justify-content: flex-end;
  }
  .rw-code-viewer-footer {
    font-size: 9px;
    padding: 3px 8px;
  }
  .rw-footer-engine {
    display: none;
  }
}
</style>

<!-- Unscoped: token styles for v-html snippet content -->
<style>
.rw-snippet-html pre { tab-size: 2; }
.rw-code-viewer-container code,
.rw-code-viewer-container pre code,
.rw-snippet-html code,
.rw-snippet-html pre code,
.rw-raw-pre code {
  background: transparent !important;
  background-color: transparent !important;
  border-radius: 0 !important;
  padding: 0 !important;
}
.vp-doc .custom-block .rw-code-viewer-container code,
.vp-doc .custom-block .rw-code-viewer-container pre code {
  color: inherit !important;
}
.rw-snippet-html .tok-comment { color: #94a3b8; font-style: italic; }
.dark .rw-snippet-html .tok-comment { color: #64748b; }
.rw-snippet-html .tok-keyword { color: #7c3aed; font-weight: 600; }
.dark .rw-snippet-html .tok-keyword { color: #c084fc; }
.rw-snippet-html .tok-section { color: #6d28d9; font-weight: 700; }
.dark .rw-snippet-html .tok-section { color: #d8b4fe; }
.rw-snippet-html .tok-key { color: #0284c7; font-weight: 600; }
.dark .rw-snippet-html .tok-key { color: #38bdf8; }
.rw-snippet-html .tok-str { color: #059669; }
.dark .rw-snippet-html .tok-str { color: #34d399; }
.rw-snippet-html .tok-num { color: #d97706; font-weight: 600; }
.dark .rw-snippet-html .tok-num { color: #fbbf24; }
.rw-snippet-html .tok-bool { color: #db2777; font-weight: 600; }
.dark .rw-snippet-html .tok-bool { color: #f472b6; }
.rw-snippet-html .tok-verb { color: #2563eb; font-weight: 700; }
.dark .rw-snippet-html .tok-verb { color: #60a5fa; }
.rw-snippet-html .tok-punct { color: var(--vp-c-text-3); }
.rw-snippet-html .tok-val { color: var(--vp-c-text-1); }
</style>
