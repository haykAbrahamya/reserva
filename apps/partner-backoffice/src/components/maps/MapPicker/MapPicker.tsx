import { useEffect, useRef, useState } from 'react'
import { Search, MapPin, Loader2 } from 'lucide-react'
import { loadGoogleMaps } from '@/lib/googleMaps'
import { useT } from '@/i18n'
import s from './MapPicker.module.scss'

interface Props {
  lat?: number | null
  lng?: number | null
  /** The address text (this component owns it now — single source for the form). */
  address: string
  /** Manual edits to the address line. */
  onAddressChange: (address: string) => void
  /** Fired when the pin moves (drag / click / autocomplete pick). `address` is
   *  present only when it came from geocoding. */
  onChange: (next: { lat: number; lng: number; address?: string }) => void
}

// Default map center: Yerevan, Armenia.
const YEREVAN = { lat: 40.1792, lng: 44.4991 }

export function MapPicker({ lat, lng, address, onAddressChange, onChange }: Props) {
  const t = useT()
  const mapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  // Keep the live google objects in refs (don't re-create the map on re-render).
  const gmap = useRef<google.maps.Map | null>(null)
  const marker = useRef<google.maps.Marker | null>(null)
  const geocoder = useRef<google.maps.Geocoder | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    let cancelled = false
    loadGoogleMaps()
      .then((google) => {
        if (cancelled || !mapRef.current) return
        const hasPin = typeof lat === 'number' && typeof lng === 'number'
        const center = hasPin ? { lat: lat!, lng: lng! } : YEREVAN

        const map = new google.maps.Map(mapRef.current, {
          center,
          zoom: hasPin ? 16 : 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
        })
        const mk = new google.maps.Marker({
          map,
          position: center,
          draggable: true,
          visible: hasPin,
        })
        const gc = new google.maps.Geocoder()
        gmap.current = map
        marker.current = mk
        geocoder.current = gc

        // Reverse-geocode a position → address, then bubble up. We ALWAYS send an
        // address back (the resolved one, or a coords fallback) so a manual map
        // click never leaves the input showing the previous, now-wrong address.
        const commit = (pos: google.maps.LatLng, withAddress: boolean) => {
          const lat = pos.lat()
          const lng = pos.lng()
          if (!withAddress) { onChangeRef.current({ lat, lng }); return }
          gc.geocode({ location: pos }, (res, st) => {
            const resolved = st === 'OK' && res?.[0] ? res[0].formatted_address : undefined
            const address = resolved ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
            // Also write straight to the input so it can't desync from React /
            // Google's Autocomplete grip on the element.
            if (inputRef.current) inputRef.current.value = address
            onChangeRef.current({ lat, lng, address })
          })
        }

        // Click map → place/move pin.
        map.addListener('click', (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return
          mk.setPosition(e.latLng)
          mk.setVisible(true)
          commit(e.latLng, true)
        })
        // Drag pin → update + reverse-geocode.
        mk.addListener('dragend', () => {
          const pos = mk.getPosition()
          if (pos) commit(pos, true)
        })

        // Address autocomplete — restricted to Armenia but NOT biased to the
        // current viewport, so searches anywhere in the country (Vanadzor/Lori,
        // Gyumri, …) rank equally, not just near the Yerevan default center.
        if (inputRef.current) {
          const ac = new google.maps.places.Autocomplete(inputRef.current, {
            fields: ['geometry', 'formatted_address'],
            componentRestrictions: { country: 'am' },
          })
          ac.addListener('place_changed', () => {
            const place = ac.getPlace()
            const loc = place.geometry?.location
            if (!loc) return
            map.setCenter(loc)
            map.setZoom(16)
            mk.setPosition(loc)
            mk.setVisible(true)
            onChangeRef.current({
              lat: loc.lat(),
              lng: loc.lng(),
              address: place.formatted_address,
            })
          })
        }

        setStatus('ready')
      })
      .catch(() => { if (!cancelled) setStatus('error') })

    return () => { cancelled = true }
    // Init once; external lat/lng changes are reflected via the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reflect external lat/lng changes (e.g. form reset on edit) onto the map.
  useEffect(() => {
    if (status !== 'ready' || !gmap.current || !marker.current) return
    if (typeof lat === 'number' && typeof lng === 'number') {
      const pos = { lat, lng }
      marker.current.setPosition(pos)
      marker.current.setVisible(true)
      gmap.current.setCenter(pos)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng, status])

  // No key configured / load failed → hide the picker entirely (form still works).
  if (status === 'error') return null

  return (
    <div className={s.wrap}>
      {/* ONE input: it's the address field AND the map search (autocomplete). Its
          value stays in sync whether you type, pick a suggestion, or move the pin
          (reverse-geocode writes back here). */}
      <div className={s.searchRow}>
        <Search size={15} className={s.searchIcon} />
        <input
          ref={inputRef}
          className={s.search}
          value={address}
          onChange={(e) => onAddressChange(e.target.value)}
          placeholder={t('locations.modal.mapSearchPlaceholder')}
          onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault() }}
        />
      </div>
      <div className={s.mapBox}>
        <div ref={mapRef} className={s.map} />
        {status === 'loading' && (
          <div className={s.overlay}><Loader2 size={20} className={s.spin} /></div>
        )}
      </div>
      <div className={s.hint}>
        <MapPin size={12} /> {t('locations.modal.mapHint')}
      </div>
    </div>
  )
}
