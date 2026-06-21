import { useI18n } from './I18nProvider'
import { LOCALE_META } from './config'

/**
 * BCP-47 tag for the active UI locale, for `toLocaleDateString` / `Intl`.
 * Centralised so date/time output follows the chosen language instead of a
 * hardcoded 'en-GB' (which left weekday/month names in English on hy/ru).
 */
export function useDateLocale(): string {
  const { locale } = useI18n()
  return LOCALE_META[locale].lang
}
