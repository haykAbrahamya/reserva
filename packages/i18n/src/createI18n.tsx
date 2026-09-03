import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { localize, type LocalizedText } from '@reserva/shared'
import type { I18nConfig, Messages, Vars } from './types'

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

/** Replace {name} tokens. Unknown tokens are left visible, not blanked — a
 *  literal "{count}" on screen is a bug report; a silent gap is not. */
function interpolate(str: string, vars?: Vars): string {
  if (!vars) return str
  return str.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m))
}

export interface I18nValue<L extends string> {
  locale: L
  /**
   * Change the active locale. Pass `explicit: true` for a real user choice, so
   * it is remembered and a server-supplied default can never override it.
   */
  setLocale: (l: L, explicit?: boolean) => void
  /** Translate a dotted key, with optional {placeholder} interpolation. */
  t: (key: string, vars?: Vars) => string
  /**
   * Count-aware translate. Uses `<key>` for 1 and `<key>_plural` otherwise,
   * falling back to the singular when no plural form exists. `count` is
   * injected into the placeholders automatically.
   */
  tp: (key: string, count: number, vars?: Vars) => string
  /** False only while a remote bundle is in flight. */
  ready: boolean
}

/**
 * Build an i18n system for one app.
 *
 * The ENGINE is shared; the CONTENT is not. Every Reserva app needs the same
 * dotted-key lookup, the same {placeholder} interpolation, the same plural
 * rule, the same "bundled now, remote later" loader and the same
 * explicit-choice-wins persistence — but they must never share a message
 * bundle, because a board and a backoffice mean different things by "status".
 *
 * So this takes the per-app config and returns a provider plus hooks bound to
 * it, with `Locale` narrowed to that app's own union. Adding a fourth app costs
 * a config object, not another copy of the machinery.
 */
export function createI18n<L extends string>(config: I18nConfig<L>) {
  const { locales, defaultLocale, meta, bundled, storageKey, remoteBaseUrl = '' } = config

  /** Set once the visitor actively picks a language, so a programmatic default
   *  can never override a real choice on a later visit. */
  const explicitKey = `${storageKey}-explicit`

  const isLocale = (v: unknown): v is L =>
    typeof v === 'string' && (locales as readonly string[]).includes(v)

  function detectInitialLocale(): L {
    if (typeof window === 'undefined') return defaultLocale
    try {
      const saved = window.localStorage.getItem(storageKey)
      if (isLocale(saved)) return saved
    } catch {
      // Private mode or blocked storage — the default is still correct.
    }
    return defaultLocale
  }

  function hasExplicitChoice(): boolean {
    if (typeof window === 'undefined') return false
    try {
      return window.localStorage.getItem(explicitKey) === '1'
    } catch {
      return false
    }
  }

  const cache = new Map<L, Messages>()

  /** cache -> remote (when configured) -> bundled. Never rejects. */
  async function loadLocale(locale: L): Promise<Messages> {
    const hit = cache.get(locale)
    if (hit) return hit

    if (remoteBaseUrl) {
      try {
        const res = await fetch(`${remoteBaseUrl}/${locale}.json`, { cache: 'no-cache' })
        if (res.ok) {
          const remote = (await res.json()) as Messages
          cache.set(locale, remote)
          return remote
        }
      } catch {
        // Network or parse failure falls through to the bundled copy.
      }
    }

    cache.set(locale, bundled[locale])
    return bundled[locale]
  }

  const Ctx = createContext<I18nValue<L> | null>(null)

  function I18nProvider({ children }: { children: ReactNode }) {
    const [locale, setLocaleState] = useState<L>(detectInitialLocale)
    // Start from the bundled copy so there is never a flash of missing text.
    const [messages, setMessages] = useState<Messages>(() => bundled[detectInitialLocale()])
    const [ready, setReady] = useState(true)

    useEffect(() => {
      document.documentElement.setAttribute('lang', meta[locale].lang)
      try {
        window.localStorage.setItem(storageKey, locale)
      } catch {
        /* ignore */
      }

      let active = true
      setReady(false)
      setMessages(bundled[locale])
      void loadLocale(locale).then((m) => {
        if (!active) return
        setMessages(m)
        setReady(true)
      })
      return () => {
        active = false
      }
    }, [locale])

    const setLocale = useCallback((l: L, explicit = false) => {
      if (explicit) {
        try {
          window.localStorage.setItem(explicitKey, '1')
        } catch {
          /* ignore */
        }
      }
      setLocaleState(l)
    }, [])

    const t = useCallback(
      (key: string, vars?: Vars): string => {
        const hit = resolve(messages, key)
        if (hit != null) return interpolate(hit, vars)
        // Fall back to the default locale so a missing translation degrades to
        // real words rather than to a key.
        const fallback = resolve(bundled[defaultLocale], key)
        if (fallback != null) return interpolate(fallback, vars)
        // Last resort: show the key, so a gap is obvious in review.
        return key
      },
      [messages],
    )

    const tp = useCallback(
      (key: string, count: number, vars?: Vars): string => {
        const pluralKey = `${key}_plural`
        const usePlural = count !== 1 && resolve(messages, pluralKey) != null
        return t(usePlural ? pluralKey : key, { count, ...vars })
      },
      [messages, t],
    )

    const value = useMemo<I18nValue<L>>(
      () => ({ locale, setLocale, t, tp, ready }),
      [locale, setLocale, t, tp, ready],
    )

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>
  }

  function useI18n(): I18nValue<L> {
    const ctx = useContext(Ctx)
    if (!ctx) throw new Error('useI18n must be used within <I18nProvider>')
    return ctx
  }

  /** Convenience: just the translate function. */
  function useT() {
    return useI18n().t
  }

  /**
   * Resolve PARTNER-AUTHORED content (a listing title, a salon name) to the
   * current locale, falling back to the base string.
   *
   * Distinct from `t()` on purpose: `t` reads our own UI copy from a bundle,
   * this reads a tenant's own words out of a row. Conflating them is how a
   * salon's name ends up looked up as a translation key.
   */
  function useLocalized() {
    const { locale } = useI18n()
    return useCallback(
      (base: string, i18n?: LocalizedText | null) => localize(base, i18n, locale),
      [locale],
    )
  }

  return {
    I18nProvider,
    useI18n,
    useT,
    useLocalized,
    detectInitialLocale,
    hasExplicitChoice,
    isLocale,
    locales,
    meta,
  }
}
