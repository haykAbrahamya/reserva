import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { CalendarDays, Check, ChevronDown } from 'lucide-react'
import { Button, Toggle } from '@/components/ui'
import { fmtInt } from './format'
import {
  RANGE_PRESETS, customRangeError, daysInclusive, fmtSpan, resolveRange,
  type PresetKey, type RangeKey, type ResolvedRange,
} from './range'
import s from './Analytics.module.scss'

/** Menu names for the presets — the trigger says the same as the menu. */
const PRESET_NAME: Record<PresetKey, string> = {
  today: 'Today',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  all: 'All time',
}

/**
 * What every tab is looking at, as ONE compact button — "Last 30 days ·
 * 8 Sep – 7 Oct 2026" — that opens a menu: the presets, each with the days it
 * covers, a custom From / To range, and whether staff visits count. A single
 * control rather than a strip of pills, so it can't be mistaken for the section
 * tabs beside it; the trigger always says which days are on screen, and shows a
 * "Staff" tag whenever staff visits are included.
 */
export function RangeControl({ value, range, first, today, onPreset, onCustom, includeStaff, onIncludeStaffChange }: {
  value: RangeKey
  /** Null while All waits for the first recorded day. */
  range: ResolvedRange | null
  /** First day with data (null: none yet; undefined: still loading). */
  first?: string | null
  today: string
  onPreset: (key: PresetKey) => void
  onCustom: (from: string, to: string) => void
  includeStaff: boolean
  onIncludeStaffChange: (on: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const panelId = useId()

  const close = (refocus: boolean) => {
    setOpen(false)
    if (refocus) triggerRef.current?.focus()
  }

  // Outside click and Escape close the menu; Escape hands focus back to the
  // trigger so keyboard users don't lose their place.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') close(true)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Opening puts focus on the current choice (custom → its From field).
  useEffect(() => {
    if (!open || value === 'custom') return
    itemRefs.current[RANGE_PRESETS.findIndex((p) => p.key === value)]?.focus()
  }, [open, value])

  const onMenuKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const items = itemRefs.current.filter(Boolean) as HTMLButtonElement[]
    const at = items.indexOf(document.activeElement as HTMLButtonElement)
    if (at < 0) return
    const next =
      e.key === 'ArrowDown' ? (at + 1) % items.length
        : e.key === 'ArrowUp' ? (at - 1 + items.length) % items.length
          : e.key === 'Home' ? 0
            : e.key === 'End' ? items.length - 1
              : -1
    if (next < 0) return
    e.preventDefault()
    items[next].focus()
  }

  const label = value === 'custom' ? 'Custom' : PRESET_NAME[value]

  return (
    <div ref={wrapRef} className={s.range}>
      <button
        ref={triggerRef}
        type="button"
        className={[s.rangeBtn, open ? s.rangeBtnOpen : ''].filter(Boolean).join(' ')}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        <CalendarDays size={15} className={s.rangeIcon} aria-hidden />
        <span className={s.rangeLabel}>{label}</span>
        <span className={s.rangeDates}>{range ? fmtSpan(range.from, range.to) : '…'}</span>
        {includeStaff && <span className={s.rangeTag} title="Staff visits are included">Staff</span>}
        <ChevronDown size={14} className={s.rangeChevron} aria-hidden />
      </button>

      {open && (
        <div id={panelId} className={s.popover} role="dialog" aria-label="Date range" onKeyDown={onMenuKey}>
          <div className={s.presetList} role="menu" aria-label="Preset ranges">
            {RANGE_PRESETS.map((p, i) => {
              const on = value === p.key
              // What each preset means today, so nobody has to work it out.
              const dates = p.key === 'all' && first === undefined
                ? '…'
                : (() => { const r = resolveRange({ key: p.key }, today, first); return fmtSpan(r.from, r.to) })()
              return (
                <button
                  key={p.key}
                  ref={(el) => { itemRefs.current[i] = el }}
                  type="button"
                  role="menuitemradio"
                  aria-checked={on}
                  className={[s.preset, on ? s.presetOn : ''].filter(Boolean).join(' ')}
                  onClick={() => { close(true); onPreset(p.key) }}
                >
                  <span className={s.presetName}>{PRESET_NAME[p.key]}</span>
                  <span className={s.presetDates}>{dates}</span>
                  <span className={s.presetCheck} aria-hidden>{on && <Check size={14} />}</span>
                </button>
              )
            })}
          </div>
          <div className={s.popDivider} role="separator" />
          <CustomRange
            initial={range}
            active={value === 'custom'}
            min={first ?? null}
            max={today}
            onApply={(from, to) => { close(true); onCustom(from, to) }}
          />
          <div className={s.popDivider} role="separator" />
          {/* Staff browsers carry the rsv_staff cookie the backoffices set at
              sign-in; off by default so our own checks on pages don't count. */}
          <label className={s.staffRow}>
            <span className={s.staffText}>
              <span className={s.staffTitle}>Include staff traffic</span>
              <span className={s.staffHint}>Visits from browsers signed in to a Reserva backoffice</span>
            </span>
            <Toggle checked={includeStaff} onChange={onIncludeStaffChange} ariaLabel="Include staff traffic" />
          </label>
        </div>
      )}
    </div>
  )
}

function CustomRange({ initial, active, min, max, onApply }: {
  initial: ResolvedRange | null
  active: boolean
  min: string | null
  max: string
  onApply: (from: string, to: string) => void
}) {
  // Start from what is on screen, pulled inside the limits — opening the menu
  // should never greet anyone with an error they did not cause.
  const clamp = (d: string) => (min && d < min ? min : d > max ? max : d)
  const [from, setFrom] = useState(() => clamp(initial?.from ?? max))
  const [to, setTo] = useState(() => clamp(initial?.to ?? max))
  const fromRef = useRef<HTMLInputElement>(null)
  useEffect(() => { if (active) fromRef.current?.focus() }, [active])

  const error = customRangeError(from, to, { min, max })
  const days = error ? 0 : daysInclusive(from, to)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!error) onApply(from, to)
  }

  return (
    <form className={s.customRange} onSubmit={submit} noValidate aria-label="Custom date range">
      <div className={s.popTitle}>Custom range</div>
      <div className={s.popFields}>
        <label className={s.popField}>
          <span>From</span>
          <input
            ref={fromRef}
            type="date"
            value={from}
            min={min ?? undefined}
            max={to && to < max ? to : max}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className={s.popField}>
          <span>To</span>
          <input
            type="date"
            value={to}
            min={from || min || undefined}
            max={max}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
      </div>
      <div className={s.customFoot}>
        <p className={error ? s.popError : s.popHint} aria-live="polite">
          {error ?? `${fmtInt(days)} ${days === 1 ? 'day' : 'days'}, compared with the ${days === 1 ? 'day' : `${fmtInt(days)} days`} before`}
        </p>
        <Button type="submit" variant="accent" size="sm" disabled={!!error}>Apply</Button>
      </div>
    </form>
  )
}
