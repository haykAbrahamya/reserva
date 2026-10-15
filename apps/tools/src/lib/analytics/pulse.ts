// ─────────────────────────────────────────────────────────────
// Analytics for tools.reserva.am: this site's event catalog over the shared
// tracker (@reserva/shared/pulse). Batches go to the same POST /public/pulse
// as reserva.am, filed under the site "tools", so the console reads them on
// their own and they never move the booking site's numbers.
//
// Choices and counts — and of everything typed, only the contact line a result
// is signed with ("Phone or Instagram"), as typed, and the Instagram username
// in it, so the console can tell who made it. Never salon names, prices, notes
// or photos. Like the page it measures, it must never throw.
// ─────────────────────────────────────────────────────────────

import { createPulse } from '@reserva/shared/pulse'
import type { Locale } from '@/i18n'
import type { InAppName } from '@/lib/inAppBrowser'
import type { ToolId } from '@/tools/registry'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1'

export type PageType = 'tools' | 'tool' | 'visit' | 'other'
/** How a result left the page. */
export type ExportVia = 'share' | 'download' | 'pdf' | 'whatsapp' | 'viber' | 'copy'
/** A main action inside a tool. */
export type ToolAct =
  // A style, and the rows of a list
  | 'theme' | 'add' | 'remove' | 'clear'
  // Free slots: the day the story is for
  | 'day'
  // Before & after
  | 'photo' | 'photo_remove' | 'adjust' | 'format' | 'layout'
  // Gift certificate: a new number for the next card
  | 'code'
  // Appointment card: opened the page the client will see
  | 'open'
  // Looked at the result: the phone's Preview tab, the image full size
  | 'preview' | 'zoom'
export type ToolErrorCode = 'share' | 'download' | 'pdf' | 'copy' | 'photo' | 'bad_link'
/** Where a link into reserva.am sits. */
export type CtaFrom = 'pitch' | 'header' | 'footer'
/** What a client did on an appointment card's page. */
export type VisitAct = 'calendar' | 'directions' | 'call' | 'made'

/** What a result was made with: its style, its layout, how many rows or slots. */
export interface ExportDetails {
  theme?: string
  fmt?: string
  n?: number
  /** The Instagram username on the result (lib/instagram), when its contact line holds one. */
  ig?: string
  /** Its contact line ("Phone or Instagram"), exactly as typed. */
  contact?: string
}

export interface ToolsEvents {
  page_view: { pt: PageType; tool?: ToolId; lng?: Locale }
  tool_select: { tool: ToolId; pos?: number }
  tool_edit: { tool: ToolId }
  tool_action: { tool: ToolId; act: ToolAct; v?: string }
  tool_export: { tool: ToolId; via: ExportVia } & ExportDetails
  tool_error: { tool?: ToolId; code: ToolErrorCode }
  cta_click: { from: CtaFrom; tool?: ToolId }
  visit_action: { act: VisitAct }
  pref_change: { what: 'lang' | 'theme'; v: string }
  /** An app's built-in browser on Android: Download (or the PDF) took the page to Chrome, to save there. */
  browser_open: { app: InAppName; from: 'download' | 'pdf'; how: 'chrome'; tool?: ToolId }
}
export type ToolsEventName = keyof ToolsEvents

const pulse = createPulse({
  apiUrl: API_URL,
  key: import.meta.env.VITE_SITE_PULSE_KEY,
  site: 'tools',
  // The backend's limits for these props.
  maxLen: { act: 24, v: 40, theme: 24, fmt: 24, code: 40, from: 24, ig: 30, contact: 48 },
  // Each of these tends to hand the phone to another app — WhatsApp, Viber,
  // the share sheet, reserva.am, the dialer, maps — and a backgrounded tab may
  // never get another tick: they leave at once.
  urgent: new Set(['tool_export', 'cta_click', 'visit_action', 'browser_open']),
})

/** Fire-and-forget: queues the event; it leaves within seconds, or as the page closes. */
export function track<N extends ToolsEventName>(name: N, props: ToolsEvents[N]): void {
  pulse.record(name, props)
}

/** Per page view: what has been counted once already (an edit, a dragged framing). */
const once = new Set<string>()
let lastView: { path: string; at: number } | null = null

/** One page view (from SiteLayout, on every route change). */
export function trackPageView(path: string, pt: PageType, tool: ToolId | undefined, lng: Locale): void {
  // StrictMode mounts twice in development; a real second view is never this close.
  const now = Date.now()
  if (lastView && lastView.path === path && now - lastView.at < 1_000) return
  lastView = { path, at: now }
  once.clear()
  track('page_view', { pt, ...(tool ? { tool } : {}), lng })
}

/** One tool's events, bound to it — what its draft hook and its export buttons call. */
export function toolEvents(tool: ToolId) {
  const first = (key: string) => {
    if (once.has(`${tool}:${key}`)) return false
    once.add(`${tool}:${key}`)
    return true
  }
  return {
    /** The form changed. Counted once per page view, however much is typed. */
    edited() {
      if (first('edit')) track('tool_edit', { tool })
    },
    action(act: ToolAct, v?: string) {
      track('tool_action', { tool, act, ...(v ? { v } : {}) })
    },
    /** An action that fires continuously (dragging a photo's framing), counted once per page view. */
    actionOnce(act: ToolAct, v?: string) {
      if (first(`${act}:${v ?? ''}`)) track('tool_action', { tool, act, ...(v ? { v } : {}) })
    },
    exported(via: ExportVia, details: ExportDetails = {}) {
      track('tool_export', { tool, via, ...details })
    },
    failed(code: ToolErrorCode) {
      track('tool_error', { tool, code })
    },
    /** In an app's browser on Android: saving went on in Chrome. */
    toChrome(app: InAppName, from: 'download' | 'pdf') {
      track('browser_open', { app, from, how: 'chrome', tool })
    },
  }
}

export type ToolEvents = ReturnType<typeof toolEvents>
