<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  title: string
  theme: 'block' | 'allow'
  patterns: string[]
  placeholder: string
  isRegexDisabled: boolean
  regexGenerated: boolean
  patternMatchesTest: (pattern: string) => boolean
}>()

const emit = defineEmits<{
  (e: 'add'): void
  (e: 'remove', index: number): void
  (e: 'generate-regex'): void
}>()

const newPatternInput = defineModel<string>('newPatternInput', { required: true })

const isBlock = computed(() => props.theme === 'block')
</script>

<template>
  <div
    class="rw-pattern-panel"
    :class="isBlock ? 'panel-block' : 'panel-allow'"
  >
    <!-- Header: Title + Config Key + Counter -->
    <div class="rw-panel-header">
      <div class="rw-header-left">
        <span class="rw-header-icon" aria-hidden="true">{{ isBlock ? '🚫' : '🛡️' }}</span>
        <span class="rw-header-title">
          {{ isBlock ? 'Blocklist Rules' : 'Allowlist Rules' }}
        </span>
        <code class="rw-config-key">{{ isBlock ? 'blockPatterns' : 'allowPatterns' }}</code>
      </div>

      <div class="rw-header-right">
        <span
          class="rw-rule-counter"
          :class="patterns.length > 0 ? (isBlock ? 'counter-red' : 'counter-green') : 'counter-empty'"
        >
          {{ patterns.length }} {{ patterns.length === 1 ? 'rule' : 'rules' }}
        </span>
      </div>
    </div>

    <!-- Inline Add Bar -->
    <form
      class="rw-add-form"
      @submit.prevent="emit('add')"
    >
      <div class="rw-add-input-wrap">
        <input
          v-model="newPatternInput"
          :placeholder="placeholder"
          class="rw-pattern-input"
          autocomplete="off"
          spellcheck="false"
          :aria-label="isBlock ? 'New block pattern' : 'New allow pattern'"
        />
        <button
          type="button"
          class="rw-btn-re2"
          :class="[
            { active: regexGenerated },
            isBlock ? 're2-red' : 're2-green'
          ]"
          :disabled="isRegexDisabled"
          :title="newPatternInput.trim() ? 'Compile pattern to RE2 regex' : 'Compile regex from the current test URL path'"
          @click="emit('generate-regex')"
        >
          <span class="rw-re2-icon">{{ regexGenerated ? '✓' : '⚡' }}</span>
          <span>{{ regexGenerated ? 'Compiled' : (newPatternInput.trim() ? 'To RE2' : 'From URL') }}</span>
        </button>
      </div>

      <button
        type="submit"
        class="rw-btn-add"
        :class="isBlock ? 'btn-add-block' : 'btn-add-allow'"
        :disabled="!newPatternInput.trim()"
      >
        + Add
      </button>
    </form>

    <!-- Pattern Chips List -->
    <div v-if="patterns.length > 0" class="rw-chips-grid">
      <div
        v-for="(p, i) in patterns"
        :key="i"
        class="rw-rule-chip"
        :class="[
          isBlock ? 'chip-block' : 'chip-allow',
          { 'is-matched': patternMatchesTest(p) }
        ]"
        :title="patternMatchesTest(p) ? 'Matches the current test URL!' : ''"
      >
        <span
          v-if="patternMatchesTest(p)"
          class="rw-matched-indicator"
          :class="{ green: !isBlock }"
        >
          ● MATCHED
        </span>
        <code class="rw-chip-text">{{ p }}</code>
        <button
          type="button"
          class="rw-btn-del-chip"
          title="Remove rule"
          @click="emit('remove', i)"
        >✕</button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="rw-empty-notice">
      <span class="rw-en-icon">ℹ</span>
      <span>
        {{ isBlock
          ? 'No custom block rules. Built-in sensitive files (.env, .git, *.sql) are active.'
          : 'No allowlist overrides. Requests pass through to standard blocklist inspection.'
        }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.rw-pattern-panel {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 0.65rem 0.75rem;
  transition: all 0.2s ease;
  min-width: 0;
}

.panel-block {
  border-color: rgba(239, 68, 68, 0.25);
  background: rgba(239, 68, 68, 0.02);
}
.dark .panel-block {
  border-color: rgba(239, 68, 68, 0.25);
  background: rgba(239, 68, 68, 0.04);
}

.panel-allow {
  border-color: rgba(16, 185, 129, 0.25);
  background: rgba(16, 185, 129, 0.02);
}
.dark .panel-allow {
  border-color: rgba(16, 185, 129, 0.25);
  background: rgba(16, 185, 129, 0.04);
}

/* Header */
.rw-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.rw-header-left {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
}

.rw-header-icon {
  font-size: 12px;
}

.rw-header-title {
  font-family: var(--vp-font-family-mono);
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.3px;
}
.panel-block .rw-header-title { color: #dc2626; }
.dark .panel-block .rw-header-title { color: #f87171; }
.panel-allow .rw-header-title { color: #059669; }
.dark .panel-allow .rw-header-title { color: #34d399; }

.rw-config-key {
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  color: var(--vp-c-text-3);
  background: var(--vp-c-bg);
  padding: 1px 4px;
  border-radius: 3px;
  border: 1px solid var(--vp-c-divider);
}

.rw-rule-counter {
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 10px;
}
.counter-red {
  background: rgba(239, 68, 68, 0.12);
  color: #dc2626;
}
.dark .counter-red {
  color: #f87171;
}
.counter-green {
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
}
.dark .counter-green {
  color: #34d399;
}
.counter-empty {
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-3);
}

/* Inline Add Form */
.rw-add-form {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.rw-add-input-wrap {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  padding: 2px 4px;
  transition: all 0.15s ease;
}

.panel-block .rw-add-input-wrap:focus-within {
  border-color: #ef4444;
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.12);
}
.panel-allow .rw-add-input-wrap:focus-within {
  border-color: #10b981;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.12);
}

.rw-pattern-input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-family: var(--vp-font-family-mono);
  font-size: 11.5px;
  color: var(--vp-c-text-1);
  padding: 3px 4px;
}
.rw-pattern-input::placeholder {
  color: var(--vp-c-text-3);
  opacity: 0.6;
}

.rw-btn-re2 {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 3px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-2);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}
.rw-btn-re2:hover:not(:disabled) {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}
.rw-btn-re2.active {
  background: rgba(16, 185, 129, 0.15);
  border-color: #10b981;
  color: #10b981;
}
.rw-btn-re2:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.rw-btn-add {
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 4px;
  border: none;
  color: #fff;
  cursor: pointer;
  white-space: nowrap;
  transition: filter 0.15s ease, opacity 0.15s ease;
}

.btn-add-block {
  background: #dc2626;
}
.dark .btn-add-block {
  background: #ef4444;
}
.btn-add-block:hover:not(:disabled) {
  filter: brightness(1.1);
}

.btn-add-allow {
  background: #059669;
}
.dark .btn-add-allow {
  background: #10b981;
}
.btn-add-allow:hover:not(:disabled) {
  filter: brightness(1.1);
}

.rw-btn-add:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* Pattern Chips Grid */
.rw-chips-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.15rem;
}

.rw-rule-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 7px;
  border-radius: 4px;
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  transition: all 0.15s ease;
  max-width: 100%;
}

.chip-block {
  border-color: rgba(239, 68, 68, 0.25);
  color: #dc2626;
}
.dark .chip-block {
  color: #f87171;
}

.chip-block.is-matched {
  background: rgba(239, 68, 68, 0.15);
  border-color: #ef4444;
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.3);
}

.chip-allow {
  border-color: rgba(16, 185, 129, 0.25);
  color: #059669;
}
.dark .chip-allow {
  color: #34d399;
}

.chip-allow.is-matched {
  background: rgba(16, 185, 129, 0.15);
  border-color: #10b981;
  box-shadow: 0 0 10px rgba(16, 185, 129, 0.3);
}

.rw-matched-indicator {
  font-size: 8.5px;
  font-weight: 800;
  letter-spacing: 0.5px;
  padding: 0 3px;
  border-radius: 2px;
  background: rgba(239, 68, 68, 0.25);
  color: #dc2626;
}
.dark .rw-matched-indicator {
  color: #fca5a5;
}
.rw-matched-indicator.green {
  background: rgba(16, 185, 129, 0.25);
  color: #059669;
}
.dark .rw-matched-indicator.green {
  color: #6ee7b7;
}

.rw-chip-text {
  font-size: 11px;
  font-family: inherit;
  word-break: break-all;
}

.rw-btn-del-chip {
  background: transparent;
  border: none;
  color: var(--vp-c-text-3);
  font-size: 10px;
  cursor: pointer;
  padding: 0 2px;
  line-height: 1;
  transition: color 0.15s ease;
}
.rw-btn-del-chip:hover {
  color: var(--vp-c-text-1);
}

/* Empty Notice */
.rw-empty-notice {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-family: var(--vp-font-family-mono);
  font-size: 10.5px;
  color: var(--vp-c-text-3);
  padding: 4px 6px;
  background: var(--vp-c-bg);
  border-radius: 4px;
  border: 1px dashed var(--vp-c-divider);
}

.rw-en-icon {
  font-size: 10px;
  color: var(--vp-c-brand-1);
}
</style>
