// Public-facing extras for specialists (bio, rating, reviews), keyed by
// specialist id. Kept separate from the core Partner data to stay tidy.

export interface SpecialistReview {
  author: string
  rating: number
  date: string   // human label
  text: string
}

export interface SpecialistProfile {
  rating: number
  reviewCount: number
  experience: string
  bio: string
  reviews: SpecialistReview[]
}

const GENERIC: SpecialistProfile = {
  rating: 4.8,
  reviewCount: 42,
  experience: '5+ years',
  bio: 'A dedicated professional passionate about delivering results their clients love. Known for a calm, attentive approach and an eye for detail.',
  reviews: [
    { author: 'Anna K.', rating: 5, date: '2 weeks ago', text: 'Absolutely lovely experience — felt looked after the whole time. Will be back!' },
    { author: 'Mariam S.', rating: 5, date: '1 month ago', text: 'So professional and friendly. The result was exactly what I wanted.' },
    { author: 'Lilit H.', rating: 4, date: '1 month ago', text: 'Great attention to detail. Booking online was super easy too.' },
  ],
}

export const SPECIALIST_PROFILES: Record<string, SpecialistProfile> = {
  // ── Antheris ──
  'ant-s1': {
    rating: 4.9,
    reviewCount: 87,
    experience: '8 years',
    bio: 'Anush leads the Antheris aesthetics team. Specialising in laser treatments and bespoke facials, she builds results-driven plans tailored to each client’s skin.',
    reviews: [
      { author: 'Sona G.', rating: 5, date: '5 days ago', text: 'Anush is incredible — my skin has never looked better. Genuinely caring and skilled.' },
      { author: 'Karine P.', rating: 5, date: '3 weeks ago', text: 'Best aesthetician in Yerevan, hands down. Explains everything clearly.' },
      { author: 'Nare A.', rating: 5, date: '1 month ago', text: 'Felt completely at ease. The Imsirun facial was divine.' },
    ],
  },
  'ant-s2': {
    rating: 4.8,
    reviewCount: 64,
    experience: '6 years',
    bio: 'Mariam is our laser specialist, focused on safe, effective hair-removal and skin-resurfacing treatments. Precise, patient, and reassuring from start to finish.',
    reviews: [
      { author: 'Mari A.', rating: 5, date: '1 week ago', text: 'Painless and so professional. Already seeing results after two sessions.' },
      { author: 'Anna K.', rating: 4, date: '2 weeks ago', text: 'Very knowledgeable and made me feel comfortable throughout.' },
    ],
  },
  'ant-s3': {
    rating: 5.0,
    reviewCount: 51,
    experience: '12 years',
    bio: 'Dr. Lilit is a board-certified dermatologist. From consultations to injectables, she pairs medical expertise with a gentle, honest approach.',
    reviews: [
      { author: 'Tigran H.', rating: 5, date: '4 days ago', text: 'Finally a doctor who listens. Clear advice, no upselling. Highly recommend.' },
      { author: 'Sona G.', rating: 5, date: '1 month ago', text: 'Professional and thorough. I trust her completely with my skin.' },
    ],
  },

  // ── BarberBro ──
  'bb-s1': {
    rating: 4.9,
    reviewCount: 120,
    experience: '10 years',
    bio: 'Armen is our senior barber and the go-to for classic cuts and sharp fades. Precise scissor work, clean line-ups, and great conversation.',
    reviews: [
      { author: 'David M.', rating: 5, date: '3 days ago', text: 'Best fade I’ve had in the city. Armen’s a true craftsman.' },
      { author: 'Hayk A.', rating: 5, date: '2 weeks ago', text: 'Always leaves looking fresh. Worth every dram.' },
    ],
  },
  'bb-s2': {
    rating: 4.7,
    reviewCount: 76,
    experience: '5 years',
    bio: 'Vardan brings energy and precision to every cut. Whether it’s a beard trim or a modern fade, he’s got a steady hand and a good eye.',
    reviews: [
      { author: 'Artak H.', rating: 5, date: '1 week ago', text: 'Great cut, friendly guy. Booking online saved me the usual phone tag.' },
      { author: 'Tigran H.', rating: 4, date: '3 weeks ago', text: 'Solid beard trim, will come again.' },
    ],
  },

  // ── Lumé ──
  'lume-s1': {
    rating: 5.0,
    reviewCount: 58,
    experience: '7 years',
    bio: 'Naira is our nail artist, known for flawless gel work and intricate designs. Detail-obsessed in the best way — your nails are in expert hands.',
    reviews: [
      { author: 'Nune S.', rating: 5, date: '2 days ago', text: 'My gel manicure lasted three weeks, perfect every day. Naira is an artist.' },
      { author: 'Mari A.', rating: 5, date: '2 weeks ago', text: 'So talented and lovely. The studio is gorgeous too.' },
    ],
  },
  'lume-s2': {
    rating: 4.9,
    reviewCount: 44,
    experience: '6 years',
    bio: 'Silva is our lash and brow artist. Gentle, meticulous, and brilliant at enhancing your natural features for that effortless, polished look.',
    reviews: [
      { author: 'Karine P.', rating: 5, date: '6 days ago', text: 'My lashes look amazing and so natural. Silva really listens to what you want.' },
      { author: 'Lilit V.', rating: 5, date: '1 month ago', text: 'Best brows I’ve ever had. Calm, careful, and kind.' },
    ],
  },
}

export function getSpecialistProfile(id: string): SpecialistProfile {
  return SPECIALIST_PROFILES[id] ?? GENERIC
}
