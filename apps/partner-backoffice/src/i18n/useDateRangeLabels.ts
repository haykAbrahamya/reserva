import { useMemo } from 'react'
import type { DateRangePickerLabels } from '@reserva/ui'
import { DATE_RANGE_PRESETS, type DateRangePresetKey } from '@reserva/shared'
import { useI18n } from './I18nProvider'
import { useDatePickerLabels } from './useDatePickerLabels'

/**
 * Localized labels for the shared `<DateRangePicker>` — preset names, the two
 * group headings, and the calendars it reveals.
 *
 * The preset map is built by iterating `DATE_RANGE_PRESETS` rather than being
 * written out by hand, so adding a preset to the shared list surfaces here as a
 * missing translation instead of silently rendering the English fallback in an
 * Armenian UI. The nested DatePicker labels are reused as-is, which is what
 * keeps the custom-range calendars identical to every other calendar in the
 * backoffice.
 */
export function useDateRangeLabels(): DateRangePickerLabels {
  const { t } = useI18n()
  const datePicker = useDatePickerLabels()

  return useMemo(() => {
    const presets = Object.fromEntries(
      DATE_RANGE_PRESETS.map((k) => [k, t(`common.dateRange.presets.${k}`)]),
    ) as Record<DateRangePresetKey, string>

    const parse = (v: string): Date | null => {
      const d = new Date(`${v}T00:00:00`)
      return isNaN(d.getTime()) ? null : d
    }
    const month = (d: Date) => t(`common.datePicker.monthsShort.${d.getMonth()}`)
    const day = (d: Date, withYear: boolean) =>
      `${d.getDate()} ${month(d)}${withYear ? ` ${d.getFullYear()}` : ''}`

    return {
      allDates: t('common.dateRange.allDates'),
      upcoming: t('common.dateRange.upcoming'),
      past: t('common.dateRange.past'),
      custom: t('common.dateRange.custom'),
      from: t('bookings.dateFrom'),
      to: t('bookings.dateTo'),
      presets,

      /*
       * A hand-picked range, with everything the two ends already agree on said
       * only once.
       *
       * Spelled out in full, a range is "31 Aug 2026 – 6 Sep 2026" — long enough
       * to be truncated by the trigger it has to fit inside, which turns a
       * precise filter into an unreadable one. Collapsing the shared parts gets
       * the common cases down to "31 Aug – 6 Sep" or "3–10 Sep" without dropping
       * anything a reader needs, and the year reappears the moment it stops
       * being the current one, because a range in another year is exactly when
       * it matters.
       */
      formatRange: (from: string, to: string) => {
        const a = parse(from)
        const b = parse(to)
        const thisYear = new Date().getFullYear()

        if (a && b) {
          const sameYear = a.getFullYear() === b.getFullYear()
          // Only safe to hide the year when BOTH ends sit in the current one.
          const hideYear = sameYear && a.getFullYear() === thisYear

          if (a.getTime() === b.getTime()) return day(a, !hideYear)
          if (sameYear && a.getMonth() === b.getMonth()) {
            // One month named once: "3–10 Sep".
            return `${a.getDate()}–${day(b, !hideYear)}`
          }
          if (sameYear) return `${day(a, false)} – ${day(b, !hideYear)}`
          return `${day(a, true)} – ${day(b, true)}`
        }

        // A one-sided range needs its preposition or it is unreadable: "3 Sep"
        // alone cannot say whether it is the start or the end. The existing
        // field labels carry it in every locale — hy reads "Սկսած 3 Սեպ" /
        // "Մինչև 3 Սեպ", which is exactly the distinction being drawn.
        if (a) return `${t('bookings.dateFrom')} ${day(a, a.getFullYear() !== thisYear)}`
        if (b) return `${t('bookings.dateTo')} ${day(b, b.getFullYear() !== thisYear)}`
        return ''
      },

      datePicker,
    }
  }, [t, datePicker])
}
