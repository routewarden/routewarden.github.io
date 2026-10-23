import { ref, computed, watch, onMounted, type Ref, type ComputedRef } from 'vue'

export type GatewayId = 'traefik' | 'caddy' | 'nginx' | 'tcp' | 'cli'

export interface GatewayOption {
  id: GatewayId
  label: string
}

export const GATEWAYS: GatewayOption[] = [
  { id: 'traefik', label: 'Traefik' },
  { id: 'caddy', label: 'Caddy' },
  { id: 'nginx', label: 'NGINX' },
  { id: 'tcp', label: 'TCP Warden' },
  { id: 'cli', label: 'Routewarden CLI' }
]

export const STORAGE_KEY_GW = 'routewarden_preferred_gateway'
export const STORAGE_KEY_TAB = 'routewarden_preferred_tab'

export interface UseGatewaySelectionReturn {
  activeGateway: Ref<GatewayId>
  activeTabIndex: Ref<number>
  gateways: GatewayOption[]
}

// Shared in-memory active gateway for the currently active page.
// Reset across page navigations; does NOT persist in localStorage across pages.
const pageActiveGateway = ref<GatewayId>('traefik')

export function resetPageGateway(defaultGw: GatewayId = 'traefik') {
  pageActiveGateway.value = defaultGw
}

export function setPageGateway(gw: GatewayId) {
  if (pageActiveGateway.value !== gw && GATEWAYS.some(g => g.id === gw)) {
    pageActiveGateway.value = gw
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('rw:gateway-changed', { detail: gw }))
    }
  }
}

/**
 * Composable for managing active gateway and tab selection on the current active page.
 * Synchronizes across components on the current page via shared state and custom events.
 * Does NOT persist across pages or across sessions.
 */
export function useGatewaySelection(): UseGatewaySelectionReturn {
  const activeGateway = pageActiveGateway
  const activeTabIndex = ref(0)

  onMounted(() => {
    if (typeof window !== 'undefined') {
      const handler = (e: Event) => {
        const detail = (e as CustomEvent<GatewayId>).detail
        if (detail && GATEWAYS.some(g => g.id === detail) && activeGateway.value !== detail) {
          activeGateway.value = detail
        }
      }
      window.addEventListener('rw:gateway-changed', handler)
    }
  })

  // When activeGateway changes, reset tab index to 0 and notify other components on the page
  watch(activeGateway, (newGw) => {
    activeTabIndex.value = 0
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('rw:gateway-changed', { detail: newGw }))
    }
  })

  return {
    activeGateway,
    activeTabIndex,
    gateways: GATEWAYS
  }
}
