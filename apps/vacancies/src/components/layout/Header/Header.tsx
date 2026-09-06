import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Menu, UserRound } from 'lucide-react'
import { useProfessionalAuth } from '@/auth/ProfessionalAuth'
import { useT } from '@/i18n'
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher/LanguageSwitcher'
import { BoardLogo } from '@/components/common/Logo/Logo'
import { ThemeToggle } from '@/components/common/ThemeToggle/ThemeToggle'
import { MainNav } from '@/components/layout/MainNav/MainNav'
import { MenuDrawer } from '@/components/layout/MenuDrawer/MenuDrawer'
import { useThemeContext } from '@/theme/ThemeProvider'
import s from './Header.module.scss'

interface Props {
  /** The search field, on the board only. A listing page passes nothing. */
  search?: ReactNode
}

/**
 * The sticky top bar.
 *
 * Rendered per route rather than once in the shell, because the board needs the
 * search field inside it and a listing page does not — and a search box that
 * filters a page you have already left is worse than none.
 *
 * ── Two states, one breakpoint ──
 *
 * At 1000px and up the bar carries everything: the brand, the two sides of the
 * market, the search, and the language / theme / account controls.
 *
 * Below that it carries the brand, the account, and a menu — and the rest moves
 * into the drawer. Not a stylistic choice: measured at 390px, the full set is
 * 392px of content in a 358px bar, which is how the market switch ended up with
 * nowhere to live and `/specialists` ended up reachable from one link at the
 * bottom of the footer. Moving the two PREFERENCES out (language, theme) is
 * what buys the room, and they lose nothing by it — in the drawer they get a
 * written label each instead of being a circle you have to press to identify.
 *
 * The account stays in the bar at every width. It is the one control that is
 * about the visitor rather than about the site, and burying "am I signed in?"
 * behind a menu is how someone ends up applying to a listing twice.
 */
export function Header({ search }: Props) {
  const { isDark, toggle } = useThemeContext()
  const t = useT()
  const { signedIn, loading } = useProfessionalAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className={s.header}>
      <div className={s.inner}>
        <BoardLogo />

        {/* Wide screens only; below 1000px it is the first thing in the menu. */}
        <div className={s.navWide}>
          <MainNav />
        </div>

        {search && <div className={s.searchWide}>{search}</div>}

        <div className={s.actions}>
          <div className={s.prefsWide}>
            <LanguageSwitcher />
            <ThemeToggle isDark={isDark} onToggle={toggle} />
          </div>

          {/*
            One entry point, two audiences — /login asks which, once, and
            remembers. It says "sign in" rather than naming either of them,
            because at this moment nobody knows who is clicking.

            Hidden while the stored session resolves — flashing "sign in" at
            someone who IS signed in, for the length of one request, is the kind
            of flicker that makes a site feel broken.
          */}
          {!loading &&
            (signedIn ? (
              <Link className={s.accountLink} to="/account" title={t('nav.account')}>
                <UserRound size={15} />
                <span className={s.accountLabel}>{t('nav.account')}</span>
              </Link>
            ) : (
              <>
                <Link className={s.accountLink} to="/login" title={t('nav.login')}>
                  <UserRound size={15} />
                  <span className={s.accountLabel}>{t('nav.login')}</span>
                </Link>

                {/*
                  Registering had no entry point at all: the header offered only
                  "sign in", and creating an account was two clicks deep inside
                  the page it led to. On a board whose whole professional side
                  is a profile you build, that is the wrong thing to hide.

                  `/signup` bare, not `?as=…` — the fork there asks which side
                  you are, which is the one question a header button cannot.
                */}
                <Link className={s.signUpLink} to="/signup">
                  {t('nav.signUp')}
                </Link>
              </>
            ))}

          <button
            type="button"
            className={s.menuButton}
            onClick={() => setMenuOpen(true)}
            aria-label={t('nav.menu')}
            aria-expanded={menuOpen}
          >
            <Menu size={18} />
          </button>
        </div>
      </div>

      {search && <div className={s.searchNarrow}>{search}</div>}

      <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </header>
  )
}
