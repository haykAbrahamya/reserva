import { useState, useRef, useEffect, useMemo, type ReactNode } from 'react'
import { ChevronDown, Check, Search } from 'lucide-react'
import { useAnchoredDropdown } from '../common/useAnchoredDropdown'
import { highlight, type SelectOption } from '../Select/Select'
import sel from '../Select/Select.module.scss'
import s from './MultiSelect.module.scss'

interface MultiSelectProps {
  values: string[]
  onChange: (values: string[]) => void
  options: SelectOption[]
  /** Trigger text while nothing is picked — for a filter, the "all" state. */
  placeholder?: string
  disabled?: boolean
  /** Leading glyph inside the trigger, as on `Select`. */
  icon?: ReactNode
  className?: string
  /** Force-enable/disable the search box. Defaults to auto (on when > 6 options). */
  searchable?: boolean
  searchPlaceholder?: string
  /** Footer action that unticks everything. */
  clearLabel?: string
  emptyLabel?: string
  /** Minimum dropdown-panel width (px), as on `Select`. */
  panelMinWidth?: number
}

/**
 * `Select`'s many-values sibling: same trigger, same anchored panel, same
 * search — but each option is a checkbox and the panel stays open while you
 * tick. The trigger names the first pick and counts the rest («Hair +2»), so
 * it keeps one line however much is chosen. Picks are kept in OPTION order,
 * never click order, so the trigger never reshuffles.
 */
export function MultiSelect({
  values, onChange, options, placeholder = 'Select…', disabled, icon, className = '',
  searchable, searchPlaceholder = 'Search…', clearLabel = 'Clear', emptyLabel = 'No matches found',
  panelMinWidth,
}: MultiSelectProps) {
  const { open, setOpen, triggerRef, renderPanel } = useAnchoredDropdown('trigger')
  const [hovered, setHovered] = useState(0)
  const [query, setQuery]     = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef  = useRef<HTMLDivElement>(null)

  const picked   = useMemo(() => new Set(values), [values])
  const selected = options.filter(o => picked.has(o.value))
  const showSearch = searchable ?? options.length > 6

  const filtered = useMemo(() => {
    if (!showSearch || !query.trim()) return options
    const q = query.trim().toLowerCase()
    return options.filter(o =>
      o.label.toLowerCase().includes(q) ||
      o.sub?.toLowerCase().includes(q) ||
      o.keywords?.some(k => k.toLowerCase().includes(q))
    )
  }, [options, query, showSearch])

  const toggle = (value: string) => {
    const next = picked.has(value) ? values.filter(v => v !== value) : [...values, value]
    // Option order, not click order — the trigger summary stays stable.
    onChange(options.filter(o => next.includes(o.value)).map(o => o.value))
  }

  // Fresh search + highlight on open; focus the search box when there is one.
  useEffect(() => {
    if (!open) { setQuery(''); return }
    setHovered(0)
    if (showSearch) requestAnimationFrame(() => inputRef.current?.focus())
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setHovered(h => Math.min(Math.max(0, h), Math.max(0, filtered.length - 1)))
  }, [filtered.length])

  // Keyboard: ↑/↓ move, Enter ticks — and the panel stays open for the next pick.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setHovered(h => Math.min(filtered.length - 1, h + 1)) }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setHovered(h => Math.max(0, h - 1)) }
      if (e.key === 'Enter') {
        e.preventDefault()
        const opt = filtered[hovered]
        if (opt) toggle(opt.value)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }) // re-bound every render: `toggle` closes over the current values

  useEffect(() => {
    if (!open || !listRef.current) return
    const el = listRef.current.children[hovered] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [hovered, open])

  return (
    <div ref={triggerRef} className={[sel.wrap, className].filter(Boolean).join(' ')}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen(o => !o)}
        className={[sel.trigger, open ? sel.open : ''].filter(Boolean).join(' ')}
      >
        {icon && <span className={sel.leadIcon}>{icon}</span>}
        {selected.length === 0 ? (
          <span className={[sel.placeholder, s.summary].join(' ')}><span className={s.first}>{placeholder}</span></span>
        ) : (
          <span className={s.summary}>
            <span className={s.first}>{selected[0].short ?? selected[0].label}</span>
            {selected.length > 1 && <span className={s.more}>+{selected.length - 1}</span>}
          </span>
        )}
        <ChevronDown size={12} className={[sel.chevron, open ? sel.rotated : ''].filter(Boolean).join(' ')} />
      </button>

      {renderPanel(
        <>
          {showSearch && (
            <div className={sel.searchBox}>
              <Search size={13} className={sel.searchIcon} />
              <input
                ref={inputRef}
                className={sel.searchInput}
                placeholder={searchPlaceholder}
                value={query}
                onChange={e => { setQuery(e.target.value); setHovered(0) }}
              />
            </div>
          )}

          <div className={sel.list} ref={listRef} role="listbox" aria-multiselectable="true">
            {filtered.length === 0 ? (
              <div className={sel.empty}>{emptyLabel}</div>
            ) : (
              filtered.map((opt, i) => {
                const on = picked.has(opt.value)
                return (
                  <div
                    key={opt.value}
                    role="option"
                    aria-selected={on}
                    onMouseEnter={() => setHovered(i)}
                    onClick={() => toggle(opt.value)}
                    className={[sel.option, s.option, on ? s.on : '', i === hovered ? sel.active : ''].filter(Boolean).join(' ')}
                  >
                    <span className={s.box} aria-hidden>{on && <Check size={11} strokeWidth={3} />}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className={[sel.optLabel, s.label].join(' ')}>{highlight(opt.label, query, showSearch)}</div>
                      {opt.sub && <div className={sel.optSub}>{highlight(opt.sub, query, showSearch)}</div>}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {values.length > 0 && (
            <div className={s.footer}>
              <button type="button" className={s.clear} onClick={() => onChange([])}>{clearLabel}</button>
            </div>
          )}
        </>,
        sel.dropdown,
        panelMinWidth,
      )}
    </div>
  )
}
