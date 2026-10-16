import { useCallback, useMemo, useRef } from 'react'
import type { Locale } from '@/i18n'
import { toolEvents } from '@/lib/analytics/pulse'
import { today } from '@/lib/dates'
import type { BrandField } from '@/lib/story/brand'
import type { StoryThemeId } from '@/lib/story/themes'
import { useStoredDraft } from '@/lib/useStoredDraft'
import { LIMITS, newItem, parseDraft, type PromoDraft, type PromoItem, type PromoLayout } from './model'
import { sampleDraft } from './samples'

const STORAGE_KEY = 'reserva-tools:promo:v1'
const events = toolEvents('promo')

export type PromoField = keyof Pick<PromoDraft, 'offer' | 'until' | 'note'>

/** The promo draft and every edit to it, remembered in this browser. */
export function usePromoDraft(locale: Locale) {
  const [draft, setStored] = useStoredDraft(STORAGE_KEY, parseDraft, () => sampleDraft(locale, today()))
  // Every change goes through here, so the first one in a page view is counted.
  const setDraft: typeof setStored = useCallback((next) => {
    events.edited()
    setStored(next)
  }, [setStored])

  // The latest draft, for the one action that must answer synchronously
  // (addItem). A state updater cannot: React runs it later, during render.
  const draftRef = useRef(draft)
  draftRef.current = draft

  const actions = useMemo(
    () => ({
      setBrand(field: BrandField, value: string) {
        setDraft((d) => ({ ...d, [field]: value }))
      },

      setTheme(themeId: StoryThemeId) {
        setDraft((d) => ({ ...d, themeId }))
        events.action('theme', themeId)
      },

      setLayout(layout: PromoLayout) {
        setDraft((d) => ({ ...d, layout }))
        events.action('layout', layout)
      },

      setDiscount(discount: number) {
        setDraft((d) => ({ ...d, discount }))
      },

      setField(field: PromoField, value: string) {
        setDraft((d) => ({ ...d, [field]: value }))
      },

      updateItem(id: string, patch: Partial<Omit<PromoItem, 'id'>>) {
        setDraft((d) => ({ ...d, items: d.items.map((item) => (item.id === id ? { ...item, ...patch } : item)) }))
      },

      /** Appends an empty row and returns its id, or null when the list is full. */
      addItem(): string | null {
        if (draftRef.current.items.length >= LIMITS.items) return null
        const item = newItem()
        setDraft((d) => (d.items.length >= LIMITS.items ? d : { ...d, items: [...d.items, item] }))
        events.action('add')
        return item.id
      },

      /** Removes a row. The list never goes fully empty — there is always a row to type in. */
      removeItem(id: string) {
        setDraft((d) => {
          const items = d.items.filter((item) => item.id !== id)
          return { ...d, items: items.length ? items : [newItem()] }
        })
        events.action('remove')
      },

      clearItems() {
        setDraft((d) => ({ ...d, items: [newItem()] }))
        events.action('clear')
      },
    }),
    [setDraft],
  )

  return { draft, ...actions }
}
