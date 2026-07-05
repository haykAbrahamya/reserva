import { useEffect, useMemo, useRef } from 'react'
import { fmtDateInput } from '@reserva/shared'
import { useT } from '@/i18n'
import s from './DayStrip.module.scss'

/** Availability signal for a single day in the strip. */
export interface DayInfo {
  /** yyyy-mm-dd (local, salon day) — matches BookingFlow's `date` value. */
  date: string
  /** The salon is closed this weekday → chip is disabled. */
  closed: boolean
  /**
   * Slot-density bucket, 0–3, driving the dots. `undefined` = not yet known
   * (backend summary absent / still loading) → the chip renders with no signal
   * but is still selectable, so the strip degrades gracefully.
   */
  openDots?: 0 | 1 | 2 | 3
}

interface Props {
  /** Ordered days to render (typically Today → +6). */
  days: DayInfo[]
  /** Currently selected yyyy-mm-dd. */
  selected: string
  onSelect: (date: string) => void
}

/** Parse a yyyy-mm-dd (local day) into a Date at local midnight. */
function parseLocalDay(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/**
 * Horizontal day picker for the "Select a time" step. Leads with the common
 * case (next few days as one-tap chips) so the user sees availability before
 * committing to a date. Each chip shows the weekday, day number, and a compact
 * dot signal for how open that day is; closed days are dimmed and disabled.
 *
 * Purely presentational — BookingFlow owns the data (which days, their dots)
 * and the calendar escape hatch that lives beside it.
 */
export function DayStrip({ days, selected, onSelect }: Props) {
  const t = useT()
  const stripRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<HTMLButtonElement>(null)

  const today = useMemo(() => fmtDateInput(new Date()), [])

  // Keep the selected chip in view when it changes (e.g. auto-advance to the
  // next open day, or a far date re-anchoring the strip).
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [selected])

  /**
   * Localized weekday label. Only today gets a special word ("Today"); every
   * other chip — including tomorrow — shows the short weekday name, which keeps
   * all chips uniform and avoids a long "Tomorrow" overflowing a narrow chip.
   */
  const weekdayLabel = (iso: string): string => {
    if (iso === today) return t('booking.strip.today')
    const dowKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
    return t(`partner.locations.days.${dowKeys[parseLocalDay(iso).getDay()]}`)
  }

  return (
    <div
      className={s.strip}
      ref={stripRef}
      role="group"
      aria-label={t('booking.strip.ariaLabel')}
    >
      {days.map((d) => {
        const isSelected = d.date === selected
        const dayNum = parseLocalDay(d.date).getDate()
        // Screen-reader state: only "closed" is a firm, actionable signal. Slot
        // density is decorative (dots), so we don't announce it as words.
        const stateLabel = d.closed ? ` — ${t('booking.strip.closed')}` : ''
        return (
          <button
            key={d.date}
            ref={isSelected ? selectedRef : undefined}
            type="button"
            className={[
              s.chip,
              isSelected ? s.selected : '',
              d.closed ? s.closed : '',
            ].filter(Boolean).join(' ')}
            disabled={d.closed}
            aria-pressed={isSelected}
            aria-label={`${weekdayLabel(d.date)} ${dayNum}${stateLabel}`}
            onClick={() => onSelect(d.date)}
          >
            <span className={s.dow}>{weekdayLabel(d.date)}</span>
            <span className={s.num}>{dayNum}</span>
            <span className={s.signal} aria-hidden="true">
              {d.openDots != null && !d.closed ? (
                // Dots only — density of open slots. No text labels (a "Full"
                // label can also disagree with the live slots on tap), so 0 just
                // reads as all-dim dots and the day stays tappable.
                <span className={s.dots}>
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className={[s.dot, i < d.openDots! ? s.dotOn : ''].filter(Boolean).join(' ')}
                    />
                  ))}
                </span>
              ) : (
                // Closed day, or availability not known yet — no dots. Keeps the
                // signal row's height stable so chips don't jump.
                <span className={s.dotsPlaceholder} />
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}
