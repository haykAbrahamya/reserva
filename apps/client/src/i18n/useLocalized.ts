import { localize, type LocalizedText } from '@reserva/shared'
import { useI18n } from './I18nProvider'

/**
 * Resolve tenant-authored content (service names, category, tagline, about,
 * specialist title, …) to the visitor's current locale, falling back to the
 * base string when a translation is missing. Content translations are separate
 * from the static-UI `t()` system — this is for salon-entered data.
 *
 *   const loc = useLocalized()
 *   loc(sv.name, sv.nameI18n)   // → localized name or the base name
 */
export function useLocalized() {
  const { locale } = useI18n()
  return (base: string, i18n?: LocalizedText | null) => localize(base, i18n, locale)
}
