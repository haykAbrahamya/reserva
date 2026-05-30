import { useState, useEffect } from 'react'
import { Plus, Sparkles, Pencil, Clock, Scissors } from 'lucide-react'
import { useAppStore, usePartner } from '@/store/app.store'
import { Button, Table, Th, Td, Tr, Toggle, Modal, Input, Empty } from '@/components/ui'
import { fmtAMD, fmtDuration } from '@/utils/format'
import { partnersService } from '@/services/partners.service'
import type { Service } from '@/types'
import s from './Services.module.scss'

function useIsMobile() {
  const [m, setM] = useState(() => window.innerWidth <= 768)
  useEffect(() => {
    const fn = () => setM(window.innerWidth <= 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return m
}

const EMPTY_FORM = { name: '', price: '', duration: '', category: '', active: true }

export function Services() {
  const partner     = usePartner()
  const setPartners = useAppStore(st => st.setPartners)
  const isMobile    = useIsMobile()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing,   setEditing]   = useState<Service | null>(null)
  const [form,      setForm]      = useState(EMPTY_FORM)

  if (!partner) return null

  const openNew = () => { setEditing(null); setForm(EMPTY_FORM); setModalOpen(true) }
  const openEdit = (svc: Service) => {
    setEditing(svc)
    setForm({ name: svc.name, price: String(svc.price), duration: String(svc.duration), category: svc.category, active: svc.active })
    setModalOpen(true)
  }

  const handleSave = async () => {
    const data = { name: form.name, price: Number(form.price), duration: Number(form.duration), category: form.category, active: form.active }
    if (editing) await partnersService.updateService(partner.id, editing.id, data)
    else         await partnersService.createService(partner.id, data)
    setPartners(await partnersService.list())
    setModalOpen(false)
  }

  const handleToggleActive = async (svc: Service) => {
    await partnersService.updateService(partner.id, svc.id, { active: !svc.active })
    setPartners(await partnersService.list())
  }

  // Group by category for mobile
  const grouped = partner.services.reduce<Record<string, Service[]>>((acc, svc) => {
    const cat = svc.category || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(svc)
    return acc
  }, {})

  return (
    <div className={s.page}>
      <div className={s.head}>
        <div>
          <h1 className={s.h1}>Services</h1>
          <p className={s.sub}>{partner.name} · {partner.services.length} service{partner.services.length !== 1 ? 's' : ''}</p>
        </div>
        <Button variant="accent" onClick={openNew}><Plus size={14} /> Add service</Button>
      </div>

      {partner.services.length === 0 ? (
        <Empty icon={Sparkles} title="No services yet" description="Add your first service to start taking bookings."
          action={<Button variant="accent" onClick={openNew}><Plus size={14} /> Add service</Button>}
        />
      ) : isMobile ? (
        /* ── Mobile: grouped cards ── */
        <div className={s.groupList}>
          {Object.entries(grouped).map(([cat, svcs]) => (
            <div key={cat}>
              <div className={s.groupLabel}>{cat}</div>
              <div className={s.cardList}>
                {svcs.map(svc => (
                  <div key={svc.id} className={s.svcCard} onClick={() => openEdit(svc)}>
                    <div className={s.svcIconWrap}>
                      <Scissors size={18} />
                    </div>
                    <div className={s.svcCardBody}>
                      <div className={s.svcCardName}>{svc.name}</div>
                      <div className={s.svcCardMeta}>
                        <Clock size={11} style={{ display: 'inline', marginRight: 3, verticalAlign: 'middle' }} />
                        {fmtDuration(svc.duration)}
                      </div>
                    </div>
                    <div className={s.svcCardRight}>
                      <span className={s.svcCardPrice}>{fmtAMD(svc.price)}</span>
                      <Toggle
                        checked={svc.active}
                        onChange={e => { e; handleToggleActive(svc) }}
                        disabled={false}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ── Desktop: table ── */
        <div className={s.tableWrap}>
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Category</Th>
                <Th>Duration</Th>
                <Th>Price</Th>
                <Th>Active</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {partner.services.map(svc => (
                <Tr key={svc.id}>
                  <Td><span className={s.svcName}>{svc.name}</span></Td>
                  <Td><span className={s.category}>{svc.category}</span></Td>
                  <Td><span className={s.duration}>{fmtDuration(svc.duration)}</span></Td>
                  <Td><span className={s.price}>{fmtAMD(svc.price)}</span></Td>
                  <Td><Toggle checked={svc.active} onChange={() => handleToggleActive(svc)} /></Td>
                  <Td>
                    <Button variant="ghost" size="sm" icon onClick={e => { e.stopPropagation(); openEdit(svc) }}>
                      <Pencil size={13} />
                    </Button>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit service' : 'New service'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="accent" onClick={handleSave}>Save service</Button>
          </>
        }
      >
        <div className={s.formGrid}>
          <div className={s.formFull}>
            <Input label="Service name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Haircut" />
          </div>
          <Input label="Price (AMD)" type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="5000" />
          <Input label="Duration (min)" type="number" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} placeholder="30" />
          <div className={s.formFull}>
            <Input label="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Hair" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Toggle checked={form.active} onChange={v => setForm(f => ({ ...f, active: v }))} />
            <span style={{ fontSize: 13 }}>Active</span>
          </div>
        </div>
      </Modal>
    </div>
  )
}
