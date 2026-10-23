<script setup lang="ts">
import type { GatewayId, GatewayOption } from '../composables/useGatewaySelection'

defineProps<{
  gateways: GatewayOption[]
}>()

const activeGateway = defineModel<GatewayId>({ required: true })
</script>

<template>
  <div class="rw-dropdown-wrapper">
    <span class="rw-gw-badge">GW:</span>
    <select
      id="gateway-select"
      v-model="activeGateway"
      class="rw-gateway-select"
      aria-label="Select gateway configuration"
    >
      <option v-for="g in gateways" :key="g.id" :value="g.id">
        {{ g.label }}
      </option>
    </select>
    <span class="rw-dropdown-arrow" aria-hidden="true">▾</span>
  </div>
</template>

<style scoped>
.rw-dropdown-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  font-family: var(--vp-font-family-mono);
}

.rw-gw-badge {
  position: absolute;
  left: 7px;
  font-size: 9.5px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--rw-c-cyan);
  pointer-events: none;
  user-select: none;
  opacity: 0.9;
}

.rw-gateway-select {
  appearance: none;
  -webkit-appearance: none;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 3px;
  padding: 3px 22px 3px 28px;
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--vp-c-text-1);
  cursor: pointer;
  outline: none;
  transition: all 0.15s ease;
  line-height: 1.4;
}

.dark .rw-gateway-select {
  background: #0c1019;
  border-color: rgba(34, 211, 238, 0.28);
  color: #f1f5f9;
}

.rw-gateway-select:hover {
  border-color: var(--rw-c-cyan);
  background: rgba(34, 211, 238, 0.05);
}

.dark .rw-gateway-select:hover {
  background: #101624;
  border-color: var(--rw-c-cyan);
}

.rw-gateway-select:focus {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 0 1px var(--vp-c-brand-1), 0 0 8px rgba(16, 185, 129, 0.3);
}

.rw-dropdown-arrow {
  position: absolute;
  right: 7px;
  font-size: 10px;
  font-weight: 700;
  pointer-events: none;
  color: var(--rw-c-cyan);
  user-select: none;
  transition: transform 0.15s ease;
}

.rw-dropdown-wrapper:hover .rw-dropdown-arrow {
  color: var(--vp-c-brand-1);
}
</style>
