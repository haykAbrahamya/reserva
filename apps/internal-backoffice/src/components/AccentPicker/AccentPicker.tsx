import { useId, useRef } from 'react'
import { Check, Pipette } from 'lucide-react'
import s from './AccentPicker.module.scss'

/** Curated presets — the Reserva brand bronze leads (the house default), then a
 *  spread of warm/neutral brand-friendly tones. A free custom picker sits
 *  alongside for anything off-palette. */
const PRESETS = [
  '#a8784b', '#b45309', '#c2410c', '#9a3412',
  '#2f4a3a', '#0d9488', '#0369a1', '#7a4a55',
  '#b07683', '#6d28d9', '#334155', '#0f172a',
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
          value={validHex ? value : '#a8784b'}
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
