// Geo helpers — pure, dependency-free. Reusable across the client app.

export interface LatLng {
  lat: number
  lng: number
}

const R = 6371 // Earth radius in km
const toRad = (deg: number) => (deg * Math.PI) / 180

/** Great-circle distance between two points, in kilometres (Haversine). */
export function distanceKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Human-friendly distance: "850 m" under 1 km, else "1.2 km". */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1)} km`
}
