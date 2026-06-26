import { useState, useEffect, useMemo } from 'react'
import { ArrowLeft, X, Check, Users, Calendar, Clock, CheckCircle2, ArrowRight, Sparkles, MapPin, Send, AlertCircle, CalendarPlus, Bell, BellRing, Share } from 'lucide-react'
import { fmtAMD, fmtDuration, fmtDateInput, initials } from '@reserva/shared'
import { StarRatingDisplay } from '@/components/StarRating/StarRating'
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
import { pushSupported, isIosSafari, notificationPermission, enableBookingPush } from '@/services/push.service'
import { friendlyError } from '@/services/errors'
import { ModalShell } from '@/components/ModalShell/ModalShell'
import { useT, useI18n, LOCALE_META } from '@/i18n'
import { addToCalendar } from '@/lib/ics'
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
  const { locale } = useI18n()

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
  // Id of the just-created booking — used as the calendar event UID.
  const [bookingId, setBookingId] = useState<string | null>(null)
  // Web-push enrolment state for the just-created booking.
  const [pushState, setPushState] = useState<'idle' | 'enabling' | 'on' | 'denied'>('idle')

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

  // Facility/entry service (spa sauna, pool, day pass): no specialist — the
  // flow skips the specialist step entirely and books against capacity.
  const isFacility = service?.requiresSpecialist === false

  // Specialists eligible for the service AND at the chosen branch.
  const eligibleSpecialists = useMemo(
    () => (serviceId ? specialistsForService(partner, serviceId, locationId) : []),
    [partner, serviceId, locationId]
  )

  const chosenLocation = useMemo(
    () => locations.find(l => l.id === locationId) ?? null,
    [locations, locationId]
  )


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

  // ── Step navigation ──
  //  - location step only for multi-branch salons
  //  - specialist step is dropped for facility/entry services (no specialist)
  const STEP_ORDER: Step[] = useMemo(() => {
    const steps: Step[] = ['service', 'datetime', 'details', 'confirm']
    if (!isFacility) steps.splice(1, 0, 'specialist')
    if (multiLocation) steps.unshift('location')
    return steps
  }, [multiLocation, isFacility])
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
    setSpecialistId(null)
    // Facility/entry service (spa): no specialist → jump straight to date/time.
    if (partner.services.find(sv => sv.id === id)?.requiresSpecialist === false) {
      setStep('datetime')
      return
    }
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
        locale,
      })
      // Reflect the real outcome: auto-confirm partners → 'confirmed', otherwise
      // the booking lands as 'pending' awaiting staff confirmation.
      setBookedStatus(booking.status === 'confirmed' ? 'confirmed' : 'pending')
      setBookingId(booking.id)
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

  // Add the booking to the user's calendar — opens Google Calendar (app on
  // Android, web on desktop) or hands an .ics to Apple Calendar on iOS/macOS.
  const handleAddToCalendar = () => {
    if (!service || !time) return
    const start = new Date(`${date}T00:00:00`)
    const [h, m] = time.split(':').map(Number)
    start.setHours(h, m, 0, 0)
    const end = new Date(start.getTime() + service.duration * 60_000)

    const spName = chosenSpecialist?.name
    const title = t('booking.ics.title', { service: service.name, salon: partner.name })
    const description = t('booking.ics.description', {
      service: service.name,
      salon: partner.name,
      specialist: spName ?? t('booking.ics.anySpecialist'),
    })
    const place = chosenLocation?.address || chosenLocation?.name || partner.name

    addToCalendar(
      {
        uid: bookingId ?? `${partner.id}-${start.getTime()}`,
        start, end, title, description,
        location: place,
        organizer: partner.name,
        reminderMinutes: 60,
      },
      `${partner.name}-booking`,
    )
  }

  // Enable browser push for this booking — prompts permission, subscribes, and
  // registers the subscription server-side (scoped to the booking id).
  const handleEnablePush = async () => {
    if (!bookingId || pushState === 'enabling' || pushState === 'on' || pushState === 'denied') return
    setPushState('enabling')
    try {
      const ok = await enableBookingPush(bookingId)
      setPushState(ok ? 'on' : (notificationPermission() === 'denied' ? 'denied' : 'idle'))
    } catch {
      setPushState('idle')
    }
  }

  // Push is offered whenever the browser can do it (and isn't an iOS Safari tab
  // that needs Add-to-Home-Screen first). We always render the tile when offered
  // — a blocked/denied state shows as a disabled tile, never a missing button.
  const canOfferPush = pushSupported() && !isIosSafari()

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
    <ModalShell open onClose={onClose} closeDuration={260}>
      {({ closing, requestClose: animatedClose }) => (
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
            {/* Full-bleed accent banner — anchors the card, no floating icon. */}
            <div className={[s.banner, bookedStatus === 'pending' ? s.bannerPending : ''].filter(Boolean).join(' ')}>
              <button className={s.bannerClose} onClick={animatedClose} aria-label={t('booking.done')}><X size={18} /></button>
              <div className={s.bannerIcon}>
                {bookedStatus === 'pending' ? <Clock size={30} /> : <CheckCircle2 size={30} />}
              </div>
              <h2 className={s.bannerTitle}>
                {bookedStatus === 'pending' ? t('booking.pendingTitle') : t('booking.successTitle')}
              </h2>
              <p className={s.bannerText}>
                {bookedStatus === 'pending' ? (
                  <>{t('booking.pendingTextPre')}<strong>{partner.name}</strong>{t('booking.pendingTextPost')}</>
                ) : (
                  <>{t('booking.successTextPre')}<strong>{partner.name}</strong>{t('booking.successTextPost')}</>
                )}
              </p>
            </div>

            <div className={s.successScroll}>
              {/* Appointment details — full width, icon-chip rows. */}
              <div className={s.successCard}>
                <SummaryRows
                  service={service}
                  specialist={chosenSpecialist}
                  anySpecialist={specialistId === ANY_SPECIALIST}
                  hideSpecialist={isFacility}
                  location={multiLocation ? chosenLocation?.name ?? null : null}
                  date={date}
                  time={time}
                  hidePrice
                />
              </div>

              {/* ── Get reminders — free, no-cost channels (grid on web) ── */}
              <div className={s.remindLabel}>{t('booking.remind.title')}</div>
              <div className={s.remindGrid}>
                {/* Add to calendar — generates an .ics with a 1-hour alarm. */}
                <button type="button" className={s.remindTile} onClick={handleAddToCalendar}>
                  <span className={[s.remindIcon, s.remindIconCal].join(' ')}><CalendarPlus size={18} /></span>
                  <span className={s.remindName}>{t('booking.remind.calendar')}</span>
                </button>

                {/* Browser push — get notified about changes to this booking. */}
                {(canOfferPush || pushState === 'on') && (
                  <button
                    type="button"
                    className={[s.remindTile, pushState === 'on' ? s.remindTileOn : ''].filter(Boolean).join(' ')}
                    onClick={handleEnablePush}
                    disabled={pushState === 'enabling' || pushState === 'on' || pushState === 'denied'}
                  >
                    <span className={[s.remindIcon, s.remindIconPush].join(' ')}>
                      {pushState === 'on' ? <BellRing size={17} /> : <Bell size={17} />}
                    </span>
                    <span className={s.remindName}>
                      {pushState === 'on'
                        ? t('booking.remind.pushOn')
                        : pushState === 'enabling'
                          ? t('booking.remind.pushEnabling')
                          : pushState === 'denied'
                            ? t('booking.remind.pushDenied')
                            : t('booking.remind.push')}
                    </span>
                  </button>
                )}

                {/* Telegram — one tap to connect the bot for free live updates. */}
                {telegramLink && (
                  <a
                    className={s.remindTile}
                    href={telegramLink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className={[s.remindIcon, s.remindIconTg].join(' ')}><Send size={16} /></span>
                    <span className={s.remindName}>{t('booking.remind.telegram')}</span>
                  </a>
                )}
              </div>

              {/* iOS in a tab can't do web push — guide them to install the PWA. */}
              {isIosSafari() && (
                <p className={s.iosPushHint}>
                  <Share size={13} />
                  <span>{t('booking.remind.iosHint')}</span>
                </p>
              )}
            </div>

            <div className={s.successFooter}>
              <button className={s.doneBtn} onClick={animatedClose}>{t('booking.done')}</button>
            </div>
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
                        <div className={s.optMeta}>
                          <span>{sp.title}</span>
                          {(sp.rating ?? 0) > 0 && (sp.reviewCount ?? 0) > 0 && (
                            <StarRatingDisplay value={sp.rating!} count={sp.reviewCount!} size={12} compact />
                          )}
                        </div>
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
                    hideSpecialist={isFacility}
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
      )}
    </ModalShell>
  )
}

/* ── Sub-components ── */

function ServiceStep({ partner, selectedId, onSelect }: {
  partner: PublicPartner
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const t = useT()
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
                  {sv.requiresSpecialist === false && (
                    <span style={{ marginLeft: 10 }}>
                      <Users size={12} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />
                      {t('booking.spots', { n: sv.capacity ?? 1 })}
                    </span>
                  )}
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

function SummaryRows({ service, specialist, anySpecialist, hideSpecialist, location, date, time, name, phone, hidePrice }: {
  service: Service | null
  specialist: Specialist | null
  anySpecialist: boolean
  /** Facility/entry service has no specialist — hide the row entirely. */
  hideSpecialist?: boolean
  location?: string | null
  date: string
  time: string | null
  name?: string
  phone?: string
  hidePrice?: boolean
}) {
  const t = useT()
  const { locale } = useI18n()
  const dateLabel = new Date(`${date}T00:00:00`).toLocaleDateString(LOCALE_META[locale].lang, {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  const Row = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) => (
    <div className={s.sumRow}>
      <span className={s.sumIcon}>{icon}</span>
      <span className={s.sumLabel}>{label}</span>
      <span className={s.sumValue}>{value}</span>
    </div>
  )

  return (
    <>
      {location && <Row icon={<MapPin size={15} />} label={t('booking.summary.branch')} value={location} />}
      <Row icon={<Sparkles size={15} />} label={t('booking.summary.service')} value={service?.name ?? '—'} />
      {!hideSpecialist && (
        <Row
          icon={<Users size={15} />}
          label={t('booking.summary.specialist')}
          value={anySpecialist ? t('booking.summary.anyAvailable') : specialist?.name ?? '—'}
        />
      )}
      <Row icon={<Calendar size={15} />} label={t('booking.summary.date')} value={dateLabel} />
      <Row
        icon={<Clock size={15} />}
        label={t('booking.summary.time')}
        value={<>{time ?? '—'}{service ? ` · ${fmtDuration(service.duration)}` : ''}</>}
      />
      {name && <Row icon={<Users size={15} />} label={t('booking.summary.name')} value={name} />}
      {phone && <Row icon={<MapPin size={15} />} label={t('booking.summary.phone')} value={phone} />}
      {!hidePrice && service && (
        <div className={[s.sumRow, s.sumTotal].join(' ')}>
          <span className={s.sumTotalLabel}>{t('booking.summary.total')}</span>
          <span className={s.sumTotalValue}>{fmtAMD(service.price)}</span>
        </div>
      )}
    </>
  )
}
