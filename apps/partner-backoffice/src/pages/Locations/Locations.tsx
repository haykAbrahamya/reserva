import { useState } from 'react'
import { MapPin, Plus, Pencil, Trash2, Phone } from 'lucide-react'
import { useAppStore, usePartner } from '@/store/app.store'
import { Button, Modal, Input, Empty, useToast } from '@/components/ui'
import { partnersService } from '@/services/partners.service'
import { useI18n } from '@/i18n'
import type { Location } from '@/types'
import s from './Locations.module.scss'

const EMPTY_FORM = { name: '', address: '', phone: '' }

export function Locations() {
  const partner     = usePartner()
  const setPartners = useAppStore(st => st.setPartners)
  const toast       = useToast()
  const { t, tp }   = useI18n()

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
      toast(t('locations.toast.updated'))
    } else {
      await partnersService.createLocation(partner.id, form)
      toast(t('locations.toast.added'))
    }
    setPartners(await partnersService.list())
    setSaving(false)
    setModalOpen(false)
  }

  const handleDelete = async () => {
    if (!confirmDel) return
    await partnersService.deleteLocation(partner.id, confirmDel.id)
    setPartners(await partnersService.list())
    toast(t('locations.toast.removed'))
    setConfirmDel(null)
  }

  return (
    <div className={s.page}>
      <div className={s.head}>
        <div>
          <h1 className={s.h1}>{t('locations.title')}</h1>
          <p className={s.sub}>
            {tp('locations.subtitle', partner.locations.length, { name: partner.name })}
          </p>
        </div>
        <Button variant="accent" onClick={openNew}><Plus size={14} /> {t('locations.addLocation')}</Button>
      </div>

      {partner.locations.length === 0 ? (
        <Empty
          icon={MapPin}
          title={t('locations.emptyTitle')}
          description={t('locations.emptyDesc')}
          action={<Button variant="accent" onClick={openNew}><Plus size={14} /> {t('locations.addLocation')}</Button>}
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
        title={editing ? t('locations.modal.editTitle') : t('locations.modal.newTitle')}
        subtitle={editing ? undefined : t('locations.modal.newSubtitle')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button>
            <Button variant="accent" disabled={!canSave || saving} onClick={handleSave}>
              {saving ? t('common.saving') : editing ? t('common.saveChanges') : t('locations.modal.addLocation')}
            </Button>
          </>
        }
      >
        <div className={s.formGrid}>
          <Input
            label={t('locations.modal.nameLabel')}
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder={t('locations.modal.namePlaceholder')}
          />
          <Input
            label={t('locations.modal.addressLabel')}
            value={form.address}
            onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
            placeholder={t('locations.modal.addressPlaceholder')}
          />
          <Input
            label={t('locations.modal.phoneLabel')}
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            placeholder={t('locations.modal.phonePlaceholder')}
          />
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        title={t('locations.delete.title')}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDel(null)}>{t('common.cancel')}</Button>
            <Button variant="danger" onClick={handleDelete}>{t('common.remove')}</Button>
          </>
        }
      >
        <p style={{ fontSize: 14, color: 'var(--fg-1)', margin: 0, lineHeight: 1.5 }}>
          {(() => {
            const [before, after] = t('locations.delete.body').split('{name}')
            return <>{before}<strong>{confirmDel?.name}</strong>{after}</>
          })()}
        </p>
      </Modal>
    </div>
  )
}
