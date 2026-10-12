import type { ReactNode } from 'react'
import { Card, CardHeader, CardTitle } from '@reserva/ui'
import s from './ToolSection.module.scss'

interface Props {
  title: string
  sub?: string
  /** A control on the right of the heading, e.g. "Clear list". */
  action?: ReactNode
  children: ReactNode
}

/** One titled group of a tool's form — the shared Card, with its header. */
export function ToolSection({ title, sub, action, children }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle sub={sub}>{title}</CardTitle>
        {action}
      </CardHeader>
      <div className={s.body}>{children}</div>
    </Card>
  )
}
