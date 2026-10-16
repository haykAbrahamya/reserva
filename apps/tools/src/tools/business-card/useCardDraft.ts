import { useCallback, useMemo } from 'react'
import type { Locale } from '@/i18n'
import { toolEvents } from '@/lib/analytics/pulse'
import type { StoryThemeId } from '@/lib/story/themes'
import { useStoredDraft } from '@/lib/useStoredDraft'
import { MESSENGERS, parseDraft, type CardDraft, type CardLayout, type Messenger, type QrTarget } from './model'
import { sampleDraft } from './samples'

const STORAGE_KEY = 'reserva-tools:business-card:v1'
const events = toolEvents('businessCard')

export type CardField = keyof Pick<CardDraft, 'name' | 'role' | 'instagram' | 'phone' | 'address' | 'website'>

/** The business card draft and every edit to it, remembered in this browser. */
export function useCardDraft(locale: Locale) {
  const [draft, setStored] = useStoredDraft(STORAGE_KEY, parseDraft, () => sampleDraft(locale))
  // Every change goes through here, so the first one in a page view is counted.
  const setDraft: typeof setStored = useCallback((next) => {
    events.edited()
    setStored(next)
  }, [setStored])

  const actions = useMemo(
    () => ({
      setField(field: CardField, value: string) {
        setDraft((d) => ({ ...d, [field]: value }))
      },

      setTheme(themeId: StoryThemeId) {
        setDraft((d) => ({ ...d, themeId }))
        events.action('theme', themeId)
      },

      setLayout(layout: CardLayout) {
        setDraft((d) => ({ ...d, layout }))
        events.action('layout', layout)
      },

      /** Adds or removes a messenger, keeping them in a fixed order. */
      toggleMessenger(messenger: Messenger) {
        setDraft((d) => {
          const on = d.messengers.includes(messenger)
          return { ...d, messengers: MESSENGERS.filter((m) => (m === messenger ? !on : d.messengers.includes(m))) }
        })
      },

      setQr(qr: QrTarget) {
        setDraft((d) => ({ ...d, qr }))
        events.action('qr', qr)
      },
    }),
    [setDraft],
  )

  return { draft, ...actions }
}
