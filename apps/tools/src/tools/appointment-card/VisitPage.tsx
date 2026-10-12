import { useEffect, useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { CalendarX2, Sparkles } from 'lucide-react'
import { Button, Empty } from '@reserva/ui'
import { hasExplicitChoice, useI18n, useT } from '@/i18n'
import { useSeo } from '@/lib/useSeo'
import { toolById } from '@/tools/registry'
import { VisitCard } from './components/VisitCard/VisitCard'
import { decodeVisit } from './visitLink'
import s from './VisitPage.module.scss'

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

  useSeo({
    title: visit
      ? `${t('appointmentCard.visit.title')} — ${visit.salon}`
      : t('appointmentCard.visit.invalidTitle'),
    noIndex: true,
  })

  return (
    <div className={s.page}>
      {visit ? (
        <VisitCard visit={visit} />
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
      <Link to="/" className={s.made}>
        <span className={s.madeLine}>
          <Sparkles size={13} />
          {t('appointmentCard.card.made')}
        </span>
        <span className={s.madeHint}>{t('appointmentCard.card.madeHint')}</span>
      </Link>
    </div>
  )
}
