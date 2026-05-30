import { useState, useMemo, useEffect } from 'react'
import { Search, Users } from 'lucide-react'
import { useAppStore, usePartner } from '@/store/app.store'
import { Avatar, Table, Th, Td, Tr, BookingBadge, Empty, Drawer } from '@/components/ui'
import { fmtAMD, fmtDateTime, fmtDateShort } from '@/utils/format'
import { BookingDrawer } from '@/components/bookings/BookingDrawer/BookingDrawer'
import type { Booking } from '@/types'
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

interface Client {
  name: string
  phone: string
  bookings: Booking[]
  totalSpend: number
  lastVisit: string
}

export function Clients() {
  const partner  = usePartner()
  const bookings = useAppStore(st => st.bookings)
  const isMobile = useIsMobile()

  const [query,        setQuery]        = useState('')
  const [selectedName, setSelectedName] = useState<string | null>(null)
  const [openBkId,     setOpenBkId]     = useState<string | null>(null)

  const clients = useMemo<Client[]>(() => {
    if (!partner) return []
    const map = new Map<string, Client>()
    bookings
      .filter(b => b.partnerId === partner.id && b.status !== 'cancelled')
      .forEach(b => {
        const key = b.clientPhone
        if (!map.has(key)) {
          map.set(key, { name: b.clientName, phone: b.clientPhone, bookings: [], totalSpend: 0, lastVisit: b.startISO })
        }
        const c = map.get(key)!
        c.bookings.push(b)
        const svc = partner.services.find(sv => sv.id === b.serviceId)
        if (b.status === 'completed') c.totalSpend += svc?.price ?? 0
        if (b.startISO > c.lastVisit) c.lastVisit = b.startISO
      })
    return Array.from(map.values()).sort((a, b) => b.lastVisit.localeCompare(a.lastVisit))
  }, [bookings, partner])

  const filtered = useMemo(() =>
    query.trim()
      ? clients.filter(c =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.phone.includes(query)
        )
      : clients,
    [clients, query]
  )

  const selectedClient = selectedName ? clients.find(c => c.name === selectedName) ?? null : null

  if (!partner) return null

  return (
    <div className={s.page}>
      <div className={s.head}>
        <div>
          <h1 className={s.h1}>Clients</h1>
          <p className={s.sub}>{partner.name} · {clients.length} client{clients.length !== 1 ? 's' : ''}</p>
        </div>
        <div className={s.search}>
          <Search size={14} style={{ color: 'var(--fg-3)', flexShrink: 0 }} />
          <input
            placeholder="Search by name or phone…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Empty icon={Users} title="No clients found" description={query ? 'Try a different search.' : 'Clients will appear here once bookings are completed.'} />
      ) : isMobile ? (
        /* ── Mobile card list ── */
        <div className={s.cardList}>
          {filtered.map(c => (
            <div key={c.phone} className={s.clientCard} onClick={() => setSelectedName(c.name)}>
              <div className={s.cardRow}>
                <Avatar name={c.name} color={partner.accent} size="lg" />
                <div className={s.cardMeta}>
                  <div className={s.cardName}>{c.name}</div>
                  <div className={s.cardPhone}>{c.phone}</div>
                </div>
              </div>
              <div className={s.cardStats}>
                <div className={s.cardStat}>
                  <div className={s.cardStatVal}>{c.bookings.length}</div>
                  <div className={s.cardStatLabel}>Visits</div>
                </div>
                <div className={s.cardStat}>
                  <div className={s.cardStatVal}>{fmtAMD(c.totalSpend)}</div>
                  <div className={s.cardStatLabel}>Spent</div>
                </div>
                <div className={s.cardStat}>
                  <div className={s.cardStatVal}>{fmtDateShort(c.lastVisit)}</div>
                  <div className={s.cardStatLabel}>Last visit</div>
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
                <Th>Client</Th>
                <Th>Visits</Th>
                <Th>Total spent</Th>
                <Th>Last visit</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <Tr key={c.phone} selected={c.name === selectedName} onClick={() => setSelectedName(c.name === selectedName ? null : c.name)}>
                  <Td>
                    <div className={s.clientInfo}>
                      <Avatar name={c.name} color={partner.accent} size="md" />
                      <div>
                        <div className={s.clientName}>{c.name}</div>
                        <div className={s.clientPhone}>{c.phone}</div>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <div className={s.stat}>{c.bookings.length}</div>
                    <div className={s.statSub}>{c.bookings.filter(b => b.status === 'completed').length} completed</div>
                  </Td>
                  <Td><span className={s.stat}>{fmtAMD(c.totalSpend)}</span></Td>
                  <Td><span className={s.lastDate}>{fmtDateTime(c.lastVisit)}</span></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      {/* Client detail drawer */}
      {selectedClient && (
        <Drawer
          open
          onClose={() => setSelectedName(null)}
          title={selectedClient.name}
          subtitle={selectedClient.phone}
        >
          <div className={s.drawerSection}>
            <div className={s.drawerLabel}>Stats</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 4 }}>
              {[
                { label: 'Visits',     value: selectedClient.bookings.length },
                { label: 'Completed',  value: selectedClient.bookings.filter(b => b.status === 'completed').length },
                { label: 'Total spent', value: fmtAMD(selectedClient.totalSpend) },
              ].map(stat => (
                <div key={stat.label} style={{ background: 'var(--bg-2)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 600 }}>{stat.value}</div>
                  <div style={{ fontSize: 10, color: 'var(--fg-2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className={s.drawerSection}>
            <div className={s.drawerLabel}>Booking history</div>
            {selectedClient.bookings
              .sort((a, b) => b.startISO.localeCompare(a.startISO))
              .map(b => {
                const svc = partner.services.find(sv => sv.id === b.serviceId)
                const sp  = partner.specialists.find(sp => sp.id === b.specialistId)
                return (
                  <div key={b.id} className={s.historyRow} onClick={() => setOpenBkId(b.id)} style={{ cursor: 'pointer' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className={s.histName}>{svc?.name ?? '—'}</div>
                      <div className={s.histSub}>{fmtDateTime(b.startISO)}{sp ? ` · ${sp.name.split(' ')[0]}` : ''}</div>
                    </div>
                    <BookingBadge status={b.status} />
                  </div>
                )
              })
            }
          </div>
        </Drawer>
      )}

      {openBkId && <BookingDrawer bookingId={openBkId} onClose={() => setOpenBkId(null)} sheet={isMobile} />}
    </div>
  )
}
