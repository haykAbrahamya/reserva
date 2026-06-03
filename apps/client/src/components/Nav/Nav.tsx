import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, X, ArrowRight } from 'lucide-react'
import { Logo } from '@/components/Logo/Logo'
import { ThemeToggle } from '@/components/ThemeToggle/ThemeToggle'
import { LanguageSwitcher } from '@/components/LanguageSwitcher/LanguageSwitcher'
import { useT } from '@/i18n'
import s from './Nav.module.scss'

const LINKS = [
  { labelKey: 'nav.features', id: 'features' },
  { labelKey: 'nav.howItWorks', id: 'how' },
  { labelKey: 'nav.pricing', id: 'pricing' },
]

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const t = useT()
  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const goto = (id: string) => { setMenuOpen(false); scrollToId(id) }

  return (
    <header className={[s.nav, scrolled ? s.scrolled : ''].filter(Boolean).join(' ')}>
      <div className={s.inner}>
        <Logo size={32} />

        <nav className={s.links}>
          {LINKS.map(l => (
            <button key={l.id} className={s.link} onClick={() => scrollToId(l.id)}>
              {t(l.labelKey)}
            </button>
          ))}
        </nav>

        <div className={s.spacer} />

        <div className={s.actions}>
          <ThemeToggle />
          <div className={s.desktopActions}>
            <LanguageSwitcher />
            <a className={s.signIn} href="#">{t('nav.signIn')}</a>
            <button className={s.cta} onClick={() => navigate('/signup')}>
              {t('nav.getStarted')} <ArrowRight size={15} />
            </button>
          </div>
          <button className={s.burger} onClick={() => setMenuOpen(true)} aria-label={t('nav.openMenu')}>
            <Menu size={18} />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <>
          <div className={s.mobileScrim} onClick={() => setMenuOpen(false)} />
          <div className={s.mobileMenu}>
            <div className={s.mobileHead}>
              <Logo size={30} />
              <button className={s.mobileClose} onClick={() => setMenuOpen(false)} aria-label={t('nav.closeMenu')}>
                <X size={18} />
              </button>
            </div>

            {LINKS.map(l => (
              <button key={l.id} className={s.mobileLink} onClick={() => goto(l.id)}>
                {t(l.labelKey)}
              </button>
            ))}

            <div className={s.mobileDivider} />
            <button className={s.mobileLink} onClick={() => setMenuOpen(false)}>{t('nav.signIn')}</button>

            <div className={s.mobileLangRow}>
              <LanguageSwitcher />
            </div>

            <div className={s.mobileCta}>
              <button className={s.cta} style={{ width: '100%', justifyContent: 'center', height: 46 }} onClick={() => { setMenuOpen(false); navigate('/signup') }}>
                {t('nav.getStarted')} <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </>
      )}
    </header>
  )
}
