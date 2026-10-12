import type { ReactNode } from 'react'
import { CalendarDays, CalendarPlus, Clock, MapPin, Navigation, Phone, Sparkles, type LucideIcon } from 'lucide-react'
import { addToCalendar, fmtDuration } from '@reserva/shared'
import { Button } from '@reserva/ui'
import { useT } from '@/i18n'
import type { VisitAct } from '@/lib/analytics/pulse'
import { formatLongDay, parseDay, useCalendarWords } from '@/lib/dates'
import { fileNameFor } from '@/lib/fileName'
import { endTime } from '../../model'
import { isPast, mapsUrl, telUrl, visitEvent, type Visit } from '../../visitLink'
import s from './VisitCard.module.scss'

interface Props {
  visit: Visit
  /** The client used the card — on the visit page only, never the salon trying its own preview. */
  onAction?: (act: VisitAct) => void
}

/**
 * The appointment as the client sees it — on the card page, and live in the
 * editor while the salon fills it in, so what they send is what they saw.
 * Everything the client needs on the day is one tap: the calendar, the way
 * there, the phone.
 */
export function VisitCard({ visit, onAction }: Props) {
  const t = useT()
  const words = useCalendarWords()
  const date = parseDay(visit.date)
  const duration = fmtDuration(visit.duration, {
    min: t('appointmentCard.units.min'),
    h: t('appointmentCard.units.hour'),
  })
  const service = visit.service.trim()
  const address = visit.address.trim()
  const phone = visit.phone.trim()
  const note = visit.note.trim()

  return (
    <article className={s.card}>
      <header className={s.head}>
        <div className={s.tile} aria-hidden="true">
          <span className={s.month}>{words.months[date.getMonth()].slice(0, 3)}</span>
          <span className={s.day}>{date.getDate()}</span>
        </div>
        <div className={s.headText}>
          <span className={s.eyebrow}>{t('appointmentCard.card.eyebrow')}</span>
          <h2 className={s.salon}>{visit.salon.trim()}</h2>
        </div>
      </header>

      {isPast(visit) && <p className={s.passed}>{t('appointmentCard.card.passed')}</p>}

      <dl className={s.details}>
        <Detail icon={CalendarDays} label={t('appointmentCard.fields.date')}>
          {formatLongDay(visit.date, words)}
        </Detail>
        <Detail icon={Clock} label={t('appointmentCard.fields.time')}>
          {visit.time} – {endTime(visit.time, visit.duration)} <span className={s.quiet}>· {duration}</span>
        </Detail>
        {service && (
          <Detail icon={Sparkles} label={t('appointmentCard.fields.service')}>
            {service}
          </Detail>
        )}
        {address && (
          <Detail icon={MapPin} label={t('appointmentCard.fields.address')}>
            {address}
          </Detail>
        )}
        {phone && (
          <Detail icon={Phone} label={t('appointmentCard.fields.phone')}>
            {phone}
          </Detail>
        )}
      </dl>

      {note && <p className={s.note}>{note}</p>}

      <div className={s.actions}>
        <Button
          variant="accent"
          className={s.primary}
          onClick={() => {
            onAction?.('calendar')
            addToCalendar(visitEvent(visit), fileNameFor('visit', visit.salon, 'ics'))
          }}
        >
          <CalendarPlus size={16} />
          {t('appointmentCard.card.addToCalendar')}
        </Button>
        {(address || phone) && (
          <div className={s.secondary}>
            {address && (
              <a
                className={s.link}
                href={mapsUrl(address)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onAction?.('directions')}
              >
                <Navigation size={15} />
                {t('appointmentCard.card.directions')}
              </a>
            )}
            {phone && (
              <a className={s.link} href={telUrl(phone)} onClick={() => onAction?.('call')}>
                <Phone size={15} />
                {t('appointmentCard.card.call')}
              </a>
            )}
          </div>
        )}
      </div>
    </article>
  )
}

function Detail({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className={s.detail}>
      <dt className={s.detailLabel}>
        <Icon size={16} aria-hidden="true" />
        <span className={s.srOnly}>{label}</span>
      </dt>
      <dd className={s.detailValue}>{children}</dd>
    </div>
  )
}
