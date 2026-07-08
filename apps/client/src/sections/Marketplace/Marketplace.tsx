import { useNavigate } from 'react-router-dom'
import { Store, Search, MapPin, Star, ArrowRight } from 'lucide-react'
import { Reveal } from '@/components/Reveal/Reveal'
import { useT } from '@/i18n'
import s from './Marketplace.module.scss'

/**
 * Marketplace teaser — a compact, attractive split panel that tells partners
 * they also get discovered on the public Reserva marketplace, with a single CTA
 * to browse /salons. Deliberately light on copy: one promise + one action.
 */
export function Marketplace() {
  const t = useT()
  const navigate = useNavigate()

  return (
    <section className={s.section} id="marketplace">
      <Reveal>
        <div className={s.panel}>
          <div className={s.orb} />

          {/* Left — the promise + CTA */}
          <div className={s.copy}>
            <span className={s.eyebrow}><Store size={13} /> {t('marketplace.eyebrow')}</span>
            <h2 className={s.title}>
              {t('marketplace.titlePre')}<em>{t('marketplace.titleEm')}</em>{t('marketplace.titlePost')}
            </h2>
            <p className={s.text}>{t('marketplace.text')}</p>
            <button className={s.cta} onClick={() => navigate('/salons')}>
              {t('marketplace.browse')} <ArrowRight size={16} />
            </button>
          </div>

          {/* Right — a small, decorative mock marketplace card */}
          <div className={s.visual} aria-hidden="true">
            <div className={s.searchPill}>
              <Search size={14} />
              <span>{t('marketplace.mockSearch')}</span>
            </div>
            <div className={s.card}>
              <div className={s.cardBanner}>
                <span className={s.cardLogo}>R</span>
                <span className={s.cardRating}><Star size={11} /> 4.9</span>
              </div>
              <div className={s.cardBody}>
                <div className={s.cardName}>{t('marketplace.mockName')}</div>
                <div className={s.cardMeta}><MapPin size={12} /> {t('marketplace.mockCity')}</div>
                <div className={s.cardChips}>
                  <span className={s.chip} />
                  <span className={s.chip} />
                  <span className={s.chip} />
                </div>
              </div>
            </div>
            <div className={s.cardGhost} />
          </div>
        </div>
      </Reveal>
    </section>
  )
}
