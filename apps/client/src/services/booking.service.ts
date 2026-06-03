import type { Booking, Service, Specialist } from '@reserva/shared'
import { PARTNERS, type PublicPartner } from '@/mock/partners'

const delay = (ms = 300) => new Promise(r => setTimeout(r, ms))

/** Looks up a partner by its public slug. */
export async function getPartnerBySlug(slug: string): Promise<PublicPartner | null> {
  await delay(250)
  return PARTNERS.find(p => p.slug === slug) ?? null
}

/**
 * Specialists at this partner who can perform the given service and are active.
 * When `locationId` is provided, only specialists at that branch are returned.
 */
export function specialistsForService(
  partner: PublicPartner,
  serviceId: string,
  locationId?: string | null,
): Specialist[] {
  return partner.specialists.filter(sp =>
    sp.active &&
    sp.services.includes(serviceId) &&
    (!locationId || sp.locationId === locationId)
  )
}

/** Services a given specialist can perform (active only). */
export function servicesForSpecialist(partner: PublicPartner, specialist: Specialist): Service[] {
  return partner.services.filter(sv => sv.active && specialist.services.includes(sv.id))
}

export interface SlotQuery {
  partner: PublicPartner
  service: Service
  /** Specific specialist, or null for "any available". */
  specialistId: string | null
  /** Chosen branch, or null for single-location salons. */
  locationId: string | null
  /** 'YYYY-MM-DD' */
  date: string
}

/**
 * Generates available time slots for a date. In MVP we use a fixed daily
 * window (10:00–19:00) and just block out slots that already look "taken"
 * via a deterministic pseudo-random pattern so the UI feels real.
 */
export async function getAvailableSlots(q: SlotQuery): Promise<string[]> {
  await delay(350)

  const DAY_START = 10 * 60 // 10:00
  const DAY_END = 19 * 60   // 19:00
  const STEP = 30           // 30-min granularity

  const slots: string[] = []
  const dayKey = hashString(`${q.partner.id}-${q.locationId ?? 'all'}-${q.specialistId ?? 'any'}-${q.date}`)

  for (let m = DAY_START; m + q.service.duration <= DAY_END; m += STEP) {
    const h = Math.floor(m / 60)
    const min = m % 60
    const label = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`

    // Deterministically "block" ~30% of slots so availability looks lived-in.
    const seed = (dayKey + m) % 10
    if (seed < 3) continue

    // Past-time guard if the date is today.
    if (isToday(q.date)) {
      const now = new Date()
      if (m <= now.getHours() * 60 + now.getMinutes()) continue
    }

    slots.push(label)
  }

  return slots
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
}

/** Mock booking creation — returns a confirmed booking object. */
export async function createBooking(input: CreateBookingInput): Promise<Booking> {
  await delay(700)

  const [h, m] = input.time.split(':').map(Number)
  const start = new Date(`${input.date}T00:00:00`)
  start.setHours(h, m, 0, 0)
  const end = new Date(start.getTime() + input.service.duration * 60_000)

  // If "any specialist", auto-assign the first one at the branch who can do it.
  const specialistId =
    input.specialistId ??
    specialistsForService(input.partner, input.service.id, input.locationId)[0]?.id ??
    ''

  const specialist = input.partner.specialists.find(sp => sp.id === specialistId)
  const locationId =
    input.locationId ??
    specialist?.locationId ??
    input.partner.locations[0]?.id ??
    ''

  return {
    id: `bk-${Date.now()}`,
    partnerId: input.partner.id,
    locationId,
    specialistId,
    serviceId: input.service.id,
    clientName: input.clientName,
    clientPhone: input.clientPhone,
    startISO: start.toISOString(),
    endISO: end.toISOString(),
    status: 'confirmed',
    notes: input.notes,
  }
}

// ── helpers ──
function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function isToday(dateStr: string): boolean {
  const d = new Date(`${dateStr}T00:00:00`)
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}
