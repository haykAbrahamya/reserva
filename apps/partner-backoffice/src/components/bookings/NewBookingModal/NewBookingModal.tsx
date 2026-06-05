import { useState, useMemo, useEffect } from 'react'
import { Calendar } from 'lucide-react'
import { Modal, Input, Select, Button, DatePicker, useToast } from '@/components/ui'
import { useAppStore, usePartner } from '@/store/app.store'
import { useScopedLocationId } from '@/store/auth.hooks'
import { bookingsService } from '@/services/bookings.service'
import { partnersService } from '@/services/partners.service'
import { slotBlockedByTimeOff } from '@/utils/timeOff'
import { fmtDateInput } from '@/utils/format'
import { useT } from '@/i18n'
import type { SpecialistTimeOff } from '@/types'
import s from './NewBookingModal.module.scss'

interface Props {
  open: boolean
  onClose: () => void
  initialDate?: string
  initialTime?: string
}

export function NewBookingModal({ open, onClose, initialDate, initialTime }: Props) {
  const partner       = usePartner()
  const bookings      = useAppStore(st => st.bookings)
  const upsertBooking = useAppStore(st => st.upsertBooking)
  const toast         = useToast()
  const scopedLocationId = useScopedLocationId()
  const t             = useT()
  const today         = fmtDateInput(new Date())

  // All hooks must be declared before any conditional return
  const [locationId,   setLocationId]   = useState(scopedLocationId ?? '')
  const [serviceId,    setServiceId]    = useState('')
  const [specialistId, setSpecialistId] = useState('')
  const [date,         setDate]         = useState(initialDate ?? today)
  const [time,         setTime]         = useState(initialTime ?? '')
  const [clientName,   setClientName]   = useState('')
  const [clientPhone,  setClientPhone]  = useState('')

  const allSlots = useMemo(() => {
    const out: string[] = []
    for (let h = 8; h < 21; h++)
      for (let m = 0; m < 60; m += 30)
        out.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    return out
  }, [])

  // Time off for the selected specialist — blocks slots just like bookings do.
  const [timeOff, setTimeOff] = useState<SpecialistTimeOff[]>([])
  useEffect(() => {
    if (!specialistId) { setTimeOff([]); return }
    let active = true
    partnersService.listTimeOff(specialistId).then(t => { if (active) setTimeOff(t) })
    return () => { active = false }
  }, [specialistId])

  const busySlots = useMemo(() => {
    const set = new Set<string>()
    if (!specialistId || !date || !partner) return set
    bookings.forEach(b => {
      if (b.specialistId !== specialistId) return
      if (b.status === 'cancelled' || b.status === 'noshow') return
      const d = new Date(b.startISO)
      if (fmtDateInput(d) !== date) return
      set.add(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`)
    })
    // Block slots that fall inside a time-off window. A slot is the service's
    // duration (default 30m) starting at the slot time.
    const svc = partner.services.find(sv => sv.id === serviceId)
    const slotMin = svc?.duration ?? 30
    for (let h = 8; h < 21; h++) {
      for (let m = 0; m < 60; m += 30) {
        const start = new Date(`${date}T00:00:00`); start.setHours(h, m, 0, 0)
        const end = new Date(start.getTime() + slotMin * 60_000)
        if (slotBlockedByTimeOff(timeOff, specialistId, start.getTime(), end.getTime())) {
          set.add(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
        }
      }
    }
    return set
  }, [bookings, specialistId, date, partner, serviceId, timeOff])

  // When a manager opens the modal, force their branch as the location.
  useEffect(() => {
    if (open && scopedLocationId) setLocationId(scopedLocationId)
  }, [open, scopedLocationId])

  // Early return AFTER all hooks
  if (!partner) return null

  const locations   = partner.locations
  const specialists = partner.specialists.filter(sp =>
    sp.active && (!locationId || sp.locationId === locationId)
  )
  const services = partner.services.filter(sv =>
    sv.active && (!specialistId || partner.specialists.find(sp => sp.id === specialistId)?.services.includes(sv.id))
  )
  const selectedService = partner.services.find(sv => sv.id === serviceId)
  const canSubmit = locationId && serviceId && specialistId && date && time && clientName && clientPhone

  const handleSubmit = async () => {
    if (!canSubmit || !selectedService) return
    const [h, m] = time.split(':').map(Number)
    const start = new Date(`${date}T00:00:00`)
    start.setHours(h, m, 0, 0)
    const end = new Date(start.getTime() + selectedService.duration * 60_000)

    const booking = await bookingsService.create({
      partnerId: partner.id, locationId, specialistId, serviceId,
      clientName, clientPhone,
      startISO: start.toISOString(), endISO: end.toISOString(),
      status: 'confirmed',
    })
    upsertBooking(booking)
    toast(t('newBooking.confirmedToast', { name: clientName }))
    onClose()
    setLocationId(scopedLocationId ?? ''); setServiceId(''); setSpecialistId('')
    setDate(today);   setTime('');   setClientName(''); setClientPhone('')
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('newBooking.title')}
      subtitle={t('newBooking.subtitle')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="accent" disabled={!canSubmit} onClick={handleSubmit}>
            {t('newBooking.confirm')}
          </Button>
        </>
      }
    >
      <div className={s.grid}>
        <div className={s.full}>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-1)', display: 'block', marginBottom: 6 }}>{t('newBooking.locationLabel')}</label>
          <Select
            value={locationId}
            onChange={v => { setLocationId(v); setSpecialistId('') }}
            options={locations.map(l => ({ value: l.id, label: l.name, sub: l.address }))}
            placeholder={t('newBooking.locationPlaceholder')}
            disabled={!!scopedLocationId}
          />
        </div>

        <div className={s.full}>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-1)', display: 'block', marginBottom: 6 }}>{t('newBooking.serviceLabel')}</label>
          <Select
            value={serviceId}
            onChange={setServiceId}
            options={services.map(sv => ({ value: sv.id, label: sv.name, sub: t('newBooking.serviceSub', { duration: sv.duration, price: sv.price.toLocaleString() }) }))}
            placeholder={t('newBooking.servicePlaceholder')}
          />
        </div>

        <div className={s.full}>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-1)', display: 'block', marginBottom: 6 }}>{t('newBooking.specialistLabel')}</label>
          <Select
            value={specialistId}
            onChange={setSpecialistId}
            options={specialists.map(sp => ({ value: sp.id, label: sp.name, sub: sp.title }))}
            placeholder={t('newBooking.specialistPlaceholder')}
            disabled={!locationId}
          />
        </div>

        <div>
          <DatePicker label={t('newBooking.dateLabel')} value={date} min={today} onChange={setDate} />
        </div>

        <div className={s.full}>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-1)', display: 'block', marginBottom: 6 }}>{t('newBooking.timeLabel')}</label>
          {specialistId && date ? (
            <div className={s.slotGrid}>
              {allSlots.map(sl => (
                <button
                  key={sl}
                  type="button"
                  disabled={busySlots.has(sl)}
                  onClick={() => !busySlots.has(sl) && setTime(sl)}
                  className={[s.slot, time === sl ? s.selected : '', busySlots.has(sl) ? s.busy : ''].filter(Boolean).join(' ')}
                >
                  {sl}
                </button>
              ))}
            </div>
          ) : (
            <div className={s.infoBox}>
              <Calendar size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <span>{t('newBooking.slotsHint')}</span>
            </div>
          )}
        </div>

        <Input label={t('newBooking.clientNameLabel')}  value={clientName}  onChange={e => setClientName(e.target.value)}  placeholder={t('newBooking.clientNamePlaceholder')} />
        <Input label={t('newBooking.clientPhoneLabel')} value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder={t('newBooking.clientPhonePlaceholder')} />

        {time && selectedService && (
          <div className={[s.full, s.infoBox].join(' ')}>
            <Calendar size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <span>
              {t('newBooking.summary', {
                date: new Date(date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }),
                time,
                service: selectedService.name,
                duration: selectedService.duration,
              })}
            </span>
          </div>
        )}
      </div>
    </Modal>
  )
}
