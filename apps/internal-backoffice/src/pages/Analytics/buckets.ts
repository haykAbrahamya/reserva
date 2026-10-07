import type { AnalyticsOverview } from '@/services/analytics.service'
import {
  daysInclusive, endOfMonth, fmtDay, fmtDayLong, fmtMonthLong, fmtMonthShort, fmtSpan, startOfMonth, startOfWeek,
} from './range'

type Day = AnalyticsOverview['series'][number]

export type Granularity = 'day' | 'week' | 'month'

/** One plotted point: a day, or a week / month added up from days. */
export interface ChartPoint {
  /** First day of the bucket that lies inside the range. */
  start: string
  /** Last day of the bucket that lies inside the range. */
  end: string
  /** True when the range cuts the bucket short (a week begun mid-range,
   *  the month still in progress) — its totals cover fewer days. */
  partial: boolean
  /** "3 of 7 days" for a partial bucket. */
  note?: string
  /** X-axis label. */
  axis: string
  /** Tooltip heading: the bucket's date span. */
  title: string
  visitors: number
  sessions: number
  pageViews: number
  bookings: number
}

/**
 * How finely to plot. The API's series is always daily; past ~4 months 1,000
 * daily points turn the chart into noise, so they are added up client-side:
 * daily up to 120 days, weekly (Monday-start) up to 730, monthly beyond.
 */
export function granularityFor(days: number): Granularity {
  return days <= 120 ? 'day' : days <= 730 ? 'week' : 'month'
}

/**
 * Adds days up into buckets. Visitors are summed per day — the daily series
 * cannot tell whether Monday's visitor came back on Tuesday — so a weekly or
 * monthly "visitors" figure counts a returning visitor once per day.
 */
export function bucketSeries(series: Day[], gran: Granularity): ChartPoint[] {
  const multiYear = series.length > 0 && series[0].date.slice(0, 4) !== series[series.length - 1].date.slice(0, 4)
  const groups: { key: string; days: Day[] }[] = []
  for (const d of series) {
    const key = gran === 'day' ? d.date : gran === 'week' ? startOfWeek(d.date) : startOfMonth(d.date)
    const last = groups[groups.length - 1]
    if (last && last.key === key) last.days.push(d)
    else groups.push({ key, days: [d] })
  }

  return groups.map(({ key, days }) => {
    const start = days[0].date
    const end = days[days.length - 1].date
    const full = gran === 'day' ? 1 : gran === 'week' ? 7 : daysInclusive(key, endOfMonth(key))
    const partial = days.length < full
    const sum = (k: 'visitors' | 'sessions' | 'pageViews' | 'bookings') => days.reduce((acc, d) => acc + d[k], 0)

    let axis: string
    let title: string
    if (gran === 'day') {
      axis = fmtDay(start)
      title = fmtDayLong(start)
    } else if (gran === 'week') {
      // Labelled by the first day actually in range, so an edge week never
      // names a day the range does not include.
      axis = multiYear ? `${fmtDay(start)} ’${start.slice(2, 4)}` : fmtDay(start)
      title = fmtSpan(start, end)
    } else {
      axis = fmtMonthShort(key)
      title = partial ? fmtSpan(start, end) : fmtMonthLong(key)
    }

    return {
      start,
      end,
      partial,
      note: partial ? `${days.length} of ${full} days` : undefined,
      axis,
      title,
      visitors: sum('visitors'),
      sessions: sum('sessions'),
      pageViews: sum('pageViews'),
      bookings: sum('bookings'),
    }
  })
}
