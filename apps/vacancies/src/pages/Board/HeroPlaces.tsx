import { useMemo } from 'react'
import { useLocalized, useT } from '@/i18n'
import { facetMap } from '@/lib/areas'
import type { BoardMeta } from '@/api/types'
import type { UseFilters } from '@/lib/useFilters'
import s from './HeroPlaces.module.scss'

interface Props {
  meta: BoardMeta
  control: UseFilters
}

/** Four rows is a glance; six is a list you have to read. */
const TOP_PLACES = 4

/**
 * Where the work is, as the hero's right-hand column.
 *
 * The hero was a wide band with text on the left and nothing on the right,
 * which is the emptiness that makes a page read as unfinished rather than as
 * restrained. The fix is not decoration — it is putting the most useful thing a
 * first-time visitor could see in that space.
 *
 * That thing is the distribution. "Is there anything near me?" is the question
 * before "what does it pay", and answering it with four proportional bars is
 * faster than any filter interaction. Each row is also a one-tap filter, so the
 * summary is the shortcut.
 *
 * Counts come from the board's own facets, so this can never advertise a place
 * with nothing in it.
 */
export function HeroPlaces({ meta, control }: Props) {
  const t = useT()
  const loc = useLocalized()
  const { filters, patch } = control

  const rows = useMemo(() => {
    const countOf = facetMap(meta.areas)
    return meta.areaTree
      .map((node) => ({
        key: node.key,
        label: loc(node.name, node.nameI18n),
        // The city total, which already includes its districts (the API rolls a
        // district's listing up into its parent).
        count: countOf.get(node.key) ?? 0,
      }))
      .filter((r) => r.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, TOP_PLACES)
  }, [meta, loc])

  if (rows.length < 2) return null

  // Bars are scaled against the LARGEST row, not against the board total: with
  // Yerevan holding two thirds of everything, scaling to the total would leave
  // the other three as invisible slivers.
  const peak = Math.max(...rows.map((r) => r.count))

  return (
    <aside className={s.panel} aria-label={t('hero.placesTitle')}>
      <h2 className={s.title}>{t('hero.placesTitle')}</h2>

      <ul className={s.list}>
        {rows.map((row) => {
          const selected = filters.area.includes(row.key)
          return (
            <li key={row.key}>
              <button
                type="button"
                className={[s.row, selected ? s.on : ''].filter(Boolean).join(' ')}
                onClick={() =>
                  patch({
                    area: selected
                      ? filters.area.filter((k) => k !== row.key)
                      : [...filters.area, row.key],
                  })
                }
                aria-pressed={selected}
              >
                <span className={s.name}>{row.label}</span>
                <span className={s.count}>{row.count}</span>
                <span className={s.bar} aria-hidden="true">
                  <span className={s.fill} style={{ width: `${(row.count / peak) * 100}%` }} />
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
