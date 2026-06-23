import { forwardRef } from 'react'
import { AlertCircle } from 'lucide-react'
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
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, help, error, className = '', ...props }, ref) => (
    <div className={s.wrap}>
      {label && <label className={s.label}>{label}</label>}
      <input
        ref={ref}
        className={[s.field, error ? s.error : '', className].filter(Boolean).join(' ')}
        {...props}
      />
      {error && <ErrorMsg message={error} />}
      {help && !error && <span className={s.help}>{help}</span>}
    </div>
  )
)
Input.displayName = 'Input'

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
