// ─────────────────────────────────────────────────────────────
// Branch & specialist pricing — the same rule the server applies
// (reserva-backend: modules/pricing/resolve-offer.ts). Keep in step.
//
//   specialist's own price at this branch → branch price → service default
//
// The PRICE moves as one unit (type + amount + ceiling). DURATION falls back
// on its own. CAPACITY (sauna, pool) only exists per branch.
// ─────────────────────────────────────────────────────────────
import type {
  Booking,
  Service,
  ServiceBranchSetting,
  ServicePriceType,
  Specialist,
  SpecialistPrice,
} from '../types'
import type { PricedService } from './format'

export type PriceSource = 'service' | 'branch' | 'specialist'

/** The service fields the rule reads (its defaults). */
export type OfferService = Pick<Service, 'id' | 'price' | 'priceType' | 'priceMax' | 'duration' | 'capacity' | 'hidePrice'>

/** What one booking costs and takes, and where each value came from. */
export interface Offer {
  priceType: ServicePriceType
  /** Null only when the service hides its price on a public payload. */
  price: number | null
  priceMax: number | null
  duration: number
  capacity: number
  hidePrice: boolean
  priceSource: PriceSource
  durationSource: PriceSource
}

type Override = Pick<SpecialistPrice, 'priceType' | 'price' | 'priceMax' | 'duration'>
type BranchRow = Omit<ServiceBranchSetting, 'locationId'>

/**
 * Resolve one combination. "Is there a price override" is decided by the TYPE:
 * on a public payload a hidden price arrives as `price: null` with its type
 * kept (the server redacts the amount), and the amount simply stays null. In
 * the backoffice the amounts are always real, hidden or not.
 */
export function resolveOffer(service: OfferService, branch?: BranchRow | null, own?: Override | null): Offer {
  const overrides = (o: Override | null | undefined) => !!o && o.priceType != null

  let source: PriceSource = 'service'
  let priceType: ServicePriceType = service.priceType ?? 'fixed'
  let price: number | null = service.price
  let priceMax: number | null = service.priceMax ?? null
  if (overrides(own)) {
    source = 'specialist'
    priceType = own!.priceType as ServicePriceType
    price = own!.price
    priceMax = own!.priceMax
  } else if (overrides(branch)) {
    source = 'branch'
    priceType = branch!.priceType as ServicePriceType
    price = branch!.price
    priceMax = branch!.priceMax
  }

  const durationSource: PriceSource =
    own?.duration != null ? 'specialist' : branch?.duration != null ? 'branch' : 'service'

  return {
    priceType,
    price,
    priceMax: priceType === 'range' ? (priceMax ?? null) : null,
    duration: own?.duration ?? branch?.duration ?? service.duration,
    capacity: branch?.capacity ?? service.capacity ?? 1,
    hidePrice: !!service.hidePrice,
    priceSource: source,
    durationSource,
  }
}

/**
 * A partner's overrides, indexed for quick lookups. Build it once per payload
 * (`PriceBook.fromPartner`) or from the backoffice's `/pricing` rows.
 */
export class PriceBook {
  private readonly branches = new Map<string, BranchRow>()
  private readonly own = new Map<string, Override>()

  constructor(
    branchRows: (ServiceBranchSetting & { serviceId: string })[] = [],
    ownRows: SpecialistPrice[] = [],
  ) {
    for (const r of branchRows) this.branches.set(`${r.locationId}|${r.serviceId}`, r)
    for (const r of ownRows) this.own.set(`${r.specialistId}|${r.locationId}|${r.serviceId}`, r)
  }

  /** From a public partner payload (services[].branchSettings + specialistPrices). */
  static fromPartner(partner: { services: Service[]; specialistPrices?: SpecialistPrice[] }): PriceBook {
    const branchRows = partner.services.flatMap((s) =>
      (s.branchSettings ?? []).map((b) => ({ ...b, serviceId: s.id })),
    )
    return new PriceBook(branchRows, partner.specialistPrices ?? [])
  }

  /** True when the partner has no overrides at all — every price is the service's own. */
  get isEmpty(): boolean {
    return this.branches.size === 0 && this.own.size === 0
  }

  branch(locationId: string, serviceId: string): BranchRow | null {
    return this.branches.get(`${locationId}|${serviceId}`) ?? null
  }

  ownPrice(specialistId: string, locationId: string, serviceId: string): Override | null {
    return this.own.get(`${specialistId}|${locationId}|${serviceId}`) ?? null
  }

  /** Whether the branch offers the service. No entry = offered. */
  offered(locationId: string, serviceId: string): boolean {
    return this.branch(locationId, serviceId)?.offered ?? true
  }

  offer(service: OfferService, locationId: string, specialistId?: string | null): Offer {
    return resolveOffer(
      service,
      this.branch(locationId, service.id),
      specialistId ? this.ownPrice(specialistId, locationId, service.id) : null,
    )
  }
}

// ── Specialists & branches ───────────────────────────────────

/** Every branch a specialist works at, home first (tolerates older payloads). */
export function specialistBranchIds(sp: Pick<Specialist, 'locationId' | 'locationIds'>): string[] {
  return sp.locationIds?.length ? sp.locationIds : [sp.locationId]
}

/** Whether a specialist works at a branch. */
export function worksAt(sp: Pick<Specialist, 'locationId' | 'locationIds'>, locationId: string): boolean {
  return specialistBranchIds(sp).includes(locationId)
}

// ── Spans: what a list shows when prices differ ──────────────

/** The range covered by several offers, ready for `fmtServicePrice`. */
export interface OfferSpan extends PricedService {
  priceType: ServicePriceType
  /** True when the offers don't all cost the same. */
  varies: boolean
  durationMin: number
  durationMax: number
}

/**
 * Collapse several offers (the specialists who do a service at a branch) into
 * one displayable price: the exact price when they all agree, else "min – max"
 * (or "from min" when any of them is open-ended). Null for no offers.
 */
export function spanOf(offers: Offer[]): OfferSpan | null {
  if (offers.length === 0) return null
  const durations = offers.map((o) => o.duration)
  const durationMin = Math.min(...durations)
  const durationMax = Math.max(...durations)
  // One service's offers share its hide-price switch; carry it through so
  // `hasPublicPrice` / `fmtServicePrice` keep withholding it on public pages.
  const hidePrice = offers.some((o) => o.hidePrice)
  const priced = offers.filter((o) => o.price != null)
  if (priced.length === 0) {
    return { price: null, priceType: 'fixed', priceMax: null, hidePrice: true, varies: false, durationMin, durationMax }
  }

  // Everyone charges the same (fixed or the same range): show exactly that.
  const first = priced[0]
  const identical = priced.every(
    (o) => o.priceType === first.priceType && o.price === first.price && (o.priceMax ?? null) === (first.priceMax ?? null),
  )
  if (identical) {
    return {
      price: first.price,
      priceType: first.priceType,
      priceMax: first.priceType === 'range' ? (first.priceMax ?? null) : null,
      hidePrice,
      varies: false,
      durationMin,
      durationMax,
    }
  }

  const min = Math.min(...priced.map((o) => o.price as number))
  const max = Math.max(...priced.map((o) => (o.priceType === 'range' ? (o.priceMax ?? (o.price as number)) : (o.price as number))))
  // An open-ended range has no ceiling, so neither does the span ("from 5 000").
  const openEnded = priced.some((o) => o.priceType === 'range' && o.priceMax == null)
  return { price: min, priceType: 'range', priceMax: openEnded ? null : max, hidePrice, varies: true, durationMin, durationMax }
}

/**
 * One amount for a booking, for compact rows and revenue: the exact final price
 * once captured, else the (lower-bound) price it was booked at. Bookings made
 * before snapshots existed fall back to the joined service price.
 */
export function bookingAmount(
  b: Pick<Booking, 'finalPrice' | 'priceAtBooking' | 'service'>,
): number | null {
  return b.finalPrice ?? b.priceAtBooking ?? b.service?.price ?? null
}

/** How long a booking actually is (its own start/end — never today's service duration). */
export function bookingMinutes(b: Pick<Booking, 'startISO' | 'endISO'>): number {
  return Math.max(0, Math.round((new Date(b.endISO).getTime() - new Date(b.startISO).getTime()) / 60_000))
}

/** The price type a booking was made with (older bookings: the service's). */
export function bookingPriceType(b: Pick<Booking, 'priceTypeAtBooking' | 'service'>): ServicePriceType {
  return b.priceTypeAtBooking ?? b.service?.priceType ?? 'fixed'
}

/**
 * What a booking costs, as recorded on the booking itself — never today's
 * catalog price, which may have changed since. Ready for `fmtServicePrice`.
 */
export function bookingPrice(
  b: Pick<Booking, 'priceAtBooking' | 'priceMaxAtBooking' | 'priceTypeAtBooking' | 'finalPrice' | 'service'>,
): PricedService {
  if (b.finalPrice != null) return { price: b.finalPrice, priceType: 'fixed' }
  if (b.priceAtBooking != null) {
    return { price: b.priceAtBooking, priceType: bookingPriceType(b), priceMax: b.priceMaxAtBooking ?? null }
  }
  // Very old rows without a snapshot: the joined service is all there is.
  return b.service
    ? { price: b.service.price, priceType: b.service.priceType ?? 'fixed', priceMax: b.service.priceMax ?? null }
    : { price: null }
}
