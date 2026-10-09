import { useMemo, useState } from 'react'
import { X, CalendarCheck, Star, MapPin, ChevronDown } from 'lucide-react'
import { initials, fmtServicePrice, fmtDurationSpan, hasPublicPrice, spanOf, specialistBranchIds } from '@reserva/shared'
import type { Specialist } from '@reserva/shared'
import type { PublicPartner } from '@/mock/partners'
import { partnerBrandVars } from '../../partnerBrand'
import { useAppSelector } from '@/store/hooks'
import { ModalShell } from '@/components/ModalShell/ModalShell'
import { ReviewsPanel } from '@/components/ReviewsPanel/ReviewsPanel'
import { canBook, bookableLocations, priceBookOf } from '@/services/booking.service'
import { useI18n, useLocalized } from '@/i18n'
import { track } from '@/services/analytics.service'
import { WEEK, dayKeyOf, nextDayKey, weekState } from '../../lib/openHours'
import s from './SpecialistModal.module.scss'

interface Props {
  partner: PublicPartner
  specialist: Specialist
  onClose: () => void
  onBook: () => void
}

export function SpecialistModal({ partner, specialist, onClose, onBook }: Props) {
  const [t1, t2] = partner.presentation.heroTints
  const { t } = useI18n()
  const loc = useLocalized()
  const theme = useAppSelector((st) => st.theme.theme)
  const brandVars = useMemo(() => partnerBrandVars(partner, theme === 'dark'), [partner, theme])

  // Localized display name + its first word (for "Book with …" / reviews empty).
  const displayName = loc(specialist.name, specialist.nameI18n)
  const firstName = displayName.split(' ')[0]

  // Services this specialist offers.
  const services = partner.services.filter(sv => sv.active && specialist.services.includes(sv.id))

  // Where they work (only worth saying on a multi-branch salon).
  const branchNames = bookableLocations(partner).length > 1
    ? specialistBranchIds(specialist)
        .map(id => partner.locations.find(l => l.id === id))
        .filter(Boolean)
        .map(l => loc(l!.name, l!.nameI18n))
    : []

  // What they charge and how long it takes: the same at every branch they work
  // at, or a span when it differs ("4 000 – 5 000 ֏", "30–45 min"). Withheld
  // prices stay withheld.
  const book = priceBookOf(partner)
  const durationLabels = { min: t('partner.services.min'), h: t('partner.services.hour') }
  const offerOf = (svId: string): { price: string; duration: string } => {
    const sv = partner.services.find(x => x.id === svId)
    const span = sv && spanOf(
      specialistBranchIds(specialist)
        .filter(l => book.offered(l, sv.id))
        .map(l => book.offer(sv, l, specialist.id)),
    )
    if (!span) return { price: '', duration: '' }
    return {
      price: hasPublicPrice(span) ? fmtServicePrice(span, { from: t('partner.services.priceFrom') }) : '',
      duration: fmtDurationSpan(span.durationMin, span.durationMax, durationLabels),
    }
  }

  // A prolific specialist can offer many services — cap the list and let the
  // user expand, so the popup stays tidy instead of sprawling.
  const SVC_LIMIT = 6
  const [svcExpanded, setSvcExpanded] = useState(false)
  const svcOverLimit = services.length > SVC_LIMIT
  const shownServices = svcExpanded || !svcOverLimit ? services : services.slice(0, SVC_LIMIT)

  // When and where they work — computed by the server with the booking
  // engine's own rules, so it never disagrees with the times the flow offers.
  const week = useMemo(() => specialist.week ?? [], [specialist.week])
  const today = dayKeyOf(new Date())
  // Name the branch per day only when their week spans more than one.
  const showBranch = new Set(week.map(w => w.locationId)).size > 1
  const branchName = (id: string) => {
    const l = partner.locations.find(x => x.id === id)
    return l ? loc(l.name, l.nameI18n) : ''
  }
  const nowText = (() => {
    const st = weekState(week)
    if (!st?.window) return null
    const at = showBranch ? ` · ${branchName(st.window.locationId)}` : ''
    if (st.open) return { open: true, text: t('specialistModal.workingNow', { time: st.window.end }) + at }
    const time = st.window.start
    const text = !st.day
      ? t('specialistModal.nextToday', { time })
      : st.day === nextDayKey(today)
        ? t('specialistModal.nextTomorrow', { time })
        : t('specialistModal.nextDay', { day: t(`partner.locations.days.${st.day}`), time })
    return { open: false, text: text + at }
  })()

  // Real, server-computed rating (never fabricated).
  const rating = specialist.rating ?? 0
  const reviewCount = specialist.reviewCount ?? 0

  return (
    <ModalShell open onClose={onClose} closeDuration={280}>
      {({ closing, requestClose }) => (
    <div className={[s.overlay, closing ? s.closing : ''].filter(Boolean).join(' ')} onClick={requestClose} style={brandVars}>
      <div className={[s.modal, closing ? s.closing : ''].filter(Boolean).join(' ')} onClick={e => e.stopPropagation()}>
        <button className={s.closeBtn} onClick={requestClose} aria-label={t('specialistModal.close')}><X size={16} /></button>

        {/* Branded banner */}
        <div className={s.banner} style={{ background: `linear-gradient(140deg, ${t1}, ${t2})` }}>
          <div className={s.bannerGrid} />
          <div className={s.avatar} style={{ background: 'rgba(255,255,255,0.18)' }}>
            {specialist.avatarUrl
              ? <img src={specialist.avatarUrl} alt={displayName} className={s.avatarImg} />
              : initials(displayName)}
          </div>
          <div className={s.bannerInfo}>
            <div className={s.spName}>{displayName}</div>
            <div className={s.spTitle}>{loc(specialist.title, specialist.titleI18n)}</div>
            {branchNames.length > 0 && (
              <div className={s.spBranches}><MapPin size={12} /> {branchNames.join(' · ')}</div>
            )}
            {/* Rating only when there are real reviews — never fake stars. */}
            {rating > 0 && reviewCount > 0 && (
              <span className={s.spRating}>
                <Star size={13} className={s.star} fill="currentColor" />
                <strong>{rating.toFixed(1)}</strong>
                <span className={s.count}>{t('specialistModal.reviewsCount', { count: reviewCount })}</span>
              </span>
            )}
          </div>
        </div>

        <div className={s.body}>
          {/* Services */}
          {services.length > 0 && (
            <section className={s.svcSection} aria-label={t('specialistModal.services')}>
              <p className={s.sectionLabel}>{t('specialistModal.services')}</p>
              {/* A price list: name and duration left, price right — a long
                  name wraps inside its row instead of making a ragged cloud. */}
              <ul className={s.svcList}>
                {shownServices.map(sv => {
                  const offer = offerOf(sv.id)
                  return (
                    <li key={sv.id} className={s.svcRow}>
                      <span className={s.svcInfo}>
                        <span className={s.svcName}>{loc(sv.name, sv.nameI18n)}</span>
                        {offer.duration && <span className={s.svcDur}>{offer.duration}</span>}
                      </span>
                      {offer.price && <span className={s.svcPrice}>{offer.price}</span>}
                    </li>
                  )
                })}
                {svcOverLimit && (
                  <li className={s.svcMoreRow}>
                    <button
                      type="button"
                      className={[s.svcMore, svcExpanded ? s.svcMoreOpen : ''].filter(Boolean).join(' ')}
                      onClick={() => setSvcExpanded(v => !v)}
                      aria-expanded={svcExpanded}
                    >
                      {svcExpanded
                        ? t('specialistModal.showLess')
                        : t('specialistModal.moreServices', { count: services.length - SVC_LIMIT })}
                      <ChevronDown size={14} />
                    </button>
                  </li>
                )}
              </ul>
            </section>
          )}

          {/* Working hours — the whole week, every branch. */}
          {week.length > 0 && (
            <section className={s.hours} aria-label={t('specialistModal.hours')}>
              <div className={s.hoursHead}>
                <p className={s.sectionLabel}>{t('specialistModal.hours')}</p>
                {nowText && (
                  <span className={[s.nowPill, nowText.open ? s.nowOpen : ''].filter(Boolean).join(' ')}>
                    <span className={s.nowDot} aria-hidden />
                    {nowText.text}
                  </span>
                )}
              </div>
              <ul className={s.week}>
                {WEEK.map(day => {
                  const wins = week.filter(w => w.day === day)
                  const isToday = day === today
                  return (
                    <li
                      key={day}
                      className={[s.day, isToday ? s.dayToday : '', wins.length ? '' : s.dayOff].filter(Boolean).join(' ')}
                    >
                      <span className={s.dayName}>
                        {t(`partner.locations.days.${day}`)}
                        {isToday && <span className={s.todayTag}>{t('specialistModal.today')}</span>}
                      </span>
                      <span className={s.dayWins}>
                        {wins.length === 0 ? (
                          <span className={s.offText}>{t('specialistModal.dayOff')}</span>
                        ) : (
                          wins.map(w => (
                            <span key={`${w.locationId}-${w.start}`} className={s.win}>
                              {showBranch && (
                                <span className={s.winBranch}>
                                  <MapPin size={11} />
                                  {branchName(w.locationId)}
                                </span>
                              )}
                              <span className={s.winTime}>{w.start} – {w.end}</span>
                            </span>
                          ))
                        )}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          {/* Reviews — shared panel (fetch + write form + list + empty state). */}
          <ReviewsPanel
            slug={partner.slug}
            specialistId={specialist.id}
            emptyName={firstName}
          />
        </div>

        {canBook(partner) && (
          <div className={s.footer}>
            <button
              className={s.bookBtn}
              onClick={() => {
                track('book_click', { from: 'specialist', sp: specialist.id })
                onBook()
                requestClose()
              }}
            >
              <CalendarCheck size={17} /> {t('specialistModal.bookWith', { name: firstName })}
            </button>
          </div>
        )}
      </div>
    </div>
      )}
    </ModalShell>
  )
}
