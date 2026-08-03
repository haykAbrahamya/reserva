/**
 * i18n configuration.
 *
 * Translations live in per-locale JSON files (one file per language) so each
 * can be edited — and later served remotely — independently. Today they're
 * bundled; when the servers are ready, swap `loadLocale()` for a fetch from
 * the remote bundle URL and nothing else in the app needs to change.
 */

export const LOCALES = ['en', 'hy', 'ru'] as const
export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'hy'

/** A translation bundle is an arbitrarily-nested map of strings. */
export type Messages = { [key: string]: string | Messages }

export interface LocaleMeta {
  /** BCP-47 tag applied to <html lang>. */
  lang: string
  /** Native language name, shown in the switcher. */
  native: string
  /** Short English name. */
  english: string
  /** 2-letter code shown in the compact switcher pill. */
  short: string
  /** Small flag-ish glyph for flair. */
  flag: string
}

export const LOCALE_META: Record<Locale, LocaleMeta> = {
  // English is a lingua franca, not a country — show the neutral "EN" glyph
  // instead of a national (GB) flag so it doesn't imply British-only English.
  en: { lang: 'en',    native: 'English',  english: 'English',  short: 'EN', flag: 'EN' },
  hy: { lang: 'hy-AM', native: 'Հայերեն',  english: 'Armenian', short: 'ՀԱ', flag: '🇦🇲' },
  ru: { lang: 'ru',    native: 'Русский',  english: 'Russian',  short: 'RU', flag: '🇷🇺' },
}

export const STORAGE_KEY = 'reserva-bo-locale'

/**
 * Where remote bundles will live once servers are up. Today unused — bundles
 * are imported locally. Kept here so the remote switch is a one-line change.
 */
export const REMOTE_BASE_URL = '' // e.g. 'https://cdn.reserva.am/i18n/backoffice'

export function isLocale(v: unknown): v is Locale {
  return typeof v === 'string' && (LOCALES as readonly string[]).includes(v)
}

/**
 * Resolve the initial locale: an explicit saved choice wins; otherwise default
 * to Armenian. We intentionally do NOT auto-switch to the browser language —
 * this is an Armenian-market product, so the backoffice opens in Armenian until
 * the user picks another language (their choice is then remembered).
 */
export function detectInitialLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE
  const saved = window.localStorage.getItem(STORAGE_KEY)
  if (isLocale(saved)) return saved
  return DEFAULT_LOCALE
}
