import { useState } from 'react'
import { MapPin, Plus, Pencil, Trash2, Phone } from 'lucide-react'
import { useAppStore, usePartner } from '@/store/app.store'
import { Button, Modal, Input, Empty, useToast } from '@/components/ui'
import { partnersService } from '@/services/partners.service'
import type { Location } from '@/types'
import s from './Locations.module.scss'

const EMPTY_FORM = { name: '', address: '', phone: '' }

export function Locations() {
  const partner     = usePartner()
  const setPartners = useAppStore(st => st.setPartners)
  const toast       = useToast()

  const [modalOpen,   setModalOpen]   = useState(false)
  const [editing,     setEditing]     = useState<Location | null>(null)
  const [form,        setForm]        = useState(EMPTY_FORM)
  const [confirmDel,  setConfirmDel]  = useState<Location | null>(null)
  const [saving,      setSaving]      = useState(false)

  if (!partner) return null

  const openNew = () => { setEditing(null); setForm(EMPTY_FORM); setModalOpen(true) }
  const openEdit = (loc: Location) => {
    setEditing(loc)
    setForm({ name: loc.name, address: loc.address, phone: loc.phone })
    setModalOpen(true)
  }

  const canSave = form.name.trim() !== '' && form.address.trim() !== ''

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    if (editing) {
      await partnersService.updateLocation(partner.id, editing.id, form)
      toast('Location updated')
    } else {
      await partnersService.createLocation(partner.id, form)
      toast('Location added')
    }
    setPartners(await partnersService.list())
    setSaving(false)
    setModalOpen(false)
  }

  const handleDelete = async () => {
    if (!confirmDel) return
    await partnersService.deleteLocation(partner.id, confirmDel.id)
    setPartners(await partnersService.list())
    toast('Location removed')
    setConfirmDel(null)
  }

  return (
    <div className={s.page}>
      <div className={s.head}>
        <div>
          <h1 className={s.h1}>Locations</h1>
          <p className={s.sub}>
            {partner.name} · {partner.locations.length} branch{partner.locations.length !== 1 ? 'es' : ''}
          </p>
        </div>
        <Button variant="accent" onClick={openNew}><Plus size={14} /> Add location</Button>
      </div>

      {partner.locations.length === 0 ? (
        <Empty
          icon={MapPin}
          title="No locations yet"
          description="Add your first branch so clients can book a place."
          action={<Button variant="accent" onClick={openNew}><Plus size={14} /> Add location</Button>}
        />
      ) : (
        <div className={s.grid}>
          {partner.locations.map(loc => (
            <div key={loc.id} className={s.card}>
              <div className={s.actions}>
                <Button variant="ghost" size="sm" icon onClick={() => openEdit(loc)}>
                  <Pencil size={13} />
                </Button>
                <Button variant="ghost" size="sm" icon onClick={() => setConfirmDel(loc)}>
                  <Trash2 size={13} />
                </Button>
              </div>

              <div className={s.cardTop}>
                <div className={s.iconWrap}>
                  <MapPin size={17} />
                </div>
                <div className={s.cardBody}>
                  <div className={s.name}>{loc.name}</div>
                  <div className={s.metaRow}>
                    <MapPin size={12} />
                    {loc.address}
                  </div>
                  {loc.phone && (
                    <div className={s.metaRow}>
                      <Phone size={12} />
                      {loc.phone}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / edit modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit location' : 'New location'}
        subtitle={editing ? undefined : 'Add a new branch for this salon'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="accent" disabled={!canSave || saving} onClick={handleSave}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Add location'}
            </Button>
          </>
        }
      >
        <div className={s.formGrid}>
          <Input
            label="Branch name"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Arabkir"
          />
          <Input
            label="Address"
            value={form.address}
            onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
            placeholder="e.g. 34 Komitas Ave, Yerevan"
          />
          <Input
            label="Phone"
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            placeholder="+374 10 …"
          />
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        title="Remove location?"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDel(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete}>Remove</Button>
          </>
        }
      >
        <p style={{ fontSize: 14, color: 'var(--fg-1)', margin: 0, lineHeight: 1.5 }}>
          Are you sure you want to remove <strong>{confirmDel?.name}</strong>? Specialists assigned
          to this branch will need to be reassigned.
        </p>
      </Modal>
    </div>
  )
}
