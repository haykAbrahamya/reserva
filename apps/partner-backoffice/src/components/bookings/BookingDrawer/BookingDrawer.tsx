import { useEffect, useState, useCallback } from 'react'
import { X, CalendarClock } from 'lucide-react'
import { useAppStore, usePartner } from '@/store/app.store'
import { Button, Avatar, BookingBadge } from '@/components/ui'
import { useToast } from '@/components/ui'
import { bookingsService } from '@/services/bookings.service'
import { fmtAMD, fmtDateTime, fmtDuration } from '@/utils/format'
import { useT } from '@/i18n'
import type { BookingStatus } from '@/types'
import { RescheduleModal } from '../RescheduleModal/RescheduleModal'
import s from './BookingDrawer.module.scss'

const CLOSE_MS = 300

const STATUS_ACTIONS: { status: BookingStatus; labelKey: string }[] = [
  { status: 'confirmed', labelKey: 'bookingDrawer.actions.confirm' },
  { status: 'completed', labelKey: 'bookingDrawer.actions.complete' },
  { status: 'cancelled', labelKey: 'bookingDrawer.actions.cancel' },
  { status: 'noshow',    labelKey: 'bookingDrawer.actions.noshow' },
]

interface Props {
  bookingId: string
  onClose: () => void
  /** On mobile render as a bottom sheet instead of a side drawer */
  sheet?: boolean
}

export function BookingDrawer({ bookingId, onClose, sheet }: Props) {
  const partner       = usePartner()
  const booking       = useAppStore(st => st.bookings.find(b => b.id === bookingId))
  const upsertBooking = useAppStore(st => st.upsertBooking)
  const toast         = useToast()
  const t             = useT()
  const [closing, setClosing] = useState(false)
  const [rescheduling, setRescheduling] = useState(false)

  // Play the exit animation, then actually unmount via the parent's onClose.
  const handleClose = useCallback(() => {
    setClosing(true)
    setTimeout(() => onClose(), CLOSE_MS)
  }, [onClose])

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [handleClose])

  if (!booking || !partner) return null

  const svc = partner.services.find(sv => sv.id === booking.serviceId)
  const sp  = partner.specialists.find(sp => sp.id === booking.specialistId)
  const loc = partner.locations.find(l  => l.id  === booking.locationId)

  const handleStatus = async (status: BookingStatus) => {
    const updated = await bookingsService.updateStatus(booking.id, status)
    upsertBooking(updated)
    toast(t('bookingDrawer.statusToast', { status: t(`status.${status}`).toLowerCase() }))
  }

  const canReschedule = booking.status === 'pending' || booking.status === 'confirmed'

  const inner = (
    <>
      {/* Status actions */}
      <div className={s.section}>
        <div className={s.label}>{t('bookingDrawer.status')}</div>
        <div className={s.statusRow}>
          {STATUS_ACTIONS.map(a => (
            <Button
              key={a.status}
              size="sm"
              variant={booking.status === a.status ? 'accent' : 'default'}
              onClick={() => handleStatus(a.status)}
            >
              {t(a.labelKey)}
            </Button>
          ))}
        </div>
      </div>

      {/* When */}
      <div className={s.section}>
        <div className={s.label}>{t('bookingDrawer.when')}</div>
        <div className={s.value}>{fmtDateTime(booking.startISO)}</div>
        {canReschedule && (
          <Button
            size="sm"
            variant="default"
            onClick={() => setRescheduling(true)}
            style={{ marginTop: 10, gap: 7 }}
          >
            <CalendarClock size={14} /> {t('bookingDrawer.reschedule')}
          </Button>
        )}
      </div>

      {/* Client */}
      <div className={s.section}>
        <div className={s.label}>{t('bookingDrawer.client')}</div>
        <div className={s.value}>{booking.clientName}</div>
        <div className={s.sub}>{booking.clientPhone}</div>
      </div>

      {/* Service */}
      {svc && (
        <div className={s.section}>
          <div className={s.label}>{t('bookingDrawer.service')}</div>
          <div className={s.value}>{svc.name}</div>
          <div className={s.sub}>{fmtDuration(svc.duration)} · {fmtAMD(svc.price)}</div>
        </div>
      )}

      {/* Specialist */}
      {sp && (
        <div className={s.section}>
          <div className={s.label}>{t('bookingDrawer.specialist')}</div>
          <div className={s.spRow}>
            <Avatar name={sp.name} color={partner.accent} size="md" />
            <div>
              <div className={s.value}>{sp.name}</div>
              <div className={s.sub}>{sp.title}</div>
            </div>
          </div>
        </div>
      )}

      {/* Location */}
      {loc && (
        <div className={s.section}>
          <div className={s.label}>{t('bookingDrawer.location')}</div>
          <div className={s.value}>{loc.name}</div>
          <div className={s.sub}>{loc.address}</div>
        </div>
      )}
    </>
  )

  const rescheduleModal = rescheduling && (
    <RescheduleModal booking={booking} onClose={() => setRescheduling(false)} />
  )

  if (sheet) {
    return (
      <>
        <div
          className={[s.sheetScrim, closing ? s.closing : ''].filter(Boolean).join(' ')}
          onClick={handleClose}
        />
        <div className={[s.sheet, closing ? s.closing : ''].filter(Boolean).join(' ')}>
          <div className={s.grab} />
          <div className={s.sheetHead}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div className={s.clientName}>{booking.clientName}</div>
                <div className={s.clientPhone}>{booking.clientPhone}</div>
                <div className={s.datetime}>{fmtDateTime(booking.startISO)}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <BookingBadge status={booking.status} />
                <Button variant="ghost" size="sm" icon onClick={handleClose}><X size={14} /></Button>
              </div>
            </div>
          </div>
          <div className={s.sheetBody}>{inner}</div>
        </div>
        {rescheduleModal}
      </>
    )
  }

  // Desktop: side drawer
  return (
    <>
      <div
        className={[s.drawerScrim, closing ? s.closing : ''].filter(Boolean).join(' ')}
        onClick={handleClose}
      />
      <div className={[s.drawer, closing ? s.closing : ''].filter(Boolean).join(' ')}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '16px 22px', borderBottom: '1px solid var(--line-1)', flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, letterSpacing: '-0.01em' }}>{booking.clientName}</div>
            <div style={{ fontSize: 12, color: 'var(--fg-2)', marginTop: 2 }}>{fmtDateTime(booking.startISO)}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookingBadge status={booking.status} />
            <Button variant="ghost" size="sm" icon onClick={handleClose}><X size={14} /></Button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 22px 32px' }}>{inner}</div>
      </div>
      {rescheduleModal}
    </>
  )
}
