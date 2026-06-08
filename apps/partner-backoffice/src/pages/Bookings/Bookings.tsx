import { useState, useEffect, type CSSProperties } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Calendar, X, Search } from 'lucide-react'
import { usePartner } from '@/store/app.store'
import { useResource } from '@/store/useResource'
import { Button, Table, Th, Td, Tr, BookingBadge, Avatar, Empty, Select, DatePicker, Pagination } from '@/components/ui'
import { fmtAMD, fmtDateTime, fmtDuration, fmtTime, fmtDateInput } from '@/utils/format'
import { bookingsService } from '@/services/bookings.service'
import { partnersService } from '@/services/partners.service'
import { useNewBooking } from '@/App'
import { BookingDrawer } from '@/components/bookings/BookingDrawer/BookingDrawer'
import { useScopedLocationId } from '@/store/auth.hooks'
import { useI18n } from '@/i18n'
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

const STATUS_FILTERS = ['all', 'confirmed', 'pending', 'completed', 'cancelled', 'noshow'] as const

export function Bookings() {
  const partner        = usePartner()
  // Specialist roster is only needed for the filter dropdown.
  const { data: specialists } = useResource(() => partnersService.listSpecialists(), [], [])
  const openNewBooking = useNewBooking()
  const isMobile       = useIsMobile()
  const scopedLocationId = useScopedLocationId()
  const { t, tp }      = useI18n()

  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedId,   setSelectedId]   = useState<string | null>(null)
  const [page,         setPage]         = useState(1)
  const [pageSize,     setPageSize]     = useState(5)

  // Specialist + date-range filters are URL-driven so other pages (e.g. the
  // time-off conflict dialog) can deep-link straight into a filtered view.
  const [searchParams, setSearchParams] = useSearchParams()
  const specialistFilter = searchParams.get('specialist') ?? 'all'
  const fromFilter       = searchParams.get('from') ?? ''
  const toFilter         = searchParams.get('to') ?? ''

  // Free-text search (debounced → server-side).
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  useEffect(() => {
    const id = setTimeout(() => { setDebounced(search.trim()); setPage(1) }, 300)
    return () => clearTimeout(id)
  }, [search])

  // Reset to page 1 when any server-side filter changes.
  useEffect(() => { setPage(1) }, [statusFilter, specialistFilter, fromFilter, toFilter])

  // Server-paginated, filtered list (always fresh).
  const { data: result, reload } = useResource(
    () => bookingsService.list({
      page,
      pageSize,
      status: statusFilter === 'all' ? undefined : statusFilter,
      specialistId: specialistFilter === 'all' ? undefined : specialistFilter,
      from: fromFilter || undefined,
      to: toFilter || undefined,
      search: debounced || undefined,
    }),
    [page, pageSize, statusFilter, specialistFilter, fromFilter, toFilter, debounced],
  )

  // Refresh when a booking is created from the global New-Booking modal.
  useEffect(() => {
    const fn = () => reload()
    window.addEventListener('booking-created', fn)
    return () => window.removeEventListener('booking-created', fn)
  }, [reload])

  const patchParams = (patch: Record<string, string>) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(patch).forEach(([k, v]) => {
      if (v && v !== 'all') next.set(k, v)
      else next.delete(k)
    })
    setSearchParams(next, { replace: true })
  }
  const clearFilters = () => {
    setSearch('')
    setStatusFilter('all')
    const next = new URLSearchParams(searchParams)
    next.delete('specialist'); next.delete('from'); next.delete('to')
    setSearchParams(next, { replace: true })
  }
  const hasExtraFilters =
    specialistFilter !== 'all' || !!fromFilter || !!toFilter || !!search.trim() || statusFilter !== 'all'

  if (!partner) return null

  const partnerBookings = result?.items ?? []
  const total = result?.total ?? 0

  // Specialists scoped to the manager's branch (mirrors other pages).
  const branchSpecialists = specialists.filter(
    sp => !scopedLocationId || sp.locationId === scopedLocationId
  )

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
          <h1 className={s.h1}>{t('bookings.title')}</h1>
          <p className={s.sub}>{tp('bookings.subtitle', partnerBookings.length, { name: partner.name })}</p>
        </div>
        <Button variant="accent" onClick={openNewBooking}><Plus size={14} /> {t('bookings.newBooking')}</Button>
      </div>

      {/* ── Filter toolbar ── */}
      <div className={s.toolbar}>
        {/* Row 1: search + specialist + dates + clear */}
        <div className={s.controls}>
          <div className={s.searchWrap}>
            <Search size={15} className={s.searchIcon} />
            <input
              className={s.searchInput}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('bookings.searchPlaceholder')}
            />
            {search && (
              <button type="button" className={s.searchClear} onClick={() => setSearch('')} aria-label={t('common.cancel')}>
                <X size={13} />
              </button>
            )}
          </div>

          <Select
            className={s.spSelect}
            value={specialistFilter}
            onChange={v => patchParams({ specialist: v })}
            options={[
              { value: 'all', label: t('bookings.allSpecialists') },
              ...branchSpecialists.map(sp => ({ value: sp.id, label: sp.name, sub: sp.title })),
            ]}
          />

          <div className={s.dateRange}>
            <DatePicker className={s.dateInput} value={fromFilter} onChange={v => patchParams({ from: v })} placeholder={t('bookings.dateFrom')} />
            <span className={s.dateDash}>–</span>
            <DatePicker className={s.dateInput} value={toFilter} min={fromFilter || undefined} onChange={v => patchParams({ to: v })} placeholder={t('bookings.dateTo')} />
          </div>

          {hasExtraFilters && (
            <button type="button" className={s.clearBtn} onClick={clearFilters}>
              <X size={13} /> {t('bookings.clearFilters')}
            </button>
          )}
        </div>

        {/* Row 2: status chips */}
        <div className={s.filters}>
          {STATUS_FILTERS.map(f => (
            <button
              key={f}
              className={[s.filterChip, statusFilter === f ? s.active : ''].filter(Boolean).join(' ')}
              onClick={() => setStatusFilter(f)}
            >
              {t(`bookings.filters.${f}`)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Mobile: card list grouped by date ── */}
      {isMobile ? (
        <div className={s.cardList}>
          {partnerBookings.length === 0 ? (
            <Empty icon={Calendar} title={t('bookings.emptyTitle')} description={t('bookings.emptyDescFilter')} action={
              <Button variant="accent" onClick={openNewBooking}><Plus size={14} /> {t('bookings.newBooking')}</Button>
            } />
          ) : (
            Object.entries(grouped).map(([dateKey, bks]) => (
              <div key={dateKey} className={s.dateGroup}>
                <div className={s.dateHeader}>
                  {new Date(dateKey).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
                {bks.map((b, i) => (
                  <div
                    key={b.id}
                    className={[s.bookingCard, s.animCard].join(' ')}
                    style={{ '--i': i } as CSSProperties}
                    onClick={() => openBooking(b.id)}
                  >
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
                        <div className={s.cardSvc}>{b.service?.name ?? '—'}</div>
                        <div className={s.cardSpec}>{b.specialist?.name ?? '—'}{b.service ? ` · ${fmtDuration(b.service.duration)}` : ''}</div>
                      </div>
                      {b.service && <div className={s.cardPrice}>{fmtAMD(b.service.price)}</div>}
                    </div>
                  </div>
                ))}
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
                <Th>{t('bookings.col.client')}</Th>
                <Th>{t('bookings.col.service')}</Th>
                <Th>{t('bookings.col.specialist')}</Th>
                <Th>{t('bookings.col.datetime')}</Th>
                <Th>{t('bookings.col.price')}</Th>
                <Th>{t('bookings.col.status')}</Th>
              </tr>
            </thead>
            <tbody>
              {partnerBookings.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <Empty icon={Calendar} title={t('bookings.emptyTitle')} description={t('bookings.emptyDescCreate')} />
                  </td>
                </tr>
              ) : partnerBookings.map((b, i) => (
                  <Tr
                    key={b.id}
                    selected={b.id === selectedId}
                    onClick={() => setSelectedId(b.id === selectedId ? null : b.id)}
                    className={s.row}
                    style={{ '--i': i } as CSSProperties}
                  >
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
                      <div className={s.svcName}>{b.service?.name ?? '—'}</div>
                      {b.service && <div className={s.svcDur}>{fmtDuration(b.service.duration)}</div>}
                    </Td>
                    <Td><span className={s.specialistName}>{b.specialist?.name ?? '—'}</span></Td>
                    <Td style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(b.startISO)}</Td>
                    <Td><span className={s.price}>{b.service ? fmtAMD(b.service.price) : '—'}</span></Td>
                    <Td><BookingBadge status={b.status} /></Td>
                  </Tr>
              ))}
            </tbody>
          </Table>
          <Pagination
            page={result?.page ?? 1}
            pageCount={result?.pageCount ?? 1}
            onPageChange={setPage}
            pageSize={pageSize}
            onPageSizeChange={(n) => { setPageSize(n); setPage(1) }}
            pageSizeLabel={t('pagination.perPage')}
            summary={t('pagination.summary', {
              from: total === 0 ? 0 : (page - 1) * pageSize + 1,
              to: Math.min(page * pageSize, total),
              total,
            })}
          />
        </div>
      )}

      {/* Detail — bottom sheet on mobile, side drawer on desktop */}
      {selectedId && (
        <BookingDrawer
          bookingId={selectedId}
          onClose={closeBooking}
          onChanged={reload}
          sheet={isMobile}
        />
      )}
    </div>
  )
}
