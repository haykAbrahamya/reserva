import type { ComponentProps } from 'react'
import type { Badge } from '@/components/ui'
import type { BillingStatus, PartnerBilling } from '@/services/partners.service'
import { yerevanToday } from '../Analytics/range'

type BadgeVariant = ComponentProps<typeof Badge>['variant']

/** A partner whose billing is not tracked — also what an older API, without billing, reads as. */
export const NO_BILLING: PartnerBilling = { status: 'none', trialStartedAt: null, trialEndsAt: null, paidUntil: null, dueSince: null }

/** How each billing state reads at a glance: the badge on the list, the page head and the card. */
export const BILLING_BADGE: Record<BillingStatus, { variant: BadgeVariant; label: string }> = {
  none: { variant: 'inactive', label: 'Not tracked' },
  trial: { variant: 'pending', label: 'Free trial' },
  paid: { variant: 'active', label: 'Paid' },
  due: { variant: 'cancelled', label: 'Payment due' },
}

const at = (day: string) => Date.parse(`${day}T00:00:00Z`)

/** '2026-11-14' → '14 Nov', with the year when it is not this one. */
export function fmtDay(day: string): string {
  const d = new Date(at(day))
  const thisYear = d.getUTCFullYear() === Number(yerevanToday().slice(0, 4))
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(thisYear ? {} : { year: 'numeric' }), timeZone: 'UTC' })
}

/** Whole days from today (Yerevan) to `day`: 0 today, negative before. */
export const daysFromToday = (day: string): number => Math.round((at(day) - at(yerevanToday())) / 86_400_000)

const days = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`

/** The one line under the badge: "until 15 Nov · 30 days left", "since 1 Oct · 15 days". */
export function billingSummary(b: PartnerBilling): string {
  if (b.status === 'trial' && b.trialEndsAt) {
    const left = daysFromToday(b.trialEndsAt)
    return `until ${fmtDay(b.trialEndsAt)} · ${left === 0 ? 'last day today' : `${days(left)} left`}`
  }
  if (b.status === 'paid' && b.paidUntil) return `until ${fmtDay(b.paidUntil)}`
  if (b.status === 'due' && b.dueSince) {
    const late = -daysFromToday(b.dueSince)
    return `since ${fmtDay(b.dueSince)}${late > 0 ? ` · ${days(late)}` : ' · from today'}`
  }
  return 'No trial or payment recorded yet'
}
