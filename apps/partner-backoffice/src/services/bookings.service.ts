import type { Booking, BookingStatus } from '@/types'
import { BOOKINGS } from '@/mock/data'

// In-memory store — swap these functions for real http calls later
let _bookings = [...BOOKINGS]

const delay = (ms = 300) => new Promise(r => setTimeout(r, ms))

export const bookingsService = {
  async list(partnerId: string): Promise<Booking[]> {
    await delay()
    return _bookings.filter(b => b.partnerId === partnerId)
  },

  async get(id: string): Promise<Booking | undefined> {
    await delay(100)
    return _bookings.find(b => b.id === id)
  },

  async create(data: Omit<Booking, 'id'>): Promise<Booking> {
    await delay()
    const booking: Booking = { ...data, id: `bk-${Date.now()}` }
    _bookings.push(booking)
    return booking
  },

  async update(id: string, patch: Partial<Booking>): Promise<Booking> {
    await delay()
    _bookings = _bookings.map(b => b.id === id ? { ...b, ...patch } : b)
    return _bookings.find(b => b.id === id)!
  },

  async updateStatus(id: string, status: BookingStatus): Promise<Booking> {
    return this.update(id, { status })
  },

  async delete(id: string): Promise<void> {
    await delay()
    _bookings = _bookings.filter(b => b.id !== id)
  },
}
