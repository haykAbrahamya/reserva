import s from './StatusPill.module.scss'

type Tone = 'draft' | 'open' | 'running' | 'done' | 'muted' | 'pending' | 'confirmed'

interface Props {
  label: string
  tone: Tone
  /** Small dot before the label (default true). */
  dot?: boolean
}

/** A compact status pill used for run status + member status across the page. */
export function StatusPill({ label, tone, dot = true }: Props) {
  return (
    <span className={[s.pill, s[tone]].join(' ')}>
      {dot && <span className={s.dot} />}
      {label}
    </span>
  )
}
