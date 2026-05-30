import { initials } from '@reserva/shared'
import s from './Avatar.module.scss'

interface AvatarProps {
  name: string
  size?: 'sm' | 'md' | 'lg'
  color?: string
  className?: string
  style?: React.CSSProperties
}

export function Avatar({ name, size = 'md', color, className = '', style }: AvatarProps) {
  return (
    <div
      className={[s.avatar, s[size], className].filter(Boolean).join(' ')}
      style={{ background: color ?? 'var(--bg-3)', color: color ? 'white' : 'var(--fg-1)', ...style }}
    >
      {initials(name)}
    </div>
  )
}
