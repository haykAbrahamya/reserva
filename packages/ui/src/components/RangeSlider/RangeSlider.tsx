import { useCallback, useEffect, useId, useRef, useState } from 'react'
import s from './RangeSlider.module.scss'

export interface RangeSliderProps {
  /** Hard bounds of the control. Derive these from real data, never guess. */
  min: number
  max: number
  step?: number
  /** Current [low, high]. Clamped to the bounds and kept in order. */
  value: [number, number]
  /** Fires continuously while dragging — keep this cheap. */
  onChange: (value: [number, number]) => void
  /**
   * Fires once the interaction settles (pointer/key release, input blur or
   * Enter). Network calls belong here: a range slider emits dozens of values
   * per drag, and firing a request per pixel is how a filter panel starts to
   * feel broken.
   */
  onCommit?: (value: [number, number]) => void
  /** Renders a value for display. Defaults to the raw number. */
  format?: (n: number) => string
  /** Parses a typed value back. Defaults to stripping non-digits. */
  parse?: (text: string) => number
  label?: string
  /** Small text after the label, e.g. a unit or a hint. */
  hint?: string
  /** Labels for the two inputs. Screen readers read these, so name the ends. */
  minLabel?: string
  maxLabel?: string
  disabled?: boolean
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

/**
 * A two-ended range with numeric inputs.
 *
 * Built from two overlapping native `<input type="range">` elements rather than
 * a custom drag surface. That is a deliberate trade: it costs some CSS
 * awkwardness (transparent native tracks, a painted track underneath, thumb
 * z-index management when the two ends meet) and buys arrow-key stepping,
 * Home/End, touch behaviour, high-contrast mode and screen-reader announcement
 * without writing any of it — all things a div-and-pointermove version
 * silently lacks.
 *
 * The inputs matter as much as the slider. A slider is for exploring a range;
 * typing is for a person who already knows they want 250,000, and dragging to
 * an exact figure on a phone is miserable.
 */
export function RangeSlider({
  min,
  max,
  step = 1,
  value,
  onChange,
  onCommit,
  format = (n) => String(n),
  parse,
  label,
  hint,
  minLabel = 'Minimum',
  maxLabel = 'Maximum',
  disabled,
}: RangeSliderProps) {
  const id = useId()
  const [low, high] = value
  // While someone is typing, the field must show exactly what they typed —
  // reformatting mid-keystroke moves the caret and fights the user.
  const [draft, setDraft] = useState<{ side: 'low' | 'high'; text: string } | null>(null)
  const committed = useRef(value)

  useEffect(() => {
    committed.current = value
  }, [value])

  const span = Math.max(1, max - min)
  const leftPct = ((clamp(low, min, max) - min) / span) * 100
  const rightPct = ((clamp(high, min, max) - min) / span) * 100

  const emit = useCallback(
    (next: [number, number]) => {
      // Order is enforced here rather than by the caller, so a thumb dragged
      // past its partner swaps instead of inverting the range.
      const ordered: [number, number] = next[0] <= next[1] ? next : [next[1], next[0]]
      onChange(ordered)
      return ordered
    },
    [onChange],
  )

  const commit = useCallback(
    (next?: [number, number]) => {
      const v = next ?? committed.current
      onCommit?.(v[0] <= v[1] ? v : [v[1], v[0]])
    },
    [onCommit],
  )

  const parseText = (text: string): number => {
    if (parse) return parse(text)
    const digits = text.replace(/[^\d]/g, '')
    return digits ? Number(digits) : min
  }

  const commitDraft = () => {
    if (!draft) return
    const n = clamp(parseText(draft.text), min, max)
    const next: [number, number] = draft.side === 'low' ? [n, high] : [low, n]
    setDraft(null)
    commit(emit(next))
  }

  const fieldValue = (side: 'low' | 'high') =>
    draft?.side === side ? draft.text : format(side === 'low' ? low : high)

  return (
    <div className={[s.wrap, disabled ? s.disabled : ''].filter(Boolean).join(' ')}>
      {(label || hint) && (
        <div className={s.head}>
          {label && (
            <label className={s.label} htmlFor={`${id}-low`}>
              {label}
            </label>
          )}
          {hint && <span className={s.hint}>{hint}</span>}
        </div>
      )}

      <div className={s.track}>
        <div className={s.rail} />
        <div
          className={s.fill}
          style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }}
        />

        {/*
          Both inputs cover the whole track so either thumb is grabbable
          anywhere. Only the thumbs take pointer events (see the module), and
          the lower input is raised when the two ends meet at the top — without
          that, a range collapsed to its maximum can never be reopened.
        */}
        <input
          id={`${id}-low`}
          type="range"
          className={[s.input, low >= max ? s.raised : ''].filter(Boolean).join(' ')}
          min={min}
          max={max}
          step={step}
          value={clamp(low, min, max)}
          disabled={disabled}
          aria-label={minLabel}
          aria-valuetext={format(low)}
          onChange={(e) => emit([Number(e.target.value), high])}
          onPointerUp={() => commit()}
          onKeyUp={() => commit()}
          onTouchEnd={() => commit()}
        />
        <input
          type="range"
          className={s.input}
          min={min}
          max={max}
          step={step}
          value={clamp(high, min, max)}
          disabled={disabled}
          aria-label={maxLabel}
          aria-valuetext={format(high)}
          onChange={(e) => emit([low, Number(e.target.value)])}
          onPointerUp={() => commit()}
          onKeyUp={() => commit()}
          onTouchEnd={() => commit()}
        />
      </div>

      <div className={s.fields}>
        <input
          className={s.field}
          type="text"
          inputMode="numeric"
          value={fieldValue('low')}
          disabled={disabled}
          aria-label={minLabel}
          onChange={(e) => setDraft({ side: 'low', text: e.target.value })}
          onBlur={commitDraft}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commitDraft()
            }
          }}
        />
        <span className={s.dash} aria-hidden="true" />
        <input
          className={s.field}
          type="text"
          inputMode="numeric"
          value={fieldValue('high')}
          disabled={disabled}
          aria-label={maxLabel}
          onChange={(e) => setDraft({ side: 'high', text: e.target.value })}
          onBlur={commitDraft}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commitDraft()
            }
          }}
        />
      </div>
    </div>
  )
}
