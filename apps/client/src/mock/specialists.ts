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

/** Empty profile — no fabricated rating/reviews/bio. The backend has no
 *  specialist-review data yet, so the modal renders only what's real (name,
 *  title, services). Swap to a real fetch when reviews ship. */
const EMPTY_PROFILE: SpecialistProfile = {
  rating: 0,
  reviewCount: 0,
  experience: '',
  bio: '',
  reviews: [],
}

export function getSpecialistProfile(_id: string): SpecialistProfile {
  return EMPTY_PROFILE
}
