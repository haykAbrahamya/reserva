import { useState } from 'react'
import { UserPlus, Phone, Mail, Send, Trash2, Clock } from 'lucide-react'
import { Badge, Button, Empty, Pagination, SegmentedFilter, ConfirmDialog, useToast } from '@/components/ui'
import { useResource } from '@/store/useResource'
import {
  pendingRegistrationsService,
  type PendingRegistration,
  type PendingStatus,
} from '@/services/pending-registrations.service'
import { errorMessage } from '@/services/errors'
import s from './PendingRegistrations.module.scss'

/** Relative time, handling both past ("3h ago") and future ("in 3h"). */
function fmtWhen(iso: string): string {
  const d = new Date(iso)
  const diff = d.getTime() - Date.now()
  const future = diff > 0
  const abs = Math.abs(diff)
  const min = Math.floor(abs / 60_000)
  const wrap = (v: string) => (future ? `in ${v}` : `${v} ago`)
  if (min < 1) return future ? 'in under a minute' : 'just now'
  if (min < 60) return wrap(`${min}m`)
  const hr = Math.floor(min / 60)
  if (hr < 24) return wrap(`${hr}h`)
  const day = Math.floor(hr / 24)
  if (day < 7) return wrap(`${day}d`)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
}

export function PendingRegistrations() {
  const toast = useToast()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [status, setStatus] = useState<PendingStatus>('pending')
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [confirmDel, setConfirmDel] = useState<PendingRegistration | null>(null)
  const [deleting, setDeleting] = useState(false)

  const { data: result, reload } = useResource(
    () => pendingRegistrationsService.list({ page, pageSize, status }),
    [page, pageSize, status],
  )

  const items = result?.items ?? []
  const total = result?.total ?? 0
  const pageCount = result?.pageCount ?? 1
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  const changePageSize = (n: number) => { setPageSize(n); setPage(1) }
  const changeStatus = (st: PendingStatus) => { setStatus(st); setPage(1) }

  const resend = async (r: PendingRegistration) => {
    setResendingId(r.id)
    try {
      await pendingRegistrationsService.resend(r.id)
      toast(`Activation email resent to ${r.adminEmail}`)
      await reload()
    } catch (err) {
      toast(errorMessage(err))
    } finally {
      setResendingId(null)
    }
  }

  const confirmDelete = async () => {
    if (!confirmDel) return
    setDeleting(true)
    try {
      await pendingRegistrationsService.remove(confirmDel.id)
      toast('Pending registration removed')
      setConfirmDel(null)
      await reload()
    } catch (err) {
      toast(errorMessage(err))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className={s.page}>
      <div className={s.head}>
        <div>
          <h1 className={s.h1}>Pending registrations</h1>
          <p className={s.sub}>
            Self-serve signups that haven’t opened their activation link yet.
            {total > 0 && <span className={s.newPill}>{total}</span>}
          </p>
        </div>
        <SegmentedFilter<PendingStatus>
          ariaLabel="Filter pending registrations"
          value={status}
          onChange={changeStatus}
          options={[
            { value: 'pending', label: 'Awaiting activation' },
            { value: 'expired', label: 'Expired links' },
          ]}
        />
      </div>

      {total === 0 ? (
        <Empty
          icon={UserPlus}
          title={status === 'pending' ? 'No pending registrations' : 'No expired links'}
          description={
            status === 'pending'
              ? 'When someone starts a free trial but hasn’t activated yet, they’ll appear here.'
              : 'No signups have lapsed without activating.'
          }
        />
      ) : (
        <>
          <div className={s.list}>
            {items.map((r) => (
              <div key={r.id} className={[s.card, !r.expired ? s.cardNew : ''].filter(Boolean).join(' ')}>
                <div className={s.avatar} aria-hidden="true">{initials(r.companyName)}</div>

                <div className={s.cardMain}>
                  <div className={s.cardTop}>
                    <span className={s.name}>{r.companyName}</span>
                    <span className={s.company}>· {r.companyType}</span>
                    <Badge
                      variant={r.expired ? 'completed' : 'pending'}
                      label={r.expired ? 'Expired' : 'Awaiting'}
                    />
                  </div>

                  <div className={s.contacts}>
                    <span className={s.contact}><UserPlus size={13} /> {r.adminName}</span>
                    <a className={s.contact} href={`mailto:${r.adminEmail}`}><Mail size={13} /> {r.adminEmail}</a>
                    {r.adminPhone && (
                      <a className={s.contact} href={`tel:${r.adminPhone}`}><Phone size={13} /> {r.adminPhone}</a>
                    )}
                    {r.slug && <span className={s.contact}>/{r.slug}</span>}
                  </div>

                  <div className={s.notes}>
                    <Clock size={13} className={s.notesIcon} />
                    <span>
                      signed up {fmtWhen(r.createdAt)} ·{' '}
                      {r.expired
                        ? `link expired ${fmtWhen(r.expiresAt)}`
                        : `link expires ${fmtWhen(r.expiresAt)}`}
                    </span>
                  </div>
                </div>

                <div className={s.cardActions}>
                  <Button variant="accent" size="sm" disabled={resendingId === r.id} onClick={() => resend(r)}>
                    <Send size={14} /> {r.expired ? 'Resend link' : 'Resend email'}
                  </Button>
                  <button className={s.iconDelete} title="Delete" aria-label="Delete" onClick={() => setConfirmDel(r)}>
                    <Trash2 size={15} />
                  </button>
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

      <ConfirmDialog
        open={!!confirmDel}
        variant="danger"
        title="Delete pending registration"
        message={`Remove the pending signup for "${confirmDel?.companyName}"? They'll need to sign up again.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => { if (!deleting) setConfirmDel(null) }}
      />
    </div>
  )
}
