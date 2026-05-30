import s from './Card.module.scss'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  pad?: boolean
}

export function Card({ pad, className = '', children, ...props }: CardProps) {
  return (
    <div className={[s.card, pad ? s.pad : '', className].filter(Boolean).join(' ')} {...props}>
      {children}
    </div>
  )
}

export function CardHeader({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={[s.header, className].filter(Boolean).join(' ')} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div>
      <div className={s.title}>{children}</div>
      {sub && <div className={s.sub}>{sub}</div>}
    </div>
  )
}
