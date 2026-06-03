import type { CSSProperties, ReactNode } from 'react'
import { useReveal } from '@/hooks/useReveal'
import s from './Reveal.module.scss'

interface RevealProps {
  children: ReactNode
  /** Stagger delay in ms. */
  delay?: number
  className?: string
  as?: 'div' | 'section' | 'li' | 'article'
}

/** Fades + slides its children up when scrolled into view. */
export function Reveal({ children, delay = 0, className = '', as = 'div' }: RevealProps) {
  const { ref, visible } = useReveal<HTMLDivElement>()
  const Tag = as as 'div'

  return (
    <Tag
      ref={ref}
      className={[s.reveal, visible ? s.visible : '', className].filter(Boolean).join(' ')}
      style={{ transitionDelay: visible ? `${delay}ms` : '0ms' } as CSSProperties}
    >
      {children}
    </Tag>
  )
}
