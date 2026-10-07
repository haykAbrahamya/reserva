import { useEffect } from 'react'
import { Footprints, X } from 'lucide-react'
import { Button, Empty, Pagination, Select, Table, Th, Td, Tr, type SelectOption } from '@/components/ui'
import { useResource } from '@/store/useResource'
import { analyticsService, type SessionOutcome, type SessionRow } from '@/services/analytics.service'
import { ALL, ErrorState, Skeleton, StaffTag, usePartnerOptions } from './parts'
import { TRAFFIC_CHANNEL_LABELS, eventDef, labelFrom } from './catalog'
import { ChannelIcon, DeviceIcon } from './icons'
import { EventIcon, sessionOutcome } from './journey'
import { VisitorTag } from './visitor'
import { deviceLabel, fmtDuration, fmtEventTime, fmtEventTimeFull, fmtInt } from './format'
import type { TabProps } from './OverviewTab'
import s from './Analytics.module.scss'

/** Fixed: the page number lives in the URL so Back from a visit lands on the
 *  same page, and a page number only means something at a known size. */
const PAGE_SIZE = 25
/** Journey chips shown before "+N". */
const PREVIEW = 8

const CHANNEL_OPTIONS: SelectOption[] = [
  { value: ALL, label: 'All sources' },
  ...Object.entries(TRAFFIC_CHANNEL_LABELS).map(([value, label]) => ({ value, label })),
]

const OUTCOME_OPTIONS: SelectOption[] = [
  { value: ALL, label: 'Any outcome' },
  { value: 'booked', label: 'Booked' },
  { value: 'contacted', label: 'Contacted', sub: 'Call, WhatsApp, Instagram, directions…' },
  { value: 'signup', label: 'Signed up' },
  { value: 'bookclick', label: 'Clicked Book', sub: 'Clicked Book or opened the booking' },
  { value: 'bounced', label: 'Bounced', sub: 'One page view and nothing else' },
]

export function SessionsTab({
  range, includeStaff, refreshKey, page, partnerId, channel, outcome,
  onPageChange, onPartnerChange, onChannelChange, onOutcomeChange, onClearFilters, onOpen,
}: TabProps & {
  page: number
  partnerId: string
  channel: string
  outcome: SessionOutcome | ''
  onPageChange: (page: number) => void
  onPartnerChange: (id: string) => void
  onChannelChange: (channel: string) => void
  onOutcomeChange: (outcome: SessionOutcome | '') => void
  onClearFilters: () => void
  onOpen: (sessionId: string) => void
}) {
  const { data, loading, error, reload } = useResource(
    () => analyticsService.sessions({
      from: range.from,
      to: range.to,
      includeInternal: includeStaff,
      page,
      pageSize: PAGE_SIZE,
      partnerId: partnerId || undefined,
      channel: channel || undefined,
      outcome: outcome || undefined,
    }),
    [range.from, range.to, includeStaff, page, partnerId, channel, outcome, refreshKey],
  )

  // A page that no longer exists (fewer visits since) falls back to the first.
  useEffect(() => {
    if (data && data.items.length === 0 && page > 1) onPageChange(1)
  }, [data]) // eslint-disable-line react-hooks/exhaustive-deps

  const items = data?.items ?? []
  const partnerName = items.flatMap((r) => r.partners).find((p) => p.id === partnerId)?.name
  const partnerOptions = usePartnerOptions(partnerId, partnerName)
  const channelOptions = channel && !CHANNEL_OPTIONS.some((o) => o.value === channel)
    ? [...CHANNEL_OPTIONS, { value: channel, label: labelFrom(TRAFFIC_CHANNEL_LABELS, channel) }]
    : CHANNEL_OPTIONS
  const filtered = !!(partnerId || channel || outcome)
  const total = data?.total ?? 0

  const filters = (
    <div className={s.filters}>
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
      <Select
        className={s.filterSelectSm}
        size="sm"
        value={channel || ALL}
        onChange={(v) => onChannelChange(v === ALL ? '' : v)}
        options={channelOptions}
        searchable={false}
        panelMinWidth={200}
      />
      <Select
        className={s.filterSelectSm}
        size="sm"
        value={outcome || ALL}
        onChange={(v) => onOutcomeChange(v === ALL ? '' : (v as SessionOutcome))}
        options={OUTCOME_OPTIONS}
        searchable={false}
        panelMinWidth={240}
      />
      {filtered && (
        <Button variant="ghost" size="sm" onClick={onClearFilters}>
          <X size={13} /> Clear filters
        </Button>
      )}
      {data && <span className={s.filterCount}>{fmtInt(total)} {total === 1 ? 'visit' : 'visits'}</span>}
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
        <Skeleton height={520} />
      </div>
    )
  }

  const first = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const last = Math.min(page * PAGE_SIZE, total)

  return (
    <div className={[s.tab, loading ? s.stale : s.fresh].join(' ')} aria-busy={loading}>
      {filters}

      {total === 0 ? (
        <div className={s.emptyCard}>
          {filtered ? (
            <Empty
              icon={Footprints}
              title="No visits match these filters"
              description="Nothing in the selected days matches this partner, source and outcome. Try a longer range, or clear the filters."
              action={<Button size="sm" onClick={onClearFilters}><X size={13} /> Clear filters</Button>}
            />
          ) : (
            <Empty
              icon={Footprints}
              title="No visits in this period"
              description={
                'Each visit appears here with its whole journey — from the first page to booking, calling or leaving.'
                + (includeStaff ? '' : ' Staff visits are hidden; switch them on above to see your own.')
              }
            />
          )}
        </div>
      ) : (
        <div className={s.tableWrap}>
          <Table className={s.tbl}>
            <thead>
              <tr>
                <Th>Started</Th>
                <Th>Visitor</Th>
                <Th>Source</Th>
                <Th>Device · Country</Th>
                <Th>Partner</Th>
                <Th>Journey</Th>
                <Th>Outcome</Th>
                <Th className={s.num}>Duration</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <Tr key={row.id} onClick={() => onOpen(row.id)} title="Open this visit">
                  <Td>
                    <span className={s.evTime} title={fmtEventTimeFull(row.startedAt)}>{fmtEventTime(row.startedAt)}</span>
                  </Td>
                  <Td>
                    <span className={s.evCell}>
                      <VisitorTag
                        visitorId={row.visitorId}
                        suffix={row.visitorSessions > 1 ? `${fmtInt(row.visitorSessions)} visits` : undefined}
                      />
                      {row.isInternal && <StaffTag />}
                    </span>
                  </Td>
                  <Td><SourceCell row={row} /></Td>
                  <Td>
                    <span className={s.iconText}>
                      <DeviceIcon type={row.deviceType} size={13} />
                      {deviceLabel(row.deviceType)}
                      {row.country && <span className={s.cellMuted}>· {row.country}</span>}
                    </span>
                  </Td>
                  <Td><PartnersCell partners={row.partners} /></Td>
                  <Td><JourneyPreview row={row} /></Td>
                  <Td><OutcomeBadge row={row} /></Td>
                  <Td className={s.num}>
                    {row.eventCount > 1 ? fmtDuration(row.durationSec) : <span className={s.cellMuted}>—</span>}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          <Pagination
            page={page}
            pageCount={data.pageCount}
            onPageChange={onPageChange}
            summary={`Showing ${fmtInt(first)}–${fmtInt(last)} of ${fmtInt(total)}`}
          />
        </div>
      )}
    </div>
  )
}

/** Channel with its icon; the campaign (or the referring site) underneath. */
export function SourceCell({ row }: { row: SessionRow }) {
  const detail = row.utmCampaign ?? row.referrerHost
  return (
    <span className={s.sourceCell}>
      <span className={s.iconText}>
        <ChannelIcon channel={row.channel} size={13} />
        {labelFrom(TRAFFIC_CHANNEL_LABELS, row.channel)}
      </span>
      {detail && <span className={s.sourceDetail} title={detail}>{detail}</span>}
    </span>
  )
}

function PartnersCell({ partners }: { partners: SessionRow['partners'] }) {
  if (partners.length === 0) return <span className={s.cellMuted}>—</span>
  return (
    <span className={s.partnerLink} title={partners.map((p) => p.name).join(', ')}>
      {partners[0].name}
      {partners.length > 1 && <span className={s.cellMuted}> +{partners.length - 1}</span>}
    </span>
  )
}

/** The first steps as icons — the shape of a visit at a glance. */
function JourneyPreview({ row }: { row: SessionRow }) {
  const shown = row.journey.slice(0, PREVIEW)
  const more = Math.max(0, row.eventCount - shown.length)
  return (
    <span className={s.journey} aria-label={`${fmtInt(row.eventCount)} events`}>
      {shown.map((name, i) => {
        const def = eventDef(name)
        return (
          <span key={i} className={`${s.journeyChip} ${s[`tone_${def.tone}`]}`} title={def.label}>
            <EventIcon name={name} size={11} />
          </span>
        )
      })}
      {more > 0 && <span className={s.journeyMore}>+{fmtInt(more)}</span>}
    </span>
  )
}

export function OutcomeBadge({ row }: { row: SessionRow }) {
  const o = sessionOutcome(row)
  return (
    <span className={`${s.evBadge} ${s[`tone_${o.tone}`]}`} title={o.title}>
      <span className={s.evDot} />
      {o.label}
    </span>
  )
}
