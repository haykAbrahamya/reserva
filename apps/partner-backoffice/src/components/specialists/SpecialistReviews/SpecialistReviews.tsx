import { useState, useEffect } from 'react'
import { Star, Trash2 } from 'lucide-react'
import { useResource } from '@/store/useResource'
import { partnersService, type SpecialistReview } from '@/services/partners.service'
import { ConfirmDialog, useToast } from '@/components/ui'
import { errorMessage } from '@/utils/errors'
import { fmtDateShort } from '@/utils/format'
import { useT } from '@/i18n'
import s from './SpecialistReviews.module.scss'

interface Props {
  specialistId: string
  /** Bubble the average + count up so the parent can render a header badge. */
  onSummary?: (summary: { avg: number; count: number }) => void
}

/**
 * Public reviews for one specialist, with moderation (delete). Shared by the
 * salon SpecialistDashboard and the single-mode Reviews page so the list +
 * delete flow lives in one place. Renders only the list/empty state — the parent
 * owns the surrounding section/header chrome.
 */
export function SpecialistReviews({ specialistId, onSummary }: Props) {
  const t = useT()
  const toast = useToast()

  const { data: reviews, reload } = useResource(
    () => partnersService.listSpecialistReviews(specialistId),
    [specialistId],
    [],
  )

  const [confirmReview, setConfirmReview] = useState<SpecialistReview | null>(null)
  const [deleting, setDeleting] = useState(false)

  const avg = reviews.length
    ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
    : 0

  // Report the summary to the parent whenever it changes (header badge).
  const count = reviews.length
  useEffect(() => {
    onSummary?.({ avg, count })
    // onSummary is expected to be stable/memoized by the caller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avg, count])

  const confirmDelete = async () => {
    if (!confirmReview) return
    setDeleting(true)
    try {
      await partnersService.deleteSpecialistReview(specialistId, confirmReview.id)
      reload()
      toast(t('specialistDashboard.reviews.deleted'))
      setConfirmReview(null)
    } catch (err) {
      toast(errorMessage(err, t))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      {reviews.length === 0 ? (
        <div className={s.emptySection}>{t('specialistDashboard.reviews.empty')}</div>
      ) : (
        <div className={s.reviewList}>
          {reviews.map((r) => (
            <div key={r.id} className={s.reviewItem}>
              <div className={s.reviewTop}>
                <span className={s.reviewAuthor}>{r.author || t('specialistDashboard.reviews.anonymous')}</span>
                <span className={s.reviewStars}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} size={12} fill={n <= r.rating ? 'currentColor' : 'none'} className={n <= r.rating ? s.starLit : s.starDim} />
                  ))}
                </span>
                <button
                  className={s.reviewDelete}
                  onClick={() => setConfirmReview(r)}
                  title={t('specialistDashboard.reviews.delete')}
                  aria-label={t('specialistDashboard.reviews.delete')}
                >
                  <Trash2 size={13} />
                </button>
              </div>
              {r.text && <p className={s.reviewBody}>{r.text}</p>}
              <div className={s.reviewDate}>{fmtDateShort(r.createdAt)}</div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmReview}
        variant="danger"
        title={t('specialistDashboard.reviews.delete')}
        message={t('specialistDashboard.reviews.confirmDelete')}
        confirmLabel={t('common.remove')}
        cancelLabel={t('common.cancel')}
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => { if (!deleting) setConfirmReview(null) }}
      />
    </>
  )
}
