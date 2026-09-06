import { useState, useRef, useEffect, useMemo, type ReactNode } from 'react'
import { ChevronDown, Check, Search } from 'lucide-react'
import { useAnchoredDropdown } from '../common/useAnchoredDropdown'
import s from './Select.module.scss'

export interface SelectOption {
  value: string
  label: string
  sub?: string
  /**
   * Extra terms the search matches but never renders — synonyms, translations,
   * a parent category. Lets someone find an option by the word they know
   * ("hairdresser", "парикмахер") without that word cluttering the list.
   */
  keywords?: string[]
  /**
   * A shorter form of `label`, shown on the TRIGGER only. Lets a compact
   * trigger read «ՀԱ» while the open list still reads «Հայերեն» — the value
   * that fits and the value that explains itself are not always the same
   * string.
   */
  short?: string
}

interface SelectProps {
  value: string
  onChange: (v: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  /**
   * Trigger geometry. `compact` is a 34px pill sized to sit in a header
   * alongside icon buttons — for a control that has no room for a field but
   * still wants this dropdown rather than a native one.
   */
  size?: 'sm' | 'md' | 'compact'
  /**
   * Leading glyph inside the trigger. Use it when the VALUE alone does not say
   * what the control is: «ՀԱ» in a header is a mystery, a globe beside it is a
   * language switcher.
   */
  icon?: ReactNode
  className?: string
  /** Force-enable/disable the search box. Defaults to auto (on when > 6 options). */
  searchable?: boolean
  /** Placeholder for the search input. */
  searchPlaceholder?: string
  /** Minimum dropdown-panel width (px). Use when the trigger is narrow (e.g. a
   *  compact control) so option labels aren't truncated. */
  panelMinWidth?: number
}

export function Select({
  value, onChange, options, placeholder = 'Select…', disabled,
  size = 'md', className = '', searchable, searchPlaceholder = 'Search…', panelMinWidth,
  icon,
}: SelectProps) {
  const { open, setOpen, triggerRef, renderPanel } = useAnchoredDropdown('trigger')
  const [hovered, setHovered] = useState(0)
  const [query, setQuery]     = useState('')
  const inputRef  = useRef<HTMLInputElement>(null)
  const listRef   = useRef<HTMLDivElement>(null)
  const current   = options.find(o => o.value === value)

  // Auto-enable search for long lists; allow explicit override.
  const showSearch = searchable ?? options.length > 6

  // Filter options by query (matches label + sub + hidden keywords).
  const filtered = useMemo(() => {
    if (!showSearch || !query.trim()) return options
    const q = query.trim().toLowerCase()
    return options.filter(o =>
      o.label.toLowerCase().includes(q) ||
      o.sub?.toLowerCase().includes(q) ||
      o.keywords?.some(k => k.toLowerCase().includes(q))
    )
  }, [options, query, showSearch])

  // Reset highlight + clear query when opening; focus the search box.
  useEffect(() => {
    if (!open) { setQuery(''); return }
    setHovered(Math.max(0, options.findIndex(o => o.value === value)))
    if (showSearch) requestAnimationFrame(() => inputRef.current?.focus())
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep highlight in range as the filtered list changes.
  useEffect(() => {
    setHovered(h => Math.min(Math.max(0, h), Math.max(0, filtered.length - 1)))
  }, [filtered.length])

  // Keyboard navigation while open.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setHovered(h => Math.min(filtered.length - 1, h + 1)) }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setHovered(h => Math.max(0, h - 1)) }
      if (e.key === 'Enter') {
        e.preventDefault()
        const opt = filtered[hovered]
        if (opt) { onChange(opt.value); setOpen(false) }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, hovered, filtered, onChange, setOpen])

  // Scroll the highlighted option into view.
  useEffect(() => {
    if (!open || !listRef.current) return
    const el = listRef.current.children[hovered] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [hovered, open])

  return (
    <div ref={triggerRef} className={[s.wrap, className].filter(Boolean).join(' ')}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        className={[
          s.trigger,
          size === 'sm' ? s.sm : '',
          size === 'compact' ? s.compact : '',
          open ? s.open : '',
        ].filter(Boolean).join(' ')}
      >
        {icon && <span className={s.leadIcon}>{icon}</span>}
        <span className={current ? s.text : s.placeholder}>
          {current ? (current.short ?? current.label) : placeholder}
        </span>
        <ChevronDown size={12} className={[s.chevron, open ? s.rotated : ''].filter(Boolean).join(' ')} />
      </button>

      {renderPanel(
        <>
          {showSearch && (
            <div className={s.searchBox}>
              <Search size={13} className={s.searchIcon} />
              <input
                ref={inputRef}
                className={s.searchInput}
                placeholder={searchPlaceholder}
                value={query}
                onChange={e => { setQuery(e.target.value); setHovered(0) }}
              />
            </div>
          )}

          <div className={s.list} ref={listRef}>
            {filtered.length === 0 ? (
              <div className={s.empty}>No matches found</div>
            ) : (
              filtered.map((opt, i) => (
                <div
                  key={opt.value}
                  onMouseEnter={() => setHovered(i)}
                  onClick={() => { onChange(opt.value); setOpen(false) }}
                  className={[
                    s.option,
                    opt.value === value ? s.selected : '',
                    i === hovered ? s.active : '',
                  ].filter(Boolean).join(' ')}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className={s.optLabel}>{highlight(opt.label, query, showSearch)}</div>
                    {opt.sub && <div className={s.optSub}>{highlight(opt.sub, query, showSearch)}</div>}
                  </div>
                  {opt.value === value && <Check size={12} className={s.check} />}
                </div>
              ))
            )}
          </div>
        </>,
        s.dropdown,
        panelMinWidth,
      )}
    </div>
  )
}

/** Bold the matching substring inside an option label. */
function highlight(text: string, query: string, enabled: boolean): React.ReactNode {
  const q = query.trim()
  if (!enabled || !q) return text
  const idx = text.toLowerCase().indexOf(q.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className={s.mark}>{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  )
}
