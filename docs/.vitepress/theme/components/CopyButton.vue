<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(
  defineProps<{
    code: string
    title?: string
  }>(),
  {
    title: 'Copy code'
  }
)

const copied = ref(false)

function copy() {
  if (typeof navigator !== 'undefined' && navigator.clipboard && props.code) {
    navigator.clipboard.writeText(props.code).then(() => {
      copied.value = true
      setTimeout(() => {
        copied.value = false
      }, 2000)
    })
  }
}
</script>

<template>
  <button
    type="button"
    class="rw-copy-btn"
    :class="{ copied }"
    :title="copied ? 'Copied to clipboard' : title"
    :aria-label="copied ? 'Copied to clipboard' : title"
    @click="copy"
  >
    <span v-if="copied" class="rw-copy-content">
      <span class="rw-btn-glyph">✓</span>
      <span>Copied</span>
    </span>
    <span v-else class="rw-copy-content">
      <span class="rw-btn-glyph">⎘</span>
      <span>Copy</span>
    </span>
  </button>
</template>

<style scoped>
.rw-copy-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.03em;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 3px;
  padding: 3px 8px;
  cursor: pointer;
  outline: none;
  transition: all 0.15s ease;
  line-height: 1.4;
  white-space: nowrap;
}

.dark .rw-copy-btn {
  background: #0d121c;
  border-color: rgba(148, 163, 184, 0.2);
  color: #94a3b8;
}

.rw-copy-content {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.rw-btn-glyph {
  font-size: 11.5px;
  line-height: 1;
}

.rw-copy-btn:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  background: rgba(16, 185, 129, 0.08);
}

.dark .rw-copy-btn:hover {
  background: rgba(16, 185, 129, 0.12);
  border-color: var(--vp-c-brand-1);
}

.rw-copy-btn.copied {
  background: rgba(16, 185, 129, 0.15) !important;
  border-color: var(--vp-c-brand-1) !important;
  color: var(--vp-c-brand-1) !important;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.35) !important;
}
</style>
