import type { BadgeVariant } from '@reserva/ui'
import type { Vacancy, VacancyStatus } from '@/services/vacancies.service'

type T = (key: string, vars?: Record<string, string | number>) => string

/**
 * The conditions a listing advertises, split by who they bind.
 *
 * "What we offer" and "what we expect" answer different questions, and the two
 * that decide whether a professional calls at all — materials included, and
 * whether they must bring their own clientele — sit at the top of each list.
 * Keys mirror VACANCY_PERKS on the backend, which validates them.
 */
export const PERK_GROUPS: { group: 'offer' | 'require'; keys: string[] }[] = [
  {
    group: 'offer',
    keys: [
      'materials-included',
      'tools-provided',
      'client-base-provided',
      'online-booking',
      'training-provided',
      'official-contract',
      'flexible-schedule',
      'uniform-provided',
      'parking',
      'meals',
      'transport',
    ],
  },
  { group: 'require', keys: ['own-client-base', 'own-tools'] },
]

export const ALL_PERKS = PERK_GROUPS.flatMap((g) => g.keys)

/** How a status reads as a badge. Expired is a warning, not a failure — it is
 *  one click from being live again. */
export function statusVariant(status: VacancyStatus): BadgeVariant {
  if (status === 'published') return 'confirmed'
  if (status === 'draft') return 'pending'
  if (status === 'paused') return 'noshow'
  return 'inactive' // closed | expired
}

/** Thousands-separated whole drams — this currency has no minor unit. */
export function fmtAmount(value: number, locale: string, currency: string): string {
  const n = new Intl.NumberFormat(locale === 'hy' ? 'hy-AM' : locale === 'ru' ? 'ru-RU' : 'en-US').format(value)
  return currency === 'AMD' ? `${n} ֏` : `${n} ${currency}`
}

/**
 * The one line that matters most on a card.
 *
 * `salonPercent` is the salon's share, so the professional-facing sentence has
 * to be phrased from the salon's side ("salon keeps 40%") rather than silently
 * flipped — the number and the wording must never disagree.
 */
export function payLabel(v: Vacancy, t: T, locale: string): string {
  const range = (lo: number, hi: number | null, fmt: (n: number) => string) =>
    hi != null && hi !== lo ? `${fmt(lo)}–${fmt(hi)}` : fmt(lo)

  if (v.payType === 'percentage' && v.salonPercent != null) {
    return t('vacancies.pay.percentValue', {
      value: range(v.salonPercent, v.salonPercentMax, (n) => `${n}%`),
    })
  }
  if ((v.payType === 'rent' || v.payType === 'salary') && v.amount != null) {
    const money = range(v.amount, v.amountMax, (n) => fmtAmount(n, locale, v.currency))
    const per = t(`vacancies.period.${v.payPeriod}`)
    return v.payType === 'rent'
      ? t('vacancies.pay.rentValue', { value: money, period: per })
      : t('vacancies.pay.salaryValue', { value: money, period: per })
  }
  return t('vacancies.pay.negotiable')
}

/** Whole days from now, negative once past. */
export function daysUntil(iso: string | null): number | null {
  if (!iso) return null
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)
}
