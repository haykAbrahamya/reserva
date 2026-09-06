import { forwardRef, useState, type ReactNode } from 'react'
import { AlertCircle, Eye, EyeOff } from 'lucide-react'
import s from './Input.module.scss'

/** Shared inline field-error row — one consistent look (icon + red text)
 *  everywhere. Matches the standalone FieldError component used for Selects. */
function ErrorMsg({ message }: { message: string }) {
  return (
    <span className={s.errorMsg} role="alert">
      <AlertCircle size={13} /> {message}
    </span>
  )
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  help?: string
  error?: string
  /**
   * A control inside the field's right edge — a reveal toggle, a unit, a clear
   * button.
   *
   * It exists because callers were doing this themselves: wrapping `<Input>` in
   * a `position: relative` div and absolutely positioning a button at
   * `top: 50%`. That measures the middle of LABEL + INPUT + ERROR, not of the
   * input, so the button sat too low — and moved again the moment a validation
   * error appeared under the field. Anchoring it here means it is positioned
   * against the box it belongs to, whatever else the field is showing.
   */
  trailing?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, help, error, trailing, className = '', ...props }, ref) => (
    <div className={s.wrap}>
      {label && <label className={s.label}>{label}</label>}
      <div className={s.control}>
        <input
          ref={ref}
          className={[s.field, error ? s.error : '', trailing ? s.hasTrailing : '', className]
            .filter(Boolean)
            .join(' ')}
          {...props}
        />
        {trailing && <span className={s.trailing}>{trailing}</span>}
      </div>
      {error && <ErrorMsg message={error} />}
      {help && !error && <span className={s.help}>{help}</span>}
    </div>
  )
)
Input.displayName = 'Input'

export interface PasswordInputProps extends Omit<InputProps, 'type' | 'trailing'> {
  /** Accessible name for the reveal button while the password is hidden. */
  showLabel: string
  /** …and while it is visible. */
  hideLabel: string
}

/**
 * A password field that can be read back.
 *
 * Six of these existed across two apps, each re-implementing the same toggle,
 * the same `showPw` state and the same absolutely-positioned button — and one
 * of them (the "confirm password" field) had quietly been left without a toggle
 * at all, which is the field people most need to check, because they cannot
 * compare it against anything.
 *
 * Owning the state here is the point: a caller cannot forget the button, put it
 * in the wrong place, or leave one field of a pair inconsistent with the other.
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ showLabel, hideLabel, ...props }, ref) => {
    const [visible, setVisible] = useState(false)
    return (
      <Input
        ref={ref}
        {...props}
        type={visible ? 'text' : 'password'}
        trailing={
          <button
            type="button"
            className={s.reveal}
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? hideLabel : showLabel}
            /* Not focusable: the field itself is the control, and a tab stop
               between every password and the next field is a worse trade than
               the mouse-only reveal it buys. Screen readers still reach it. */
            tabIndex={-1}
          >
            {visible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        }
      />
    )
  },
)
PasswordInput.displayName = 'PasswordInput'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  help?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, help, error, className = '', ...props }, ref) => (
    <div className={s.wrap}>
      {label && <label className={s.label}>{label}</label>}
      <textarea
        ref={ref}
        className={[s.field, s.textarea, error ? s.error : '', className].filter(Boolean).join(' ')}
        {...props}
      />
      {error && <ErrorMsg message={error} />}
      {help && !error && <span className={s.help}>{help}</span>}
    </div>
  )
)
Textarea.displayName = 'Textarea'
