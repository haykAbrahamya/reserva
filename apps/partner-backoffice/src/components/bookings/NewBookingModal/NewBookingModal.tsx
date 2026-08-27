import { useState, useEffect, useRef } from 'react'
import { Calendar } from 'lucide-react'
import { Modal, Input, Select, Button, DatePicker, FieldError, useToast } from '@/components/ui'
import { usePartner } from '@/store/app.store'
import { useResource } from '@/store/useResource'
import { useScopedLocationId } from '@/store/auth.hooks'
import { bookingsService } from '@/services/bookings.service'
import { partnersService } from '@/services/partners.service'
import { fmtDateInput } from '@/utils/format'
import { errorMessage } from '@/utils/errors'
import { useT, useDateLocale, useDatePickerLabels } from '@/i18n'
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
  const dateLabels    = useDatePickerLabels()
  const today         = fmtDateInput(new Date())

  // All hooks must be declared before any conditional return
  const [locationId,   setLocationId]   = useState(scopedLocationId ?? '')
  const [serviceId,    setServiceId]    = useState('')
  const [specialistId, setSpecialistId] = useState('')
  const [date,         setDate]         = useState(initialDate ?? today)
  const [time,         setTime]         = useState(initialTime ?? '')
  const [clientName,   setClientName]   = useState('')
  const [clientPhone,  setClientPhone]  = useState('')
  // Inline validation errors, keyed by field. Set on submit; cleared on edit.
  const [errs, setErrs] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  // Anchor at the bottom of the form — we scroll to it after a date is picked so
  // the client name/phone fields (hidden below the tall time grid) become visible.
  const bottomAnchor = useRef<HTMLDivElement>(null)
  const clearErr = (k: string) => setErrs(e => (e[k] ? (() => { const n = { ...e }; delete n[k]; return n })() : e))


  // When a manager opens the modal, force their branch as the location.
  useEffect(() => {
    if (open && scopedLocationId) setLocationId(scopedLocationId)
  }, [open, scopedLocationId])

  // Solo partners have exactly one location + one specialist, so asking is noise.
  // Auto-fill both invisibly once the catalogs load.
  const isSolo = partner?.kind === 'single'
  useEffect(() => {
    if (!open || !isSolo) return
    if (!locationId && locCatalog.length === 1) setLocationId(locCatalog[0].id)
  }, [open, isSolo, locationId, locCatalog])
  useEffect(() => {
    if (!open || !isSolo) return
    const solo = spCatalog.find(sp => sp.active)
    if (!specialistId && solo) setSpecialistId(solo.id)
  }, [open, isSolo, specialistId, spCatalog])

  const selectedService = svcCatalog.find(sv => sv.id === serviceId)
  // Facility/entry service (spa): no specialist — a walk-in just needs a spot.
  const isFacility = selectedService?.requiresSpecialist === false
  // The time grid is ready once we can resolve availability: a specialist for a
  // person service, or just the service itself for a facility/entry one.
  const slotsReady = isFacility ? !!serviceId : !!specialistId

  // Real bookable times from the server, which layers working hours (including
  // overnight shifts) − time-off − existing bookings − past. This used to be a
  // fixed hourly grid invented here that ignored working hours entirely: staff
  // were offered times the server then rejected, and a salon open past midnight
  // couldn't be booked for most of its own shift.
  const { data: slots, loading: slotsLoading } = useResource(
    () =>
      open && date && locationId && serviceId && slotsReady
        ? bookingsService.slots({
            serviceId,
            locationId,
            ...(isFacility ? {} : { specialistId }),
            date,
          })
        : Promise.resolve([]),
    [open, date, locationId, serviceId, specialistId, isFacility, slotsReady],
    [],
  )

  // Drop a selected time the latest list no longer offers (the date, service or
  // specialist changed under it) so a stale value can't be submitted.
  useEffect(() => {
    if (time && !slotsLoading && !slots.includes(time)) setTime('')
  }, [slots, slotsLoading, time])

  // Early return AFTER all hooks
  if (!partner) return null

  const locations   = locCatalog
  // Specialists are filtered by BOTH the chosen location AND the chosen service
  // — so you can only pick someone who actually offers that service (prevents
  // selecting a specialist who can't do it, which would drop the service).
  const specialists = spCatalog.filter(sp =>
    sp.active &&
    (!locationId || sp.locationId === locationId) &&
    (!serviceId || sp.services.includes(serviceId))
  )
  // Services are likewise filtered by the chosen specialist (the reverse), so the
  // two dropdowns always agree in either order of selection.
  const services = svcCatalog.filter(sv =>
    sv.active && (!specialistId || spCatalog.find(sp => sp.id === specialistId)?.services.includes(sv.id))
  )
  /** Pick a date, then — if the client fields below are still empty — smoothly
   *  reveal them. The tall time grid pushes name/phone off-screen, so without
   *  this it's easy to miss that there's more form below. We wait a frame so the
   *  slot grid has rendered (its height is what we need to scroll past). */
  const handleDateSelect = (v: string) => {
    setDate(v)
    const clientFieldsEmpty = !clientName.trim() || !clientPhone.trim()
    if (!clientFieldsEmpty) return
    requestAnimationFrame(() => {
      bottomAnchor.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    })
  }

  /** Local validation → inline errors. Returns true when the form is valid. */
  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!locationId) e.locationId = t('errors.required')
    if (!serviceId) e.serviceId = t('errors.required')
    if (!isFacility && !specialistId) e.specialistId = t('errors.required')
    if (!time) e.time = t('errors.required')
    if (!clientName.trim()) e.clientName = t('errors.required')
    if (clientPhone.replace(/\D/g, '').length < 6) e.clientPhone = clientPhone.trim() ? t('errors.invalid') : t('errors.required')
    setErrs(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (saving) return
    if (!validate() || !selectedService) {
      toast(t('errors.fixFields'))
      return
    }
    const [h, m] = time.split(':').map(Number)
    const start = new Date(`${date}T00:00:00`)
    start.setHours(h, m, 0, 0)
    const end = new Date(start.getTime() + selectedService.duration * 60_000)

    setSaving(true)
    try {
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
      setErrs({})
      setLocationId(scopedLocationId ?? ''); setServiceId(''); setSpecialistId('')
      setDate(today);   setTime('');   setClientName(''); setClientPhone('')
    } catch (err) {
      // Surface the backend error as a friendly, localized toast (slot taken,
      // overlap, etc.). A slot conflict also clears the time so they re-pick.
      toast(errorMessage(err, t))
      const code = (err as { code?: string } | null)?.code
      if (code === 'BOOKING_OVERLAP') { setTime(''); setErrs(e => ({ ...e, time: t('errors.codes.BOOKING_OVERLAP') })) }
    } finally {
      setSaving(false)
    }
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
          <Button variant="accent" disabled={saving} onClick={handleSubmit}>
            {t('newBooking.confirm')}
          </Button>
        </>
      }
    >
      <div className={s.grid}>
        {/* Location — hidden for solo partners (they have exactly one branch,
            auto-filled above). */}
        {!isSolo && (
          <div className={s.full}>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-1)', display: 'block', marginBottom: 6 }}>{t('newBooking.locationLabel')}</label>
            <Select
              value={locationId}
              onChange={v => { setLocationId(v); setSpecialistId(''); clearErr('locationId') }}
              options={locations.map(l => ({ value: l.id, label: l.name, sub: l.address }))}
              placeholder={t('newBooking.locationPlaceholder')}
              disabled={!!scopedLocationId}
            />
            <FieldError message={errs.locationId} />
          </div>
        )}

        <div className={s.full}>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-1)', display: 'block', marginBottom: 6 }}>{t('newBooking.serviceLabel')}</label>
          <Select
            value={serviceId}
            onChange={v => {
              setServiceId(v)
              setTime('')
              clearErr('serviceId')
              const svc = svcCatalog.find(sv => sv.id === v)
              // Clear the specialist pick if it's no longer valid for the new
              // service: either it's a facility service (no specialist at all) or
              // the currently-picked specialist doesn't offer this service.
              if (specialistId) {
                const stillValid =
                  svc?.requiresSpecialist !== false &&
                  spCatalog.find(sp => sp.id === specialistId)?.services.includes(v)
                if (!stillValid) setSpecialistId('')
              }
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
          <FieldError message={errs.serviceId} />
        </div>

        {/* Specialist — hidden for facility/entry services (spa walk-ins) and for
            solo partners (their sole specialist is auto-filled above). */}
        {!isFacility && !isSolo && (
          <div className={s.full}>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-1)', display: 'block', marginBottom: 6 }}>{t('newBooking.specialistLabel')}</label>
            <Select
              value={specialistId}
              onChange={v => { setSpecialistId(v); setTime(''); clearErr('specialistId') }}
              options={specialists.map(sp => ({ value: sp.id, label: sp.name, sub: sp.title }))}
              placeholder={t('newBooking.specialistPlaceholder')}
              disabled={!locationId}
            />
            <FieldError message={errs.specialistId} />
          </div>
        )}

        <div>
          <DatePicker label={t('newBooking.dateLabel')} value={date} min={today} onChange={handleDateSelect} labels={dateLabels} />
        </div>

        <div className={s.full}>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-1)', display: 'block', marginBottom: 6 }}>{t('newBooking.timeLabel')}</label>
          {slotsReady && date ? (
            slotsLoading ? (
              <div className={s.infoBox}>
                <Calendar size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <span>{t('common.loading')}</span>
              </div>
            ) : slots.length === 0 ? (
              // Closed that day, or every bookable time is already taken.
              <div className={s.infoBox}>
                <Calendar size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <span>{t('newBooking.noSlots')}</span>
              </div>
            ) : (
              <div className={s.slotGrid}>
                {slots.map(sl => (
                  <button
                    key={sl}
                    type="button"
                    onClick={() => { setTime(sl); clearErr('time') }}
                    className={[s.slot, time === sl ? s.selected : ''].filter(Boolean).join(' ')}
                  >
                    {sl}
                  </button>
                ))}
              </div>
            )
          ) : (
            <div className={s.infoBox}>
              <Calendar size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <span>{t(isFacility ? 'newBooking.slotsHintFacility' : 'newBooking.slotsHint')}</span>
            </div>
          )}
          <FieldError message={errs.time} />
        </div>

        <Input label={t('newBooking.clientNameLabel')}  value={clientName}  onChange={e => { setClientName(e.target.value); clearErr('clientName') }}  placeholder={t('newBooking.clientNamePlaceholder')} error={errs.clientName} />
        <Input label={t('newBooking.clientPhoneLabel')} value={clientPhone} onChange={e => { setClientPhone(e.target.value); clearErr('clientPhone') }} placeholder={t('newBooking.clientPhonePlaceholder')} error={errs.clientPhone} />

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

        {/* Scroll target: picking a date scrolls here so the client fields above
            it (name/phone) are brought into view past the tall time grid. */}
        <div ref={bottomAnchor} aria-hidden="true" className={s.bottomAnchor} />
      </div>
    </Modal>
  )
}
