import { useState } from 'react'
import { CalendarDays, Monitor, Store } from 'lucide-react'
import { Badge, Button, Empty } from '@/components/ui'
import { useResource } from '@/store/useResource'
import { partnersService, type PartnerBookingRow } from '@/services/partners.service'
import s from './PartnerDetail.module.scss'

interface Props {
  partnerId: string
}

const PAGE_SIZE = 10

/**
 * Compact date + time, split so the table can stack them.
 * `Aug 29, 2026, 04:47 PM` on one line is far too wide for a five-column table;
 * the year is dropped unless the booking is from another year, where it matters.
 */
const fmtParts = (iso: string) => {
  const d = new Date(iso)
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return {
    date: d.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      ...(sameYear ? {} : { year: 'numeric' }),
    }),
    time: d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
  }
}

/** Terminal states read as inactive; live ones as active. */
const isLive = (status: PartnerBookingRow['status']) =>
  status === 'pending' || status === 'confirmed'

/**
 * Recent bookings for one partner, as the platform sees them.
 *
 * Deliberately minimal: when the appointment is, when it was made, where it came
 * from, and its state. No client names, phone numbers, notes or prices — platform
 * staff need volume and provenance to support a partner, not their customer list.
 * The API enforces this too; it never sends those fields.
 */
export function PartnerBookings({ partnerId }: Props) {
  const [page, setPage] = useState(1)
  const { data, loading } = useResource(
    () => partnersService.listBookings(partnerId, { page, pageSize: PAGE_SIZE }),
    [partnerId, page],
  )

  const rows = data?.items ?? []
  const total = data?.total ?? 0
  const shown = (page - 1) * PAGE_SIZE + rows.length
  const hasMore = shown < total

  return (
    <section className={s.card}>
      <div className={s.sectionHead}>
        <h2 className={s.cardTitle} style={{ margin: 0 }}>
          <CalendarDays size={15} className={s.cardTitleIcon} /> Bookings
        </h2>
        {total > 0 && <span className={s.sectionCount}>{total} total</span>}
      </div>

      {!loading && rows.length === 0 ? (
        <Empty
          icon={CalendarDays}
          title="No bookings yet"
          description="Appointments will appear here as they come in."
        />
      ) : (
        <>
          <div className={s.bkTable}>
            <div className={s.bkHead}>
              <span>Appointment</span>
              <span>Service</span>
              <span>Status</span>
              <span>Source</span>
              <span>Created</span>
            </div>

            {rows.map((b) => (
              <div key={b.id} className={s.bkRow}>
                {/* data-label drives the stacked mobile layout — see the SCSS. */}
                <span className={s.bkCell} data-label="Appointment">
                  <span className={s.bkWhen}>
                    <strong className={s.bkTime}>{fmtParts(b.startAt).time}</strong>
                    <span className={s.bkDate}>{fmtParts(b.startAt).date}</span>
                  </span>
                </span>
                <span className={s.bkCell} data-label="Service">
                  <span className={s.bkService}>
                    {b.service?.name ?? '—'}
                    {b.service && <span className={s.bkDuration}>{b.service.duration}m</span>}
                  </span>
                </span>
                <span className={s.bkCell} data-label="Status">
                  <Badge variant={isLive(b.status) ? 'active' : 'inactive'} label={b.status} />
                </span>
                <span className={s.bkCell} data-label="Source">
                  <span className={s.bkSource}>
                    {b.source === 'backoffice' ? <Store size={12} /> : <Monitor size={12} />}
                    {b.source === 'backoffice' ? 'Staff' : 'Client'}
                  </span>
                </span>
                <span className={[s.bkCell, s.bkMuted].join(' ')} data-label="Created">
                  {fmtParts(b.createdAt).date}, {fmtParts(b.createdAt).time}
                </span>
              </div>
            ))}
          </div>

          {loading && <p className={s.hint}>Loading…</p>}

          {(hasMore || page > 1) && (
            <div className={s.bkPager}>
              <Button
                variant="ghost"
                size="sm"
                disabled={page === 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className={s.bkPageInfo}>
                {shown} of {total}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={!hasMore || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
