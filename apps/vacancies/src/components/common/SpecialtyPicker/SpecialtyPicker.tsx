import { useMemo } from 'react'
import type { SpecialtyGroup } from '@/api/types'
import { useLocalized, useT } from '@/i18n'
import { CatalogPicker, type PickerGroup } from '../CatalogPicker/CatalogPicker'

interface Props {
  groups: SpecialtyGroup[]
  selected: string[]
  onChange: (next: string[]) => void
  max?: number
  loading?: boolean
}

/**
 * "What do you do?" — over the specialty catalog.
 *
 * An adapter now, not a control: the combobox itself is CatalogPicker, which
 * this app also uses for areas. What is specific to specialties is only what is
 * below — that a group is a `SpecialtyGroup`, that a row's label is its
 * `roleName` (the job title, "Colourist") rather than its `name` (the service,
 * "Colouring"), and that `aliases` are searchable but never shown.
 *
 * The aliases are why the search finds anything: people type «կոլորիստ»,
 * "барбер" or "nail" without knowing the catalog's English label, and every one
 * of those strings is in the catalog already.
 */
export function SpecialtyPicker({ groups, selected, onChange, max = 12, loading }: Props) {
  const t = useT()
  const loc = useLocalized()

  const picker = useMemo<PickerGroup[]>(
    () =>
      groups.map((g) => ({
        key: g.key,
        label: loc(g.name, g.nameI18n),
        options: g.specialties.map((sp) => ({
          key: sp.key,
          label: loc(sp.roleName, sp.roleNameI18n),
          /*
           * Every string this row can be found by — the role and service names
           * in ALL languages, plus the aliases. Not just the localized label:
           * an Armenian interface must still find "barber" for someone whose
           * keyboard is in Latin, which is most people typing on a phone.
           */
          terms: [
            sp.roleName,
            sp.name,
            ...Object.values(sp.roleNameI18n ?? {}),
            ...Object.values(sp.nameI18n ?? {}),
            ...sp.aliases,
          ].filter(Boolean),
        })),
      })),
    [groups, loc],
  )

  return (
    <CatalogPicker
      groups={picker}
      selected={selected}
      onChange={onChange}
      max={max}
      loading={loading}
      emptyLabel={t('specialist.pickSpecialties')}
      addMoreLabel={t('specialist.addMore')}
      searchPlaceholder={t('specialist.searchSpecialties')}
      removeLabel={t('specialist.remove')}
    />
  )
}
