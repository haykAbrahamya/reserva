import { useState, useMemo, useRef, useEffect } from 'react'
import type { PublicPartner } from '@/mock/partners'
import { initials } from '@reserva/shared'
import { ReviewsPanel } from '@/components/ReviewsPanel/ReviewsPanel'
import { StarRatingDisplay } from '@/components/StarRating/StarRating'
import { useT } from '@/i18n'
import s from './TabbedReviews.module.scss'

interface Props {
  partner: PublicPartner
}

/**
 * Reviews tab. Reviews are stored per specialist (backend engine unchanged), so:
 * - single → show the sole specialist's reviews inline.
 * - salon  → let the visitor pick a team member, then show their reviews via the
 *   shared ReviewsPanel. No new review logic — pure presentation over the panel.
 */
export function TabbedReviews({ partner }: Props) {
  const t = useT()
  const team = useMemo(
    () => partner.specialists.filter((sp) => sp.active),
    [partner],
  )
  const isSingle = partner.kind === 'single' || team.length <= 1
  const [selectedId, setSelectedId] = useState<string>(() => team[0]?.id ?? '')

  const specialist = team.find((sp) => sp.id === selectedId) ?? team[0]

  // Center the selected member within the (horizontally scrollable) picker —
  // same behavior as the tabbed nav bar. The clamp to [0, maxScroll] keeps the
  // first flush-left and the last flush-right, so no empty gutter at the ends.
  const pickerRef = useRef<HTMLDivElement>(null)
  const personRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  useEffect(() => {
    const bar = pickerRef.current
    const el = specialist ? personRefs.current[specialist.id] : null
    if (!bar || !el) return
    const target = el.offsetLeft - (bar.clientWidth - el.clientWidth) / 2
    const max = bar.scrollWidth - bar.clientWidth
    bar.scrollTo({ left: Math.max(0, Math.min(target, max)), behavior: 'smooth' })
  }, [selectedId, specialist])

  if (!specialist) return null

  const t1 = partner.presentation.heroTints[0] ?? partner.accent
  const t2 = partner.presentation.heroTints[1] ?? partner.accent

  return (
    <section className={s.section}>
      {!isSingle && (
        <div className={s.picker} ref={pickerRef}>
          {team.map((sp) => {
            const isSel = sp.id === specialist.id
            return (
              <button
                key={sp.id}
                ref={(el) => { personRefs.current[sp.id] = el }}
                className={[s.person, isSel ? s.personActive : ''].filter(Boolean).join(' ')}
                onClick={() => setSelectedId(sp.id)}
              >
                <span className={s.avatar} style={{ background: `linear-gradient(140deg, ${t1}, ${t2})` }}>
                  {initials(sp.name)}
                </span>
                <span className={s.personInfo}>
                  <span className={s.personName}>{sp.name}</span>
                  {(sp.rating ?? 0) > 0 && (sp.reviewCount ?? 0) > 0 && (
                    <span className={s.personRating}>
                      <StarRatingDisplay value={sp.rating!} size={11} compact />
                      <span>{t('specialistModal.reviewsCount', { count: sp.reviewCount! })}</span>
                    </span>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      )}

      <div className={s.panel}>
        <ReviewsPanel
          slug={partner.slug}
          specialistId={specialist.id}
          emptyName={isSingle ? partner.name : specialist.name.split(' ')[0]}
          layout="grid"
        />
      </div>
    </section>
  )
}
