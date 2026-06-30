import { Star } from 'lucide-react'
import type { PublicPartner } from '@/mock/partners'
import { ReviewsPanel } from '@/components/ReviewsPanel/ReviewsPanel'
import { useT } from '@/i18n'
import s from './PartnerReviews.module.scss'

interface Props {
  partner: PublicPartner
  tone?: 'cream' | 'plain'
}

/**
 * Single-mode reviews section. Salons surface reviews per-specialist inside the
 * SpecialistModal (opened from the Team grid); a single has no Team section, so
 * this section gives solo professionals their own place to collect feedback —
 * framed around the business rather than a named "specialist". Reviews are still
 * stored against the sole specialist on the backend (the engine is unchanged).
 */
export function PartnerReviews({ partner, tone = 'plain' }: Props) {
  const t = useT()

  // The single's one (and only) specialist holds the reviews. If somehow absent,
  // there's nothing to attach reviews to — render nothing.
  const specialist = partner.specialists.find((sp) => sp.active) ?? partner.specialists[0]
  if (!specialist) return null

  const rating = specialist.rating ?? 0
  const reviewCount = specialist.reviewCount ?? 0

  return (
    <section
      className={[s.section, tone === 'plain' ? s.plain : ''].filter(Boolean).join(' ')}
      id="reviews"
    >
      <div className={s.inner}>
        <div className={s.head}>
          <div className={s.headText}>
            <div className={s.eyebrow}>{t('partner.reviews.eyebrow')}</div>
            <h2 className={s.title}>{t('partner.reviews.title')}</h2>
          </div>
          {/* Real, server-computed rating only — never fabricated. */}
          {rating > 0 && reviewCount > 0 && (
            <span className={s.ratingBadge}>
              <Star size={16} className={s.star} fill="currentColor" />
              <strong>{rating.toFixed(1)}</strong>
              <span className={s.count}>{t('specialistModal.reviewsCount', { count: reviewCount })}</span>
            </span>
          )}
        </div>

        <div className={s.panel}>
          <ReviewsPanel
            slug={partner.slug}
            specialistId={specialist.id}
            emptyName={partner.name}
          />
        </div>
      </div>
    </section>
  )
}
