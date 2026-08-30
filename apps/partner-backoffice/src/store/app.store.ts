import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Partner, LocalizedText } from '@/types'
import type { ProductKey } from '@/products/products.config'

/** One product grant, as the profile endpoint returns it. */
export interface GrantedProduct {
  key: string
  name: string
  status: 'active' | 'trialing' | 'suspended'
  plan: string | null
  trialEndsAt: string | null
  settings: Record<string, unknown>
}

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
  /** Public booking-page layout (presentation-only). Defaults to classic. */
  template?: 'classic' | 'tabbed'
  /** Backoffice FAB behavior: support chat / new booking / hidden. Default book. */
  supportWidget?: 'support' | 'book' | 'hidden'
  /** Default language for the public client page (first-time visitors). */
  defaultLocale?: 'hy' | 'en' | 'ru'
  /** Whether the Courses feature is enabled (platform-curated, read-only). */
  coursesEnabled?: boolean
  /**
   * The products this organization holds. Delivered with the profile the shell
   * already loads on boot, so navigation knows which products exist before it
   * paints — no second round trip and no flash of the wrong sections.
   */
  products?: GrantedProduct[]
  /** Public marketing fields edited in the Storefront section. */
  presentation?: {
    about?: string
    aboutI18n?: LocalizedText | null
    tagline?: string
    taglineI18n?: LocalizedText | null
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
  /**
   * The product the user last chose in the switcher. Persisted so returning to
   * the console lands where they left off. It is a PREFERENCE, not a source of
   * truth — a stale key (product revoked, or one this partner never had) is
   * ignored at read time rather than trusted, so it can never strand someone in
   * a section they cannot use.
   */
  activeProduct: ProductKey | null

  setPartnerId: (id: string) => void
  setTheme: (t: 'light' | 'dark') => void
  setDensity: (d: 'compact' | 'default' | 'comfy') => void
  setSidebarCollapsed: (v: boolean) => void
  setPartner: (p: PartnerProfile | null) => void
  setActiveProduct: (p: ProductKey | null) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      partnerId: '',
      theme: 'dark',
      density: 'default',
      sidebarCollapsed: false,
      partner: null,
      activeProduct: null,

      setPartnerId: (partnerId) => set({ partnerId }),
      setTheme: (theme) => set({ theme }),
      setDensity: (density) => set({ density }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setPartner: (partner) => set({ partner }),
      setActiveProduct: (activeProduct) => set({ activeProduct }),
    }),
    {
      name: 'reserva-bo',
      // Persist only UI prefs + the active partner id; all data is re-fetched.
      partialize: (s) => ({
        partnerId: s.partnerId,
        theme: s.theme,
        density: s.density,
        sidebarCollapsed: s.sidebarCollapsed,
        activeProduct: s.activeProduct,
      }),
    },
  ),
)

/** The current partner (identity + branding). Catalog/bookings load per page. */
export const usePartner = () => useAppStore((s) => s.partner)
