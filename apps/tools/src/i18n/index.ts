import { createI18n, type LocaleMeta, type Messages } from '@reserva/i18n'
import { appointmentCardCopy } from '@/tools/appointment-card/locales'
import { beforeAfterCopy } from '@/tools/before-after/locales'
import { freeSlotsCopy } from '@/tools/free-slots/locales'
import { giftCertificateCopy } from '@/tools/gift-certificate/locales'
import { priceListCopy } from '@/tools/price-list/locales'
import en from './locales/en.json'
import hy from './locales/hy.json'
import ru from './locales/ru.json'

// ─────────────────────────────────────────────────────────────
// This app's i18n instance. The engine lives in @reserva/i18n; only the config
// and the bundles are here. English is the source of truth for the copy (and
// the fallback for a missing key); Armenian is what a first-time visitor sees.
//
// Each tool owns its copy, next to its code (tools/<tool>/locales), mounted
// here under its registry id. The app bundles hold only what the shell, the
// home grid and the shared tool components need.
// ─────────────────────────────────────────────────────────────

export const LOCALES = ['hy', 'en', 'ru'] as const
export type Locale = (typeof LOCALES)[number]

export const LOCALE_META: Record<Locale, LocaleMeta> = {
  hy: { lang: 'hy-AM', native: 'Հայերեն', english: 'Armenian', short: 'ՀԱ', flag: '🇦🇲' },
  en: { lang: 'en', native: 'English', english: 'English', short: 'EN', flag: '🇬🇧' },
  ru: { lang: 'ru', native: 'Русский', english: 'Russian', short: 'RU', flag: '🇷🇺' },
}

const TOOL_COPY: Record<string, Record<Locale, Messages>> = {
  priceList: priceListCopy,
  freeSlots: freeSlotsCopy,
  giftCertificate: giftCertificateCopy,
  beforeAfter: beforeAfterCopy,
  appointmentCard: appointmentCardCopy,
}

const withTools = (locale: Locale, app: Messages): Messages => ({
  ...app,
  ...Object.fromEntries(Object.entries(TOOL_COPY).map(([namespace, copy]) => [namespace, copy[locale]])),
})

const i18n = createI18n<Locale>({
  locales: LOCALES,
  defaultLocale: 'hy',
  meta: LOCALE_META,
  bundled: { hy: withTools('hy', hy), en: withTools('en', en), ru: withTools('ru', ru) },
  storageKey: 'reserva-tools-locale',
  remoteBaseUrl: '',
})

export const { I18nProvider, useI18n, useT, useLocalized, hasExplicitChoice } = i18n
