import { useCallback, useState } from 'react'
import type { LatLng } from '@/lib/geo'

export type GeoStatus = 'idle' | 'loading' | 'granted' | 'denied' | 'unavailable'

interface GeolocationState {
  status: GeoStatus
  coords: LatLng | null
  /** Imperatively request the user's position (call from a click). */
  request: () => void
  /** Forget the position (e.g. user toggles the feature off). */
  clear: () => void
  supported: boolean
}

/**
 * Thin wrapper around the browser Geolocation API. Permission-driven: nothing
 * happens until `request()` is called (typically from a user click). Surfaces
 * clear states so the UI can show idle / loading / granted / denied gracefully.
 * Free, no API key; requires a secure origin (HTTPS / localhost).
 */
export function useGeolocation(): GeolocationState {
  const supported = typeof navigator !== 'undefined' && 'geolocation' in navigator
  const [status, setStatus] = useState<GeoStatus>('idle')
  const [coords, setCoords] = useState<LatLng | null>(null)

  const request = useCallback(() => {
    if (!supported) { setStatus('unavailable'); return }
    setStatus('loading')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setStatus('granted')
      },
      (err) => {
        // 1 = PERMISSION_DENIED; others = position unavailable / timeout.
        setStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable')
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
    )
  }, [supported])

  const clear = useCallback(() => {
    setCoords(null)
    setStatus('idle')
  }, [])

  return { status, coords, request, clear, supported }
}
