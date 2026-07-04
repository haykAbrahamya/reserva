import { useState } from 'react'
import { BarChart3, Smartphone, Tablet, Monitor, RefreshCw, Trash2 } from 'lucide-react'
import { Button, Select, Table, Th, Td, Tr, Empty, Pagination, ConfirmDialog, useToast } from '@/components/ui'
import { useResource } from '@/store/useResource'
import { visitsService, type Visit, type VisitPageType } from '@/services/visits.service'
import { partnersService } from '@/services/partners.service'
import { fmtWhen, fmtIp, fmtGeo, fmtBrowser, fmtOs } from './format'
import { VisitDetail } from './VisitDetail'
import s from './Visits.module.scss'

const ALL = '__all__'

const PAGE_OPTIONS: { value: string; label: string }[] = [
  { value: ALL, label: 'All pages' },
  { value: 'signup', label: 'Sign-up' },
  { value: 'home', label: 'Home (landing)' },
  { value: 'marketplace', label: 'Marketplace' },
  { value: 'partner', label: 'Partner pages' },
]

function DeviceIcon({ type }: { type: string | null }) {
  if (type === 'mobile') return <Smartphone size={14} />
  if (type === 'tablet') return <Tablet size={14} />
  return <Monitor size={14} />
}

export function Visits() {
  const toast = useToast()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [selected, setSelected] = useState<Visit | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [partnerSlug, setPartnerSlug] = useState(ALL)
  const [pageType, setPageType] = useState(ALL)

  // All partners for the filter dropdown (name → slug). 100 is the API's max
  // page size and comfortably covers the current partner roster.
  const { data: partnersPage } = useResource(
    () => partnersService.list({ pageSize: 100 }),
    [],
  )
  const partnerOptions = [
    { value: ALL, label: 'All partners' },
    ...(partnersPage?.items ?? []).map((p) => ({ value: p.slug, label: p.name, sub: p.slug })),
  ]

  const { data: result, loading, reload } = useResource(
    () => visitsService.list({
      page,
      pageSize,
      ...(partnerSlug !== ALL ? { partnerSlug } : {}),
      ...(pageType !== ALL ? { pageType: pageType as VisitPageType } : {}),
    }),
    [page, pageSize, partnerSlug, pageType],
  )

  const visits = result?.items ?? []
  const total = result?.total ?? 0
  const pageCount = result?.pageCount ?? 1
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  const changePageSize = (n: number) => { setPageSize(n); setPage(1) }

  const clearHistory = async () => {
    setClearing(true)
    try {
      await visitsService.clearAll()
      toast('Visit history cleared')
      setConfirmClear(false)
      setPage(1)
      await reload()
    } catch {
      toast('Couldn’t clear history. Please try again.')
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className={s.page}>
      <div className={s.head}>
        <div>
          <h1 className={s.h1}>Visits</h1>
          <p className={s.sub}>{total.toLocaleString()} {total === 1 ? 'page view' : 'page views'} on reserva.am</p>
        </div>
        <div className={s.headActions}>
          <Select
            value={pageType}
            onChange={(v) => { setPageType(v); setPage(1) }}
            options={PAGE_OPTIONS}
            size="sm"
            panelMinWidth={200}
          />
          <Select
            value={partnerSlug}
            onChange={(v) => { setPartnerSlug(v); setPage(1) }}
            options={partnerOptions}
            size="sm"
            searchable
            searchPlaceholder="Search partner…"
            panelMinWidth={260}
          />
          <Button variant="ghost" onClick={() => void reload()} disabled={loading}>
            <RefreshCw size={14} className={loading ? s.spin : undefined} /> Refresh
          </Button>
          {total > 0 && (
            <Button variant="danger" onClick={() => setConfirmClear(true)} disabled={clearing}>
              <Trash2 size={14} /> Clear history
            </Button>
          )}
        </div>
      </div>

      {total === 0 ? (
        <Empty
          icon={BarChart3}
          title={partnerSlug !== ALL || pageType !== ALL ? 'No visits match these filters' : 'No visits yet'}
          description={partnerSlug !== ALL || pageType !== ALL
            ? 'No page views recorded for the selected filters yet. Try another page/partner or clear the filters.'
            : 'Page views from the public site will appear here as people browse reserva.am.'}
        />
      ) : (
        <div className={s.tableWrap}>
          <Table>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Location</Th>
                <Th>IP</Th>
                <Th>Device</Th>
                <Th>Browser</Th>
                <Th>OS</Th>
                <Th>Partner</Th>
                <Th>Page</Th>
              </tr>
            </thead>
            <tbody>
              {visits.map((v) => (
                <Tr key={v.id} onClick={() => setSelected(v)}>
                  <Td><span className={s.when} title={new Date(v.createdAt).toLocaleString()}>{fmtWhen(v.createdAt)}</span></Td>
                  <Td>{fmtGeo(v)}</Td>
                  <Td><span className={s.mono}>{fmtIp(v.ip)}</span></Td>
                  <Td>
                    <span className={s.device}>
                      <DeviceIcon type={v.deviceType} />
                      <span>{v.deviceType ?? '—'}</span>
                    </span>
                  </Td>
                  <Td>{fmtBrowser(v)}</Td>
                  <Td>{fmtOs(v)}</Td>
                  <Td><span className={s.mono}>{v.partnerSlug ?? '—'}</span></Td>
                  <Td><span className={s.mono} title={v.host ? `${v.host}${v.path ?? ''}` : undefined}>{v.path ?? '—'}</span></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          <Pagination
            page={page}
            pageCount={pageCount}
            onPageChange={setPage}
            pageSize={pageSize}
            onPageSizeChange={changePageSize}
            pageSizeLabel="Per page"
            summary={`Showing ${from}–${to} of ${total.toLocaleString()}`}
          />
        </div>
      )}

      <VisitDetail visit={selected} onClose={() => setSelected(null)} />

      <ConfirmDialog
        open={confirmClear}
        variant="danger"
        title="Clear visit history?"
        message={`This permanently deletes all ${total.toLocaleString()} recorded page views. This can’t be undone.`}
        confirmLabel="Clear history"
        cancelLabel="Cancel"
        loading={clearing}
        onConfirm={clearHistory}
        onClose={() => { if (!clearing) setConfirmClear(false) }}
      />
    </div>
  )
}
