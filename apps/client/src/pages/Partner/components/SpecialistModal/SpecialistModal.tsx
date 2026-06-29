import { useEffect, useMemo, useState } from 'react'
import { X, CalendarCheck, Star, MessageSquarePlus, Loader2, MessagesSquare } from 'lucide-react'
import { initials } from '@reserva/shared'
import type { Specialist } from '@reserva/shared'
import type { PublicPartner } from '@/mock/partners'
import { partnerBrandVars } from '../../partnerBrand'
import { useAppSelector } from '@/store/hooks'
import { ModalShell } from '@/components/ModalShell/ModalShell'
import { StarRatingDisplay, StarRatingInput } from '@/components/StarRating/StarRating'
import {
  getSpecialistReviews,
  createSpecialistReview,
  canBook,
  type SpecialistReview,
} from '@/services/booking.service'
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
  const { t, locale } = useI18n()
  const theme = useAppSelector((st) => st.theme.theme)
  const brandVars = useMemo(() => partnerBrandVars(partner, theme === 'dark'), [partner, theme])

  // Services this specialist offers.
  const services = partner.services.filter(sv => sv.active && specialist.services.includes(sv.id))

  // Real, server-computed rating (never fabricated).
  const rating = specialist.rating ?? 0
  const reviewCount = specialist.reviewCount ?? 0

  // ── Reviews ──
  const [reviews, setReviews] = useState<SpecialistReview[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [stars, setStars] = useState(0)
  const [author, setAuthor] = useState('')
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [justSubmitted, setJustSubmitted] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    getSpecialistReviews(partner.slug, specialist.id)
      .then(r => { if (active) setReviews(r) })
      .catch(() => { if (active) setReviews([]) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [partner.slug, specialist.id])

  const submitReview = async () => {
    if (stars < 1) { setError(t('specialistModal.review.pickStars')); return }
    setSubmitting(true)
    setError('')
    try {
      const created = await createSpecialistReview(partner.slug, specialist.id, {
        author: author.trim() || undefined,
        rating: stars,
        text: text.trim() || undefined,
      })
      setReviews(prev => [created, ...(prev ?? [])])
      setJustSubmitted(true)
      setFormOpen(false)
      setStars(0); setAuthor(''); setText('')
    } catch {
      setError(t('specialistModal.review.failed'))
    } finally {
      setSubmitting(false)
    }
  }

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === 'hy' ? 'hy-AM' : locale, { day: 'numeric', month: 'short', year: 'numeric' })

  const hasReviews = (reviews?.length ?? 0) > 0

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
            {initials(specialist.name)}
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
                {services.map(sv => (
                  <span key={sv.id} className={s.chip}>{sv.name}</span>
                ))}
              </div>
            </>
          )}

          {/* Reviews header with "write" action */}
          <div className={s.reviewsHead}>
            <p className={s.sectionLabel} style={{ margin: 0 }}>{t('specialistModal.whatClientsSay')}</p>
            {!formOpen && (
              <button className={s.writeBtn} onClick={() => { setFormOpen(true); setJustSubmitted(false) }}>
                <MessageSquarePlus size={15} /> {t('specialistModal.review.write')}
              </button>
            )}
          </div>

          {/* Review form */}
          {formOpen && (
            <div className={s.reviewForm}>
              <div className={s.formRow}>
                <span className={s.formLabel}>{t('specialistModal.review.yourRating')}</span>
                <StarRatingInput value={stars} onChange={(v) => { setStars(v); setError('') }} />
              </div>
              <input
                className={s.formInput}
                placeholder={t('specialistModal.review.namePlaceholder')}
                value={author}
                maxLength={80}
                onChange={(e) => setAuthor(e.target.value)}
              />
              <textarea
                className={s.formTextarea}
                placeholder={t('specialistModal.review.textPlaceholder')}
                value={text}
                maxLength={1000}
                rows={3}
                onChange={(e) => setText(e.target.value)}
              />
              {error && <div className={s.formError}>{error}</div>}
              <div className={s.formActions}>
                <button className={s.cancelBtn} onClick={() => { setFormOpen(false); setError('') }} disabled={submitting}>
                  {t('specialistModal.review.cancel')}
                </button>
                <button className={s.submitBtn} onClick={submitReview} disabled={submitting}>
                  {submitting ? <Loader2 size={15} className={s.spin} /> : null}
                  {t('specialistModal.review.submit')}
                </button>
              </div>
            </div>
          )}

          {justSubmitted && !formOpen && (
            <div className={s.thanks}>{t('specialistModal.review.thanks')}</div>
          )}

          {/* Reviews list / empty / loading */}
          {loading ? (
            <div className={s.reviewsLoading}><Loader2 size={18} className={s.spin} /></div>
          ) : hasReviews ? (
            <div className={s.reviews}>
              {reviews!.map((r) => (
                <div key={r.id} className={s.review}>
                  <div className={s.reviewHead}>
                    <span className={s.reviewAuthor}>{r.author || t('specialistModal.review.anonymous')}</span>
                    <StarRatingDisplay value={r.rating} size={13} compact />
                  </div>
                  {r.text && <p className={s.reviewText}>{r.text}</p>}
                  <div className={s.reviewDate}>{fmtDate(r.createdAt)}</div>
                </div>
              ))}
            </div>
          ) : !formOpen && (
            <div className={s.emptyReviews}>
              <span className={s.emptyIcon}><MessagesSquare size={26} strokeWidth={1.5} /></span>
              <div className={s.emptyTitle}>{t('specialistModal.review.emptyTitle')}</div>
              <p className={s.emptyText}>{t('specialistModal.review.emptyText', { name: specialist.name.split(' ')[0] })}</p>
              <button className={s.emptyCta} onClick={() => setFormOpen(true)}>
                <MessageSquarePlus size={15} /> {t('specialistModal.review.beFirst')}
              </button>
            </div>
          )}
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
