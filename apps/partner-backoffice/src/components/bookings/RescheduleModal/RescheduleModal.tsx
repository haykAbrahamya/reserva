import { useState } from 'react'
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

  // Real bookable times from the server — working hours (incl. overnight
  // shifts) − time-off − other bookings − past, from the same engine the public
  // page uses. `excludeBookingId` keeps THIS booking's own slot pickable so the
  // form opens on its current time. Previously this was a fixed hourly grid that
  // ignored working hours, offering times the server then rejected.
  const { data: slots, loading: slotsLoading } = useResource(
    () =>
      date
        ? bookingsService.slots({
            serviceId: booking.serviceId,
            locationId: booking.locationId,
            ...(booking.specialistId ? { specialistId: booking.specialistId } : {}),
            date,
            excludeBookingId: booking.id,
          })
        : Promise.resolve([]),
    [date, booking.serviceId, booking.locationId, booking.specialistId, booking.id],
    [],
  )

  if (!partner) return null

  const svc = booking.service
  const changed = date !== currentDate || time !== currentTime
  // Every offered slot is bookable, so "can save" just means the chosen time
  // is still in the current list (it may have dropped out when the date changed).
  const canSave = !!time && slots.includes(time) && changed

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
          {slotsLoading ? (
            <div className={s.emptyNote}>{t('common.loading')}</div>
          ) : slots.length === 0 ? (
            <div className={s.emptyNote}>{t('newBooking.noSlots')}</div>
          ) : (
          <div className={s.slotGrid}>
            {slots.map(sl => {
              const isCurrent = sl === currentTime && date === currentDate
              return (
                <button
                  key={sl}
                  type="button"
                  onClick={() => setTime(sl)}
                  className={[
                    s.slot,
                    time === sl ? s.selected : '',
                    isCurrent && time !== sl ? s.current : '',
                  ].filter(Boolean).join(' ')}
                >
                  {sl}
                </button>
              )
            })}
          </div>
          )}
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
