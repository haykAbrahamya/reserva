import { useEffect, useState } from 'react'
import { Plus, Search, Users, Trash2 } from 'lucide-react'
import {
  Avatar, Badge, Button, Table, Th, Td, Tr, Empty, Pagination, Select, ConfirmDialog, useToast,
} from '@/components/ui'
import { useResource } from '@/store/useResource'
import { staffService, type StaffMember } from '@/services/staff.service'
import { useAuthStore } from '@/store/auth.store'
import type { PlatformRole } from '@/store/auth.store'
import { CreateStaffModal } from './CreateStaffModal'
import { errorMessage } from '@/services/errors'
import s from './Staff.module.scss'

export function Staff() {
  const toast = useToast()
  const me = useAuthStore((st) => st.user)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [toDelete, setToDelete] = useState<StaffMember | null>(null)

  useEffect(() => {
    const id = setTimeout(() => { setDebounced(search.trim()); setPage(1) }, 300)
    return () => clearTimeout(id)
  }, [search])

  const { data: result, reload } = useResource(
    () => staffService.list({ page, pageSize, search: debounced || undefined }),
    [page, pageSize, debounced],
  )

  const staff = result?.items ?? []
  const total = result?.total ?? 0
  const pageCount = result?.pageCount ?? 1
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  const changePageSize = (n: number) => { setPageSize(n); setPage(1) }

  const update = async (id: string, patch: { role?: PlatformRole; active?: boolean }) => {
    try {
      await staffService.update(id, patch)
      await reload()
    } catch (err) {
      toast(errorMessage(err))
    }
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    try {
      await staffService.remove(toDelete.id)
      toast('Staff member removed')
      setToDelete(null)
      await reload()
    } catch (err) {
      toast(errorMessage(err))
      setToDelete(null)
    }
  }

  return (
    <div className={s.page}>
      <div className={s.head}>
        <div>
          <h1 className={s.h1}>Platform staff</h1>
          <p className={s.sub}>{total} {total === 1 ? 'operator' : 'operators'}</p>
        </div>
        <Button variant="accent" onClick={() => setCreateOpen(true)}><Plus size={14} /> New staff</Button>
      </div>

      <div className={s.toolbar}>
        <div className={s.searchWrap}>
          <Search size={15} className={s.searchIcon} />
          <input
            className={s.searchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
          />
        </div>
      </div>

      {total === 0 ? (
        <Empty icon={Users} title="No staff found" description={debounced ? 'Try a different search.' : 'Invite your first operator.'} />
      ) : (
        <div className={s.tableWrap}>
          <Table>
            <thead>
              <tr>
                <Th>Member</Th>
                <Th>Role</Th>
                <Th>Last login</Th>
                <Th>Status</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {staff.map((m) => {
                const isSelf = m.id === me?.id
                return (
                  <Tr key={m.id}>
                    <Td>
                      <div className={s.member}>
                        <Avatar name={m.name} size="md" />
                        <div>
                          <div className={s.memberName}>{m.name}{isSelf && <span className={s.youTag}>You</span>}</div>
                          <div className={s.memberEmail}>{m.email}</div>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <div className={s.roleCell}>
                        <Select
                          size="sm"
                          value={m.role}
                          disabled={isSelf}
                          onChange={(v) => update(m.id, { role: v as PlatformRole })}
                          options={[
                            { value: 'operator', label: 'Operator' },
                            { value: 'owner', label: 'Owner' },
                          ]}
                        />
                      </div>
                    </Td>
                    <Td>
                      <span className={s.lastLogin}>
                        {m.lastLogin ? new Date(m.lastLogin).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never'}
                      </span>
                    </Td>
                    <Td><Badge variant={m.active ? 'active' : 'inactive'} label={m.active ? 'Active' : 'Disabled'} /></Td>
                    <Td>
                      <div className={s.actions}>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isSelf}
                          onClick={() => update(m.id, { active: !m.active })}
                        >
                          {m.active ? 'Disable' : 'Enable'}
                        </Button>
                        <Button variant="ghost" size="sm" icon disabled={isSelf} onClick={() => setToDelete(m)}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </Td>
                  </Tr>
                )
              })}
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

      <CreateStaffModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={reload} />

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Remove staff member"
        message={`Remove ${toDelete?.name}? They will lose access immediately.`}
        confirmLabel="Remove"
        cancelLabel="Cancel"
        variant="danger"
      />
    </div>
  )
}
