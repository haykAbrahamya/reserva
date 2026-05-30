import type { LucideIcon } from 'lucide-react'
import s from './Empty.module.scss'

interface EmptyProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}

export function Empty({ icon: Icon, title, description, action }: EmptyProps) {
  return (
    <div className={s.empty}>
      <Icon size={36} strokeWidth={1} className={s.icon} />
      <p className={s.title}>{title}</p>
      {description && <p className={s.desc}>{description}</p>}
      {action && <div className={s.action}>{action}</div>}
    </div>
  )
}
