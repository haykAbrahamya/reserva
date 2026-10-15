import type { Paginated } from '@/types'
import http, { apiGet } from './http'

// ─────────────────────────────────────────────────────────────
// Site analytics (the new tracker) — read side for the console.
// Shapes mirror the shared analytics contract §5 exactly; keep them in sync
// with the backend rather than adapting them here.
// ─────────────────────────────────────────────────────────────

/** A headline number plus the same number for the equally long period right
 *  before `from` — the base of every delta chip. */
export interface Kpi { value: number; prev: number }

/** Which Reserva site a report covers: reserva.am with its partner pages, or
 *  tools.reserva.am. The API never mixes the two. */
export type Site = 'web' | 'tools'

/** The resolved window, Yerevan calendar days, both ends inclusive. */
export interface Range { from: string; to: string; days: number }

export interface AnalyticsOverview {
  range: Range
  kpis: {
    visitors: Kpi        // distinct visitorId with ≥1 event in range
    sessions: Kpi        // distinct sessionId with ≥1 event in range
    pageViews: Kpi       // page_view events
    partnerViews: Kpi    // page_view events with partnerId
    bookClicks: Kpi      // book_click
    bookingOpens: Kpi    // booking_open
    bookings: Kpi        // DB: bookings with source='public' (truth, not client events)
    contactClicks: Kpi   // contact_click (all channels)
    signupViews: Kpi     // page_view with props.pt='signup'
    signupStarts: Kpi    // signup_start
    signups: Kpi         // DB: pending_registrations created in range
    activations: Kpi     // DB: pending_registrations consumed in range
    // Optional: a backend from before review tracking leaves them out.
    reviewForms?: Kpi    // review_form_open
    reviews?: Kpi        // DB: specialist_reviews created in range
  }
  /** Every day in range, zeros filled, ascending. */
  series: { date: string; visitors: number; sessions: number; pageViews: number; bookings: number }[]
  /** contact_click by props.ch, desc. */
  contacts: { channel: string; count: number }[]
  /** Top 5 by views. */
  topPartners: PartnerRow[]
}

export interface PartnerRow {
  partnerId: string
  name: string
  slug: string | null
  views: number          // page_view with this partnerId
  visitors: number       // distinct visitorId with any event on this partner
  bookClicks: number
  bookingOpens: number
  bookings: number       // DB public bookings created in range for this partner
  /** Sessions with a booking_success on this partner ÷ sessions with a page_view
   *  on it (a ratio, contract §9): both tracked, so it never passes 100%. Null
   *  when no session viewed the page. */
  conversion: number | null
  contacts: { call: number; whatsapp: number; instagram: number; directions: number; other: number }
}

export interface AnalyticsPartners {
  range: Range
  /** Partners with any event OR public booking in range; sorted by views desc. */
  rows: PartnerRow[]
  totals: Omit<PartnerRow, 'partnerId' | 'name' | 'slug'>
}

export interface AnalyticsSources {
  range: Range
  channels: { channel: string; sessions: number; visitors: number }[]   // desc
  referrers: { host: string; sessions: number }[]                       // top 20, excluding empty
  campaigns: { source: string | null; medium: string | null; campaign: string | null; sessions: number }[]  // top 20, utm present
  devices: { deviceType: string; sessions: number }[]
  countries: { country: string; sessions: number }[]                    // top 15 (null → 'unknown')
  languages: { language: string; sessions: number }[]                   // top 10, primary subtag ('hy','ru','en')
}

/** How results left a tool, by tool_export `via`. */
export interface ToolExportsBy {
  share: number; download: number; pdf: number; whatsapp: number; viber: number; copy: number
  /** Shown to press and hold inside an app's built-in browser — saving it cannot be confirmed. */
  hold: number
}

export interface ToolRow {
  /** The tool's registry id, e.g. 'priceList'. */
  tool: string
  views: number          // page views of the tool
  visitors: number       // distinct visitorId with any event of the tool
  edits: number          // tool_edit — page views in which the form changed
  exports: number        // tool_export — results taken away
  /** Sessions that took a result away ÷ sessions that opened the tool (0..1); null when none opened it. */
  exportRate: number | null
  exportsBy: ToolExportsBy
  ctaClicks: number      // clicks into reserva.am made on the tool's page
  errors: number
}

/** Someone who made something on the tools, by the Instagram account their result was signed with. */
export interface ToolAccount {
  /** Bare username, lower-case: instagram.com/<handle>. */
  handle: string
  exports: number
  /** Registry ids of the tools it exported from. */
  tools: string[]
  /** ISO time of its latest export in range. */
  lastAt: string
  /** The visit of that latest export. */
  sessionId: string
}

/** GET /platform/analytics/tools — tools.reserva.am on its own. */
export interface AnalyticsTools {
  range: Range
  kpis: {
    visitors: Kpi; sessions: Kpi
    toolViews: Kpi       // page views of a tool
    edits: Kpi           // tool_edit
    exports: Kpi         // tool_export
    cardViews: Kpi       // appointment cards opened by clients (the visit page)
    ctaClicks: Kpi       // clicks into reserva.am
  }
  /** Every day in range, zeros filled, ascending. */
  series: { date: string; visitors: number; sessions: number; toolViews: number; exports: number }[]
  /** Most views first. */
  tools: ToolRow[]
  exportsBy: { via: string; count: number }[]
  /** Styles of the exported results. */
  themes: { theme: string; count: number }[]
  /** Top 40 actions per tool, with the value chosen most. */
  actions: { tool: string; act: string; count: number; topValue: string | null; topCount: number }[]
  /** What clients did on the cards they were sent. */
  visit: { act: string; count: number }[]
  /** Page views by interface language. */
  languages: { language: string; views: number }[]
  errors: { tool: string | null; code: string; count: number }[]
  /** Visits inside an app's built-in browser (Instagram's, Facebook's…), and how many moved to a real browser. */
  inApp: { sessions: Kpi; opened: Kpi }
  /** Instagram accounts results were signed with, latest first (top 100). */
  accounts: ToolAccount[]
  /** Booking-site sessions the tools sent (utm_source=reserva-tools), and their sign-ups (tracked). */
  toPlatform: {
    visits: Kpi; signupStarts: Kpi; signups: Kpi
    bySpot: { spot: string; visits: number; signups: number }[]
  }
}

export interface AnalyticsEventRow {
  id: string
  name: string
  createdAt: string                  // ISO
  path: string | null
  host: string | null
  props: Record<string, unknown>
  partner: { id: string; name: string; slug: string | null } | null
  session: {
    id: string; visitorId: string; channel: string
    deviceType: string | null; browser: string | null; os: string | null
    country: string | null; city: string | null; language: string | null
    referrerHost: string | null; utmCampaign: string | null
    isInternal: boolean
  }
}

/** One visit (contract §11). Anonymous by design: the "person" is the random
 *  visitorId, never a name or phone. */
export interface SessionRow {
  id: string
  visitorId: string
  startedAt: string            // ISO (first event time)
  lastSeenAt: string           // ISO (last event time)
  durationSec: number          // last − first event, ≥ 0
  channel: string
  utmCampaign: string | null
  referrerHost: string | null
  deviceType: string | null; browser: string | null; os: string | null
  country: string | null; city: string | null; language: string | null
  landingPath: string | null
  landingHost: string | null
  isInternal: boolean
  /** Missing from a backend that predates the tools. */
  site?: Site
  eventCount: number
  pageViews: number
  /** Touched, first-seen order, ≤ 5. */
  partners: { id: string; name: string; slug: string | null }[]
  /** `reviewed` is missing from a backend that predates review tracking, and
   *  `exported` / `ctaClicked` (the tools) from one that predates the tools. */
  outcome: {
    booked: boolean; contacted: boolean; signedUp: boolean; reviewed?: boolean; bookClicked: boolean
    exported?: boolean; ctaClicked?: boolean
  }
  /** First ≤ 12 event names in order (for the preview chips). */
  journey: string[]
  /** All sessions of this visitorId (all time, bots excluded) — the "returning" hint. */
  visitorSessions: number
}

export type SessionOutcome =
  | 'booked' | 'contacted' | 'signup' | 'reviewed' | 'bookclick' | 'exported' | 'cta' | 'bounced'

export interface SessionEvent {
  id: string
  name: string
  at: string                   // ISO, server time
  clientAt: string | null      // ISO, the visitor's device clock
  path: string | null
  host: string | null
  partner: { id: string; name: string; slug: string | null } | null
  props: Record<string, unknown>
}

export interface SessionDetail {
  session: SessionRow
  /** All events, chronological by (clientAt ?? at), then at. */
  events: SessionEvent[]
  /** uuid → name for every svc / sp / loc / course id in the props. */
  labels: Record<string, string>
  /** Same visitorId, newest first, ≤ 20, excluding this session. */
  otherSessions: { id: string; startedAt: string; channel: string; eventCount: number; booked: boolean }[]
}

export interface AnalyticsSessionsQuery extends AnalyticsQuery {
  page?: number
  /** ≤ 50 (server cap). */
  pageSize?: number
  partnerId?: string
  channel?: string
  outcome?: SessionOutcome
}

/** First / last Yerevan day with any recorded event (bots excluded, staff
 *  included) — what "All" starts from and how far back a custom range may go.
 *  Both null while nothing has been recorded. Contract §8. */
export interface AnalyticsBounds { first: string | null; last: string | null }

/** What the tracker's two tables hold (contract §10). `bytes` is both tables
 *  with their indexes; `oldest` is the Yerevan day of the oldest event. */
export interface AnalyticsStorage { events: number; sessions: number; bytes: number; oldest: string | null }

/** Rows a delete removed. */
export interface AnalyticsDeleted { events: number; sessions: number }

/** The window every analytics endpoint takes. */
export interface AnalyticsQuery {
  /** 'YYYY-MM-DD', Yerevan calendar day, inclusive. */
  from: string
  /** 'YYYY-MM-DD', Yerevan calendar day, inclusive. */
  to: string
  /** Include staff sessions (rsv_staff cookie). Excluded by default. */
  includeInternal?: boolean
  /** reserva.am unless said otherwise. */
  site?: Site
}

export interface AnalyticsEventsQuery extends AnalyticsQuery {
  page?: number
  /** ≤ 100 (server cap). */
  pageSize?: number
  name?: string
  partnerId?: string
  /** Events of one tool (tools.reserva.am), by its registry id. */
  tool?: string
}

/** The API parses `includeInternal` as the literal strings 'true' | 'false', so
 *  send it spelled out rather than trusting how a boolean gets serialized. */
function windowParams(q: AnalyticsQuery) {
  return {
    from: q.from,
    to: q.to,
    includeInternal: q.includeInternal ? 'true' : 'false',
    ...(q.site && q.site !== 'web' ? { site: q.site } : {}),
  }
}

export const analyticsService = {
  bounds(): Promise<AnalyticsBounds> {
    return apiGet<AnalyticsBounds>('/platform/analytics/bounds')
  },

  storage(): Promise<AnalyticsStorage> {
    return apiGet<AnalyticsStorage>('/platform/analytics/storage')
  },

  /**
   * Owner only (the server answers 403 to anyone else). With `before` (a
   * Yerevan day) only events created before that day go, plus the sessions
   * left without events; without it, everything the tracker stored. Legacy
   * visits, bookings and partners are never touched.
   */
  async deleteData(opts: { before?: string } = {}): Promise<AnalyticsDeleted> {
    // Not apiDelete(): that one discards the body, and this endpoint reports
    // how many rows it removed.
    const res = await http.delete<{ data: AnalyticsDeleted }>('/platform/analytics/data', {
      params: opts.before ? { before: opts.before } : {},
    })
    return res.data.data
  },

  overview(q: AnalyticsQuery): Promise<AnalyticsOverview> {
    return apiGet<AnalyticsOverview>('/platform/analytics/overview', { params: windowParams(q) })
  },

  partners(q: AnalyticsQuery): Promise<AnalyticsPartners> {
    return apiGet<AnalyticsPartners>('/platform/analytics/partners', { params: windowParams(q) })
  },

  /** tools.reserva.am: what was opened, made and sent, and the sign-ups it led to. */
  tools(q: AnalyticsQuery): Promise<AnalyticsTools> {
    return apiGet<AnalyticsTools>('/platform/analytics/tools', { params: windowParams({ ...q, site: undefined }) })
  },

  /** `partnerId` narrows to sessions that had an event on that partner. */
  sources(q: AnalyticsQuery & { partnerId?: string }): Promise<AnalyticsSources> {
    return apiGet<AnalyticsSources>('/platform/analytics/sources', {
      params: { ...windowParams(q), ...(q.partnerId ? { partnerId: q.partnerId } : {}) },
    })
  },

  /** Visits in the window, newest first. A visit is in range when it has an event in range. */
  sessions(q: AnalyticsSessionsQuery): Promise<Paginated<SessionRow>> {
    return apiGet<Paginated<SessionRow>>('/platform/analytics/sessions', {
      params: {
        ...windowParams(q),
        page: q.page ?? 1,
        pageSize: q.pageSize ?? 25,
        ...(q.partnerId ? { partnerId: q.partnerId } : {}),
        ...(q.channel ? { channel: q.channel } : {}),
        ...(q.outcome ? { outcome: q.outcome } : {}),
      },
    })
  },

  /** One visit in full. Not bound to a window, and staff visits are included:
   *  a link to a session has to keep working whatever the toolbar says. */
  session(id: string): Promise<SessionDetail> {
    return apiGet<SessionDetail>(`/platform/analytics/sessions/${encodeURIComponent(id)}`)
  },

  events(q: AnalyticsEventsQuery): Promise<Paginated<AnalyticsEventRow>> {
    return apiGet<Paginated<AnalyticsEventRow>>('/platform/analytics/events', {
      params: {
        ...windowParams(q),
        page: q.page ?? 1,
        // Always explicit, so the page the table counts is the page the server cut.
        pageSize: q.pageSize ?? 25,
        ...(q.name ? { name: q.name } : {}),
        ...(q.partnerId ? { partnerId: q.partnerId } : {}),
        ...(q.tool ? { tool: q.tool } : {}),
      },
    })
  },
}
