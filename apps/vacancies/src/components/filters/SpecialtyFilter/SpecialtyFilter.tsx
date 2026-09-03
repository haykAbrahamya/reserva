import { useMemo, useState } from 'react'
import { useLocalized, useT } from '@/i18n'
import { facetMap, filterSpecialtyGroups } from '@/lib/areas'
import type { Facet, SpecialtyGroup } from '@/api/types'
import { CheckRow } from '../CheckRow/CheckRow'
import { FilterSearch } from '../FilterSearch/FilterSearch'
import s from './SpecialtyFilter.module.scss'

interface Props {
  groups: SpecialtyGroup[]
  specialtyCounts: Facet[]
  groupCounts: Facet[]
  selectedSpecialties: string[]
  selectedGroups: string[]
  onChangeSpecialties: (next: string[]) => void
  onChangeGroups: (next: string[]) => void
}

/**
 * What kind of work.
 *
 * Groups are selectable in their own right, not just headings. "Hair" is the
 * broad cut most people actually want — a professional looking for colour work
 * would rather tick one box than nine — and the group filter reaches listings
 * whose exact specialty they would not have thought to tick.
 *
 * A group and its specialties are separate filters on the wire (`group=` and
 * `specialty=`), so ticking the group does NOT expand into nine keys. That
 * keeps a shared URL short and keeps meaning: "anything in hair" survives a
 * salon adding a tenth hair specialty tomorrow, where a frozen list of nine
 * would not.
 *
 * The alias search matters as much here as for places: people search for
 * "колорист" or "барбер", not for the catalog's English label.
 */
export function SpecialtyFilter({
  groups,
  specialtyCounts,
  groupCounts,
  selectedSpecialties,
  selectedGroups,
  onChangeSpecialties,
  onChangeGroups,
}: Props) {
  const t = useT()
  const loc = useLocalized()
  const [query, setQuery] = useState('')

  const countOf = useMemo(() => facetMap(specialtyCounts), [specialtyCounts])
  const groupCountOf = useMemo(() => facetMap(groupCounts), [groupCounts])
  const filtered = useMemo(() => filterSpecialtyGroups(groups, query), [groups, query])

  // Only groups with live listings, and within them only specialties that have
  // some. A taxonomy of sixty roles where four are hiring is a wall to scroll
  // past, not a filter.
  // Busiest group first, busiest role first within it — same reasoning as the
  // area list: the taxonomy's own order is alphabetical-ish and buries the
  // answer most people are looking for.
  const visible = useMemo(
    () =>
      filtered
        .map((g) => ({
          group: g,
          items: g.specialties
            .filter((sp) => (countOf.get(sp.key) ?? 0) > 0)
            .sort((a, b) => (countOf.get(b.key) ?? 0) - (countOf.get(a.key) ?? 0)),
        }))
        .filter(({ items }) => items.length > 0)
        .sort(
          (a, b) =>
            (groupCountOf.get(b.group.key) ?? 0) - (groupCountOf.get(a.group.key) ?? 0),
        ),
    [filtered, countOf, groupCountOf],
  )

  const toggleGroup = (key: string) =>
    onChangeGroups(
      selectedGroups.includes(key)
        ? selectedGroups.filter((k) => k !== key)
        : [...selectedGroups, key],
    )

  const toggleSpecialty = (key: string) =>
    onChangeSpecialties(
      selectedSpecialties.includes(key)
        ? selectedSpecialties.filter((k) => k !== key)
        : [...selectedSpecialties, key],
    )

  if (visible.length === 0) {
    return (
      <>
        <FilterSearch
          value={query}
          onChange={setQuery}
          placeholder={t('filters.specialty.search')}
        />
        <p className={s.empty}>
          {query ? t('filters.specialty.noMatch') : t('filters.nothingHere')}
        </p>
      </>
    )
  }

  return (
    <>
      <FilterSearch value={query} onChange={setQuery} placeholder={t('filters.specialty.search')} />

      <div className={s.list}>
        {visible.map(({ group, items }) => (
          <div key={group.key} className={s.group}>
            <CheckRow
              label={loc(group.name, group.nameI18n)}
              state={selectedGroups.includes(group.key) ? 'all' : 'none'}
              count={groupCountOf.get(group.key) ?? 0}
              onToggle={() => toggleGroup(group.key)}
            />

            <div className={s.items}>
              {items.map((sp) => (
                <CheckRow
                  key={sp.key}
                  // The ROLE name, not the name of the work: a vacancy is about
                  // a person ("Colourist"), not a service ("Hair colouring").
                  label={loc(sp.roleName, sp.roleNameI18n)}
                  state={
                    selectedGroups.includes(group.key) || selectedSpecialties.includes(sp.key)
                      ? 'all'
                      : 'none'
                  }
                  count={countOf.get(sp.key) ?? 0}
                  indented
                  onToggle={() => toggleSpecialty(sp.key)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
