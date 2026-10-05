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
    class="rw-block rw-pattern-col"
    :class="isBlock ? 'rw-pattern-block-col' : 'rw-pattern-allow-col'"
  >
    <div class="rw-row-header">
      <div class="rw-header-title-group">
        <span
          class="rw-title"
          :class="isBlock ? 'rw-title-block' : 'rw-title-allow'"
        >
          {{ isBlock ? 'Block Patterns' : 'Allow Patterns' }}
          (<code>{{ isBlock ? 'blockPatterns' : 'allowPatterns' }}</code>)
        </span>
        <span
          v-if="patterns.length"
          class="rw-count"
          :class="isBlock ? 'red' : 'green'"
        >
          {{ patterns.length }}
        </span>
      </div>
    </div>

    <!-- Clean Input with Regex / From URL & Add -->
    <form
      class="rw-inline-add"
      :class="isBlock ? 'rw-inline-add-block' : 'rw-inline-add-allow'"
      @submit.prevent="emit('add')"
    >
      <input
        v-model="newPatternInput"
        :placeholder="placeholder"
        autocomplete="off"
        spellcheck="false"
      />
      <button
        type="button"
        class="rw-btn-regex-act"
        :class="[
          { active: regexGenerated },
          isBlock ? '' : 'green'
        ]"
        :disabled="isRegexDisabled"
        :title="newPatternInput.trim() ? 'Convert pattern to RE2 regex' : 'Generate regex from URL input above'"
        @click="emit('generate-regex')"
      >
        {{ regexGenerated ? 'Regex' : (newPatternInput.trim() ? 'To Regex' : 'From URL') }}
      </button>
      <button
        type="submit"
        :class="isBlock ? 'rw-btn-add-block' : 'rw-btn-add-allow'"
        :disabled="!newPatternInput.trim()"
      >
        + Add
      </button>
    </form>

    <!-- Active Pattern Chips with Interactive Match Highlighting -->
    <div v-if="patterns.length > 0" class="rw-chips">
      <span
        v-for="(p, i) in patterns"
        :key="i"
        class="rw-chip"
        :class="[
          isBlock ? 'red' : 'green',
          isBlock ? { 'chip-matched': patternMatchesTest(p) } : { 'chip-matched-green': patternMatchesTest(p) }
        ]"
        :title="patternMatchesTest(p) ? 'Matches the current test URL above!' : ''"
      >
        <span
          v-if="patternMatchesTest(p)"
          class="rw-match-dot"
          :class="{ green: !isBlock }"
        >●</span>
        <code>{{ p }}</code>
        <button type="button" title="Remove pattern" @click="emit('remove', i)">✕</button>
      </span>
    </div>
  </div>
</template>

<style scoped>
.rw-block {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  padding: 0.75rem 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.rw-pattern-col {
  height: 100%;
  min-width: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  transition: all 0.2s ease;
  overflow: hidden;
}

.rw-row-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.rw-header-title-group {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.rw-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.rw-count {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 10px;
}
.rw-count.red { background: rgba(239,68,68,0.12); color: #dc2626; }
.dark .rw-count.red { color: #f87171; }
.rw-count.green { background: rgba(16,185,129,0.12); color: #059669; }
.dark .rw-count.green { color: #34d399; }

/* Block column styles */
.rw-pattern-block-col {
  border-color: rgba(239, 68, 68, 0.32) !important;
  background: rgba(239, 68, 68, 0.02) !important;
}
.dark .rw-pattern-block-col {
  border-color: rgba(248, 113, 113, 0.32) !important;
  background: rgba(239, 68, 68, 0.05) !important;
}

.rw-title-block {
  color: #dc2626 !important;
  font-weight: 700;
}
.dark .rw-title-block {
  color: #f87171 !important;
}

/* Allow column styles */
.rw-pattern-allow-col {
  border-color: rgba(16, 185, 129, 0.32) !important;
  background: rgba(16, 185, 129, 0.02) !important;
}
.dark .rw-pattern-allow-col {
  border-color: rgba(52, 211, 153, 0.32) !important;
  background: rgba(16, 185, 129, 0.05) !important;
}

.rw-title-allow {
  color: #059669 !important;
  font-weight: 700;
}
.dark .rw-title-allow {
  color: #34d399 !important;
}

.rw-inline-add {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}
.rw-inline-add input {
  flex: 1;
  min-width: 0;
  padding: 4px 7px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-family: var(--vp-font-family-mono);
  font-size: 11.5px;
  outline: none;
  transition: all 0.15s ease;
}

.rw-inline-add-block input:focus {
  border-color: #ef4444 !important;
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.15);
}
.rw-inline-add-allow input:focus {
  border-color: #10b981 !important;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.15);
}

.rw-btn-regex-act {
  font-size: 10px;
  font-weight: 600;
  padding: 4px 7px;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}
.rw-btn-regex-act:hover:not(:disabled) {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}
.rw-btn-regex-act.active {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}
.rw-btn-regex-act:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.rw-btn-add-block, .rw-btn-add-allow {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 9px;
  border-radius: 4px;
  border: none;
  color: #fff;
  cursor: pointer;
  white-space: nowrap;
  transition: filter 0.15s ease;
}
.rw-btn-add-block {
  background: #dc2626 !important;
}
.rw-btn-add-block:hover:not(:disabled) {
  filter: brightness(1.1);
}
.dark .rw-btn-add-block {
  background: #ef4444 !important;
}

.rw-btn-add-allow {
  background: #059669 !important;
}
.rw-btn-add-allow:hover:not(:disabled) {
  filter: brightness(1.1);
}
.dark .rw-btn-add-allow {
  background: #10b981 !important;
}

.rw-btn-add-block:disabled, .rw-btn-add-allow:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.rw-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.rw-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  transition: all 0.15s ease;
}
.rw-chip code {
  font-size: 10.5px;
  font-family: var(--vp-font-family-mono);
}
.rw-chip button {
  background: transparent;
  border: none;
  color: var(--vp-c-text-3);
  font-size: 10px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}
.rw-chip button:hover {
  color: var(--vp-c-text-1);
}

.rw-chip.red {
  border-color: rgba(239, 68, 68, 0.25);
  color: #dc2626;
}
.dark .rw-chip.red { color: #f87171; }
.rw-chip.red.chip-matched {
  background: rgba(239, 68, 68, 0.12);
  border-color: #ef4444;
  box-shadow: 0 0 0 1px #ef4444;
}

.rw-chip.green {
  border-color: rgba(16, 185, 129, 0.25);
  color: #059669;
}
.dark .rw-chip.green { color: #34d399; }
.rw-chip.green.chip-matched-green {
  background: rgba(16, 185, 129, 0.12);
  border-color: #10b981;
  box-shadow: 0 0 0 1px #10b981;
}

.rw-match-dot {
  font-size: 8px;
  color: #ef4444;
}
.rw-match-dot.green {
  color: #10b981;
}
</style>
