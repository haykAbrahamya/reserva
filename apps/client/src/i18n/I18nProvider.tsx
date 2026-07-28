import { createContext, useContext, useEffect, useMemo, useState, useCallback, type ReactNode } from 'react'
import {
  type Locale,
  type Messages,
  LOCALE_META,
  STORAGE_KEY,
  EXPLICIT_KEY,
  detectInitialLocale,
} from './config'
import { loadLocale, bundledMessages } from './loader'

type Vars = Record<string, string | number>

interface I18nValue {
  locale: Locale
  /** Change the active locale. Pass `explicit: true` for a real user choice
   *  (via the switcher) so it's remembered and a partner default can't override
   *  it. Programmatic defaults (e.g. a partner's default language) omit it. */
  setLocale: (l: Locale, explicit?: boolean) => void
  /** Translate a dotted key, with optional {placeholder} interpolation. */
  t: (key: string, vars?: Vars) => string
  /**
   * Count-aware translate. Uses `<key>` for 1 and `<key>_plural` for other
   * counts (falling back to the singular if no plural form exists). `count`
   * is auto-injected into the placeholders.
   */
  tp: (key: string, count: number, vars?: Vars) => string
  ready: boolean
}

const I18nContext = createContext<I18nValue | null>(null)

/** Walk a dotted path ("a.b.c") through a nested messages object. */
function resolve(messages: Messages, key: string): string | undefined {
  const parts = key.split('.')
  let node: string | Messages | undefined = messages
  for (const p of parts) {
    if (node == null || typeof node === 'string') return undefined
    node = node[p]
  }
  return typeof node === 'string' ? node : undefined
}

/** Replace {name} tokens; supports {count} etc. */
function interpolate(str: string, vars?: Vars): string {
  if (!vars) return str
  return str.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m))
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectInitialLocale)
  // Start with bundled copy so there's never a flash of missing text.
  const [messages, setMessages] = useState<Messages>(() => bundledMessages(detectInitialLocale()))
  const [ready, setReady] = useState(true)

  // Apply <html lang> + persist whenever the locale changes, and (re)load the
  // bundle (which may upgrade to a fresh remote copy).
  useEffect(() => {
    document.documentElement.setAttribute('lang', LOCALE_META[locale].lang)
    try { window.localStorage.setItem(STORAGE_KEY, locale) } catch { /* ignore */ }

    let active = true
    setReady(false)
    setMessages(bundledMessages(locale)) // instant fallback
    loadLocale(locale).then(m => {
      if (!active) return
      setMessages(m)
      setReady(true)
    })
    return () => { active = false }
  }, [locale])

  const setLocale = useCallback((l: Locale, explicit = false) => {
    // Record a real user choice so it's respected on future visits and a partner
    // default can never override it. Programmatic defaults skip this.
    if (explicit) {
      try { window.localStorage.setItem(EXPLICIT_KEY, '1') } catch { /* ignore */ }
    }
    setLocaleState(l)
  }, [])

  const t = useCallback(
    (key: string, vars?: Vars): string => {
      const hit = resolve(messages, key)
      if (hit != null) return interpolate(hit, vars)
      // Fall back to English so a missing translation degrades gracefully.
      const fallback = resolve(bundledMessages('en'), key)
      if (fallback != null) return interpolate(fallback, vars)
      // Last resort: surface the key so gaps are obvious in dev.
      return key
    },
    [messages]
  )

  const tp = useCallback(
    (key: string, count: number, vars?: Vars): string => {
      const pluralKey = `${key}_plural`
      // Use the plural form for any count other than exactly 1, when present.
      const useePlural = count !== 1 && resolve(messages, pluralKey) != null
      return t(useePlural ? pluralKey : key, { count, ...vars })
    },
    [messages, t]
  )

  const value = useMemo<I18nValue>(() => ({ locale, setLocale, t, tp, ready }), [locale, setLocale, t, tp, ready])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within <I18nProvider>')
  return ctx
}

/** Convenience: just the translate function. */
export function useT() {
  return useI18n().t
}
