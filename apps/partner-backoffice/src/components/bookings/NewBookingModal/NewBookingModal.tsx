import { useState, useMemo, useEffect } from 'react'
import { Calendar } from 'lucide-react'
import { Modal, Input, Select, Button, DatePicker, useToast } from '@/components/ui'
import { usePartner } from '@/store/app.store'
import { useResource } from '@/store/useResource'
import { useScopedLocationId } from '@/store/auth.hooks'
import { bookingsService } from '@/services/bookings.service'
import { partnersService } from '@/services/partners.service'
import { slotBlockedByTimeOff } from '@/utils/timeOff'
import { fmtDateInput } from '@/utils/format'
import { useT, useDateLocale } from '@/i18n'
import type { SpecialistTimeOff } from '@/types'
import s from './NewBookingModal.module.scss'

interface Props {
  open: boolean
  onClose: () => void
  initialDate?: string
  initialTime?: string
  /** Called after a booking is created so any open list can refresh. */
  onCreated?: () => void
}

export function NewBookingModal({ open, onClose, initialDate, initialTime, onCreated }: Props) {
  const partner       = usePartner()
  // Catalog is fetched only while the modal is open (it's mounted globally).
  const { data: svcCatalog }  = useResource(() => (open ? partnersService.listServices() : Promise.resolve([])), [open], [])
  const { data: spCatalog }   = useResource(() => (open ? partnersService.listSpecialists() : Promise.resolve([])), [open], [])
  const { data: locCatalog }  = useResource(() => (open ? partnersService.listLocations() : Promise.resolve([])), [open], [])
  const toast         = useToast()
  const scopedLocationId = useScopedLocationId()
  const t             = useT()
  const dateLocale    = useDateLocale()
  const today         = fmtDateInput(new Date())

  // All hooks must be declared before any conditional return
  const [locationId,   setLocationId]   = useState(scopedLocationId ?? '')
  const [serviceId,    setServiceId]    = useState('')
  const [specialistId, setSpecialistId] = useState('')
  const [date,         setDate]         = useState(initialDate ?? today)
  const [time,         setTime]         = useState(initialTime ?? '')
  const [clientName,   setClientName]   = useState('')
  const [clientPhone,  setClientPhone]  = useState('')

  // Fresh bookings for the chosen day for slot availability (backend enforces overlaps).
  const { data: bookings } = useResource(
    () => (open && date ? bookingsService.calendar(`${date}T00:00:00`, `${date}T23:59:59`) : Promise.resolve([])),
    [open, date],
    [],
  )

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
    if (!date || !partner) return set
    const svc = svcCatalog.find(sv => sv.id === serviceId)
    if (!svc) return set
    const slotMin = svc.duration || 30

    // ── Facility/entry service: gate by concurrent capacity ──
    // A slot is full when `capacity` active bookings for this service+location
    // overlap its [start, end) window. No specialist / time-off involved.
    if (svc.requiresSpecialist === false) {
      const capacity = Math.max(1, svc.capacity ?? 1)
      const windows = bookings
        .filter(b =>
          b.serviceId === serviceId &&
          (!locationId || b.locationId === locationId) &&
          b.status !== 'cancelled' && b.status !== 'noshow',
        )
        .map(b => [new Date(b.startISO).getTime(), new Date(b.endISO).getTime()] as const)

      for (let h = 8; h < 21; h++) {
        for (let m = 0; m < 60; m += 30) {
          const start = new Date(`${date}T00:00:00`); start.setHours(h, m, 0, 0)
          const s0 = start.getTime(), e0 = s0 + slotMin * 60_000
          const overlapping = windows.filter(([bs, be]) => s0 < be && bs < e0).length
          if (overlapping >= capacity) {
            set.add(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
          }
        }
      }
      return set
    }

    // ── Person service: a specialist's own bookings + time-off block slots ──
    if (!specialistId) return set
    bookings.forEach(b => {
      if (b.specialistId !== specialistId) return
      if (b.status === 'cancelled' || b.status === 'noshow') return
      const d = new Date(b.startISO)
      if (fmtDateInput(d) !== date) return
      set.add(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`)
    })
    // Block slots that fall inside a time-off window. A slot is the service's
    // duration (default 30m) starting at the slot time.
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
  }, [bookings, specialistId, date, partner, serviceId, locationId, timeOff, svcCatalog])

  // When a manager opens the modal, force their branch as the location.
  useEffect(() => {
    if (open && scopedLocationId) setLocationId(scopedLocationId)
  }, [open, scopedLocationId])

  // Early return AFTER all hooks
  if (!partner) return null

  const locations   = locCatalog
  const specialists = spCatalog.filter(sp =>
    sp.active && (!locationId || sp.locationId === locationId)
  )
  const services = svcCatalog.filter(sv =>
    sv.active && (!specialistId || spCatalog.find(sp => sp.id === specialistId)?.services.includes(sv.id))
  )
  const selectedService = svcCatalog.find(sv => sv.id === serviceId)
  // Facility/entry service (spa): no specialist — a walk-in just needs a spot.
  const isFacility = selectedService?.requiresSpecialist === false
  // The time grid is ready once we can resolve availability: a specialist for a
  // person service, or just the service itself for a facility/entry one.
  const slotsReady = isFacility ? !!serviceId : !!specialistId
  const canSubmit =
    locationId && serviceId && date && time && clientName && clientPhone &&
    (isFacility || specialistId)

  const handleSubmit = async () => {
    if (!canSubmit || !selectedService) return
    const [h, m] = time.split(':').map(Number)
    const start = new Date(`${date}T00:00:00`)
    start.setHours(h, m, 0, 0)
    const end = new Date(start.getTime() + selectedService.duration * 60_000)

    await bookingsService.create({
      partnerId: partner.id, locationId,
      specialistId: isFacility ? null : specialistId,
      serviceId,
      clientName, clientPhone,
      startISO: start.toISOString(), endISO: end.toISOString(),
      status: 'confirmed',
    })
    onCreated?.()
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
            onChange={v => {
              setServiceId(v)
              setTime('')
              // Facility services have no specialist — clear any prior pick.
              if (svcCatalog.find(sv => sv.id === v)?.requiresSpecialist === false) setSpecialistId('')
            }}
            options={services.map(sv => ({
              value: sv.id,
              label: sv.name,
              sub: sv.requiresSpecialist === false
                ? t('newBooking.facilitySub', { duration: sv.duration, capacity: sv.capacity ?? 1 })
                : t('newBooking.serviceSub', { duration: sv.duration, price: sv.price.toLocaleString() }),
            }))}
            placeholder={t('newBooking.servicePlaceholder')}
          />
        </div>

        {/* Specialist — hidden for facility/entry services (spa walk-ins). */}
        {!isFacility && (
          <div className={s.full}>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-1)', display: 'block', marginBottom: 6 }}>{t('newBooking.specialistLabel')}</label>
            <Select
              value={specialistId}
              onChange={v => { setSpecialistId(v); setTime('') }}
              options={specialists.map(sp => ({ value: sp.id, label: sp.name, sub: sp.title }))}
              placeholder={t('newBooking.specialistPlaceholder')}
              disabled={!locationId}
            />
          </div>
        )}

        <div>
          <DatePicker label={t('newBooking.dateLabel')} value={date} min={today} onChange={setDate} />
        </div>

        <div className={s.full}>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-1)', display: 'block', marginBottom: 6 }}>{t('newBooking.timeLabel')}</label>
          {slotsReady && date ? (
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
              <span>{t(isFacility ? 'newBooking.slotsHintFacility' : 'newBooking.slotsHint')}</span>
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
                date: new Date(date).toLocaleDateString(dateLocale, { weekday: 'long', day: 'numeric', month: 'long' }),
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
