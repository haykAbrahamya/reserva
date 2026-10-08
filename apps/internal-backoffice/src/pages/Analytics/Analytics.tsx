import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Database, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui'
import { useResource } from '@/store/useResource'
import { analyticsService } from '@/services/analytics.service'
import { useAnalyticsParams, type AnalyticsTab } from './useAnalyticsParams'
import { resolveRange, yerevanToday } from './range'
import { RangeControl } from './RangeControl'
import { AnalyticsBoundary } from './AnalyticsBoundary'
import { DataDialog } from './DataDialog'
import { Skeleton } from './parts'
import { OverviewTab } from './OverviewTab'
import { PartnersTab } from './PartnersTab'
import { SourcesTab } from './SourcesTab'
import { SessionsTab } from './SessionsTab'
import { SessionView } from './SessionView'
import { EventsTab } from './EventsTab'
import s from './Analytics.module.scss'

const TAB_OPTIONS: { value: AnalyticsTab; label: string }[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'partners', label: 'Partners' },
  { value: 'sources', label: 'Sources' },
  { value: 'sessions', label: 'Sessions' },
  { value: 'events', label: 'Events' },
]

/** The route element: the page inside a boundary, so a bug here can never
 *  blank the rest of the console. */
export function Analytics() {
  return (
    <AnalyticsBoundary page>
      <AnalyticsScreen />
    </AnalyticsBoundary>
  )
}

/**
 * Site analytics from the public-site tracker. One toolbar scopes every tab,
 * so the numbers on all of them always describe the same days and the same
 * audience.
 */
function AnalyticsScreen() {
  const p = useAnalyticsParams()
  const [refreshKey, setRefreshKey] = useState(0)
  const [dataOpen, setDataOpen] = useState(false)
  const today = yerevanToday()

  // First recorded day: where All starts and how far back Custom may go.
  const { data: bounds, error: boundsError } = useResource(() => analyticsService.bounds(), [refreshKey])
  const waitingForBounds = p.selection.key === 'all' && !bounds && !boundsError
  const range = waitingForBounds ? null : resolveRange(p.selection, today, bounds ? bounds.first : undefined)

  const common = range && { range, includeStaff: p.includeStaff, refreshKey }

  // Section tabs: arrow keys move between them (the tablist pattern), and on a
  // phone, where they scroll sideways, the open one is kept in view.
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const tabIndex = TAB_OPTIONS.findIndex((t) => t.value === p.tab)
  useEffect(() => {
    tabRefs.current[tabIndex]?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [tabIndex])
  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = (tabIndex + step + TAB_OPTIONS.length) % TAB_OPTIONS.length
    p.setTab(TAB_OPTIONS[next].value)
    tabRefs.current[next]?.focus()
  }

  // A visit opens at the top; Back puts the list where it was left. The
  // console scrolls inside its <main>, which a route change resets but a query
  // change does not.
  const pageRef = useRef<HTMLDivElement>(null)
  const listScroll = useRef(0)
  const openSession = useRef(p.sessionId)
  useLayoutEffect(() => {
    const main = pageRef.current?.closest('main')
    const was = openSession.current
    openSession.current = p.sessionId
    if (!main || was === p.sessionId) return
    if (p.sessionId && !was) listScroll.current = main.scrollTop
    main.scrollTop = p.sessionId ? 0 : listScroll.current
  }, [p.sessionId])

  return (
    <div className={s.page} ref={pageRef}>
      <div className={s.head}>
        <div>
          <h1 className={s.h1}>Analytics</h1>
          <p className={s.sub}>How people find and use reserva.am — the marketplace, sign-up and every partner page.</p>
        </div>
      </div>

      {/* One bar: the sections as underline tabs (navigation) on the left, what
          they all look at on the right. Two look-alike pill strips used to stack
          here, giving a filter the same weight as the page's navigation. */}
      <div className={s.toolbar}>
        <div className={s.navTabs} role="tablist" aria-label="Analytics sections" onKeyDown={onTabKey}>
          {TAB_OPTIONS.map((t, i) => {
            const on = t.value === p.tab
            return (
              <button
                key={t.value}
                ref={(el) => { tabRefs.current[i] = el }}
                type="button"
                role="tab"
                aria-selected={on}
                tabIndex={on ? 0 : -1}
                className={[s.navTab, on ? s.navTabOn : ''].filter(Boolean).join(' ')}
                onClick={() => p.setTab(t.value)}
              >
                {t.label}
              </button>
            )
          })}
        </div>

        <div className={s.controls}>
          <RangeControl
            value={p.selection.key}
            range={range}
            first={bounds?.first}
            today={today}
            onPreset={p.setPreset}
            onCustom={p.setCustom}
            includeStaff={p.includeStaff}
            onIncludeStaffChange={p.setIncludeStaff}
          />
          {/* Kept together so a narrow toolbar never strands one of them on a line of its own. */}
          <span className={s.toolActions}>
            <Button variant="ghost" size="sm" onClick={() => setDataOpen(true)} title="Stored data and clearing it" aria-label="Stored data">
              <Database size={14} /> <span className={s.dataLabel}>Data</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon
              onClick={() => setRefreshKey((k) => k + 1)}
              title="Refresh"
              aria-label="Refresh"
            >
              <RefreshCw size={14} />
            </Button>
          </span>
        </div>
      </div>

      {/* A delete changes everything on screen: bounds (where All starts) and
          the open tab both refetch through the shared refresh key. */}
      <DataDialog open={dataOpen} onClose={() => setDataOpen(false)} onDeleted={() => setRefreshKey((k) => k + 1)} />

      <div className={s.body}>
        {/* Keyed on tab + range + visit: moving on clears a caught error by itself. */}
        <AnalyticsBoundary resetKey={`${p.tab}|${range?.from}|${range?.to}|${p.sessionId}`}>
          {p.tab === 'sessions' && p.sessionId ? (
            // A visit is not bound to the toolbar's window: a link to it keeps working.
            <SessionView
              sessionId={p.sessionId}
              backLabel={p.sessionFromInside ? 'Back' : 'All sessions'}
              onBack={p.closeSession}
              onOpenSession={p.openSession}
            />
          ) : !common ? (
            <Skeleton height={420} />
          ) : p.tab === 'overview' ? (
            <OverviewTab {...common} onOpenPartner={p.openPartnerEvents} onShowPartners={() => p.goToTab('partners')} />
          ) : p.tab === 'partners' ? (
            <PartnersTab {...common} onOpenPartner={p.openPartnerEvents} />
          ) : p.tab === 'sources' ? (
            <SourcesTab {...common} partnerId={p.partnerId} onPartnerChange={p.setPartnerId} />
          ) : p.tab === 'sessions' ? (
            <SessionsTab
              {...common}
              page={p.page}
              partnerId={p.partnerId}
              channel={p.channel}
              outcome={p.outcome}
              onPageChange={p.setPage}
              onPartnerChange={p.setPartnerId}
              onChannelChange={p.setChannel}
              onOutcomeChange={p.setOutcome}
              onClearFilters={p.clearSessionFilters}
              onOpen={p.openSession}
            />
          ) : (
            <EventsTab
              {...common}
              eventName={p.eventName}
              partnerId={p.partnerId}
              onEventChange={p.setEventName}
              onPartnerChange={p.setPartnerId}
              onClearFilters={p.clearEventFilters}
              onOpenSession={p.openSession}
            />
          )}
        </AnalyticsBoundary>
      </div>
    </div>
  )
}
