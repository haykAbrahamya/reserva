import { useState, useEffect, useMemo } from 'react'
import { ArrowLeft, X, Check, Users, Calendar, Clock, CheckCircle2, ArrowRight, Sparkles, MapPin, Send, AlertCircle, CalendarPlus, Bell, BellRing, Share, UserCheck } from 'lucide-react'
import {
  fmtServicePrice, fmtDuration, fmtDurationSpan, fmtDateInput, hasPublicPrice, initials, isValidPhone,
  spanOf, worksAt, type Offer, type PricedService,
} from '@reserva/shared'
import { StarRatingDisplay } from '@/components/StarRating/StarRating'
import { DatePicker } from '@reserva/ui'
import { DayStrip, type DayInfo } from './DayStrip/DayStrip'
import { PhoneField, formatPhoneDisplay } from './PhoneField/PhoneField'
import type { Booking, Service, Specialist, WeekSchedule } from '@reserva/shared'
import type { PublicPartner } from '@/mock/partners'
import {
  specialistsForService,
  bookableLocations,
  bookableAt,
  offersFor,
  priceBookOf,
  getAvailableSlots,
  getSlotOptions,
  getAvailabilitySummary,
  createBooking,
  type SlotOption,
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
  /** The branch the visitor was looking at ("Book here", or the services list's branch). */
  seedLocationId?: string | null
  onClose: () => void
}

const ANY_SPECIALIST = '__any__'

export function BookingFlow({ partner, seedServiceId, seedSpecialistId = null, seedLocationId = null, onClose }: Props) {
  const t = useT()
  const { locale } = useI18n()
  const loc = useLocalized()
  // The modal portals to <body>, escaping the page's brand-scoped vars — so
  // re-apply the partner's accent here for on-brand coloring.
  const theme = useAppSelector((st) => st.theme.theme)
  const brandVars = useMemo(() => partnerBrandVars(partner, theme === 'dark'), [partner, theme])

  // Branch & specialist prices (sparse overrides on the payload), resolved with
  // the same rule as the server: own price at the branch → branch → default.
  const book = useMemo(() => priceBookOf(partner), [partner])
  const priceLabels = useMemo(() => ({ from: t('partner.services.priceFrom') }), [t])
  const durationLabels = useMemo(() => ({ min: t('partner.services.min'), h: t('partner.services.hour') }), [t])

  const soloMode = partner.kind === 'single'
  const isSingle = soloMode

  // "Book with X": the visitor already chose the specialist on their profile.
  const seededSpecialist = seedSpecialistId
    ? partner.specialists.find((sp) => sp.id === seedSpecialistId && sp.active) ?? null
    : null

  // Every bookable branch of the salon (labels: "which branch" rows show when > 1).
  const allBranches = useMemo(() => bookableLocations(partner), [partner])
  const partnerMultiBranch = allBranches.length > 1
  // Branches the visitor can pick from: all of them, or — booking with a
  // specific specialist — the ones that specialist works at.
  const locations = useMemo(
    () => (seededSpecialist ? allBranches.filter((l) => worksAt(seededSpecialist, l.id)) : allBranches),
    [allBranches, seededSpecialist],
  )
  const chooseBranch = locations.length > 1

  const initialLocation: string | null =
    seedLocationId && locations.some((l) => l.id === seedLocationId)
      ? seedLocationId
      : locations.length === 1
        ? locations[0].id
        : null

  // selections
  const [locationId, setLocationId]     = useState<string | null>(initialLocation)
  const [serviceId, setServiceId]       = useState<string | null>(seedServiceId)
  // null = not chosen, ANY_SPECIALIST = any. Solo partners always auto-assign.
  const [specialistId, setSpecialistId] = useState<string | null>(
    seededSpecialist?.id ?? (soloMode ? ANY_SPECIALIST : null),
  )
  const [date, setDate]                 = useState(fmtDateInput(new Date()))
  const [time, setTime]                 = useState<string | null>(null)
  const [name, setName]                 = useState('')
  // Phone is stored in E.164 ("+37493813296"). Default to the Armenian country
  // code since our audience is almost entirely local — the PhoneField shows a
  // fixed "+374" prefix and the user types only the 8 local digits.
  const [phone, setPhone]               = useState('+374')
  // false = Armenian +374 mode (default), true = international plain field.
  const [phoneIntl, setPhoneIntl]       = useState(false)
  const [notes, setNotes]               = useState('')
  // Field-level validation — errors show only after a field is touched / on submit.
  const [touched, setTouched]           = useState<{ name?: boolean; phone?: boolean }>({})
  // Backend error from the final confirm call (slot taken, etc.).
  const [submitError, setSubmitError]   = useState<string | null>(null)
  const [submitting, setSubmitting]     = useState(false)
  // The just-created booking: drives confirmed vs pending copy, and shows who it
  // was booked with and at what price (the server may have assigned someone).
  const [booked, setBooked]             = useState<Booking | null>(null)
  // Telegram connect deep link for the just-created booking (null = unavailable
  // / already connected / telegram disabled → button hidden).
  const [telegramLink, setTelegramLink] = useState<string | null>(null)
  // Web-push enrolment state for the just-created booking.
  const [pushState, setPushState] = useState<'idle' | 'enabling' | 'on' | 'denied'>('idle')

  // slots
  const [slots, setSlots]           = useState<string[]>([])
  // "Any available": who each time would be booked with, and their price.
  const [slotOptions, setSlotOptions] = useState<SlotOption[] | null>(null)
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

  const seedService = seedServiceId ? partner.services.find((sv) => sv.id === seedServiceId) ?? null : null

  // Where the flow opens: the branch step when the visitor still has to choose
  // one; otherwise straight to whatever the seeded service needs next.
  const [step, setStep] = useState<Step>(() => {
    if (chooseBranch && !initialLocation) return 'location'
    if (seedService && (!initialLocation || bookableAt(partner, seedService, initialLocation))) {
      if (seedService.requiresSpecialist === false || soloMode) return 'datetime'
      if (seededSpecialist && seededSpecialist.services.includes(seedService.id)) return 'datetime'
      return 'specialist'
    }
    return 'service'
  })

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
    () => allBranches.find(l => l.id === locationId) ?? null,
    [allBranches, locationId]
  )

  // ── Prices ──
  /** One specialist's price/duration for the chosen service at the chosen branch. */
  const offerFor = (spId: string | null): Offer | null =>
    service ? book.offer(service, locationId ?? '', spId) : null
  // "Any available": who the chosen time would go to (from slot-options).
  const assigned = specialistId === ANY_SPECIALIST && time && slotOptions
    ? slotOptions.find(o => o.time === time) ?? null
    : null
  const assignedSpecialist = assigned ? partner.specialists.find(sp => sp.id === assigned.specialistId) ?? null : null
  /**
   * What this booking will cost and take: the chosen specialist's offer, the
   * assigned one for "any", or — before a time is picked — the span across
   * everyone eligible ("5 000 – 7 000 ֏").
   */
  const currentOffer: Offer | null = !service
    ? null
    : isFacility || isSingle
      ? offerFor(null)
      : specialistId && specialistId !== ANY_SPECIALIST
        ? offerFor(specialistId)
        : assigned
          ? offerFor(assigned.specialistId)
          : null
  const anySpan = useMemo(
    () => (service && locationId && !isFacility
      ? spanOf(eligibleSpecialists.map(sp => book.offer(service, locationId, sp.id)))
      : null),
    [service, locationId, isFacility, eligibleSpecialists, book],
  )
  const priceShown: PricedService | null = currentOffer ?? anySpan
  const minutesShown = currentOffer?.duration ?? anySpan?.durationMin ?? service?.duration ?? 0

  // The 7 quick-pick days shown in the strip, starting at `stripAnchor`. `closed`
  // is derived client-side from the branch's weekly hours (same source as the
  // public page), so closed/open days are correct even before the backend slot-
  // count summary lands.
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
      // still renders + is selectable).
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

  // Localized strings for the shared DatePicker (English-only by default).
  const datePickerLabels = useMemo(() => ({
    monthNames: Array.from({ length: 12 }, (_, i) => t(`common.monthsLong.${i}`)),
    weekdayNames: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(k => t(`partner.locations.days.${k}`)),
    today: t('common.datePicker.today'),
    clear: t('common.datePicker.clear'),
    formatValue: (d: Date) =>
      t('common.dateShort', { day: d.getDate(), month: t(`common.monthsShort.${d.getMonth()}`), year: d.getFullYear() }),
  }), [t])

  // On entering the datetime step, land the user on a day that's actually open
  // (usually today) so they never arrive at an empty grid.
  useEffect(() => {
    if (step !== 'datetime') return
    const current = stripDays.find(d => d.date === date)
    if (current && !current.closed) return
    const firstOpen = stripDays.find(d => !d.closed)
    if (firstOpen && firstOpen.date !== date) {
      setDate(firstOpen.date)
      setTime(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, chosenLocation])

  // Load the 7-day availability summary for the strip dots.
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
        const map: Record<string, 0 | 1 | 2 | 3> = {}
        for (const r of rows) if (!r.closed) map[r.date] = r.openDots
        setAvailability(map)
      })
      .catch(() => { if (active) setAvailability({}) })
    return () => { active = false }
  }, [step, service, partner, specialistId, locationId, stripAnchor])

  // "Any available" with several people who might charge differently: ask the
  // server who each time goes to (and their price) so the client sees it
  // before confirming. A specific specialist, a facility or a solo pro: plain times.
  const wantsOptions = specialistId === ANY_SPECIALIST && !isFacility && !isSingle

  // Load slots when entering the datetime step (or changing date/specialist).
  useEffect(() => {
    if (step !== 'datetime' || !service) return
    let active = true
    setSlotsLoading(true)
    setSlots([])
    setSlotOptions(null)
    setSlotsForDate(null) // invalidate: results below are not yet for `date`
    const query = {
      partner,
      service,
      specialistId: specialistId === ANY_SPECIALIST ? null : specialistId,
      locationId,
      date,
    }
    const load = async () => {
      if (wantsOptions) {
        const options = await getSlotOptions(query).catch(() => null)
        // Older API without slot options → fall back to the plain times.
        if (options) return { times: options.map(o => o.time), options }
      }
      return { times: await getAvailableSlots(query), options: null }
    }
    load()
      .then(({ times, options }) => {
        if (!active) return
        setSlots(times)
        setSlotOptions(options)
        setSlotsForDate(date)
      })
      .catch(() => { if (active) { setSlots([]); setSlotsForDate(date) } })
      .finally(() => { if (active) setSlotsLoading(false) })
    return () => { active = false }
  }, [step, service, partner, specialistId, locationId, date, wantsOptions])

  // ── Step navigation ──
  //  - location step only when the visitor has more than one branch to choose
  //  - specialist step is dropped for facility/entry services and solo pros
  // The order stays fixed for a booking, so Back always has somewhere to go —
  // jumping over a step (a pre-chosen specialist) still leaves it reachable.
  const STEP_ORDER: Step[] = useMemo(() => {
    const steps: Step[] = ['service', 'datetime', 'details', 'confirm']
    if (!isFacility && !isSingle) steps.splice(1, 0, 'specialist')
    if (chooseBranch) steps.unshift('location')
    return steps
  }, [chooseBranch, isFacility, isSingle])
  const stepIndex = Math.max(0, STEP_ORDER.indexOf(step))
  const totalSteps = STEP_ORDER.length

  const goBack = () => {
    const i = STEP_ORDER.indexOf(step)
    if (i > 0) setStep(STEP_ORDER[i - 1])
  }

  /** After a service is settled (at `locId`), move to whatever it needs next. */
  const advanceFromService = (svc: Service, locId: string | null) => {
    // Facility/entry service (spa): no specialist → straight to date/time.
    if (svc.requiresSpecialist === false) { setStep('datetime'); return }
    // Solo professional: auto-assign the one specialist, skip the picker.
    if (isSingle) { setSpecialistId(ANY_SPECIALIST); setStep('datetime'); return }
    // Booking with someone specific who does this here: skip the picker.
    if (seededSpecialist) {
      const eligible = specialistsForService(partner, svc.id, locId)
      if (eligible.some(sp => sp.id === seededSpecialist.id)) {
        setSpecialistId(seededSpecialist.id)
        setStep('datetime')
        return
      }
    }
    setStep('specialist')
  }

  const selectLocation = (id: string) => {
    setLocationId(id)
    setTime(null)
    setSpecialistId(isSingle ? ANY_SPECIALIST : seededSpecialist && worksAt(seededSpecialist, id) ? seededSpecialist.id : null)
    // A service picked before the branch (e.g. "Book" on a service row) carries
    // over when this branch does it; otherwise choose one that it does.
    if (service && bookableAt(partner, service, id)) {
      advanceFromService(service, id)
      return
    }
    if (service) setServiceId(null)
    setStep('service')
  }

  const selectService = (id: string) => {
    setServiceId(id)
    setTime(null)
    setSpecialistId(isSingle ? ANY_SPECIALIST : null)
    const svc = partner.services.find(sv => sv.id === id)
    if (svc) advanceFromService(svc, locationId)
  }

  const selectSpecialist = (id: string) => {
    setSpecialistId(id)
    setTime(null)
    setStep('datetime')
  }

  // Codes that mean "this slot (or its price) won't work" → pick a time again.
  const SLOT_ERROR_CODES = new Set([
    'BOOKING_OVERLAP', 'SPECIALIST_TIME_OFF', 'OUTSIDE_WORKING_HOURS', 'PAST_DATE', 'INVALID_TIME_RANGE', 'PRICE_CHANGED',
  ])

  const handleConfirm = async () => {
    if (!service) return
    setSubmitError(null)
    setSubmitting(true)
    try {
      const anyMode = specialistId === ANY_SPECIALIST
      // Only promise a price the client actually saw: a specific specialist's
      // (or facility / solo) offer, or the one previewed for "any".
      const shownPrice =
        !service.hidePrice && currentOffer?.price != null && (!anyMode || isSingle || !!assigned)
          ? currentOffer.price
          : null
      const result = await createBooking({
        partner,
        service,
        specialistId: anyMode ? null : specialistId,
        locationId,
        date,
        time: time!,
        clientName: name.trim(),
        clientPhone: phone.trim(),
        notes: notes.trim() || undefined,
        locale,
        expectedPrice: shownPrice,
        preferredSpecialistId: anyMode && assigned ? assigned.specialistId : null,
      })
      setBooked(result)
      setStep('success')
      // Offer free Telegram updates for this booking (best-effort, non-blocking).
      getTelegramConnectLink(result.id).then(setTelegramLink)
    } catch (err) {
      const code = (err as { code?: string } | null)?.code
      setSubmitError(friendlyError(err, t))
      // If the chosen slot (or its price) is no longer valid, bounce back to
      // time selection so the user can immediately pick again (fresh slots).
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

  // Who it was actually booked with (the server assigns "any"), for the success screen.
  const bookedSpecialist = booked?.specialistId
    ? partner.specialists.find(sp => sp.id === booked.specialistId) ?? null
    : null
  const bookedLocation = booked ? allBranches.find(l => l.id === booked.locationId) ?? chosenLocation : chosenLocation
  // What it was booked at — the server's snapshot, never a guess.
  const bookedPrice: PricedService | null = booked && service && !service.hidePrice && booked.priceAtBooking != null
    ? {
        price: booked.priceAtBooking,
        priceType: booked.priceTypeAtBooking ?? service.priceType ?? 'fixed',
        priceMax: booked.priceMaxAtBooking ?? null,
      }
    : null
  const bookedMinutes = booked
    ? Math.round((new Date(booked.endISO).getTime() - new Date(booked.startISO).getTime()) / 60_000)
    : minutesShown
  const bookedStatus: 'confirmed' | 'pending' = booked?.status === 'confirmed' ? 'confirmed' : 'pending'

  // Add the booking to the user's calendar — opens Google Calendar (app on
  // Android, web on desktop) or hands an .ics to Apple Calendar on iOS/macOS.
  const handleAddToCalendar = () => {
    if (!service || !time) return
    const start = new Date(`${date}T00:00:00`)
    const [h, m] = time.split(':').map(Number)
    start.setHours(h, m, 0, 0)
    const end = new Date(start.getTime() + (bookedMinutes || service.duration) * 60_000)

    const who = bookedSpecialist ?? chosenSpecialist
    const spName = who ? loc(who.name, who.nameI18n) : undefined
    const svcName = loc(service.name, service.nameI18n)
    const title = t('booking.ics.title', { service: svcName, salon: partner.name })
    const description = t('booking.ics.description', {
      service: svcName,
      salon: partner.name,
      specialist: spName ?? t('booking.ics.anySpecialist'),
    })
    const place = bookedLocation?.address || bookedLocation?.name || partner.name

    addToCalendar(
      {
        uid: booked?.id ?? `${partner.id}-${start.getTime()}`,
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
    if (!booked || pushState === 'enabling' || pushState === 'on' || pushState === 'denied') return
    setPushState('enabling')
    try {
      const ok = await enableBookingPush(booked.id)
      setPushState(ok ? 'on' : (notificationPermission() === 'denied' ? 'denied' : 'idle'))
    } catch {
      setPushState('idle')
    }
  }

  // Push is offered whenever the browser can do it (and isn't an iOS Safari tab
  // that needs Add-to-Home-Screen first).
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
    if (!v || v === '+' || v === '+374') return 'booking.validation.phoneRequired'
    if (!isValidPhone(v)) return 'booking.validation.phoneInvalid'
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
    setTouched({ name: true, phone: true })
    if (!detailsValid) return
    setStep('confirm')
  }

  /** Avatar circle for a specialist (photo, else initials on the brand tint). */
  const avatar = (sp: Specialist, small = false) => (
    <span
      className={[s.optAvatar, small ? s.optAvatarSm : ''].filter(Boolean).join(' ')}
      style={{ background: `linear-gradient(140deg, ${t1}, ${t2})` }}
    >
      {sp.avatarUrl
        ? <img src={sp.avatarUrl} alt={sp.name} className={s.optAvatarImg} />
        : initials(sp.name)}
    </span>
  )

  const fmtPrice = (p: PricedService | null) => (p && hasPublicPrice(p) ? fmtServicePrice(p, priceLabels) : '')

  // Durations among eligible specialists differ → say so on each row.
  const durationsVary = !!anySpan && anySpan.durationMin !== anySpan.durationMax

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
              <button className={s.backBtn} onClick={goBack} disabled={stepIndex === 0} aria-label={t('booking.back')}>
                <ArrowLeft size={16} />
              </button>
              <span className={s.stepLabel}>
                <Sparkles size={13} className={s.stepIcon} /> {stepLabel}
              </span>
              <button className={s.closeBtn} onClick={animatedClose} aria-label={t('booking.done')}><X size={16} /></button>
            </div>
            <div className={s.progress}>
              {STEP_ORDER.map((_, i) => (
                <div key={i} className={s.segment}>
                  <span className={[s.segFill, i < stepIndex ? s.done : '', i === stepIndex ? s.active : ''].filter(Boolean).join(' ')} />
                </div>
              ))}
            </div>
            {/* Context the visitor has already chosen — so "which branch?" is
                never a guess on a multi-branch salon. */}
            {partnerMultiBranch && chosenLocation && step !== 'location' && (
              <div className={s.contextBar}>
                <MapPin size={13} />
                <span className={s.contextName}>{loc(chosenLocation.name, chosenLocation.nameI18n)}</span>
                {chooseBranch && (
                  <button type="button" className={s.contextChange} onClick={() => setStep('location')}>
                    {t('booking.changeBranch')}
                  </button>
                )}
              </div>
            )}
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
              {/* Appointment details — who, where, when and what it costs. */}
              <div className={s.successCard}>
                <SummaryRows
                  service={service}
                  specialistLabel={
                    isFacility || isSingle
                      ? null
                      : bookedSpecialist
                        ? loc(bookedSpecialist.name, bookedSpecialist.nameI18n)
                        : chosenSpecialist
                          ? loc(chosenSpecialist.name, chosenSpecialist.nameI18n)
                          : t('booking.summary.anyAvailable')
                  }
                  location={partnerMultiBranch && bookedLocation ? loc(bookedLocation.name, bookedLocation.nameI18n) : null}
                  date={date}
                  time={time}
                  minutes={bookedMinutes}
                  price={bookedPrice}
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
                  {locations.map(l => {
                    // A service picked first: show what it costs at each branch
                    // (and which branches don't do it) so the choice is informed.
                    const svcHere = service ? bookableAt(partner, service, l.id) : true
                    const span = service && svcHere ? spanOf(offersFor(partner, service, l.id)) : null
                    return (
                      <button
                        key={l.id}
                        className={[s.option, locationId === l.id ? s.selected : '', svcHere ? '' : s.optionMuted].filter(Boolean).join(' ')}
                        onClick={() => selectLocation(l.id)}
                      >
                        <span className={s.anyIcon}><MapPin size={20} /></span>
                        <div className={s.optBody}>
                          <div className={s.optName}>{loc(l.name, l.nameI18n)}</div>
                          <div className={s.optMeta}>
                            <span className={s.optMetaWrap}>{l.address}</span>
                          </div>
                          {service && (
                            <div className={s.optHint}>
                              {svcHere
                                ? <>{loc(service.name, service.nameI18n)}{span ? ` · ${fmtDurationSpan(span.durationMin, span.durationMax, durationLabels)}` : ''}</>
                                : t('booking.notAtBranch', { service: loc(service.name, service.nameI18n) })}
                            </div>
                          )}
                        </div>
                        {span && hasPublicPrice(span) && <span className={s.optPrice}>{fmtServicePrice(span, priceLabels)}</span>}
                        {locationId === l.id && !span && <Check size={18} className={s.check} />}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* STEP: service */}
              {step === 'service' && (
                <ServiceStep
                  partner={partner}
                  locationId={locationId}
                  selectedId={serviceId}
                  onSelect={selectService}
                  specialist={seededSpecialist}
                />
              )}

              {/* STEP: specialist */}
              {step === 'specialist' && (
                <div>
                  {eligibleSpecialists.length === 0 ? (
                    <div className={s.emptyStep}>
                      <Users size={22} />
                      <p>{t('booking.noOneHere')}</p>
                      {chooseBranch && (
                        <button type="button" className={s.nextOpenBtn} onClick={() => setStep('location')}>
                          {t('booking.changeBranch')}
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* "Any available" only makes sense with more than one person. */}
                      {eligibleSpecialists.length > 1 && (
                        <>
                          <button
                            className={[s.option, specialistId === ANY_SPECIALIST ? s.selected : ''].filter(Boolean).join(' ')}
                            onClick={() => selectSpecialist(ANY_SPECIALIST)}
                          >
                            <span className={s.anyIcon}><Sparkles size={20} /></span>
                            <div className={s.optBody}>
                              <div className={s.optName}>{t('booking.anySpecialist')}</div>
                              <div className={s.optMeta}>
                                {anySpan?.varies ? t('booking.anyVaries') : t('booking.anySpecialistMeta')}
                              </div>
                            </div>
                            {fmtPrice(anySpan)
                              ? <span className={s.optPrice}>{fmtPrice(anySpan)}</span>
                              : specialistId === ANY_SPECIALIST && <Check size={18} className={s.check} />}
                          </button>

                          <div className={s.catLabel}>{t('booking.orChooseSomeone')}</div>
                        </>
                      )}

                      {eligibleSpecialists.map(sp => {
                        const offer = offerFor(sp.id)
                        const price = fmtPrice(offer)
                        return (
                          <button
                            key={sp.id}
                            className={[s.option, specialistId === sp.id ? s.selected : ''].filter(Boolean).join(' ')}
                            onClick={() => selectSpecialist(sp.id)}
                          >
                            {avatar(sp)}
                            <div className={s.optBody}>
                              <div className={s.optName}>{loc(sp.name, sp.nameI18n)}</div>
                              <div className={s.optMeta}>
                                <span>{loc(sp.title, sp.titleI18n)}</span>
                                {(sp.rating ?? 0) > 0 && (sp.reviewCount ?? 0) > 0 && (
                                  <StarRatingDisplay value={sp.rating!} count={sp.reviewCount!} size={12} compact />
                                )}
                                {durationsVary && offer && (
                                  <span><Clock size={12} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />{fmtDuration(offer.duration, durationLabels)}</span>
                                )}
                              </div>
                            </div>
                            {price
                              ? <span className={s.optPrice}>{price}</span>
                              : specialistId === sp.id && <Check size={18} className={s.check} />}
                          </button>
                        )
                      })}
                    </>
                  )}
                </div>
              )}

              {/* STEP: datetime */}
              {step === 'datetime' && (
                <div>
                  <label className={s.fieldLabel}>{t('booking.dateLabel')}</label>

                  {/* Quick day strip — the primary path for the common case of
                      booking within the next week. */}
                  <DayStrip days={stripDays} selected={date} onSelect={v => { setDate(v); setTime(null) }} />

                  {/* Calendar escape hatch for dates beyond the strip. */}
                  <div className={s.pickDateRow}>
                    <DatePicker
                      variant="link"
                      value={date}
                      min={fmtDateInput(new Date())}
                      placeholder={t('booking.strip.pickAnother')}
                      labels={datePickerLabels}
                      onChange={v => {
                        setDate(v); setTime(null)
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

                  {/* "Any available": say who this time goes to, and the price,
                      before the client commits to anything. */}
                  {assigned && assignedSpecialist && (
                    <div className={s.assigned} role="status" aria-live="polite">
                      {avatar(assignedSpecialist, true)}
                      <div className={s.assignedBody}>
                        <div className={s.assignedLabel}><UserCheck size={13} /> {t('booking.assignedLabel', { time: assigned.time })}</div>
                        <div className={s.assignedName}>{loc(assignedSpecialist.name, assignedSpecialist.nameI18n)}</div>
                      </div>
                      {currentOffer && fmtPrice(currentOffer) && (
                        <div className={s.assignedPrice}>
                          <span>{fmtPrice(currentOffer)}</span>
                          <small>{fmtDuration(currentOffer.duration, durationLabels)}</small>
                        </div>
                      )}
                    </div>
                  )}
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
                    <PhoneField
                      value={phone}
                      onChange={setPhone}
                      onBlur={() => setTouched(p => ({ ...p, phone: true }))}
                      invalid={!!(touched.phone && phoneError())}
                      intl={phoneIntl}
                      onIntlChange={setPhoneIntl}
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
                    specialistLabel={
                      isFacility || isSingle
                        ? null
                        : chosenSpecialist
                          ? loc(chosenSpecialist.name, chosenSpecialist.nameI18n)
                          : assignedSpecialist
                            ? loc(assignedSpecialist.name, assignedSpecialist.nameI18n)
                            : t('booking.summary.anyAvailable')
                    }
                    location={partnerMultiBranch && chosenLocation ? loc(chosenLocation.name, chosenLocation.nameI18n) : null}
                    date={date}
                    time={time}
                    minutes={minutesShown}
                    name={name}
                    phone={phone}
                    price={priceShown}
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

function ServiceStep({ partner, locationId, selectedId, onSelect, specialist }: {
  partner: PublicPartner
  /** The chosen branch; only what it offers is listed, at its prices. */
  locationId: string | null
  selectedId: string | null
  onSelect: (id: string) => void
  /** "Book with X": only their services, at their prices. */
  specialist?: Specialist | null
}) {
  const t = useT()
  const loc = useLocalized()
  const book = priceBookOf(partner)
  const priceLabels = { from: t('partner.services.priceFrom') }
  const durationLabels = { min: t('partner.services.min'), h: t('partner.services.hour') }
  const services = partner.services.filter(sv =>
    sv.active &&
    (!specialist || (specialist.services.includes(sv.id) && (!locationId || book.offered(locationId, sv.id)))) &&
    // At a chosen branch, only what can actually be booked there — no dead ends.
    (!locationId || specialist || bookableAt(partner, sv, locationId))
  )
  const categories = Array.from(new Set(services.map(sv => sv.category)))

  if (services.length === 0) {
    return (
      <div className={s.emptyStep}>
        <Sparkles size={22} />
        <p>{t('booking.noServicesHere')}</p>
      </div>
    )
  }

  return (
    <div>
      {categories.map(cat => {
        const catSvc = services.find(sv => sv.category === cat && sv.categoryI18n)
        const catText = catSvc ? loc(catSvc.category, catSvc.categoryI18n) : cat
        return (
        <div key={cat}>
          <div className={s.catLabel}>{catText}</div>
          {services.filter(sv => sv.category === cat).map(sv => {
            // At this branch: the specialist's own offer, else the span across
            // everyone who does it here (exact when they all charge the same).
            const span = specialist && locationId
              ? spanOf([book.offer(sv, locationId, specialist.id)])!
              : spanOf(offersFor(partner, sv, locationId))!
            return (
              <button
                key={sv.id}
                className={[s.option, selectedId === sv.id ? s.selected : ''].filter(Boolean).join(' ')}
                onClick={() => onSelect(sv.id)}
              >
                <div className={s.optBody}>
                  <div className={s.optName}>{loc(sv.name, sv.nameI18n)}</div>
                  <div className={s.optMeta}>
                    <span><Clock size={12} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />{fmtDurationSpan(span.durationMin, span.durationMax, durationLabels)}</span>
                    {sv.requiresSpecialist === false && (
                      <span style={{ marginLeft: 10 }}>
                        <Users size={12} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />
                        {t('booking.spots', { n: locationId ? book.offer(sv, locationId).capacity : (sv.capacity ?? 1) })}
                      </span>
                    )}
                  </div>
                </div>
                {/* Omitted rather than blanked: the row is a flex with the name
                    on the left and the price on the right, so an empty span would
                    reserve a column for nothing. */}
                {hasPublicPrice(span) && (
                  <span className={s.optPrice}>{fmtServicePrice(span, priceLabels)}</span>
                )}
              </button>
            )
          })}
        </div>
        )
      })}
    </div>
  )
}

function SummaryRows({ service, specialistLabel, location, date, time, minutes, name, phone, price }: {
  service: Service | null
  /** Who it's with; null hides the row (facility service, solo pro). */
  specialistLabel: string | null
  location?: string | null
  date: string
  time: string | null
  /** How long it takes (this specialist's own duration at this branch). */
  minutes: number
  name?: string
  phone?: string
  /** What it costs; null (or a withheld price) drops the total row. */
  price: PricedService | null
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

  // A withheld price (or none to state) drops the whole ROW rather than
  // emptying it — a "Total" label with nothing beside it is worse than no row.
  const showTotal = !!service && !service.hidePrice && !!price && hasPublicPrice(price)

  return (
    <>
      {location && <Row icon={<MapPin size={15} />} label={t('booking.summary.branch')} value={location} />}
      <Row icon={<Sparkles size={15} />} label={t('booking.summary.service')} value={service ? loc(service.name, service.nameI18n) : '—'} />
      {specialistLabel && (
        <Row icon={<Users size={15} />} label={t('booking.summary.specialist')} value={specialistLabel} />
      )}
      <Row icon={<Calendar size={15} />} label={t('booking.summary.date')} value={dateLabel} />
      <Row
        icon={<Clock size={15} />}
        label={t('booking.summary.time')}
        value={<>{time ?? '—'}{minutes ? ` · ${fmtDuration(minutes, { min: t('partner.services.min'), h: t('partner.services.hour') })}` : ''}</>}
      />
      {name && <Row icon={<Users size={15} />} label={t('booking.summary.name')} value={name} />}
      {phone && <Row icon={<MapPin size={15} />} label={t('booking.summary.phone')} value={formatPhoneDisplay(phone)} />}
      {showTotal && (
        <>
          <div className={[s.sumRow, s.sumTotal].join(' ')}>
            <span className={s.sumTotalLabel}>{t('booking.summary.total')}</span>
            <span className={s.sumTotalValue}>{fmtServicePrice(price!, { from: t('partner.services.priceFrom') })}</span>
          </div>
          {price!.priceType === 'range' && (
            <div className={s.sumNote}>{t('booking.priceRangeNote')}</div>
          )}
        </>
      )}
    </>
  )
}
