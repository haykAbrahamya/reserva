import { Minus, Plus } from 'lucide-react'
import s from './NumberStepper.module.scss'

export interface QuickPick {
  /** The value this chip sets. `null` clears the field. */
  value: number | null
  label: string
}

export interface NumberStepperProps {
  /** `null` means "not answered", which is distinct from 0. */
  value: number | null
  onChange: (value: number | null) => void
  min?: number
  max?: number
  step?: number
  /** Field label above the control. */
  label?: string
  /** Rendered next to the number: "years", "rooms". Pluralization is the caller's. */
  format?: (value: number) => string
  /** Shown in place of the number while the value is null. */
  emptyLabel?: string
  /** One-tap shortcuts under the stepper. */
  quickPicks?: QuickPick[]
  disabled?: boolean
  /** Accessible name, when `label` is not enough on its own. */
  ariaLabel?: string
  decrementLabel?: string
  incrementLabel?: string
}

/**
 * A small integer, entered by tapping rather than typing.
 *
 * Built for the answers a person gives about themselves — years in a trade,
 * a count of rooms — where the plausible range is short and the exact number
 * matters. A free text `<input type="number">` is the wrong control for that
 * on two counts: on a phone it summons a keyboard to change 4 into 5, and it
 * accepts "1998" for "years of experience" without blinking.
 *
 * `null` is a first-class value, not an empty string. "Prefer not to say" and
 * "this is my first year" are genuinely different answers, and a control that
 * cannot express the first will collect a made-up zero instead.
 *
 * The quick picks are what make it fast: most people are at one of four or five
 * numbers, and the stepper is there for everyone else.
 */
export function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 99,
  step = 1,
  label,
  format,
  emptyLabel = '—',
  quickPicks,
  disabled,
  ariaLabel,
  decrementLabel = 'Decrease',
  incrementLabel = 'Increase',
}: NumberStepperProps) {
  /*
   * Stepping from "unanswered" starts at the floor rather than doing nothing.
   *
   * A + that appears inert is a broken button; a + that commits to the smallest
   * legal answer is one tap from any other.
   */
  const nudge = (delta: number) => {
    const base = value ?? min
    const next = Math.min(max, Math.max(min, base + delta * step))
    onChange(next)
  }

  const atMin = value != null && value <= min
  const atMax = value != null && value >= max

  return (
    <div className={s.field}>
      {label && <span className={s.label}>{label}</span>}

      <div className={s.control} role="group" aria-label={ariaLabel ?? label}>
        <button
          type="button"
          className={s.step}
          onClick={() => nudge(-1)}
          disabled={disabled || atMin}
          aria-label={decrementLabel}
        >
          <Minus size={15} />
        </button>

        {/*
          The live value is a text node, not an input: there is nothing to type
          here, and a read-only input would still invite a tap that opens a
          keyboard and changes nothing.
        */}
        <output className={[s.value, value == null ? s.empty : ''].filter(Boolean).join(' ')}>
          {value == null ? emptyLabel : (format?.(value) ?? String(value))}
        </output>

        <button
          type="button"
          className={s.step}
          onClick={() => nudge(1)}
          disabled={disabled || atMax}
          aria-label={incrementLabel}
        >
          <Plus size={15} />
        </button>
      </div>

      {quickPicks && quickPicks.length > 0 && (
        <div className={s.picks}>
          {quickPicks.map((pick) => (
            <button
              key={pick.label}
              type="button"
              className={[s.pick, pick.value === value ? s.pickOn : ''].filter(Boolean).join(' ')}
              onClick={() => onChange(pick.value)}
              aria-pressed={pick.value === value}
              disabled={disabled}
            >
              {pick.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
