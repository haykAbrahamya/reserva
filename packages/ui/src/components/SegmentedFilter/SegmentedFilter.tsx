import s from './SegmentedFilter.module.scss'

export interface SegmentOption<T extends string = string> {
  value: T
  label: string
  /** Optional count shown as a small pill after the label. */
  count?: number
}

interface SegmentedFilterProps<T extends string = string> {
  value: T
  options: SegmentOption<T>[]
  onChange: (value: T) => void
  /** Accessible group label. */
  ariaLabel?: string
  size?: 'sm' | 'md'
}

/**
 * A horizontal segmented control for filtering lists — replaces the cramped
 * single-select dropdown when there are a few mutually-exclusive choices. The
 * selected segment is highlighted; counts (optional) render as pills.
 */
export function SegmentedFilter<T extends string = string>({
  value,
  options,
  onChange,
  ariaLabel,
  size = 'md',
}: SegmentedFilterProps<T>) {
  return (
    <div className={[s.group, s[size]].filter(Boolean).join(' ')} role="tablist" aria-label={ariaLabel}>
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={[s.segment, active ? s.active : ''].filter(Boolean).join(' ')}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
            {opt.count != null && opt.count > 0 && (
              <span className={s.count}>{opt.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
