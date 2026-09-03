import type { LocalizedText } from '@reserva/shared'
import type { PayType, VacancyCard } from '@/api/types'
import { AMD_SIGN, fmtAmountRange, fmtPercentRange } from './money'

// ─────────────────────────────────────────────────────────────
// Turning a listing row into the handful of facts a card shows.
//
// Kept out of the components so the card, the detail header and the share
// preview cannot disagree about what a listing pays — the one number everything
// here exists to get right.
// ─────────────────────────────────────────────────────────────

type Localizer = (base: string, i18n?: LocalizedText | null) => string

/**
 * The headline for a listing.
 *
 * A salon may write its own ("Senior colourist, evenings"), and most do not —
 * in which case the specialty's ROLE name is the title, because a vacancy is
 * about a person ("Colourist"), not about the work ("Hair colouring"). Falling
 * back to the work name would produce cards titled like a price list.
 */
export function roleTitle(v: VacancyCard, loc: Localizer): string {
  const own = loc(v.title, v.titleI18n).trim()
  if (own) return own
  return loc(v.specialty.roleName, v.specialty.roleNameI18n)
}

/** The place, as one readable line: "Arabkir, Yerevan". */
export function placeLabel(v: VacancyCard, loc: Localizer): string {
  const area = v.branch.area
  if (!area) return loc(v.branch.name, v.branch.nameI18n)
  const own = loc(area.name, area.nameI18n)
  const parent = area.parent ? loc(area.parent.name, area.parent.nameI18n) : ''
  // A district needs its city; a city on its own is already unambiguous.
  return parent && parent !== own ? `${own}, ${parent}` : own
}

/**
 * What share the PROFESSIONAL keeps, derived from the salon's.
 *
 * The database stores the salon's cut, because that is what a salon owner types
 * and it makes "60/40" unambiguous in the backoffice. But this app's reader is
 * the other side of that split, and asking them to compute 100 minus a number
 * is exactly the friction that makes a listing get skipped.
 *
 * Inverting a BAND also reverses it: a salon keeping 40-50% leaves the
 * professional 50-60%, so the ends swap. Getting that backwards would advertise
 * the worst case as the best.
 */
export function professionalShare(v: VacancyCard): { low: number; high: number | null } | null {
  if (v.payType !== 'percentage' || v.salonPercent == null) return null
  const salonLow = v.salonPercent
  const salonHigh = v.salonPercentMax ?? v.salonPercent
  return { low: 100 - salonHigh, high: salonHigh === salonLow ? null : 100 - salonLow }
}

/** Which colour family the money badge uses. Keys into --pay-* in theme.css. */
export function payTone(payType: PayType): 'salary' | 'rent' | 'percent' | 'open' {
  if (payType === 'salary') return 'salary'
  if (payType === 'rent') return 'rent'
  if (payType === 'percentage') return 'percent'
  return 'open'
}

export interface PaySummary {
  /** The DIGITS of the figure. Empty for a negotiable listing. */
  value: string
  /**
   * The unit, separate from the digits.
   *
   * A dram sign or a percent set at the same size and weight as the number
   * competes with it, and the number is the one thing on a card that has to be
   * read first. Kept apart so it can be rendered smaller and lighter.
   */
  unit: string
  /** What the figure means: "per month", "your share", "chair rent". */
  caption: string
  tone: ReturnType<typeof payTone>
}

/**
 * The money block, resolved to display strings.
 *
 * Takes `t` rather than reaching for the i18n context, so this stays a pure
 * function that a test can call and a card cannot accidentally make async.
 */
export function paySummary(v: VacancyCard, t: (key: string) => string): PaySummary {
  const tone = payTone(v.payType)

  if (v.payType === 'salary' && v.amount != null) {
    return {
      value: fmtAmountRange(v.amount, v.amountMax),
      unit: AMD_SIGN,
      caption: t(`pay.period.${v.payPeriod}`),
      tone,
    }
  }

  if (v.payType === 'rent' && v.amount != null) {
    return {
      value: fmtAmountRange(v.amount, v.amountMax),
      unit: AMD_SIGN,
      // Names the direction of the money. A rent and a salary look identical as
      // a figure, and confusing them is the worst mistake this card can make.
      caption: t('pay.rentCaption'),
      tone,
    }
  }

  const share = professionalShare(v)
  if (share) {
    return {
      value: fmtPercentRange(share.low, share.high),
      unit: '%',
      caption: t('pay.shareCaption'),
      tone,
    }
  }

  return { value: '', unit: '', caption: t('pay.type.negotiable'), tone }
}

// ── Perks ────────────────────────────────────────────────────

/**
 * Two lists, not one.
 *
 * "Materials included" is something the salon GIVES; "own client base" is
 * something it DEMANDS. Rendered in one row of identical chips they read as
 * eleven benefits, and a professional discovers the requirement only after
 * calling. The vocabulary itself is a backend constant; this split and its
 * wording are ours, exactly as vacancy-perks.ts says.
 */
const EXPECTED_PERKS = new Set(['own-client-base', 'own-tools'])

/** Display order: the perks people decide on first. */
const PERK_ORDER = [
  'materials-included',
  'client-base-provided',
  'official-contract',
  'tools-provided',
  'online-booking',
  'training-provided',
  'flexible-schedule',
  'uniform-provided',
  'meals',
  'parking',
  'transport',
]

const rank = (key: string) => {
  const i = PERK_ORDER.indexOf(key)
  return i === -1 ? PERK_ORDER.length : i
}

export interface PerkSplit {
  offered: string[]
  expected: string[]
}

export function splitPerks(perks: string[]): PerkSplit {
  const offered: string[] = []
  const expected: string[] = []
  for (const p of perks) (EXPECTED_PERKS.has(p) ? expected : offered).push(p)
  return { offered: offered.sort((a, b) => rank(a) - rank(b)), expected }
}

export function isExpectedPerk(key: string): boolean {
  return EXPECTED_PERKS.has(key)
}

/** Perk keys in display order — for the filter panel, which lists them all. */
export function orderPerks(keys: string[]): string[] {
  return [...keys].sort((a, b) => {
    // Requirements last in the filter too, so the list opens with what a salon
    // offers rather than with what it wants.
    const reqDiff = Number(isExpectedPerk(a)) - Number(isExpectedPerk(b))
    return reqDiff !== 0 ? reqDiff : rank(a) - rank(b)
  })
}
