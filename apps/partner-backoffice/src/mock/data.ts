import type { Partner, Booking, SpecialistHours } from '@/types'

export const PARTNERS: Partner[] = [
  {
    id: 'antheris',
    name: 'Antheris',
    slug: 'antheris',
    type: 'Aesthetic clinic',
    accent: '#A8784B',
    locations: [
      { id: 'ant-arabkir', name: 'Arabkir', address: '34 Komitas Ave, Yerevan', phone: '+374 10 24 56 78' },
      { id: 'ant-kentron', name: 'Kentron', address: '12 Pushkin St, Yerevan', phone: '+374 10 53 11 02' },
    ],
    specialists: [
      { id: 'ant-s1', name: 'Anush Petrosyan', title: 'Lead aesthetician', locationId: 'ant-arabkir', active: true, phone: '+374 91 22 11 33', services: ['ant-laser-fl', 'ant-laser-leg', 'ant-facial-im', 'ant-derma'] },
      { id: 'ant-s2', name: 'Mariam Sargsyan', title: 'Laser specialist', locationId: 'ant-arabkir', active: true, phone: '+374 91 88 12 44', services: ['ant-laser-fl', 'ant-laser-leg', 'ant-laser-bk'] },
      { id: 'ant-s3', name: 'Dr. Lilit Hovhannisyan', title: 'Dermatologist', locationId: 'ant-kentron', active: true, phone: '+374 91 09 88 21', services: ['ant-derma', 'ant-inject'] },
      { id: 'ant-s4', name: 'Nare Avetisyan', title: 'Aesthetician', locationId: 'ant-kentron', active: false, phone: '+374 91 33 87 19', services: ['ant-facial-im'] },
    ],
    services: [
      { id: 'ant-laser-fl', name: 'Laser — full face', price: 18000, duration: 30, active: true, category: 'Laser' },
      { id: 'ant-laser-leg', name: 'Laser — full legs', price: 35000, duration: 60, active: true, category: 'Laser' },
      { id: 'ant-laser-bk', name: 'Laser — bikini', price: 22000, duration: 30, active: true, category: 'Laser' },
      { id: 'ant-facial-im', name: 'Imsirun facial', price: 28000, duration: 75, active: true, category: 'Facial' },
      { id: 'ant-derma', name: 'Dermatology consult', price: 15000, duration: 45, active: true, category: 'Medical' },
      { id: 'ant-inject', name: 'Botox injection', price: 55000, duration: 30, active: true, category: 'Medical' },
    ],
  },
  {
    id: 'barberbro',
    name: 'BarberBro',
    slug: 'barberbro',
    type: 'Barbershop',
    accent: '#2F4A3A',
    locations: [
      { id: 'bb-mashtots', name: 'Mashtots', address: '22 Mashtots Ave, Yerevan', phone: '+374 10 44 22 11' },
    ],
    specialists: [
      { id: 'bb-s1', name: 'Armen Grigoryan', title: 'Senior barber', locationId: 'bb-mashtots', active: true, phone: '+374 93 11 22 33', services: ['bb-cut', 'bb-beard', 'bb-combo'] },
      { id: 'bb-s2', name: 'Vardan Mkrtchyan', title: 'Barber', locationId: 'bb-mashtots', active: true, phone: '+374 93 44 55 66', services: ['bb-cut', 'bb-beard'] },
    ],
    services: [
      { id: 'bb-cut', name: 'Haircut', price: 5000, duration: 30, active: true, category: 'Hair' },
      { id: 'bb-beard', name: 'Beard trim', price: 3000, duration: 20, active: true, category: 'Beard' },
      { id: 'bb-combo', name: 'Haircut + beard', price: 7000, duration: 50, active: true, category: 'Combo' },
      { id: 'bb-fade', name: 'Fade cut', price: 6000, duration: 35, active: true, category: 'Hair' },
    ],
  },
  {
    id: 'lume',
    name: 'Lumé Studio',
    slug: 'lume',
    type: 'Beauty studio',
    accent: '#B07683',
    locations: [
      { id: 'lume-cascade', name: 'Cascade', address: '5 Tamanyan St, Yerevan', phone: '+374 10 77 88 99' },
    ],
    specialists: [
      { id: 'lume-s1', name: 'Naira Hovhannisyan', title: 'Nail artist', locationId: 'lume-cascade', active: true, phone: '+374 99 11 22 33', services: ['lume-mani', 'lume-pedi', 'lume-gel'] },
      { id: 'lume-s2', name: 'Silva Abrahamyan', title: 'Lash artist', locationId: 'lume-cascade', active: true, phone: '+374 99 44 55 66', services: ['lume-lash', 'lume-brow'] },
    ],
    services: [
      { id: 'lume-mani', name: 'Classic manicure', price: 8000, duration: 60, active: true, category: 'Nails' },
      { id: 'lume-pedi', name: 'Classic pedicure', price: 10000, duration: 75, active: true, category: 'Nails' },
      { id: 'lume-gel', name: 'Gel manicure', price: 12000, duration: 90, active: true, category: 'Nails' },
      { id: 'lume-lash', name: 'Lash extensions', price: 25000, duration: 120, active: true, category: 'Lashes' },
      { id: 'lume-brow', name: 'Brow shaping', price: 6000, duration: 30, active: true, category: 'Brows' },
    ],
  },
]

// Generate realistic bookings around today
function makeBookings(): Booking[] {
  const now = new Date()
  const bookings: Booking[] = []
  let idCounter = 1

  const makeId = () => `bk-${String(idCounter++).padStart(4, '0')}`

  const clients = [
    { name: 'Anna Karapetyan', phone: '+374 91 11 22 33' },
    { name: 'Lilit Vardanyan', phone: '+374 91 44 55 66' },
    { name: 'Sona Grigoryan', phone: '+374 93 77 88 99' },
    { name: 'Karine Petrosyan', phone: '+374 94 22 33 44' },
    { name: 'Hayk Abrahamyan', phone: '+374 91 55 66 77' },
    { name: 'Artak Hovhannisyan', phone: '+374 96 88 99 00' },
    { name: 'Nune Sargsyan', phone: '+374 93 33 44 55' },
    { name: 'David Mkrtchyan', phone: '+374 91 66 77 88' },
    { name: 'Mari Avetisyan', phone: '+374 94 99 00 11' },
    { name: 'Tigran Hakobyan', phone: '+374 96 11 22 33' },
  ]

  const statuses: Array<'pending' | 'confirmed' | 'cancelled' | 'completed' | 'noshow'> = [
    'confirmed', 'confirmed', 'confirmed', 'pending', 'completed', 'completed', 'cancelled', 'noshow',
  ]

  // For Antheris — populate last 14 days + next 14 days
  const partner = PARTNERS[0]
  for (let dayOffset = -14; dayOffset <= 14; dayOffset++) {
    const day = new Date(now)
    day.setDate(day.getDate() + dayOffset)
    day.setHours(0, 0, 0, 0)

    const bookingsPerDay = dayOffset < 0 ? 3 + Math.floor(Math.random() * 4) : 1 + Math.floor(Math.random() * 5)

    for (let i = 0; i < bookingsPerDay; i++) {
      const specialist = partner.specialists[Math.floor(Math.random() * partner.specialists.filter(s => s.active).length)]
      const serviceId = specialist.services[Math.floor(Math.random() * specialist.services.length)]
      const service = partner.services.find(s => s.id === serviceId)
      if (!service) continue

      const hour = 9 + Math.floor(Math.random() * 9)
      const minute = Math.random() > 0.5 ? 30 : 0
      const start = new Date(day)
      start.setHours(hour, minute, 0, 0)
      const end = new Date(start.getTime() + service.duration * 60 * 1000)

      const client = clients[Math.floor(Math.random() * clients.length)]
      const status = dayOffset < -1
        ? statuses[Math.floor(Math.random() * statuses.length)]
        : dayOffset < 0
          ? 'completed'
          : 'confirmed'

      bookings.push({
        id: makeId(),
        partnerId: partner.id,
        locationId: specialist.locationId,
        specialistId: specialist.id,
        serviceId: service.id,
        clientName: client.name,
        clientPhone: client.phone,
        startISO: start.toISOString(),
        endISO: end.toISOString(),
        status: status as Booking['status'],
      })
    }
  }

  return bookings.sort((a, b) => a.startISO.localeCompare(b.startISO))
}

export const BOOKINGS: Booking[] = makeBookings()

const DEFAULT_SCHEDULE = {
  mon: { enabled: true, start: '10:00', end: '19:00' },
  tue: { enabled: true, start: '10:00', end: '19:00' },
  wed: { enabled: true, start: '10:00', end: '19:00' },
  thu: { enabled: true, start: '10:00', end: '19:00' },
  fri: { enabled: true, start: '10:00', end: '19:00' },
  sat: { enabled: true, start: '10:00', end: '17:00' },
  sun: { enabled: false, start: '10:00', end: '17:00' },
}

export const SPECIALIST_HOURS: SpecialistHours[] = PARTNERS.flatMap(p =>
  p.specialists.map(s => ({
    specialistId: s.id,
    schedule: { ...DEFAULT_SCHEDULE },
  }))
)
