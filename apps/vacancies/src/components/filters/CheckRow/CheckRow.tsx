import { Check, Minus } from 'lucide-react'
import type { ReactNode } from 'react'
import s from './CheckRow.module.scss'

interface Props {
  label: string
  /** `partial` is a city with only some of its districts chosen. */
  state: 'none' | 'some' | 'all'
  count?: number
  indented?: boolean
  onToggle: () => void
  /** Anything after the label — a salon's avatar, a parent city. */
  adornment?: ReactNode
}

/**
 * A checkable row in a filter list — used for areas, specialties and salons.
 *
 * Three states, not two. A city whose districts are partly selected has to look
 * different from one selected whole, or a single checkbox cannot honestly
 * represent "anywhere in Yerevan" and "Arabkir and Kentron" at the same time.
 *
 * Rendered as a `<button aria-pressed>` rather than a real checkbox because the
 * indeterminate middle state has no honest HTML equivalent that also carries a
 * count and an avatar; the pressed state keeps it announced correctly.
 */
export function CheckRow({
  label,
  state,
  count,
  indented = false,
  onToggle,
  adornment,
}: Props) {
  const empty = count === 0 && state === 'none'

  return (
    <button
      type="button"
      className={[
        s.row,
        indented ? s.indented : '',
        state === 'all' ? s.on : '',
        state === 'some' ? s.partial : '',
        empty ? s.zero : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onToggle}
      aria-pressed={state !== 'none'}
      disabled={empty}
    >
      <span className={s.box} aria-hidden="true">
        {state === 'all' && <Check size={11} strokeWidth={3} />}
        {state === 'some' && <Minus size={11} strokeWidth={3} />}
      </span>
      {adornment}
      <span className={s.label}>{label}</span>
      {count != null && <span className={s.count}>{count}</span>}
    </button>
  )
}
