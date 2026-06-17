// Lazy, singleton loader for the Google Maps JS API (with the Places library).
// The key comes from VITE_GOOGLE_MAPS_KEY. If it's unset, `loadGoogleMaps()`
// rejects and callers fall back gracefully (the map picker hides itself), so the
// app works fine without Maps configured.
//
// Uses a classic-callback load: with the modern `loading=async` bootstrap,
// `script.onload` fires BEFORE `google.maps` (and the places library) are ready,
// which made our readiness check reject prematurely. A global callback that the
// Maps script invokes once it's fully initialized is the reliable signal.

const KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined

/** True when a key is configured — components use this to decide whether to render. */
export const mapsEnabled = !!KEY

let promise: Promise<typeof google> | null = null

// Unique global callback name the Maps script will call when ready.
const CALLBACK = '__reservaGmapsReady'

export function loadGoogleMaps(): Promise<typeof google> {
  if (!KEY) return Promise.reject(new Error('Google Maps key not configured'))
  // Already fully loaded.
  if (typeof google !== 'undefined' && google.maps && google.maps.places) {
    return Promise.resolve(google)
  }
  if (promise) return promise

  promise = new Promise<typeof google>((resolve, reject) => {
    // Maps calls this once the API + requested libraries are ready.
    ;(window as unknown as Record<string, unknown>)[CALLBACK] = () => {
      if (typeof google !== 'undefined' && google.maps) resolve(google)
      else reject(new Error('Google Maps initialized without google.maps'))
    }

    const script = document.createElement('script')
    script.src =
      `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(KEY)}` +
      `&libraries=places&callback=${CALLBACK}`
    script.async = true
    script.defer = true
    script.onerror = () => {
      promise = null
      reject(new Error('Google Maps script failed to load'))
    }
    document.head.appendChild(script)
  })
  return promise
}
