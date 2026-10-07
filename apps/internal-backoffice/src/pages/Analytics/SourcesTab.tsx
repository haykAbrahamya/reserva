import { Globe, Languages, Link2, Megaphone, MonitorSmartphone, Route } from 'lucide-react'
import { Select, Table, Th, Td } from '@/components/ui'
import { useResource } from '@/store/useResource'
import { analyticsService } from '@/services/analytics.service'
import { ALL, BarList, ErrorState, Panel, PanelEmpty, Skeleton, usePartnerOptions } from './parts'
import { TRAFFIC_CHANNEL_HINTS, TRAFFIC_CHANNEL_LABELS, labelFrom } from './catalog'
import { ChannelIcon, DeviceIcon } from './icons'
import { countryName, deviceLabel, fmtInt, fmtShare, languageName } from './format'
import type { TabProps } from './OverviewTab'
import s from './Analytics.module.scss'

export function SourcesTab({ range, includeStaff, refreshKey, partnerId, onPartnerChange }: TabProps & {
  partnerId: string
  onPartnerChange: (id: string) => void
}) {
  const partnerOptions = usePartnerOptions(partnerId)
  const { data, loading, error, reload } = useResource(
    () => analyticsService.sources({
      from: range.from,
      to: range.to,
      includeInternal: includeStaff,
      partnerId: partnerId || undefined,
    }),
    [range.from, range.to, includeStaff, refreshKey, partnerId],
  )

  const filter = (
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
      {data && (
        <span className={s.filterCount}>
          {fmtInt(sum(data.channels.map((c) => c.sessions)))} {partnerId ? 'sessions with this partner' : 'sessions'}
        </span>
      )}
    </div>
  )

  if (error && !loading) {
    return (
      <div className={s.tab}>
        {filter}
        <ErrorState error={error} onRetry={() => void reload()} />
      </div>
    )
  }
  if (!data) {
    return (
      <div className={s.tab} aria-busy="true">
        {filter}
        <div className={s.sourcesGrid}>
          {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} height={260} />)}
        </div>
      </div>
    )
  }

  const sessions = sum(data.channels.map((c) => c.sessions))
  const noun = partnerId ? 'sessions on this partner' : 'sessions'

  return (
    <div className={[s.tab, loading ? s.stale : s.fresh].join(' ')} aria-busy={loading}>
      {filter}

      <div className={s.sourcesGrid}>
        <Panel title="Channels" sub="Where each session came from, decided at its first page.">
          {data.channels.length === 0 ? (
            <PanelEmpty icon={Route} title="No sessions in this period">
              Each visit is sorted into a channel — Instagram, Google, direct and so on — as it starts.
            </PanelEmpty>
          ) : (
            <BarList
              total={sessions}
              items={data.channels.map((c) => ({
                key: c.channel,
                label: labelFrom(TRAFFIC_CHANNEL_LABELS, c.channel),
                icon: <ChannelIcon channel={c.channel} />,
                value: c.sessions,
                meta: `${fmtInt(c.visitors)} ${c.visitors === 1 ? 'visitor' : 'visitors'}`,
                hint: TRAFFIC_CHANNEL_HINTS[c.channel],
              }))}
            />
          )}
        </Panel>

        <Panel title="Referrers" sub="Websites that linked here (top 20)." flush>
          {data.referrers.length === 0 ? (
            <PanelEmpty icon={Link2} title="No referring websites">
              When a visit starts from a link on another website, that site is listed here.
            </PanelEmpty>
          ) : (
            <Table className={s.tbl}>
              <thead>
                <tr><Th>Website</Th><Th className={s.num}>Sessions</Th><Th className={s.num}>Share</Th></tr>
              </thead>
              <tbody>
                {data.referrers.map((r) => (
                  <tr key={r.host}>
                    <Td><span className={s.mono}>{r.host}</span></Td>
                    <Td className={`${s.num} ${s.strong}`}>{fmtInt(r.sessions)}</Td>
                    <Td className={s.num}>{fmtShare(r.sessions, sessions)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>

        <Panel title="Campaigns" sub="Links tagged with utm_ parameters (top 20)." flush>
          {data.campaigns.length === 0 ? (
            <PanelEmpty icon={Megaphone} title="No tagged campaigns">
              Add utm_source / utm_medium / utm_campaign to links in ads and posts to see them compared here.
            </PanelEmpty>
          ) : (
            <Table className={s.tbl}>
              <thead>
                <tr><Th>Source</Th><Th>Medium</Th><Th>Campaign</Th><Th className={s.num}>Sessions</Th></tr>
              </thead>
              <tbody>
                {data.campaigns.map((c, i) => (
                  <tr key={`${c.source}|${c.medium}|${c.campaign}|${i}`}>
                    <Td>{c.source ?? <span className={s.cellMuted}>—</span>}</Td>
                    <Td>{c.medium ?? <span className={s.cellMuted}>—</span>}</Td>
                    <Td>{c.campaign ?? <span className={s.cellMuted}>—</span>}</Td>
                    <Td className={`${s.num} ${s.strong}`}>{fmtInt(c.sessions)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>

        <Panel title="Devices" sub={`Share of ${noun}.`}>
          {data.devices.length === 0 ? (
            <PanelEmpty icon={MonitorSmartphone} title="No devices yet" />
          ) : (
            <BarList
              total={sessions}
              items={data.devices.map((d) => ({
                key: d.deviceType,
                label: deviceLabel(d.deviceType),
                icon: <DeviceIcon type={d.deviceType} />,
                value: d.sessions,
              }))}
            />
          )}
        </Panel>

        <Panel title="Countries" sub="Top 15, from the visitor’s network address (not stored).">
          {data.countries.length === 0 ? (
            <PanelEmpty icon={Globe} title="No countries yet" />
          ) : (
            <BarList
              total={sessions}
              items={data.countries.map((c) => ({
                key: c.country,
                label: countryName(c.country),
                meta: c.country !== 'unknown' ? c.country.toUpperCase() : undefined,
                value: c.sessions,
              }))}
            />
          )}
        </Panel>

        <Panel title="Languages" sub="Top 10, from the browser’s language setting.">
          {data.languages.length === 0 ? (
            <PanelEmpty icon={Languages} title="No languages yet" />
          ) : (
            <BarList
              total={sessions}
              items={data.languages.map((l) => ({
                key: l.language,
                label: languageName(l.language),
                meta: l.language !== 'unknown' ? l.language : undefined,
                value: l.sessions,
              }))}
            />
          )}
        </Panel>
      </div>
    </div>
  )
}

function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0)
}
