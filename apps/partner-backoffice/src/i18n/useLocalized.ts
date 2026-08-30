import { useCallback } from 'react'
import { localize, type LocalizedText } from '@reserva/shared'
import { useI18n } from './I18nProvider'

/**
 * Resolve a translatable field for the current UI language.
 *
 * Two kinds of content flow through this. Partner-authored fields carry
 * translations as OPTIONAL overrides and fall back to the base value. Platform
 * catalog rows (specialties) carry them as required data — the fallback exists
 * only to keep the UI rendering if a row is ever seeded without one.
 */
export function useLocalized(): (base: string, i18n?: LocalizedText | null) => string {
  const { locale } = useI18n()
  return useCallback((base: string, i18n?: LocalizedText | null) => localize(base, i18n, locale), [locale])
}
