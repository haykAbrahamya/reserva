import { useMemo } from 'react'
import type { DatePickerLabels } from '@reserva/ui'
import { useI18n } from './I18nProvider'

/**
 * Localized labels for the shared `<DatePicker>` (month header, weekday columns,
 * Today/Clear, and the selected-value format). The UI package is English by
 * default; this feeds it the active-locale strings from our i18n bundle rather
 * than relying on `Intl`, which silently falls back to English for hy-AM in some
 * runtimes. Shared across every backoffice DatePicker so they read identically.
 */
export function useDatePickerLabels(): DatePickerLabels {
  const { t } = useI18n()
  return useMemo(() => ({
    monthNames: Array.from({ length: 12 }, (_, i) => t(`common.datePicker.monthsLong.${i}`)),
    weekdayNames: Array.from({ length: 7 }, (_, i) => t(`common.datePicker.weekdaysShort.${i}`)),
    today: t('common.datePicker.today'),
    clear: t('common.datePicker.clear'),
    formatValue: (d: Date) =>
      `${d.getDate()} ${t(`common.datePicker.monthsShort.${d.getMonth()}`)} ${d.getFullYear()}`,
  }), [t])
}
