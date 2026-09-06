import { useEffect } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ArrowRight, Briefcase, LogIn, LogOut, Plus, UserRound, Users } from 'lucide-react'
import { Drawer } from '@reserva/ui'
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher/LanguageSwitcher'
import { ThemeToggle } from '@/components/common/ThemeToggle/ThemeToggle'
import { useProfessionalAuth } from '@/auth/ProfessionalAuth'
import { useThemeContext } from '@/theme/ThemeProvider'
import { useT } from '@/i18n'
import s from './MenuDrawer.module.scss'

interface Props {
  open: boolean
  onClose: () => void
}

/**
 * Everything this site contains, on one screen.
 *
 * Below 1000px the header cannot hold the market switch, the language control,
 * the theme toggle and an account link without the four of them touching — so
 * they move in here, where each one gets a label and a line of explanation
 * instead of being a 34px circle guessing game.
 *
 * The order is the product's own priority, not an alphabet:
 *
 *   1. the two SIDES of the market, as full rows — the only two destinations
 *      most visitors want, and the reason this menu exists at all
 *   2. the salon's call to action, which is the most valuable click on the site
 *      and previously lived only at the bottom of the footer
 *   3. the account
 *   4. preferences, last, because nobody opens a menu to change a theme
 *
 * No landing-page shortcuts. They were here and they were a wall: those labels
 * are full phrases ("Работа парикмахером") because that is the anchor text the
 * pages want on the BOARD, and six of them took six lines of a menu whose whole
 * job is to be scanned in one glance. The board carries the full crawlable set.
 *
 * It closes on navigation. A menu that stays open over the page it just moved
 * you to is a menu you have to dismiss twice.
 */
export function MenuDrawer({ open, onClose }: Props) {
  const t = useT()
  const { pathname } = useLocation()
  const { signedIn, logout } = useProfessionalAuth()
  const { isDark, toggle } = useThemeContext()

  // Close on navigation — including a link to the page you are already on,
  // where React Router changes nothing and no effect would otherwise fire.
  useEffect(() => {
    if (open) onClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  const sides = [
    {
      to: '/',
      end: true,
      icon: Briefcase,
      title: t('nav.jobs'),
      body: t('nav.jobsBody'),
    },
    {
      to: '/specialists',
      icon: Users,
      title: t('nav.specialists'),
      body: t('nav.specialistsBody'),
    },
  ]

  return (
    <Drawer open={open} onClose={onClose} title={t('nav.menu')}>
      <div className={s.menu}>
        <nav className={s.sides} aria-label={t('nav.primary')}>
          {sides.map((side) => (
            <NavLink
              key={side.to}
              to={side.to}
              end={side.end}
              onClick={onClose}
              className={({ isActive }) => [s.side, isActive ? s.sideOn : ''].filter(Boolean).join(' ')}
            >
              <span className={s.sideIcon}>
                <side.icon size={19} />
              </span>
              <span className={s.sideText}>
                <span className={s.sideTitle}>{side.title}</span>
                <span className={s.sideBody}>{side.body}</span>
              </span>
              <ArrowRight size={16} className={s.sideArrow} />
            </NavLink>
          ))}
        </nav>

        <div className={s.actions}>
          {/*
            "Post a listing" is for salons, and it starts SALON registration.
            The only principal that can be signed in to this app is a
            professional — a salon's session lives in the backoffice, on another
            host — so a signed-in visitor pressing this would be a job seeker
            being walked into a form for the other side of the market. Hidden
            rather than disabled: there is nothing wrong to explain, it simply
            is not addressed to them.
          */}
          {/*
            Registering, for whoever is reading.
            `/signup` bare rather than `?as=salon`: the fork there asks which
            side of the market you are on, and a menu shown to both cannot
            answer that on the visitor's behalf. The salon shortcut still exists
            where it belongs — the footer, under copy that argues for it.
          */}
          {!signedIn && (
            <Link className={s.primaryAction} to="/signup" onClick={onClose}>
              <Plus size={16} />
              {t('nav.signUp')}
            </Link>
          )}

          {/* Carries the primary weight once the salon CTA is gone: for someone
              signed in, their own profile IS the useful destination from here,
              and an actions block of two quiet rows reads as unfinished. */}
          <Link
            className={signedIn ? s.primaryAction : s.secondaryAction}
            to={signedIn ? '/account' : '/login'}
            onClick={onClose}
          >
            {signedIn ? <UserRound size={16} /> : <LogIn size={16} />}
            {signedIn ? t('nav.account') : t('nav.login')}
          </Link>

          {/*
            Sign out is here AS WELL AS on the settings screen.
            Settings is where it belongs; the menu is where people look for it —
            which is exactly why it stopped being findable when it moved out of
            the account rail. Styled as the quietest thing on the screen: it is
            the one action nobody opened a menu hoping to find, and it must
            never be the easiest to hit by accident.
          */}
          {signedIn && (
            <button
              type="button"
              className={s.signOut}
              onClick={() => {
                logout()
                onClose()
              }}
            >
              <LogOut size={16} />
              {t('account.signOutTitle')}
            </button>
          )}
        </div>

        <section className={s.section}>
          <h3 className={s.sectionTitle}>{t('nav.preferences')}</h3>
          <div className={s.prefs}>
            <div className={s.prefRow}>
              <span className={s.prefLabel}>{t('nav.language')}</span>
              <LanguageSwitcher />
            </div>
            <div className={s.prefRow}>
              <span className={s.prefLabel}>{t('nav.theme')}</span>
              <ThemeToggle isDark={isDark} onToggle={toggle} />
            </div>
          </div>
        </section>
      </div>
    </Drawer>
  )
}
