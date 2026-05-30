import { forwardRef } from 'react'
import s from './Button.module.scss'

type Variant = 'default' | 'primary' | 'accent' | 'ghost' | 'danger'
type Size = 'sm' | 'md'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'default', size = 'md', icon, className = '', children, ...props }, ref) => (
    <button
      ref={ref}
      className={[s.btn, s[variant], s[size], icon ? s.icon : '', className].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </button>
  )
)

Button.displayName = 'Button'
