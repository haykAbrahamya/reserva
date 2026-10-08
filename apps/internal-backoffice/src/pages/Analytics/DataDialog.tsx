import { useState, type FormEvent } from 'react'
import { Lock, RefreshCw, Trash2 } from 'lucide-react'
import { Button, ConfirmDialog, Input, Modal, SegmentedFilter, useToast } from '@/components/ui'
import { useResource } from '@/store/useResource'
import { useIsOwner } from '@/store/auth.store'
import { ApiError } from '@/services/http'
import { analyticsService, type AnalyticsStorage } from '@/services/analytics.service'
import { analyticsErrorMessage, Skeleton } from './parts'
import { fmtBytes, fmtInt } from './format'
import { addDays, daysInclusive, fmtSpan, yerevanToday } from './range'
import s from './Analytics.module.scss'

type KeepDays = '30' | '90' | '180' | '365'

const KEEP_OPTIONS: { value: KeepDays; label: string }[] = [
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '180', label: '180 days' },
  { value: '365', label: '365 days' },
]

const OWNER_ONLY = 'Only the owner can delete analytics data'
const CONFIRM_WORD = 'DELETE'

const day = (ymd: string) => fmtSpan(ymd, ymd)
const plural = (n: number, one: string, many: string) => `${fmtInt(n)} ${n === 1 ? one : many}`

/**
 * What the tracker has stored, and the two ways to clear it (contract §10).
 *
 * Deleting is owner-only on the server; everyone else still sees the numbers,
 * with the actions visibly locked rather than hidden, so they know who to ask.
 * A themed confirm that says exactly what goes and what stays, then a toast
 * with what was removed.
 */
export function DataDialog({ open, onClose, onDeleted }: {
  open: boolean
  onClose: () => void
  /** After a delete: refetch bounds and the open tab. */
  onDeleted: () => void
}) {
  const toast = useToast()
  const isOwner = useIsOwner()
  const [reloadKey, setReloadKey] = useState(0)
  // Fresh numbers each time it opens; nothing is fetched while it is closed.
  const { data: storage, loading, error, reload } = useResource<AnalyticsStorage | null>(
    () => (open ? analyticsService.storage() : Promise.resolve(null)),
    [open, reloadKey],
  )

  const [keep, setKeep] = useState<KeepDays>('90')
  const [confirm, setConfirm] = useState<'older' | 'all' | null>(null)
  const [typed, setTyped] = useState('')
  const [typedError, setTypedError] = useState('')
  const [deleting, setDeleting] = useState(false)

  const today = yerevanToday()
  const days = Number(keep)
  // "Older than 30 days" keeps exactly what the 30-day range shows — today and
  // the 29 days before it — so the views people know stay whole.
  const before = addDays(today, -(days - 1))
  const nothingOlder = !storage?.oldest || storage.oldest >= before
  const nothingStored = !storage || (storage.events === 0 && storage.sessions === 0)

  const run = async () => {
    if (!confirm) return
    if (confirm === 'all' && typed.trim() !== CONFIRM_WORD) {
      setTypedError(`Type ${CONFIRM_WORD} in capitals to confirm.`)
      return
    }
    setDeleting(true)
    try {
      const res = await analyticsService.deleteData(confirm === 'older' ? { before } : {})
      toast(res.events || res.sessions
        ? `Deleted ${plural(res.events, 'event', 'events')} and ${plural(res.sessions, 'session', 'sessions')}`
        : 'Nothing was old enough — no data deleted')
      setConfirm(null)
      setReloadKey((k) => k + 1)
      onDeleted()
    } catch (err) {
      // A 403 means the role changed since sign-in (or never matched): say who
      // can do it instead of the generic "no permission".
      const forbidden = err instanceof ApiError && err.status === 403
      toast(forbidden ? `${OWNER_ONLY}.` : analyticsErrorMessage(err))
      if (forbidden) setConfirm(null)
    } finally {
      setDeleting(false)
    }
  }

  const openAll = () => { setTyped(''); setTypedError(''); setConfirm('all') }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Analytics data"
        subtitle="What the site tracker has stored. Clearing it never touches bookings, reviews or partners."
        size="md"
      >
        <div className={s.data}>
          {error && !loading ? (
            <div className={s.dataError} role="alert">
              <span>Couldn’t load storage figures. {analyticsErrorMessage(error)}</span>
              <Button size="sm" onClick={() => void reload()}><RefreshCw size={13} /> Try again</Button>
            </div>
          ) : !storage ? (
            <div className={s.dataStats} aria-busy="true">
              {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} height={68} />)}
            </div>
          ) : (
            <>
              <div className={[s.dataStats, loading ? s.stale : s.fresh].join(' ')}>
                <div className={s.dataStat}>
                  <span className={s.dataLabel}>Events</span>
                  <span className={s.dataValue}>{fmtInt(storage.events)}</span>
                </div>
                <div className={s.dataStat}>
                  <span className={s.dataLabel}>Sessions</span>
                  <span className={s.dataValue}>{fmtInt(storage.sessions)}</span>
                </div>
                <div className={s.dataStat}>
                  <span className={s.dataLabel}>Size</span>
                  <span className={s.dataValue}>{fmtBytes(storage.bytes)}</span>
                </div>
                <div className={s.dataStat}>
                  <span className={s.dataLabel}>Oldest day</span>
                  <span className={s.dataValue}>{storage.oldest ? day(storage.oldest) : '—'}</span>
                  <span className={s.dataSub}>
                    {storage.oldest ? `${plural(daysInclusive(storage.oldest, today), 'day', 'days')} of data` : 'Nothing stored yet'}
                  </span>
                </div>
              </div>
              <p className={s.dataNote}>
                Size is both tables with their indexes. Deleting frees room for new data straight away, but the files
                on disk only shrink after database maintenance, so this figure may not drop.
              </p>
            </>
          )}

          {!isOwner && (
            <p className={s.ownerHint}><Lock size={13} /> {OWNER_ONLY}.</p>
          )}

          <section className={s.dataSection}>
            <div className={s.dataSectionHead}>
              <h3 className={s.dataTitle}>Delete data older than</h3>
              <SegmentedFilter<KeepDays> size="sm" ariaLabel="Keep the last" value={keep} onChange={setKeep} options={KEEP_OPTIONS} />
            </div>
            <p className={s.dataText}>
              {!storage
                ? ' '
                : nothingOlder
                  ? storage.oldest
                    ? `Nothing to delete — the oldest event is from ${day(storage.oldest)}.`
                    : 'Nothing stored yet.'
                  : `Deletes events recorded before ${day(before)} and the sessions left without events. ${fmtSpan(before, today)} stays.`}
            </p>
            <div className={s.dataActions}>
              <Button
                variant="danger"
                size="sm"
                disabled={!isOwner || !storage || nothingOlder}
                title={!isOwner ? OWNER_ONLY : undefined}
                onClick={() => setConfirm('older')}
              >
                <Trash2 size={13} /> Delete data before {day(before)}…
              </Button>
            </div>
          </section>

          <section className={s.dataSection}>
            <h3 className={s.dataTitle}>Delete everything</h3>
            <p className={s.dataText}>
              Removes every tracked event and session — all analytics start again from zero.
            </p>
            <div className={s.dataActions}>
              <Button
                variant="danger"
                size="sm"
                disabled={!isOwner || nothingStored}
                title={!isOwner ? OWNER_ONLY : undefined}
                onClick={openAll}
              >
                <Trash2 size={13} /> Delete all analytics data…
              </Button>
            </div>
          </section>
        </div>
      </Modal>

      {/* Rendered beside the dialog, not inside it, so a click in a confirm can
          never bubble (through the React tree) into the dialog behind it. */}
      <ConfirmDialog
        open={confirm === 'older'}
        variant="danger"
        title={`Delete analytics data before ${day(before)}?`}
        message="This can’t be undone."
        confirmLabel={deleting ? 'Deleting…' : 'Delete older data'}
        cancelLabel="Cancel"
        loading={deleting}
        onConfirm={() => void run()}
        onClose={() => { if (!deleting) setConfirm(null) }}
      >
        <GoesStays
          goes={`Tracked events recorded before ${day(before)} (Yerevan time), and the sessions left with no events.`}
          stays={`The last ${days} days (${fmtSpan(before, today)}) — plus bookings, reviews, partners and everything else in Reserva.`}
        />
      </ConfirmDialog>

      <ConfirmDialog
        open={confirm === 'all'}
        variant="danger"
        title="Delete all analytics data?"
        message={`This can’t be undone. Type ${CONFIRM_WORD} to confirm.`}
        confirmLabel={deleting ? 'Deleting…' : 'Delete everything'}
        cancelLabel="Cancel"
        loading={deleting}
        onConfirm={() => void run()}
        onClose={() => { if (!deleting) setConfirm(null) }}
      >
        <GoesStays
          goes={storage
            ? `All ${plural(storage.events, 'tracked event', 'tracked events')} and ${plural(storage.sessions, 'session', 'sessions')} — every analytics number restarts from zero.`
            : 'Every tracked event and session — every analytics number restarts from zero.'}
          stays="Bookings, reviews, partners and everything else in Reserva."
        />
        {/* A form so Enter submits; the check lives in run(), and the Button
            component has no disabled look of its own to lean on. */}
        <form className={s.confirmWord} onSubmit={(e: FormEvent) => { e.preventDefault(); void run() }}>
          <Input
            autoFocus
            placeholder={CONFIRM_WORD}
            aria-label={`Type ${CONFIRM_WORD} to confirm`}
            value={typed}
            error={typedError || undefined}
            onChange={(e) => { setTyped(e.target.value); setTypedError('') }}
          />
        </form>
      </ConfirmDialog>
    </>
  )
}

/** Exactly what a delete removes and what it leaves, side by side. */
function GoesStays({ goes, stays }: { goes: string; stays: string }) {
  return (
    <dl className={s.goesStays}>
      <div className={s.gsRow}>
        <dt className={`${s.gsTag} ${s.gsGoes}`}>Deleted</dt>
        <dd>{goes}</dd>
      </div>
      <div className={s.gsRow}>
        <dt className={`${s.gsTag} ${s.gsStays}`}>Kept</dt>
        <dd>{stays}</dd>
      </div>
    </dl>
  )
}
