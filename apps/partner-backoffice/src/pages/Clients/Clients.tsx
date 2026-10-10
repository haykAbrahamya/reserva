import { useState, useEffect } from 'react'
import { Search, Users } from 'lucide-react'
import { usePartner } from '@/store/app.store'
import { useResource } from '@/store/useResource'
import { Avatar, Table, Th, Td, Tr, BookingBadge, Empty, Drawer, Pagination } from '@/components/ui'
import { fmtAMD, fmtDateTime, fmtDateShort } from '@/utils/format'
import { clientsService } from '@/services/clients.service'
import { BookingDrawer } from '@/components/bookings/BookingDrawer/BookingDrawer'
import { useI18n } from '@/i18n'
import s from './Clients.module.scss'

function useIsMobile() {
  const [m, setM] = useState(() => window.innerWidth <= 768)
  useEffect(() => {
    const fn = () => setM(window.innerWidth <= 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return m
}

export function Clients() {
  const partner  = usePartner()
  const isMobile = useIsMobile()
  const { t, tp } = useI18n()

  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [openBkId, setOpenBkId] = useState<string | null>(null)

  // Debounce the search box, and reset to page 1 when the term changes.
  useEffect(() => {
    const id = setTimeout(() => { setDebounced(query.trim()); setPage(1) }, 300)
    return () => clearTimeout(id)
  }, [query])

  // Server-side paginated + searched list (always fresh).
  const { data: result } = useResource(
    () => clientsService.list({ page, pageSize, search: debounced || undefined }),
    [page, pageSize, debounced],
  )

  // Detail (with bookings + stats) loads only when a client is selected.
  const { data: detail } = useResource(
    () => (selectedId ? clientsService.get(selectedId) : Promise.resolve(null)),
    [selectedId],
  )

  if (!partner) return null

  const clients = result?.items ?? []
  const total = result?.total ?? 0

  return (
    <div className={s.page}>
      <div className={s.head}>
        <div>
          <h1 className={s.h1}>{t('clients.title')}</h1>
          <p className={s.sub}>{tp('clients.subtitle', total, { name: partner.name })}</p>
        </div>
        <div className={s.search}>
          <Search size={14} style={{ color: 'var(--fg-3)', flexShrink: 0 }} />
          <input
            placeholder={t('clients.searchPlaceholder')}
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
      </div>

      {clients.length === 0 ? (
        <Empty icon={Users} title={t('clients.emptyTitle')} description={debounced ? t('clients.emptyDescSearch') : t('clients.emptyDescDefault')} />
      ) : isMobile ? (
        /* ── Mobile card list ── */
        <div className={s.cardList}>
          {clients.map(c => (
            <div key={c.id} className={s.clientCard} onClick={() => setSelectedId(c.id)}>
              <div className={s.cardRow}>
                <Avatar name={c.name} color={partner.accent} size="lg" />
                <div className={s.cardMeta}>
                  <div className={s.cardName}>{c.name}</div>
                  <div className={s.cardPhone}>{c.phone}</div>
                </div>
              </div>
              <div className={s.cardStats}>
                <div className={s.cardStat}>
                  <div className={s.cardStatVal}>{c.visits}</div>
                  <div className={s.cardStatLabel}>{t('clients.visits')}</div>
                </div>
                <div className={s.cardStat}>
                  <div className={s.cardStatVal}>{fmtAMD(c.totalSpend)}</div>
                  <div className={s.cardStatLabel}>{t('clients.spent')}</div>
                </div>
                <div className={s.cardStat}>
                  <div className={s.cardStatVal}>{c.lastVisit ? fmtDateShort(c.lastVisit) : '—'}</div>
                  <div className={s.cardStatLabel}>{t('clients.lastVisit')}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ── Desktop table ── */
        <div className={s.tableWrap}>
          <Table>
            <thead>
              <tr>
                <Th>{t('bookings.col.client')}</Th>
                <Th>{t('clients.visits')}</Th>
                <Th>{t('clients.totalSpent')}</Th>
                <Th>{t('clients.lastVisit')}</Th>
              </tr>
            </thead>
            <tbody>
              {clients.map(c => (
                <Tr key={c.id} selected={c.id === selectedId} onClick={() => setSelectedId(c.id === selectedId ? null : c.id)}>
                  <Td>
                    <div className={s.clientInfo}>
                      <Avatar name={c.name} color={partner.accent} size="md" />
                      <div>
                        <div className={s.clientName}>{c.name}</div>
                        <div className={s.clientPhone}>{c.phone}</div>
                      </div>
                    </div>
                  </Td>
                  <Td><span className={s.stat}>{c.visits}</span></Td>
                  <Td><span className={s.stat}>{fmtAMD(c.totalSpend)}</span></Td>
                  <Td><span className={s.lastDate}>{c.lastVisit ? fmtDateTime(c.lastVisit) : '—'}</span></Td>
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

      {/* Client detail drawer */}
      {selectedId && detail && (
        <Drawer
          open
          onClose={() => setSelectedId(null)}
          title={detail.name}
          subtitle={detail.phone}
        >
          <div className={s.drawerSection}>
            <div className={s.drawerLabel}>{t('clients.stats')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 4 }}>
              {[
                { label: t('clients.visits'),     value: detail.stats.visits },
                { label: t('clients.completed'),  value: detail.stats.completed },
                { label: t('clients.totalSpent'), value: fmtAMD(detail.stats.totalSpend) },
              ].map(stat => (
                <div key={stat.label} style={{ background: 'var(--bg-2)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 600 }}>{stat.value}</div>
                  <div style={{ fontSize: 10, color: 'var(--fg-2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className={s.drawerSection}>
            <div className={s.drawerLabel}>{t('clients.bookingHistory')}</div>
            {detail.bookings.map(b => (
              <div key={b.id} className={s.historyRow} onClick={() => setOpenBkId(b.id)} style={{ cursor: 'pointer' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className={s.histName}>{b.service?.name ?? '—'}</div>
                  <div className={s.histSub}>{fmtDateTime(b.startISO)}{b.specialist ? ` · ${b.specialist.name.split(' ')[0]}` : ''}</div>
                </div>
                <BookingBadge status={b.status} />
              </div>
            ))}
          </div>
        </Drawer>
      )}

      {openBkId && <BookingDrawer bookingId={openBkId} onClose={() => setOpenBkId(null)} sheet={isMobile} />}
    </div>
  )
}
