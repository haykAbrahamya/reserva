// ─────────────────────────────────────────────────────────────
// Human names for what the tracker records (analytics contract §3).
//
// The wire format uses short keys on purpose (payload size); staff should never
// have to know that `ch` means channel or that `book_click` is the Book button.
// Anything the catalog does not know yet still renders — humanised — so a new
// event shipped by the public site shows up before this file catches up.
// ─────────────────────────────────────────────────────────────

import type { Site } from '@/services/analytics.service'

export type EventGroup = 'site' | 'partner' | 'reviews' | 'booking' | 'signup' | 'marketplace' | 'tools' | 'visit'

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
  tools: 'Tools',
  visit: 'Appointment card · client',
}

/** The event groups each site sends — what its Events filter offers. */
export const SITE_EVENT_GROUPS: Record<Site, readonly EventGroup[]> = {
  web: ['site', 'partner', 'reviews', 'booking', 'signup', 'marketplace'],
  tools: ['site', 'tools', 'visit'],
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

  { name: 'tool_select', label: 'Tool picked', group: 'tools', tone: 'neutral' },
  { name: 'tool_edit', label: 'Tool edited', group: 'tools', tone: 'info' },
  { name: 'tool_action', label: 'Tool action', group: 'tools', tone: 'neutral' },
  { name: 'tool_export', label: 'Result exported', group: 'tools', tone: 'success' },
  { name: 'tool_error', label: 'Tool error', group: 'tools', tone: 'danger' },
  { name: 'cta_click', label: 'Clicked to Reserva', group: 'tools', tone: 'accent' },
  { name: 'pref_change', label: 'Preference changed', group: 'tools', tone: 'neutral' },
  { name: 'browser_open', label: 'Left the app’s browser', group: 'tools', tone: 'info' },

  { name: 'visit_action', label: 'Card used by client', group: 'visit', tone: 'accent' },
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
  tool: 'Tool',
  act: 'Action',
  v: 'Choice',
  via: 'Sent as',
  theme: 'Style',
  fmt: 'Format',
  n: 'Items',
  lng: 'Language',
  what: 'Preference',
  app: 'App',
  how: 'How',
  ig: 'Instagram',
  contact: 'Contact',
}

export const PAGE_TYPE_LABELS: Record<string, string> = {
  home: 'Home',
  marketplace: 'Marketplace',
  partner: 'Partner page',
  signup: 'Sign-up',
  other: 'Other page',
  tools: 'Tools home',
  tool: 'Tool',
  visit: 'Appointment card (client)',
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

// ── tools.reserva.am ──

/** The tools, by registry id. */
export const TOOL_LABELS: Record<string, string> = {
  priceList: 'Price list',
  freeSlots: 'Free slots',
  beforeAfter: 'Before & after',
  appointmentCard: 'Appointment card',
  giftCertificate: 'Gift certificate',
}

/** How a result left (tool_export `via`). */
export const EXPORT_VIA_LABELS: Record<string, string> = {
  share: 'Share sheet',
  download: 'Download',
  pdf: 'PDF',
  whatsapp: 'WhatsApp',
  viber: 'Viber',
  copy: 'Copied link',
  hold: 'Press and hold (in-app)',
}

/** Whose built-in browser a visit was in (browser_open `app`). */
export const IN_APP_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  other: 'An app',
}

/** The way out of an app's browser (browser_open `how`, `from`). */
export const BROWSER_OPEN_LABELS: Record<string, string> = {
  chrome: 'Opened in Chrome',
  copy: 'Copied the link',
  notice: 'Top notice',
  sheet: 'Save sheet',
}

/** Main actions inside a tool (tool_action `act`). */
export const TOOL_ACT_LABELS: Record<string, string> = {
  theme: 'Style picked',
  add: 'Row added',
  remove: 'Row removed',
  clear: 'List cleared',
  day: 'Day picked',
  photo: 'Photo added',
  photo_remove: 'Photo removed',
  adjust: 'Photo framed',
  format: 'Format picked',
  layout: 'Layout picked',
  code: 'New card number',
  open: 'Opened the client’s card',
  preview: 'Preview tab (phone)',
  zoom: 'Opened full size',
}

/** The values an action, a format or a style can take. */
export const TOOL_VALUE_LABELS: Record<string, string> = {
  mocha: 'Mocha', cream: 'Cream', noir: 'Noir', blush: 'Blush', sage: 'Sage', lavender: 'Lavender',
  today: 'Today', tomorrow: 'Tomorrow', later: 'A later day',
  before: 'Before', after: 'After',
  post: 'Post', story: 'Story',
  side: 'Side by side', stacked: 'Stacked',
}

/** 'post-side' → 'Post · Side by side'. */
export function toolValueLabel(v: string | null | undefined): string {
  if (!v) return '—'
  return v.split('-').map((part) => labelFrom(TOOL_VALUE_LABELS, part)).join(' · ')
}

/** What a client did with an appointment card (visit_action `act`). */
export const VISIT_ACT_LABELS: Record<string, string> = {
  calendar: 'Added to calendar',
  directions: 'Opened directions',
  call: 'Called the salon',
  made: 'Opened Reserva Tools',
}

/** Where a link into reserva.am sat (cta_click `from`). */
export const CTA_FROM_LABELS: Record<string, string> = {
  pitch: 'Booking-page pitch',
  header: 'Header',
  footer: 'Footer',
}

/** The spot that sent a visitor to reserva.am (utm_content of the tools’ links). */
export const TOOLS_SPOT_LABELS: Record<string, string> = {
  header: 'Header',
  footer: 'Footer',
  'price-list': 'Price list · pitch',
  'free-slots': 'Free slots · pitch',
  'before-after': 'Before & after · pitch',
  'appointment-card': 'Appointment card · pitch',
  'gift-certificate': 'Gift certificate · pitch',
  other: 'Other',
}

export const TOOL_ERROR_LABELS: Record<string, string> = {
  share: 'Share failed',
  download: 'Download failed',
  pdf: 'PDF failed',
  copy: 'Copy failed',
  photo: 'Photo would not open',
  bad_link: 'Broken card link',
}

export const UI_LANGUAGE_LABELS: Record<string, string> = {
  hy: 'Armenian',
  ru: 'Russian',
  en: 'English',
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
    case 'page_view': {
      if (!str(props.pt)) return null
      const page = labelFrom(PAGE_TYPE_LABELS, str(props.pt))
      return str(props.tool) ? `${page} · ${labelFrom(TOOL_LABELS, str(props.tool))}` : page
    }
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
    case 'tool_select':
      return [labelFrom(TOOL_LABELS, str(props.tool)), typeof props.pos === 'number' ? `card ${props.pos + 1}` : null]
        .filter(Boolean).join(' · ')
    case 'tool_edit':
      return labelFrom(TOOL_LABELS, str(props.tool))
    case 'tool_action': {
      const v = str(props.v)
      return `${labelFrom(TOOL_LABELS, str(props.tool))} · ${labelFrom(TOOL_ACT_LABELS, str(props.act))}${v ? `: ${toolValueLabel(v)}` : ''}`
    }
    case 'tool_export':
      return [
        labelFrom(TOOL_LABELS, str(props.tool)),
        labelFrom(EXPORT_VIA_LABELS, str(props.via)),
        str(props.contact) ?? (str(props.ig) ? `@${str(props.ig)}` : null),
      ].filter(Boolean).join(' · ')
    case 'tool_error':
      return [str(props.tool) ? labelFrom(TOOL_LABELS, str(props.tool)) : null, labelFrom(TOOL_ERROR_LABELS, str(props.code))]
        .filter(Boolean).join(' · ')
    case 'cta_click':
      return [labelFrom(CTA_FROM_LABELS, str(props.from)), str(props.tool) ? labelFrom(TOOL_LABELS, str(props.tool)) : null]
        .filter(Boolean).join(' · ')
    case 'visit_action':
      return str(props.act) ? labelFrom(VISIT_ACT_LABELS, str(props.act)) : null
    case 'pref_change':
      return str(props.what) === 'lang'
        ? `Language: ${labelFrom(UI_LANGUAGE_LABELS, str(props.v))}`
        : `Theme: ${labelFrom({ dark: 'Dark', light: 'Light' }, str(props.v))}`
    case 'browser_open':
      return [
        labelFrom(IN_APP_LABELS, str(props.app)),
        labelFrom(BROWSER_OPEN_LABELS, str(props.how)),
        str(props.tool) ? labelFrom(TOOL_LABELS, str(props.tool)) : null,
      ].filter(Boolean).join(' · ')
    default:
      return null
  }
}
