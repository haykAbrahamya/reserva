// Public marketplace API client — lists curated salons for /salons, with search.
// No auth. Mirrors the backend SalonCard shape.

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1'

export interface SalonCard {
  id: string
  slug: string | null
  name: string
  type: string
  accent: string
  tagline: string
  rating: number
  reviews: number
  heroTints: string[]
  locations: { id: string; name: string; address: string }[]
  categories: string[]
  serviceCount: number
  specialistCount: number
}

export interface SalonSearch {
  q?: string
  service?: string
  location?: string
}

export async function listSalons(search: SalonSearch = {}, signal?: AbortSignal): Promise<SalonCard[]> {
  const params = new URLSearchParams()
  if (search.q?.trim()) params.set('q', search.q.trim())
  if (search.service?.trim()) params.set('service', search.service.trim())
  if (search.location?.trim()) params.set('location', search.location.trim())
  const qs = params.toString()

  const res = await fetch(`${API_URL}/public/salons${qs ? `?${qs}` : ''}`, { signal })
  const json = await res.json().catch(() => null)
  if (!res.ok) throw new Error(json?.error?.message ?? 'Failed to load salons')
  return (json?.data ?? json) as SalonCard[]
}
