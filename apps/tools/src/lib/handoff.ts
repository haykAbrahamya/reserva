import { fromBase64Url, toBase64Url } from './base64url'

// ─────────────────────────────────────────────────────────────
// Carrying a visit into the phone's own browser.
//
// An app's built-in browser keeps its own storage, so "Open in Chrome" would
// otherwise arrive with nothing: no draft, the default language, and a
// visitor the analytics have never seen. The link carries what this browser
// remembers — the tool drafts, the language and theme, the analytics visit —
// and the first thing the app does on the other side is put it back.
//
// Photos are not in storage (they never leave the device), so they stay behind.
// ─────────────────────────────────────────────────────────────

const PARAM = 'h'

/**
 * Carried as stored, plus every tool draft. Not the staff flag: a link must
 * not be able to hide someone from the analytics.
 */
const KEYS = new Set([
  'reserva-tools-locale',
  'reserva-tools-locale-explicit',
  'reserva-tools-theme-choice',
  'rsv.vid',
  'rsv.session',
])
const DRAFT_KEY = /^reserva-tools:[a-z-]+:v\d+$/

/** A draft is a few hundred bytes; anything near these is not one. */
const MAX_VALUE = 16_000
const MAX_TOTAL = 32_000

const carried = (key: string) => KEYS.has(key) || DRAFT_KEY.test(key)

/**
 * This page's address, carrying what this browser remembers. In the query for
 * an intent:// link, which cannot hold a #fragment of its own; after the #
 * otherwise, where it never reaches a server log.
 */
export function handoffUrl(place: 'query' | 'hash'): string {
  const url = new URL(window.location.href)
  url.searchParams.delete(PARAM)
  url.hash = ''
  const payload = encode(collect())
  if (payload) {
    if (place === 'query') url.searchParams.set(PARAM, payload)
    else url.hash = `${PARAM}=${payload}`
  }
  return url.toString()
}

/**
 * Put a carried visit back into storage and take it off the address. Called
 * first thing in main.tsx, before anything reads storage or the URL, so the
 * language, the theme, the drafts and the analytics all start from it.
 */
export function receiveHandoff(): void {
  try {
    const url = new URL(window.location.href)
    const inHash = url.hash.startsWith(`#${PARAM}=`)
    const payload = url.searchParams.get(PARAM) ?? (inHash ? url.hash.slice(PARAM.length + 2) : null)
    if (payload === null) return

    url.searchParams.delete(PARAM)
    if (inHash) url.hash = ''
    window.history.replaceState(window.history.state, '', url.toString())

    for (const [key, value] of Object.entries(decode(payload))) {
      if (carried(key) && typeof value === 'string' && value.length <= MAX_VALUE) {
        window.localStorage.setItem(key, value)
      }
    }
  } catch {
    // A cut or edited link, or blocked storage: the page simply starts as usual.
  }
}

function collect(): Record<string, string> {
  const entries: Record<string, string> = {}
  let total = 0
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)
      if (!key || !carried(key)) continue
      const value = window.localStorage.getItem(key)
      if (value === null || value.length > MAX_VALUE || total + value.length > MAX_TOTAL) continue
      entries[key] = value
      total += value.length
    }
  } catch {
    // Blocked storage: there is nothing to carry.
  }
  return entries
}

function encode(entries: Record<string, string>): string | null {
  return Object.keys(entries).length ? toBase64Url(new TextEncoder().encode(JSON.stringify(entries))) : null
}

function decode(payload: string): Record<string, unknown> {
  const value: unknown = JSON.parse(new TextDecoder().decode(fromBase64Url(payload)))
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}
