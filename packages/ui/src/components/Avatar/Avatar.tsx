import { initials } from '@reserva/shared'
import s from './Avatar.module.scss'

interface AvatarProps {
  name: string
  /** Optional photo. When set, shows the image; otherwise the name initials. */
  src?: string
  size?: 'sm' | 'md' | 'lg'
  color?: string
  className?: string
  style?: React.CSSProperties
}

export function Avatar({ name, src, size = 'md', color, className = '', style }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={[s.avatar, s[size], s.img, className].filter(Boolean).join(' ')}
        style={style}
      />
    )
  }
  return (
    <div
      className={[s.avatar, s[size], className].filter(Boolean).join(' ')}
      style={{ background: color ?? 'var(--bg-3)', color: color ? 'white' : 'var(--fg-1)', ...style }}
    >
      {initials(name)}
    </div>
  )
}
