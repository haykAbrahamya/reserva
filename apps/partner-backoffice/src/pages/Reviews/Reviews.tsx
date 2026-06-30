import { useState, useCallback } from 'react'
import { Star, MessageSquare } from 'lucide-react'
import { usePartner } from '@/store/app.store'
import { useResource } from '@/store/useResource'
import { Empty } from '@/components/ui'
import { SpecialistReviews } from '@/components/specialists/SpecialistReviews/SpecialistReviews'
import { partnersService } from '@/services/partners.service'
import { useI18n } from '@/i18n'
import s from './Reviews.module.scss'

/**
 * Single-mode reviews page. Salons read/moderate reviews per specialist from the
 * Specialists page (SpecialistDashboard), which solo partners don't have — so a
 * single gets a dedicated, business-framed Reviews page bound to its one (and
 * only) specialist. Reuses the shared SpecialistReviews list + moderation.
 */
export function Reviews() {
  const partner = usePartner()
  const { t } = useI18n()

  // The single's one specialist holds all reviews. Pull the roster (full list)
  // and take the first — solo partners are auto-provisioned exactly one.
  const { data: specialists } = useResource(
    () => partnersService.listSpecialists(),
    [],
    [],
  )

  const [summary, setSummary] = useState({ avg: 0, count: 0 })
  const onSummary = useCallback((sum: { avg: number; count: number }) => setSummary(sum), [])

  if (!partner) return null

  const specialist = specialists.find((sp) => sp.active) ?? specialists[0]

  return (
    <div className={s.page}>
      <div className={s.head}>
        <div>
          <h1 className={s.h1}>{t('reviews.title')}</h1>
          <p className={s.sub}>{t('reviews.subtitle')}</p>
        </div>
        {specialist && summary.avg > 0 && summary.count > 0 && (
          <span className={s.ratingBadge}>
            <Star size={15} fill="currentColor" className={s.star} />
            <strong>{summary.avg.toFixed(1)}</strong>
            <span className={s.count}>{t('reviews.count', { count: summary.count })}</span>
          </span>
        )}
      </div>

      {!specialist ? (
        <Empty icon={MessageSquare} title={t('reviews.emptyTitle')} description={t('reviews.emptyDesc')} />
      ) : (
        <div className={s.card}>
          <SpecialistReviews specialistId={specialist.id} onSummary={onSummary} />
        </div>
      )}
    </div>
  )
}
