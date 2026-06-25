import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Instagram, Mail } from 'lucide-react'
import { Logo } from '@/components/Logo/Logo'
import { Reveal } from '@/components/Reveal/Reveal'
import { DemoModal } from '@/components/DemoModal/DemoModal'
import { useT } from '@/i18n'
import s from './CtaFooter.module.scss'

const FOOTER_COLS = [
  { titleKey: 'product', links: ['features', 'pricing', 'howItWorks', 'forSalons'] },
  { titleKey: 'company', links: ['about', 'partners', 'careers', 'contact'] },
  { titleKey: 'legal',   links: ['privacy', 'terms', 'cookies'] },
]

export function CtaFooter() {
  const t = useT()
  const navigate = useNavigate()
  const [demoOpen, setDemoOpen] = useState(false)
  return (
    <>
      {/* Final CTA */}
      <section className={s.ctaSection} id="cta">
        <Reveal>
          <div className={s.panel}>
            <div className={s.panelGrid} />
            <div className={s.panelOrb} />
            <div className={s.panelInner}>
              <h2 className={s.panelTitle}>
                {t('ctaFooter.titlePre')}<em>{t('ctaFooter.titleEm')}</em>{t('ctaFooter.titlePost')}
              </h2>
              <p className={s.panelText}>
                {t('ctaFooter.text')}
              </p>
              <div className={s.panelActions}>
                <button className={s.btnPrimary} onClick={() => navigate('/signup')}>
                  {t('ctaFooter.startTrial')} <ArrowRight size={17} />
                </button>
                <button className={s.btnGhost} onClick={() => setDemoOpen(true)}>
                  <Mail size={16} /> {t('ctaFooter.bookDemo')}
                </button>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className={s.footer}>
        <div className={s.footerInner}>
          <div className={s.brandCol}>
            <Logo size={32} />
            <p className={s.footerTagline}>
              {t('ctaFooter.tagline')}
            </p>
          </div>

          {FOOTER_COLS.map(col => (
            <div key={col.titleKey}>
              <div className={s.colTitle}>{t(`ctaFooter.cols.${col.titleKey}`)}</div>
              {col.links.map(link => (
                <button key={link} className={s.footLink}>{t(`ctaFooter.links.${link}`)}</button>
              ))}
            </div>
          ))}
        </div>

        <div className={s.bottom}>
          <span className={s.copy}>{t('ctaFooter.copyright', { year: new Date().getFullYear() })}</span>
          <div className={s.social}>
            <a
              className={s.socialBtn}
              href="http://instagram.com/reserva.platform"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
            >
              <Instagram size={16} />
            </a>
          </div>
        </div>
      </footer>

      <DemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </>
  )
}
