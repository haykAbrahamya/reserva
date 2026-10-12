import { useMemo } from 'react'
import { fmtDateInput } from '@reserva/shared'
import type { DatePickerLabels } from '@reserva/ui'
import { useI18n } from '@/i18n'

// ─────────────────────────────────────────────────────────────
// Dates as the tools show them. Everything is a local calendar day
// ('YYYY-MM-DD'), never a UTC instant — see fmtDateInput for why.
//
// Month and weekday names come from the copy (i18n `calendar.*`), NOT from
// Intl: Chrome ships trimmed locale data without Armenian, so
// Intl.DateTimeFormat('hy-AM') silently answers in English — "Monday,
// October 12" on an Armenian story. The main site keeps its own names for the
// same reason.
// ─────────────────────────────────────────────────────────────

/** 'YYYY-MM-DD' → that day at local midnight. */
export function parseDay(day: string): Date {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const today = (): string => fmtDateInput(new Date())

export function addDays(day: string, days: number): string {
  const date = parseDay(day)
  date.setDate(date.getDate() + days)
  return fmtDateInput(date)
}

export const isDay = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parseDay(value).getTime())

/** The calendar words of one language. Weekdays start on Monday. */
export interface CalendarWords {
  /** Month names on their own (a calendar header): "October". */
  months: string[]
  /** Month names inside a date — the Armenian and Russian genitive: "հոկտեմբերի", "октября". */
  monthsOf: string[]
  weekdays: string[]
  weekdaysShort: string[]
  /** e.g. "{weekday}, {day} {month}". */
  dayLong: string
  /** e.g. "{day} {month} {year}". */
  dateFull: string
}

/** The visitor's calendar words, from their language's copy. */
export function useCalendarWords(): CalendarWords {
  const { t } = useI18n()
  return useMemo(
    () => ({
      months: Array.from({ length: 12 }, (_, i) => t(`calendar.months.${i}`)),
      monthsOf: Array.from({ length: 12 }, (_, i) => t(`calendar.monthsOf.${i}`)),
      weekdays: Array.from({ length: 7 }, (_, i) => t(`calendar.weekdays.${i}`)),
      weekdaysShort: Array.from({ length: 7 }, (_, i) => t(`calendar.weekdaysShort.${i}`)),
      dayLong: t('calendar.dayLong'),
      dateFull: t('calendar.dateFull'),
    }),
    [t],
  )
}

const fill = (template: string, parts: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, key: string) => String(parts[key] ?? ''))

/** Monday = 0 … Sunday = 6, matching the word lists. */
const weekdayIndex = (date: Date) => (date.getDay() + 6) % 7

/** "Tuesday, 14 October" in the visitor's language. */
export function formatLongDay(day: string, words: CalendarWords): string {
  const date = parseDay(day)
  return fill(words.dayLong, {
    weekday: words.weekdays[weekdayIndex(date)],
    day: date.getDate(),
    month: words.monthsOf[date.getMonth()],
  })
}

/** "14 October 2026" in the visitor's language. */
export function formatFullDate(day: string, words: CalendarWords): string {
  const date = parseDay(day)
  return fill(words.dateFull, {
    day: date.getDate(),
    month: words.monthsOf[date.getMonth()],
    year: date.getFullYear(),
  })
}

/** The shared DatePicker's month and weekday names, in the visitor's language. */
export function datePickerLabels(
  words: CalendarWords,
  extra?: Pick<DatePickerLabels, 'today' | 'clear'>,
): DatePickerLabels {
  return {
    monthNames: words.months,
    weekdayNames: words.weekdaysShort,
    formatValue: (date) => formatFullDate(fmtDateInput(date), words),
    ...extra,
  }
}
