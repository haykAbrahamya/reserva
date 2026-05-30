import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Partner, Booking } from '@/types'

interface AppState {
  partnerId: string
  theme: 'light' | 'dark'
  density: 'compact' | 'default' | 'comfy'
  sidebarCollapsed: boolean
  partners: Partner[]
  bookings: Booking[]

  setPartnerId: (id: string) => void
  setTheme: (t: 'light' | 'dark') => void
  setDensity: (d: 'compact' | 'default' | 'comfy') => void
  setSidebarCollapsed: (v: boolean) => void
  setPartners: (p: Partner[]) => void
  setBookings: (b: Booking[]) => void
  upsertBooking: (b: Booking) => void
  removeBooking: (id: string) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      partnerId: 'antheris',
      theme: 'light',
      density: 'default',
      sidebarCollapsed: false,
      partners: [],
      bookings: [],

      setPartnerId: (id) => set({ partnerId: id }),
      setTheme: (theme) => set({ theme }),
      setDensity: (density) => set({ density }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setPartners: (partners) => set({ partners }),
      setBookings: (bookings) => set({ bookings }),
      upsertBooking: (b) => set(s => ({
        bookings: s.bookings.some(x => x.id === b.id)
          ? s.bookings.map(x => x.id === b.id ? b : x)
          : [...s.bookings, b]
      })),
      removeBooking: (id) => set(s => ({ bookings: s.bookings.filter(b => b.id !== id) })),
    }),
    {
      name: 'reserva-bo',
      partialize: (s) => ({ partnerId: s.partnerId, theme: s.theme, density: s.density, sidebarCollapsed: s.sidebarCollapsed }),
    }
  )
)

export const usePartner = () => {
  const { partners, partnerId } = useAppStore()
  return partners.find(p => p.id === partnerId) ?? null
}
