import { useMemo } from 'react'
import { Chip } from '@reserva/ui'
import { useI18n, useLocalized } from '@/i18n'
import { facetMap } from '@/lib/areas'
import type { BoardMeta } from '@/api/types'
import type { UseFilters } from '@/lib/useFilters'
import { HeroMotif } from './HeroMotif'
import { HeroPlaces } from './HeroPlaces'
import s from './BoardHero.module.scss'

interface Props {
  meta: BoardMeta | null
  loading: boolean
  control: UseFilters
}

/** How many shortcut groups the hero offers before it becomes a filter panel. */
const QUICK_GROUPS = 5

/**
 * The top of the board.
 *
 * One editorial line, three honest figures, and a row of one-tap shortcuts.
 * Deliberately NOT a marketing hero: everyone who lands here already wants what
 * this page offers, so a full-height gradient with a value proposition would be
 * a screen of scrolling placed between them and the listings.
 *
 * The figures are the substance. "29 listings · 9 places · 9 salons" tells
 * someone whether this board is worth their time in a way no amount of copy
 * can, and it is the one thing on the page that cannot be written in advance.
 */
export function BoardHero({ meta, loading, control }: Props) {
  const { t, tp } = useI18n()
  const loc = useLocalized()
  const { filters, toggle } = control

  const quick = useMemo(() => {
    if (!meta) return []
    const counts = facetMap(meta.groups)
    return meta.specialtyGroups
      .map((g) => ({ group: g, count: counts.get(g.key) ?? 0 }))
      .filter(({ count }) => count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, QUICK_GROUPS)
  }, [meta])

  // Counted as CITIES, not as every administrative row: "9 places" should mean
  // nine towns a person could travel to, not nine district records.
  const placeCount = useMemo(() => {
    if (!meta) return 0
    const withWork = new Set(meta.areas.map((a) => a.key))
    return meta.areaTree.filter(
      (node) => withWork.has(node.key) || node.children.some((c) => withWork.has(c.key)),
    ).length
  }, [meta])

  /*
   * The figure and its noun are separate strings.
   *
   * Two reasons, both load-bearing. The digits are set in the mono face, which
   * has no Armenian or Cyrillic — a single "29 listings" string would render
   * the word as fallback junk. And the noun still has to agree with the count
   * ("1 listing" / "29 listings"), which is what `tp` selects; Armenian does
   * not inflect after a numeral, so both of its forms are identical, and that
   * is a fact about Armenian rather than a missing translation.
   */
  const stats = meta
    ? [
        { key: 'listings', value: meta.total, label: tp('hero.statListings', meta.total) },
        { key: 'places', value: placeCount, label: tp('hero.statPlaces', placeCount) },
        {
          key: 'salons',
          value: meta.salons.length,
          label: tp('hero.statSalons', meta.salons.length),
        },
      ]
    : []

  return (
    <section className={s.hero}>
      <HeroMotif />

      <div className={s.inner}>
        <div className={s.top}>
          <div className={s.text}>
            <h1 className={s.title}>{t('hero.title')}</h1>
            <p className={s.subtitle}>{t('hero.subtitle')}</p>

            {/* Inside the left column on purpose. Placed after `.top`, the
                grid row stretched to the height of the taller right-hand
                panel and left the difference as a void under the subtitle. */}
            <dl className={s.stats}>
              {loading && !meta ? (
                <span className={s.statsLoading}>{t('hero.countLoading')}</span>
              ) : (
                stats.map((stat) => (
                  <div key={stat.key} className={s.stat}>
                    <dt className={s.statValue}>{stat.value}</dt>
                    <dd className={s.statLabel}>{stat.label}</dd>
                  </div>
                ))
              )}
            </dl>
          </div>

          {/* The right-hand column. Not decoration: "is there anything near
              me?" is the question that comes before "what does it pay", and
              four proportional bars answer it faster than any filter. */}
          {meta && <HeroPlaces meta={meta} control={control} />}
        </div>

        {quick.length > 0 && (
          <div className={s.quick}>
            <span className={s.quickLabel}>{t('hero.popular')}</span>
            <div className={s.quickChips}>
              {quick.map(({ group, count }) => (
                <Chip
                  key={group.key}
                  label={loc(group.name, group.nameI18n)}
                  count={count}
                  selected={filters.group.includes(group.key)}
                  onClick={() => toggle('group', group.key)}
                  size="sm"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
