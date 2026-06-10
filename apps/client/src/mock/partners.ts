import type { Partner } from '@reserva/shared'

/**
 * Extra public-facing presentation fields layered on top of the core
 * Partner domain model. These power the salon's branded booking page.
 */
export interface PartnerPresentation {
  tagline: string
  about: string
  rating: number
  reviews: number
  /** Gallery tiles. New tiles carry an uploaded image `url`; legacy/seed tiles
   *  carry only a color `tone` + label (rendered as a colored placeholder). */
  gallery: { url?: string; label?: string; tone?: string }[]
  hours: string
  /** Soft brand tints for the hero gradient. */
  heroTints: [string, string]
  /** Public social links (full URLs). Empty = not shown. */
  instagram?: string
  facebook?: string
}

export type PublicPartner = Partner & { presentation: PartnerPresentation }

export const PARTNERS: PublicPartner[] = [
  {
    id: 'antheris',
    name: 'Antheris',
    slug: 'antheris',
    type: 'Aesthetic clinic',
    // Antheris's brand is a black wordmark with a single magenta-pink accent
    // (the dot on the "i"). That pink is the brand color used for buttons/links;
    // the avatars/hero use a near-black ramp to echo the black wordmark.
    accent: '#E8456B',
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
    presentation: {
      tagline: 'Modern aesthetic medicine in the heart of Yerevan',
      about:
        'Antheris is a clinical aesthetics studio where science meets care. From laser treatments to bespoke facials, our specialists craft results-driven plans tailored to your skin — in a calm, considered space designed to make you feel at home.',
      rating: 4.9,
      reviews: 214,
      hours: 'Mon–Sat · 10:00–19:00',
      // Near-black ramp echoes the black wordmark: avatars/hero read as a matte
      // black card with crisp white initials, while pink stays the accent.
      heroTints: ['#2C2C30', '#121214'],
      gallery: [
        { label: 'Treatment room', tone: '#2C2C30' },
        { label: 'Reception', tone: '#121214' },
        { label: 'Laser suite', tone: '#3C3C42' },
        { label: 'Lounge', tone: '#1E1E22' },
      ],
    },
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
      { id: 'bb-s2', name: 'Vardan Mkrtchyan', title: 'Barber', locationId: 'bb-mashtots', active: true, phone: '+374 93 44 55 66', services: ['bb-cut', 'bb-beard', 'bb-fade'] },
    ],
    services: [
      { id: 'bb-cut', name: 'Haircut', price: 5000, duration: 30, active: true, category: 'Hair' },
      { id: 'bb-beard', name: 'Beard trim', price: 3000, duration: 20, active: true, category: 'Beard' },
      { id: 'bb-combo', name: 'Haircut + beard', price: 7000, duration: 50, active: true, category: 'Combo' },
      { id: 'bb-fade', name: 'Fade cut', price: 6000, duration: 35, active: true, category: 'Hair' },
    ],
    presentation: {
      tagline: 'Sharp cuts, classic vibes, no appointments-by-DM',
      about:
        'BarberBro is where craft meets attitude. Walk in for a precise fade, a clean beard line-up, or the full combo — and walk out feeling like the best version of yourself. Booked online in seconds, finished in style.',
      rating: 4.8,
      reviews: 158,
      hours: 'Tue–Sun · 11:00–20:00',
      heroTints: ['#2F4A3A', '#1E3225'],
      gallery: [
        { label: 'The chair', tone: '#2F4A3A' },
        { label: 'Storefront', tone: '#1E3225' },
        { label: 'Tools', tone: '#46604F' },
        { label: 'Waiting area', tone: '#26402F' },
      ],
    },
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
    presentation: {
      tagline: 'Soft glamour & flawless detail by the Cascade',
      about:
        'Lumé Studio is a haven for nails, lashes and brows — where every detail is finished to perfection. Our artists blend technique with a gentle touch, so you leave glowing and ready to be seen. Quietly luxurious, effortlessly you.',
      rating: 5.0,
      reviews: 96,
      hours: 'Mon–Sat · 10:00–20:00',
      heroTints: ['#B07683', '#7A4A55'],
      gallery: [
        { label: 'Nail bar', tone: '#B07683' },
        { label: 'Lash room', tone: '#7A4A55' },
        { label: 'Studio', tone: '#C99AA5' },
        { label: 'Entrance', tone: '#955E69' },
      ],
    },
  },
  {
    id: 'avanta',
    name: 'Avanta',
    slug: 'avanta',
    type: 'Wellness & spa',
    // Brand color from the Avanta apple logo — a fresh, vivid green.
    accent: '#1FA84C',
    locations: [
      { id: 'av-northern', name: 'Northern Ave', address: '8 Northern Ave, Yerevan', phone: '+374 10 50 60 70' },
      { id: 'av-komitas', name: 'Komitas', address: '41 Komitas Ave, Yerevan', phone: '+374 10 33 77 22' },
    ],
    specialists: [
      { id: 'av-s1', name: 'Gohar Davtyan', title: 'Lead therapist', locationId: 'av-northern', active: true, phone: '+374 94 10 20 30', services: ['av-massage', 'av-aroma', 'av-body'] },
      { id: 'av-s2', name: 'Tigran Karapetyan', title: 'Massage therapist', locationId: 'av-northern', active: true, phone: '+374 94 40 50 60', services: ['av-massage', 'av-deep', 'av-hot'] },
      { id: 'av-s3', name: 'Ani Melkonyan', title: 'Spa specialist', locationId: 'av-komitas', active: true, phone: '+374 94 70 80 90', services: ['av-aroma', 'av-body', 'av-wrap'] },
    ],
    services: [
      { id: 'av-massage', name: 'Classic massage', price: 12000, duration: 60, active: true, category: 'Massage' },
      { id: 'av-deep', name: 'Deep tissue massage', price: 16000, duration: 75, active: true, category: 'Massage' },
      { id: 'av-hot', name: 'Hot stone massage', price: 18000, duration: 90, active: true, category: 'Massage' },
      { id: 'av-aroma', name: 'Aromatherapy', price: 14000, duration: 60, active: true, category: 'Therapy' },
      { id: 'av-body', name: 'Body scrub', price: 11000, duration: 45, active: true, category: 'Body' },
      { id: 'av-wrap', name: 'Detox body wrap', price: 20000, duration: 90, active: true, category: 'Body' },
    ],
    presentation: {
      tagline: 'Restore, recharge, renew — naturally',
      about:
        'Avanta is a sanctuary for body and mind, where natural therapies meet expert hands. From deep-tissue massage to detoxifying body rituals, every treatment is designed to leave you lighter, calmer and renewed — green by name, restorative by nature.',
      rating: 4.9,
      reviews: 173,
      hours: 'Mon–Sun · 09:00–21:00',
      // Vivid green → deep forest ramp, drawn from the apple logo.
      heroTints: ['#1FA84C', '#0E6B30'],
      gallery: [
        { label: 'Massage suite', tone: '#1FA84C' },
        { label: 'Relaxation lounge', tone: '#0E6B30' },
        { label: 'Steam room', tone: '#34BF63' },
        { label: 'Reception', tone: '#157A38' },
      ],
    },
  },
]
