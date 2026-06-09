import { useId, useRef } from 'react'
import { Check, Pipette } from 'lucide-react'
import s from './AccentPicker.module.scss'

const PRESETS = [
  '#A8784B', '#4f46e5', '#0ea5e9', '#10b981',
  '#14b8a6', '#f59e0b', '#ef4444', '#ec4899',
]
const HEX_RE = /^#([0-9a-fA-F]{6})$/

interface Props {
  value: string
  onChange: (hex: string) => void
  label?: string
}

/** Brand-accent picker: preset swatches + a custom color via the native picker. */
export function AccentPicker({ value, onChange, label }: Props) {
  const id = useId()
  const nativeRef = useRef<HTMLInputElement>(null)
  const isPreset = PRESETS.some((c) => c.toLowerCase() === value.toLowerCase())
  const valid = HEX_RE.test(value)

  return (
    <div className={s.wrap}>
      {label && <label className={s.label}>{label}</label>}
      <div className={s.swatches}>
        {PRESETS.map((c) => (
          <button
            key={c}
            type="button"
            className={[s.swatch, value.toLowerCase() === c.toLowerCase() ? s.active : ''].filter(Boolean).join(' ')}
            style={{ background: c }}
            onClick={() => onChange(c)}
            aria-label={c}
          >
            {value.toLowerCase() === c.toLowerCase() && <Check size={13} className={s.tick} />}
          </button>
        ))}
        <button
          type="button"
          className={[s.custom, !isPreset && valid ? s.active : ''].filter(Boolean).join(' ')}
          style={!isPreset && valid ? { background: value } : undefined}
          onClick={() => nativeRef.current?.click()}
          aria-label="Custom color"
          title="Custom color"
        >
          {!isPreset && valid ? <Check size={13} className={s.tick} /> : <Pipette size={14} />}
        </button>
        <input
          ref={nativeRef}
          id={id}
          type="color"
          className={s.native}
          value={valid ? value : '#A8784B'}
          onChange={(e) => onChange(e.target.value.toLowerCase())}
        />
      </div>
    </div>
  )
}
