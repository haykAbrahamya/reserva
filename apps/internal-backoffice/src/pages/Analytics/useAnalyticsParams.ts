import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import type { SessionOutcome } from '@/services/analytics.service'
import {
  DEFAULT_RANGE, MAX_RANGE_DAYS, daysInclusive, isPresetKey, isYmd, type PresetKey, type RangeSelection,
} from './range'

export type AnalyticsTab = 'overview' | 'partners' | 'sources' | 'sessions' | 'events'

const TABS: readonly AnalyticsTab[] = ['overview', 'partners', 'sources', 'sessions', 'events']
const OUTCOMES: readonly SessionOutcome[] = ['booked', 'contacted', 'signup', 'bookclick', 'bounced']

type ParamKey = 'tab' | 'range' | 'from' | 'to' | 'staff' | 'event' | 'partner' | 'session' | 'channel' | 'outcome' | 'page'

/** Marks a history entry pushed from inside Analytics, so "Back" can really
 *  go back instead of guessing where the visitor came from. */
interface NavState { fromAnalytics?: boolean }

/** A hand-typed or stale from/to that the API would reject falls back to the
 *  default range instead of turning the whole page into an error. */
function parseCustom(from: string | null, to: string | null): RangeSelection | null {
  if (!isYmd(from) || !isYmd(to) || from > to) return null
  if (daysInclusive(from, to) > MAX_RANGE_DAYS) return null
  return { key: 'custom', from, to }
}

/**
 * Everything that decides what the analytics screen shows lives in the URL —
 * tab, range (`range=7d|…|all`, or `from`+`to` for a custom one), the staff
 * switch, the filters and an open session — so a refresh, the back button,
 * or a link pasted to a colleague all land on the same view. Defaults are left
 * out to keep the plain /analytics link clean.
 */
export function useAnalyticsParams() {
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const navState = (location.state ?? null) as NavState | null

  const tabParam = params.get('tab')
  const tab: AnalyticsTab = TABS.includes(tabParam as AnalyticsTab) ? (tabParam as AnalyticsTab) : 'overview'
  const rangeParam = params.get('range')
  const selection: RangeSelection =
    parseCustom(params.get('from'), params.get('to'))
    ?? { key: isPresetKey(rangeParam) ? rangeParam : DEFAULT_RANGE }
  const includeStaff = params.get('staff') === '1'
  const eventName = params.get('event') ?? ''
  const partnerId = params.get('partner') ?? ''
  const sessionId = tab === 'sessions' ? (params.get('session') ?? '') : ''
  const channel = params.get('channel') ?? ''
  // The Sessions list's page — in the URL so Back from a visit lands on it again.
  const page = Math.max(1, Math.floor(Number(params.get('page'))) || 1)
  const outcomeParam = params.get('outcome')
  const outcome: SessionOutcome | '' = OUTCOMES.includes(outcomeParam as SessionOutcome)
    ? (outcomeParam as SessionOutcome)
    : ''

  /** View tweaks replace the history entry (keeping its Back marker); drill-
   *  downs push one, so Back returns to where the click happened. */
  const update = (patch: Partial<Record<ParamKey, string | null>>, opts: { push?: boolean } = {}) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const [key, value] of Object.entries(patch)) {
          if (value == null || value === '') next.delete(key)
          else next.set(key, value)
        }
        return next
      },
      opts.push
        ? { state: { fromAnalytics: true } satisfies NavState }
        : { replace: true, state: location.state },
    )
  }

  return {
    tab,
    selection,
    includeStaff,
    eventName,
    partnerId,
    sessionId,
    channel,
    outcome,
    page,
    /** The open session was reached from inside Analytics (Back goes there). */
    sessionFromInside: !!navState?.fromAnalytics,
    // Anything that changes what is listed starts again at page 1, and a tab
    // click always lands on that tab's main view, never a session left open.
    setTab: (next: AnalyticsTab) => update({ tab: next === 'overview' ? null : next, session: null, page: null }),
    setPreset: (key: PresetKey) => update({ range: key === DEFAULT_RANGE ? null : key, from: null, to: null, page: null }),
    setCustom: (from: string, to: string) => update({ range: null, from, to, page: null }),
    setIncludeStaff: (on: boolean) => update({ staff: on ? '1' : null, page: null }),
    setEventName: (name: string) => update({ event: name || null, page: null }),
    setPartnerId: (id: string) => update({ partner: id || null, page: null }),
    setChannel: (ch: string) => update({ channel: ch || null, page: null }),
    setOutcome: (o: SessionOutcome | '') => update({ outcome: o || null, page: null }),
    setPage: (p: number) => update({ page: p > 1 ? String(p) : null }),
    clearEventFilters: () => update({ event: null, partner: null, page: null }),
    clearSessionFilters: () => update({ partner: null, channel: null, outcome: null, page: null }),
    /** A different tab as a navigation step (Back comes back here). */
    goToTab: (next: AnalyticsTab) => update({ tab: next === 'overview' ? null : next, session: null, page: null }, { push: true }),
    /** Drill into one partner's raw events. */
    openPartnerEvents: (id: string) =>
      update({ tab: 'events', partner: id, event: null, session: null, page: null }, { push: true }),
    /** One visit's journey; Back returns to the list, the event or the visit it was opened from. */
    openSession: (id: string) => update({ tab: 'sessions', session: id }, { push: true }),
    closeSession: () => {
      if (navState?.fromAnalytics) navigate(-1)
      else update({ session: null })
    },
  }
}
