import { useState, useRef, useEffect, useMemo } from 'react'
import { Clock, Check } from 'lucide-react'
import s from './TimePicker.module.scss'

interface TimePickerProps {
  value: string                 // 'HH:MM'
  onChange: (v: string) => void
  disabled?: boolean
  /** Step in minutes between options. Default 30. */
  step?: number
  /** First selectable hour (inclusive). Default 0. */
  minHour?: number
  /** Last selectable hour (inclusive). Default 23. */
  maxHour?: number
  className?: string
}

export function TimePicker({
  value, onChange, disabled, step = 30, minHour = 0, maxHour = 23, className = '',
}: TimePickerProps) {
  const [open, setOpen]   = useState(false)
  const [up, setUp]       = useState(false)
  const ref     = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const options = useMemo(() => {
    const out: string[] = []
    for (let h = minHour; h <= maxHour; h++) {
      for (let m = 0; m < 60; m += step) {
        out.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
      }
    }
    return out
  }, [step, minHour, maxHour])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])

  // Decide whether to open above (if near viewport bottom) + scroll to selection.
  useEffect(() => {
    if (!open || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    setUp(rect.bottom + 260 > window.innerHeight)
    requestAnimationFrame(() => {
      const el = listRef.current?.querySelector('[data-selected="true"]') as HTMLElement | undefined
      el?.scrollIntoView({ block: 'center' })
    })
  }, [open])

  const select = (t: string) => { onChange(t); setOpen(false) }

  return (
    <div ref={ref} className={[s.wrap, className].filter(Boolean).join(' ')}>
      <button
        type="button"
        disabled={disabled}
        className={[s.trigger, open ? s.open : ''].filter(Boolean).join(' ')}
        onClick={() => !disabled && setOpen(o => !o)}
      >
        <span className={s.val}>{value}</span>
        <Clock size={13} className={s.clock} />
      </button>

      {open && (
        <div ref={listRef} className={[s.dropdown, up ? s.up : ''].filter(Boolean).join(' ')}>
          {options.map(t => {
            const isSel = t === value
            return (
              <div
                key={t}
                data-selected={isSel}
                className={[s.option, isSel ? s.selected : ''].filter(Boolean).join(' ')}
                onClick={() => select(t)}
              >
                <span>{t}</span>
                {isSel && <Check size={13} className={s.check} />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
