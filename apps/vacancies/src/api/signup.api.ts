import { apiPost } from './client'

// ─────────────────────────────────────────────────────────────
// Salon signup, from the board.
//
// Deliberately the SAME endpoint the marketing site posts to — there is no
// second signup on the backend and there should not be one. A salon that signs
// up here becomes an ordinary Partner with an admin User and a backoffice
// login; the only difference is which product it is granted, and that is one
// field.
//
// `product: 'vacancies'` is INTENT, not an instruction. The server validates it
// against the product catalog's self-serve flag, so an anonymous caller cannot
// grant itself a curated product by editing the request. That check is why this
// page needed a one-row migration rather than new backend code.
// ─────────────────────────────────────────────────────────────

export interface SalonSignupInput {
  /** Legal or trading name — becomes the Partner name and the name on listings. */
  companyName: string
  /** What kind of business ("Beauty salon", "Barbershop"). Free text. */
  companyType: string
  /** A team, or one professional working alone. */
  kind: 'salon' | 'single'
  /** Brand colour, used on this salon's cards on the board. #RRGGBB. */
  accent: string
  adminName: string
  adminEmail: string
  /** E.164, e.g. +37493813296. */
  adminPhone: string
  password: string
}

/**
 * Start a signup. The server stores a pending registration and emails an
 * activation link; the Partner is not created until that link is opened.
 *
 * Note there is no `slug`. The field exists on the endpoint and is optional,
 * and this form deliberately does not collect it — see the page for why.
 */
export function startSalonSignup(input: SalonSignupInput): Promise<{ email: string }> {
  return apiPost<{ email: string }>('/public/signup', { ...input, product: 'vacancies' })
}
