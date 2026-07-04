import { useEffect, useState, useCallback } from 'react'
import { X, CalendarClock } from 'lucide-react'
import { usePartner } from '@/store/app.store'
import { useResource } from '@/store/useResource'
import { Button, Avatar, BookingBadge, Modal, Input } from '@/components/ui'
import { useToast } from '@/components/ui'
import { bookingsService } from '@/services/bookings.service'
import { fmtAMD, fmtServicePrice, fmtDateTime, fmtDuration } from '@/utils/format'
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

/**
 * Small dialog to capture the exact charged amount for a range-priced booking.
 * Reused both when completing a booking and when editing an already-set price.
 */
function FinalPriceModal({
  rangeHint,
  initial,
  saveLabelKey,
  onCancel,
  onSubmit,
}: {
  rangeHint: string
  initial: number
  saveLabelKey: string
  onCancel: () => void
  onSubmit: (amount: number) => void | Promise<void>
}) {
  const t = useT()
  const [value, setValue] = useState(String(initial))
  const [saving, setSaving] = useState(false)

  const amount = Number(value)
  const valid = value.trim() !== '' && Number.isFinite(amount) && amount >= 0

  const submit = async () => {
    if (!valid || saving) return
    setSaving(true)
    try {
      await onSubmit(Math.round(amount))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onCancel}
      title={t('bookingDrawer.finalPriceModalTitle')}
      subtitle={t('bookingDrawer.finalPriceModalDesc')}
      size="sm"
      footer={
        <div className={s.modalActions}>
          <Button variant="default" size="sm" onClick={onCancel}>{t('common.cancel')}</Button>
          <Button variant="accent" size="sm" disabled={!valid || saving} onClick={submit}>
            {t(saveLabelKey)}
          </Button>
        </div>
      }
    >
      <div className={s.modalHint}>{t('bookingDrawer.bookedRange', { range: rangeHint })}</div>
      <Input
        type="number"
        min={0}
        label={t('bookingDrawer.amountLabel')}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') void submit() }}
        autoFocus
      />
    </Modal>
  )
}

interface Props {
  bookingId: string
  onClose: () => void
  /** On mobile render as a bottom sheet instead of a side drawer */
  sheet?: boolean
  /** Called after a status change / reschedule so the parent list can refresh. */
  onChanged?: () => void
}

export function BookingDrawer({ bookingId, onClose, sheet, onChanged }: Props) {
  const partner       = usePartner()
  const { data: booking, reload } = useResource(() => bookingsService.get(bookingId), [bookingId])
  const toast         = useToast()
  const t             = useT()
  const [closing, setClosing] = useState(false)
  const [rescheduling, setRescheduling] = useState(false)
  // Final-price dialog: 'complete' captures the price then completes the booking;
  // 'edit' just corrects an already-recorded final price.
  const [priceModal, setPriceModal] = useState<null | 'complete' | 'edit'>(null)

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

  const svc = booking.service
  const sp  = booking.specialist
  const loc = booking.location

  const isRange = svc?.priceType === 'range'

  const statusToast = (status: BookingStatus) =>
    toast(t('bookingDrawer.statusToast', { status: t(`status.${status}`).toLowerCase() }))

  const handleStatus = async (status: BookingStatus) => {
    // Completing a range-priced booking requires the exact final amount first.
    if (status === 'completed' && isRange && booking.finalPrice == null) {
      setPriceModal('complete')
      return
    }
    await bookingsService.updateStatus(booking.id, status)
    await reload()
    onChanged?.()
    statusToast(status)
  }

  // Complete + record the final price for a range booking.
  const completeWithPrice = async (amount: number) => {
    await bookingsService.updateStatus(booking.id, 'completed', amount)
    setPriceModal(null)
    await reload()
    onChanged?.()
    statusToast('completed')
  }

  // Edit/correct an existing final price.
  const editFinalPrice = async (amount: number) => {
    await bookingsService.setFinalPrice(booking.id, amount)
    setPriceModal(null)
    await reload()
    onChanged?.()
    toast(t('bookingDrawer.statusToast', { status: t('bookingDrawer.finalPrice').toLowerCase() }))
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
          <div className={s.sub}>{fmtDuration(svc.duration)} · {fmtServicePrice(svc)}</div>
        </div>
      )}

      {/* Final price — only for range-priced services */}
      {svc && isRange && (
        <div className={s.section}>
          <div className={s.label}>{t('bookingDrawer.finalPrice')}</div>
          <div className={s.finalPriceRow}>
            {booking.finalPrice != null ? (
              <>
                <div className={s.finalPriceValue}>{fmtAMD(booking.finalPrice)}</div>
                <Button size="sm" variant="default" onClick={() => setPriceModal('edit')}>
                  {t('bookingDrawer.editPrice')}
                </Button>
              </>
            ) : booking.status === 'completed' ? (
              <>
                <div className={s.finalPriceEmpty}>{t('bookingDrawer.finalPriceNotSet')}</div>
                <Button size="sm" variant="accent" onClick={() => setPriceModal('edit')}>
                  {t('bookingDrawer.setPrice')}
                </Button>
              </>
            ) : (
              <div className={s.finalPriceEmpty}>{t('bookingDrawer.finalPriceNotSet')}</div>
            )}
          </div>
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
    <RescheduleModal
      booking={booking}
      onClose={() => setRescheduling(false)}
      onDone={() => { void reload(); onChanged?.() }}
    />
  )

  const finalPriceModal = priceModal && svc && (
    <FinalPriceModal
      rangeHint={fmtServicePrice(svc)}
      initial={booking.finalPrice ?? booking.priceAtBooking ?? svc.price}
      saveLabelKey={priceModal === 'complete' ? 'bookingDrawer.completeAndSave' : 'bookingDrawer.saveFinalPrice'}
      onCancel={() => setPriceModal(null)}
      onSubmit={priceModal === 'complete' ? completeWithPrice : editFinalPrice}
    />
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
        {finalPriceModal}
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
      {finalPriceModal}
    </>
  )
}
