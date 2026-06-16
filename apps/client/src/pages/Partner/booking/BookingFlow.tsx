import { useState, useEffect, useMemo, useCallback } from 'react'
import { ArrowLeft, X, Check, Users, Calendar, Clock, CheckCircle2, ArrowRight, Sparkles, MapPin, Send, AlertCircle } from 'lucide-react'
import { fmtAMD, fmtDuration, fmtDateInput, initials } from '@reserva/shared'
import { DatePicker } from '@reserva/ui'
import type { Service, Specialist } from '@reserva/shared'
import type { PublicPartner } from '@/mock/partners'
import {
  specialistsForService,
  bookableLocations,
  getAvailableSlots,
  createBooking,
} from '@/services/booking.service'
import { getTelegramConnectLink } from '@/services/telegram.service'
import { friendlyError } from '@/services/errors'
import { useT } from '@/i18n'
import s from './BookingFlow.module.scss'

type Step = 'location' | 'service' | 'specialist' | 'datetime' | 'details' | 'confirm' | 'success'

interface Props {
  partner: PublicPartner
  seedServiceId: string | null
  /** When set, the flow pre-selects this specialist once a service is chosen. */
  seedSpecialistId?: string | null
  onClose: () => void
}

const ANY_SPECIALIST = '__any__'

export function BookingFlow({ partner, seedServiceId, seedSpecialistId = null, onClose }: Props) {
  const t = useT()
  const [closing, setClosing] = useState(false)

  // Only branches that can actually be booked (active + ≥1 active specialist).
  const locations = useMemo(() => bookableLocations(partner), [partner])
  const multiLocation = locations.length > 1

  // selections
  const [locationId, setLocationId]     = useState<string | null>(
    multiLocation ? null : locations[0]?.id ?? null
  )
  const [serviceId, setServiceId]       = useState<string | null>(seedServiceId)
  const [specialistId, setSpecialistId] = useState<string | null>(null) // null = not chosen, ANY_SPECIALIST = any
  const [date, setDate]                 = useState(fmtDateInput(new Date()))
  const [time, setTime]                 = useState<string | null>(null)
  const [name, setName]                 = useState('')
  const [phone, setPhone]               = useState('')
  const [notes, setNotes]               = useState('')
  // Field-level validation — errors show only after a field is touched / on submit.
  const [touched, setTouched]           = useState<{ name?: boolean; phone?: boolean }>({})
  // Backend error from the final confirm call (slot taken, etc.).
  const [submitError, setSubmitError]   = useState<string | null>(null)
  const [submitting, setSubmitting]     = useState(false)
  // Status of the just-created booking — drives confirmed vs pending success copy.
  const [bookedStatus, setBookedStatus] = useState<'confirmed' | 'pending'>('confirmed')
  // Telegram connect deep link for the just-created booking (null = unavailable
  // / already connected / telegram disabled → button hidden).
  const [telegramLink, setTelegramLink] = useState<string | null>(null)

  // slots
  const [slots, setSlots]           = useState<string[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)

  // First step: location (multi-branch) → service → … or jump to specialist if seeded.
  const [step, setStep] = useState<Step>(
    multiLocation ? 'location' : (seedServiceId ? 'specialist' : 'service')
  )

  const service = useMemo(
    () => partner.services.find(sv => sv.id === serviceId) ?? null,
    [partner, serviceId]
  )

  // Specialists eligible for the service AND at the chosen branch.
  const eligibleSpecialists = useMemo(
    () => (serviceId ? specialistsForService(partner, serviceId, locationId) : []),
    [partner, serviceId, locationId]
  )

  const chosenLocation = useMemo(
    () => locations.find(l => l.id === locationId) ?? null,
    [locations, locationId]
  )

  const animatedClose = useCallback(() => {
    setClosing(true)
    setTimeout(onClose, 260)
  }, [onClose])

  // Lock scroll + esc to close
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') animatedClose() }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [animatedClose])

  // Load slots when entering the datetime step (or changing date/specialist).
  useEffect(() => {
    if (step !== 'datetime' || !service) return
    let active = true
    setSlotsLoading(true)
    setSlots([])
    getAvailableSlots({
      partner,
      service,
      specialistId: specialistId === ANY_SPECIALIST ? null : specialistId,
      locationId,
      date,
    }).then(res => {
      if (!active) return
      setSlots(res)
      setSlotsLoading(false)
    })
    return () => { active = false }
  }, [step, service, partner, specialistId, locationId, date])

  // ── Step navigation ── (location step only present for multi-branch salons)
  const STEP_ORDER: Step[] = useMemo(
    () => (multiLocation
      ? ['location', 'service', 'specialist', 'datetime', 'details', 'confirm']
      : ['service', 'specialist', 'datetime', 'details', 'confirm']),
    [multiLocation]
  )
  const stepIndex = STEP_ORDER.indexOf(step)
  const totalSteps = STEP_ORDER.length

  const goBack = () => {
    const i = STEP_ORDER.indexOf(step)
    if (i > 0) setStep(STEP_ORDER[i - 1])
  }

  const selectLocation = (id: string) => {
    setLocationId(id)
    setSpecialistId(null)
    setTime(null)
    setStep('service')
  }

  const selectService = (id: string) => {
    setServiceId(id)
    setTime(null)
    // If we're seeded to a specific specialist and they offer this service at
    // the chosen branch, pre-select them and skip straight to date/time.
    if (seedSpecialistId) {
      const eligible = specialistsForService(partner, id, locationId)
      if (eligible.some(sp => sp.id === seedSpecialistId)) {
        setSpecialistId(seedSpecialistId)
        setStep('datetime')
        return
      }
    }
    setSpecialistId(null)
    setStep('specialist')
  }

  const selectSpecialist = (id: string) => {
    setSpecialistId(id)
    setTime(null)
    setStep('datetime')
  }

  // Codes that mean "this slot won't work" → send the user back to pick a new time.
  const SLOT_ERROR_CODES = new Set([
    'BOOKING_OVERLAP', 'SPECIALIST_TIME_OFF', 'OUTSIDE_WORKING_HOURS', 'PAST_DATE', 'INVALID_TIME_RANGE',
  ])

  const handleConfirm = async () => {
    if (!service) return
    setSubmitError(null)
    setSubmitting(true)
    try {
      const booking = await createBooking({
        partner,
        service,
        specialistId: specialistId === ANY_SPECIALIST ? null : specialistId,
        locationId,
        date,
        time: time!,
        clientName: name.trim(),
        clientPhone: phone.trim(),
        notes: notes.trim() || undefined,
      })
      // Reflect the real outcome: auto-confirm partners → 'confirmed', otherwise
      // the booking lands as 'pending' awaiting staff confirmation.
      setBookedStatus(booking.status === 'confirmed' ? 'confirmed' : 'pending')
      setStep('success')
      // Offer free Telegram updates for this booking (best-effort, non-blocking).
      getTelegramConnectLink(booking.id).then(setTelegramLink)
    } catch (err) {
      const code = (err as { code?: string } | null)?.code
      setSubmitError(friendlyError(err, t))
      // If the chosen slot is no longer valid, bounce back to time selection so
      // the user can immediately pick another (and refresh slots).
      if (code && SLOT_ERROR_CODES.has(code)) {
        setTime(null)
        setStep('datetime')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const chosenSpecialist: Specialist | null =
    specialistId && specialistId !== ANY_SPECIALIST
      ? partner.specialists.find(sp => sp.id === specialistId) ?? null
      : null

  const [t1, t2] = partner.presentation.heroTints

  // step label e.g. "Step 2 of 6"
  const stepLabel = step === 'success' ? '' : t('booking.stepLabel', { current: stepIndex + 1, total: totalSteps })

  const stepTitles: Record<Step, { title: string; sub: string }> = {
    location:   { title: t('booking.steps.location.title'),   sub: t('booking.steps.location.sub') },
    service:    { title: t('booking.steps.service.title'),    sub: t('booking.steps.service.sub') },
    specialist: { title: t('booking.steps.specialist.title'), sub: t('booking.steps.specialist.sub') },
    datetime:   { title: t('booking.steps.datetime.title'),   sub: t('booking.steps.datetime.sub') },
    details:    { title: t('booking.steps.details.title'),    sub: t('booking.steps.details.sub') },
    confirm:    { title: t('booking.steps.confirm.title'),    sub: t('booking.steps.confirm.sub') },
    success:    { title: '', sub: '' },
  }

  // ── Field validation. Returns an i18n key for the error, or null if valid. ──
  const nameError = (): string | null => {
    const v = name.trim()
    if (!v) return 'booking.validation.nameRequired'
    if (v.length < 2) return 'booking.validation.nameTooShort'
    return null
  }
  const phoneError = (): string | null => {
    const v = phone.trim()
    if (!v) return 'booking.validation.phoneRequired'
    // Allow +, spaces, dashes, parens; require at least 6 digits.
    const digits = v.replace(/\D/g, '')
    if (digits.length < 6) return 'booking.validation.phoneInvalid'
    return null
  }
  const detailsValid = !nameError() && !phoneError()

  const canNext = () => {
    if (step === 'datetime') return !!time
    if (step === 'details') return detailsValid
    return true
  }

  const nextFromDatetime = () => setStep('details')
  const nextFromDetails = () => {
    // Surface any field errors if the user taps Continue with invalid input.
    setTouched({ name: true, phone: true })
    if (!detailsValid) return
    setStep('confirm')
  }

  return (
    <div className={[s.overlay, closing ? s.closing : ''].filter(Boolean).join(' ')} onClick={animatedClose}>
      <div className={[s.modal, closing ? s.closing : ''].filter(Boolean).join(' ')} onClick={e => e.stopPropagation()}>

        {step !== 'success' && (
          <div className={s.header}>
            <div className={s.headTop}>
              <button className={s.backBtn} onClick={goBack} disabled={stepIndex === 0 || (step === 'specialist' && !!seedServiceId && !multiLocation)}>
                <ArrowLeft size={16} />
              </button>
              <span className={s.stepLabel}>{stepLabel}</span>
              <button className={s.closeBtn} onClick={animatedClose}><X size={16} /></button>
            </div>
            <div className={s.progress}>
              {STEP_ORDER.map((_, i) => (
                <div key={i} className={s.segment}>
                  <span className={[s.segFill, i < stepIndex ? s.done : '', i === stepIndex ? s.active : ''].filter(Boolean).join(' ')} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── BODY ── */}
        {step === 'success' ? (
          <div className={s.success}>
            <div className={[s.successIcon, bookedStatus === 'pending' ? s.successIconPending : ''].filter(Boolean).join(' ')}>
              {bookedStatus === 'pending' ? <Clock size={38} /> : <CheckCircle2 size={38} />}
            </div>
            <h2 className={s.successTitle}>
              {bookedStatus === 'pending' ? t('booking.pendingTitle') : t('booking.successTitle')}
            </h2>
            <p className={s.successText}>
              {bookedStatus === 'pending' ? (
                <>{t('booking.pendingTextPre')}<strong>{partner.name}</strong>{t('booking.pendingTextPost')}</>
              ) : (
                <>{t('booking.successTextPre')}<strong>{partner.name}</strong>{t('booking.successTextPost')}</>
              )}
            </p>
            <div className={s.successCard}>
              <SummaryRows
                service={service}
                specialist={chosenSpecialist}
                anySpecialist={specialistId === ANY_SPECIALIST}
                location={multiLocation ? chosenLocation?.name ?? null : null}
                date={date}
                time={time}
                hidePrice
              />
            </div>

            {/* Free customer notifications via Telegram — one tap to connect. */}
            {telegramLink && (
              <a
                className={s.telegramBtn}
                href={telegramLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Send size={17} /> {t('booking.telegramConnect')}
              </a>
            )}

            <button className={s.doneBtn} onClick={animatedClose}>{t('booking.done')}</button>
          </div>
        ) : (
          <>
            <div className={s.body}>
              <h2 className={s.stepTitle}>{stepTitles[step].title}</h2>
              <p className={s.stepSub}>{stepTitles[step].sub}</p>

              {/* Backend error (e.g. slot taken). Shows on confirm, and on the
                  datetime step after a conflict bounced the user back. */}
              {submitError && (step === 'confirm' || step === 'datetime') && (
                <div className={s.errorBanner} role="alert">
                  <AlertCircle size={17} />
                  <span>{submitError}</span>
                </div>
              )}

              {/* STEP: location (multi-branch only) */}
              {step === 'location' && (
                <div>
                  {locations.map(loc => (
                    <button
                      key={loc.id}
                      className={[s.option, locationId === loc.id ? s.selected : ''].filter(Boolean).join(' ')}
                      onClick={() => selectLocation(loc.id)}
                    >
                      <span className={s.anyIcon}><MapPin size={20} /></span>
                      <div className={s.optBody}>
                        <div className={s.optName}>{loc.name}</div>
                        <div className={s.optMeta}>{loc.address}</div>
                      </div>
                      {locationId === loc.id && <Check size={18} className={s.check} />}
                    </button>
                  ))}
                </div>
              )}

              {/* STEP: service */}
              {step === 'service' && (
                <ServiceStep
                  partner={partner}
                  selectedId={serviceId}
                  onSelect={selectService}
                />
              )}

              {/* STEP: specialist */}
              {step === 'specialist' && (
                <div>
                  {/* Any specialist option (Flow 2) */}
                  <button
                    className={[s.option, specialistId === ANY_SPECIALIST ? s.selected : ''].filter(Boolean).join(' ')}
                    onClick={() => selectSpecialist(ANY_SPECIALIST)}
                  >
                    <span className={s.anyIcon}><Sparkles size={20} /></span>
                    <div className={s.optBody}>
                      <div className={s.optName}>{t('booking.anySpecialist')}</div>
                      <div className={s.optMeta}>{t('booking.anySpecialistMeta')}</div>
                    </div>
                    {specialistId === ANY_SPECIALIST && <Check size={18} className={s.check} />}
                  </button>

                  <div className={s.catLabel}>{t('booking.orChooseSomeone')}</div>

                  {eligibleSpecialists.map(sp => (
                    <button
                      key={sp.id}
                      className={[s.option, specialistId === sp.id ? s.selected : ''].filter(Boolean).join(' ')}
                      onClick={() => selectSpecialist(sp.id)}
                    >
                      <span className={s.optAvatar} style={{ background: `linear-gradient(140deg, ${t1}, ${t2})` }}>
                        {initials(sp.name)}
                      </span>
                      <div className={s.optBody}>
                        <div className={s.optName}>{sp.name}</div>
                        <div className={s.optMeta}>{sp.title}</div>
                      </div>
                      {specialistId === sp.id && <Check size={18} className={s.check} />}
                    </button>
                  ))}
                </div>
              )}

              {/* STEP: datetime */}
              {step === 'datetime' && (
                <div>
                  <div className={s.dateField}>
                    <label className={s.fieldLabel}>{t('booking.dateLabel')}</label>
                    <DatePicker value={date} min={fmtDateInput(new Date())} onChange={v => { setDate(v); setTime(null) }} />
                  </div>

                  <label className={s.fieldLabel}>{t('booking.availableTimes')}</label>
                  <div className={s.slotsWrap}>
                    {slotsLoading ? (
                      <div className={s.slotsLoading}>
                        <span className={s.miniSpinner} /> {t('booking.findingSlots')}
                      </div>
                    ) : slots.length === 0 ? (
                      <div className={s.noSlots}>{t('booking.noSlots')}</div>
                    ) : (
                      <div className={s.slotGrid}>
                        {slots.map(sl => (
                          <button
                            key={sl}
                            className={[s.slot, time === sl ? s.selected : ''].filter(Boolean).join(' ')}
                            onClick={() => { setTime(sl); setSubmitError(null) }}
                          >
                            {sl}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP: details */}
              {step === 'details' && (
                <div>
                  <div className={s.formField}>
                    <label className={s.fieldLabel}>{t('booking.fullNameLabel')}</label>
                    <input
                      className={[s.input, touched.name && nameError() ? s.inputError : ''].filter(Boolean).join(' ')}
                      placeholder={t('booking.fullNamePlaceholder')}
                      value={name}
                      onChange={e => setName(e.target.value)}
                      onBlur={() => setTouched(p => ({ ...p, name: true }))}
                    />
                    {touched.name && nameError() && <span className={s.fieldError}>{t(nameError()!)}</span>}
                  </div>
                  <div className={s.formField}>
                    <label className={s.fieldLabel}>{t('booking.phoneLabel')}</label>
                    <input
                      className={[s.input, touched.phone && phoneError() ? s.inputError : ''].filter(Boolean).join(' ')}
                      placeholder={t('booking.phonePlaceholder')}
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      onBlur={() => setTouched(p => ({ ...p, phone: true }))}
                      inputMode="tel"
                    />
                    {touched.phone && phoneError() && <span className={s.fieldError}>{t(phoneError()!)}</span>}
                  </div>
                  <div className={s.formField}>
                    <label className={s.fieldLabel}>{t('booking.notesLabel')}</label>
                    <textarea className={[s.input, s.textarea].join(' ')} placeholder={t('booking.notesPlaceholder')} value={notes} onChange={e => setNotes(e.target.value)} />
                  </div>
                </div>
              )}

              {/* STEP: confirm */}
              {step === 'confirm' && (
                <div className={s.summary}>
                  <SummaryRows
                    service={service}
                    specialist={chosenSpecialist}
                    anySpecialist={specialistId === ANY_SPECIALIST}
                    location={multiLocation ? chosenLocation?.name ?? null : null}
                    date={date}
                    time={time}
                    name={name}
                    phone={phone}
                  />
                </div>
              )}
            </div>

            {/* ── FOOTER ── */}
            {step === 'datetime' && (
              <div className={s.footer}>
                <button className={s.nextBtn} disabled={!canNext()} onClick={nextFromDatetime}>
                  {t('booking.continue')} <ArrowRight size={17} />
                </button>
              </div>
            )}
            {step === 'details' && (
              <div className={s.footer}>
                <button className={s.nextBtn} disabled={!canNext()} onClick={nextFromDetails}>
                  {t('booking.reviewBooking')} <ArrowRight size={17} />
                </button>
              </div>
            )}
            {step === 'confirm' && service && (
              <div className={s.footer}>
                <button className={s.nextBtn} disabled={submitting} onClick={handleConfirm}>
                  {submitting ? t('booking.booking') : <>{t('booking.confirmBooking')} <Check size={17} /></>}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/* ── Sub-components ── */

function ServiceStep({ partner, selectedId, onSelect }: {
  partner: PublicPartner
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const services = partner.services.filter(sv => sv.active)
  const categories = Array.from(new Set(services.map(sv => sv.category)))

  return (
    <div>
      {categories.map(cat => (
        <div key={cat}>
          <div className={s.catLabel}>{cat}</div>
          {services.filter(sv => sv.category === cat).map(sv => (
            <button
              key={sv.id}
              className={[s.option, selectedId === sv.id ? s.selected : ''].filter(Boolean).join(' ')}
              onClick={() => onSelect(sv.id)}
            >
              <div className={s.optBody}>
                <div className={s.optName}>{sv.name}</div>
                <div className={s.optMeta}>
                  <span><Clock size={12} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />{fmtDuration(sv.duration)}</span>
                </div>
              </div>
              <span className={s.optPrice}>{fmtAMD(sv.price)}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}

function SummaryRows({ service, specialist, anySpecialist, location, date, time, name, phone, hidePrice }: {
  service: Service | null
  specialist: Specialist | null
  anySpecialist: boolean
  location?: string | null
  date: string
  time: string | null
  name?: string
  phone?: string
  hidePrice?: boolean
}) {
  const t = useT()
  const dateLabel = new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <>
      {location && (
        <div className={s.sumRow}>
          <span className={s.sumLabel}><MapPin size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 6 }} />{t('booking.summary.branch')}</span>
          <span className={s.sumValue}>{location}</span>
        </div>
      )}
      <div className={s.sumRow}>
        <span className={s.sumLabel}><Sparkles size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 6 }} />{t('booking.summary.service')}</span>
        <span className={s.sumValue}>{service?.name ?? '—'}</span>
      </div>
      <div className={s.sumRow}>
        <span className={s.sumLabel}><Users size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 6 }} />{t('booking.summary.specialist')}</span>
        <span className={s.sumValue}>{anySpecialist ? t('booking.summary.anyAvailable') : specialist?.name ?? '—'}</span>
      </div>
      <div className={s.sumRow}>
        <span className={s.sumLabel}><Calendar size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 6 }} />{t('booking.summary.date')}</span>
        <span className={s.sumValue}>{dateLabel}</span>
      </div>
      <div className={s.sumRow}>
        <span className={s.sumLabel}><Clock size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 6 }} />{t('booking.summary.time')}</span>
        <span className={s.sumValue}>{time ?? '—'}{service ? ` · ${fmtDuration(service.duration)}` : ''}</span>
      </div>
      {name && (
        <div className={s.sumRow}>
          <span className={s.sumLabel}>{t('booking.summary.name')}</span>
          <span className={s.sumValue}>{name}</span>
        </div>
      )}
      {phone && (
        <div className={s.sumRow}>
          <span className={s.sumLabel}>{t('booking.summary.phone')}</span>
          <span className={s.sumValue}>{phone}</span>
        </div>
      )}
      {!hidePrice && service && (
        <div className={[s.sumRow, s.sumTotal].join(' ')}>
          <span className={s.sumTotalLabel}>{t('booking.summary.total')}</span>
          <span className={s.sumTotalValue}>{fmtAMD(service.price)}</span>
        </div>
      )}
    </>
  )
}
