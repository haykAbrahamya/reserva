import type { Partner, Service, Specialist, SpecialistHours, Location } from '@/types'
import { PARTNERS, SPECIALIST_HOURS } from '@/mock/data'

let _partners = PARTNERS.map(p => ({ ...p, specialists: [...p.specialists], services: [...p.services], locations: [...p.locations] }))
let _hours = [...SPECIALIST_HOURS]

const delay = (ms = 200) => new Promise(r => setTimeout(r, ms))

export const partnersService = {
  async list(): Promise<Partner[]> {
    await delay()
    return _partners
  },

  async get(id: string): Promise<Partner | undefined> {
    await delay(100)
    return _partners.find(p => p.id === id)
  },

  async updateService(partnerId: string, serviceId: string, patch: Partial<Service>): Promise<void> {
    await delay()
    _partners = _partners.map(p =>
      p.id !== partnerId ? p : {
        ...p,
        services: p.services.map(s => s.id === serviceId ? { ...s, ...patch } : s)
      }
    )
  },

  async createService(partnerId: string, data: Omit<Service, 'id'>): Promise<Service> {
    await delay()
    const svc: Service = { ...data, id: `svc-${Date.now()}` }
    _partners = _partners.map(p =>
      p.id !== partnerId ? p : { ...p, services: [...p.services, svc] }
    )
    return svc
  },

  async deleteService(partnerId: string, serviceId: string): Promise<void> {
    await delay()
    _partners = _partners.map(p =>
      p.id !== partnerId ? p : { ...p, services: p.services.filter(s => s.id !== serviceId) }
    )
  },

  async updateSpecialist(partnerId: string, specialistId: string, patch: Partial<Specialist>): Promise<void> {
    await delay()
    _partners = _partners.map(p =>
      p.id !== partnerId ? p : {
        ...p,
        specialists: p.specialists.map(s => s.id === specialistId ? { ...s, ...patch } : s)
      }
    )
  },

  async createSpecialist(partnerId: string, data: Omit<Specialist, 'id'>): Promise<Specialist> {
    await delay()
    const sp: Specialist = { ...data, id: `sp-${Date.now()}` }
    _partners = _partners.map(p =>
      p.id !== partnerId ? p : { ...p, specialists: [...p.specialists, sp] }
    )
    return sp
  },

  async createLocation(partnerId: string, data: Omit<Location, 'id'>): Promise<Location> {
    await delay()
    const loc: Location = { ...data, id: `loc-${Date.now()}` }
    _partners = _partners.map(p =>
      p.id !== partnerId ? p : { ...p, locations: [...p.locations, loc] }
    )
    return loc
  },

  async updateLocation(partnerId: string, locationId: string, patch: Partial<Location>): Promise<void> {
    await delay()
    _partners = _partners.map(p =>
      p.id !== partnerId ? p : {
        ...p,
        locations: p.locations.map(l => l.id === locationId ? { ...l, ...patch } : l)
      }
    )
  },

  async deleteLocation(partnerId: string, locationId: string): Promise<void> {
    await delay()
    _partners = _partners.map(p =>
      p.id !== partnerId ? p : { ...p, locations: p.locations.filter(l => l.id !== locationId) }
    )
  },

  async getHours(specialistId: string): Promise<SpecialistHours | undefined> {
    await delay(100)
    return _hours.find(h => h.specialistId === specialistId)
  },

  async updateHours(specialistId: string, schedule: SpecialistHours['schedule']): Promise<void> {
    await delay()
    const idx = _hours.findIndex(h => h.specialistId === specialistId)
    if (idx >= 0) _hours[idx] = { specialistId, schedule }
    else _hours.push({ specialistId, schedule })
  },
}
