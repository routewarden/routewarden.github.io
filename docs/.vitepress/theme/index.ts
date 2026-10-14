import DefaultTheme from 'vitepress/theme'
import type { EnhanceAppContext } from 'vitepress'
import './custom.css'
import PatternChecker from './components/PatternChecker.vue'
import CodeViewer from './components/CodeViewer.vue'
import ProductHuntBadge from './components/ProductHuntBadge.vue'
import RwLayout from './components/RwLayout.vue'
import { trackPageView, trackPlaygroundEvent } from './telemetry'

import { resetPageGateway, type GatewayId } from './composables/useGatewaySelection'

type GatewayFamily = GatewayId

let currentPageGateway: GatewayFamily = 'traefik'

const GATEWAY_OPTIONS: { id: GatewayFamily; label: string }[] = [
  { id: 'traefik', label: 'Traefik' },
  { id: 'caddy', label: 'Caddy' },
  { id: 'nginx', label: 'NGINX' },
  { id: 'cli', label: 'RouteWarden CLI' }
]

// Guard to prevent re-entrant gateway sync (e.g. from the storage/change listeners)
let _syncing = false

/**
 * Classify a tab label text into a gateway family.
 * Returns null if the tab isn't gateway-specific (e.g. "Docker").
 */
function classifyLabel(text: string): GatewayFamily | null {
  const t = text.trim().toLowerCase()
  // Traefik variants (YAML, TOML, Docker Compose Labels, Docker CLI)
  if (t.includes('traefik')) return 'traefik'
  // Caddy variants (Caddyfile, JSON API)
  if (t.includes('caddy') || t.includes('caddyfile')) return 'caddy'
  // NGINX / OpenResty variants
  if (t.includes('nginx') || t.includes('openresty')) return 'nginx'
  // CLI / rwarden CLI / routewarden.json — all grouped under 'cli'
  if (t.includes('cli') || t.includes('rwarden') || t.includes('routewarden.json') || t.includes('json schema')) return 'cli'
  return null
}

function getTabTitle(label: HTMLLabelElement): string {
  return (label.getAttribute('data-title') || label.textContent || '').trim()
}

/**
 * Activate a tab by index within a .vp-code-group.
 * Only sets the radio checked state — VitePress CSS handles the rest via :checked.
 * Does NOT dispatch change events (that would cause recursion).
 */
function activateTabInGroup(group: HTMLElement, idx: number): void {
  const inputs = Array.from(group.querySelectorAll<HTMLInputElement>('.tabs input'))
  const blocks = group.querySelector<HTMLElement>('.blocks')

  if (inputs[idx]) {
    inputs[idx].checked = true
    // No dispatchEvent — VitePress tab visibility is CSS-driven via :checked + .active class.
    // Dispatching 'change' here would bubble to our window listener and cause recursion.
  }

  // VitePress shows blocks via .active class on div[class*='language-'] / .vp-block
  if (blocks) {
    Array.from(blocks.children).forEach((child, i) => {
      child.classList.toggle('active', i === idx)
    })
  }
}

/**
 * Filter a gateway code-group to show ONLY tabs that match the selected gateway.
 * Hides all other tabs and their code blocks.
 * If only one tab remains visible, hides the tab bar entirely (single block view).
 */
function filterGroupByGateway(group: HTMLElement, family: GatewayFamily): void {
  const tabsContainer = group.querySelector<HTMLElement>('.tabs')
  const blocks = group.querySelector<HTMLElement>('.blocks')
  if (!tabsContainer || !blocks) return

  const labels = Array.from(tabsContainer.querySelectorAll<HTMLLabelElement>('label:not(.rw-dropdown-label)'))
  const inputs = Array.from(tabsContainer.querySelectorAll<HTMLInputElement>('input'))
  const blockChildren = Array.from(blocks.children) as HTMLElement[]

  let firstVisibleIdx = -1
  let visibleCount = 0

  labels.forEach((label, i) => {
    const lFamily = classifyLabel(getTabTitle(label))
    const isVisible = lFamily === family

    // Must use setProperty with 'important' because our CSS has
    // `display: inline-flex !important` which beats plain style.display = 'none'
    if (isVisible) {
      label.style.removeProperty('display')
    } else {
      label.style.setProperty('display', 'none', 'important')
    }

    if (blockChildren[i]) {
      if (!isVisible) {
        // Force-hide even if VitePress sets .active { display: block }
        blockChildren[i].style.setProperty('display', 'none', 'important')
      } else {
        blockChildren[i].style.removeProperty('display')
        if (firstVisibleIdx === -1) firstVisibleIdx = i
        visibleCount++
      }
    }
  })

  // If no active block is visible, activate the first visible one
  const activeVisible = blockChildren.find(
    b => b.classList.contains('active') && b.style.getPropertyValue('display') !== 'none'
  )
  if (!activeVisible && firstVisibleIdx !== -1) {
    activateTabInGroup(group, firstVisibleIdx)
  }

  // Single-tab mode: hide the label row, keep the header bar + dropdown
  if (visibleCount <= 1) {
    tabsContainer.classList.add('rw-tabs-single')
  } else {
    tabsContainer.classList.remove('rw-tabs-single')
  }
}

/**
 * Sync only the DOM (tabs + dropdowns) — no localStorage write, no event dispatch.
 * Called by the rw:gateway-changed listener so we don't re-fire the event.
 */
function syncTabsOnly(family: GatewayFamily, triggeringGroup?: HTMLElement): void {
  currentPageGateway = family

  // Update all gateway dropdowns in code groups
  document.querySelectorAll<HTMLSelectElement>('.rw-group-gateway-wrapper select').forEach((sel) => {
    if (Array.from(sel.options).some(o => o.value === family)) {
      sel.value = family
    }
  })

  document.querySelectorAll<HTMLElement>('.vp-code-group').forEach((group) => {
    if (group === triggeringGroup) return

    const labels = Array.from(group.querySelectorAll<HTMLLabelElement>('.tabs label'))

    // Determine if this group has gateway tabs
    const hasGatewayTabs = labels.some(lbl => classifyLabel(getTabTitle(lbl)) !== null)
    if (!hasGatewayTabs) return

    // Filter visible tabs to match the selected gateway
    filterGroupByGateway(group, family)

    // Also activate the matching tab
    const matchIdx = labels.findIndex((lbl) => classifyLabel(getTabTitle(lbl)) === family)
    if (matchIdx !== -1) {
      activateTabInGroup(group, matchIdx)
    }
  })
}

/**
 * Full sync on the active page: sync all tabs/dropdowns, then
 * broadcast rw:gateway-changed so Vue components (PatternChecker, CodeViewer) update.
 * Never called FROM the rw:gateway-changed handler.
 */
function syncGatewayAcrossGroups(family: GatewayFamily, triggeringGroup?: HTMLElement): void {
  if (_syncing) return
  _syncing = true
  currentPageGateway = family

  syncTabsOnly(family, triggeringGroup)

  // Also filter the triggering group itself (syncTabsOnly skips it to avoid double-activation)
  if (triggeringGroup) {
    filterGroupByGateway(triggeringGroup, family)
  }

  // Broadcast so Vue components on this page update immediately.
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('rw:gateway-changed', { detail: family }))
  }
  _syncing = false
}

/**
 * Enhance every .vp-code-group that contains gateway tabs with the Gateway Dropdown.
 */
function enhanceCodeGroups(): void {
  if (typeof document === 'undefined') return

  const groups = document.querySelectorAll<HTMLElement>('.vp-code-group')
  groups.forEach((group) => {
    const tabsContainer = group.querySelector<HTMLElement>('.tabs')
    if (!tabsContainer) return

    // If already enhanced, ensure value is up to date and return
    const existingSelect = tabsContainer.querySelector<HTMLSelectElement>('.rw-group-gateway-wrapper select')
    if (existingSelect) {
      const currentGw = currentPageGateway || 'traefik'
      if (Array.from(existingSelect.options).some(o => o.value === currentGw)) {
        existingSelect.value = currentGw
      }
      return
    }

    const labels = Array.from(tabsContainer.querySelectorAll<HTMLLabelElement>('label'))
    if (labels.length === 0) return

    // Check which gateway families this group contains
    const recognizedGateways = new Set<GatewayFamily>()
    labels.forEach((lbl) => {
      const family = classifyLabel(getTabTitle(lbl))
      if (family) recognizedGateways.add(family)
    })

    // Only inject dropdown if group has 2+ gateways
    if (recognizedGateways.size < 2) return

    const currentGw = currentPageGateway || 'traefik'

    // Build the wrapper
    const wrapper = document.createElement('div')
    wrapper.className = 'rw-dropdown-wrapper rw-group-gateway-wrapper'

    const labelEl = document.createElement('label')
    labelEl.className = 'rw-dropdown-label'
    labelEl.textContent = ''

    const select = document.createElement('select')
    select.className = 'rw-gateway-select'
    select.setAttribute('aria-label', 'Select gateway configuration')

    GATEWAY_OPTIONS.forEach((opt) => {
      if (recognizedGateways.has(opt.id)) {
        const optEl = document.createElement('option')
        optEl.value = opt.id
        optEl.textContent = opt.label
        if (opt.id === currentGw) optEl.selected = true
        select.appendChild(optEl)
      }
    })

    const chevron = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    chevron.setAttribute('class', 'rw-dropdown-chevron')
    chevron.setAttribute('width', '14')
    chevron.setAttribute('height', '14')
    chevron.setAttribute('viewBox', '0 0 24 24')
    chevron.setAttribute('fill', 'none')
    chevron.setAttribute('stroke', 'currentColor')
    chevron.setAttribute('stroke-width', '2')
    chevron.setAttribute('stroke-linecap', 'round')
    chevron.setAttribute('stroke-linejoin', 'round')
    const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline')
    polyline.setAttribute('points', '6 9 12 15 18 9')
    chevron.appendChild(polyline)

    wrapper.appendChild(labelEl)
    wrapper.appendChild(select)
    wrapper.appendChild(chevron)

    select.addEventListener('change', () => {
      const selected = select.value as GatewayFamily
      syncGatewayAcrossGroups(selected)
      // Activate the matching tab in THIS group (triggeringGroup skips it in syncTabsOnly)
      const matchIdx = labels.findIndex((lbl) => classifyLabel(getTabTitle(lbl)) === selected)
      if (matchIdx !== -1) activateTabInGroup(group, matchIdx)
      filterGroupByGateway(group, selected)
      trackPlaygroundEvent('gateway_dropdown_switched', { gateway: selected })
    })

    tabsContainer.appendChild(wrapper)
  })
}

/**
 * Apply the current page gateway preference to all code groups on the current page.
 */
function applyStoredGateway(): void {
  enhanceCodeGroups()
  syncTabsOnly(currentPageGateway || 'traefik')
}

export default {
  extends: DefaultTheme,
  Layout: RwLayout,
  enhanceApp({ app, router }: EnhanceAppContext) {
    app.component('PatternChecker', PatternChecker)
    app.component('CodeViewer', CodeViewer)
    app.component('ProductHuntBadge', ProductHuntBadge)

    // Route tracking for SPA page transitions in VitePress
    if (router && typeof window !== 'undefined') {
      const originalAfterRouteChanged = router.onAfterRouteChanged
      router.onAfterRouteChanged = (to: string) => {
        if (originalAfterRouteChanged) {
          originalAfterRouteChanged(to)
        }
        // Only retain preference on the current active page, not across pages.
        // Reset gateway preference back to default on page navigation.
        currentPageGateway = 'traefik'
        resetPageGateway('traefik')

        trackPageView(to)
        setTimeout(applyStoredGateway, 80)
      }
    }

    if (typeof window !== 'undefined') {
      // When user clicks a tab label directly, sync the gateway state
      window.addEventListener('click', (e) => {
        if (_syncing) return
        const label = (e.target as HTMLElement).closest<HTMLLabelElement>('.vp-code-group .tabs label')
        if (!label) return
        const group = label.closest<HTMLElement>('.vp-code-group')
        if (!group) return

        // Skip clicks on labels that are part of our injected dropdown wrapper
        if (label.closest('.rw-group-gateway-wrapper')) return

        const title = getTabTitle(label)
        const family = classifyLabel(title)
        if (family) {
          syncGatewayAcrossGroups(family, group)
          filterGroupByGateway(group, family)
          const sel = group.querySelector<HTMLSelectElement>('.rw-group-gateway-wrapper select')
          if (sel && Array.from(sel.options).some(o => o.value === family)) {
            sel.value = family
          }
          trackPlaygroundEvent('tab_switched', { tab: title, gateway: family })
        }
      })

      window.addEventListener('DOMContentLoaded', () => {
        applyStoredGateway()
        trackPageView()
      })

      // Same-page sync: Vue components dispatch this event.
      // We call syncTabsOnly (not syncGatewayAcrossGroups) to avoid re-dispatch / recursion.
      window.addEventListener('rw:gateway-changed', (e) => {
        if (_syncing) return
        const family = (e as CustomEvent<GatewayFamily>).detail
        if (family && ['traefik', 'caddy', 'nginx', 'cli'].includes(family)) {
          syncTabsOnly(family)
        }
      })

      // Support VitePress client-side page navigation (MutationObserver)
      // Disconnect before mutating DOM to prevent re-triggering.
      if (typeof MutationObserver !== 'undefined') {
        let debounceTimer: ReturnType<typeof setTimeout> | null = null
        const observer = new MutationObserver((mutations) => {
          // Only act when actual .vp-code-group nodes are added
          const relevant = mutations.some((m) =>
            Array.from(m.addedNodes).some(
              (n) =>
                n instanceof HTMLElement &&
                (n.classList.contains('vp-code-group') || n.querySelector?.('.vp-code-group'))
            )
          )
          if (!relevant) return

          if (debounceTimer) clearTimeout(debounceTimer)
          debounceTimer = setTimeout(() => {
            observer.disconnect()
            applyStoredGateway()
            observer.observe(document.documentElement, { childList: true, subtree: true })
          }, 80)
        })
        observer.observe(document.documentElement, { childList: true, subtree: true })
      }
    }
  }
}
