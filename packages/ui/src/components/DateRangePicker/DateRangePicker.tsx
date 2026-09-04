import { useState, type ReactNode } from 'react'
import { CalendarRange, Check, ChevronDown, SlidersHorizontal, X } from 'lucide-react'
import {
  DATE_RANGE_GROUPS,
  dateRangeForPreset,
  matchDateRangePreset,
  type DateRangePresetKey,
  type DateRangeValue,
} from '@reserva/shared'
import { useAnchoredDropdown } from '../common/useAnchoredDropdown'
import { DatePicker, type DatePickerLabels } from '../DatePicker/DatePicker'
import s from './DateRangePicker.module.scss'

/**
 * Localizable text. All optional — English fallbacks keep the package usable on
 * its own, and apps feed it their own bundle (see the DatePicker precedent).
 */
export interface DateRangePickerLabels {
  /** Trigger text when nothing is filtered. Doubles as the "clear" option. */
  allDates?: string
  /** Group headings. */
  upcoming?: string
  past?: string
  /** Per-preset labels, keyed by preset. Missing keys fall back to English. */
  presets?: Partial<Record<DateRangePresetKey, string>>
  /** The option that reveals the two date fields. */
  custom?: string
  from?: string
  to?: string
  /** Renders a hand-picked range in the trigger. */
  formatRange?: (from: string, to: string) => string
  /** Passed straight through to both calendars. */
  datePicker?: DatePickerLabels
}

const EN_PRESETS: Record<DateRangePresetKey, string> = {
  today: 'Today',
  tomorrow: 'Tomorrow',
  next7: 'Next 7 days',
  thisWeek: 'This week',
  thisMonth: 'This month',
  yesterday: 'Yesterday',
  last7: 'Last 7 days',
  last30: 'Last 30 days',
  lastMonth: 'Last month',
}

const EN_GROUPS: Record<'upcoming' | 'past', string> = {
  upcoming: 'Upcoming',
  past: 'Past',
}

interface DateRangePickerProps {
  /** 'YYYY-MM-DD' or '' — the same pair the list endpoints already take. */
  from: string
  to: string
  /** Both ends always arrive together; '' on either side means unbounded. */
  onChange: (range: DateRangeValue) => void
  labels?: DateRangePickerLabels
  className?: string
}

/**
 * A date range as ONE control: presets first, calendars on request.
 *
 * It replaces a bare pair of date fields, and the reason is a counting
 * argument. "What is on today" — the single most common thing a salon owner
 * asks this page — cost four interactions across two calendars: open, pick,
 * open, pick. It is now one. The ranges people actually want are named, and the
 * calendars stay one click away for everything else.
 *
 * On a phone the old pair was also simply too big: two ~150px fields and a dash
 * in a 375px viewport, each opening a 288px panel anchored to a trigger in the
 * right half of the screen — which is how half the calendar ended up off the
 * edge. One trigger fits, and the fields it reveals get a full-width row each.
 *
 * The label is DERIVED from the dates, never from the last button pressed
 * (`matchDateRangePreset`), so a range restored from a URL or typed by hand
 * still reads "This week" when it is this week, and a preset that has gone
 * stale overnight stops claiming to be current.
 */
export function DateRangePicker({ from, to, onChange, labels, className = '' }: DateRangePickerProps) {
  /*
   * The panel takes the TRIGGER's width, with 240px as a floor.
   *
   * A fixed width looked deliberate on a desktop and like a mistake on a phone,
   * where the field spans the row and a 240px panel hung under one end of it.
   * Matching the trigger ties the two together at every size; the floor keeps
   * the longest preset label off two lines when the field itself is narrow.
   */
  const { open, setOpen, triggerRef, renderPanel } = useAnchoredDropdown('trigger')

  const presetLabel = (k: DateRangePresetKey) => labels?.presets?.[k] ?? EN_PRESETS[k]
  const groupLabel = (k: 'upcoming' | 'past') =>
    (k === 'upcoming' ? labels?.upcoming : labels?.past) ?? EN_GROUPS[k]
  const allDatesLabel = labels?.allDates ?? 'All dates'
  const formatRange =
    labels?.formatRange ??
    ((f: string, t: string) => (f && t ? `${f} – ${t}` : f ? `From ${f}` : `Until ${t}`))

  const active = matchDateRangePreset(from, to)
  const hasRange = !!(from || to)

  /*
   * Custom mode is mostly DERIVED rather than stored: a range that matches no
   * preset can only have been hand-picked, so the fields that produced it must
   * stay visible — otherwise a deep link into a specific fortnight would render
   * a control whose own value is unreachable. The flag covers only the one case
   * derivation cannot see: "Custom range" chosen while the filter is empty.
   */
  const [wantsCustom, setWantsCustom] = useState(false)
  const custom = wantsCustom || (hasRange && !active)

  const triggerText = active ? presetLabel(active) : hasRange ? formatRange(from, to) : allDatesLabel

  const applyPreset = (k: DateRangePresetKey) => {
    onChange(dateRangeForPreset(k))
    setWantsCustom(false)
    setOpen(false)
  }

  const clear = () => {
    onChange({ from: '', to: '' })
    setWantsCustom(false)
    setOpen(false)
  }

  const option = (
    key: string,
    label: string,
    selected: boolean,
    onClick: () => void,
    icon?: ReactNode,
  ) => (
    <button
      key={key}
      type="button"
      className={[s.option, selected ? s.selected : ''].filter(Boolean).join(' ')}
      onClick={onClick}
    >
      {icon}
      <span className={s.optLabel}>{label}</span>
      {selected && <Check size={14} className={s.check} />}
    </button>
  )

  return (
    <div className={[s.wrap, className].filter(Boolean).join(' ')}>
      <div ref={triggerRef} className={s.triggerWrap}>
        <button
          type="button"
          className={[s.trigger, open ? s.open : '', hasRange ? s.filled : '']
            .filter(Boolean)
            .join(' ')}
          onClick={() => setOpen((o) => !o)}
        >
          <CalendarRange size={15} className={s.icon} />
          <span className={s.text}>{triggerText}</span>
          <ChevronDown
            size={14}
            className={[s.chevron, open ? s.rotated : ''].filter(Boolean).join(' ')}
          />
        </button>

        {/* Clearing is the second most common action after choosing, so it does
            not hide behind opening the panel first. */}
        {hasRange && (
          <button type="button" className={s.clearInline} onClick={clear} aria-label={allDatesLabel}>
            <X size={13} />
          </button>
        )}
      </div>

      {renderPanel(
        <>
          {DATE_RANGE_GROUPS.map((group) => (
            <div key={group.key} className={s.group}>
              <div className={s.groupLabel}>{groupLabel(group.key)}</div>
              {group.presets.map((k) => option(k, presetLabel(k), active === k, () => applyPreset(k)))}
            </div>
          ))}

          <div className={s.sep} />

          {option(
            'custom',
            labels?.custom ?? 'Custom range',
            custom && !active,
            () => {
              setWantsCustom(true)
              setOpen(false)
            },
            <SlidersHorizontal size={13} className={s.optIcon} />,
          )}
          {hasRange && option('all', allDatesLabel, false, clear, <X size={13} className={s.optIcon} />)}
        </>,
        s.dropdown,
        240,
      )}

      {/*
        The calendars, revealed only when they are the answer. Each takes a full
        row on a phone: side-by-side is what made them cramped, and a range is
        two decisions anyway, so stacking costs nothing.
      */}
      {custom && (
        <div className={s.fields}>
          {/*
            Both ends are LABELLED, not just placeheld.

            A placeholder is the one piece of guidance that disappears exactly
            when it is needed: fill both fields and you get two identical-looking
            boxes reading "15 Sep 2026" and "15 Sep 2026", with nothing left to
            say which is the start. Stacked on a phone, where the dash between
            them is gone too, there is then no cue at all.
          */}
          <label className={s.field}>
            <span className={s.fieldLabel}>{labels?.from ?? 'From'}</span>
            <DatePicker
              value={from}
              max={to || undefined}
              onChange={(v) => onChange({ from: v, to })}
              placeholder={labels?.from ?? 'From'}
              labels={labels?.datePicker}
            />
          </label>

          <span className={s.dash} aria-hidden="true">–</span>

          <label className={s.field}>
            <span className={s.fieldLabel}>{labels?.to ?? 'To'}</span>
            <DatePicker
              value={to}
              min={from || undefined}
              onChange={(v) => onChange({ from, to: v })}
              placeholder={labels?.to ?? 'To'}
              labels={labels?.datePicker}
            />
          </label>
        </div>
      )}
    </div>
  )
}
