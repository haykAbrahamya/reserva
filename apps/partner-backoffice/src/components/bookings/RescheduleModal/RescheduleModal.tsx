import { useState, useMemo } from 'react'
import { CalendarClock } from 'lucide-react'
import { Modal, Button, DatePicker, useToast } from '@/components/ui'
import { usePartner } from '@/store/app.store'
import { useResource } from '@/store/useResource'
import { bookingsService } from '@/services/bookings.service'
import { fmtDateInput, fmtDateTime } from '@/utils/format'
import { useT } from '@/i18n'
import type { Booking } from '@/types'
import s from './RescheduleModal.module.scss'

interface Props {
  booking: Booking
  onClose: () => void
  /** Called after a successful reschedule so the parent can refresh. */
  onDone?: () => void
}

export function RescheduleModal({ booking, onClose, onDone }: Props) {
  const partner       = usePartner()
  const toast         = useToast()
  const t             = useT()
  const today         = fmtDateInput(new Date())

  const start = new Date(booking.startISO)
  const currentDate = fmtDateInput(start)
  const currentTime = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`

  const [date, setDate] = useState(currentDate)
  const [time, setTime] = useState(currentTime)
  const [saving, setSaving] = useState(false)

  // Fresh bookings for the chosen day to mark taken slots (backend enforces overlaps).
  const { data: bookings } = useResource(
    () => bookingsService.calendar(`${date}T00:00:00`, `${date}T23:59:59`),
    [date],
    [],
  )

  const allSlots = useMemo(() => {
    const out: string[] = []
    for (let h = 8; h < 21; h++)
      for (let m = 0; m < 60; m += 30)
        out.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    return out
  }, [])

  // Slots taken by *other* live bookings for the same specialist on this day.
  const busySlots = useMemo(() => {
    const set = new Set<string>()
    bookings.forEach(b => {
      if (b.id === booking.id) return // never block our own slot
      if (b.specialistId !== booking.specialistId) return
      if (b.status === 'cancelled' || b.status === 'noshow') return
      const d = new Date(b.startISO)
      if (fmtDateInput(d) !== date) return
      set.add(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`)
    })
    return set
  }, [bookings, booking.id, booking.specialistId, date])

  if (!partner) return null

  const svc = booking.service
  const changed = date !== currentDate || time !== currentTime
  const canSave = !!time && !busySlots.has(time) && changed

  const handleSave = async () => {
    if (!canSave || !svc) return
    setSaving(true)
    const [h, m] = time.split(':').map(Number)
    const newStart = new Date(`${date}T00:00:00`)
    newStart.setHours(h, m, 0, 0)
    const newEnd = new Date(newStart.getTime() + svc.duration * 60_000)

    const updated = await bookingsService.update(booking.id, {
      startISO: newStart.toISOString(),
      endISO: newEnd.toISOString(),
    })
    setSaving(false)
    toast(t('reschedule.movedToast', { datetime: fmtDateTime(updated.startISO) }))
    onDone?.()
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t('reschedule.title')}
      subtitle={t('reschedule.subtitle', { name: booking.clientName })}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('reschedule.cancel')}</Button>
          <Button variant="accent" disabled={!canSave || saving} onClick={handleSave}>
            {saving ? t('reschedule.saving') : t('reschedule.save')}
          </Button>
        </>
      }
    >
      <div className={s.grid}>
        <div className={s.current}>
          <CalendarClock size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <span className={s.from}>
            {(() => {
              const [before, after] = t('reschedule.currently').split('{datetime}')
              return <>{before}<strong>{fmtDateTime(booking.startISO)}</strong>{after}</>
            })()}
          </span>
        </div>

        <div>
          <DatePicker label={t('reschedule.newDate')} value={date} min={today} onChange={setDate} />
        </div>

        <div>
          <label className={s.fieldLabel}>{t('reschedule.newTime')}</label>
          <div className={s.slotGrid}>
            {allSlots.map(sl => {
              const isCurrent = sl === currentTime && date === currentDate
              const busy = busySlots.has(sl)
              return (
                <button
                  key={sl}
                  type="button"
                  disabled={busy}
                  onClick={() => !busy && setTime(sl)}
                  className={[
                    s.slot,
                    time === sl ? s.selected : '',
                    busy ? s.busy : '',
                    isCurrent && time !== sl ? s.current : '',
                  ].filter(Boolean).join(' ')}
                >
                  {sl}
                </button>
              )
            })}
          </div>
        </div>

        {changed && time && svc && (
          <div className={s.preview}>
            <CalendarClock size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <span>
              {t('reschedule.preview', {
                date: new Date(date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }),
                time,
                service: svc.name,
                duration: svc.duration,
              })}
            </span>
          </div>
        )}
      </div>
    </Modal>
  )
}
