import { AlertCircle } from 'lucide-react'
import s from './FieldError.module.scss'

/**
 * Inline field-level error message for controls that don't have a built-in
 * `error` prop (e.g. the design-system Select, custom slot pickers). Renders
 * nothing when there's no error, so it's safe to drop under any field.
 */
export function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <span className={s.error} role="alert">
      <AlertCircle size={13} /> {message}
    </span>
  )
}
