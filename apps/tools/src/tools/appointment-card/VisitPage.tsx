import { useEffect, useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { CalendarX2, Sparkles } from 'lucide-react'
import { Button, Empty } from '@reserva/ui'
import { hasExplicitChoice, useI18n, useT } from '@/i18n'
import { toolEvents, track, type VisitAct } from '@/lib/analytics/pulse'
import { useSeo } from '@/lib/useSeo'
import { toolById } from '@/tools/registry'
import { VisitCard } from './components/VisitCard/VisitCard'
import { decodeVisit } from './visitLink'
import s from './VisitPage.module.scss'

const visitAction = (act: VisitAct) => track('visit_action', { act })
/** The broken link last reported — StrictMode runs effects twice in development. */
let reportedBadLink: string | null = null

/**
 * The page a client opens from the salon's message. It reads the visit from
 * the link itself (see visitLink.ts) — there is nothing to load and nothing
 * stored anywhere. Kept out of search results: it is one person's appointment.
 */
export function VisitPage() {
  const t = useT()
  const navigate = useNavigate()
  const { locale, setLocale } = useI18n()
  const { hash } = useLocation()
  const visit = useMemo(() => decodeVisit(hash.slice(1)), [hash])

  // Shown in the salon's language — unless the visitor once chose their own.
  useEffect(() => {
    if (visit && visit.locale !== locale && !hasExplicitChoice()) setLocale(visit.locale)
  }, [visit, locale, setLocale])

  // A link that opens nothing — cut short when it was copied, or edited by hand.
  useEffect(() => {
    if (visit || reportedBadLink === hash) return
    reportedBadLink = hash
    toolEvents('appointmentCard').failed('bad_link')
  }, [visit, hash])

  useSeo({
    title: visit
      ? `${t('appointmentCard.visit.title')} — ${visit.salon}`
      : t('appointmentCard.visit.invalidTitle'),
    noIndex: true,
  })

  return (
    <div className={s.page}>
      {visit ? (
        <VisitCard visit={visit} onAction={visitAction} />
      ) : (
        <Empty
          icon={CalendarX2}
          title={t('appointmentCard.visit.invalidTitle')}
          description={t('appointmentCard.visit.invalidBody')}
          action={
            <Button variant="accent" onClick={() => navigate(toolById('appointmentCard').path)}>
              {t('appointmentCard.visit.invalidAction')}
            </Button>
          }
        />
      )}

      {/* The one line that turns a client who is also a pro into a visitor. */}
      <Link to="/" className={s.made} onClick={() => visitAction('made')}>
        <span className={s.madeLine}>
          <Sparkles size={13} />
          {t('appointmentCard.card.made')}
        </span>
        <span className={s.madeHint}>{t('appointmentCard.card.madeHint')}</span>
      </Link>
    </div>
  )
}
