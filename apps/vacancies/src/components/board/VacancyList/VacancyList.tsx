import { Skeleton } from '@/components/common/Skeleton/Skeleton'
import type { VacancyCard as Card } from '@/api/types'
import { VacancyCard } from '../VacancyCard/VacancyCard'
import s from './VacancyList.module.scss'

interface Props {
  items: Card[]
  /** Dims the list while the next page or a new filter is in flight. */
  refreshing?: boolean
}

/**
 * A skeleton shaped like the card it replaces.
 *
 * Matching the real card's geometry is the point: a generic grey box of the
 * wrong height makes the page grow or shrink when data lands, and the visitor
 * loses their place mid-scroll.
 */
export function CardSkeleton() {
  return (
    <div className={s.skeleton} aria-hidden="true">
      <div className={s.skIdentity}>
        <Skeleton w="40px" h={40} radius={10} />
        <div className={s.skHeadings}>
          <Skeleton w="58%" h={17} />
          <Skeleton w="42%" h={12} />
        </div>
      </div>
      <div className={s.skSide}>
        <Skeleton w="86px" h={20} />
        <Skeleton w="54px" h={11} />
      </div>
      <div className={s.skDetails}>
        <Skeleton w="34%" h={12} />
        <div className={s.skChips}>
          <Skeleton w="104px" h={22} radius={999} />
          <Skeleton w="88px" h={22} radius={999} />
          <Skeleton w="72px" h={22} radius={999} />
        </div>
      </div>
    </div>
  )
}

/** The placeholder list shown on a cold load. */
export function VacancyListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className={s.list}>
      {Array.from({ length: rows }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}

/**
 * The results.
 *
 * `refreshing` dims rather than replaces: when a filter changes, the previous
 * results stay legible underneath so the page keeps its height and the visitor
 * keeps their scroll position. Swapping to skeletons on every chip click is
 * what makes a filter panel feel like it is fighting you.
 */
export function VacancyList({ items, refreshing = false }: Props) {
  return (
    <div
      className={[s.list, refreshing ? s.refreshing : ''].filter(Boolean).join(' ')}
      aria-busy={refreshing}
    >
      {items.map((v) => (
        <VacancyCard key={v.id} vacancy={v} />
      ))}
    </div>
  )
}
