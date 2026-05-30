import { useState, useEffect } from 'react'
import { Plus, User, Pencil, MapPin } from 'lucide-react'
import { useAppStore, usePartner } from '@/store/app.store'
import { Button, Table, Th, Td, Tr, Toggle, Modal, Input, Select, Avatar, Empty, Badge } from '@/components/ui'
import { SpecialistDashboard } from '@/components/specialists/SpecialistDashboard/SpecialistDashboard'
import { partnersService } from '@/services/partners.service'
import type { Specialist } from '@/types'
import s from './Specialists.module.scss'

function useIsMobile() {
  const [m, setM] = useState(() => window.innerWidth <= 768)
  useEffect(() => {
    const fn = () => setM(window.innerWidth <= 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return m
}

const EMPTY_FORM = { name: '', title: '', locationId: '', phone: '', active: true, services: [] as string[] }

export function Specialists() {
  const partner     = usePartner()
  const setPartners = useAppStore(st => st.setPartners)
  const isMobile    = useIsMobile()

  const [modalOpen,   setModalOpen]   = useState(false)
  const [editing,     setEditing]     = useState<Specialist | null>(null)
  const [form,        setForm]        = useState(EMPTY_FORM)
  const [dashboardSp, setDashboardSp] = useState<Specialist | null>(null)

  if (!partner) return null

  const openNew = () => {
    setEditing(null)
    setForm({ ...EMPTY_FORM, locationId: partner.locations[0]?.id ?? '' })
    setModalOpen(true)
  }

  const openEdit = (sp: Specialist) => {
    setEditing(sp)
    setForm({ name: sp.name, title: sp.title, locationId: sp.locationId, phone: sp.phone, active: sp.active, services: sp.services })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (editing) await partnersService.updateSpecialist(partner.id, editing.id, form)
    else         await partnersService.createSpecialist(partner.id, form)
    setPartners(await partnersService.list())
    setModalOpen(false)
  }

  const toggleSvc = (id: string) =>
    setForm(f => ({ ...f, services: f.services.includes(id) ? f.services.filter(x => x !== id) : [...f.services, id] }))

  return (
    <div className={s.page}>
      <div className={s.head}>
        <div>
          <h1 className={s.h1}>Specialists</h1>
          <p className={s.sub}>{partner.name} · {partner.specialists.length} staff</p>
        </div>
        <Button variant="accent" onClick={openNew}><Plus size={14} /> Add specialist</Button>
      </div>

      {partner.specialists.length === 0 ? (
        <Empty icon={User} title="No specialists yet" description="Add your first team member."
          action={<Button variant="accent" onClick={openNew}><Plus size={14} /> Add specialist</Button>}
        />
      ) : isMobile ? (
        /* ── Mobile: cards ── */
        <div className={s.cardList}>
          {partner.specialists.map(sp => {
            const loc = partner.locations.find(l => l.id === sp.locationId)
            const visibleSvcs = sp.services.slice(0, 3)
            const extra = sp.services.length - visibleSvcs.length
            return (
              <div key={sp.id} className={s.spCard} onClick={() => setDashboardSp(sp)}>
                <div className={s.spCardTop}>
                  <Avatar name={sp.name} color={partner.accent} size="lg" />
                  <div className={s.spCardInfo}>
                    <div className={s.spCardName}>{sp.name}</div>
                    <div className={s.spCardTitle}>{sp.title}</div>
                  </div>
                  <div className={s.spCardRight}>
                    <Badge variant={sp.active ? 'active' : 'inactive'} />
                    <button className={s.spCardEditBtn} onClick={e => { e.stopPropagation(); openEdit(sp) }}>
                      <Pencil size={12} /> Edit
                    </button>
                  </div>
                </div>
                <div className={s.spCardMeta}>
                  <div className={s.spCardLoc}>
                    <MapPin size={12} style={{ flexShrink: 0 }} />
                    {loc?.name ?? '—'}
                  </div>
                  <div className={s.spCardSvcs}>
                    {visibleSvcs.map(sid => {
                      const svc = partner.services.find(sv => sv.id === sid)
                      return svc ? <span key={sid} className={s.svcPill}>{svc.name}</span> : null
                    })}
                    {extra > 0 && <span className={[s.svcPill, s.more].join(' ')}>+{extra} more</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* ── Desktop: table ── */
        <div className={s.tableWrap}>
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Location</Th>
                <Th>Services</Th>
                <Th>Active</Th>
                <Th></Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {partner.specialists.map(sp => {
                const loc = partner.locations.find(l => l.id === sp.locationId)
                return (
                  <Tr key={sp.id} onClick={() => setDashboardSp(sp)}>
                    <Td>
                      <div className={s.spInfo}>
                        <Avatar name={sp.name} color={partner.accent} size="md" />
                        <div>
                          <div className={s.spName}>{sp.name}</div>
                          <div className={s.spTitle}>{sp.title}</div>
                        </div>
                      </div>
                    </Td>
                    <Td>{loc?.name ?? '—'}</Td>
                    <Td>
                      <div className={s.services}>
                        {sp.services.slice(0, 3).map(sid => {
                          const svc = partner.services.find(sv => sv.id === sid)
                          return svc ? <span key={sid} className={s.svcTag}>{svc.name}</span> : null
                        })}
                        {sp.services.length > 3 && <span className={s.svcTag}>+{sp.services.length - 3}</span>}
                      </div>
                    </Td>
                    <Td><Badge variant={sp.active ? 'active' : 'inactive'} /></Td>
                    <Td>
                      <Button variant="ghost" size="sm" icon onClick={e => { e.stopPropagation(); openEdit(sp) }}>
                        <Pencil size={13} />
                      </Button>
                    </Td>
                    <Td>
                      <span className={s.viewHint}>View stats →</span>
                    </Td>
                  </Tr>
                )
              })}
            </tbody>
          </Table>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit specialist' : 'New specialist'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="accent" onClick={handleSave}>Save</Button>
          </>
        }
      >
        <div className={s.formGrid}>
          <div className={s.formFull}>
            <Input label="Full name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Anush Petrosyan" />
          </div>
          <Input label="Title / role" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Senior barber" />
          <Input label="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+374 91 …" />
          <div className={s.formFull}>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-1)', display: 'block', marginBottom: 6 }}>Location</label>
            <Select
              value={form.locationId}
              onChange={v => setForm(f => ({ ...f, locationId: v }))}
              options={partner.locations.map(l => ({ value: l.id, label: l.name }))}
            />
          </div>
          <div className={s.formFull}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-1)', marginBottom: 8 }}>Services</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {partner.services.map(svc => (
                <button
                  key={svc.id}
                  type="button"
                  onClick={() => toggleSvc(svc.id)}
                  style={{
                    padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 500,
                    cursor: 'pointer', border: '1px solid', transition: 'all .15s',
                    background: form.services.includes(svc.id) ? 'var(--accent-soft)' : 'var(--bg-2)',
                    borderColor: form.services.includes(svc.id) ? 'var(--accent)' : 'var(--line-2)',
                    color: form.services.includes(svc.id) ? 'var(--fg-0)' : 'var(--fg-1)',
                  }}
                >
                  {svc.name}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Toggle checked={form.active} onChange={v => setForm(f => ({ ...f, active: v }))} />
            <span style={{ fontSize: 13 }}>Active</span>
          </div>
        </div>
      </Modal>

      {/* Specialist dashboard — drawer on desktop, full page on mobile */}
      {dashboardSp && (
        <SpecialistDashboard
          specialist={dashboardSp}
          onClose={() => setDashboardSp(null)}
        />
      )}
    </div>
  )
}
