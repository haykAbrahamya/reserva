import { useEffect, useState } from 'react'
import { MessageSquarePlus, Loader2, MessagesSquare, ChevronDown } from 'lucide-react'
import { StarRatingDisplay, StarRatingInput } from '@/components/StarRating/StarRating'
import {
  getSpecialistReviews,
  createSpecialistReview,
  type SpecialistReview,
} from '@/services/booking.service'
import { useI18n } from '@/i18n'
import s from './ReviewsPanel.module.scss'

interface Props {
  /** Partner slug + the specialist whose reviews these are. In single mode the
   * specialist is the (hidden) sole specialist, so the panel is framed around
   * the business rather than a person via `emptyName`. */
  slug: string
  specialistId: string
  /** Name used in the empty-state copy ("Be the first to review {name}"). For a
   * single this is the business name; for a salon it's the specialist's first name. */
  emptyName: string
  /** Review list layout: `list` (default, single column — modal/classic) or
   * `grid` (responsive multi-column — the tabbed template's full-width reviews). */
  layout?: 'list' | 'grid'
}

/**
 * Self-contained reviews block: fetches a specialist's public reviews, lets a
 * visitor leave one (stars + optional name/text), and renders the list / empty /
 * loading states. Shared by the SpecialistModal and the single-mode
 * PartnerReviews section so the review flow lives in exactly one place.
 */
export function ReviewsPanel({ slug, specialistId, emptyName, layout = 'list' }: Props) {
  const { t } = useI18n()

  const [reviews, setReviews] = useState<SpecialistReview[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
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
    getSpecialistReviews(slug, specialistId)
      .then(page => { if (active) { setReviews(page.items); setNextCursor(page.nextCursor) } })
      .catch(() => { if (active) { setReviews([]); setNextCursor(null) } })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [slug, specialistId])

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    try {
      const page = await getSpecialistReviews(slug, specialistId, { cursor: nextCursor })
      setReviews(prev => [...(prev ?? []), ...page.items])
      setNextCursor(page.nextCursor)
    } catch {
      // Leave the list as-is on failure; the button stays for a retry.
    } finally {
      setLoadingMore(false)
    }
  }

  const submitReview = async () => {
    if (stars < 1) { setError(t('specialistModal.review.pickStars')); return }
    setSubmitting(true)
    setError('')
    try {
      const created = await createSpecialistReview(slug, specialistId, {
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

  // Format from our own i18n bundle rather than Intl: some runtimes lack
  // Armenian month data and silently fall back to English month names.
  const fmtDate = (iso: string) => {
    const d = new Date(iso)
    return t('common.dateShort', {
      day: d.getDate(),
      month: t(`common.monthsShort.${d.getMonth()}`),
      year: d.getFullYear(),
    })
  }

  const hasReviews = (reviews?.length ?? 0) > 0

  return (
    <>
      {/* Header with "write" action */}
      <div className={s.reviewsHead}>
        <p className={s.sectionLabel}>{t('specialistModal.whatClientsSay')}</p>
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
          <div className={layout === 'grid' ? s.reviewGrid : s.reviewList}>
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
          {nextCursor && (
            <button className={s.loadMoreBtn} onClick={loadMore} disabled={loadingMore}>
              {loadingMore
                ? <Loader2 size={15} className={s.spin} />
                : <ChevronDown size={15} />}
              {t('specialistModal.review.loadMore')}
            </button>
          )}
        </div>
      ) : !formOpen && (
        <div className={s.emptyReviews}>
          <span className={s.emptyIcon}><MessagesSquare size={26} strokeWidth={1.5} /></span>
          <div className={s.emptyTitle}>{t('specialistModal.review.emptyTitle')}</div>
          <p className={s.emptyText}>{t('specialistModal.review.emptyText', { name: emptyName })}</p>
          <button className={s.emptyCta} onClick={() => setFormOpen(true)}>
            <MessageSquarePlus size={15} /> {t('specialistModal.review.beFirst')}
          </button>
        </div>
      )}
    </>
  )
}
