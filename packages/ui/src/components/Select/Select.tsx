import { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronDown, Check, Search } from 'lucide-react'
import s from './Select.module.scss'

export interface SelectOption {
  value: string
  label: string
  sub?: string
}

interface SelectProps {
  value: string
  onChange: (v: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  size?: 'sm' | 'md'
  className?: string
  /** Force-enable/disable the search box. Defaults to auto (on when > 6 options). */
  searchable?: boolean
  /** Placeholder for the search input. */
  searchPlaceholder?: string
}

export function Select({
  value, onChange, options, placeholder = 'Select…', disabled,
  size = 'md', className = '', searchable, searchPlaceholder = 'Search…',
}: SelectProps) {
  const [open, setOpen]       = useState(false)
  const [hovered, setHovered] = useState(0)
  const [query, setQuery]     = useState('')
  const ref       = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)
  const listRef   = useRef<HTMLDivElement>(null)
  const current   = options.find(o => o.value === value)

  // Auto-enable search for long lists; allow explicit override.
  const showSearch = searchable ?? options.length > 6

  // Filter options by query (matches label + sub).
  const filtered = useMemo(() => {
    if (!showSearch || !query.trim()) return options
    const q = query.trim().toLowerCase()
    return options.filter(o =>
      o.label.toLowerCase().includes(q) || o.sub?.toLowerCase().includes(q)
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

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setHovered(h => Math.min(filtered.length - 1, h + 1)) }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setHovered(h => Math.max(0, h - 1)) }
      if (e.key === 'Enter') {
        e.preventDefault()
        const opt = filtered[hovered]
        if (opt) { onChange(opt.value); setOpen(false) }
      }
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open, hovered, filtered, onChange])

  // Scroll the highlighted option into view.
  useEffect(() => {
    if (!open || !listRef.current) return
    const el = listRef.current.children[hovered] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [hovered, open])

  return (
    <div ref={ref} className={[s.wrap, className].filter(Boolean).join(' ')}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        className={[s.trigger, size === 'sm' ? s.sm : '', open ? s.open : ''].filter(Boolean).join(' ')}
      >
        <span className={current ? s.text : s.placeholder}>{current?.label ?? placeholder}</span>
        <ChevronDown size={12} className={[s.chevron, open ? s.rotated : ''].filter(Boolean).join(' ')} />
      </button>

      {open && (
        <div className={s.dropdown}>
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
        </div>
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
