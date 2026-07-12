import { useMemo, useState } from 'react'
import { X, CalendarCheck, Star } from 'lucide-react'
import { initials } from '@reserva/shared'
import type { Specialist } from '@reserva/shared'
import type { PublicPartner } from '@/mock/partners'
import { partnerBrandVars } from '../../partnerBrand'
import { useAppSelector } from '@/store/hooks'
import { ModalShell } from '@/components/ModalShell/ModalShell'
import { ReviewsPanel } from '@/components/ReviewsPanel/ReviewsPanel'
import { canBook } from '@/services/booking.service'
import { useI18n } from '@/i18n'
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
  const theme = useAppSelector((st) => st.theme.theme)
  const brandVars = useMemo(() => partnerBrandVars(partner, theme === 'dark'), [partner, theme])

  // Services this specialist offers.
  const services = partner.services.filter(sv => sv.active && specialist.services.includes(sv.id))

  // A prolific specialist can offer many services — cap the chip cloud and let
  // the user expand, so the popup stays tidy instead of sprawling.
  const SVC_LIMIT = 6
  const [svcExpanded, setSvcExpanded] = useState(false)
  const svcOverLimit = services.length > SVC_LIMIT
  const shownServices = svcExpanded || !svcOverLimit ? services : services.slice(0, SVC_LIMIT)

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
              ? <img src={specialist.avatarUrl} alt={specialist.name} className={s.avatarImg} />
              : initials(specialist.name)}
          </div>
          <div className={s.bannerInfo}>
            <div className={s.spName}>{specialist.name}</div>
            <div className={s.spTitle}>{specialist.title}</div>
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
            <>
              <p className={s.sectionLabel}>{t('specialistModal.services')}</p>
              <div className={s.svcChips}>
                {shownServices.map(sv => (
                  <span key={sv.id} className={s.chip}>{sv.name}</span>
                ))}
                {svcOverLimit && (
                  <button
                    type="button"
                    className={[s.chip, s.chipMore].join(' ')}
                    onClick={() => setSvcExpanded(v => !v)}
                    aria-expanded={svcExpanded}
                  >
                    {svcExpanded
                      ? t('specialistModal.showLess')
                      : t('specialistModal.moreServices', { count: services.length - SVC_LIMIT })}
                  </button>
                )}
              </div>
            </>
          )}

          {/* Reviews — shared panel (fetch + write form + list + empty state). */}
          <ReviewsPanel
            slug={partner.slug}
            specialistId={specialist.id}
            emptyName={specialist.name.split(' ')[0]}
          />
        </div>

        {canBook(partner) && (
          <div className={s.footer}>
            <button className={s.bookBtn} onClick={() => { onBook(); requestClose() }}>
              <CalendarCheck size={17} /> {t('specialistModal.bookWith', { name: specialist.name.split(' ')[0] })}
            </button>
          </div>
        )}
      </div>
    </div>
      )}
    </ModalShell>
  )
}
