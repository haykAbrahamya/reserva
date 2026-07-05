import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Building2 } from 'lucide-react'
import { Avatar, Badge, Button, Table, Th, Td, Tr, Empty, Pagination } from '@/components/ui'
import { useResource } from '@/store/useResource'
import { partnersService } from '@/services/partners.service'
import { CreatePartnerModal } from './CreatePartnerModal'
import s from './Partners.module.scss'

/** "6 Jul, 14:05" — date + hour:minute, or "Never" if never active in the backoffice. */
function fmtLastSeen(iso: string | null): string {
  if (!iso) return 'Never'
  const d = new Date(iso)
  const date = d.toLocaleDateString([], { day: 'numeric', month: 'short' })
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return `${date}, ${time}`
}

export function Partners() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => { setDebounced(search.trim()); setPage(1) }, 300)
    return () => clearTimeout(id)
  }, [search])

  const { data: result, reload } = useResource(
    () => partnersService.list({ page, pageSize, search: debounced || undefined }),
    [page, pageSize, debounced],
  )

  const partners = result?.items ?? []
  const total = result?.total ?? 0
  const pageCount = result?.pageCount ?? 1
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  const changePageSize = (n: number) => { setPageSize(n); setPage(1) }

  return (
    <div className={s.page}>
      <div className={s.head}>
        <div>
          <h1 className={s.h1}>Partners</h1>
          <p className={s.sub}>{total} {total === 1 ? 'salon' : 'salons'} on the platform</p>
        </div>
        <Button variant="accent" onClick={() => setCreateOpen(true)}>
          <Plus size={14} /> New partner
        </Button>
      </div>

      <div className={s.toolbar}>
        <div className={s.searchWrap}>
          <Search size={15} className={s.searchIcon} />
          <input
            className={s.searchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, slug or type…"
          />
        </div>
      </div>

      {total === 0 ? (
        <Empty
          icon={Building2}
          title="No partners found"
          description={debounced ? 'Try a different search.' : 'Provision your first partner to get started.'}
          action={!debounced ? <Button variant="accent" onClick={() => setCreateOpen(true)}><Plus size={14} /> New partner</Button> : undefined}
        />
      ) : (
        <div className={s.tableWrap}>
          <Table>
            <thead>
              <tr>
                <Th>Partner</Th>
                <Th>Slug</Th>
                <Th>Type</Th>
                <Th>Branches</Th>
                <Th>Team</Th>
                <Th>Last active</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {partners.map((p) => (
                <Tr key={p.id} onClick={() => navigate(`/partners/${p.id}`)}>
                  <Td>
                    <div className={s.partner}>
                      <Avatar name={p.name} size="md" style={{ background: p.accent, color: 'white', border: 'none' }} />
                      <span className={s.partnerName}>{p.name}</span>
                    </div>
                  </Td>
                  <Td><span className={s.slug}>/{p.slug}</span></Td>
                  <Td>{p.type}</Td>
                  <Td><span className={s.num}>{p.counts.locations}</span></Td>
                  <Td><span className={s.num}>{p.counts.specialists}</span></Td>
                  <Td>
                    <span className={p.lastSeenAt ? s.lastLogin : s.lastLoginNever}>
                      {fmtLastSeen(p.lastSeenAt)}
                    </span>
                  </Td>
                  <Td><Badge variant={p.active ? 'active' : 'inactive'} label={p.active ? 'Active' : 'Inactive'} /></Td>
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
            summary={`Showing ${from}–${to} of ${total}`}
          />
        </div>
      )}

      <CreatePartnerModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={reload} />
    </div>
  )
}
