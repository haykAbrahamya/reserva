import type { Locale, Messages } from './config'
import { REMOTE_BASE_URL } from './config'

// Bundled fallbacks — always shipped with the app so the UI is never blank,
// even offline or before a remote bundle has loaded.
import en from './locales/en.json'
import hy from './locales/hy.json'
import ru from './locales/ru.json'

const BUNDLED: Record<Locale, Messages> = {
  en: en as Messages,
  hy: hy as Messages,
  ru: ru as Messages,
}

const cache = new Map<Locale, Messages>()

/**
 * Load a locale's messages: cache → remote (if configured) → bundled JSON.
 */
export async function loadLocale(locale: Locale): Promise<Messages> {
  if (cache.has(locale)) return cache.get(locale)!

  if (REMOTE_BASE_URL) {
    try {
      const res = await fetch(`${REMOTE_BASE_URL}/${locale}.json`, { cache: 'no-cache' })
      if (res.ok) {
        const remote = (await res.json()) as Messages
        cache.set(locale, remote)
        return remote
      }
    } catch {
      // Network/parse failure → fall through to the bundled copy.
    }
  }

  const bundled = BUNDLED[locale]
  cache.set(locale, bundled)
  return bundled
}

/** Synchronous bundled messages for the first paint. */
export function bundledMessages(locale: Locale): Messages {
  return BUNDLED[locale]
}
