import { useState } from 'react'
import { Star } from 'lucide-react'
import s from './StarRating.module.scss'

interface DisplayProps {
  /** Average rating (e.g. 4.5). */
  value: number
  /** Star pixel size. */
  size?: number
  /** Optional review count shown after the number. */
  count?: number
  /** Compact mode: number + a single star (used in tight card chips). */
  compact?: boolean
  className?: string
}

/**
 * Read-only rating display. Shows partial fill for fractional averages.
 * Never renders fake values — callers must gate on a real count first.
 */
export function StarRatingDisplay({ value, size = 14, count, compact, className }: DisplayProps) {
  if (compact) {
    return (
      <span className={[s.compact, className].filter(Boolean).join(' ')}>
        <Star size={size} className={s.litStar} fill="currentColor" />
        <strong>{value.toFixed(1)}</strong>
        {count != null && <span className={s.count}>({count})</span>}
      </span>
    )
  }
  const pct = Math.max(0, Math.min(1, value / 5)) * 100
  return (
    <span className={[s.display, className].filter(Boolean).join(' ')} aria-label={`${value.toFixed(1)} / 5`}>
      <span className={s.starTrack}>
        {/* Base (dim) row. */}
        <span className={s.starRow}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Star key={i} size={size} className={s.baseStar} fill="currentColor" />
          ))}
        </span>
        {/* Lit row — an identical row clipped from the left to the score width.
            Both rows are the SAME flex box (.starRow), so the stars sit pixel-
            for-pixel on top of each other with no dim stars peeking through. */}
        <span className={s.starFill} style={{ width: `${pct}%` }}>
          <span className={s.starRow}>
            {[0, 1, 2, 3, 4].map((i) => (
              <Star key={i} size={size} className={s.litStar} fill="currentColor" />
            ))}
          </span>
        </span>
      </span>
      <strong className={s.num}>{value.toFixed(1)}</strong>
      {count != null && <span className={s.count}>({count})</span>}
    </span>
  )
}

interface InputProps {
  value: number
  onChange: (v: number) => void
  size?: number
}

/** Interactive star picker for submitting a rating (keyboard accessible). */
export function StarRatingInput({ value, onChange, size = 30 }: InputProps) {
  const [hover, setHover] = useState(0)
  const shown = hover || value
  return (
    <div className={s.input} role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n}`}
          className={s.inputStar}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
        >
          <Star size={size} fill={n <= shown ? 'currentColor' : 'none'} className={n <= shown ? s.litStar : s.dimStar} />
        </button>
      ))}
    </div>
  )
}
