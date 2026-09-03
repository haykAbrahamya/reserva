import { useState } from 'react'
import { MapPin, Plus, Pencil, Trash2, Phone, Clock } from 'lucide-react'
import { useMemo } from 'react'
import { usePartner } from '@/store/app.store'
import { useResource } from '@/store/useResource'
import { Button, Modal, Input, Select, Empty, TimePicker, Toggle, useToast } from '@/components/ui'
import { partnersService } from '@/services/partners.service'
import { areasService } from '@/services/areas.service'
import { errorMessage } from '@/utils/errors'
import {
  DAY_KEYS, DEFAULT_LOCATION_HOURS, everyDaySchedule, exceptSundaySchedule,
  summarizeHours, dayOf, type DayKey,
} from '@/utils/locationHours'
import { MapPicker } from '@/components/maps/MapPicker/MapPicker'
import { mapsEnabled } from '@/lib/googleMaps'
import { I18nField } from '@/components/i18n/I18nField/I18nField'
import { useI18n } from '@/i18n'
import { useLocalized } from '@/i18n/useLocalized'
import { useSpotlight } from '@/components/onboarding/useSpotlight'
import { notifyProfileUpdated } from '@/components/onboarding/useProfileCompletion'
import type { Location, LocalizedText, WeekSchedule, WorkingDay } from '@/types'
import s from './Locations.module.scss'

interface LocationForm {
  name: string
  /** Per-language overrides for the branch name (null = base only). */
  nameI18n: LocalizedText | null
  address: string
  phone: string
  hours: WeekSchedule
  lat: number | null
  lng: number | null
  /** Structured place from the platform catalog; '' = not set yet. */
  areaKey: string
}
const EMPTY_FORM: LocationForm = {
  name: '', nameI18n: null, address: '', phone: '', hours: DEFAULT_LOCATION_HOURS as WeekSchedule,
  lat: null, lng: null, areaKey: '',
}

export function Locations() {
  const partner     = usePartner()
  const toast       = useToast()
  const { t, tp }   = useI18n()
  // Resolves a catalog name for the current UI language (shared helper, also
  // used by the vacancies pages).
  const loc = useLocalized()
  useSpotlight()

  // Branches are few per partner — load them all as cards, no pagination.
  const { data: locations, reload } = useResource(
    () => partnersService.listLocations(),
    [],
    [],
  )

  // The area catalog: small, changes rarely, and needed only by this modal.
  const { data: areaTree } = useResource(() => areasService.catalog(), [], [])

  const [modalOpen,   setModalOpen]   = useState(false)
  const [editing,     setEditing]     = useState<Location | null>(null)
  const [form,        setForm]        = useState(EMPTY_FORM)
  const [confirmDel,  setConfirmDel]  = useState<Location | null>(null)
  const [saving,      setSaving]      = useState(false)
  const [errs,        setErrs]        = useState<Record<string, string>>({})

  if (!partner) return null

  const total = locations.length
  // A solo pro has exactly one location (auto-provisioned) — they only ever edit
  // it, never add or delete. Hide those affordances and present it as "your
  // address" rather than a branch list.
  const isSingle = partner.kind === 'single'

  /**
   * Selectable places, flattened from the tree.
   *
   * A region is a grouping, not an address — you cannot put a chair in
   * "Shirak" — so only cities and districts are offered, each labelled with its
   * parent so "Arabkir" is unambiguous (there is an "Arabkir Branch" in
   * Vanadzor). Aliases ride along as hidden `keywords`, so typing «Դավթաշեն»,
   * «Давташен» or even "leninakan" finds the right row.
   */
  const areaOptions = useMemo(
    () =>
      areaTree.flatMap((top) => {
        const rows = top.children.length > 0 ? top.children : [top]
        return rows.map((a) => ({
          value: a.key,
          label: loc(a.name, a.nameI18n),
          sub: a.key === top.key ? undefined : loc(top.name, top.nameI18n),
          keywords: [
            a.key, a.name, top.name,
            a.nameI18n?.hy, a.nameI18n?.ru, a.nameI18n?.en,
            top.nameI18n?.hy, top.nameI18n?.ru, top.nameI18n?.en,
            ...a.aliases,
          ].filter((v): v is string => !!v),
        }))
      }),
    [areaTree, loc],
  )

  const openNew = () => { setEditing(null); setForm(EMPTY_FORM); setErrs({}); setModalOpen(true) }
  const openEdit = (loc: Location) => {
    setEditing(loc)
    setErrs({})
    setForm({
      name: loc.name, nameI18n: loc.nameI18n ?? null, address: loc.address, phone: loc.phone,
      hours: loc.hours ?? DEFAULT_LOCATION_HOURS,
      lat: loc.lat ?? null, lng: loc.lng ?? null,
      areaKey: loc.areaKey ?? '',
    })
    setModalOpen(true)
  }

  const updateDay = (key: DayKey, patch: Partial<WorkingDay>) =>
    setForm(f => ({ ...f, hours: { ...f.hours, [key]: { ...dayOf(f.hours, key), ...patch } } }))

  const handleSave = async () => {
    if (saving) return
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = t('errors.required')
    if (!form.address.trim()) e.address = t('errors.required')
    if (!editing && !form.areaKey) e.areaKey = t('errors.required')
    setErrs(e)
    if (Object.keys(e).length) { toast(t('errors.fixFields')); return }
    setSaving(true)
    try {
      const payload = { ...form, areaKey: form.areaKey || null }
      if (editing) await partnersService.updateLocation(editing.id, payload)
      else await partnersService.createLocation(payload)
      await reload()
      notifyProfileUpdated()
      toast(editing ? t('locations.toast.updated') : t('locations.toast.added'))
      setErrs({})
      setModalOpen(false)
    } catch (err) {
      toast(errorMessage(err, t))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDel) return
    try {
      await partnersService.deleteLocation(confirmDel.id)
    } catch (err) {
      toast(errorMessage(err, t))
      return
    }
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
        {!isSingle && (
          <span data-spotlight="addLocation" style={{ display: 'inline-flex' }}>
            <Button variant="accent" onClick={openNew}><Plus size={14} /> {t('locations.addLocation')}</Button>
          </span>
        )}
      </div>

      {total === 0 && !isSingle ? (
        <Empty
          icon={MapPin}
          title={t('locations.emptyTitle')}
          description={t('locations.emptyDesc')}
          action={<span data-spotlight="addLocation" style={{ display: 'inline-flex' }}><Button variant="accent" onClick={openNew}><Plus size={14} /> {t('locations.addLocation')}</Button></span>}
        />
      ) : (
        <div className={s.grid}>
          {locations.map((loc, i) => (
            <div
              key={loc.id}
              className={s.card}
              // For singles, the sole location is the "address" onboarding target.
              {...(isSingle && i === 0 ? { 'data-spotlight': 'addLocation' } : {})}
            >
              <div className={s.actions}>
                <Button variant="ghost" size="sm" icon onClick={() => openEdit(loc)}>
                  <Pencil size={13} />
                </Button>
                {!isSingle && (
                  <Button variant="ghost" size="sm" icon onClick={() => setConfirmDel(loc)}>
                    <Trash2 size={13} />
                  </Button>
                )}
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

      {/* Add / edit modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? t('locations.modal.editTitle') : t('locations.modal.newTitle')}
        subtitle={editing ? undefined : t('locations.modal.newSubtitle')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button>
            <Button variant="accent" disabled={saving} onClick={handleSave}>
              {saving ? t('common.saving') : editing ? t('common.saveChanges') : t('locations.modal.addLocation')}
            </Button>
          </>
        }
      >
        <div className={s.formGrid}>
          <I18nField
            label={t('locations.modal.nameLabel')}
            value={form.name}
            onChange={v => { setForm(f => ({ ...f, name: v })); setErrs(x => ({ ...x, name: '' })) }}
            i18n={form.nameI18n}
            onI18nChange={next => setForm(f => ({ ...f, nameI18n: next }))}
            placeholder={t('locations.modal.namePlaceholder')}
            error={errs.name || undefined}
          />
          {/* Address. When Google Maps is configured, the MapPicker IS the address
              input (search → pin → auto-filled, editable line) — a single source,
              no duplicate field. Without a key, fall back to a plain text input. */}
          {mapsEnabled ? (
            <div className={s.mapField}>
              <label className={s.mapLabel}>{t('locations.modal.mapLabel')}</label>
              <MapPicker
                lat={form.lat}
                lng={form.lng}
                address={form.address}
                onAddressChange={(address) => setForm(f => ({ ...f, address }))}
                onChange={({ lat, lng, address }) =>
                  setForm(f => ({
                    ...f,
                    lat,
                    lng,
                    // Picking a place / moving the pin always refreshes the address
                    // (the owner can still edit it afterwards).
                    address: address ?? f.address,
                  }))
                }
              />
            </div>
          ) : (
            <Input
              label={t('locations.modal.addressLabel')}
              value={form.address}
              onChange={e => { setForm(f => ({ ...f, address: e.target.value })); setErrs(x => ({ ...x, address: '' })) }}
              placeholder={t('locations.modal.addressPlaceholder')}
              error={errs.address || undefined}
            />
          )}

          <div className={s.areaField}>
            <label className={s.areaLabel}>{t('locations.modal.areaLabel')}</label>
            <Select
              value={form.areaKey}
              onChange={(v) => { setForm(f => ({ ...f, areaKey: v })); setErrs(x => ({ ...x, areaKey: '' })) }}
              options={areaOptions}
              placeholder={t('locations.modal.areaPlaceholder')}
              searchable
              searchPlaceholder={t('locations.modal.areaSearch')}
            />
            {errs.areaKey
              ? <span className={s.areaError}>{errs.areaKey}</span>
              : <span className={s.areaHint}>{t('locations.modal.areaHint')}</span>}
          </div>

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
