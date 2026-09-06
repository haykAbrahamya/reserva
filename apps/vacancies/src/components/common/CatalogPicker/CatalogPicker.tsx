import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import { useAnchoredDropdown } from '@reserva/ui'
import { useT } from '@/i18n'
import s from './CatalogPicker.module.scss'

/** One selectable row, already localized by whichever adapter built it. */
export interface PickerOption {
  key: string
  label: string
  /** Everything this row can be found by: names in every language, aliases. */
  terms: string[]
}

/** A heading with its rows — a specialty group, or a city and its districts. */
export interface PickerGroup {
  key: string
  label: string
  options: PickerOption[]
}

export interface CatalogPickerProps {
  groups: PickerGroup[]
  selected: string[]
  onChange: (next: string[]) => void
  /** Mirrors the API's own cap, so the form cannot offer what the server refuses. */
  max?: number
  loading?: boolean
  /** Trigger text when nothing is chosen yet. */
  emptyLabel: string
  /** Trigger text once something is. */
  addMoreLabel: string
  searchPlaceholder: string
  /** Accessible name for a chip's remove button, e.g. "Remove". */
  removeLabel: string
}

/**
 * Pick several things out of a long catalog.
 *
 * Closed, it shows ONLY what you picked — which is the information you actually
 * want back, especially on a profile you are reviewing rather than filling.
 * Open, it is a search over the whole catalog. That inversion is the point: the
 * first version of this rendered all sixty specialties as pills in a scrolling
 * box, which is a fine control for six options and a wall for sixty.
 *
 * Generic over the catalog because this app has two of them — specialties and
 * areas — with the same shape (headings, rows, aliases, a cap) and the same
 * interaction down to the last detail. The second one arrived when a profile
 * needed "where do you work", and the board's AreaFilter could not serve it:
 * that control hides areas with no live listings, which is right for a search
 * and wrong for a question about where somebody is willing to travel.
 *
 * Adapters localize and flatten their catalog into `PickerGroup[]`, including
 * the `terms` a row can be found by. Search is a plain substring test over
 * those, which is what lets someone type "Masiv" and find Ajapnyak, or
 * "барбер" and find the barber row, without this file knowing either catalog.
 *
 * The open panel is PORTALLED, via the same hook the design system's Select
 * uses. An absolutely-positioned panel is fine on a page and useless inside the
 * filter sheet, where the scrolling modal body clips it — and the sheet is
 * where most of this app's filtering happens.
 */
export function CatalogPicker({
  groups,
  selected,
  onChange,
  max = 12,
  loading,
  emptyLabel,
  addMoreLabel,
  searchPlaceholder,
  removeLabel,
}: CatalogPickerProps) {
  const t = useT()
  // `trigger` width, so the panel lines up with the control that opened it.
  const { open, setOpen, triggerRef, renderPanel } = useAnchoredDropdown('trigger')
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  // Flat lookup so a selected chip can be labelled without walking the tree.
  const labels = useMemo(() => {
    const map = new Map<string, string>()
    for (const g of groups) for (const o of g.options) map.set(o.key, o.label)
    return map
  }, [groups])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return groups
    return groups
      .map((g) => ({
        ...g,
        options: g.options.filter(
          (o) =>
            o.terms.some((term) => term.toLowerCase().includes(q)) ||
            // A group name matches all of its rows: typing "Hair" should open
            // the hair group rather than return nothing.
            g.label.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.options.length > 0)
  }, [groups, query])

  // Focus the search on open: the panel exists to be typed into. Outside-click
  // and Escape are the hook's, along with the positioning.
  useEffect(() => {
    if (!open) { setQuery(''); return }
    requestAnimationFrame(() => searchRef.current?.focus())
  }, [open])

  const full = selected.length >= max
  const toggle = (key: string) => {
    if (selected.includes(key)) onChange(selected.filter((k) => k !== key))
    else if (!full) onChange([...selected, key])
  }

  return (
    <div className={s.root} ref={triggerRef}>
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
                aria-label={`${removeLabel}: ${labels.get(key) ?? key}`}
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
          {loading ? t('results.loading') : selected.length === 0 ? emptyLabel : addMoreLabel}
        </span>
        <ChevronDown className={[s.chevron, open ? s.chevronOpen : ''].filter(Boolean).join(' ')} size={16} />
      </button>

      {renderPanel(
        <div className={s.panelInner} role="listbox" aria-multiselectable="true">
          <div className={s.searchRow}>
            <Search size={14} />
            <input
              ref={searchRef}
              className={s.search}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
            />
            {query && (
              <button
                type="button"
                className={s.searchClear}
                onClick={() => setQuery('')}
                aria-label={t('filters.clearOne')}
              >
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
                  <div className={s.groupTitle}>{g.label}</div>
                  {g.options.map((o) => {
                    const on = selected.includes(o.key)
                    return (
                      <button
                        key={o.key}
                        type="button"
                        role="option"
                        aria-selected={on}
                        // Disabled only when the cap is reached AND this one is
                        // not already chosen — otherwise you could not deselect
                        // your way back under the limit.
                        disabled={!on && full}
                        className={[s.option, on ? s.optionOn : ''].filter(Boolean).join(' ')}
                        onClick={() => toggle(o.key)}
                      >
                        <span className={s.box}>{on && <Check size={12} />}</span>
                        {o.label}
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>

          {full && <p className={s.capped}>{t('specialist.maxReached', { max })}</p>}
        </div>,
        s.panel,
        // Wider than a narrow trigger so option labels are not truncated; the
        // hook grows it leftward so the right edge stays put.
        260,
      )}
    </div>
  )
}
