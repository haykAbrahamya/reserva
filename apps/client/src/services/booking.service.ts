import type { Booking, Service, Specialist, LocalizedText } from '@reserva/shared'
import type { PublicPartner, PartnerPresentation, PublicCourse } from '@/mock/partners'

/** Raw course shape from the API (cover url is a server path resolved below). */
type ApiCourse = Omit<PublicCourse, 'coverUrl' | 'tutorSpecialist'> & {
  coverUrl?: string
  tutorSpecialist?: (PublicCourse['tutorSpecialist'] & { avatarUrl?: string }) | null
}

// ─────────────────────────────────────────────────────────────
// Public booking API client. No auth — the client app only reads a partner by
// slug, queries availability, and creates bookings. Uses native fetch.
// ─────────────────────────────────────────────────────────────

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1'

// Uploaded gallery images may be stored as same-origin paths ("/uploads/..")
// when the backend's UPLOADS_PUBLIC_URL is unset. Those are relative to the API
// ORIGIN (not under /api/v1), so resolve them against the API origin. Absolute
// URLs (http..) are returned unchanged.
const API_ORIGIN = (() => {
  try {
    return new URL(API_URL).origin
  } catch {
    return ''
  }
})()
function resolveImageUrl(url?: string): string | undefined {
  if (!url) return undefined
  if (/^https?:\/\//i.test(url)) return url
  return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`
}

/** Resolve all image urls on a gallery/works tile (simple + before/after). */
function resolveTile<T extends { url?: string; beforeUrl?: string; afterUrl?: string }>(g: T): T {
  return { ...g, url: resolveImageUrl(g.url), beforeUrl: resolveImageUrl(g.beforeUrl), afterUrl: resolveImageUrl(g.afterUrl) }
}

class BookingApiError extends Error {
  constructor(readonly code: string, message: string) {
    super(message)
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  const json = await res.json().catch(() => null)
  if (!res.ok) {
    const err = json?.error
    throw new BookingApiError(err?.code ?? 'NETWORK', err?.message ?? 'Request failed')
  }
  return (json?.data ?? json) as T
}

// ── API shapes ──
interface ApiSpecialist extends Omit<Specialist, 'services'> {
  serviceIds: string[]
}
interface ApiPartner {
  id: string
  name: string
  slug: string
  type: string
  accent: string
  bookingsEnabled?: boolean
  kind?: 'salon' | 'single'
  template?: 'classic' | 'tabbed'
  locations: PublicPartner['locations']
  services: Service[]
  specialists: ApiSpecialist[]
  courses?: ApiCourse[]
  presentation: {
    tagline: string
    taglineI18n?: LocalizedText | null
    about: string
    aboutI18n?: LocalizedText | null
    logoUrl?: string;
    hours: string
    instagram?: string
    facebook?: string
    whatsapp?: string
    rating: number | string
    reviews: number
    heroTints: string[]
    gallery: ApiGalleryTile[]
    works?: ApiGalleryTile[]
  } | null
}
type ApiGalleryTile = { type?: 'simple' | 'beforeAfter'; url?: string; beforeUrl?: string; afterUrl?: string; label?: string; tone?: string }

function toPublicPartner(p: ApiPartner): PublicPartner {
  const presentation: PartnerPresentation = {
    tagline: p.presentation?.tagline ?? '',
    taglineI18n: p.presentation?.taglineI18n ?? null,
    about: p.presentation?.about ?? '',
    aboutI18n: p.presentation?.aboutI18n ?? null,
    rating: Number(p.presentation?.rating ?? 0),
    reviews: p.presentation?.reviews ?? 0,
    logoUrl: resolveImageUrl(p.presentation?.logoUrl),
    hours: p.presentation?.hours ?? '',
    instagram: p.presentation?.instagram || undefined,
    facebook: p.presentation?.facebook || undefined,
    whatsapp: p.presentation?.whatsapp || undefined,
    heroTints: (p.presentation?.heroTints?.length
      ? (p.presentation.heroTints.slice(0, 2) as [string, string])
      : [p.accent, p.accent]) as [string, string],
    gallery: (p.presentation?.gallery ?? []).map(resolveTile),
    works: (p.presentation?.works ?? []).map(resolveTile),
  }
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    type: p.type,
    accent: p.accent,
    // Default to true when the API omits it (older payloads / safety).
    bookingsEnabled: p.bookingsEnabled !== false,
    kind: p.kind === 'single' ? 'single' : 'salon',
    // Unknown/missing template → classic (safe fallback for old payloads/rollback).
    template: p.template === 'tabbed' ? 'tabbed' : 'classic',
    locations: p.locations,
    services: p.services.map((sv) => ({ ...sv, priceType: sv.priceType, priceMax: sv.priceMax })),
    specialists: p.specialists.map(({ serviceIds, ...rest }) => ({ ...rest, services: serviceIds })),
    courses: (p.courses ?? []).map(toPublicCourse),
    presentation,
  }
}

/** Resolve a course's server-relative image paths for the client. */
function toPublicCourse(c: ApiCourse): PublicCourse {
  return {
    ...c,
    coverUrl: resolveImageUrl(c.coverUrl) ?? '',
    tutorSpecialist: c.tutorSpecialist
      ? { ...c.tutorSpecialist, avatarUrl: resolveImageUrl(c.tutorSpecialist.avatarUrl) }
      : null,
  }
}

/** Looks up a partner by its public slug. Returns null if not found. */
export async function getPartnerBySlug(slug: string): Promise<PublicPartner | null> {
  try {
    const p = await api<ApiPartner>(`/public/partners/${encodeURIComponent(slug)}`)
    return toPublicPartner(p)
  } catch (e) {
    if (e instanceof BookingApiError && e.code === 'NOT_FOUND') return null
    throw e
  }
}

// ── Pure helpers (operate on the loaded partner; unchanged) ──

export function specialistsForService(
  partner: PublicPartner,
  serviceId: string,
  locationId?: string | null,
): Specialist[] {
  return partner.specialists.filter(
    (sp) =>
      sp.active &&
      sp.services.includes(serviceId) &&
      (!locationId || sp.locationId === locationId),
  )
}

/**
 * Branches that are actually bookable: a location is functional only when it has
 * at least one ACTIVE specialist (otherwise nothing can be booked there). Used
 * everywhere the public page lists or COUNTS locations, so the hero count, the
 * About facts, the Locations section and the booking flow all agree.
 */
export function bookableLocations(partner: PublicPartner): PublicPartner['locations'] {
  return partner.locations.filter((loc) =>
    partner.specialists.some((sp) => sp.active && sp.locationId === loc.id),
  )
}

export function servicesForSpecialist(partner: PublicPartner, specialist: Specialist): Service[] {
  return partner.services.filter((sv) => sv.active && specialist.services.includes(sv.id))
}

/** True when the salon accepts online bookings; false = contact-only page. */
export function canBook(partner: Pick<PublicPartner, 'bookingsEnabled'>): boolean {
  return partner.bookingsEnabled !== false
}

/** The partner's primary public phone (first bookable branch, else first branch). */
export function partnerPhone(partner: PublicPartner): string | null {
  const loc = bookableLocations(partner)[0] ?? partner.locations[0]
  return loc?.phone || null
}

/** `tel:` href for the primary phone, or null when no phone is known. */
export function partnerTelHref(partner: PublicPartner): string | null {
  const phone = partnerPhone(partner)
  return phone ? `tel:${phone.replace(/\s/g, '')}` : null
}

// ── Availability + booking ──

export interface SlotQuery {
  partner: PublicPartner
  service: Service
  specialistId: string | null
  locationId: string | null
  date: string
}

export async function getAvailableSlots(q: SlotQuery): Promise<string[]> {
  const params = new URLSearchParams({ serviceId: q.service.id, date: q.date })
  if (q.specialistId) params.set('specialistId', q.specialistId)
  if (q.locationId) params.set('locationId', q.locationId)
  return api<string[]>(`/public/partners/${q.partner.slug}/slots?${params.toString()}`)
}

/** One day's availability signal for the booking day-strip. */
export interface DayAvailability {
  date: string
  closed: boolean
  openDots: 0 | 1 | 2 | 3
}

export interface AvailabilitySummaryQuery {
  partner: PublicPartner
  service: Service
  specialistId: string | null
  locationId: string | null
  /** First day (yyyy-mm-dd) of the window. */
  from: string
  /** Number of days to summarize (server clamps; the strip uses 7). */
  days?: number
}

/** Per-day availability density for the day-strip. Newest booking logic reused
 *  server-side; here we just fetch the compact per-day buckets. */
export async function getAvailabilitySummary(q: AvailabilitySummaryQuery): Promise<DayAvailability[]> {
  const params = new URLSearchParams({ serviceId: q.service.id, from: q.from })
  if (q.specialistId) params.set('specialistId', q.specialistId)
  if (q.locationId) params.set('locationId', q.locationId)
  if (q.days) params.set('days', String(q.days))
  return api<DayAvailability[]>(`/public/partners/${q.partner.slug}/availability-summary?${params.toString()}`)
}

export interface CreateBookingInput {
  partner: PublicPartner
  service: Service
  specialistId: string | null
  locationId: string | null
  date: string
  time: string
  clientName: string
  clientPhone: string
  notes?: string
  /** UI language the booking was made in, for localized reminders. */
  locale?: string
}

export async function createBooking(input: CreateBookingInput): Promise<Booking> {
  const body = {
    serviceId: input.service.id,
    specialistId: input.specialistId ?? undefined,
    locationId: input.locationId ?? undefined,
    date: input.date,
    time: input.time,
    clientName: input.clientName,
    clientPhone: input.clientPhone,
    notes: input.notes,
    locale: input.locale,
  }
  const b = await api<{
    id: string
    partnerId: string
    locationId: string
    specialistId: string | null
    serviceId: string
    clientName: string
    clientPhone: string
    startAt: string
    endAt: string
    status: Booking['status']
    notes?: string | null
  }>(`/public/partners/${input.partner.slug}/bookings`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return {
    id: b.id,
    partnerId: b.partnerId,
    locationId: b.locationId,
    specialistId: b.specialistId,
    serviceId: b.serviceId,
    clientName: b.clientName,
    clientPhone: b.clientPhone,
    startISO: b.startAt,
    endISO: b.endAt,
    status: b.status,
    notes: b.notes ?? undefined,
  }
}

// ── Course registration (public) ──

export interface CourseRegisterInput {
  slug: string
  courseId: string
  memberName: string
  memberPhone: string
  memberEmail?: string
  locale?: 'en' | 'hy' | 'ru'
}

/** Register for a course from the public page. Lands as a PENDING enrollment the
 *  salon confirms. Returns the resulting status. Errors surface via BookingApiError
 *  (COURSE_FULL / ENROLLMENT_CLOSED / ALREADY_ENROLLED). */
export async function registerForCourse(
  input: CourseRegisterInput,
): Promise<{ status: string }> {
  return api<{ status: string }>(`/public/partners/${input.slug}/courses/register`, {
    method: 'POST',
    body: JSON.stringify({
      courseId: input.courseId,
      memberName: input.memberName,
      memberPhone: input.memberPhone,
      memberEmail: input.memberEmail,
      locale: input.locale,
    }),
  })
}

// ── Specialist reviews (public) ──

export interface SpecialistReview {
  id: string
  author: string
  rating: number
  text: string
  createdAt: string
}

/** One page of reviews + the cursor for the next page (null when at the end). */
export interface SpecialistReviewPage {
  items: SpecialistReview[]
  nextCursor: string | null
}

/**
 * Fetch a page of a specialist's public reviews (newest first). Pass the previous
 * page's `nextCursor` to load the next page; omit it for the first page.
 */
export function getSpecialistReviews(
  slug: string,
  specialistId: string,
  opts: { cursor?: string; take?: number } = {},
): Promise<SpecialistReviewPage> {
  const qs = new URLSearchParams()
  if (opts.cursor) qs.set('cursor', opts.cursor)
  if (opts.take) qs.set('take', String(opts.take))
  const query = qs.toString()
  return api<SpecialistReviewPage>(
    `/public/partners/${encodeURIComponent(slug)}/specialists/${encodeURIComponent(specialistId)}/reviews${query ? `?${query}` : ''}`,
  )
}

export interface CreateReviewInput {
  /** Reviewer name; blank → shown as "Anonymous". */
  author?: string
  /** 1–5 stars (required). */
  rating: number
  /** Optional free-text comment. */
  text?: string
}

/** Submit a public review for a specialist. */
export function createSpecialistReview(
  slug: string,
  specialistId: string,
  input: CreateReviewInput,
): Promise<SpecialistReview> {
  return api<SpecialistReview>(
    `/public/partners/${encodeURIComponent(slug)}/specialists/${encodeURIComponent(specialistId)}/reviews`,
    { method: 'POST', body: JSON.stringify(input) },
  )
}

export { BookingApiError }
