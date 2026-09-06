import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, MapPin, Phone, Scissors, Sparkles, UserRoundX } from 'lucide-react'
import { Button, Empty, Lightbox } from '@reserva/ui'
import { resolveImageUrl } from '@/api/client'
import { fetchSpecialist } from '@/api/directory.api'
import { Header } from '@/components/layout/Header/Header'
import { useT } from '@/i18n'
import { useAsync } from '@/lib/useAsync'
import { useSeo } from '@/lib/useSeo'
import { useTaxonomy } from '@/lib/taxonomy'
import s from './SpecialistProfile.module.scss'

/**
 * One specialist's public page.
 *
 * The page a salon lands on from the directory, and the page its owner shares
 * as a link. Both readings matter, which is why it is laid out as a portfolio
 * rather than as a record: the work is the largest thing on it, and the details
 * that would headline a CV — years, districts — are a quiet line under the name.
 *
 * NOINDEX, deliberately. "Shareable" and "search-engine indexed" are different
 * things, and this is a page about a private individual: someone publishing a
 * profile to be found by salons has not asked to become a permanent search
 * result for their own name. The landing pages are what this product wants
 * indexed; a person is not a landing page.
 */
export function SpecialistProfile() {
  const t = useT()
  const { id = '' } = useParams()
  const { specialtyNames, areaNames } = useTaxonomy()
  /*
   * The OPEN PHOTO'S INDEX, not its url.
   *
   * The first version held a url, which is why there was no way to reach the
   * next photo: a url knows nothing about the sequence it came from. An index
   * is what lets arrows, arrow keys and a swipe all mean the same thing.
   */
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const profile = useAsync((signal) => fetchSpecialist(id, signal), [id], { skip: !id })
  const p = profile.data

  useSeo({
    title: p ? `${p.name} — ${t('directory.title')}` : t('directory.title'),
    noIndex: true,
  })

  if (profile.loading && !p) {
    return (
      <>
        <Header />
        <div className={s.page}>
          <div className={[s.panel, s.skeleton].join(' ')} />
        </div>
      </>
    )
  }

  /*
   * One "not found" for a missing profile and an unpublished one.
   *
   * The API refuses to distinguish them — telling them apart would turn this
   * URL into a way to confirm that a given person has an account here — so the
   * page does not try to either.
   */
  if (profile.error || !p) {
    return (
      <>
        <Header />
        <div className={s.page}>
          <Empty
            icon={UserRoundX}
            title={t('directory.notFoundTitle')}
            description={t('directory.notFoundBody')}
            action={
              <Link to="/specialists">
                <Button variant="accent">{t('directory.backToAll')}</Button>
              </Link>
            }
          />
        </div>
      </>
    )
  }

  const specialties = specialtyNames(p.specialtyKeys)
  const areas = areaNames(p.areaKeys)
  const avatar = resolveImageUrl(p.avatarUrl)
  const photos = p.photos
    .map((photo) => ({ ...photo, src: resolveImageUrl(photo.url) }))
    .filter((photo): photo is typeof photo & { src: string } => Boolean(photo.src))

  return (
    <>
      <Header />

      <div className={s.page}>
        <Link className={s.back} to="/specialists">
          <ArrowLeft size={15} />
          {t('directory.backToAll')}
        </Link>

        <header className={s.hero}>
          {avatar ? (
            <img className={s.photo} src={avatar} alt={p.name} />
          ) : (
            <span className={s.photoEmpty} aria-hidden="true">
              {p.name.trim().charAt(0).toUpperCase()}
            </span>
          )}

          <div className={s.heroText}>
            <h1 className={s.name}>{p.name}</h1>

            {specialties.length > 0 && (
              <div className={s.chips}>
                {specialties.map((label) => (
                  <span key={label} className={s.chip}>
                    <Scissors size={12} />
                    {label}
                  </span>
                ))}
              </div>
            )}

            <div className={s.facts}>
              {p.experienceYears != null && (
                <span className={s.fact}>
                  <Sparkles size={13} />
                  {t('specialist.yearsValue', { count: p.experienceYears })}
                </span>
              )}
              {areas.length > 0 && (
                <span className={s.fact}>
                  <MapPin size={13} />
                  {areas.join(', ')}
                </span>
              )}
            </div>

            {/*
              The contact block only exists when they published a number.
              Otherwise a line saying so, rather than a disabled button: a
              greyed-out "call" implies something is broken, when in fact a
              choice was made.
            */}
            {p.phone ? (
              <a className={s.callBtn} href={`tel:${p.phone}`}>
                <Phone size={15} />
                {p.phone}
              </a>
            ) : (
              <p className={s.noContact}>{t('directory.noContact')}</p>
            )}
          </div>
        </header>

        {p.about.trim() && (
          <section className={s.panel}>
            <h2 className={s.panelTitle}>{t('specialist.about')}</h2>
            <p className={s.about}>{p.about}</p>
          </section>
        )}

        {photos.length > 0 && (
          <section className={s.panel}>
            <h2 className={s.panelTitle}>{t('directory.work')}</h2>
            <ul className={s.gallery}>
              {photos.map((photo, i) => (
                <li key={photo.url}>
                  <button type="button" className={s.tile} onClick={() => setOpenIndex(i)}>
                    <img className={s.tileImg} src={photo.src} alt={photo.label ?? ''} loading="lazy" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/*
        The shared viewer — the same one the client app's partner gallery uses,
        so arrows, arrow keys, swipe, the counter and the directional slide all
        behave identically across the two products.
      */}
      {openIndex !== null && (
        <Lightbox
          images={photos.map((photo) => ({ url: photo.src, label: photo.label }))}
          index={openIndex}
          onIndex={setOpenIndex}
          onClose={() => setOpenIndex(null)}
          labels={{
            close: t('directory.close'),
            prev: t('directory.prevPhoto'),
            next: t('directory.nextPhoto'),
            counter: (current, total) => t('directory.photoOf', { current, total }),
          }}
        />
      )}
    </>
  )
}
