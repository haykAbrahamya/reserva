import { fromBase64Url, toBase64Url } from './base64url'
import { chromeIntentUrl } from './inAppBrowser'

// ─────────────────────────────────────────────────────────────
// Saving through Chrome, from an app's built-in browser on Android.
//
// That browser keeps its own storage, so Chrome would open the tool empty.
// The link carries what this tool needs — its draft, the language and theme,
// the analytics visit — and what to save. The first thing the page does in
// Chrome is put it back and take it off the address; once drawn, the result
// saves itself. Photos are not in storage (they never leave the device), so
// they stay behind.
// ─────────────────────────────────────────────────────────────

const PARAM = 'h'

/** What the page saves on arrival in Chrome. */
export type ArrivalSave = 'image' | 'pdf'

/** Carried as stored. Not the staff flag: a link must not be able to hide someone from the analytics. */
const KEYS = new Set([
  'reserva-tools-locale',
  'reserva-tools-locale-explicit',
  'reserva-tools-theme-choice',
  'rsv.vid',
  'rsv.session',
])
const DRAFT_KEY = /^reserva-tools:[a-z-]+:v\d+$/
/** A draft is a few hundred bytes; anything near this is not one. */
const MAX_VALUE = 16_000
/** Long enough for the page to draw its result; too short to fire once photos are picked again. */
const ARRIVAL_WINDOW_MS = 15_000

let arrival: ArrivalSave | null = null

/** Open this page in Chrome, carrying this tool's draft, to save `save` there. */
export function saveInChrome(save: ArrivalSave): void {
  const url = new URL(window.location.href)
  url.searchParams.delete(PARAM)
  url.hash = ''
  const fallback = url.toString()

  // This tool's draft only: the one its address names (/price-list → reserva-tools:price-list:v1).
  const draft = `reserva-tools:${url.pathname.split('/')[1]}:v`
  const entries: Record<string, string> = { save }
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)
      if (!key || !(KEYS.has(key) || (key.startsWith(draft) && DRAFT_KEY.test(key)))) continue
      const value = window.localStorage.getItem(key)
      if (value !== null && value.length <= MAX_VALUE) entries[key] = value
    }
  } catch {
    // Blocked storage: Chrome opens the tool as it is.
  }
  url.searchParams.set(PARAM, toBase64Url(new TextEncoder().encode(JSON.stringify(entries))))
  window.location.href = chromeIntentUrl(url.toString(), fallback)
}

/**
 * In Chrome: put a carried tool back into storage, note what to save, and
 * take it all off the address. Called first thing in main.tsx, before
 * anything reads storage or the URL.
 */
export function receiveHandoff(): void {
  try {
    const url = new URL(window.location.href)
    const payload = url.searchParams.get(PARAM)
    if (payload === null) return
    url.searchParams.delete(PARAM)
    window.history.replaceState(window.history.state, '', url.toString())

    const carried: unknown = JSON.parse(new TextDecoder().decode(fromBase64Url(payload)))
    if (!carried || typeof carried !== 'object' || Array.isArray(carried)) return
    for (const [key, value] of Object.entries(carried)) {
      if (key === 'save') arrival = value === 'image' || value === 'pdf' ? value : null
      else if ((KEYS.has(key) || DRAFT_KEY.test(key)) && typeof value === 'string' && value.length <= MAX_VALUE) {
        window.localStorage.setItem(key, value)
      }
    }
  } catch {
    // A cut or edited link, or blocked storage: the page simply starts as usual.
  }
}

/** Once, right after arriving: whether this page was opened in Chrome to save `kind`. */
export function takeArrivalSave(kind: ArrivalSave): boolean {
  if (arrival !== kind || performance.now() > ARRIVAL_WINDOW_MS) return false
  arrival = null
  return true
}
