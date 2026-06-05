import { useEffect, useMemo } from 'react'
import { Clock, Check } from 'lucide-react'
import { useAnchoredDropdown } from '../common/useAnchoredDropdown'
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
  const { open, setOpen, triggerRef, panelRef, renderPanel } = useAnchoredDropdown('trigger')

  const options = useMemo(() => {
    const out: string[] = []
    for (let h = minHour; h <= maxHour; h++) {
      for (let m = 0; m < 60; m += step) {
        out.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
      }
    }
    return out
  }, [step, minHour, maxHour])

  // Scroll the selected option into view when opening.
  useEffect(() => {
    if (!open) return
    requestAnimationFrame(() => {
      const el = panelRef.current?.querySelector('[data-selected="true"]') as HTMLElement | undefined
      el?.scrollIntoView({ block: 'center' })
    })
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const select = (t: string) => { onChange(t); setOpen(false) }

  return (
    <div ref={triggerRef} className={[s.wrap, className].filter(Boolean).join(' ')}>
      <button
        type="button"
        disabled={disabled}
        className={[s.trigger, open ? s.open : ''].filter(Boolean).join(' ')}
        onClick={() => !disabled && setOpen(o => !o)}
      >
        <span className={s.val}>{value}</span>
        <Clock size={13} className={s.clock} />
      </button>

      {renderPanel(
        <>
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
        </>,
        s.dropdown,
      )}
    </div>
  )
}
