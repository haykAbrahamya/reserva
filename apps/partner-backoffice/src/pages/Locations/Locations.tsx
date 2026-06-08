import { useState } from 'react'
import { MapPin, Plus, Pencil, Trash2, Phone, Clock } from 'lucide-react'
import { usePartner } from '@/store/app.store'
import { useResource } from '@/store/useResource'
import { Button, Modal, Input, Empty, TimePicker, Toggle, Pagination, useToast } from '@/components/ui'
import { partnersService } from '@/services/partners.service'
import {
  DAY_KEYS, DEFAULT_LOCATION_HOURS, everyDaySchedule, exceptSundaySchedule,
  summarizeHours, dayOf, type DayKey,
} from '@/utils/locationHours'
import { useI18n } from '@/i18n'
import type { Location, WeekSchedule, WorkingDay } from '@/types'
import s from './Locations.module.scss'

const EMPTY_FORM = { name: '', address: '', phone: '', hours: DEFAULT_LOCATION_HOURS as WeekSchedule }

export function Locations() {
  const partner     = usePartner()
  const toast       = useToast()
  const { t, tp }   = useI18n()

  const [page,     setPage]     = useState(1)
  const [pageSize, setPageSize] = useState(5)

  // Server-paginated branches (always fresh).
  const { data: result, reload } = useResource(
    () => partnersService.listLocationsPaged({ page, pageSize }),
    [page, pageSize],
  )

  const [modalOpen,   setModalOpen]   = useState(false)
  const [editing,     setEditing]     = useState<Location | null>(null)
  const [form,        setForm]        = useState(EMPTY_FORM)
  const [confirmDel,  setConfirmDel]  = useState<Location | null>(null)
  const [saving,      setSaving]      = useState(false)

  if (!partner) return null

  const locations  = result?.items ?? []
  const total      = result?.total ?? 0
  const pageCount  = result?.pageCount ?? 1
  const from       = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to         = Math.min(page * pageSize, total)
  const changePageSize = (n: number) => { setPageSize(n); setPage(1) }

  const openNew = () => { setEditing(null); setForm(EMPTY_FORM); setModalOpen(true) }
  const openEdit = (loc: Location) => {
    setEditing(loc)
    setForm({
      name: loc.name, address: loc.address, phone: loc.phone,
      hours: loc.hours ?? DEFAULT_LOCATION_HOURS,
    })
    setModalOpen(true)
  }

  const updateDay = (key: DayKey, patch: Partial<WorkingDay>) =>
    setForm(f => ({ ...f, hours: { ...f.hours, [key]: { ...dayOf(f.hours, key), ...patch } } }))

  const canSave = form.name.trim() !== '' && form.address.trim() !== ''

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    if (editing) await partnersService.updateLocation(editing.id, form)
    else await partnersService.createLocation(form)
    await reload()
    toast(editing ? t('locations.toast.updated') : t('locations.toast.added'))
    setSaving(false)
    setModalOpen(false)
  }

  const handleDelete = async () => {
    if (!confirmDel) return
    await partnersService.deleteLocation(confirmDel.id)
    await reload()
    toast(t('locations.toast.removed'))
    setConfirmDel(null)
  }

  return (
    <div className={s.page}>
      <div className={s.head}>
        <div>
          <h1 className={s.h1}>{t('locations.title')}</h1>
          <p className={s.sub}>
            {tp('locations.subtitle', total, { name: partner.name })}
          </p>
        </div>
        <Button variant="accent" onClick={openNew}><Plus size={14} /> {t('locations.addLocation')}</Button>
      </div>

      {total === 0 ? (
        <Empty
          icon={MapPin}
          title={t('locations.emptyTitle')}
          description={t('locations.emptyDesc')}
          action={<Button variant="accent" onClick={openNew}><Plus size={14} /> {t('locations.addLocation')}</Button>}
        />
      ) : (
        <div className={s.grid}>
          {locations.map(loc => (
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
                  {loc.hours && (
                    <div className={s.metaRow}>
                      <Clock size={12} />
                      {summarizeHours(loc.hours, (k) => t(`hours.days.${k}`), t('locations.closed'))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {total > 0 && (
        <Pagination
          page={page}
          pageCount={pageCount}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={changePageSize}
          pageSizeLabel={t('pagination.perPage')}
          summary={t('pagination.summary', { from, to, total })}
        />
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

          {/* Working hours */}
          <div className={s.hoursSection}>
            <div className={s.hoursHead}>
              <span className={s.hoursLabel}>{t('locations.modal.hoursLabel')}</span>
              <div className={s.presets}>
                <button type="button" className={s.preset} onClick={() => setForm(f => ({ ...f, hours: everyDaySchedule() }))}>
                  {t('locations.modal.presetEveryDay')}
                </button>
                <button type="button" className={s.preset} onClick={() => setForm(f => ({ ...f, hours: exceptSundaySchedule() }))}>
                  {t('locations.modal.presetExceptSun')}
                </button>
              </div>
            </div>

            <div className={s.dayRows}>
              {DAY_KEYS.map(key => {
                const day = dayOf(form.hours, key)
                return (
                  <div key={key} className={[s.dayRow, !day.enabled ? s.dayDisabled : ''].filter(Boolean).join(' ')}>
                    <span className={s.dayName}>{t(`hours.days.${key}`)}</span>
                    <div className={s.dayTimes}>
                      <TimePicker value={day.start} step={15} disabled={!day.enabled} onChange={v => updateDay(key, { start: v })} />
                      <span className={s.daySep}>–</span>
                      <TimePicker value={day.end} step={15} disabled={!day.enabled} onChange={v => updateDay(key, { end: v })} />
                    </div>
                    <Toggle checked={day.enabled} onChange={v => updateDay(key, { enabled: v })} />
                  </div>
                )
              })}
            </div>
          </div>
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
