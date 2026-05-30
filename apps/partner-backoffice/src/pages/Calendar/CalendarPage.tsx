import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Plus, Calendar } from 'lucide-react'
import { useAppStore, usePartner } from '@/store/app.store'
import { Select, BookingBadge } from '@/components/ui'
import { useNewBooking } from '@/App'
import { isSameDay, fmtTime, fmtAMD } from '@/utils/format'
import { bookingsService } from '@/services/bookings.service'
import { useToast } from '@/components/ui'
import { BookingDrawer } from '@/components/bookings/BookingDrawer/BookingDrawer'
import type { Booking } from '@/types'
import s from './CalendarPage.module.scss'

const HOUR_START = 8
const HOUR_END   = 21
const PX_PER_MIN = 1.4
const SNAP_MIN   = 15

function buildWeek(anchor: Date): Date[] {
  const d   = new Date(anchor)
  const dow = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dow)
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(d); x.setDate(x.getDate() + i); return x
  })
}

export function CalendarPage() {
  const partner        = usePartner()
  const bookings       = useAppStore(st => st.bookings)
  const upsertBooking  = useAppStore(st => st.upsertBooking)
  const openNewBooking = useNewBooking()
  const toast          = useToast()

  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768)
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  // Shared state
  const [anchor,    setAnchor]    = useState<Date>(() => { const d = new Date(); d.setHours(0,0,0,0); return d })
  const [filterSp,  setFilterSp]  = useState('all')
  const [openId,    setOpenId]    = useState<string | null>(null)
  const [view,      setView]      = useState<'week' | 'day'>('week')
  // Mobile: which day is selected in the strip
  const [mobDay,    setMobDay]    = useState<Date>(() => { const d = new Date(); d.setHours(0,0,0,0); return d })

  const now   = new Date()
  const days  = view === 'week' ? buildWeek(anchor) : [anchor]
  const week  = buildWeek(mobDay) // always 7 days for mobile strip

  const move    = (dir: number) => { const d = new Date(anchor); d.setDate(d.getDate() + dir * (view === 'week' ? 7 : 1)); setAnchor(d) }
  const goToday = () => { const d = new Date(); d.setHours(0,0,0,0); setAnchor(d) }
  const mobMove = (dir: number) => {
    const d = new Date(mobDay); d.setDate(d.getDate() + dir * 7)
    setMobDay(d)
  }

  const visibleSpecialists = useMemo(() =>
    filterSp === 'all'
      ? (partner?.specialists.filter(sp => sp.active) ?? [])
      : (partner?.specialists.filter(sp => sp.id === filterSp) ?? []),
    [partner, filterSp]
  )

  const filteredBookings = useMemo(() =>
    bookings.filter(b =>
      b.partnerId === partner?.id &&
      visibleSpecialists.some(sp => sp.id === b.specialistId)
    ),
    [bookings, partner, visibleSpecialists]
  )

  // Desktop drag — ghost follows cursor as position:fixed so it's never clipped
  const dragRef = useRef<{
    bookingId: string; origStart: string; origEnd: string
    startY: number; startX: number; colWidth: number; dayIdx: number
    evWidth: number; evHeight: number; evOffsetY: number; evOffsetX: number
  } | null>(null)
  // ghost: screen-level fixed position + resolved booking info
  const [ghost, setGhost] = useState<{
    id: string; x: number; y: number; width: number; height: number
    dMin: number; dxCols: number
  } | null>(null)

  const onEventMouseDown = useCallback((e: React.MouseEvent, b: Booking, dayIdx: number) => {
    e.preventDefault(); e.stopPropagation()
    const evEl    = e.currentTarget as HTMLElement
    const evRect  = evEl.getBoundingClientRect()
    const colRect = evEl.parentElement!.getBoundingClientRect()

    dragRef.current = {
      bookingId: b.id, origStart: b.startISO, origEnd: b.endISO,
      startY: e.clientY, startX: e.clientX,
      colWidth: colRect.width, dayIdx,
      evWidth: evRect.width, evHeight: evRect.height,
      evOffsetY: e.clientY - evRect.top,
      evOffsetX: e.clientX - evRect.left,
    }

    const onMove = (ev: MouseEvent) => {
      const dr = dragRef.current!
      const dMin   = Math.round(((ev.clientY - dr.startY) / PX_PER_MIN) / SNAP_MIN) * SNAP_MIN
      const dxCols = Math.round((ev.clientX - dr.startX) / dr.colWidth)
      setGhost({
        id: dr.bookingId,
        x: ev.clientX - dr.evOffsetX,
        y: ev.clientY - dr.evOffsetY,
        width: dr.evWidth,
        height: dr.evHeight,
        dMin,
        dxCols,
      })
    }

    const onUp = async (ev: MouseEvent) => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      const dr = dragRef.current!
      dragRef.current = null; setGhost(null)
      const dMin   = Math.round(((ev.clientY - dr.startY) / PX_PER_MIN) / SNAP_MIN) * SNAP_MIN
      const dxCols = Math.round((ev.clientX - dr.startX) / dr.colWidth)
      if (dMin === 0 && dxCols === 0) { setOpenId(dr.bookingId); return }
      const newDayIdx = dr.dayIdx + dxCols
      if (newDayIdx < 0 || newDayIdx >= days.length) return
      const targetDay = days[newDayIdx]
      const newStart  = new Date(dr.origStart)
      newStart.setFullYear(targetDay.getFullYear(), targetDay.getMonth(), targetDay.getDate())
      newStart.setMinutes(newStart.getMinutes() + dMin)
      const dur    = new Date(dr.origEnd).getTime() - new Date(dr.origStart).getTime()
      const newEnd = new Date(newStart.getTime() + dur)
      const updated = await bookingsService.update(dr.bookingId, { startISO: newStart.toISOString(), endISO: newEnd.toISOString() })
      upsertBooking(updated)
      toast(`Moved to ${newStart.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [days, upsertBooking, toast])

  // Touch: tap = open detail, no drag on mobile calendar (drag handled by grid)
  const onEventTouchStart = useCallback((_e: React.TouchEvent, b: Booking, _dayIdx: number) => {
    setOpenId(b.id)
  }, [])

  if (!partner) return null

  const gridCols  = `52px repeat(${days.length}, 1fr)`
  const totalMin  = (HOUR_END - HOUR_START) * 60
  const colHeight = totalMin * PX_PER_MIN
  const dateLabel = view === 'week'
    ? `${days[0].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${days[6].toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : anchor.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  // ─────────────────────────────────────────────
  // MOBILE VIEW: week strip + day booking cards
  // ─────────────────────────────────────────────
  if (isMobile) {
    const mobDayBks = filteredBookings
      .filter(b => isSameDay(new Date(b.startISO), mobDay))
      .sort((a, b) => a.startISO.localeCompare(b.startISO))

    return (
      <div className={s.page}>
        {/* Mobile toolbar */}
        <div className={s.mobToolbar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button className={`${s.navBtn} ${s.iconOnly}`} onClick={() => mobMove(-1)}><ChevronLeft size={13} /></button>
            <span className={s.mobDateLabel}>
              {mobDay.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
            </span>
            <button className={`${s.navBtn} ${s.iconOnly}`} onClick={() => mobMove(1)}><ChevronRight size={13} /></button>
          </div>
          <button className={s.newBtn} onClick={openNewBooking}><Plus size={14} /></button>
        </div>

        {/* Week strip */}
        <div className={s.weekStrip}>
          {week.map((d, i) => {
            const isSel   = isSameDay(d, mobDay)
            const isToday = isSameDay(d, now)
            const cnt     = filteredBookings.filter(b => isSameDay(new Date(b.startISO), d) && b.status !== 'cancelled').length
            return (
              <button key={i} className={[s.stripDay, isSel ? s.stripSelected : ''].filter(Boolean).join(' ')} onClick={() => setMobDay(d)}>
                <span className={s.stripDayName}>{d.toLocaleDateString('en-GB', { weekday: 'short' })}</span>
                <span className={[s.stripDayNum, isToday && !isSel ? s.stripToday : ''].filter(Boolean).join(' ')}>{d.getDate()}</span>
                <span className={[s.stripDot, cnt > 0 ? s.stripDotVisible : ''].filter(Boolean).join(' ')} style={isSel && cnt > 0 ? { background: 'white' } : {}} />
              </button>
            )
          })}
        </div>

        {/* Day booking cards */}
        <div className={s.mobDayScroll}>
          {mobDayBks.length === 0 ? (
            <div className={s.mobEmpty}>
              <Calendar size={28} strokeWidth={1} style={{ color: 'var(--fg-3)', marginBottom: 8 }} />
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--fg-1)' }}>Nothing booked</div>
              <div style={{ fontSize: 13, color: 'var(--fg-2)', marginTop: 4 }}>
                {mobDay.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
            </div>
          ) : (
            mobDayBks.map(b => {
              const svc = partner.services.find(sv => sv.id === b.serviceId)
              const sp  = partner.specialists.find(sp => sp.id === b.specialistId)
              return (
                <div key={b.id} className={s.mobEventCard} onClick={() => setOpenId(b.id)}
                  style={{ borderLeftColor: b.status === 'completed' ? 'var(--info)' : b.status === 'pending' ? 'var(--warn)' : b.status === 'cancelled' ? 'var(--danger)' : 'var(--success)' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span className={s.mobEventTime}>{fmtTime(b.startISO)}–{fmtTime(b.endISO)}</span>
                    <BookingBadge status={b.status} />
                  </div>
                  <div className={s.mobEventName}>{b.clientName}</div>
                  <div className={s.mobEventSub}>
                    {svc?.name ?? '—'} · with {sp?.name.split(' ')[0] ?? '—'}
                    {svc && <span> · {fmtAMD(svc.price)}</span>}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {openId && <BookingDrawer bookingId={openId} onClose={() => setOpenId(null)} sheet />}
      </div>
    )
  }

  // ─────────────────────────────────────────────
  // DESKTOP VIEW: time grid with drag
  // ─────────────────────────────────────────────
  return (
    <div className={s.page}>
      <div className={s.toolbar}>
        <div className={s.navGroup}>
          <button className={`${s.navBtn} ${s.iconOnly}`} onClick={() => move(-1)}><ChevronLeft size={13} /></button>
          <button className={s.navBtn} onClick={goToday}>Today</button>
          <button className={`${s.navBtn} ${s.iconOnly}`} onClick={() => move(1)}><ChevronRight size={13} /></button>
          <span className={s.dateLabel}>{dateLabel}</span>
        </div>
        <div className={s.spacer} />
        <Select
          className={s.filterSelect}
          value={filterSp}
          onChange={setFilterSp}
          options={[{ value: 'all', label: 'All specialists' }, ...partner.specialists.map(sp => ({ value: sp.id, label: sp.name, sub: sp.title }))]}
          size="sm"
        />
        <div className={s.viewToggle}>
          <button className={[s.viewBtn, view === 'day' ? s.active : ''].filter(Boolean).join(' ')} onClick={() => setView('day')}>Day</button>
          <button className={[s.viewBtn, view === 'week' ? s.active : ''].filter(Boolean).join(' ')} onClick={() => setView('week')}>Week</button>
        </div>
        <button className={s.newBtn} onClick={openNewBooking}><Plus size={13} /> New</button>
      </div>

      <div className={s.gridWrap} style={{ userSelect: 'none' }}>
        <div className={s.gridHeader} style={{ gridTemplateColumns: gridCols }}>
          <div className={s.headerGutter} />
          {days.map((d, i) => (
            <div key={i} className={s.headerCell}>
              <div className={s.dayName}>{d.toLocaleDateString('en-GB', { weekday: 'short' })}</div>
              <div className={[s.dayNum, isSameDay(d, now) ? s.today : ''].filter(Boolean).join(' ')}>{d.getDate()}</div>
            </div>
          ))}
        </div>

        <div className={s.timeGrid} style={{ gridTemplateColumns: gridCols }}>
          <div className={s.gutter} style={{ height: colHeight }}>
            {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
              <div key={i}>
                <div className={s.hourLabel} style={{ top: i * 60 * PX_PER_MIN }}>
                  {String(HOUR_START + i).padStart(2, '0')}:00
                </div>
                <div className={s.halfLabel} style={{ top: (i * 60 + 30) * PX_PER_MIN }}>
                  :30
                </div>
              </div>
            ))}
          </div>

          {days.map((d, colIdx) => {
            const isToday   = isSameDay(d, now)
            const dayBks    = filteredBookings.filter(b => isSameDay(new Date(b.startISO), d))
            const nowOffset = (now.getHours() * 60 + now.getMinutes() - HOUR_START * 60) * PX_PER_MIN
            return (
              <div key={colIdx} className={[s.dayCol, isToday ? s.today : ''].filter(Boolean).join(' ')} style={{ height: colHeight }}>
                {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
                  <div key={i}>
                    <div className={s.hourLine}  style={{ top: i * 60 * PX_PER_MIN }} />
                    <div className={s.halfLine}  style={{ top: (i * 60 + 30) * PX_PER_MIN }} />
                  </div>
                ))}
                {isToday && nowOffset > 0 && nowOffset < colHeight && (
                  <div className={s.nowLine} style={{ top: nowOffset }} />
                )}
                {dayBks.map(b => (
                  <CalEvent
                    key={b.id}
                    booking={b}
                    partner={partner}
                    isDragging={ghost?.id === b.id}
                    onMouseDown={ev => onEventMouseDown(ev, b, colIdx)}
                    onTouchStart={ev => onEventTouchStart(ev, b, colIdx)}
                  />
                ))}
              </div>
            )
          })}
        </div>
      </div>

      {/* Floating drag ghost — position:fixed, follows cursor across columns */}
      {ghost && (() => {
        const b   = filteredBookings.find(x => x.id === ghost.id)
        const svc = b ? partner.services.find(sv => sv.id === b.serviceId) : null
        const sp  = b ? partner.specialists.find(sp => sp.id === b.specialistId) : null
        const newTimeStr = b ? (() => {
          const ns = new Date(b.startISO); ns.setMinutes(ns.getMinutes() + ghost.dMin)
          return ns.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
        })() : ''
        return (
          <div style={{
            position: 'fixed',
            left: ghost.x, top: ghost.y,
            width: ghost.width, height: ghost.height,
            zIndex: 9999, pointerEvents: 'none',
            borderRadius: 6, padding: '4px 8px',
            background: 'var(--accent-soft)', borderLeft: '3px solid var(--accent)',
            boxShadow: 'var(--shadow-3)', opacity: 0.92,
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-2)' }}>{newTimeStr}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b?.clientName}</div>
            {svc && <div style={{ fontSize: 10, color: 'var(--fg-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{svc.name}{sp ? ` · ${sp.name.split(' ')[0]}` : ''}</div>}
          </div>
        )
      })()}

      {openId && <BookingDrawer bookingId={openId} onClose={() => setOpenId(null)} />}
    </div>
  )
}

function CalEvent({ booking, partner, isDragging, onMouseDown, onTouchStart }: {
  booking: Booking
  partner: NonNullable<ReturnType<typeof usePartner>>
  isDragging?: boolean
  onMouseDown: (e: React.MouseEvent) => void
  onTouchStart: (e: React.TouchEvent) => void
}) {
  const start    = new Date(booking.startISO)
  const end      = new Date(booking.endISO)
  const startMin = start.getHours() * 60 + start.getMinutes()
  const endMin   = end.getHours()   * 60 + end.getMinutes()
  const top      = (startMin - HOUR_START * 60) * PX_PER_MIN
  const height   = Math.max((endMin - startMin) * PX_PER_MIN, 22)

  const svc     = partner.services.find(sv => sv.id === booking.serviceId)
  const sp      = partner.specialists.find(sp => sp.id === booking.specialistId)
  const timeStr = `${start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}–${end.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`

  return (
    <div
      className={[s.event, s[booking.status]].filter(Boolean).join(' ')}
      style={{ top, height, opacity: isDragging ? 0.25 : 1, cursor: isDragging ? 'grabbing' : 'grab' }}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      title={`${booking.clientName} · ${svc?.name ?? ''}`}
    >
      {height > 28 && <div className={s.eventTime}>{timeStr}</div>}
      <div className={s.eventName}>{booking.clientName}</div>
      {height > 44 && svc && <div className={s.eventSvc}>{svc.name}{sp ? ` · ${sp.name.split(' ')[0]}` : ''}</div>}
    </div>
  )
}
