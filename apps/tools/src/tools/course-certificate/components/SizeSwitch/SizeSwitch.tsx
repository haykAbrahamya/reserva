import { useId, type CSSProperties } from 'react'
import { useT } from '@/i18n'
import { PAPER, PAPER_SIZES, type PaperSize } from '../../model'
import s from './SizeSwitch.module.scss'

interface Props {
  value: PaperSize
  onChange: (size: PaperSize) => void
}

/** A sheet's glyph width, in px, for its paper: drawn to true relative scale, so A5 reads smaller. */
const GLYPH_WIDTH = 46

/**
 * The paper the certificate prints on, A4 or A5 — each option a little
 * landscape sheet drawn at true relative size, so the choice is seen, not
 * read. Native radio inputs: arrow keys switch between the two.
 */
export function SizeSwitch({ value, onChange }: Props) {
  const t = useT()
  const name = useId()

  return (
    <div className={s.switch} role="radiogroup" aria-label={t('courseCertificate.size.label')}>
      {PAPER_SIZES.map((size) => {
        const { widthMm, heightMm } = PAPER[size]
        const glyph = {
          width: `${(GLYPH_WIDTH * widthMm) / PAPER.a4.widthMm}px`,
          aspectRatio: `${widthMm} / ${heightMm}`,
        } as CSSProperties
        return (
          <label key={size} className={s.option}>
            <input
              type="radio"
              name={name}
              className={s.input}
              value={size}
              checked={value === size}
              onChange={() => onChange(size)}
            />
            <span className={s.tile}>
              <span className={s.paper} aria-hidden="true">
                <span className={s.sheet} style={glyph}>
                  <span className={s.lines} />
                </span>
              </span>
              <span className={s.text}>
                <span className={s.name}>{t(`courseCertificate.size.${size}`)}</span>
                <span className={s.mm}>
                  {widthMm} × {heightMm} {t('courseCertificate.size.mm')}
                </span>
              </span>
            </span>
          </label>
        )
      })}
    </div>
  )
}
