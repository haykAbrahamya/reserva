import { useId, useRef } from 'react'
import { Check, Pipette } from 'lucide-react'
import s from './AccentPicker.module.scss'

/** Curated presets — kept, but now alongside a free custom picker. */
const PRESETS = [
  '#4f46e5', '#0ea5e9', '#10b981', '#14b8a6',
  '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6',
  '#0f172a', '#64748b', '#b45309', '#0d9488',
]

const HEX_RE = /^#([0-9a-fA-F]{6})$/

interface Props {
  value: string
  onChange: (hex: string) => void
  label?: string
}

/**
 * Brand-accent selector: curated preset swatches PLUS a custom color via the
 * native picker and a hex field. Shows a live preview so operators can pick any
 * brand color, not just the presets.
 */
export function AccentPicker({ value, onChange, label = 'Accent' }: Props) {
  const inputId = useId()
  const nativeRef = useRef<HTMLInputElement>(null)
  const isPreset = PRESETS.some((c) => c.toLowerCase() === value.toLowerCase())
  const validHex = HEX_RE.test(value)

  const commitHex = (raw: string) => {
    let v = raw.trim()
    if (v && !v.startsWith('#')) v = `#${v}`
    onChange(v.toLowerCase())
  }

  return (
    <div className={s.wrap}>
      <label className={s.label}>{label}</label>

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

        {/* Custom color trigger — opens the native picker */}
        <button
          type="button"
          className={[s.customSwatch, !isPreset && validHex ? s.active : ''].filter(Boolean).join(' ')}
          style={!isPreset && validHex ? { background: value } : undefined}
          onClick={() => nativeRef.current?.click()}
          aria-label="Custom color"
          title="Custom color"
        >
          {!isPreset && validHex ? <Check size={13} className={s.tick} /> : <Pipette size={14} />}
        </button>
        <input
          ref={nativeRef}
          id={inputId}
          type="color"
          className={s.nativeInput}
          value={validHex ? value : '#4f46e5'}
          onChange={(e) => onChange(e.target.value.toLowerCase())}
        />
      </div>

      {/* Hex + live preview row */}
      <div className={s.hexRow}>
        <span className={s.preview} style={{ background: validHex ? value : 'transparent' }} />
        <span className={s.hash}>#</span>
        <input
          className={[s.hexInput, value && !validHex ? s.invalid : ''].filter(Boolean).join(' ')}
          value={value.replace(/^#/, '')}
          onChange={(e) => commitHex(e.target.value)}
          placeholder="RRGGBB"
          maxLength={6}
          spellCheck={false}
        />
        {value && !validHex && <span className={s.hint}>6-digit hex</span>}
      </div>
    </div>
  )
}
