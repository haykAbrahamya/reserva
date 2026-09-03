import { createI18n, type LocaleMeta } from '@reserva/i18n'
import en from './locales/en.json'
import hy from './locales/hy.json'
import ru from './locales/ru.json'

// ─────────────────────────────────────────────────────────────
// This app's i18n instance.
//
// The engine lives in @reserva/i18n; only the config and the bundles are here.
// English is the source of truth for the copy (and the fallback when a key is
// missing), Armenian is what a first-time visitor sees.
// ─────────────────────────────────────────────────────────────

export const LOCALES = ['hy', 'en', 'ru'] as const
export type Locale = (typeof LOCALES)[number]

export const LOCALE_META: Record<Locale, LocaleMeta> = {
  hy: { lang: 'hy-AM', native: 'Հայերեն', english: 'Armenian', short: 'ՀԱ', flag: '🇦🇲' },
  en: { lang: 'en', native: 'English', english: 'English', short: 'EN', flag: '🇬🇧' },
  ru: { lang: 'ru', native: 'Русский', english: 'Russian', short: 'RU', flag: '🇷🇺' },
}

const i18n = createI18n<Locale>({
  locales: LOCALES,
  // An Armenian-market product: a first-time visitor gets Armenian, and their
  // own choice is remembered from then on. Deliberately not derived from
  // navigator.language.
  defaultLocale: 'hy',
  meta: LOCALE_META,
  bundled: { hy, en, ru },
  storageKey: 'reserva-vacancies-locale',
  // Set this once translations are served rather than built in — the whole
  // remote switch is this one line.
  remoteBaseUrl: '',
})

export const { I18nProvider, useI18n, useT, useLocalized } = i18n
