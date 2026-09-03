import { useState } from 'react'
import { Chip } from '@reserva/ui'
import { useT } from '@/i18n'
import s from './ChipGroup.module.scss'

export interface ChipOption {
  value: string
  label: string
  /** Listings behind this option. Zero disables it rather than hiding it. */
  count?: number
}

interface Props {
  options: ChipOption[]
  selected: readonly string[]
  onToggle: (value: string) => void
  /** Collapse past this many, with a "show N more" toggle. */
  max?: number
  emptyLabel?: string
}

/**
 * A wrapping set of multi-select chips.
 *
 * The single workhorse of the panel — pay type, schedule, experience and
 * conditions are all this component with different options, which is why they
 * behave identically. Four bespoke chip rows is how three of them end up with
 * subtly different selection behaviour.
 *
 * An option with no listings is DISABLED, not hidden. Hiding it makes the panel
 * change shape as you filter, and "part-time disappeared" reads as a bug;
 * greying it out answers the question the visitor was about to ask.
 */
export function ChipGroup({ options, selected, onToggle, max, emptyLabel }: Props) {
  const t = useT()
  const [expanded, setExpanded] = useState(false)

  if (options.length === 0) {
    return emptyLabel ? <p className={s.empty}>{emptyLabel}</p> : null
  }

  const collapsible = max != null && options.length > max
  // A chosen option is always visible, however far down the list it sits —
  // otherwise collapsing hides a filter that is actively narrowing results.
  const visible =
    collapsible && !expanded
      ? options.filter((o, i) => i < max || selected.includes(o.value))
      : options
  const hidden = options.length - visible.length

  return (
    <div className={s.group}>
      <div className={s.chips}>
        {visible.map((o) => (
          <Chip
            key={o.value}
            label={o.label}
            count={o.count}
            selected={selected.includes(o.value)}
            disabled={o.count === 0 && !selected.includes(o.value)}
            onClick={() => onToggle(o.value)}
            size="sm"
          />
        ))}
      </div>

      {collapsible && (
        <button type="button" className={s.toggle} onClick={() => setExpanded((e) => !e)}>
          {expanded ? t('filters.showLess') : t('filters.showMore', { count: hidden })}
        </button>
      )}
    </div>
  )
}
