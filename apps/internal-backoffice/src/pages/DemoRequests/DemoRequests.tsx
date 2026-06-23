import { useState } from 'react'
import { Inbox, Phone, Mail, Check, RotateCcw, MessageSquare } from 'lucide-react'
import { Badge, Button, Empty, Pagination, Select, useToast } from '@/components/ui'
import { useResource } from '@/store/useResource'
import {
  demoRequestsService,
  type DemoRequest,
  type DemoRequestStatus,
} from '@/services/demo-requests.service'
import { errorMessage } from '@/services/errors'
import s from './DemoRequests.module.scss'

type Filter = 'all' | DemoRequestStatus

function fmtWhen(iso: string): string {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d ago`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function DemoRequests() {
  const toast = useToast()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [filter, setFilter] = useState<Filter>('all')

  const { data: result, reload } = useResource(
    () => demoRequestsService.list({ page, pageSize, status: filter === 'all' ? undefined : filter }),
    [page, pageSize, filter],
  )

  const items = result?.items ?? []
  const total = result?.total ?? 0
  const newCount = result?.newCount ?? 0
  const pageCount = result?.pageCount ?? 1
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  const changePageSize = (n: number) => { setPageSize(n); setPage(1) }
  const changeFilter = (f: Filter) => { setFilter(f); setPage(1) }

  const setStatus = async (r: DemoRequest, status: DemoRequestStatus) => {
    try {
      await demoRequestsService.setStatus(r.id, status)
      toast(status === 'done' ? 'Marked as done' : 'Reopened')
      await reload()
    } catch (err) {
      toast(errorMessage(err))
    }
  }

  return (
    <div className={s.page}>
      <div className={s.head}>
        <div>
          <h1 className={s.h1}>Demo requests</h1>
          <p className={s.sub}>
            {total} total{newCount > 0 && <span className={s.newPill}>{newCount} new</span>}
          </p>
        </div>
        <Select
          size="sm"
          value={filter}
          onChange={(v) => changeFilter(v as Filter)}
          options={[
            { value: 'all', label: 'All requests' },
            { value: 'new', label: 'New' },
            { value: 'done', label: 'Done' },
          ]}
        />
      </div>

      {total === 0 ? (
        <Empty
          icon={Inbox}
          title="No demo requests"
          description={filter === 'all' ? 'New requests from the landing page will appear here.' : 'Nothing in this view.'}
        />
      ) : (
        <>
          <div className={s.list}>
            {items.map((r) => (
              <div key={r.id} className={[s.card, r.status === 'new' ? s.cardNew : ''].filter(Boolean).join(' ')}>
                <div className={s.cardMain}>
                  <div className={s.cardTop}>
                    <span className={s.name}>{r.name}</span>
                    {r.company && <span className={s.company}>{r.company}</span>}
                    <Badge
                      variant={r.status === 'new' ? 'pending' : 'completed'}
                      label={r.status === 'new' ? 'New' : 'Done'}
                    />
                    <span className={s.when}>{fmtWhen(r.createdAt)}</span>
                  </div>

                  <div className={s.contacts}>
                    {r.phone && (
                      <a className={s.contact} href={`tel:${r.phone}`}><Phone size={13} /> {r.phone}</a>
                    )}
                    {r.email && (
                      <a className={s.contact} href={`mailto:${r.email}`}><Mail size={13} /> {r.email}</a>
                    )}
                  </div>

                  {r.notes && (
                    <div className={s.notes}>
                      <MessageSquare size={13} className={s.notesIcon} />
                      <span>{r.notes}</span>
                    </div>
                  )}
                </div>

                <div className={s.cardActions}>
                  {r.status === 'new' ? (
                    <Button variant="accent" size="sm" onClick={() => setStatus(r, 'done')}>
                      <Check size={14} /> Mark done
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => setStatus(r, 'new')}>
                      <RotateCcw size={14} /> Reopen
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <Pagination
            page={page}
            pageCount={pageCount}
            onPageChange={setPage}
            pageSize={pageSize}
            onPageSizeChange={changePageSize}
            pageSizeLabel="Per page"
            summary={`Showing ${from}–${to} of ${total}`}
          />
        </>
      )}
    </div>
  )
}
