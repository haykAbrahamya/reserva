import { useState, useEffect, useCallback, useMemo } from 'react'
import { X, ChevronLeft, MapPin, Phone, CheckCircle2, XCircle, Clock, TrendingUp } from 'lucide-react'
import { useAppStore, usePartner } from '@/store/app.store'
import { BookingBadge } from '@/components/ui'
import { fmtAMD, fmtTime, fmtDateShort, initials } from '@/utils/format'
import type { Specialist } from '@/types'
import s from './SpecialistDashboard.module.scss'

const CLOSE_MS = 280

function useIsMobile() {
  const [m, setM] = useState(() => window.innerWidth <= 768)
  useEffect(() => {
    const fn = () => setM(window.innerWidth <= 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return m
}

interface Props {
  specialist: Specialist
  onClose: () => void
}

export function SpecialistDashboard({ specialist: sp, onClose }: Props) {
  const partner   = usePartner()
  const bookings  = useAppStore(st => st.bookings)
  const isMobile  = useIsMobile()
  const [closing, setClosing] = useState(false)

  const handleClose = useCallback(() => {
    setClosing(true)
    setTimeout(() => { setClosing(false); onClose() }, CLOSE_MS)
  }, [onClose])

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', fn)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', fn); document.body.style.overflow = '' }
  }, [handleClose])

  const loc = partner?.locations.find(l => l.id === sp.locationId)

  // ── Stats ──────────────────────────────────────────────────
  const spBookings = useMemo(() =>
    bookings.filter(b => b.specialistId === sp.id),
    [bookings, sp.id]
  )

  const total      = spBookings.length
  const completed  = spBookings.filter(b => b.status === 'completed').length
  const cancelled  = spBookings.filter(b => b.status === 'cancelled').length
  const noshow     = spBookings.filter(b => b.status === 'noshow').length
  const pending    = spBookings.filter(b => b.status === 'pending' || b.status === 'confirmed').length

  const totalRevenue = useMemo(() =>
    spBookings
      .filter(b => b.status === 'completed')
      .reduce((sum, b) => sum + (partner?.services.find(sv => sv.id === b.serviceId)?.price ?? 0), 0),
    [spBookings, partner]
  )

  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

  // Services breakdown — count per service
  const svcBreakdown = useMemo(() => {
    if (!partner) return []
    const map = new Map<string, number>()
    spBookings.filter(b => b.status === 'completed').forEach(b => {
      map.set(b.serviceId, (map.get(b.serviceId) ?? 0) + 1)
    })
    return Array.from(map.entries())
      .map(([id, count]) => ({ svc: partner.services.find(sv => sv.id === id), count }))
      .filter(x => x.svc)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
  }, [spBookings, partner])

  const maxSvcCount = svcBreakdown[0]?.count ?? 1

  // Last 7 weeks revenue (simple weekly buckets)
  const weeklyRevenue = useMemo(() => {
    const now   = Date.now()
    const weeks = Array(7).fill(0)
    spBookings.filter(b => b.status === 'completed').forEach(b => {
      const daysAgo = (now - new Date(b.startISO).getTime()) / 86_400_000
      const weekIdx = Math.floor(daysAgo / 7)
      if (weekIdx < 7) {
        const price = partner?.services.find(sv => sv.id === b.serviceId)?.price ?? 0
        weeks[6 - weekIdx] += price
      }
    })
    return weeks
  }, [spBookings, partner])

  const maxWeekRev = Math.max(...weeklyRevenue, 1)

  // Recent bookings (last 8)
  const recent = useMemo(() =>
    [...spBookings].sort((a, b) => b.startISO.localeCompare(a.startISO)).slice(0, 8),
    [spBookings]
  )

  if (!partner) return null

  const accentColor = partner.accent

  // ── Inner content (shared between desktop drawer + mobile page) ──
  const content = (
    <div className={s.scroll}>
      {/* Hero */}
      <div className={s.hero}>
        <div className={s.heroGrid} />
        <div className={s.heroOrb} style={{ background: `radial-gradient(circle, ${accentColor}44 0%, transparent 70%)` }} />

        {!isMobile && (
          <button className={s.heroClose} onClick={handleClose}><X size={14} /></button>
        )}

        <div className={s.heroBody}>
          <div className={s.heroAvatar} style={{ background: accentColor }}>
            {initials(sp.name)}
          </div>
          <div className={s.heroInfo}>
            <div className={s.heroName}>{sp.name}</div>
            <div className={s.heroTitle}>{sp.title}</div>
            <div className={s.heroBadges}>
              <span className={[s.heroBadge, sp.active ? s.active : s.inactive].join(' ')}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
                {sp.active ? 'Active' : 'Inactive'}
              </span>
              {loc && (
                <span className={s.heroBadge}>
                  <MapPin size={10} /> {loc.name}
                </span>
              )}
              {sp.phone && (
                <span className={s.heroBadge}>
                  <Phone size={10} /> {sp.phone}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className={s.kpiStrip}>
        {[
          { val: total,              label: 'Total',      accent: false },
          { val: completed,          label: 'Completed',  accent: false },
          { val: `${completionRate}%`, label: 'Rate',     accent: true  },
          { val: fmtAMD(totalRevenue), label: 'Revenue',  accent: false },
        ].map(({ val, label, accent }) => (
          <div key={label} className={s.kpi}>
            <div className={[s.kpiVal, accent ? s.kpiAccent : ''].filter(Boolean).join(' ')}>{val}</div>
            <div className={s.kpiLabel}>{label}</div>
          </div>
        ))}
      </div>

      <div className={s.content}>
        {/* Status breakdown */}
        <div className={s.section}>
          <div className={s.sectionHead}>
            <span className={s.sectionTitle}>Booking breakdown</span>
            <span className={s.sectionBadge}>{total} total</span>
          </div>
          <div className={s.statusGrid}>
            {[
              { icon: <CheckCircle2 size={15} />, color: 'var(--success)', dot: 'var(--success)', val: completed, lbl: 'Completed' },
              { icon: <Clock size={15} />,        color: 'var(--accent)',  dot: 'var(--accent)',  val: pending,   lbl: 'Upcoming' },
              { icon: <XCircle size={15} />,      color: 'var(--danger)',  dot: 'var(--danger)',  val: cancelled, lbl: 'Cancelled' },
              { icon: <XCircle size={15} />,      color: 'var(--fg-3)',    dot: 'var(--fg-3)',    val: noshow,    lbl: 'No-shows' },
            ].map(({ color, dot, val, lbl }) => (
              <div key={lbl} className={s.statusCell}>
                <span className={s.statusDot} style={{ background: dot }} />
                <div>
                  <div className={s.statusVal} style={{ color }}>{val}</div>
                  <div className={s.statusLbl}>{lbl}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly revenue chart */}
        <div className={s.section}>
          <div className={s.sectionHead}>
            <span className={s.sectionTitle}>Revenue · last 7 weeks</span>
            <span className={s.sectionBadge} style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--success)' }}>
              <TrendingUp size={12} /> {fmtAMD(totalRevenue)}
            </span>
          </div>
          <div className={s.revenueChart}>
            {weeklyRevenue.map((val, i) => (
              <div
                key={i}
                className={[s.revenueBar, i === 6 ? s.current : ''].filter(Boolean).join(' ')}
                style={{ height: `${Math.max(4, (val / maxWeekRev) * 100)}%` }}
                title={fmtAMD(val)}
              />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 16px 10px', fontSize: 10, color: 'var(--fg-3)', fontFamily: 'var(--font-mono)' }}>
            <span>-6w</span><span>-5w</span><span>-4w</span><span>-3w</span><span>-2w</span><span>-1w</span><span>Now</span>
          </div>
        </div>

        {/* Services breakdown */}
        {svcBreakdown.length > 0 && (
          <div className={s.section}>
            <div className={s.sectionHead}>
              <span className={s.sectionTitle}>Top services</span>
              <span className={s.sectionBadge}>{svcBreakdown.length} types</span>
            </div>
            {svcBreakdown.map(({ svc, count }) => (
              <div key={svc!.id} className={s.progressRow}>
                <span className={s.progressLabel}>{svc!.name}</span>
                <div className={s.progressBar}>
                  <div className={s.progressFill} style={{ width: `${(count / maxSvcCount) * 100}%` }} />
                </div>
                <span className={s.progressCount}>{count}</span>
              </div>
            ))}
          </div>
        )}

        {/* Info */}
        <div className={s.section}>
          <div className={s.sectionHead}>
            <span className={s.sectionTitle}>Details</span>
          </div>
          <div className={s.infoRow}>
            <span className={s.infoLabel}>Location</span>
            <span className={s.infoValue}>{loc?.name ?? '—'}</span>
          </div>
          <div className={s.infoRow}>
            <span className={s.infoLabel}>Phone</span>
            <span className={s.infoValue}>{sp.phone || '—'}</span>
          </div>
          <div className={s.infoRow}>
            <span className={s.infoLabel}>Avg per booking</span>
            <span className={s.infoValue}>{completed > 0 ? fmtAMD(Math.round(totalRevenue / completed)) : '—'}</span>
          </div>
          <div className={s.infoRow}>
            <span className={s.infoLabel}>Services offered</span>
            <span className={s.infoValue}>{sp.services.length}</span>
          </div>
        </div>

        {/* Recent bookings */}
        <div className={s.section}>
          <div className={s.sectionHead}>
            <span className={s.sectionTitle}>Recent bookings</span>
            <span className={s.sectionBadge}>{recent.length}</span>
          </div>
          {recent.length === 0
            ? <div className={s.emptySection}>No bookings yet</div>
            : recent.map(b => {
              const svc = partner.services.find(sv => sv.id === b.serviceId)
              return (
                <div key={b.id} className={s.bookingRow}>
                  <div className={s.bkTime}>{fmtTime(b.startISO)}</div>
                  <div className={s.bkInfo}>
                    <div className={s.bkClient}>{b.clientName}</div>
                    <div className={s.bkSvc}>{fmtDateShort(b.startISO)}{svc ? ` · ${svc.name}` : ''}</div>
                  </div>
                  {svc && <div className={s.bkPrice}>{fmtAMD(svc.price)}</div>}
                  <BookingBadge status={b.status} />
                </div>
              )
            })
          }
        </div>
      </div>
    </div>
  )

  // ── Mobile: full-screen page ──────────────────────────────
  if (isMobile) {
    return (
      <div className={[s.mobilePage, closing ? s.closing : ''].filter(Boolean).join(' ')}>
        <div className={s.mobileNav}>
          <button className={s.backBtn} onClick={handleClose}>
            <ChevronLeft size={18} /> Specialists
          </button>
        </div>
        {content}
      </div>
    )
  }

  // ── Desktop: side drawer ─────────────────────────────────
  return (
    <>
      <div className={[s.scrim, closing ? s.closing : ''].filter(Boolean).join(' ')} onClick={handleClose} />
      <div className={[s.drawer, closing ? s.closing : ''].filter(Boolean).join(' ')}>
        {content}
      </div>
    </>
  )
}
