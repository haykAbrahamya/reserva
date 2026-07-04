import { useState, useEffect, useCallback, useMemo } from 'react'
import { X, ChevronLeft, MapPin, Phone, CheckCircle2, XCircle, Clock, TrendingUp, Star } from 'lucide-react'
import { usePartner } from '@/store/app.store'
import { useResource } from '@/store/useResource'
import { bookingsService } from '@/services/bookings.service'
import { partnersService } from '@/services/partners.service'
import { BookingBadge } from '@/components/ui'
import { SpecialistReviews } from '@/components/specialists/SpecialistReviews/SpecialistReviews'
import { fmtAMD, fmtTime, fmtDateShort, initials } from '@/utils/format'
import { useT } from '@/i18n'
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
  const { data: locations } = useResource(() => partnersService.listLocations(), [], [])
  // This specialist's bookings (server-filtered).
  const { data: bookings } = useResource(
    () => bookingsService.list({ specialistId: sp.id, pageSize: 100 }).then(r => r.items),
    [sp.id],
    [],
  )
  const isMobile  = useIsMobile()
  const t         = useT()

  // Review summary (avg + count) bubbled up from the shared SpecialistReviews
  // component, used for the hero + section header badges.
  const [reviewSummary, setReviewSummary] = useState({ avg: 0, count: 0 })
  const onReviewSummary = useCallback(
    (sum: { avg: number; count: number }) => setReviewSummary(sum),
    [],
  )
  const avgRating = reviewSummary.avg
  const reviewCount = reviewSummary.count

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

  const loc = locations.find(l => l.id === sp.locationId)

  // ── Stats ── (bookings already scoped to this specialist) ──
  const spBookings = bookings

  const total      = spBookings.length
  const completed  = spBookings.filter(b => b.status === 'completed').length
  const cancelled  = spBookings.filter(b => b.status === 'cancelled').length
  const noshow     = spBookings.filter(b => b.status === 'noshow').length
  const pending    = spBookings.filter(b => b.status === 'pending' || b.status === 'confirmed').length

  const totalRevenue = useMemo(() =>
    spBookings
      .filter(b => b.status === 'completed')
      .reduce((sum, b) => sum + (b.finalPrice ?? b.priceAtBooking ?? b.service?.price ?? 0), 0),
    [spBookings]
  )

  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

  // Services breakdown — count per service (by embedded service name)
  const svcBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>()
    spBookings.filter(b => b.status === 'completed' && b.service).forEach(b => {
      const svc = b.service!
      const cur = map.get(svc.id)
      if (cur) cur.count += 1
      else map.set(svc.id, { name: svc.name, count: 1 })
    })
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
  }, [spBookings])

  const maxSvcCount = svcBreakdown[0]?.count ?? 1

  // Last 7 weeks revenue (simple weekly buckets)
  const weeklyRevenue = useMemo(() => {
    const now   = Date.now()
    const weeks = Array(7).fill(0)
    spBookings.filter(b => b.status === 'completed').forEach(b => {
      const daysAgo = (now - new Date(b.startISO).getTime()) / 86_400_000
      const weekIdx = Math.floor(daysAgo / 7)
      if (weekIdx < 7) {
        weeks[6 - weekIdx] += b.finalPrice ?? b.priceAtBooking ?? b.service?.price ?? 0
      }
    })
    return weeks
  }, [spBookings])

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
                {sp.active ? t('common.active') : t('common.inactive')}
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
              {avgRating > 0 && (
                <span className={s.heroBadge}>
                  <Star size={10} fill="currentColor" style={{ color: '#F5B544' }} /> {avgRating.toFixed(1)} ({reviewCount})
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className={s.kpiStrip}>
        {[
          { val: total,              label: t('specialistDashboard.kpi.total'),     accent: false },
          { val: completed,          label: t('specialistDashboard.kpi.completed'), accent: false },
          { val: `${completionRate}%`, label: t('specialistDashboard.kpi.rate'),    accent: true  },
          { val: fmtAMD(totalRevenue), label: t('specialistDashboard.kpi.revenue'), accent: false },
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
            <span className={s.sectionTitle}>{t('specialistDashboard.bookingBreakdown')}</span>
            <span className={s.sectionBadge}>{t('specialistDashboard.totalBadge', { count: total })}</span>
          </div>
          <div className={s.statusGrid}>
            {[
              { icon: <CheckCircle2 size={15} />, color: 'var(--success)', dot: 'var(--success)', val: completed, lbl: t('specialistDashboard.status.completed') },
              { icon: <Clock size={15} />,        color: 'var(--accent)',  dot: 'var(--accent)',  val: pending,   lbl: t('specialistDashboard.status.upcoming') },
              { icon: <XCircle size={15} />,      color: 'var(--danger)',  dot: 'var(--danger)',  val: cancelled, lbl: t('specialistDashboard.status.cancelled') },
              { icon: <XCircle size={15} />,      color: 'var(--fg-3)',    dot: 'var(--fg-3)',    val: noshow,    lbl: t('specialistDashboard.status.noshows') },
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
            <span className={s.sectionTitle}>{t('specialistDashboard.revenueLast7')}</span>
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
            <span>-6w</span><span>-5w</span><span>-4w</span><span>-3w</span><span>-2w</span><span>-1w</span><span>{t('specialistDashboard.now')}</span>
          </div>
        </div>

        {/* Services breakdown */}
        {svcBreakdown.length > 0 && (
          <div className={s.section}>
            <div className={s.sectionHead}>
              <span className={s.sectionTitle}>{t('specialistDashboard.topServices')}</span>
              <span className={s.sectionBadge}>{t('specialistDashboard.typesBadge', { count: svcBreakdown.length })}</span>
            </div>
            {svcBreakdown.map(({ name, count }) => (
              <div key={name} className={s.progressRow}>
                <span className={s.progressLabel}>{name}</span>
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
            <span className={s.sectionTitle}>{t('specialistDashboard.details')}</span>
          </div>
          <div className={s.infoRow}>
            <span className={s.infoLabel}>{t('specialistDashboard.location')}</span>
            <span className={s.infoValue}>{loc?.name ?? '—'}</span>
          </div>
          <div className={s.infoRow}>
            <span className={s.infoLabel}>{t('specialistDashboard.phone')}</span>
            <span className={s.infoValue}>{sp.phone || '—'}</span>
          </div>
          <div className={s.infoRow}>
            <span className={s.infoLabel}>{t('specialistDashboard.avgPerBooking')}</span>
            <span className={s.infoValue}>{completed > 0 ? fmtAMD(Math.round(totalRevenue / completed)) : '—'}</span>
          </div>
          <div className={s.infoRow}>
            <span className={s.infoLabel}>{t('specialistDashboard.servicesOffered')}</span>
            <span className={s.infoValue}>{sp.services.length}</span>
          </div>
        </div>

        {/* Reviews — shared list + moderation (delete). */}
        <div className={s.section}>
          <div className={s.sectionHead}>
            <span className={s.sectionTitle}>{t('specialistDashboard.reviews.title')}</span>
            <span className={s.sectionBadge} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {avgRating > 0 && (<><Star size={11} fill="currentColor" style={{ color: '#F5B544' }} /> {avgRating.toFixed(1)} · </>)}
              {reviewCount}
            </span>
          </div>
          <SpecialistReviews specialistId={sp.id} onSummary={onReviewSummary} />
        </div>

        {/* Recent bookings */}
        <div className={s.section}>
          <div className={s.sectionHead}>
            <span className={s.sectionTitle}>{t('specialistDashboard.recentBookings')}</span>
            <span className={s.sectionBadge}>{recent.length}</span>
          </div>
          {recent.length === 0
            ? <div className={s.emptySection}>{t('specialistDashboard.noBookings')}</div>
            : recent.map(b => (
                <div key={b.id} className={s.bookingRow}>
                  <div className={s.bkTime}>{fmtTime(b.startISO)}</div>
                  <div className={s.bkInfo}>
                    <div className={s.bkClient}>{b.clientName}</div>
                    <div className={s.bkSvc}>{fmtDateShort(b.startISO)}{b.service ? ` · ${b.service.name}` : ''}</div>
                  </div>
                  {b.service && <div className={s.bkPrice}>{fmtAMD(b.service.price)}</div>}
                  <BookingBadge status={b.status} />
                </div>
            ))
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
            <ChevronLeft size={18} /> {t('specialistDashboard.back')}
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
