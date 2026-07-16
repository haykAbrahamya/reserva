import { useMemo, useState } from 'react'
import { ChevronDown, Check, Search, X } from 'lucide-react'
import type { Service } from '@/types'
import { useI18n } from '@/i18n'
import s from './ServicePicker.module.scss'

interface Props {
  /** Full catalog of assignable services. */
  services: Service[]
  /** Currently-selected service ids. */
  selected: string[]
  onChange: (next: string[]) => void
}

const UNCATEGORIZED = '__uncat__'

/**
 * Assign services to a specialist, grouped by category. Each category is a
 * collapsible row showing an "N/M selected" count + a select-all checkbox;
 * expand to toggle individual services. A search filters across names, and a
 * global select-all/clear row sits on top. Scales cleanly to 30+ services where
 * a flat chip cloud becomes unusable. Keeps the plain `string[]` contract.
 */
export function ServicePicker({ services, selected, onChange }: Props) {
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<Record<string, boolean>>({})

  const selectedSet = useMemo(() => new Set(selected), [selected])

  // Group active services by category (case-insensitive display uses base text —
  // the operator authored these, so base names are the right thing to show).
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const map = new Map<string, { label: string; items: Service[] }>()
    for (const svc of services) {
      if (q && !svc.name.toLowerCase().includes(q) && !(svc.category ?? '').toLowerCase().includes(q)) continue
      const key = svc.category?.trim() || UNCATEGORIZED
      const label = svc.category?.trim() || t('specialists.picker.uncategorized')
      if (!map.has(key)) map.set(key, { label, items: [] })
      map.get(key)!.items.push(svc)
    }
    return Array.from(map.entries())
      .map(([key, g]) => ({ key, ...g }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [services, query, t])

  const toggle = (id: string) =>
    onChange(selectedSet.has(id) ? selected.filter((x) => x !== id) : [...selected, id])

  const setMany = (ids: string[], on: boolean) => {
    const next = new Set(selected)
    for (const id of ids) (on ? next.add(id) : next.delete(id))
    onChange([...next])
  }

  const totalSelected = selected.length
  const allIds = useMemo(() => services.map((sv) => sv.id), [services])
  const allSelected = totalSelected > 0 && allIds.every((id) => selectedSet.has(id))

  return (
    <div className={s.wrap}>
      {/* Search + global actions */}
      <div className={s.toolbar}>
        <div className={s.search}>
          <Search size={15} className={s.searchIcon} />
          <input
            className={s.searchInput}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('specialists.picker.searchPlaceholder')}
          />
          {query && (
            <button type="button" className={s.searchClear} onClick={() => setQuery('')} aria-label={t('common.clear')}>
              <X size={14} />
            </button>
          )}
        </div>
        <button
          type="button"
          className={s.allBtn}
          onClick={() => setMany(allIds, !allSelected)}
        >
          {allSelected ? t('specialists.picker.clearAll') : t('specialists.picker.selectAll')}
        </button>
      </div>

      <div className={s.count}>{t('specialists.picker.selectedCount', { count: totalSelected })}</div>

      {/* Category groups */}
      <div className={s.groups}>
        {groups.length === 0 && <div className={s.empty}>{t('specialists.picker.noResults')}</div>}
        {groups.map((g) => {
          const ids = g.items.map((i) => i.id)
          const sel = ids.filter((id) => selectedSet.has(id)).length
          const allInGroup = sel === ids.length
          // Auto-open when searching (results should be visible) or user expanded.
          const isOpen = open[g.key] ?? !!query.trim()
          return (
            <div key={g.key} className={s.group}>
              <div className={s.groupHead}>
                <button
                  type="button"
                  className={s.groupToggle}
                  onClick={() => setOpen((o) => ({ ...o, [g.key]: !isOpen }))}
                  aria-expanded={isOpen}
                >
                  <ChevronDown size={15} className={[s.chevron, isOpen ? s.chevronOpen : ''].filter(Boolean).join(' ')} />
                  <span className={s.groupLabel}>{g.label}</span>
                  <span className={[s.groupCount, sel > 0 ? s.groupCountOn : ''].filter(Boolean).join(' ')}>
                    {sel}/{ids.length}
                  </span>
                </button>
                <button
                  type="button"
                  className={[s.groupAll, allInGroup ? s.groupAllOn : ''].filter(Boolean).join(' ')}
                  onClick={() => setMany(ids, !allInGroup)}
                >
                  {allInGroup ? t('specialists.picker.clearGroup') : t('specialists.picker.selectGroup')}
                </button>
              </div>

              {isOpen && (
                <div className={s.chips}>
                  {g.items.map((svc) => {
                    const on = selectedSet.has(svc.id)
                    return (
                      <button
                        key={svc.id}
                        type="button"
                        className={[s.chip, on ? s.chipOn : ''].filter(Boolean).join(' ')}
                        onClick={() => toggle(svc.id)}
                      >
                        {on && <Check size={13} className={s.chipCheck} />}
                        {svc.name}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
