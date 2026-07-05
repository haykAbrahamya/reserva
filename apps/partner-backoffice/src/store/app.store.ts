import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Partner } from '@/types'

/**
 * The partner profile held in the store: identity + branding only. The catalog
 * (locations / services / specialists) and bookings are fetched per-page with
 * useResource (no global cache), so the UI always reflects current server state.
 * Typing the profile without the catalog makes any stale `partner.specialists`
 * access a compile error rather than a silent empty array.
 */
export type PartnerProfile = Omit<Partner, 'locations' | 'services' | 'specialists' | 'slug'> & {
  /** Public handle for slug.reserva.am — null until the partner sets one. */
  slug: string | null
  /** Number of active branches — provided by the API for lightweight chrome. */
  locationCount?: number
  /** When true, public bookings are auto-confirmed; else they land as pending. */
  autoConfirmBookings?: boolean
  /** When false, the public page is contact-only (booking CTAs hidden/replaced). */
  bookingsEnabled?: boolean
  /** 'salon' (team) or 'single' (solo). Drives nav/labels (hide team etc.). */
  kind?: 'salon' | 'single'
  /** Public marketing fields edited in the Storefront section. */
  presentation?: {
    about?: string
    instagram?: string
    facebook?: string
    whatsapp?: string
    /** Brand logo URL; empty/absent → fall back to the name initial. */
    logoUrl?: string
    heroTints?: string[]
    gallery?: { url?: string; label?: string; tone?: string }[]
  } | null
}

interface AppState {
  partnerId: string
  theme: 'light' | 'dark'
  density: 'compact' | 'default' | 'comfy'
  sidebarCollapsed: boolean
  partner: PartnerProfile | null

  setPartnerId: (id: string) => void
  setTheme: (t: 'light' | 'dark') => void
  setDensity: (d: 'compact' | 'default' | 'comfy') => void
  setSidebarCollapsed: (v: boolean) => void
  setPartner: (p: PartnerProfile | null) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      partnerId: '',
      theme: 'dark',
      density: 'default',
      sidebarCollapsed: false,
      partner: null,

      setPartnerId: (partnerId) => set({ partnerId }),
      setTheme: (theme) => set({ theme }),
      setDensity: (density) => set({ density }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setPartner: (partner) => set({ partner }),
    }),
    {
      name: 'reserva-bo',
      // Persist only UI prefs + the active partner id; all data is re-fetched.
      partialize: (s) => ({
        partnerId: s.partnerId,
        theme: s.theme,
        density: s.density,
        sidebarCollapsed: s.sidebarCollapsed,
      }),
    },
  ),
)

/** The current partner (identity + branding). Catalog/bookings load per page. */
export const usePartner = () => useAppStore((s) => s.partner)
