import { ArrowUpRight, CalendarCheck } from 'lucide-react'
import { useT } from '@/i18n'
import { platformUrl } from '@/lib/links'
import s from './BookingPitch.module.scss'

interface Props {
  title: string
  body: string
  /** Which tool sent the visitor, for the platform's analytics. */
  source: string
}

/**
 * The step from a free tool into Reserva — shown after the result, where the
 * visitor has just done the work a booking page would reuse. Each tool writes
 * its own reason; the action is the same everywhere.
 */
export function BookingPitch({ title, body, source }: Props) {
  const t = useT()

  return (
    <aside className={s.pitch}>
      <span className={s.icon} aria-hidden="true">
        <CalendarCheck size={22} strokeWidth={1.7} />
      </span>
      <div className={s.text}>
        <h2 className={s.title}>{title}</h2>
        <p className={s.body}>{body}</p>
      </div>
      <a className={s.cta} href={platformUrl('/signup', source)}>
        {t('pitch.cta')}
        <ArrowUpRight size={15} />
      </a>
    </aside>
  )
}
