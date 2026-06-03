import type { ReactNode } from 'react'
import { Reveal } from '@/components/Reveal/Reveal'
import s from './SectionHead.module.scss'

interface Props {
  eyebrow: string
  title: ReactNode
  subtitle?: string
}

export function SectionHead({ eyebrow, title, subtitle }: Props) {
  return (
    <Reveal className={s.head}>
      <span className={s.eyebrow}>{eyebrow}</span>
      <h2 className={s.title}>{title}</h2>
      {subtitle && <p className={s.subtitle}>{subtitle}</p>}
    </Reveal>
  )
}
