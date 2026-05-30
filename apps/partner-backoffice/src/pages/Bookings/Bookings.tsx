import { useState, useEffect } from 'react'
import { Plus, Calendar } from 'lucide-react'
import { useAppStore, usePartner } from '@/store/app.store'
import { Button, Table, Th, Td, Tr, BookingBadge, Avatar, Empty } from '@/components/ui'
import { fmtAMD, fmtDateTime, fmtDuration, fmtTime, fmtDateInput } from '@/utils/format'
import { useNewBooking } from '@/App'
import { BookingDrawer } from '@/components/bookings/BookingDrawer/BookingDrawer'
import type { Booking } from '@/types'
import s from './Bookings.module.scss'

function useIsMobile() {
  const [m, setM] = useState(() => window.innerWidth <= 768)
  useEffect(() => {
    const fn = () => setM(window.innerWidth <= 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return m
}

const STATUS_FILTERS = [
  { value: 'all',       label: 'All' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'pending',   label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'noshow',    label: 'No-show' },
]

export function Bookings() {
  const partner        = usePartner()
  const bookings       = useAppStore(st => st.bookings)
  const openNewBooking = useNewBooking()
  const isMobile       = useIsMobile()

  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedId,   setSelectedId]   = useState<string | null>(null)

  if (!partner) return null

  const partnerBookings = bookings
    .filter(b => b.partnerId === partner.id)
    .filter(b => statusFilter === 'all' || b.status === statusFilter)
    .sort((a, b) => b.startISO.localeCompare(a.startISO))

  // Group by date for mobile card list
  const grouped = partnerBookings.reduce<Record<string, Booking[]>>((acc, b) => {
    const key = fmtDateInput(new Date(b.startISO))
    if (!acc[key]) acc[key] = []
    acc[key].push(b)
    return acc
  }, {})

  const openBooking = (id: string) => setSelectedId(id)
  const closeBooking = () => setSelectedId(null)

  return (
    <div className={s.page}>
      <div className={s.head}>
        <div>
          <h1 className={s.h1}>Bookings</h1>
          <p className={s.sub}>{partner.name} · {partnerBookings.length} record{partnerBookings.length !== 1 ? 's' : ''}</p>
        </div>
        <Button variant="accent" onClick={openNewBooking}><Plus size={14} /> New booking</Button>
      </div>

      {/* Status filter chips — horizontal scroll on mobile */}
      <div className={s.filters}>
        {STATUS_FILTERS.map(f => (
          <button
            key={f.value}
            className={[s.filterChip, statusFilter === f.value ? s.active : ''].filter(Boolean).join(' ')}
            onClick={() => setStatusFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Mobile: card list grouped by date ── */}
      {isMobile ? (
        <div className={s.cardList}>
          {partnerBookings.length === 0 ? (
            <Empty icon={Calendar} title="No bookings found" description="Try changing the filter or add a new booking." action={
              <Button variant="accent" onClick={openNewBooking}><Plus size={14} /> New booking</Button>
            } />
          ) : (
            Object.entries(grouped).map(([dateKey, bks]) => (
              <div key={dateKey} className={s.dateGroup}>
                <div className={s.dateHeader}>
                  {new Date(dateKey).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
                {bks.map(b => {
                  const svc = partner.services.find(sv => sv.id === b.serviceId)
                  const sp  = partner.specialists.find(sp => sp.id === b.specialistId)
                  return (
                    <div key={b.id} className={s.bookingCard} onClick={() => openBooking(b.id)}>
                      <div className={s.cardTop}>
                        <div>
                          <div className={s.cardTime}>{fmtTime(b.startISO)} – {fmtTime(b.endISO)}</div>
                        </div>
                        <BookingBadge status={b.status} />
                      </div>
                      <div className={s.cardClient}>{b.clientName}</div>
                      <div className={s.cardPhone}>{b.clientPhone}</div>
                      <div className={s.cardMeta}>
                        <div style={{ minWidth: 0 }}>
                          <div className={s.cardSvc}>{svc?.name ?? '—'}</div>
                          <div className={s.cardSpec}>{sp?.name ?? '—'}{svc ? ` · ${fmtDuration(svc.duration)}` : ''}</div>
                        </div>
                        {svc && <div className={s.cardPrice}>{fmtAMD(svc.price)}</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))
          )}
        </div>
      ) : (
        /* ── Desktop: data table ── */
        <div className={s.tableWrap}>
          <Table>
            <thead>
              <tr>
                <Th>Client</Th>
                <Th>Service</Th>
                <Th>Specialist</Th>
                <Th>Date & time</Th>
                <Th>Price</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {partnerBookings.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <Empty icon={Calendar} title="No bookings found" description="Try changing the filter or create a new booking." />
                  </td>
                </tr>
              ) : partnerBookings.map(b => {
                const svc = partner.services.find(sv => sv.id === b.serviceId)
                const sp  = partner.specialists.find(sp => sp.id === b.specialistId)
                return (
                  <Tr key={b.id} selected={b.id === selectedId} onClick={() => setSelectedId(b.id === selectedId ? null : b.id)}>
                    <Td>
                      <div className={s.clientInfo}>
                        <Avatar name={b.clientName} size="sm" />
                        <div>
                          <div className={s.clientName}>{b.clientName}</div>
                          <div className={s.clientPhone}>{b.clientPhone}</div>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <div className={s.svcName}>{svc?.name ?? '—'}</div>
                      {svc && <div className={s.svcDur}>{fmtDuration(svc.duration)}</div>}
                    </Td>
                    <Td><span className={s.specialistName}>{sp?.name ?? '—'}</span></Td>
                    <Td style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(b.startISO)}</Td>
                    <Td><span className={s.price}>{svc ? fmtAMD(svc.price) : '—'}</span></Td>
                    <Td><BookingBadge status={b.status} /></Td>
                  </Tr>
                )
              })}
            </tbody>
          </Table>
        </div>
      )}

      {/* Detail — bottom sheet on mobile, side drawer on desktop */}
      {selectedId && (
        <BookingDrawer
          bookingId={selectedId}
          onClose={closeBooking}
          sheet={isMobile}
        />
      )}
    </div>
  )
}
