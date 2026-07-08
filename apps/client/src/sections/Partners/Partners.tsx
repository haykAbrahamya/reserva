import { useEffect, useState } from 'react'
import { listSalons, type SalonCard } from '@/services/salons.service'
import { useT } from '@/i18n'
import s from './Partners.module.scss'

/** A small inline chip: brand logo (or letter dot) + name. */
function PartnerChip({ salon }: { salon: SalonCard }) {
  const mark = salon.logoUrl ? (
    <img className={s.logo} src={salon.logoUrl} alt="" loading="lazy" />
  ) : (
    <span className={s.dot} style={{ background: salon.accent }}>
      {salon.name.charAt(0).toUpperCase()}
    </span>
  )
  const body = (
    <>
      {mark}
      <span className={s.name}>{salon.name}</span>
    </>
  )
  return salon.slug ? (
    <a className={s.chip} href={`/p/${salon.slug}`} title={salon.name}>{body}</a>
  ) : (
    <span className={s.chip}>{body}</span>
  )
}

/**
 * "Trusted by" — a compact, seamless marquee of marketplace-listed salons,
 * pulled live from /public/salons. A quiet label above a single low-height
 * sliding row of brand chips (logo + name); pauses on hover. Renders nothing
 * until a few partners exist so the strip never looks sparse.
 */
export function Partners() {
  const t = useT()
  const [salons, setSalons] = useState<SalonCard[] | null>(null)

  useEffect(() => {
    const ctrl = new AbortController()
    listSalons({}, ctrl.signal)
      .then(setSalons)
      .catch(() => setSalons([]))
    return () => ctrl.abort()
  }, [])

  if (!salons || salons.length < 3) return null

  // Repeat the list enough times that the track always overflows the viewport
  // (so a small partner count still fills the row and never leaves a gap).
  // Animating exactly one "set" width (-100 / copies %) lands on an identical
  // copy → a seamless, endless loop for any count. Min 12 tiles on screen.
  const copies = Math.max(2, Math.ceil(12 / salons.length))
  const loop = Array.from({ length: copies }, () => salons).flat()
  const shift = 100 / copies

  return (
    <section className={s.section} id="partners">
      <p className={s.label}>{t('partners.label')}</p>
      <div className={s.marquee}>
        <div
          className={s.track}
          style={{ ['--partners-shift' as string]: `-${shift}%` }}
        >
          {loop.map((salon, i) => (
            <PartnerChip key={`${salon.id}-${i}`} salon={salon} />
          ))}
        </div>
      </div>
    </section>
  )
}
