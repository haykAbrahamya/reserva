import { useMemo } from 'react'
import type { AreaNode } from '@/api/types'
import { useLocalized, useT } from '@/i18n'
import { CatalogPicker, type PickerGroup } from '../CatalogPicker/CatalogPicker'

interface Props {
  tree: AreaNode[]
  selected: string[]
  onChange: (next: string[]) => void
  max?: number
  loading?: boolean
}

/**
 * "Where can you work?" — over the area tree.
 *
 * The same control as the specialty picker, adapted to a two-level tree: a city
 * is the group heading and its districts are the rows. A city with no children
 * (a town) becomes a group of one containing itself, so it stays selectable
 * rather than being a heading nobody can click.
 *
 * Deliberately NOT the board's AreaFilter, which drops areas that have no live
 * listings. That is right for a search — an empty area is not an option anyone
 * is wondering about — and wrong for this question: somebody willing to work in
 * Vanadzor should be able to say so on a week when Vanadzor has no listings.
 */
export function AreaPicker({ tree, selected, onChange, max = 12, loading }: Props) {
  const t = useT()
  const loc = useLocalized()

  const picker = useMemo<PickerGroup[]>(
    () =>
      tree.map((city) => {
        const label = loc(city.name, city.nameI18n)
        const terms = (node: AreaNode | AreaNode['children'][number]) =>
          [node.name, ...Object.values(node.nameI18n ?? {}), ...(node.aliases ?? [])].filter(Boolean)

        return {
          key: city.key,
          label,
          options: city.children.length
            ? city.children.map((d) => ({
                key: d.key,
                label: loc(d.name, d.nameI18n),
                // The city's own names are searchable terms of every district:
                // typing "Yerevan" should reveal its districts, not nothing.
                terms: [...terms(d), ...terms(city)],
              }))
            : [{ key: city.key, label, terms: terms(city) }],
        }
      }),
    [tree, loc],
  )

  return (
    <CatalogPicker
      groups={picker}
      selected={selected}
      onChange={onChange}
      max={max}
      loading={loading}
      emptyLabel={t('specialist.pickAreas')}
      addMoreLabel={t('specialist.addMoreAreas')}
      searchPlaceholder={t('specialist.searchAreas')}
      removeLabel={t('specialist.remove')}
    />
  )
}
