import { useMemo } from 'react'
import type { Locale } from '@/i18n'
import { today } from '@/lib/dates'
import type { BrandField } from '@/lib/story/brand'
import type { StoryThemeId } from '@/lib/story/themes'
import { useStoredDraft } from '@/lib/useStoredDraft'
import { newCode, parseDraft, type GiftDraft } from './model'
import { sampleDraft } from './samples'

const STORAGE_KEY = 'reserva-tools:gift-certificate:v1'

export type GiftField = keyof Pick<GiftDraft, 'value' | 'recipient' | 'sender' | 'message' | 'validUntil' | 'code'>

/** The gift certificate draft and every edit to it, remembered in this browser. */
export function useGiftDraft(locale: Locale) {
  const [draft, setDraft] = useStoredDraft(STORAGE_KEY, parseDraft, () => sampleDraft(locale, today()))

  const actions = useMemo(
    () => ({
      setBrand(field: BrandField, value: string) {
        setDraft((d) => ({ ...d, [field]: value }))
      },

      setTheme(themeId: StoryThemeId) {
        setDraft((d) => ({ ...d, themeId }))
      },

      setField(field: GiftField, value: string) {
        setDraft((d) => ({ ...d, [field]: value }))
      },

      /** A new number for the next certificate — each one should be told apart. */
      renewCode() {
        setDraft((d) => ({ ...d, code: newCode() }))
      },
    }),
    [setDraft],
  )

  return { draft, ...actions }
}
