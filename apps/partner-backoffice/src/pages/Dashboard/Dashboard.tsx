import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Plus } from 'lucide-react'
import { useNewBooking } from '@/App'
import { useAppStore, usePartner } from '@/store/app.store'
import { useAuthStore } from '@/store/auth.store'
import { Button, Card, CardHeader, CardTitle, BookingBadge, Avatar } from '@/components/ui'
import { BookingDrawer } from '@/components/bookings/BookingDrawer/BookingDrawer'
import { fmtAMD, fmtTime, isSameDay } from '@/utils/format'
import type { Booking, Partner } from '@/types'
import s from './Dashboard.module.scss'

function useIsMobile() {
  const [m, setM] = useState(() => window.innerWidth <= 768)
  useEffect(() => {
    const fn = () => setM(window.innerWidth <= 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return m
}

export function Dashboard() {
  const partner        = usePartner()
  const bookings       = useAppStore(st => st.bookings)
  const authUser       = useAuthStore(s => s.user)
  const navigate       = useNavigate()
  const openNewBooking = useNewBooking()
  const isMobile       = useIsMobile()
  const now            = new Date()
  const firstName      = authUser?.name.split(' ')[0] ?? 'there'

  const [openId, setOpenId] = useState<string | null>(null)

  if (!partner) return null

  const todayBks = bookings
    .filter(b => b.partnerId === partner.id && isSameDay(new Date(b.startISO), now))
    .sort((a, b) => a.startISO.localeCompare(b.startISO))

  const tomorrowBks = (() => {
    const t = new Date(now); t.setDate(t.getDate() + 1)
    return bookings
      .filter(b => b.partnerId === partner.id && isSameDay(new Date(b.startISO), t))
      .sort((a, b) => a.startISO.localeCompare(b.startISO))
  })()

  const weekAgo    = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7)
  const last7      = bookings.filter(b => b.partnerId === partner.id && new Date(b.startISO) >= weekAgo && new Date(b.startISO) <= now)
  const completed7 = last7.filter(b => b.status === 'completed')
  const revenue7   = completed7.reduce((sum, b) => sum + (partner.services.find(sv => sv.id === b.serviceId)?.price ?? 0), 0)

  const upcoming30 = (() => {
    const t30 = new Date(now); t30.setDate(t30.getDate() + 30)
    return bookings.filter(b =>
      b.partnerId === partner.id &&
      new Date(b.startISO) >= now &&
      new Date(b.startISO) <= t30 &&
      b.status !== 'cancelled'
    )
  })()

  const noshow7   = last7.filter(b => b.status === 'noshow').length
  const occupancy = Math.min(99, Math.round((todayBks.filter(b => b.status !== 'cancelled').length / 12) * 100))
  const hour      = now.getHours()
  const greeting  = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'

  return (
    <div className={s.page}>
      <div className={s.head}>
        <div>
          <h1 className={s.h1}>Good {greeting}, <em>{firstName}</em></h1>
          <p className={s.sub}>
            {partner.name} · {now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className={s.headActions}>
          <Button variant="default" onClick={() => navigate('/calendar')}>
            <Calendar size={14} /> Open calendar
          </Button>
          <Button variant="accent" onClick={openNewBooking}>
            <Plus size={14} /> New booking
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className={s.kpiGrid}>
        {[
          { label: 'Bookings today',     value: todayBks.length,   delta: `${todayBks.filter(b => b.status === 'confirmed').length} confirmed` },
          { label: 'Revenue — 7 days',   value: fmtAMD(revenue7),  delta: `${completed7.length} services completed` },
          { label: 'Upcoming — 30 days', value: upcoming30.length, delta: 'bookings on books' },
          { label: 'No-shows — 7 days',  value: noshow7,           delta: noshow7 > 2 ? 'above average' : 'within range', neg: noshow7 > 2 },
        ].map((kpi, i) => (
          <Card key={i} style={{ animationDelay: `${i * 0.05}s`, animation: 'rise 0.35s cubic-bezier(.2,.7,.1,1) both' }}>
            <div className={s.kpi}>
              <div className={s.label}>{kpi.label}</div>
              <div className={s.num}>{kpi.value}</div>
              <div className={[s.delta, (kpi as { neg?: boolean }).neg ? s.negative : ''].filter(Boolean).join(' ')}>{kpi.delta}</div>
            </div>
          </Card>
        ))}
      </div>

      <div className={s.twoCol}>
        {/* Today's schedule */}
        <Card style={{ animation: 'rise 0.35s cubic-bezier(.2,.7,.1,1) both' }}>
          <CardHeader>
            <CardTitle sub={
              todayBks.length === 0
                ? 'No bookings yet — quiet day.'
                : `${todayBks.length} booked · ${todayBks.filter(b => new Date(b.startISO) > now && b.status !== 'cancelled').length} upcoming`
            }>
              Today's schedule
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/calendar')}>
              View calendar
            </Button>
          </CardHeader>
          <div style={{ padding: 6 }}>
            {todayBks.length === 0
              ? (
                <div className={s.emptyDay}>
                  <Calendar size={32} strokeWidth={1} className={s.emptyIcon} />
                  <div className={s.emptyTitle}>Empty day</div>
                  <div>You can still take walk-ins.</div>
                </div>
              )
              : todayBks.map(b => (
                  <BookingRow
                    key={b.id}
                    booking={b}
                    partner={partner}
                    onClick={() => setOpenId(b.id)}
                  />
                ))
            }
          </div>
        </Card>

        <div className={s.rightCol}>
          {/* Tomorrow */}
          <Card style={{ animation: 'rise 0.35s cubic-bezier(.2,.7,.1,1) 0.05s both' }}>
            <CardHeader>
              <CardTitle sub={`${tomorrowBks.length} bookings`}>Tomorrow</CardTitle>
            </CardHeader>
            <div style={{ padding: 6, maxHeight: 240, overflowY: 'auto' }}>
              {tomorrowBks.length === 0
                ? <div style={{ padding: '24px 12px', textAlign: 'center', fontSize: 13, color: 'var(--fg-2)' }}>Nothing booked.</div>
                : tomorrowBks.slice(0, 5).map(b => (
                    <BookingRow
                      key={b.id}
                      booking={b}
                      partner={partner}
                      compact
                      onClick={() => setOpenId(b.id)}
                    />
                  ))
              }
            </div>
          </Card>

          {/* Occupancy */}
          <Card style={{ animation: 'rise 0.35s cubic-bezier(.2,.7,.1,1) 0.1s both' }}>
            <CardHeader>
              <CardTitle>Today's occupancy</CardTitle>
            </CardHeader>
            <div className={s.occupancy}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
                <span className={s.occNum}>{occupancy}</span>
                <span className={s.occSuffix}>%</span>
                <span className={s.occLabel}>of bookable slots filled</span>
              </div>
              <div className={s.bar}>
                <div className={s.barFill} style={{ width: `${occupancy}%` }} />
              </div>
              <div className={s.staff}>
                {partner.specialists.filter(sp => sp.active).slice(0, 4).map(sp => (
                  <div key={sp.id} className={s.staffMember}>
                    <Avatar name={sp.name} color={partner.accent} size="sm" />
                    <span>{sp.name.split(' ')[0]}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Booking detail drawer / bottom sheet */}
      {openId && (
        <BookingDrawer
          bookingId={openId}
          onClose={() => setOpenId(null)}
          sheet={isMobile}
        />
      )}
    </div>
  )
}

function BookingRow({ booking, partner, compact, onClick }: {
  booking: Booking
  partner: Partner
  compact?: boolean
  onClick: () => void
}) {
  const svc = partner.services.find(sv => sv.id === booking.serviceId)
  const sp  = partner.specialists.find(sp => sp.id === booking.specialistId)

  return (
    <div
      className={[s.bookingRow, compact ? s.compact : ''].filter(Boolean).join(' ')}
      onClick={onClick}
    >
      <div className={[s.time, compact ? s.compact : ''].filter(Boolean).join(' ')}>
        {fmtTime(booking.startISO)}
      </div>
      <div style={{ minWidth: 0 }}>
        <div className={s.clientName}>{booking.clientName}</div>
        <div className={s.clientSub}>{svc?.name ?? '—'} · {sp?.name.split(' ')[0] ?? '—'}</div>
      </div>
      <div className={s.price}>{svc ? fmtAMD(svc.price) : ''}</div>
      <BookingBadge status={booking.status} />
    </div>
  )
}
