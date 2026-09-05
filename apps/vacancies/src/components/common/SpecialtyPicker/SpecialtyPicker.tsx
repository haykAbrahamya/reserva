import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import type { SpecialtyGroup } from '@/api/types'
import { useLocalized, useT } from '@/i18n'
import { filterSpecialtyGroups } from '@/lib/areas'
import s from './SpecialtyPicker.module.scss'

interface Props {
  groups: SpecialtyGroup[]
  selected: string[]
  onChange: (next: string[]) => void
  /** Mirrors the API's own cap, so the form cannot offer what the server refuses. */
  max?: number
  loading?: boolean
}

/**
 * Pick your specialties, from sixty.
 *
 * The first version rendered all sixty as pills in a scrolling box. That is a
 * fine control for six options and a wall for sixty: the chosen ones were
 * invisible among the rest, the box swallowed the page on a phone, and finding
 * "colourist" meant reading the whole catalog.
 *
 * A combobox inverts it. Closed, it shows ONLY what you picked — which is the
 * information you actually want back, especially on a profile you are
 * reviewing rather than filling. Open, it is a search over the catalog.
 *
 * The search is `filterSpecialtyGroups`, the same function the board's filter
 * panel uses, which means it matches ALIASES: someone typing "կոլորիստ",
 * "барбер" or "nail" finds the right row without knowing the catalog's English
 * label. Re-implementing the search here would have quietly dropped that.
 */
export function SpecialtyPicker({ groups, selected, onChange, max = 12, loading }: Props) {
  const t = useT()
  const loc = useLocalized()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // Flat lookup so a selected chip can be labelled without walking the tree.
  const labels = useMemo(() => {
    const map = new Map<string, string>()
    for (const g of groups) {
      for (const sp of g.specialties) map.set(sp.key, loc(sp.roleName, sp.roleNameI18n))
    }
    return map
  }, [groups, loc])

  const filtered = useMemo(() => filterSpecialtyGroups(groups, query), [groups, query])

  // Close on an outside click or Escape — the two gestures people already try.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Focus the search on open: the panel exists to be typed into.
  useEffect(() => {
    if (open) searchRef.current?.focus()
  }, [open])

  const full = selected.length >= max
  const toggle = (key: string) => {
    if (selected.includes(key)) onChange(selected.filter((k) => k !== key))
    else if (!full) onChange([...selected, key])
  }

  return (
    <div className={s.root} ref={rootRef}>
      {/* Closed, the control IS the answer: the chips are what was chosen, and
          nothing else competes with them. */}
      {selected.length > 0 && (
        <div className={s.chips}>
          {selected.map((key) => (
            <span key={key} className={s.chip}>
              {labels.get(key) ?? key}
              <button
                type="button"
                className={s.chipRemove}
                onClick={() => onChange(selected.filter((k) => k !== key))}
                aria-label={`${t('specialist.remove')}: ${labels.get(key) ?? key}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <button
        type="button"
        className={s.trigger}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={loading}
      >
        <span className={s.triggerLabel}>
          {loading
            ? t('results.loading')
            : selected.length === 0
              ? t('specialist.pickSpecialties')
              : t('specialist.addMore')}
        </span>
        <ChevronDown className={[s.chevron, open ? s.chevronOpen : ''].filter(Boolean).join(' ')} size={16} />
      </button>

      {open && (
        <div className={s.panel} role="listbox" aria-multiselectable="true">
          <div className={s.searchRow}>
            <Search size={14} />
            <input
              ref={searchRef}
              className={s.search}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('specialist.searchSpecialties')}
            />
            {query && (
              <button type="button" className={s.searchClear} onClick={() => setQuery('')} aria-label={t('filters.clearOne')}>
                <X size={13} />
              </button>
            )}
          </div>

          <div className={s.list}>
            {filtered.length === 0 ? (
              <p className={s.empty}>{t('filters.nothingHere')}</p>
            ) : (
              filtered.map((g) => (
                <div key={g.key} className={s.group}>
                  <div className={s.groupTitle}>{loc(g.name, g.nameI18n)}</div>
                  {g.specialties.map((sp) => {
                    const on = selected.includes(sp.key)
                    return (
                      <button
                        key={sp.key}
                        type="button"
                        role="option"
                        aria-selected={on}
                        // Disabled only when the cap is reached AND this one is
                        // not already chosen — otherwise you could not deselect
                        // your way back under the limit.
                        disabled={!on && full}
                        className={[s.option, on ? s.optionOn : ''].filter(Boolean).join(' ')}
                        onClick={() => toggle(sp.key)}
                      >
                        <span className={s.box}>{on && <Check size={12} />}</span>
                        {loc(sp.roleName, sp.roleNameI18n)}
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>

          {full && <p className={s.capped}>{t('specialist.maxReached', { max })}</p>}
        </div>
      )}
    </div>
  )
}
