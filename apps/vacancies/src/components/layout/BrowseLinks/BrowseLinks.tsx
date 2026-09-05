import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { useI18n, useT } from '@/i18n'
import { useAutoScroll } from '@/lib/useAutoScroll'
import { LANDINGS, landingCopy, landingPath } from '@/lib/landings'
import s from './BrowseLinks.module.scss'

interface Props {
  /** Omit this slug — a page does not link to itself. */
  exclude?: string
  /** Drop the page gutter and the heading, for a column that has its own. */
  compact?: boolean
}

/**
 * Links to the keyword landing pages.
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
 * would be reachable from the sitemap and from nothing else, which search
 * engines treat as an orphan whatever the sitemap says.
 *
 * The first version grouped them into three headed columns, which is the
 * classic directory-footer look and read as a link farm bolted to the bottom of
 * the page. Same anchors, same text, but as one quiet row of pills — the shape
 * already used for the categories on a listing page — it reads as a related-
 * searches strip, which is a thing products have.
 */
export function BrowseLinks({ exclude, compact = false }: Props) {
  const t = useT()
  const { locale } = useI18n()

  const items = LANDINGS.filter((l) => l.slug !== exclude)

  /*
   * Drifts on its own where the row overflows — a phone. On a wide screen the
   * row wraps instead, so there is nothing to scroll and the hook no-ops
   * without needing to know about the breakpoint.
   */
  const track = useRef<HTMLDivElement>(null)
  useAutoScroll(track)

  if (!items.length) return null

  return (
    <nav
      className={[s.wrap, compact ? s.compact : ''].filter(Boolean).join(' ')}
      aria-label={t('browse.title')}
    >
      {!compact && <h2 className={s.title}>{t('browse.title')}</h2>}

      <div className={s.pills} ref={track}>
        {items.map((l) => (
          /* A real anchor, not a filter click — see the note above. The full
             phrase is the anchor text on purpose: "Barber" alone throws away
             the half that names what the page is about. */
          <Link key={l.slug} className={s.pill} to={landingPath(l.slug)}>
            {landingCopy(l, locale).h1}
          </Link>
        ))}
      </div>
    </nav>
  )
}
