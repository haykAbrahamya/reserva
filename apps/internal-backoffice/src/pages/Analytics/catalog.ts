// ─────────────────────────────────────────────────────────────
// Human names for what the tracker records (analytics contract §3).
//
// The wire format uses short keys on purpose (payload size); staff should never
// have to know that `ch` means channel or that `book_click` is the Book button.
// Anything the catalog does not know yet still renders — humanised — so a new
// event shipped by the public site shows up before this file catches up.
// ─────────────────────────────────────────────────────────────

export type EventGroup = 'site' | 'partner' | 'reviews' | 'booking' | 'signup' | 'marketplace'

/** Badge colour. Errors and successes use the status tones because they ARE a
 *  status; the rest only separate the flows from one another. */
export type EventTone = 'neutral' | 'accent' | 'info' | 'success' | 'warn' | 'danger'

export interface EventDef {
  name: string
  label: string
  group: EventGroup
  tone: EventTone
}

export const EVENT_GROUP_LABEL: Record<EventGroup, string> = {
  site: 'Everywhere',
  partner: 'Partner page',
  reviews: 'Reviews',
  booking: 'Booking flow',
  signup: 'Sign-up',
  marketplace: 'Marketplace',
}

/** In catalog order — also the order of the event filter. */
export const EVENT_CATALOG: EventDef[] = [
  { name: 'page_view', label: 'Page view', group: 'site', tone: 'neutral' },

  { name: 'book_click', label: 'Book click', group: 'partner', tone: 'accent' },
  { name: 'contact_click', label: 'Contact click', group: 'partner', tone: 'accent' },
  { name: 'branch_switch', label: 'Branch switched', group: 'partner', tone: 'neutral' },
  { name: 'category_select', label: 'Category picked', group: 'partner', tone: 'neutral' },
  { name: 'service_search', label: 'Service search', group: 'partner', tone: 'neutral' },
  { name: 'specialist_open', label: 'Specialist opened', group: 'partner', tone: 'neutral' },
  { name: 'gallery_open', label: 'Gallery opened', group: 'partner', tone: 'neutral' },
  { name: 'course_open', label: 'Course opened', group: 'partner', tone: 'neutral' },
  { name: 'course_register_click', label: 'Course sign-up click', group: 'partner', tone: 'accent' },

  { name: 'reviews_open', label: 'Reviews opened', group: 'reviews', tone: 'neutral' },
  { name: 'review_form_open', label: 'Review form opened', group: 'reviews', tone: 'info' },
  { name: 'review_success', label: 'Review left', group: 'reviews', tone: 'success' },
  { name: 'review_error', label: 'Review not sent', group: 'reviews', tone: 'warn' },

  { name: 'booking_open', label: 'Booking opened', group: 'booking', tone: 'info' },
  { name: 'booking_step', label: 'Booking step', group: 'booking', tone: 'info' },
  { name: 'booking_submit', label: 'Booking submitted', group: 'booking', tone: 'info' },
  { name: 'booking_success', label: 'Booking confirmed', group: 'booking', tone: 'success' },
  { name: 'booking_error', label: 'Booking error', group: 'booking', tone: 'danger' },
  { name: 'booking_close', label: 'Booking abandoned', group: 'booking', tone: 'warn' },

  { name: 'signup_start', label: 'Sign-up started', group: 'signup', tone: 'info' },
  { name: 'signup_step', label: 'Sign-up step', group: 'signup', tone: 'info' },
  { name: 'signup_submit', label: 'Sign-up submitted', group: 'signup', tone: 'info' },
  { name: 'signup_success', label: 'Sign-up done', group: 'signup', tone: 'success' },
  { name: 'signup_error', label: 'Sign-up error', group: 'signup', tone: 'danger' },

  { name: 'salons_search', label: 'Salon search', group: 'marketplace', tone: 'neutral' },
  { name: 'salons_filter', label: 'Salon filter', group: 'marketplace', tone: 'neutral' },
  { name: 'salon_click', label: 'Salon click', group: 'marketplace', tone: 'neutral' },
]

const BY_NAME = new Map(EVENT_CATALOG.map((e) => [e.name, e]))

/** 'some_new_event' → 'Some new event'. */
export function humanize(key: string): string {
  const s = key.replace(/[_-]+/g, ' ').trim()
  return s ? s[0].toUpperCase() + s.slice(1) : key
}

export function eventDef(name: string): EventDef {
  return BY_NAME.get(name) ?? { name, label: humanize(name), group: 'site', tone: 'neutral' }
}

/** Prop keys as staff would say them. */
export const PROP_LABELS: Record<string, string> = {
  pt: 'Page type',
  from: 'Clicked from',
  svc: 'Service',
  sp: 'Specialist',
  loc: 'Branch',
  ch: 'Channel',
  cat: 'Category',
  q: 'Search text',
  kind: 'Kind',
  course: 'Course',
  step: 'Step',
  any: 'Any specialist',
  code: 'Error code',
  field: 'Field',
  area: 'Area',
  slug: 'Salon',
  pos: 'Position in list',
  stars: 'Stars',
}

export const PAGE_TYPE_LABELS: Record<string, string> = {
  home: 'Home',
  marketplace: 'Marketplace',
  partner: 'Partner page',
  signup: 'Sign-up',
  other: 'Other page',
}

export const CONTACT_CHANNEL_LABELS: Record<string, string> = {
  call: 'Call',
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  facebook: 'Facebook',
  telegram: 'Telegram',
  directions: 'Directions',
  website: 'Website',
  email: 'Email',
  other: 'Other',
}

/** Session channels, as derived by the server (contract §4). */
export const TRAFFIC_CHANNEL_LABELS: Record<string, string> = {
  direct: 'Direct',
  reserva: 'reserva.am',
  instagram: 'Instagram',
  facebook: 'Facebook',
  google: 'Google',
  search: 'Other search',
  tiktok: 'TikTok',
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
  campaign: 'Campaign (UTM)',
  other: 'Other sites',
}

/** What each channel means — shown as a hint where the name alone is opaque. */
export const TRAFFIC_CHANNEL_HINTS: Record<string, string> = {
  direct: 'No referrer: typed address, bookmark or an app',
  reserva: 'Came from another reserva.am page, e.g. the marketplace',
  search: 'Bing, Yandex, DuckDuckGo or Yahoo',
  campaign: 'A link tagged with utm_source',
  other: 'Any other website',
}

/** Where a visitor went to the reviews from (reviews_open `from`). */
export const REVIEWS_FROM_LABELS: Record<string, string> = {
  hero: 'Rating at the top',
  tab: 'Reviews tab',
}

/** Why a review was not sent, when the code alone says little. */
export const REVIEW_ERROR_LABELS: Record<string, string> = {
  no_stars: 'No stars chosen',
  UNKNOWN: 'Network or unknown error',
}

/** Sign-up steps (signup_step `step`): the three-step form, plus the older two-step names. */
export const SIGNUP_STEP_LABELS: Record<string, string> = {
  kind: 'Solo or salon',
  page: 'Page details',
  account: 'Account details',
  company: 'Company details',
}

const BOOKING_STEP_LABELS: Record<string, string> = {
  branch: 'Branch',
  service: 'Service',
  specialist: 'Specialist',
  datetime: 'Date & time',
  details: 'Details',
  confirm: 'Confirm',
}

export function labelFrom(map: Record<string, string>, key: string | null | undefined): string {
  if (!key) return '—'
  return map[key] ?? humanize(key)
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)

/**
 * One short phrase that says which variant of an event this was — "WhatsApp",
 * "at Date & time", "“nail”" — so the events table reads without opening
 * every row. Ids are left out on purpose: they mean nothing at a glance.
 */
export function eventSummary(name: string, props: Record<string, unknown>): string | null {
  switch (name) {
    case 'page_view':
      return str(props.pt) ? labelFrom(PAGE_TYPE_LABELS, str(props.pt)) : null
    case 'contact_click':
      return str(props.ch) ? labelFrom(CONTACT_CHANNEL_LABELS, str(props.ch)) : null
    case 'book_click':
    case 'booking_open':
      return str(props.from) ? `from ${str(props.from)}` : null
    case 'booking_step':
      return str(props.step) ? labelFrom(BOOKING_STEP_LABELS, str(props.step)) : null
    case 'booking_close':
      return str(props.step) ? `at ${labelFrom(BOOKING_STEP_LABELS, str(props.step))}` : null
    case 'signup_step':
      return str(props.step) ? labelFrom(SIGNUP_STEP_LABELS, str(props.step)) : null
    case 'booking_error':
    case 'signup_error':
      return [str(props.field), str(props.code)].filter(Boolean).join(' · ') || null
    case 'category_select':
      return str(props.cat)
    case 'salons_filter':
      return [str(props.cat), str(props.area)].filter(Boolean).join(' · ') || null
    case 'service_search':
    case 'salons_search':
      return str(props.q) ? `“${str(props.q)}”` : null
    case 'salon_click':
      return str(props.slug)
    case 'gallery_open':
      return str(props.kind)
    case 'reviews_open':
      return str(props.from) ? labelFrom(REVIEWS_FROM_LABELS, str(props.from)) : null
    case 'review_success':
      return typeof props.stars === 'number' ? `${props.stars} ★` : null
    case 'review_error':
      return str(props.code) ? labelFrom(REVIEW_ERROR_LABELS, str(props.code)) : null
    default:
      return null
  }
}
