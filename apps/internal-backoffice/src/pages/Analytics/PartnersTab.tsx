import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, Building2, ChevronRight, Search } from 'lucide-react'
import { Empty, Table, Th, Td, Tr } from '@/components/ui'
import { useResource } from '@/store/useResource'
import { analyticsService, type PartnerRow } from '@/services/analytics.service'
import { ErrorState, PanelEmpty, Skeleton } from './parts'
import { fmtInt, fmtPct } from './format'
import type { TabProps } from './OverviewTab'
import s from './Analytics.module.scss'

type Metrics = Omit<PartnerRow, 'partnerId' | 'name' | 'slug'>
type SortKey = 'name' | 'views' | 'visitors' | 'bookClicks' | 'bookingOpens' | 'bookings' | 'conversion'
  | 'call' | 'whatsapp' | 'instagram' | 'directions' | 'other'
type Group = 'traffic' | 'booking' | 'contacts'

interface Column {
  key: Exclude<SortKey, 'name'>
  /** Header text — short, because its group header already says what it is. */
  label: string
  /** The full name, for the tooltip and screen readers. */
  title: string
  group: Group
  get: (m: Metrics) => number | null
  fmt?: (v: number | null) => string
}

const COLUMNS: Column[] = [
  { key: 'views', label: 'Views', title: 'Page views', group: 'traffic', get: (m) => m.views },
  { key: 'visitors', label: 'Visitors', title: 'Visitors', group: 'traffic', get: (m) => m.visitors },
  { key: 'bookClicks', label: 'Clicks', title: 'Book clicks', group: 'booking', get: (m) => m.bookClicks },
  { key: 'bookingOpens', label: 'Opens', title: 'Booking opens', group: 'booking', get: (m) => m.bookingOpens },
  { key: 'bookings', label: 'Bookings', title: 'Bookings (public, from bookings)', group: 'booking', get: (m) => m.bookings },
  { key: 'conversion', label: 'Conv.', title: 'Conversion: visits to the page that ended in a booking', group: 'booking', get: (m) => m.conversion, fmt: fmtPct },
  { key: 'call', label: 'Calls', title: 'Call clicks', group: 'contacts', get: (m) => m.contacts.call },
  { key: 'whatsapp', label: 'WhatsApp', title: 'WhatsApp clicks', group: 'contacts', get: (m) => m.contacts.whatsapp },
  { key: 'instagram', label: 'Instagram', title: 'Instagram clicks', group: 'contacts', get: (m) => m.contacts.instagram },
  { key: 'directions', label: 'Directions', title: 'Directions clicks', group: 'contacts', get: (m) => m.contacts.directions },
  { key: 'other', label: 'Other', title: 'Other contact clicks', group: 'contacts', get: (m) => m.contacts.other },
]

const span = (g: Group) => COLUMNS.filter((c) => c.group === g).length
const show = (c: Column, m: Metrics) => (c.fmt ?? ((v) => (v == null ? '—' : fmtInt(v))))(c.get(m))

export function PartnersTab({ range, includeStaff, refreshKey, onOpenPartner }: TabProps & {
  onOpenPartner: (partnerId: string) => void
}) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'views', dir: 'desc' })
  const { data, loading, error, reload } = useResource(
    () => analyticsService.partners({ from: range.from, to: range.to, includeInternal: includeStaff }),
    [range.from, range.to, includeStaff, refreshKey],
  )

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = (data?.rows ?? []).filter(
      (r) => !q || r.name.toLowerCase().includes(q) || (r.slug ?? '').toLowerCase().includes(q),
    )
    const dir = sort.dir === 'asc' ? 1 : -1
    const col = COLUMNS.find((c) => c.key === sort.key)
    return list.sort((a, b) => {
      if (!col) return a.name.localeCompare(b.name) * dir
      const va = col.get(a)
      const vb = col.get(b)
      // No conversion (no session viewed the page) is not "lowest" — it sinks either way.
      if (va == null || vb == null) return va == null && vb == null ? 0 : va == null ? 1 : -1
      return (va - vb) * dir || a.name.localeCompare(b.name)
    })
  }, [data, query, sort])

  if (error && !loading) return <ErrorState error={error} onRetry={() => void reload()} />
  if (!data) {
    return (
      <div className={s.tab} aria-busy="true">
        <Skeleton height={34} className={s.skelLine} />
        <Skeleton height={420} />
      </div>
    )
  }

  if (data.rows.length === 0) {
    return (
      <div className={[s.tab, loading ? s.stale : s.fresh].join(' ')}>
        <div className={s.emptyCard}>
          <Empty
            icon={Building2}
            title="No partner activity in this period"
            description="A partner is listed once its public page gets a visit, or an online booking, in the selected days."
          />
        </div>
      </div>
    )
  }

  const onSort = (key: SortKey) =>
    setSort((cur) => (cur.key === key
      ? { key, dir: cur.dir === 'desc' ? 'asc' : 'desc' }
      : { key, dir: key === 'name' ? 'asc' : 'desc' }))

  const sortHead = (key: SortKey, label: string, title = label) => {
    const active = sort.key === key
    const Icon = !active ? ArrowUpDown : sort.dir === 'desc' ? ArrowDown : ArrowUp
    return (
      <button
        type="button"
        className={[s.sortBtn, active ? s.sortActive : ''].filter(Boolean).join(' ')}
        onClick={() => onSort(key)}
        title={title}
        aria-label={`Sort by ${title}${active ? (sort.dir === 'desc' ? ', highest first' : ', lowest first') : ''}`}
      >
        {label}
        <Icon size={11} className={active ? undefined : s.sortIdle} />
      </button>
    )
  }

  return (
    <div className={[s.tab, loading ? s.stale : s.fresh].join(' ')} aria-busy={loading}>
      <div className={s.filters}>
        <div className={s.searchWrap}>
          <Search size={14} className={s.searchIcon} />
          <input
            className={s.searchInput}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search partner or slug…"
            aria-label="Search partners"
          />
        </div>
        <span className={s.filterCount}>
          {query.trim()
            ? `${rows.length} of ${data.rows.length} partners`
            : `${data.rows.length} ${data.rows.length === 1 ? 'partner' : 'partners'} with activity`}
        </span>
      </div>

      <div className={s.tableWrap}>
        <Table className={`${s.tbl} ${s.ptable}`}>
          <thead>
            <tr>
              <th className={s.groupTh} />
              <th className={s.groupTh} colSpan={span('traffic')} />
              <th className={s.groupTh} colSpan={span('booking')}><span>Booking path</span></th>
              <th className={s.groupTh} colSpan={span('contacts')}><span>Contact clicks</span></th>
              <th className={s.groupTh} />
            </tr>
            <tr>
              <Th>{sortHead('name', 'Partner')}</Th>
              {COLUMNS.map((c) => <Th key={c.key} className={s.num}>{sortHead(c.key, c.label, c.title)}</Th>)}
              <Th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <Tr key={r.partnerId} onClick={() => onOpenPartner(r.partnerId)} title={`Show events for ${r.name}`}>
                <Td>
                  <div className={s.partnerCell}>
                    <span className={s.partnerName}>{r.name}</span>
                    {r.slug && <span className={s.partnerSlug}>{r.slug}</span>}
                  </div>
                </Td>
                {COLUMNS.map((c) => (
                  <Td key={c.key} className={[s.num, sort.key === c.key ? s.strong : ''].filter(Boolean).join(' ')}>
                    {show(c, r)}
                  </Td>
                ))}
                <Td className={s.num}><ChevronRight size={14} className={s.rowGo} /></Td>
              </Tr>
            ))}
          </tbody>
          {/* Server totals: distinct visitors across partners are not a column
              sum, so they are never re-added here. While searching they still
              describe every partner, and the label says so. */}
          <tfoot>
            <tr className={s.totalRow}>
              <Td>{query.trim() ? 'All partners' : 'Total'}</Td>
              {COLUMNS.map((c) => <Td key={c.key} className={s.num}>{show(c, data.totals)}</Td>)}
              <Td />
            </tr>
          </tfoot>
        </Table>
        {rows.length === 0 && (
          <PanelEmpty icon={Search} title={`No partner matches “${query.trim()}”`}>
            Search looks at partner names and slugs among the partners active in this period.
          </PanelEmpty>
        )}
      </div>
    </div>
  )
}
