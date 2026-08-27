import { useState, useMemo } from 'react'
import { CalendarClock } from 'lucide-react'
import { Modal, Button, DatePicker, useToast } from '@/components/ui'
import { usePartner } from '@/store/app.store'
import { useResource } from '@/store/useResource'
import { bookingsService } from '@/services/bookings.service'
import { fmtDateInput, fmtDateTime } from '@/utils/format'
import { useT, useDateLocale, useDatePickerLabels } from '@/i18n'
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
  const dateLocale    = useDateLocale()
  const dateLabels    = useDatePickerLabels()
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

  // Full 24 hours at 30-minute steps. Deliberately NOT clipped to a daytime
  // window: a late-night salon works past midnight (18:00–02:30), and an
  // 08:00–20:30 grid made most of its own shift unreachable for staff. The
  // backend still enforces working hours, so an out-of-hours pick is rejected
  // there — exactly as it already was for early slots at a 10:00 salon.
  const allSlots = useMemo(() => {
    const out: string[] = []
    for (let h = 0; h < 24; h++)
      for (let m = 0; m < 60; m += 30)
        out.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    return out
  }, [])

  // A facility/entry booking (spa, no specialist) is gated by concurrent
  // capacity for its service+location; a person booking by the specialist.
  const isFacility = booking.specialistId === null
  const capacity = Math.max(1, booking.service?.capacity ?? 1)
  const slotMin = booking.service?.duration ?? 30

  const busySlots = useMemo(() => {
    const set = new Set<string>()

    if (isFacility) {
      // Other live facility bookings for THIS service+location.
      const windows = bookings
        .filter(b =>
          b.id !== booking.id &&
          b.serviceId === booking.serviceId &&
          b.locationId === booking.locationId &&
          b.status !== 'cancelled' && b.status !== 'noshow',
        )
        .map(b => [new Date(b.startISO).getTime(), new Date(b.endISO).getTime()] as const)
      // Walk the SAME grid the picker offers, so the two can't drift apart.
      for (const slot of allSlots) {
        const [h, m] = slot.split(':').map(Number)
        const start = new Date(`${date}T00:00:00`); start.setHours(h, m, 0, 0)
        const s0 = start.getTime(), e0 = s0 + slotMin * 60_000
        const overlapping = windows.filter(([bs, be]) => s0 < be && bs < e0).length
        if (overlapping >= capacity) set.add(slot)
      }
      return set
    }

    // Slots taken by *other* live bookings for the same specialist on this day.
    bookings.forEach(b => {
      if (b.id === booking.id) return // never block our own slot
      if (b.specialistId !== booking.specialistId) return
      if (b.status === 'cancelled' || b.status === 'noshow') return
      const d = new Date(b.startISO)
      if (fmtDateInput(d) !== date) return
      set.add(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`)
    })
    return set
  }, [bookings, booking.id, booking.specialistId, booking.serviceId, booking.locationId, date, isFacility, capacity, slotMin, allSlots])

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
          <DatePicker label={t('reschedule.newDate')} value={date} min={today} onChange={setDate} labels={dateLabels} />
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
                date: new Date(date).toLocaleDateString(dateLocale, { weekday: 'long', day: 'numeric', month: 'long' }),
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
