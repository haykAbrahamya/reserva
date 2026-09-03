import { Link } from 'react-router-dom'
import { MapPin, Users } from 'lucide-react'
import { Avatar } from '@reserva/ui'
import { resolveImageUrl } from '@/api/client'
import { useI18n, useLocalized, useT } from '@/i18n'
import { relativeTime } from '@/lib/dates'
import { placeLabel, roleTitle } from '@/lib/vacancy'
import type { VacancyCard as Card } from '@/api/types'
import { PayTag } from '../PayTag/PayTag'
import { PerkChips } from '../PerkChips/PerkChips'
import s from './VacancyCard.module.scss'

interface Props {
  vacancy: Card
  /** Compact form for the "more from this salon" strip on a detail page. */
  dense?: boolean
}

/** How many perks a card shows before summarizing the rest. */
const PERKS_ON_CARD = 3

/**
 * One listing, as a row.
 *
 * A wide row rather than a tile in a grid. A job board is scanned down a single
 * column — role, place, money, repeat — and a grid forces the eye to zig-zag
 * while giving each card less room for the four facts that decide whether it
 * gets opened. Rows also let the money sit in a fixed right-hand column, so
 * figures line up down the page and can be compared without being read.
 *
 * Laid out as a GRID of three regions rather than two nested columns,
 * specifically so the phone layout can reorder them into identity -> money ->
 * details. With the money nested inside a "main" column that reordering is
 * impossible, and the choice becomes money above the job title or money buried
 * under the perks. Both are wrong.
 *
 * The whole row is one link, and the salon's brand colour is contained inside
 * it — it never reaches the app's chrome.
 */
export function VacancyCard({ vacancy, dense = false }: Props) {
  const t = useT()
  const { locale } = useI18n()
  const loc = useLocalized()

  const title = roleTitle(vacancy, loc)
  const salonName = loc(vacancy.salon.name, vacancy.salon.nameI18n)
  const place = placeLabel(vacancy, loc)
  const posted = relativeTime(vacancy.publishedAt, locale)

  const hasDetails = !dense && (vacancy.scheduleType || vacancy.perks.length > 0)

  return (
    <Link
      to={`/v/${vacancy.id}`}
      className={[s.card, dense ? s.dense : ''].filter(Boolean).join(' ')}
      // Used only for the hover edge, so a salon's branding reads as a hint of
      // identity rather than a repainted interface.
      style={{ ['--salon-accent' as string]: vacancy.salon.accent }}
    >
      <div className={s.identity}>
        <Avatar
          name={salonName}
          src={resolveImageUrl(vacancy.salon.logoUrl) ?? undefined}
          color={vacancy.salon.accent}
          size={dense ? 'sm' : 'md'}
          className={s.avatar}
        />
        <div className={s.headings}>
          <h3 className={s.title}>{title}</h3>
          <p className={s.salon}>
            <span className={s.salonName}>{salonName}</span>
            <span className={s.dot} aria-hidden="true">·</span>
            <span className={s.place}>
              <MapPin size={12} aria-hidden="true" />
              {place}
            </span>
          </p>
        </div>
      </div>

      <div className={s.side}>
        <PayTag vacancy={vacancy} size={dense ? 'sm' : 'md'} />
        {!dense && posted && <span className={s.posted}>{posted}</span>}
      </div>

      {hasDetails && (
        <div className={s.details}>
          <div className={s.facts}>
            {vacancy.scheduleType && (
              <span className={s.fact}>{t(`schedule.${vacancy.scheduleType}`)}</span>
            )}
            <span className={s.fact}>{t(`experience.${vacancy.experience}`)}</span>
            {vacancy.seats > 1 && (
              <span className={s.fact}>
                <Users size={12} aria-hidden="true" />
                {t('card.seats', { count: vacancy.seats })}
              </span>
            )}
          </div>
          {vacancy.perks.length > 0 && <PerkChips perks={vacancy.perks} max={PERKS_ON_CARD} />}
        </div>
      )}
    </Link>
  )
}
