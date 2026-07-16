import { useState, useEffect, useMemo } from 'react'
import { ArrowLeft, X, Check, Users, Calendar, Clock, CheckCircle2, ArrowRight, Sparkles, MapPin, Send, AlertCircle, CalendarPlus, Bell, BellRing, Share } from 'lucide-react'
import { fmtServicePrice, fmtDuration, fmtDateInput, initials } from '@reserva/shared'
import { StarRatingDisplay } from '@/components/StarRating/StarRating'
import { DatePicker } from '@reserva/ui'
import { DayStrip, type DayInfo } from './DayStrip/DayStrip'
import type { Service, Specialist, WeekSchedule } from '@reserva/shared'
import type { PublicPartner } from '@/mock/partners'
import {
  specialistsForService,
  bookableLocations,
  getAvailableSlots,
  getAvailabilitySummary,
  createBooking,
} from '@/services/booking.service'
import { getTelegramConnectLink } from '@/services/telegram.service'
import { pushSupported, isIosSafari, notificationPermission, enableBookingPush } from '@/services/push.service'
import { friendlyError } from '@/services/errors'
import { ModalShell } from '@/components/ModalShell/ModalShell'
import { partnerBrandVars } from '../partnerBrand'
import { useAppSelector } from '@/store/hooks'
import { useT, useI18n, useLocalized, LOCALE_META } from '@/i18n'
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
  const loc = useLocalized()
  // The modal portals to <body>, escaping the page's brand-scoped vars — so
  // re-apply the partner's accent here for on-brand coloring.
  const theme = useAppSelector((st) => st.theme.theme)
  const brandVars = useMemo(() => partnerBrandVars(partner, theme === 'dark'), [partner, theme])

  // Only branches that can actually be booked (active + ≥1 active specialist).
  const locations = useMemo(() => bookableLocations(partner), [partner])
  const multiLocation = locations.length > 1

  // selections
  const [locationId, setLocationId]     = useState<string | null>(
    multiLocation ? null : locations[0]?.id ?? null
  )
  const [serviceId, setServiceId]       = useState<string | null>(seedServiceId)
  // null = not chosen, ANY_SPECIALIST = any. Solo partners always auto-assign.
  // A seeded specialist (from "Book with X") pre-selects that specialist.
  const [specialistId, setSpecialistId] = useState<string | null>(
    seedSpecialistId ?? (partner.kind === 'single' ? ANY_SPECIALIST : null),
  )
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
  // The date the current `slots` were actually loaded for. Guards the empty
  // state: we only show "no slots" once the load for the SELECTED date has
  // finished, so switching days shows the loader instead of a stale/empty flash.
  const [slotsForDate, setSlotsForDate] = useState<string | null>(null)
  // Per-day availability density for the strip dots, keyed by yyyy-mm-dd. Empty
  // until the summary loads; the strip renders fine without it (graceful).
  const [availability, setAvailability] = useState<Record<string, 0 | 1 | 2 | 3>>({})
  // Anchor day the 7-chip strip starts from. Normally today, but re-anchors when
  // the user picks a far-out date via the calendar so the strip + selection agree.
  const [stripAnchor, setStripAnchor] = useState(() => fmtDateInput(new Date()))

  // First step: location (multi-branch) → service → … or jump to specialist if
  // seeded. Solo partners never have a specialist step, so a seeded service
  // jumps to date/time instead.
  const soloMode = partner.kind === 'single'
  const [step, setStep] = useState<Step>(
    multiLocation
      ? 'location'
      : seedServiceId
        ? (soloMode ? 'datetime' : 'specialist')
        : 'service'
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

  // The 7 quick-pick days shown in the strip, starting at `stripAnchor`. `closed`
  // is derived client-side from the branch's weekly hours (same source as the
  // public page), so closed/open days are correct even before the backend slot-
  // count summary lands. `openDots` stays undefined until that summary wires in.
  const stripDays: DayInfo[] = useMemo(() => {
    const dowKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
    const hours = chosenLocation?.hours as WeekSchedule | undefined
    const [ay, am, ad] = stripAnchor.split('-').map(Number)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(ay, am - 1, ad + i)
      const iso = fmtDateInput(d)
      const day = hours?.[dowKeys[d.getDay()]]
      // No structured hours → assume open (don't disable on missing data).
      const closed = hours ? !day?.enabled : false
      // Dots from the server summary when loaded; undefined → no signal (chip
      // still renders + is selectable). Server also reports closed, but the
      // client-derived `closed` above keeps the strip correct pre-summary.
      return { date: iso, closed, openDots: availability[iso] }
    })
  }, [stripAnchor, chosenLocation, availability])

  /** Label for a strip date ("Today" / "Tomorrow" / "Sat 26") — used in copy. */
  const stripDateLabel = (iso: string): string => {
    const todayIso = fmtDateInput(new Date())
    const tmr = new Date(); tmr.setDate(tmr.getDate() + 1)
    if (iso === todayIso) return t('booking.strip.today')
    if (iso === fmtDateInput(tmr)) return t('booking.strip.tomorrow')
    const [y, m, dd] = iso.split('-').map(Number)
    const d = new Date(y, m - 1, dd)
    const dowKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
    return `${t(`partner.locations.days.${dowKeys[d.getDay()]}`)} ${dd}`
  }

  // Localized strings for the shared DatePicker (English-only by default). Full
  // month names for the header, short weekday names (Mon-first) for the column
  // headers, and a locale-appropriate trigger format reusing common.dateShort.
  const datePickerLabels = useMemo(() => ({
    monthNames: Array.from({ length: 12 }, (_, i) => t(`common.monthsLong.${i}`)),
    weekdayNames: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(k => t(`partner.locations.days.${k}`)),
    today: t('common.datePicker.today'),
    clear: t('common.datePicker.clear'),
    formatValue: (d: Date) =>
      t('common.dateShort', { day: d.getDate(), month: t(`common.monthsShort.${d.getMonth()}`), year: d.getFullYear() }),
  }), [t])


  // On entering the datetime step, land the user on a day that's actually open
  // (usually today) so they never arrive at an empty grid. Only nudges when the
  // current date is a closed day within the strip — a deliberate calendar pick
  // of a far/closed date is left untouched.
  useEffect(() => {
    if (step !== 'datetime') return
    const current = stripDays.find(d => d.date === date)
    if (current && !current.closed) return
    const firstOpen = stripDays.find(d => !d.closed)
    if (firstOpen && firstOpen.date !== date) {
      setDate(firstOpen.date)
      setTime(null)
    }
    // Run when the step opens or the branch (→ hours) changes, not on every
    // date change, so manual selections stick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, chosenLocation])

  // Load the 7-day availability summary for the strip dots when entering the
  // datetime step, or when the service / specialist / branch / anchor changes.
  // Best-effort: on failure the strip simply renders without dots.
  useEffect(() => {
    if (step !== 'datetime' || !service) return
    let active = true
    getAvailabilitySummary({
      partner,
      service,
      specialistId: specialistId === ANY_SPECIALIST ? null : specialistId,
      locationId,
      from: stripAnchor,
      days: 7,
    })
      .then(rows => {
        if (!active) return
        // Store the raw density only. Don't fold server `closed` into 0 — the
        // strip derives `closed` from the branch's hours; conflating them made a
        // real working day (with slots) render as an empty/"full" chip.
        const map: Record<string, 0 | 1 | 2 | 3> = {}
        for (const r of rows) if (!r.closed) map[r.date] = r.openDots
        setAvailability(map)
      })
      .catch(() => { if (active) setAvailability({}) })
    return () => { active = false }
  }, [step, service, partner, specialistId, locationId, stripAnchor])

  // Load slots when entering the datetime step (or changing date/specialist).
  useEffect(() => {
    if (step !== 'datetime' || !service) return
    let active = true
    setSlotsLoading(true)
    setSlots([])
    setSlotsForDate(null) // invalidate: results below are not yet for `date`
    getAvailableSlots({
      partner,
      service,
      specialistId: specialistId === ANY_SPECIALIST ? null : specialistId,
      locationId,
      date,
    }).then(res => {
      if (!active) return
      setSlots(res)
      setSlotsForDate(date)
      setSlotsLoading(false)
    })
    return () => { active = false }
  }, [step, service, partner, specialistId, locationId, date])

  // ── Step navigation ──
  //  - location step only for multi-branch salons
  //  - specialist step is dropped for facility/entry services (no specialist)
  // Solo professional: there's only one specialist, so never show the picker —
  // the backend auto-assigns when specialistId is ANY_SPECIALIST.
  const isSingle = partner.kind === 'single'
  // "Book with X": the visitor already chose the specialist on their profile, so
  // skip the picker step and scope services to that specialist.
  const seededSpecialist = seedSpecialistId
    ? partner.specialists.find((sp) => sp.id === seedSpecialistId && sp.active) ?? null
    : null
  const STEP_ORDER: Step[] = useMemo(() => {
    const steps: Step[] = ['service', 'datetime', 'details', 'confirm']
    if (!isFacility && !isSingle && !seededSpecialist) steps.splice(1, 0, 'specialist')
    if (multiLocation) steps.unshift('location')
    return steps
  }, [multiLocation, isFacility, isSingle, seededSpecialist])
  const stepIndex = STEP_ORDER.indexOf(step)
  const totalSteps = STEP_ORDER.length

  const goBack = () => {
    const i = STEP_ORDER.indexOf(step)
    if (i > 0) setStep(STEP_ORDER[i - 1])
  }

  const selectLocation = (id: string) => {
    setLocationId(id)
    setSpecialistId(isSingle ? ANY_SPECIALIST : null)
    setTime(null)
    setStep('service')
  }

  const selectService = (id: string) => {
    setServiceId(id)
    setTime(null)
    setSpecialistId(isSingle ? ANY_SPECIALIST : null)
    // Facility/entry service (spa): no specialist → jump straight to date/time.
    if (partner.services.find(sv => sv.id === id)?.requiresSpecialist === false) {
      setStep('datetime')
      return
    }
    // Solo professional: auto-assign the one specialist, skip the picker.
    if (isSingle) {
      setSpecialistId(ANY_SPECIALIST)
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

    const spName = chosenSpecialist ? loc(chosenSpecialist.name, chosenSpecialist.nameI18n) : undefined
    const svcName = loc(service.name, service.nameI18n)
    const title = t('booking.ics.title', { service: svcName, salon: partner.name })
    const description = t('booking.ics.description', {
      service: svcName,
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
    <div
      className={[s.overlay, closing ? s.closing : ''].filter(Boolean).join(' ')}
      onClick={animatedClose}
      style={brandVars}
    >
      <div className={[s.modal, closing ? s.closing : ''].filter(Boolean).join(' ')} onClick={e => e.stopPropagation()}>

        {step !== 'success' && (
          <div className={s.header}>
            <div className={s.headTop}>
              <button className={s.backBtn} onClick={goBack} disabled={stepIndex === 0 || (step === 'specialist' && !!seedServiceId && !multiLocation)}>
                <ArrowLeft size={16} />
              </button>
              <span className={s.stepLabel}>
                <Sparkles size={13} className={s.stepIcon} /> {stepLabel}
              </span>
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
                  hideSpecialist={isFacility || isSingle}
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
                  onlyServiceIds={seededSpecialist?.services}
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
                        {sp.avatarUrl
                          ? <img src={sp.avatarUrl} alt={sp.name} className={s.optAvatarImg} />
                          : initials(sp.name)}
                      </span>
                      <div className={s.optBody}>
                        <div className={s.optName}>{loc(sp.name, sp.nameI18n)}</div>
                        <div className={s.optMeta}>
                          <span>{loc(sp.title, sp.titleI18n)}</span>
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
                  <label className={s.fieldLabel}>{t('booking.dateLabel')}</label>

                  {/* Quick day strip — the primary path for the common case of
                      booking within the next week. */}
                  <DayStrip days={stripDays} selected={date} onSelect={v => { setDate(v); setTime(null) }} />

                  {/* Calendar escape hatch for dates beyond the strip. DatePicker
                      owns its own floating calendar panel (anchored dropdown), so
                      it overlays rather than reflowing the slots below. */}
                  <div className={s.pickDateRow}>
                    <DatePicker
                      variant="link"
                      value={date}
                      min={fmtDateInput(new Date())}
                      placeholder={t('booking.strip.pickAnother')}
                      labels={datePickerLabels}
                      onChange={v => {
                        setDate(v); setTime(null)
                        // Re-anchor the strip so it opens on the picked date and
                        // the two date UIs always agree.
                        setStripAnchor(v)
                      }}
                    />
                  </div>

                  <label className={s.fieldLabel}>{t('booking.availableTimes')}</label>
                  <div className={s.slotsWrap}>
                    {slotsLoading || slotsForDate !== date ? (
                      <div className={s.slotsLoading}>
                        <span className={s.miniSpinner} /> {t('booking.findingSlots')}
                      </div>
                    ) : slots.length === 0 ? (
                      (() => {
                        // A full/closed day is a dead end today — offer the next
                        // open day in the strip as a one-tap jump.
                        const next = stripDays.find(d => d.date > date && !d.closed)
                        return (
                          <div className={s.noSlots}>
                            <div>{t('booking.noSlots')}</div>
                            {next && (
                              <button
                                type="button"
                                className={s.nextOpenBtn}
                                onClick={() => { setDate(next.date); setTime(null) }}
                              >
                                {t('booking.strip.nextOpening', { day: stripDateLabel(next.date) })}
                              </button>
                            )}
                          </div>
                        )
                      })()
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
                    hideSpecialist={isFacility || isSingle}
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

function ServiceStep({ partner, selectedId, onSelect, onlyServiceIds }: {
  partner: PublicPartner
  selectedId: string | null
  onSelect: (id: string) => void
  /** When set (e.g. "Book with X"), only these service ids are shown. */
  onlyServiceIds?: string[]
}) {
  const t = useT()
  const loc = useLocalized()
  const allow = onlyServiceIds ? new Set(onlyServiceIds) : null
  const services = partner.services.filter(sv => sv.active && (!allow || allow.has(sv.id)))
  const categories = Array.from(new Set(services.map(sv => sv.category)))

  return (
    <div>
      {categories.map(cat => {
        const catSvc = services.find(sv => sv.category === cat && sv.categoryI18n)
        const catText = catSvc ? loc(catSvc.category, catSvc.categoryI18n) : cat
        return (
        <div key={cat}>
          <div className={s.catLabel}>{catText}</div>
          {services.filter(sv => sv.category === cat).map(sv => (
            <button
              key={sv.id}
              className={[s.option, selectedId === sv.id ? s.selected : ''].filter(Boolean).join(' ')}
              onClick={() => onSelect(sv.id)}
            >
              <div className={s.optBody}>
                <div className={s.optName}>{loc(sv.name, sv.nameI18n)}</div>
                <div className={s.optMeta}>
                  <span><Clock size={12} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />{fmtDuration(sv.duration, { min: t('partner.services.min'), h: t('partner.services.hour') })}</span>
                  {sv.requiresSpecialist === false && (
                    <span style={{ marginLeft: 10 }}>
                      <Users size={12} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />
                      {t('booking.spots', { n: sv.capacity ?? 1 })}
                    </span>
                  )}
                </div>
              </div>
              <span className={s.optPrice}>{fmtServicePrice(sv)}</span>
            </button>
          ))}
        </div>
        )
      })}
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
  const loc = useLocalized()
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
      <Row icon={<Sparkles size={15} />} label={t('booking.summary.service')} value={service ? loc(service.name, service.nameI18n) : '—'} />
      {!hideSpecialist && (
        <Row
          icon={<Users size={15} />}
          label={t('booking.summary.specialist')}
          value={anySpecialist ? t('booking.summary.anyAvailable') : (specialist ? loc(specialist.name, specialist.nameI18n) : '—')}
        />
      )}
      <Row icon={<Calendar size={15} />} label={t('booking.summary.date')} value={dateLabel} />
      <Row
        icon={<Clock size={15} />}
        label={t('booking.summary.time')}
        value={<>{time ?? '—'}{service ? ` · ${fmtDuration(service.duration, { min: t('partner.services.min'), h: t('partner.services.hour') })}` : ''}</>}
      />
      {name && <Row icon={<Users size={15} />} label={t('booking.summary.name')} value={name} />}
      {phone && <Row icon={<MapPin size={15} />} label={t('booking.summary.phone')} value={phone} />}
      {!hidePrice && service && (
        <div className={[s.sumRow, s.sumTotal].join(' ')}>
          <span className={s.sumTotalLabel}>{t('booking.summary.total')}</span>
          <span className={s.sumTotalValue}>{fmtServicePrice(service)}</span>
        </div>
      )}
      {!hidePrice && service?.priceType === 'range' && (
        <div className={s.sumNote}>{t('booking.priceRangeNote')}</div>
      )}
    </>
  )
}
