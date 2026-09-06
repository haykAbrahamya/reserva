import { Link } from 'react-router-dom'
import { Images, MapPin, Sparkles } from 'lucide-react'
import { resolveImageUrl } from '@/api/client'
import type { SpecialistCard as Card } from '@/api/directory.api'
import { useT } from '@/i18n'
import s from './SpecialistCard.module.scss'

interface Props {
  card: Card
  /** Localized names, resolved by the page from one shared catalog fetch. */
  specialties: string[]
  areas: string[]
}

/**
 * One person in the directory.
 *
 * Built around the one question a salon is actually asking — "is this someone I
 * should call?" — and the honest answer is that they decide on the work and the
 * face before they read a word. So the photos are the top of the card and the
 * portrait sits on the seam between them and the text, the way a person is
 * introduced rather than the way a record is displayed.
 *
 * A profile with no photos gets a soft accent panel with its initial rather than
 * a grey box or a stock image: the card must not punish someone for not having
 * uploaded yet, and every card in the grid has to be the same height whatever it
 * contains — a directory whose rows jog up and down is unreadable at a glance.
 *
 * The whole card is one link. Not a card with a link in it: the target is a
 * single profile, so a second focus stop inside it would add a tab press for
 * every person on the page and announce the same destination twice.
 */
export function SpecialistCard({ card, specialties, areas }: Props) {
  const t = useT()
  const photos = card.previewPhotos.map((url) => resolveImageUrl(url)).filter(Boolean) as string[]
  const avatar = resolveImageUrl(card.avatarUrl)
  const initial = card.name.trim().charAt(0).toUpperCase()

  return (
    <Link className={s.card} to={`/specialists/${card.id}`}>
      <div className={s.cover}>
        {photos.length > 0 ? (
          /*
           * A strip, not a single image: three small frames say "there is a
           * body of work here" in a way one big photo cannot, and it degrades
           * cleanly — with two photos the second simply takes the space of the
           * third rather than leaving a hole.
           */
          <div className={[s.strip, s[`strip${Math.min(photos.length, 3)}`]].join(' ')}>
            {photos.slice(0, 3).map((url) => (
              <span key={url} className={s.stripCell}>
                <img className={s.stripImg} src={url} alt="" loading="lazy" />
              </span>
            ))}
          </div>
        ) : (
          <div className={s.coverEmpty} aria-hidden="true">
            <span className={s.coverInitial}>{initial}</span>
          </div>
        )}

        {card.photoCount > 3 && (
          <span className={s.photoCount}>
            <Images size={12} />
            {card.photoCount}
          </span>
        )}
      </div>

      <div className={s.body}>
        <div className={s.avatarWrap}>
          {avatar ? (
            <img className={s.avatar} src={avatar} alt="" loading="lazy" />
          ) : (
            <span className={[s.avatar, s.avatarEmpty].join(' ')} aria-hidden="true">
              {initial}
            </span>
          )}
        </div>

        <h3 className={s.name}>{card.name}</h3>

        {specialties.length > 0 && (
          <p className={s.role}>
            {/* Two, then a count. A colourist who also does extensions and
                keratin and bridal is not better represented by four chips —
                just harder to scan past. */}
            {specialties.slice(0, 2).join(' · ')}
            {specialties.length > 2 && <span className={s.more}> +{specialties.length - 2}</span>}
          </p>
        )}

        <div className={s.meta}>
          {card.experienceYears != null && (
            <span className={s.metaItem}>
              <Sparkles size={12} />
              {t('specialist.yearsValue', { count: card.experienceYears })}
            </span>
          )}
          {areas.length > 0 && (
            <span className={s.metaItem}>
              <MapPin size={12} />
              {areas.slice(0, 2).join(', ')}
              {areas.length > 2 && ` +${areas.length - 2}`}
            </span>
          )}
        </div>

        {/* Already cut on a word boundary by the API; clamped here so a long
            one cannot make its card taller than the rest of the row. */}
        {card.excerpt && <p className={s.excerpt}>{card.excerpt}</p>}
      </div>
    </Link>
  )
}
