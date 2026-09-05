import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { UserRound } from 'lucide-react'
import { useProfessionalAuth } from '@/auth/ProfessionalAuth'
import { useT } from '@/i18n'
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher/LanguageSwitcher'
import { BoardLogo } from '@/components/common/Logo/Logo'
import { ThemeToggle } from '@/components/common/ThemeToggle/ThemeToggle'
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
 * filters a page you have already left is worse than none. The theme comes from
 * context, so a page never carries props it does not otherwise use.
 *
 * Search sits HERE on desktop rather than in the filter panel: it is the
 * control people reach for before deciding to filter at all, and it has to stay
 * reachable after scrolling past twenty listings. Below 860px it moves to its
 * own row underneath — the same React node in both places, so the two
 * positions cannot hold different values or fall out of sync mid-keystroke.
 */
export function Header({ search }: Props) {
  const { isDark, toggle } = useThemeContext()
  const t = useT()
  const { signedIn, loading } = useProfessionalAuth()

  return (
    <header className={s.header}>
      <div className={s.inner}>
        <BoardLogo />

        {search && <div className={s.searchWide}>{search}</div>}

        <div className={s.actions}>
          <LanguageSwitcher />
          <ThemeToggle isDark={isDark} onToggle={toggle} />

          {/*
            One entry point, two audiences — /login asks which, once, and
            remembers. It says "sign in" rather than naming either of them,
            because at this moment nobody knows who is clicking.

            Last in the row, and the same 34px circle as the theme toggle below
            860px: as a bordered pill wedged between the brand and the language
            switcher it read as a stray control rather than as part of the set.

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
              <Link className={s.accountLink} to="/login" title={t('nav.login')}>
                <UserRound size={15} />
                <span className={s.accountLabel}>{t('nav.login')}</span>
              </Link>
            ))}
        </div>
      </div>

      {search && <div className={s.searchNarrow}>{search}</div>}
    </header>
  )
}
