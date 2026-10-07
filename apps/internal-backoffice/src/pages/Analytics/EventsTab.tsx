import { useState } from 'react'
import { Activity, X } from 'lucide-react'
import { Button, Empty, Pagination, Select, Table, Th, Td, Tr, type SelectOption } from '@/components/ui'
import { useResource } from '@/store/useResource'
import { analyticsService, type AnalyticsEventRow } from '@/services/analytics.service'
import { ALL, ErrorState, EventBadge, Skeleton, StaffTag, usePartnerOptions } from './parts'
import { EVENT_CATALOG, EVENT_GROUP_LABEL, TRAFFIC_CHANNEL_LABELS, eventDef, eventSummary, labelFrom } from './catalog'
import { ChannelIcon, DeviceIcon } from './icons'
import { deviceLabel, fmtEventTime, fmtEventTimeFull, fmtInt } from './format'
import { EventDrawer } from './EventDrawer'
import { VisitorTag } from './visitor'
import type { TabProps } from './OverviewTab'
import s from './Analytics.module.scss'

const EVENT_OPTIONS: SelectOption[] = [
  { value: ALL, label: 'All events' },
  // The raw name rides along as a keyword, so "book_click" finds "Book click".
  ...EVENT_CATALOG.map((e) => ({ value: e.name, label: e.label, sub: EVENT_GROUP_LABEL[e.group], keywords: [e.name] })),
]

export function EventsTab({
  range, includeStaff, refreshKey, eventName, partnerId, onEventChange, onPartnerChange, onClearFilters, onOpenSession,
}: TabProps & {
  /** The visit an event belongs to, as a journey. */
  onOpenSession: (sessionId: string) => void
  eventName: string
  partnerId: string
  onEventChange: (name: string) => void
  onPartnerChange: (id: string) => void
  onClearFilters: () => void
}) {
  const [pageSize, setPageSize] = useState(25)
  const [selected, setSelected] = useState<AnalyticsEventRow | null>(null)

  // Page 1 whenever the window or a filter changes. Keyed state instead of an
  // effect that resets it, which would fetch the stale page first.
  const filterKey = [range.from, range.to, includeStaff, eventName, partnerId, pageSize].join('|')
  const [paging, setPaging] = useState({ key: filterKey, page: 1 })
  const page = paging.key === filterKey ? paging.page : 1
  const setPage = (p: number) => setPaging({ key: filterKey, page: p })

  const { data, loading, error, reload } = useResource(
    () => analyticsService.events({
      from: range.from,
      to: range.to,
      includeInternal: includeStaff,
      page,
      pageSize,
      name: eventName || undefined,
      partnerId: partnerId || undefined,
    }),
    [range.from, range.to, includeStaff, eventName, partnerId, page, pageSize, refreshKey],
  )

  const items = data?.items ?? []
  const partnerName = items.find((e) => e.partner?.id === partnerId)?.partner?.name
  const partnerOptions = usePartnerOptions(partnerId, partnerName)
  const eventOptions = eventName && !EVENT_OPTIONS.some((o) => o.value === eventName)
    ? [...EVENT_OPTIONS, { value: eventName, label: eventDef(eventName).label }]
    : EVENT_OPTIONS
  const filtered = !!(eventName || partnerId)
  const total = data?.total ?? 0

  const filters = (
    <div className={s.filters}>
      <Select
        className={s.filterSelect}
        size="sm"
        value={eventName || ALL}
        onChange={(v) => onEventChange(v === ALL ? '' : v)}
        options={eventOptions}
        searchable
        searchPlaceholder="Search events…"
        panelMinWidth={260}
      />
      <Select
        className={s.filterSelect}
        size="sm"
        value={partnerId || ALL}
        onChange={(v) => onPartnerChange(v === ALL ? '' : v)}
        options={partnerOptions}
        searchable
        searchPlaceholder="Search partner…"
        panelMinWidth={260}
      />
      {filtered && (
        <Button variant="ghost" size="sm" onClick={onClearFilters}>
          <X size={13} /> Clear filters
        </Button>
      )}
      {data && <span className={s.filterCount}>{fmtInt(total)} {total === 1 ? 'event' : 'events'}</span>}
    </div>
  )

  if (error && !loading) {
    return (
      <div className={s.tab}>
        {filters}
        <ErrorState error={error} onRetry={() => void reload()} />
      </div>
    )
  }

  if (!data) {
    return (
      <div className={s.tab} aria-busy="true">
        {filters}
        <Skeleton height={480} />
      </div>
    )
  }

  const first = total === 0 ? 0 : (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, total)

  return (
    <div className={[s.tab, loading ? s.stale : s.fresh].join(' ')} aria-busy={loading}>
      {filters}

      {total === 0 ? (
        <div className={s.emptyCard}>
          {filtered ? (
            <Empty
              icon={Activity}
              title="No events match these filters"
              description="Nothing was recorded for this event or partner in the selected days. Try a longer range, or clear the filters."
              action={<Button size="sm" onClick={onClearFilters}><X size={13} /> Clear filters</Button>}
            />
          ) : (
            <Empty
              icon={Activity}
              title="No events yet"
              description={
                'Page views, clicks and booking steps stream in here as they happen — the new tracker starts '
                + 'collecting once the public site is released.'
                + (includeStaff ? '' : ' Staff traffic is hidden; switch it on above to see your own test clicks.')
              }
            />
          )}
        </div>
      ) : (
        <div className={s.tableWrap}>
          <Table className={s.tbl}>
            <thead>
              <tr>
                <Th>Time</Th>
                <Th>Visitor</Th>
                <Th>Event</Th>
                <Th>Partner</Th>
                <Th>Page</Th>
                <Th>Device · Country</Th>
                <Th>Channel</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((ev) => {
                const summary = eventSummary(ev.name, ev.props ?? {})
                return (
                  <Tr key={ev.id} onClick={() => setSelected(ev)} selected={selected?.id === ev.id}>
                    <Td><span className={s.evTime} title={fmtEventTimeFull(ev.createdAt)}>{fmtEventTime(ev.createdAt)}</span></Td>
                    {/* The same person keeps the same tag and mark on every row,
                        so their actions can be followed down the page. */}
                    <Td>
                      <VisitorTag visitorId={ev.session.visitorId} onOpen={() => onOpenSession(ev.session.id)} />
                    </Td>
                    <Td>
                      <div className={s.evCell}>
                        <EventBadge name={ev.name} />
                        {summary && <span className={s.evSummary} title={summary}>{summary}</span>}
                        {ev.session.isInternal && <StaffTag />}
                      </div>
                    </Td>
                    <Td>
                      {ev.partner
                        ? <span className={s.partnerLink} title={ev.partner.slug ?? undefined}>{ev.partner.name}</span>
                        : <span className={s.cellMuted}>—</span>}
                    </Td>
                    <Td>
                      <span className={s.path} title={ev.host ? `${ev.host}${ev.path ?? ''}` : (ev.path ?? undefined)}>
                        {ev.path || '—'}
                      </span>
                    </Td>
                    <Td>
                      <span className={s.iconText}>
                        <DeviceIcon type={ev.session.deviceType} size={13} />
                        {deviceLabel(ev.session.deviceType)}
                        {ev.session.country && <span className={s.cellMuted}>· {ev.session.country}</span>}
                      </span>
                    </Td>
                    <Td>
                      <span className={s.iconText}>
                        <ChannelIcon channel={ev.session.channel} size={13} />
                        {labelFrom(TRAFFIC_CHANNEL_LABELS, ev.session.channel)}
                      </span>
                    </Td>
                  </Tr>
                )
              })}
            </tbody>
          </Table>
          <Pagination
            page={page}
            pageCount={data.pageCount}
            onPageChange={setPage}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[25, 50, 100]}
            pageSizeLabel="Per page"
            summary={`Showing ${fmtInt(first)}–${fmtInt(last)} of ${fmtInt(total)}`}
          />
        </div>
      )}

      <EventDrawer
        event={selected}
        onClose={() => setSelected(null)}
        onOnlyEvent={(name) => { setSelected(null); onEventChange(name) }}
        onOnlyPartner={(id) => { setSelected(null); onPartnerChange(id) }}
        onOpenSession={(id) => { setSelected(null); onOpenSession(id) }}
      />
    </div>
  )
}
