import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Plus } from 'lucide-react'
import { useNewBooking } from '@/App'
import { useAppStore, usePartner } from '@/store/app.store'
import { useAuthStore } from '@/store/auth.store'
import { Button, Card, CardHeader, CardTitle, BookingBadge, Avatar } from '@/components/ui'
import { BookingDrawer } from '@/components/bookings/BookingDrawer/BookingDrawer'
import { fmtAMD, fmtTime, isSameDay } from '@/utils/format'
import { useScopedLocationId } from '@/store/auth.hooks'
import { useI18n } from '@/i18n'
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
  const allBookings    = useAppStore(st => st.bookings)
  const authUser       = useAuthStore(s => s.user)
  const navigate       = useNavigate()
  const openNewBooking = useNewBooking()
  const isMobile       = useIsMobile()
  const scopedLocationId = useScopedLocationId()
  const { t }          = useI18n()
  const now            = new Date()
  const firstName      = authUser?.name.split(' ')[0] ?? t('dashboard.fallbackName')

  const [openId, setOpenId] = useState<string | null>(null)

  if (!partner) return null

  // Managers see only their branch; admins see everything.
  const bookings = scopedLocationId
    ? allBookings.filter(b => b.locationId === scopedLocationId)
    : allBookings

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
  const greetingKey = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'
  // Greeting with an emphasized name — split around the {name} token.
  const [greetBefore, greetAfter] = t(`dashboard.greeting.${greetingKey}`).split('{name}')

  return (
    <div className={s.page}>
      <div className={s.head}>
        <div>
          <h1 className={s.h1}>{greetBefore}<em>{firstName}</em>{greetAfter}</h1>
          <p className={s.sub}>
            {partner.name} · {now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className={s.headActions}>
          <Button variant="default" onClick={() => navigate('/calendar')}>
            <Calendar size={14} /> {t('dashboard.openCalendar')}
          </Button>
          <Button variant="accent" onClick={openNewBooking}>
            <Plus size={14} /> {t('dashboard.newBooking')}
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className={s.kpiGrid}>
        {[
          { label: t('dashboard.kpi.bookingsToday'), value: todayBks.length,   delta: t('dashboard.kpi.confirmed', { count: todayBks.filter(b => b.status === 'confirmed').length }) },
          { label: t('dashboard.kpi.revenue7'),      value: fmtAMD(revenue7),  delta: t('dashboard.kpi.servicesCompleted', { count: completed7.length }) },
          { label: t('dashboard.kpi.upcoming30'),    value: upcoming30.length, delta: t('dashboard.kpi.onBooks') },
          { label: t('dashboard.kpi.noshows7'),      value: noshow7,           delta: noshow7 > 2 ? t('dashboard.kpi.aboveAverage') : t('dashboard.kpi.withinRange'), neg: noshow7 > 2 },
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
                ? t('dashboard.quietDay')
                : t('dashboard.scheduleSummary', { booked: todayBks.length, upcoming: todayBks.filter(b => new Date(b.startISO) > now && b.status !== 'cancelled').length })
            }>
              {t('dashboard.todaySchedule')}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/calendar')}>
              {t('dashboard.viewCalendar')}
            </Button>
          </CardHeader>
          <div style={{ padding: 6 }}>
            {todayBks.length === 0
              ? (
                <div className={s.emptyDay}>
                  <Calendar size={32} strokeWidth={1} className={s.emptyIcon} />
                  <div className={s.emptyTitle}>{t('dashboard.emptyDay')}</div>
                  <div>{t('dashboard.walkIns')}</div>
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
              <CardTitle sub={t('dashboard.tomorrowCount', { count: tomorrowBks.length })}>{t('dashboard.tomorrow')}</CardTitle>
            </CardHeader>
            <div style={{ padding: 6, maxHeight: 240, overflowY: 'auto' }}>
              {tomorrowBks.length === 0
                ? <div style={{ padding: '24px 12px', textAlign: 'center', fontSize: 13, color: 'var(--fg-2)' }}>{t('dashboard.nothingBooked')}</div>
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
              <CardTitle>{t('dashboard.todayOccupancy')}</CardTitle>
            </CardHeader>
            <div className={s.occupancy}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
                <span className={s.occNum}>{occupancy}</span>
                <span className={s.occSuffix}>%</span>
                <span className={s.occLabel}>{t('dashboard.slotsFilled')}</span>
              </div>
              <div className={s.bar}>
                <div className={s.barFill} style={{ width: `${occupancy}%` }} />
              </div>
              <div className={s.staff}>
                {partner.specialists.filter(sp => sp.active && (!scopedLocationId || sp.locationId === scopedLocationId)).slice(0, 4).map(sp => (
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
