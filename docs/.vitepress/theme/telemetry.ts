/**
 * Lightweight, privacy-first telemetry helper for Routewarden Documentation & Playground.
 * Compatible with Cloudflare Web Analytics (zero cookies, GDPR/ePrivacy compliant).
 */

declare global {
  interface Window {
    __cfBeacon?: any
  }
}

/**
 * Track a pageview or SPA route transition.
 */
export function trackPageView(path?: string, title?: string) {
  if (typeof window === 'undefined') return
  const currentPath = path || window.location.pathname
  const currentTitle = title || document.title

  // If Cloudflare Web Analytics beacon is active, beacon automatically tracks page loads.
  // In SPA navigations, trigger a synthetic Cloudflare beacon ping if supported
  try {
    if (window.__cfBeacon && typeof window.__cfBeacon.send === 'function') {
      window.__cfBeacon.send()
    }
  } catch {}

  // Dispatch custom DOM event for external or embedded analytics integrations
  try {
    window.dispatchEvent(
      new CustomEvent('routewarden:telemetry', {
        detail: {
          event: 'pageview',
          path: currentPath,
          title: currentTitle,
          timestamp: Date.now()
        }
      })
    )
  } catch {}
}

/**
 * Track custom user interactions within the interactive Playground.
 * @param action The specific playground event (e.g. 'open_drawer', 'apply_preset', 'copy_snippet', 'share_link')
 * @param metadata Additional anonymized context (e.g. preset label, format)
 */
export function trackPlaygroundEvent(action: string, metadata?: Record<string, any>) {
  if (typeof window === 'undefined') return

  try {
    window.dispatchEvent(
      new CustomEvent('routewarden:telemetry', {
        detail: {
          category: 'playground',
          action,
          metadata: metadata || {},
          timestamp: Date.now()
        }
      })
    )
  } catch {}
}
