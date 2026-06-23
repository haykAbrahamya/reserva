import { X, CalendarCheck, Star } from 'lucide-react'
import { initials } from '@reserva/shared'
import type { Specialist } from '@reserva/shared'
import type { PublicPartner } from '@/mock/partners'
import { getSpecialistProfile } from '@/mock/specialists'
import { ModalShell } from '@/components/ModalShell/ModalShell'
import { useT } from '@/i18n'
import s from './SpecialistModal.module.scss'

interface Props {
  partner: PublicPartner
  specialist: Specialist
  onClose: () => void
  onBook: () => void
}

export function SpecialistModal({ partner, specialist, onClose, onBook }: Props) {
  const profile = getSpecialistProfile(specialist.id)
  const [t1, t2] = partner.presentation.heroTints
  const t = useT()

  // Services this specialist offers.
  const services = partner.services.filter(sv => sv.active && specialist.services.includes(sv.id))

  return (
    <ModalShell open onClose={onClose} closeDuration={280}>
      {({ closing, requestClose }) => (
    <div className={[s.overlay, closing ? s.closing : ''].filter(Boolean).join(' ')} onClick={requestClose}>
      <div className={[s.modal, closing ? s.closing : ''].filter(Boolean).join(' ')} onClick={e => e.stopPropagation()}>
        <button className={s.closeBtn} onClick={requestClose} aria-label={t('specialistModal.close')}><X size={16} /></button>

        {/* Branded banner */}
        <div className={s.banner} style={{ background: `linear-gradient(140deg, ${t1}, ${t2})` }}>
          <div className={s.bannerGrid} />
          <div className={s.avatar} style={{ background: 'rgba(255,255,255,0.18)' }}>
            {initials(specialist.name)}
          </div>
          <div className={s.bannerInfo}>
            <div className={s.spName}>{specialist.name}</div>
            <div className={s.spTitle}>{specialist.title}</div>
            {/* Rating only when there are real reviews — never fake stars. */}
            {profile.rating > 0 && profile.reviewCount > 0 && (
              <span className={s.spRating}>
                <Star size={13} className={s.star} fill="currentColor" />
                <strong>{profile.rating.toFixed(1)}</strong>
                <span className={s.count}>{t('specialistModal.reviewsCount', { count: profile.reviewCount })}</span>
              </span>
            )}
          </div>
        </div>

        <div className={s.body}>
          {/* Quick stats — each only shown when there's real data behind it. */}
          {(profile.reviewCount > 0 || profile.experience) && (
            <div className={s.statsRow}>
              {profile.rating > 0 && profile.reviewCount > 0 && (
                <div className={s.stat}>
                  <div className={s.statVal}>{profile.rating.toFixed(1)}</div>
                  <div className={s.statLabel}>{t('specialistModal.stats.rating')}</div>
                </div>
              )}
              {profile.reviewCount > 0 && (
                <div className={s.stat}>
                  <div className={s.statVal}>{profile.reviewCount}</div>
                  <div className={s.statLabel}>{t('specialistModal.stats.reviews')}</div>
                </div>
              )}
              {profile.experience && (
                <div className={s.stat}>
                  <div className={s.statVal}>{profile.experience}</div>
                  <div className={s.statLabel}>{t('specialistModal.stats.experience')}</div>
                </div>
              )}
            </div>
          )}

          {/* Bio — only when present. */}
          {profile.bio && (
            <>
              <p className={s.sectionLabel}>{t('specialistModal.about')}</p>
              <p className={s.bio}>{profile.bio}</p>
            </>
          )}

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
          <button className={s.bookBtn} onClick={() => { onBook(); requestClose() }}>
            <CalendarCheck size={17} /> {t('specialistModal.bookWith', { name: specialist.name.split(' ')[0] })}
          </button>
        </div>
      </div>
    </div>
      )}
    </ModalShell>
  )
}
