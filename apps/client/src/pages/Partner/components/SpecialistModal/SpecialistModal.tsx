import { useState, useEffect, useCallback } from 'react'
import { X, CalendarCheck, Star } from 'lucide-react'
import { initials } from '@reserva/shared'
import type { Specialist } from '@reserva/shared'
import type { PublicPartner } from '@/mock/partners'
import { getSpecialistProfile } from '@/mock/specialists'
import { useT } from '@/i18n'
import s from './SpecialistModal.module.scss'

interface Props {
  partner: PublicPartner
  specialist: Specialist
  onClose: () => void
  onBook: () => void
}

export function SpecialistModal({ partner, specialist, onClose, onBook }: Props) {
  const [closing, setClosing] = useState(false)
  const profile = getSpecialistProfile(specialist.id)
  const [t1, t2] = partner.presentation.heroTints
  const t = useT()

  const animatedClose = useCallback(() => {
    setClosing(true)
    setTimeout(onClose, 280)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') animatedClose() }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [animatedClose])

  // Services this specialist offers.
  const services = partner.services.filter(sv => sv.active && specialist.services.includes(sv.id))

  return (
    <div className={[s.overlay, closing ? s.closing : ''].filter(Boolean).join(' ')} onClick={animatedClose}>
      <div className={[s.modal, closing ? s.closing : ''].filter(Boolean).join(' ')} onClick={e => e.stopPropagation()}>
        <button className={s.closeBtn} onClick={animatedClose} aria-label={t('specialistModal.close')}><X size={16} /></button>

        {/* Branded banner */}
        <div className={s.banner} style={{ background: `linear-gradient(140deg, ${t1}, ${t2})` }}>
          <div className={s.bannerGrid} />
          <div className={s.avatar} style={{ background: 'rgba(255,255,255,0.18)' }}>
            {initials(specialist.name)}
          </div>
          <div className={s.bannerInfo}>
            <div className={s.spName}>{specialist.name}</div>
            <div className={s.spTitle}>{specialist.title}</div>
            <span className={s.spRating}>
              <Star size={13} className={s.star} fill="currentColor" />
              <strong>{profile.rating.toFixed(1)}</strong>
              <span className={s.count}>{t('specialistModal.reviewsCount', { count: profile.reviewCount })}</span>
            </span>
          </div>
        </div>

        <div className={s.body}>
          {/* Quick stats */}
          <div className={s.statsRow}>
            <div className={s.stat}>
              <div className={s.statVal}>{profile.rating.toFixed(1)}</div>
              <div className={s.statLabel}>{t('specialistModal.stats.rating')}</div>
            </div>
            <div className={s.stat}>
              <div className={s.statVal}>{profile.reviewCount}</div>
              <div className={s.statLabel}>{t('specialistModal.stats.reviews')}</div>
            </div>
            <div className={s.stat}>
              <div className={s.statVal}>{profile.experience}</div>
              <div className={s.statLabel}>{t('specialistModal.stats.experience')}</div>
            </div>
          </div>

          {/* Bio */}
          <p className={s.sectionLabel}>{t('specialistModal.about')}</p>
          <p className={s.bio}>{profile.bio}</p>

          {/* Services */}
          {services.length > 0 && (
            <>
              <p className={s.sectionLabel}>{t('specialistModal.services')}</p>
              <div className={s.svcChips}>
                {services.map(sv => (
                  <span key={sv.id} className={s.chip}>{sv.name}</span>
                ))}
              </div>
            </>
          )}

          {/* Reviews */}
          {profile.reviews.length > 0 && (
            <>
              <p className={s.sectionLabel}>{t('specialistModal.whatClientsSay')}</p>
              <div className={s.reviews}>
                {profile.reviews.map((r, i) => (
                  <div key={i} className={s.review}>
                    <div className={s.reviewHead}>
                      <span className={s.reviewAuthor}>{r.author}</span>
                      <span className={s.reviewStars}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                    </div>
                    <p className={s.reviewText}>{r.text}</p>
                    <div className={s.reviewDate} style={{ marginTop: 6 }}>{r.date}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className={s.footer}>
          <button className={s.bookBtn} onClick={() => { onBook(); animatedClose() }}>
            <CalendarCheck size={17} /> {t('specialistModal.bookWith', { name: specialist.name.split(' ')[0] })}
          </button>
        </div>
      </div>
    </div>
  )
}
