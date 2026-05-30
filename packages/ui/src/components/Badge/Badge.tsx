import s from './Badge.module.scss'

/**
 * Generic status badge. `variant` maps to a style class in Badge.module.scss.
 * Domain wrappers (e.g. BookingBadge) live in the consuming app.
 */
export type BadgeVariant =
  | 'confirmed'
  | 'pending'
  | 'cancelled'
  | 'completed'
  | 'noshow'
  | 'active'
  | 'inactive'

const defaultLabels: Record<BadgeVariant, string> = {
  confirmed: 'Confirmed', pending: 'Pending', cancelled: 'Cancelled',
  completed: 'Completed', noshow: 'No-show', active: 'Active', inactive: 'Inactive',
}

interface BadgeProps {
  variant: BadgeVariant
  label?: string
}

export function Badge({ variant, label }: BadgeProps) {
  return (
    <span className={[s.badge, s[variant]].join(' ')}>
      <span className={s.dot} />
      {label ?? defaultLabels[variant]}
    </span>
  )
}
