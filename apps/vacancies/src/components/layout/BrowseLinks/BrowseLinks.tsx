import { Link } from 'react-router-dom'
import { useI18n, useT } from '@/i18n'
import {
  LANDING_KINDS,
  landingCopy,
  landingPath,
  landingsByKind,
  type Landing,
} from '@/lib/landings'
import s from './BrowseLinks.module.scss'

interface Props {
  /** Omit this slug — a page does not link to itself. */
  exclude?: string
  /** Heading level, so this can sit under an <h1> without breaking the outline. */
  compact?: boolean
}

/**
 * Links to the keyword landing pages, grouped by role, terms and place.
 *
 * This block is doing two jobs at once and is worth keeping for either.
 *
 * For a visitor it is the shortcut past the filter panel: "աթոռ վարձով" and
 * "աշխատանք Երևանում" are how people describe what they want, and tapping a
 * word is faster than opening a sheet and ticking two boxes.
 *
 * For a crawler it is the only path into those pages that exists. Every filter
 * on this board is a button — correctly, since filters rewrite a query string
 * rather than navigate — which means without real anchors the landing pages
 * would be reachable from the sitemap and from nothing else. A page nothing
 * links to is a page search engines treat as an orphan, whatever the sitemap
 * says about it.
 */
export function BrowseLinks({ exclude, compact = false }: Props) {
  const t = useT()
  const { locale } = useI18n()

  const label = (l: Landing) => landingCopy(l, locale).h1

  return (
    <nav className={[s.wrap, compact ? s.compact : ''].filter(Boolean).join(' ')} aria-label={t('browse.title')}>
      {!compact && <h2 className={s.title}>{t('browse.title')}</h2>}

      <div className={s.groups}>
        {LANDING_KINDS.map((kind) => {
          const items = landingsByKind(kind).filter((l) => l.slug !== exclude)
          if (!items.length) return null
          return (
            <div key={kind} className={s.group}>
              <h3 className={s.groupTitle}>{t(`browse.${kind}`)}</h3>
              <ul className={s.list}>
                {items.map((l) => (
                  <li key={l.slug}>
                    {/* A real anchor, not a filter click — see the note above. */}
                    <Link className={s.link} to={landingPath(l.slug)}>
                      {label(l)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </nav>
  )
}
