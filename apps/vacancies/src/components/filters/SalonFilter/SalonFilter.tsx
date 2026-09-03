import { useMemo, useState } from 'react'
import { Avatar } from '@reserva/ui'
import { resolveImageUrl } from '@/api/client'
import { useLocalized, useT } from '@/i18n'
import type { SalonFacet } from '@/api/types'
import { CheckRow } from '../CheckRow/CheckRow'
import { FilterSearch } from '../FilterSearch/FilterSearch'
import s from './SalonFilter.module.scss'

interface Props {
  salons: SalonFacet[]
  selected: string[]
  onChange: (next: string[]) => void
}

/** Search appears once the list is long enough to need it. */
const SEARCH_THRESHOLD = 6

/**
 * Filter by salon — the "salons I already know" cut.
 *
 * This is the filter people reach for when they have heard something about a
 * place, good or bad. It only ever lists salons with something live, and each
 * row carries the logo, because a salon is recognized by its mark long before
 * its legal name.
 *
 * The list is already ordered by how much each salon is hiring, so the busiest
 * are reachable without scrolling or searching.
 */
export function SalonFilter({ salons, selected, onChange }: Props) {
  const t = useT()
  const loc = useLocalized()
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return salons
    return salons.filter((salon) =>
      [salon.name, salon.nameI18n?.hy, salon.nameI18n?.ru, salon.nameI18n?.en].some((f) =>
        (f ?? '').toLowerCase().includes(q),
      ),
    )
  }, [salons, query])

  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((v) => v !== id) : [...selected, id])

  if (salons.length === 0) {
    return <p className={s.empty}>{t('filters.nothingHere')}</p>
  }

  return (
    <>
      {salons.length >= SEARCH_THRESHOLD && (
        <FilterSearch value={query} onChange={setQuery} placeholder={t('filters.salons.search')} />
      )}

      {filtered.length === 0 ? (
        <p className={s.empty}>{t('filters.salons.noMatch')}</p>
      ) : (
        <div className={s.list}>
          {filtered.map((salon) => {
            const name = loc(salon.name, salon.nameI18n)
            return (
              <CheckRow
                key={salon.id}
                label={name}
                state={selected.includes(salon.id) ? 'all' : 'none'}
                count={salon.count}
                onToggle={() => toggle(salon.id)}
                adornment={
                  <Avatar
                    name={name}
                    src={resolveImageUrl(salon.logoUrl) ?? undefined}
                    color={salon.accent}
                    size="sm"
                    className={s.avatar}
                  />
                }
              />
            )
          })}
        </div>
      )}
    </>
  )
}
