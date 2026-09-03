import type { ReactNode } from 'react'
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

  return (
    <header className={s.header}>
      <div className={s.inner}>
        <BoardLogo />

        {search && <div className={s.searchWide}>{search}</div>}

        <div className={s.actions}>
          <LanguageSwitcher />
          <ThemeToggle isDark={isDark} onToggle={toggle} />
        </div>
      </div>

      {search && <div className={s.searchNarrow}>{search}</div>}
    </header>
  )
}
