import { NavLink } from 'react-router-dom'
import { Briefcase, Users } from 'lucide-react'
import { useT } from '@/i18n'
import s from './MainNav.module.scss'

/**
 * The two sides of the market.
 *
 * This board is one product with two audiences pointed at each other: someone
 * looking for work, and a salon looking for someone. Those are not "pages" in a
 * list — they are the whole thing, and until now the second one was reachable
 * from a single link at the bottom of the footer, which is the same as not
 * existing.
 *
 * Rendered as a SEGMENTED control rather than as two links, because the two are
 * mutually exclusive views of one market and the control says so: it shows
 * where you are and that there is exactly one other place to be. Two plain
 * links say neither. It is the same pill-and-tint chrome the language switcher
 * and the filter chips already use, so it reads as part of this app rather than
 * as a navigation bar bolted on top of it.
 *
 * Neither label repeats the product name in the logo beside it. The pill there
 * already says «Աշխատատեղեր»; a nav item with the same word would make the two
 * look like the same control.
 */
export function MainNav() {
  const t = useT()

  const links = [
    { to: '/', end: true, icon: Briefcase, label: t('nav.jobs') },
    { to: '/specialists', icon: Users, label: t('nav.specialists') },
  ]

  return (
    <nav className={s.nav} aria-label={t('nav.primary')}>
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          className={({ isActive }) => [s.link, isActive ? s.on : ''].filter(Boolean).join(' ')}
        >
          <link.icon size={15} className={s.icon} />
          {link.label}
        </NavLink>
      ))}
    </nav>
  )
}
