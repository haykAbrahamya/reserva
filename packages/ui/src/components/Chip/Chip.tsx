import type { LucideIcon } from 'lucide-react'
import { Check } from 'lucide-react'
import s from './Chip.module.scss'

export interface ChipProps {
  label: string
  selected?: boolean
  /** Shown as a quiet trailing figure — how many results this option has. */
  count?: number
  icon?: LucideIcon
  disabled?: boolean
  onClick?: () => void
  size?: 'sm' | 'md'
  /** Renders a tick when selected. Off for chips whose colour already says it. */
  showTick?: boolean
}

/**
 * A toggleable filter pill — the multi-select counterpart to SegmentedFilter.
 *
 * Separate from SegmentedFilter because the two answer different questions:
 * segments are one-of-N and belong in a row you read left to right, chips are
 * any-of-N and wrap. Rendering a multi-select as segments is the mistake that
 * makes a filter panel feel like it keeps losing your selection.
 *
 * Renders as a real `<button aria-pressed>`, so its state is announced rather
 * than only coloured in.
 */
export function Chip({
  label,
  selected = false,
  count,
  icon: Icon,
  disabled,
  onClick,
  size = 'md',
  showTick = true,
}: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={[s.chip, s[size], selected ? s.on : ''].filter(Boolean).join(' ')}
    >
      {selected && showTick ? (
        <Check size={13} className={s.tick} />
      ) : (
        Icon && <Icon size={13} className={s.icon} />
      )}
      <span className={s.label}>{label}</span>
      {count != null && <span className={s.count}>{count}</span>}
    </button>
  )
}
