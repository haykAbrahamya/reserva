import { X } from 'lucide-react'
import { useT } from '@/i18n'
import type { FilterChip } from '@/lib/describeFilters'
import s from './ActiveFilters.module.scss'

interface Props {
  chips: FilterChip[]
  onClearAll: () => void
}

/**
 * What is currently narrowing the results, as removable chips.
 *
 * This row exists because the panel is collapsible and, on a phone, hidden
 * entirely. Without it a visitor can be looking at four results with no visible
 * explanation of why — which reads as an empty board rather than a tight
 * filter. Each chip names its own filter ("LOCATION Arabkir"), so it makes
 * sense in isolation.
 */
export function ActiveFilters({ chips, onClearAll }: Props) {
  const t = useT()
  if (chips.length === 0) return null

  return (
    <div className={s.wrap} aria-label={t('filters.activeTitle')}>
      {chips.map((chip) => (
        <span key={chip.id} className={s.chip}>
          <span className={s.kind}>{chip.kind}</span>
          <span className={s.text}>{chip.label}</span>
          <button
            type="button"
            className={s.remove}
            onClick={chip.remove}
            aria-label={`${t('filters.clearOne')}: ${chip.kind} ${chip.label}`}
          >
            <X size={14} strokeWidth={2.25} />
          </button>
        </span>
      ))}

      {/* Offered from two chips up: with one, removing it IS clearing all. */}
      {chips.length > 1 && (
        <button type="button" className={s.clear} onClick={onClearAll}>
          {t('filters.clearAll')}
        </button>
      )}
    </div>
  )
}
