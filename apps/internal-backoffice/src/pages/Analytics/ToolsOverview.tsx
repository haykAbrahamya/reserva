import { useMemo, useState } from 'react'
import { CalendarCheck, ChartLine, ChevronRight, Download, Languages, ListChecks, Palette, TriangleAlert, Wrench } from 'lucide-react'
import { SegmentedFilter, Table, Th, Td, Tr } from '@/components/ui'
import { useResource } from '@/store/useResource'
import { analyticsService, type ToolRow } from '@/services/analytics.service'
import { TrafficChart, TrafficLegend, type TrafficLabels } from './TrafficChart'
import { bucketSeries, granularityFor, type ChartPoint, type Granularity } from './buckets'
import { BarList, ErrorState, Funnel, KpiTile, Panel, PanelEmpty, Skeleton, type FunnelStep } from './parts'
import {
  EXPORT_VIA_LABELS, TOOL_ACT_LABELS, TOOL_ERROR_LABELS, TOOL_LABELS, TOOLS_SPOT_LABELS, UI_LANGUAGE_LABELS,
  VISIT_ACT_LABELS, labelFrom, toolValueLabel,
} from './catalog'
import { EventIcon } from './journey'
import { fmtInt, fmtPct } from './format'
import { fmtSpan, prevPeriodName } from './range'
import type { TabProps } from './OverviewTab'
import s from './Analytics.module.scss'

/** The chart's marks, as the tools fill them. */
const TOOL_CHART_LABELS: TrafficLabels = {
  visitors: 'Visitors',
  pageViews: 'Tool opens',
  sessions: 'Sessions',
  bookings: 'Exports',
}

const CHART_COPY: Record<Granularity, string> = {
  day: 'Visitors and tool opens per day, with results exported below on their own scale.',
  week: 'Totals per week (Mon–Sun) — visitors are added up day by day. Exports below, on their own scale.',
  month: 'Totals per month — visitors are added up day by day. Exports below, on their own scale.',
}

/** How a result left, in the order the table reads. */
const VIA_ORDER = ['share', 'download', 'pdf', 'whatsapp', 'viber', 'copy', 'hold'] as const

/**
 * tools.reserva.am on its own: who came, which tools they opened, what they
 * made and how it left, what clients did with the cards they were sent, and
 * how many went on to reserva.am and signed up. Nothing here moves the
 * booking site's numbers.
 */
export function ToolsOverview({ range, includeStaff, refreshKey, onOpenTool }: TabProps & {
  /** Drill into one tool's raw events. */
  onOpenTool: (tool: string) => void
}) {
  const [view, setView] = useState<'chart' | 'table'>('chart')
  const { data, loading, error, reload } = useResource(
    () => analyticsService.tools({ from: range.from, to: range.to, includeInternal: includeStaff }),
    [range.from, range.to, includeStaff, refreshKey],
  )

  const gran = granularityFor(data?.series.length ?? range.days)
  const points = useMemo(
    () => (data
      ? bucketSeries(
          data.series.map((d) => ({ date: d.date, visitors: d.visitors, sessions: d.sessions, pageViews: d.toolViews, bookings: d.exports })),
          gran,
        )
      : []),
    [data, gran],
  )

  if (error && !loading) return <ErrorState error={error} onRetry={() => void reload()} />
  if (!data) return <ToolsSkeleton />

  const k = data.kpis
  const p = data.toPlatform
  const baseline = range.comparable ? `${prevPeriodName(range.days)} (${fmtSpan(range.prevFrom, range.prevTo)})` : null
  const hasTraffic = data.series.some((d) => d.visitors > 0 || d.toolViews > 0 || d.exports > 0)

  const funnel: FunnelStep[] = [
    { label: 'Clicked to Reserva', kpi: k.ctaClicks, note: 'on the tools' },
    { label: 'Arrived on reserva.am', kpi: p.visits, of: 'clicks' },
    { label: 'Started sign-up', kpi: p.signupStarts, of: 'arrivals' },
    { label: 'Signed up', kpi: p.signups, of: 'starts' },
  ]

  const inAppFunnel: FunnelStep[] = [
    { label: 'Visits', kpi: k.sessions, note: 'all' },
    { label: 'In an app’s browser', kpi: data.inApp.sessions, of: 'visits', note: 'Instagram, Facebook…' },
    { label: 'Moved to a real browser', kpi: data.inApp.opened, of: 'in-app visits' },
  ]

  return (
    <div className={[s.tab, loading ? s.stale : s.fresh].join(' ')} aria-busy={loading}>
      <p className={s.caption}>
        {baseline
          ? <>Changes compare with {baseline}.{range.endsToday && ' Today is still in progress.'}</>
          : <>All recorded time, {fmtSpan(range.from, range.to)}. No changes shown — there is no earlier period to compare with.</>}
      </p>

      <div className={s.kpiGrid}>
        <KpiTile label="Visitors" kpi={k.visitors} baseline={baseline} />
        <KpiTile label="Tool opens" kpi={k.toolViews} baseline={baseline} />
        <KpiTile label="Started editing" note="page views" kpi={k.edits} baseline={baseline} />
        <KpiTile label="Results exported" note="shared, downloaded, sent" kpi={k.exports} baseline={baseline} />
        <KpiTile label="Cards opened" note="by clients" kpi={k.cardViews} baseline={baseline} />
        <KpiTile label="Clicks to Reserva" kpi={k.ctaClicks} baseline={baseline} />
        <KpiTile label="Arrived on reserva.am" kpi={p.visits} baseline={baseline} />
        <KpiTile label="Signed up" note="from the tools" kpi={p.signups} baseline={baseline} />
      </div>

      <Panel
        title="From the tools to Reserva"
        sub="Clicks on the tools into reserva.am, the visits they became there (links tagged utm_source=reserva-tools), and how many of those signed up. All from the tracker."
      >
        <Funnel steps={funnel} baseline={baseline} />
        {p.bySpot.length > 0 && (
          <div className={s.toolsSpots}>
            <BarList
              items={p.bySpot.map((r) => ({
                key: r.spot,
                label: labelFrom(TOOLS_SPOT_LABELS, r.spot),
                value: r.visits,
                meta: r.signups ? `${fmtInt(r.signups)} signed up` : undefined,
                hint: 'Visits on reserva.am from this link',
              }))}
            />
          </div>
        )}
      </Panel>

      <Panel
        title="Inside apps’ browsers"
        sub="A link in a reel or an ad opens in Instagram’s or Facebook’s own browser, which can’t save a file. How many visits started there, and how many moved to Chrome or copied the link to open elsewhere. Results shown there to press and hold are in “How results leave”."
      >
        <Funnel steps={inAppFunnel} baseline={baseline} />
      </Panel>

      <Panel
        title={gran === 'day' ? 'Daily use' : gran === 'week' ? 'Weekly use' : 'Monthly use'}
        sub={CHART_COPY[gran]}
        action={points.length > 1 && hasTraffic && (
          <>
            {view === 'chart' && <TrafficLegend labels={TOOL_CHART_LABELS} />}
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
          <PanelEmpty icon={ChartLine} title="Nobody used the tools in this period">
            Visits to tools.reserva.am appear here as they happen.
            {!includeStaff && ' Staff traffic is excluded.'}
          </PanelEmpty>
        ) : view === 'chart' ? (
          <TrafficChart
            points={points}
            labels={TOOL_CHART_LABELS}
            label={`Tools: visitors, tool opens and exports, ${fmtSpan(range.from, range.to)}`}
          />
        ) : (
          <UsageTable points={points} gran={gran} />
        )}
      </Panel>

      <Panel title="Tools" sub="Each tool’s use. Export rate: of the visits that opened the tool, the share that took a result away. Click a tool for its events." flush>
        {data.tools.length === 0 ? (
          <PanelEmpty icon={Wrench} title="No tool opened yet">
            Every tool shows up here once someone opens it.
          </PanelEmpty>
        ) : (
          <div className={s.tableScroll}>
            <Table className={s.tbl}>
              <thead>
                <tr>
                  <Th>Tool</Th>
                  <Th className={s.num}>Opens</Th>
                  <Th className={s.num}>Visitors</Th>
                  <Th className={s.num}>Edited</Th>
                  <Th className={s.num}>Exports</Th>
                  <Th className={s.num}><span title="Visits that took a result away ÷ visits that opened the tool">Export rate</span></Th>
                  <Th>How it left</Th>
                  <Th className={s.num}>To Reserva</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {data.tools.map((t) => (
                  <Tr key={t.tool} onClick={() => onOpenTool(t.tool)} title={`Show events for ${labelFrom(TOOL_LABELS, t.tool)}`}>
                    <Td>
                      <span className={s.iconText}>
                        <EventIcon name="page_view" props={{ pt: 'tool', tool: t.tool }} size={14} />
                        <span className={s.partnerName}>{labelFrom(TOOL_LABELS, t.tool)}</span>
                      </span>
                    </Td>
                    <Td className={`${s.num} ${s.strong}`}>{fmtInt(t.views)}</Td>
                    <Td className={s.num}>{fmtInt(t.visitors)}</Td>
                    <Td className={s.num}>{fmtInt(t.edits)}</Td>
                    <Td className={`${s.num} ${s.strong}`}>{fmtInt(t.exports)}</Td>
                    <Td className={s.num}>{fmtPct(t.exportRate)}</Td>
                    <Td><HowItLeft row={t} /></Td>
                    <Td className={s.num}>{fmtInt(t.ctaClicks)}</Td>
                    <Td className={s.num}><ChevronRight size={14} className={s.rowGo} /></Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Panel>

      <div className={s.split}>
        <Panel
          title="How results leave"
          sub="Share sheet, download, PDF, WhatsApp, Viber or a copied link — or, inside an app’s browser, the image shown to press and hold."
        >
          {data.exportsBy.length === 0 ? (
            <PanelEmpty icon={Download} title="Nothing exported yet" />
          ) : (
            <BarList
              items={data.exportsBy.map((r) => ({
                key: r.via,
                label: labelFrom(EXPORT_VIA_LABELS, r.via),
                icon: <EventIcon name="tool_export" props={{ via: r.via }} size={14} />,
                value: r.count,
              }))}
            />
          )}
        </Panel>

        <Panel title="Main actions" sub="What people did inside the tools, with the choice they made most.">
          {data.actions.length === 0 ? (
            <PanelEmpty icon={ListChecks} title="No actions yet" />
          ) : (
            <BarList
              items={data.actions.map((r) => ({
                key: `${r.tool}:${r.act}`,
                label: `${labelFrom(TOOL_LABELS, r.tool)} · ${labelFrom(TOOL_ACT_LABELS, r.act)}`,
                icon: <EventIcon name="tool_action" props={{ act: r.act }} size={14} />,
                value: r.count,
                meta: r.topValue ? `mostly ${toolValueLabel(r.topValue)}` : undefined,
              }))}
            />
          )}
        </Panel>
      </div>

      <div className={s.split}>
        <Panel title="Styles exported" sub="The story and card styles of the results people took away.">
          {data.themes.length === 0 ? (
            <PanelEmpty icon={Palette} title="No styled result exported yet" />
          ) : (
            <BarList items={data.themes.map((r) => ({ key: r.theme, label: toolValueLabel(r.theme), value: r.count }))} />
          )}
        </Panel>

        <Panel title="Appointment cards — the client’s side" sub="What clients did on the cards salons sent them.">
          {k.cardViews.value === 0 && data.visit.length === 0 ? (
            <PanelEmpty icon={CalendarCheck} title="No card opened yet">
              Each time a client opens an appointment card link, it is counted here.
            </PanelEmpty>
          ) : (
            <BarList
              total={Math.max(k.cardViews.value, 1)}
              items={[
                {
                  key: 'opened',
                  label: 'Opened the card',
                  icon: <EventIcon name="page_view" props={{ pt: 'visit' }} size={14} />,
                  value: k.cardViews.value,
                },
                ...data.visit.map((r) => ({
                  key: r.act,
                  label: labelFrom(VISIT_ACT_LABELS, r.act),
                  icon: <EventIcon name="visit_action" props={{ act: r.act }} size={14} />,
                  value: r.count,
                })),
              ]}
            />
          )}
        </Panel>
      </div>

      <div className={s.split}>
        <Panel title="Interface language" sub="Page views by the language the tools were shown in.">
          {data.languages.length === 0 ? (
            <PanelEmpty icon={Languages} title="No page views yet" />
          ) : (
            <BarList items={data.languages.map((r) => ({ key: r.language, label: labelFrom(UI_LANGUAGE_LABELS, r.language), value: r.views }))} />
          )}
        </Panel>

        <Panel title="Problems" sub="Exports, shares and links that failed — worth a look when one grows.">
          {data.errors.length === 0 ? (
            <PanelEmpty icon={TriangleAlert} title="No errors in this period" />
          ) : (
            <BarList
              items={data.errors.map((r) => ({
                key: `${r.tool}:${r.code}`,
                label: `${r.tool ? `${labelFrom(TOOL_LABELS, r.tool)} · ` : ''}${labelFrom(TOOL_ERROR_LABELS, r.code)}`,
                value: r.count,
              }))}
            />
          )}
        </Panel>
      </div>
    </div>
  )
}

/** "Download 12 · Share 4" — the ways a tool's results left, most first. */
function HowItLeft({ row }: { row: ToolRow }) {
  const parts = VIA_ORDER
    .map((via) => ({ via, n: row.exportsBy[via] }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
  if (!parts.length) return <span className={s.cellMuted}>—</span>
  return (
    <span className={s.cellMuted}>
      {parts.map((x) => `${labelFrom(EXPORT_VIA_LABELS, x.via)} ${fmtInt(x.n)}`).join(' · ')}
    </span>
  )
}

const PERIOD_HEAD: Record<Granularity, string> = { day: 'Day', week: 'Week', month: 'Month' }

/** The chart's accessible twin, newest first. */
function UsageTable({ points, gran }: { points: ChartPoint[]; gran: Granularity }) {
  return (
    <div className={s.tableScroll}>
      <Table className={s.tbl}>
        <thead>
          <tr>
            <Th>{PERIOD_HEAD[gran]}</Th>
            <Th className={s.num}>Visitors</Th>
            <Th className={s.num}>Sessions</Th>
            <Th className={s.num}>Tool opens</Th>
            <Th className={s.num}>Exports</Th>
          </tr>
        </thead>
        <tbody>
          {[...points].reverse().map((pt) => (
            <tr key={pt.start}>
              <Td>
                {pt.title}
                {pt.note && <span className={s.cellNote}>{pt.note}</span>}
              </Td>
              <Td className={`${s.num} ${s.strong}`}>{fmtInt(pt.visitors)}</Td>
              <Td className={s.num}>{fmtInt(pt.sessions)}</Td>
              <Td className={s.num}>{fmtInt(pt.pageViews)}</Td>
              <Td className={s.num}>{fmtInt(pt.bookings)}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  )
}

function ToolsSkeleton() {
  return (
    <div className={s.tab} aria-busy="true">
      <Skeleton height={16} className={s.skelLine} />
      <div className={s.kpiGrid}>
        {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} height={96} />)}
      </div>
      <Skeleton height={190} />
      <Skeleton height={150} />
      <Skeleton height={372} />
      <Skeleton height={260} />
    </div>
  )
}

