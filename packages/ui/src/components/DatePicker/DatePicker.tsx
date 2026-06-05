import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { fmtDateInput } from '@reserva/shared'
import { useAnchoredDropdown } from '../common/useAnchoredDropdown'
import s from './DatePicker.module.scss'

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const MONTHS   = ['January','February','March','April','May','June','July','August','September','October','November','December']

interface DatePickerProps {
  value: string          // 'YYYY-MM-DD' or ''
  onChange: (v: string) => void
  min?: string           // 'YYYY-MM-DD'
  max?: string
  label?: string
  placeholder?: string
  className?: string
}

function parseDate(s: string): Date | null {
  if (!s) return null
  const d = new Date(s + 'T00:00:00')
  return isNaN(d.getTime()) ? null : d
}

function buildCalendar(year: number, month: number): (Date | null)[] {
  // month is 0-indexed
  const first   = new Date(year, month, 1)
  const last    = new Date(year, month + 1, 0)
  // Mon=0 offset
  const startDow = (first.getDay() + 6) % 7
  const cells: (Date | null)[] = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d))
  // Fill to complete last row
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export function DatePicker({ value, onChange, min, max, label, placeholder = 'Select date', className = '' }: DatePickerProps) {
  const selected = parseDate(value)
  const today    = new Date(); today.setHours(0,0,0,0)

  const { open, setOpen, triggerRef, renderPanel } = useAnchoredDropdown(288)
  const [year,  setYear]  = useState(() => selected?.getFullYear() ?? today.getFullYear())
  const [month, setMonth] = useState(() => selected?.getMonth() ?? today.getMonth())

  // Sync calendar view when value changes externally
  useEffect(() => {
    if (selected) { setYear(selected.getFullYear()); setMonth(selected.getMonth()) }
  }, [value])

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const select = (d: Date) => {
    onChange(fmtDateInput(d))
    setOpen(false)
  }

  const goToday = () => {
    onChange(fmtDateInput(today))
    setYear(today.getFullYear())
    setMonth(today.getMonth())
    setOpen(false)
  }

  const clear = () => { onChange(''); setOpen(false) }

  const isDisabled = (d: Date) => {
    if (min && fmtDateInput(d) < min) return true
    if (max && fmtDateInput(d) > max) return true
    return false
  }

  const displayValue = selected
    ? selected.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''

  const cells = buildCalendar(year, month)

  return (
    <div className={[s.wrap, className].filter(Boolean).join(' ')} ref={triggerRef}>
      {label && <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--fg-1)', marginBottom: 6 }}>{label}</label>}

      <button
        type="button"
        className={[s.trigger, open ? s.open : '', !displayValue ? s.placeholder : ''].filter(Boolean).join(' ')}
        onClick={() => setOpen(o => !o)}
      >
        <span>{displayValue || placeholder}</span>
        <CalendarDays size={15} className={s.calIcon} />
      </button>

      {renderPanel(
        <>
          {/* Month navigation */}
          <div className={s.header}>
            <button className={s.navBtn} onClick={prevMonth} type="button">
              <ChevronLeft size={13} />
            </button>
            <span className={s.monthLabel}>{MONTHS[month]} {year}</span>
            <button className={s.navBtn} onClick={nextMonth} type="button">
              <ChevronRight size={13} />
            </button>
          </div>

          {/* Weekday headers */}
          <div className={s.weekdays}>
            {WEEKDAYS.map(d => <div key={d} className={s.weekday}>{d}</div>)}
          </div>

          {/* Day grid */}
          <div className={s.grid}>
            {cells.map((d, i) => {
              if (!d) return <div key={`empty-${i}`} />

              const dateStr   = fmtDateInput(d)
              const isSel     = value === dateStr
              const isToday   = fmtDateInput(d) === fmtDateInput(today)
              const disabled  = isDisabled(d)
              const isOther   = d.getMonth() !== month

              return (
                <button
                  key={dateStr}
                  type="button"
                  disabled={disabled}
                  onClick={() => !disabled && select(d)}
                  className={[
                    s.day,
                    isSel    ? s.selected    : '',
                    isToday  ? s.today       : '',
                    disabled ? s.disabled    : '',
                    isOther  ? s.otherMonth  : '',
                  ].filter(Boolean).join(' ')}
                >
                  {d.getDate()}
                </button>
              )
            })}
          </div>

          {/* Footer */}
          <div className={s.footer}>
            <button type="button" className={s.todayBtn} onClick={goToday}>Today</button>
            {value && <button type="button" className={s.clearBtn} onClick={clear}>Clear</button>}
          </div>
        </>,
        s.popover,
      )}
    </div>
  )
}
