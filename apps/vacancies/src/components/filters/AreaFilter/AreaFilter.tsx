import { useMemo, useState } from 'react'
import { useLocalized, useT } from '@/i18n'
import { citySelection, facetMap, filterAreaTree, toggleCity, toggleDistrict } from '@/lib/areas'
import type { AreaNode, Facet } from '@/api/types'
import { CheckRow } from '../CheckRow/CheckRow'
import { FilterSearch } from '../FilterSearch/FilterSearch'
import s from './AreaFilter.module.scss'

interface Props {
  tree: AreaNode[]
  counts: Facet[]
  selected: string[]
  onChange: (next: string[]) => void
}

/**
 * Where the work is.
 *
 * A two-level tree, because Armenia is one city with twelve districts plus
 * everywhere else — flattening that into a list of sixty checkboxes would bury
 * "Yerevan" among towns with one listing each, and a district name on its own
 * is ambiguous anyway (there is an "Arabkir Branch" in Vanadzor).
 *
 * The search box is the reason the aliases exist in the catalog: people type
 * "Masiv", not "Ajapnyak", and "Ленинакан" rather than "Gyumri". Matching runs
 * over every alias in every language, in the browser, because the whole catalog
 * is already here.
 */
export function AreaFilter({ tree, counts, selected, onChange }: Props) {
  const t = useT()
  const loc = useLocalized()
  const [query, setQuery] = useState('')

  const countOf = useMemo(() => facetMap(counts), [counts])
  const filtered = useMemo(() => filterAreaTree(tree, query), [tree, query])

  /*
   * Only places with work, ordered by how much of it there is.
   *
   * Two decisions, both about not wasting the reader's attention:
   *
   * Empty places are DROPPED, not greyed out. An area with nothing live is not
   * an option anyone is wondering about — it is noise in a catalogue of sixty.
   * (Pay types and schedules are greyed instead, because those are short fixed
   * lists where a missing row would be conspicuous.)
   *
   * And the order is by COUNT, not by the catalogue's own sort. Yerevan holds
   * most of the board, so a taxonomy order that lists three provinces with one
   * listing each above it buries the answer almost everyone wants beneath the
   * ones almost nobody does.
   */
  const visible = useMemo(
    () =>
      filtered
        .map((node) => ({
          node,
          children: node.children
            .filter((c) => (countOf.get(c.key) ?? 0) > 0)
            .sort((a, b) => (countOf.get(b.key) ?? 0) - (countOf.get(a.key) ?? 0)),
        }))
        .filter(({ node, children }) => (countOf.get(node.key) ?? 0) > 0 || children.length > 0)
        .sort((a, b) => (countOf.get(b.node.key) ?? 0) - (countOf.get(a.node.key) ?? 0)),
    [filtered, countOf],
  )

  if (visible.length === 0) {
    return (
      <>
        <FilterSearch value={query} onChange={setQuery} placeholder={t('filters.location.search')} />
        <p className={s.empty}>
          {query ? t('filters.location.noMatch') : t('filters.nothingHere')}
        </p>
      </>
    )
  }

  return (
    <>
      <FilterSearch value={query} onChange={setQuery} placeholder={t('filters.location.search')} />

      <div className={s.tree}>
        {visible.map(({ node, children }) => {
          const state = citySelection(node, selected)
          const cityName = loc(node.name, node.nameI18n)

          return (
            <div key={node.key} className={s.city}>
              <CheckRow
                label={cityName}
                state={state}
                count={countOf.get(node.key) ?? 0}
                onToggle={() => onChange(toggleCity(node, selected))}
              />

              {children.length > 0 && (
                <div className={s.districts}>
                  {children.map((child) => (
                    <CheckRow
                      key={child.key}
                      label={loc(child.name, child.nameI18n)}
                      // A district is "all" or "none" — it has nothing under it.
                      // Selecting the whole city implies every district in it.
                      state={
                        selected.includes(node.key) || selected.includes(child.key) ? 'all' : 'none'
                      }
                      count={countOf.get(child.key) ?? 0}
                      indented
                      onToggle={() => onChange(toggleDistrict(node, child.key, selected))}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
