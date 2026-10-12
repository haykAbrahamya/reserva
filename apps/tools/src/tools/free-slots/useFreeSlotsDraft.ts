import { useMemo } from 'react'
import type { Locale } from '@/i18n'
import { today } from '@/lib/dates'
import type { BrandField } from '@/lib/story/brand'
import type { StoryThemeId } from '@/lib/story/themes'
import { useStoredDraft } from '@/lib/useStoredDraft'
import { LIMITS, parseDraft } from './model'
import { sampleDraft } from './samples'
import { sortTimes } from './time'

const STORAGE_KEY = 'reserva-tools:free-slots:v1'

/** The free-slots draft and every edit to it, remembered in this browser. */
export function useFreeSlotsDraft(locale: Locale) {
  const [draft, setDraft] = useStoredDraft(
    STORAGE_KEY,
    (value) => parseDraft(value, today()),
    () => sampleDraft(locale, today()),
  )

  const actions = useMemo(
    () => ({
      setBrand(field: BrandField, value: string) {
        setDraft((d) => ({ ...d, [field]: value }))
      },

      setTheme(themeId: StoryThemeId) {
        setDraft((d) => ({ ...d, themeId }))
      },

      setDate(date: string) {
        setDraft((d) => ({ ...d, date }))
      },

      setNote(note: string) {
        setDraft((d) => ({ ...d, note }))
      },

      /** On if it is off, off if it is on — refused once the story is full. */
      toggleSlot(time: string) {
        setDraft((d) => {
          if (d.slots.includes(time)) return { ...d, slots: d.slots.filter((s) => s !== time) }
          if (d.slots.length >= LIMITS.slots) return d
          return { ...d, slots: sortTimes([...d.slots, time]) }
        })
      },

      clearSlots() {
        setDraft((d) => ({ ...d, slots: [] }))
      },
    }),
    [setDraft],
  )

  return { draft, ...actions }
}
