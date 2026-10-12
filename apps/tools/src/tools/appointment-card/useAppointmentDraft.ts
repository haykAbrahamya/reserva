import { useCallback, useMemo } from 'react'
import type { Locale } from '@/i18n'
import { toolEvents } from '@/lib/analytics/pulse'
import { addDays, today } from '@/lib/dates'
import { useStoredDraft } from '@/lib/useStoredDraft'
import { parseAppointment, type Appointment } from './model'
import { sampleAppointment } from './samples'

const STORAGE_KEY = 'reserva-tools:appointment-card:v1'
const events = toolEvents('appointmentCard')

/**
 * A stored draft for the editor. The salon, address and phone are what make
 * remembering worthwhile — they are the same on every card. A day already in
 * the past moves to tomorrow, and a missing time to 15:00, so the editor always
 * holds a card that can be sent.
 */
function parseDraft(value: unknown): Appointment | null {
  const draft = parseAppointment(value)
  if (!draft) return null
  return {
    ...draft,
    date: draft.date && draft.date >= today() ? draft.date : addDays(today(), 1),
    time: draft.time || '15:00',
  }
}

export type AppointmentField = keyof Appointment

/** The appointment card draft and every edit to it, remembered in this browser. */
export function useAppointmentDraft(locale: Locale) {
  const [draft, setStored] = useStoredDraft(STORAGE_KEY, parseDraft, () =>
    sampleAppointment(locale, addDays(today(), 1)),
  )
  // Every change goes through here, so the first one in a page view is counted.
  const setDraft: typeof setStored = useCallback((next) => {
    events.edited()
    setStored(next)
  }, [setStored])

  const actions = useMemo(
    () => ({
      setField(field: AppointmentField, value: string | number) {
        setDraft((d) => ({ ...d, [field]: value }))
      },
    }),
    [setDraft],
  )

  return { draft, ...actions }
}
