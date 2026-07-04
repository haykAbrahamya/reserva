// ─────────────────────────────────────────────────────────────
// Visitor analytics. Fires one fire-and-forget page-view event per navigation.
// The backend derives IP (→ geo) and parses the User-Agent header itself, so we
// only send browser-available page context. Must never throw or block render.
// ─────────────────────────────────────────────────────────────

import { slugFromHost } from '@/hooks/useTenantSlug'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1'

interface PageViewPayload {
  path: string
  host: string
  /** Partner slug when on a tenant page (subdomain or /p/:slug) — else omitted. */
  partnerSlug?: string
  referrer: string
  language: string
  screenW: number
  screenH: number
}

/** Resolve the partner slug for the current page: subdomain first, else /p/:slug. */
function currentPartnerSlug(): string | undefined {
  const fromHost = slugFromHost()
  if (fromHost) return fromHost
  const m = /^\/p\/([a-z0-9-]+)/i.exec(window.location.pathname)
  return m ? m[1].toLowerCase() : undefined
}

function collect(): PageViewPayload {
  const partnerSlug = currentPartnerSlug()
  return {
    path: window.location.pathname,
    host: window.location.host,
    ...(partnerSlug ? { partnerSlug } : {}),
    referrer: document.referrer,
    language: navigator.language,
    screenW: window.screen.width,
    screenH: window.screen.height,
  }
}

/**
 * Record the current page view. Fire-and-forget: prefers sendBeacon (survives
 * unload, non-blocking), falls back to keepalive fetch. All errors are
 * swallowed — analytics must never affect the user experience.
 */
export function trackPageView(): void {
  try {
    const url = `${API_URL}/public/visits`
    const body = JSON.stringify(collect())

    if (typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' })
      navigator.sendBeacon(url, blob)
      return
    }

    void fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {})
  } catch {
    // Never let tracking break the page.
  }
}
