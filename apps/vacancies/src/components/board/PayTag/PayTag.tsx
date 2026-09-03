import { useT } from '@/i18n'
import { paySummary, professionalShare } from '@/lib/vacancy'
import type { VacancyCard } from '@/api/types'
import s from './PayTag.module.scss'

interface Props {
  vacancy: VacancyCard
  /**
   * `sm` for a secondary listing in a strip, `md` in the main list, `lg` as the
   * subject of a page.
   */
  size?: 'sm' | 'md' | 'lg'
  /**
   * Which edge the figure hangs off.
   *
   * `end` in a list, so figures form a column that can be compared without
   * being read. `start` in a standalone panel — right-aligning there leaves the
   * top-left of the card empty, which reads as a broken layout rather than as
   * alignment.
   */
  align?: 'start' | 'end'
  /** Show the salon's own share underneath. Detail page only — a card has no
   *  room, and the figure it shows is already the reader's own share. */
  showSalonShare?: boolean
}

/**
 * The money.
 *
 * This is the single most scanned element on the board, so it gets the largest
 * type on the card and a tone per pay type — a rent and a salary are the same
 * digits pointing in opposite directions, and the caption alone is not enough
 * to stop someone reading one as the other at a glance.
 *
 * A negotiable listing shows the words rather than an empty space: "no figure"
 * is information, and a blank where every other card has a number reads as a
 * loading failure.
 */
export function PayTag({ vacancy, size = 'md', align = 'end', showSalonShare = false }: Props) {
  const t = useT()
  const pay = paySummary(vacancy, t)
  const share = professionalShare(vacancy)

  const cls = [s.tag, s[size], s[pay.tone], s[`align-${align}`] ?? ''].join(' ')

  if (!pay.value) {
    return (
      <div className={cls}>
        <span className={s.negotiablePill}>{t('pay.type.negotiable')}</span>
      </div>
    )
  }

  return (
    <div className={cls}>
      <span className={s.figure}>
        <span className={s.digits}>{pay.value}</span>
        {pay.unit && (
          <span
            className={[s.unit, pay.unit === '%' ? s.unitTight : ''].filter(Boolean).join(' ')}
          >
            {pay.unit}
          </span>
        )}
      </span>
      <span className={s.caption}>{pay.caption}</span>
      {showSalonShare && share && vacancy.salonPercent != null && (
        <span className={s.sub}>
          {t('pay.salonKeeps', {
            percent:
              vacancy.salonPercentMax != null && vacancy.salonPercentMax !== vacancy.salonPercent
                ? `${vacancy.salonPercent}–${vacancy.salonPercentMax}%`
                : `${vacancy.salonPercent}%`,
          })}
        </span>
      )}
    </div>
  )
}
