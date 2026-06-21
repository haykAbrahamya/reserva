import type { Booking, Service, Specialist } from '@reserva/shared'
import type { PublicPartner, PartnerPresentation } from '@/mock/partners'

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
  locations: PublicPartner['locations']
  services: Service[]
  specialists: ApiSpecialist[]
  presentation: {
    tagline: string
    about: string
    hours: string
    instagram?: string
    facebook?: string
    rating: number | string
    reviews: number
    heroTints: string[]
    gallery: { url?: string; label?: string; tone?: string }[]
  } | null
}

function toPublicPartner(p: ApiPartner): PublicPartner {
  const presentation: PartnerPresentation = {
    tagline: p.presentation?.tagline ?? '',
    about: p.presentation?.about ?? '',
    rating: Number(p.presentation?.rating ?? 0),
    reviews: p.presentation?.reviews ?? 0,
    hours: p.presentation?.hours ?? '',
    instagram: p.presentation?.instagram || undefined,
    facebook: p.presentation?.facebook || undefined,
    heroTints: (p.presentation?.heroTints?.length
      ? (p.presentation.heroTints.slice(0, 2) as [string, string])
      : [p.accent, p.accent]) as [string, string],
    gallery: (p.presentation?.gallery ?? []).map((g) => ({
      ...g,
      url: resolveImageUrl(g.url),
    })),
  }
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    type: p.type,
    accent: p.accent,
    locations: p.locations,
    services: p.services,
    specialists: p.specialists.map(({ serviceIds, ...rest }) => ({ ...rest, services: serviceIds })),
    presentation,
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

export { BookingApiError }
