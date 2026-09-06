import s from './Toggle.module.scss'

interface ToggleProps {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
  /**
   * Accessible name.
   *
   * A `role="switch"` with no name is announced as just "switch, on" — which
   * says the state of something without saying what. Optional because most
   * callers put it inside a <label> or beside its own heading, but a switch
   * standing alone in a settings row has nothing else to borrow a name from.
   */
  ariaLabel?: string
}

export function Toggle({ checked, onChange, disabled, ariaLabel }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={[s.toggle, checked ? s.on : ''].filter(Boolean).join(' ')}
      // Inline fallbacks so the on/off visual never depends solely on the hashed
      // CSS-module class resolving (which was failing for this control).
      style={{ background: checked ? 'var(--accent)' : 'var(--line-2)' }}
    >
      <span className={s.knob} style={{ left: checked ? 16 : 2 }} />
    </button>
  )
}

export function Checkbox({ checked, onChange, disabled, ariaLabel }: ToggleProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={[s.checkbox, checked ? s.on : ''].filter(Boolean).join(' ')}
    >
      {checked && (
        <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
          <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  )
}
