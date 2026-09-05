import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, History } from 'lucide-react'
import { fmtDateInput } from '@/utils/format'
import { useT } from '@/i18n'
import s from './SlotPicker.module.scss'

interface Props {
  /** Bookable 'HH:mm' start times, ascending, as the server returned them. */
  slots: string[]
  /** The selected calendar date, 'YYYY-MM-DD' — decides what counts as past. */
  date: string
  value: string
  onChange: (time: string) => void
}

/**
 * The time grid, with times that have already passed folded away.
 *
 * Backoffice staff can record a visit that already happened, which means the
 * server may return a whole working day of start times instead of only what is
 * left of it. Shown flat, that turns a short, scannable list into fifty-odd
 * identical buttons, and the times someone actually wants — the next few — sink
 * to the bottom of it.
 *
 * So the split is conditional, and only appears where it earns its keep:
 *
 *  - a date in the FUTURE has no past times; nothing changes
 *  - a date in the PAST is entirely past times; splitting would state the
 *    obvious and add a control that hides everything
 *  - only TODAY is genuinely mixed, and there the past is collapsed behind a
 *    counted header, so the default view is exactly what it was before this
 *    feature existed
 *
 * Two cases force it open, because a collapsed section that holds the only
 * answer is just an empty picker: when nothing upcoming is left (the salon has
 * closed for the day) and when the currently selected time is inside it.
 */
export function SlotPicker({ slots, date, value, onChange }: Props) {
  const t = useT()

  const { past, upcoming, nowLabel } = useMemo(() => {
    const today = fmtDateInput(new Date())

    /*
     * Only today is mixed, so every other date is one flat grid: a future date
     * has no past times, and a past date has nothing else — dimming or hiding
     * every option there would be absurd. Comparing the ISO date strings is
     * both cheaper than building a Date per slot and immune to DST drift.
     */
    if (date !== today) return { past: [] as string[], upcoming: slots, nowLabel: '' }

    const now = new Date()
    const nowMin = now.getHours() * 60 + now.getMinutes()
    const minutes = (hhmm: string) => {
      const [h, m] = hhmm.split(':').map(Number)
      return h * 60 + m
    }

    return {
      past: slots.filter((sl) => minutes(sl) < nowMin),
      upcoming: slots.filter((sl) => minutes(sl) >= nowMin),
      // Read from the SAME clock that drew the boundary, so the marker can
      // never disagree with the split it is marking.
      nowLabel: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
    }
  }, [slots, date])

  const [open, setOpen] = useState(false)

  // A section holding the selection, or holding everything, cannot stay shut.
  const forcedOpen = (!!value && past.includes(value)) || (past.length > 0 && upcoming.length === 0)
  const showPast = open || forcedOpen

  // Collapse again whenever the day changes, so yesterday's expansion does not
  // greet someone who has moved on to a normal future booking.
  useEffect(() => setOpen(false), [date])

  const grid = (items: string[], muted: boolean) => (
    <div className={s.grid}>
      {items.map((sl) => (
        <button
          key={sl}
          type="button"
          onClick={() => onChange(sl)}
          className={[s.slot, muted ? s.pastSlot : '', value === sl ? s.selected : '']
            .filter(Boolean)
            .join(' ')}
        >
          {sl}
        </button>
      ))}
    </div>
  )

  return (
    <div className={s.wrap}>
      {past.length > 0 && (
        <>
          {upcoming.length > 0 ? (
            <button
              type="button"
              className={[s.pastToggle, showPast ? s.pastToggleOpen : ''].filter(Boolean).join(' ')}
              onClick={() => setOpen((o) => !o)}
              aria-expanded={showPast}
            >
              <History size={13} className={s.pastIcon} />
              <span className={s.pastLabel}>{t('newBooking.pastTimes')}</span>
              <span className={s.pastCount}>{past.length}</span>
              <ChevronDown size={14} className={s.pastChevron} />
            </button>
          ) : (
            /*
              Nothing upcoming is left today — the salon has already closed — so
              every time on offer is a past one. There is no toggle, because
              there is nothing to collapse back to, but there still has to be a
              CAPTION: without it the whole grid just renders dashed and quiet
              with no explanation, which reads as "these are unavailable" when
              in fact they are the only thing on offer and all of them work.
            */
            <div className={s.pastCaption}>
              <History size={13} className={s.pastIcon} />
              <span className={s.pastLabel}>{t('newBooking.pastTimes')}</span>
              <span className={s.pastCount}>{past.length}</span>
            </div>
          )}

          {showPast && grid(past, true)}
        </>
      )}

      {/*
        The boundary, marked explicitly.

        Dashed-vs-solid borders are enough to tell two slots apart when you can
        see both, and not nearly enough once the expanded list is long enough to
        scroll: arriving at the middle of it, there is no way to know which side
        of the line you are on. A "now" rule states it, and states it with the
        actual time — so the marker doubles as the reason the split is where it
        is. Only drawn when both sides exist and the past is showing; otherwise
        it would be a divider with nothing to divide.
      */}
      {showPast && past.length > 0 && upcoming.length > 0 && (
        <div className={s.nowRule} role="separator">
          <span className={s.nowLine} />
          <span className={s.nowPill}>
            {t('common.now')} {nowLabel}
          </span>
          <span className={s.nowLine} />
        </div>
      )}

      {upcoming.length > 0 && grid(upcoming, false)}
    </div>
  )
}
