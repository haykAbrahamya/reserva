import { useMemo, useState } from 'react'
import { ArrowRight, Building2, ChartLine, ChevronRight, MessageCircle } from 'lucide-react'
import { SegmentedFilter, Table, Th, Td, Tr } from '@/components/ui'
import { useResource } from '@/store/useResource'
import { analyticsService, type Kpi } from '@/services/analytics.service'
import { TrafficChart, TrafficLegend } from './TrafficChart'
import { bucketSeries, granularityFor, type ChartPoint, type Granularity } from './buckets'
import { BarList, DeltaChip, ErrorState, KpiTile, Panel, PanelEmpty, Skeleton } from './parts'
import { CONTACT_CHANNEL_LABELS, labelFrom } from './catalog'
import { ContactIcon } from './icons'
import { fmtInt, fmtPct } from './format'
import { fmtSpan, prevPeriodName, type ResolvedRange } from './range'
import s from './Analytics.module.scss'

export interface TabProps {
  range: ResolvedRange
  includeStaff: boolean
  /** Bumped by the toolbar's refresh button. */
  refreshKey: number
}

interface FunnelStep {
  label: string
  kpi: Kpi
  /** The previous step, as the denominator reads: "40.2% of starts". */
  of?: string
  note?: string
}

const CHART_COPY: Record<Granularity, { title: string; sub: string }> = {
  day: {
    title: 'Daily traffic',
    sub: 'Visitors and page views per day, with public bookings below on their own scale.',
  },
  week: {
    title: 'Weekly traffic',
    sub: 'Totals per week (Mon–Sun) — visitors are added up day by day. Public bookings below, on their own scale.',
  },
  month: {
    title: 'Monthly traffic',
    sub: 'Totals per month — visitors are added up day by day. Public bookings below, on their own scale.',
  },
}

export function OverviewTab({ range, includeStaff, refreshKey, onOpenPartner, onShowPartners }: TabProps & {
  onOpenPartner: (partnerId: string) => void
  onShowPartners: () => void
}) {
  const [view, setView] = useState<'chart' | 'table'>('chart')
  const { data, loading, error, reload } = useResource(
    () => analyticsService.overview({ from: range.from, to: range.to, includeInternal: includeStaff }),
    [range.from, range.to, includeStaff, refreshKey],
  )

  // Bucket by the data's own length, so the chart and its numbers can never
  // disagree while a new range is still loading.
  const gran = granularityFor(data?.series.length ?? range.days)
  const points = useMemo(() => (data ? bucketSeries(data.series, gran) : []), [data, gran])

  if (error && !loading) return <ErrorState error={error} onRetry={() => void reload()} />
  if (!data) return <OverviewSkeleton />

  const k = data.kpis
  // All has no earlier period, so it gets no deltas at all rather than
  // "▲ new" on every tile.
  const baseline = range.comparable ? `${prevPeriodName(range.days)} (${fmtSpan(range.prevFrom, range.prevTo)})` : null
  const hasTraffic = data.series.some((d) => d.visitors > 0 || d.pageViews > 0 || d.bookings > 0)
  const copy = CHART_COPY[gran]

  const funnel: FunnelStep[] = [
    { label: 'Sign-up page views', kpi: k.signupViews },
    { label: 'Started', kpi: k.signupStarts, of: 'views' },
    { label: 'Submitted', kpi: k.signups, of: 'starts', note: 'from registrations' },
    { label: 'Activated', kpi: k.activations, of: 'submitted', note: 'from registrations' },
  ]

  return (
    <div className={[s.tab, loading ? s.stale : s.fresh].join(' ')} aria-busy={loading}>
      {/* A window ending today sets a partial day against full ones — said
          once here so a dip early in the morning isn't read as a drop. */}
      <p className={s.caption}>
        {baseline
          ? <>Changes compare with {baseline}.{range.endsToday && ' Today is still in progress.'}</>
          : <>All recorded time, {fmtSpan(range.from, range.to)}. No changes shown — there is no earlier period to compare with.</>}
      </p>

      <div className={s.kpiGrid}>
        <KpiTile label="Visitors" kpi={k.visitors} baseline={baseline} />
        <KpiTile label="Sessions" kpi={k.sessions} baseline={baseline} />
        <KpiTile label="Page views" kpi={k.pageViews} baseline={baseline} />
        <KpiTile label="Partner page views" kpi={k.partnerViews} baseline={baseline} />
        <KpiTile label="Book clicks" kpi={k.bookClicks} baseline={baseline} />
        <KpiTile label="Booking opened" kpi={k.bookingOpens} baseline={baseline} />
        {/* Counted from the bookings table, not from tracker events — the one
            number on this screen that ad blockers cannot lower. */}
        <KpiTile label="Bookings" note="from bookings" kpi={k.bookings} baseline={baseline} />
        <KpiTile label="Contact clicks" note="all channels" kpi={k.contactClicks} baseline={baseline} />
      </div>

      <Panel
        title="Sign-up funnel"
        sub="From the sign-up page to an activated account. Submitted and activated come from registrations, not from the tracker."
      >
        <Funnel steps={funnel} baseline={baseline} />
      </Panel>

      <Panel
        title={copy.title}
        sub={copy.sub}
        action={points.length > 1 && hasTraffic && (
          <>
            {view === 'chart' && <TrafficLegend />}
            <SegmentedFilter
              size="sm"
              ariaLabel="Show as"
              value={view}
              onChange={setView}
              options={[{ value: 'chart', label: 'Chart' }, { value: 'table', label: 'Table' }]}
            />
          </>
        )}
      >
        {points.length < 2 ? (
          <PanelEmpty icon={ChartLine} title="A trend needs more than one day">
            This period’s totals are in the tiles above — pick a longer range to see the line.
          </PanelEmpty>
        ) : !hasTraffic ? (
          <PanelEmpty icon={ChartLine} title="No visits recorded in this period">
            Visitors, page views and bookings appear here as the public site reports them — the new tracker
            starts collecting once the public site is released.
            {!includeStaff && ' Staff traffic is excluded.'}
          </PanelEmpty>
        ) : view === 'chart' ? (
          <TrafficChart
            points={points}
            label={`${copy.title}: visitors, page views and bookings, ${fmtSpan(range.from, range.to)}`}
          />
        ) : (
          <PointsTable points={points} gran={gran} />
        )}
      </Panel>

      <div className={s.split}>
        <Panel title="Contact clicks by channel" sub="Taps on a partner’s phone, WhatsApp, Instagram, map and other links.">
          {data.contacts.length === 0 ? (
            <PanelEmpty icon={MessageCircle} title="No contact clicks yet">
              Every tap on Call, WhatsApp, Instagram or Directions on a partner page is counted here.
            </PanelEmpty>
          ) : (
            <BarList
              items={data.contacts.map((c) => ({
                key: c.channel,
                label: labelFrom(CONTACT_CHANNEL_LABELS, c.channel),
                icon: <ContactIcon channel={c.channel} />,
                value: c.count,
              }))}
            />
          )}
        </Panel>

        <Panel
          title="Top partners"
          sub="By page views. Click a partner for its events."
          flush
          action={(
            <button type="button" className={s.panelLink} onClick={onShowPartners}>
              All partners <ArrowRight size={13} />
            </button>
          )}
        >
          {data.topPartners.length === 0 ? (
            <PanelEmpty icon={Building2} title="No partner pages visited">
              Partners show up here once someone opens their page or books online.
            </PanelEmpty>
          ) : (
            <Table className={s.tbl}>
              <thead>
                <tr>
                  <Th>Partner</Th>
                  <Th className={s.num}>Views</Th>
                  <Th className={s.num}>Visitors</Th>
                  <Th className={s.num}>Bookings</Th>
                  <Th className={s.num}><span title="Conversion: visits to the page that ended in a booking">Conv.</span></Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {data.topPartners.map((p) => (
                  <Tr key={p.partnerId} onClick={() => onOpenPartner(p.partnerId)} title={`Show events for ${p.name}`}>
                    <Td>
                      <div className={s.partnerCell}>
                        <span className={s.partnerName}>{p.name}</span>
                        {p.slug && <span className={s.partnerSlug}>{p.slug}</span>}
                      </div>
                    </Td>
                    <Td className={`${s.num} ${s.strong}`}>{fmtInt(p.views)}</Td>
                    <Td className={s.num}>{fmtInt(p.visitors)}</Td>
                    <Td className={s.num}>{fmtInt(p.bookings)}</Td>
                    <Td className={s.num}>{fmtPct(p.conversion)}</Td>
                    <Td className={s.num}><ChevronRight size={14} className={s.rowGo} /></Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>
      </div>
    </div>
  )
}

/**
 * Steps side by side with the drop between them. Each bar is the step against
 * the widest one, so the funnel's shape reads before any number does.
 */
function Funnel({ steps, baseline }: { steps: FunnelStep[]; baseline: string | null }) {
  const max = Math.max(1, ...steps.map((st) => st.kpi.value))
  return (
    <div className={s.funnel}>
      {steps.map((st, i) => {
        const prev = i > 0 ? steps[i - 1].kpi.value : 0
        const conv = prev > 0 ? st.kpi.value / prev : null
        return (
          <div key={st.label} className={s.step}>
            {i > 0 && <span className={s.stepArrow} aria-hidden="true"><ChevronRight size={11} /></span>}
            <div className={s.kpiLabel}>
              {st.label}
              {st.note && <span className={s.kpiNote}>{st.note}</span>}
            </div>
            <div className={s.kpiValue}>{fmtInt(st.kpi.value)}</div>
            {baseline && (
              <div className={s.kpiFoot}>
                <DeltaChip kpi={st.kpi} baseline={baseline} />
                <span className={s.kpiPrev}>vs {fmtInt(st.kpi.prev)}</span>
              </div>
            )}
            <div
              className={[s.stepBar, st.kpi.value === 0 ? s.stepBarEmpty : ''].filter(Boolean).join(' ')}
              style={{ width: `${(st.kpi.value / max) * 100}%` }}
            />
            {/* Steps are counted independently over the same days, so a step
                can pass 100% — e.g. activations of sign-ups from before the range. */}
            <div
              className={s.stepConv}
              title={i > 0 ? 'Share of the previous step over the same days. Steps are counted separately, so this can pass 100%.' : undefined}
            >
              {i === 0 ? ' ' : <><b>{fmtPct(conv)}</b> of {st.of}</>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

const PERIOD_HEAD: Record<Granularity, string> = { day: 'Day', week: 'Week', month: 'Month' }

/** The chart's accessible twin: every point's numbers, newest first. */
function PointsTable({ points, gran }: { points: ChartPoint[]; gran: Granularity }) {
  return (
    <div className={s.tableScroll}>
      <Table className={s.tbl}>
        <thead>
          <tr>
            <Th>{PERIOD_HEAD[gran]}</Th>
            <Th className={s.num}>Visitors</Th>
            <Th className={s.num}>Sessions</Th>
            <Th className={s.num}>Page views</Th>
            <Th className={s.num}>Bookings</Th>
          </tr>
        </thead>
        <tbody>
          {[...points].reverse().map((p) => (
            <tr key={p.start}>
              <Td>
                {p.title}
                {p.note && <span className={s.cellNote}>{p.note}</span>}
              </Td>
              <Td className={`${s.num} ${s.strong}`}>{fmtInt(p.visitors)}</Td>
              <Td className={s.num}>{fmtInt(p.sessions)}</Td>
              <Td className={s.num}>{fmtInt(p.pageViews)}</Td>
              <Td className={s.num}>{fmtInt(p.bookings)}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  )
}

function OverviewSkeleton() {
  return (
    <div className={s.tab} aria-busy="true">
      <Skeleton height={16} className={s.skelLine} />
      <div className={s.kpiGrid}>
        {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} height={96} />)}
      </div>
      <Skeleton height={168} />
      <Skeleton height={372} />
      <div className={s.split}>
        <Skeleton height={250} />
        <Skeleton height={250} />
      </div>
    </div>
  )
}
