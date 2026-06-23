import { useState, useEffect } from 'react'
import { Plus, Sparkles, Pencil, Clock, RotateCcw, X, Users, Waves } from 'lucide-react'
import { usePartner } from '@/store/app.store'
import { useResource } from '@/store/useResource'
import { Button, Table, Th, Td, Tr, Toggle, Modal, Input, Empty, Pagination, useToast } from '@/components/ui'
import { fmtAMD, fmtDuration } from '@/utils/format'
import { partnersService } from '@/services/partners.service'
import { errorMessage } from '@/utils/errors'
import { useI18n } from '@/i18n'
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

const EMPTY_FORM = {
  name: '', price: '', duration: '', category: '', active: true,
  repeatMonths: '', repeatDays: '',
  // Facility/entry service (spa): no specialist, N concurrent spots per slot.
  requiresSpecialist: true, capacity: '1',
}

// Repeat period is stored as TOTAL DAYS. The form edits months + days; 1 month
// is treated as 30 days for entry convenience.
const DAYS_PER_MONTH = 30
function toTotalDays(months: string, days: string): number | null {
  const m = Number(months) || 0
  const d = Number(days) || 0
  const total = m * DAYS_PER_MONTH + d
  return total > 0 ? total : null
}
function fromTotalDays(total?: number | null): { repeatMonths: string; repeatDays: string } {
  if (!total || total <= 0) return { repeatMonths: '', repeatDays: '' }
  const m = Math.floor(total / DAYS_PER_MONTH)
  const d = total % DAYS_PER_MONTH
  return { repeatMonths: m ? String(m) : '', repeatDays: d ? String(d) : '' }
}
/** Compact human label for a total-days repeat period, e.g. "1 mo 10 d". */
function repeatLabel(total?: number | null): string {
  if (!total || total <= 0) return '—'
  const m = Math.floor(total / DAYS_PER_MONTH)
  const d = total % DAYS_PER_MONTH
  return [m ? `${m} mo` : '', d ? `${d} d` : ''].filter(Boolean).join(' ')
}

export function Services() {
  const partner     = usePartner()
  const isMobile    = useIsMobile()
  const { t, tp }   = useI18n()
  const toast       = useToast()

  const [page,     setPage]     = useState(1)
  const [pageSize, setPageSize] = useState(5)

  // Server-side paginated list (always fresh; back end does the slicing).
  const { data: result, reload } = useResource(
    () => partnersService.listServicesPaged({ page, pageSize, includeInactive: true }),
    [page, pageSize],
  )

  const [modalOpen, setModalOpen] = useState(false)
  const [editing,   setEditing]   = useState<Service | null>(null)
  const [form,      setForm]      = useState(EMPTY_FORM)
  const [errs,      setErrs]      = useState<Record<string, string>>({})
  const [saving,    setSaving]    = useState(false)
  // Repeat-period editor is collapsed behind a button until the user opens it
  // (or it auto-opens when editing a service that already has a period set).
  const [repeatOpen, setRepeatOpen] = useState(false)

  if (!partner) return null

  const services  = result?.items ?? []
  const total     = result?.total ?? 0
  const pageCount = result?.pageCount ?? 1
  const from      = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to        = Math.min(page * pageSize, total)
  const changePageSize = (n: number) => { setPageSize(n); setPage(1) }

  const openNew = () => { setEditing(null); setForm(EMPTY_FORM); setRepeatOpen(false); setErrs({}); setModalOpen(true) }
  const openEdit = (svc: Service) => {
    setEditing(svc)
    setErrs({})
    setForm({
      name: svc.name, price: String(svc.price), duration: String(svc.duration),
      category: svc.category, active: svc.active,
      requiresSpecialist: svc.requiresSpecialist ?? true,
      capacity: String(svc.capacity ?? 1),
      ...fromTotalDays(svc.repeatEveryDays),
    })
    setRepeatOpen(!!svc.repeatEveryDays) // auto-expand if a period already exists
    setModalOpen(true)
  }

  const clearRepeat = () => {
    setForm(f => ({ ...f, repeatMonths: '', repeatDays: '' }))
    setRepeatOpen(false)
  }

  const handleSave = async () => {
    if (saving) return
    // Local validation → inline errors.
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = t('errors.required')
    if (form.price === '' || Number(form.price) < 0 || Number.isNaN(Number(form.price))) e.price = t('errors.invalid')
    if (form.duration === '' || Number(form.duration) <= 0 || Number.isNaN(Number(form.duration))) e.duration = t('errors.invalid')
    if (!form.requiresSpecialist && (Number(form.capacity) < 1 || Number.isNaN(Number(form.capacity)))) e.capacity = t('errors.invalid')
    setErrs(e)
    if (Object.keys(e).length) { toast(t('errors.fixFields')); return }

    const data = {
      name: form.name.trim(),
      price: Number(form.price),
      duration: Number(form.duration),
      category: form.category,
      active: form.active,
      repeatEveryDays: toTotalDays(form.repeatMonths, form.repeatDays),
      requiresSpecialist: form.requiresSpecialist,
      // Capacity only matters for facility services; force 1 otherwise.
      capacity: form.requiresSpecialist ? 1 : Math.max(1, Number(form.capacity) || 1),
    }
    setSaving(true)
    try {
      if (editing) await partnersService.updateService(editing.id, data)
      else await partnersService.createService(data)
      await reload()
      setModalOpen(false)
      setErrs({})
    } catch (err) {
      toast(errorMessage(err, t))
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (svc: Service) => {
    await partnersService.updateService(svc.id, { active: !svc.active })
    await reload()
  }

  // Group by category for mobile
  const grouped = services.reduce<Record<string, Service[]>>((acc, svc) => {
    const cat = svc.category || t('services.otherCategory')
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(svc)
    return acc
  }, {})

  return (
    <div className={s.page}>
      <div className={s.head}>
        <div>
          <h1 className={s.h1}>{t('services.title')}</h1>
          <p className={s.sub}>{tp('services.subtitle', total, { name: partner.name })}</p>
        </div>
        <Button variant="accent" onClick={openNew}><Plus size={14} /> {t('services.addService')}</Button>
      </div>

      {total === 0 ? (
        <Empty icon={Sparkles} title={t('services.emptyTitle')} description={t('services.emptyDesc')}
          action={<Button variant="accent" onClick={openNew}><Plus size={14} /> {t('services.addService')}</Button>}
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
                      {svc.requiresSpecialist === false ? <Waves size={18} /> : <Sparkles size={18} />}
                    </div>
                    <div className={s.svcCardBody}>
                      <div className={s.svcCardName}>{svc.name}</div>
                      <div className={s.svcCardMeta}>
                        <Clock size={11} style={{ display: 'inline', marginRight: 3, verticalAlign: 'middle' }} />
                        {fmtDuration(svc.duration)}
                        {svc.requiresSpecialist === false && (
                          <span className={s.facilityBadge}>
                            <Users size={10} /> {t('services.capacityShort', { n: svc.capacity ?? 1 })}
                          </span>
                        )}
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
          <Pagination
            page={page}
            pageCount={pageCount}
            onPageChange={setPage}
            pageSize={pageSize}
            onPageSizeChange={changePageSize}
            pageSizeLabel={t('pagination.perPage')}
            summary={t('pagination.summary', { from, to, total })}
          />
        </div>
      ) : (
        /* ── Desktop: table ── */
        <div className={s.tableWrap}>
          <Table>
            <thead>
              <tr>
                <Th>{t('services.col.name')}</Th>
                <Th>{t('services.col.category')}</Th>
                <Th>{t('services.col.duration')}</Th>
                <Th>{t('services.col.repeat')}</Th>
                <Th>{t('services.col.price')}</Th>
                <Th>{t('services.col.active')}</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {services.map(svc => (
                <Tr key={svc.id}>
                  <Td>
                    <span className={s.svcName}>{svc.name}</span>
                    {svc.requiresSpecialist === false && (
                      <span className={s.facilityBadge}>
                        <Waves size={10} /> {t('services.capacityShort', { n: svc.capacity ?? 1 })}
                      </span>
                    )}
                  </Td>
                  <Td><span className={s.category}>{svc.category}</span></Td>
                  <Td><span className={s.duration}>{fmtDuration(svc.duration)}</span></Td>
                  <Td><span className={s.repeat}>{repeatLabel(svc.repeatEveryDays)}</span></Td>
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
          <Pagination
            page={page}
            pageCount={pageCount}
            onPageChange={setPage}
            pageSize={pageSize}
            onPageSizeChange={changePageSize}
            pageSizeLabel={t('pagination.perPage')}
            summary={t('pagination.summary', { from, to, total })}
          />
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? t('services.modal.editTitle') : t('services.modal.newTitle')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button>
            <Button variant="accent" onClick={handleSave} disabled={saving}>{t('services.modal.save')}</Button>
          </>
        }
      >
        <div className={s.formGrid}>
          <div className={s.formFull}>
            <Input label={t('services.modal.nameLabel')} value={form.name} onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setErrs(x => ({ ...x, name: '' })) }} placeholder={t('services.modal.namePlaceholder')} error={errs.name || undefined} />
          </div>
          <Input label={t('services.modal.priceLabel')} type="number" value={form.price} onChange={e => { setForm(f => ({ ...f, price: e.target.value })); setErrs(x => ({ ...x, price: '' })) }} placeholder={t('services.modal.pricePlaceholder')} error={errs.price || undefined} />
          <Input label={t('services.modal.durationLabel')} type="number" value={form.duration} onChange={e => { setForm(f => ({ ...f, duration: e.target.value })); setErrs(x => ({ ...x, duration: '' })) }} placeholder={t('services.modal.durationPlaceholder')} error={errs.duration || undefined} />
          <div className={s.formFull}>
            <Input label={t('services.modal.categoryLabel')} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder={t('services.modal.categoryPlaceholder')} />
          </div>

          {/* Repeat period — collapsed behind a button until needed, so the form
              stays clean. Entered as months + days, stored as total days. */}
          <div className={s.formFull}>
            {!repeatOpen ? (
              (() => {
                const total = toTotalDays(form.repeatMonths, form.repeatDays)
                return total ? (
                  // A period is set → show a summary chip with edit + clear.
                  <div className={s.repeatSummary}>
                    <span className={s.repeatSummaryIcon}><RotateCcw size={15} /></span>
                    <div className={s.repeatSummaryBody}>
                      <span className={s.repeatSummaryLabel}>{t('services.modal.repeatLabel')}</span>
                      <span className={s.repeatSummaryValue}>{t('services.modal.repeatHint', { n: total })}</span>
                    </div>
                    <button type="button" className={s.repeatEditBtn} onClick={() => setRepeatOpen(true)}>
                      {t('common.edit')}
                    </button>
                    <button type="button" className={s.repeatClearBtn} onClick={clearRepeat} aria-label={t('common.remove')}>
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  // Nothing set → a single inviting "setup" button.
                  <button type="button" className={s.repeatSetupBtn} onClick={() => setRepeatOpen(true)}>
                    <RotateCcw size={15} /> {t('services.modal.repeatSetup')}
                  </button>
                )
              })()
            ) : (
              <div className={s.repeatPanel}>
                <div className={s.repeatPanelHead}>
                  <label className={s.repeatLabel}>{t('services.modal.repeatLabel')}</label>
                  <button type="button" className={s.repeatRemove} onClick={clearRepeat}>
                    {t('services.modal.repeatRemove')}
                  </button>
                </div>
                <div className={s.repeatHelp}>{t('services.modal.repeatHelp')}</div>
                <div className={s.repeatPresets}>
                  {[
                    { m: '', d: '15', key: '15d' },
                    { m: '', d: '25', key: '25d' },
                    { m: '1', d: '', key: '1mo' },
                    { m: '1', d: '10', key: '1mo10d' },
                    { m: '2', d: '', key: '2mo' },
                  ].map(p => {
                    const isActive = form.repeatMonths === p.m && form.repeatDays === p.d
                    return (
                      <button
                        key={p.key}
                        type="button"
                        className={[s.repeatChip, isActive ? s.repeatChipActive : ''].filter(Boolean).join(' ')}
                        onClick={() => setForm(f => ({ ...f, repeatMonths: p.m, repeatDays: p.d }))}
                      >
                        {t(`services.modal.repeatPreset.${p.key}`)}
                      </button>
                    )
                  })}
                </div>
                <div className={s.repeatInputs}>
                  <Input
                    type="number"
                    value={form.repeatMonths}
                    onChange={e => setForm(f => ({ ...f, repeatMonths: e.target.value }))}
                    placeholder="0"
                  />
                  <span className={s.repeatUnit}>{t('services.modal.months')}</span>
                  <Input
                    type="number"
                    value={form.repeatDays}
                    onChange={e => setForm(f => ({ ...f, repeatDays: e.target.value }))}
                    placeholder="0"
                  />
                  <span className={s.repeatUnit}>{t('services.modal.days')}</span>
                </div>
                <div className={s.repeatHint}>
                  {toTotalDays(form.repeatMonths, form.repeatDays)
                    ? t('services.modal.repeatHint', { n: toTotalDays(form.repeatMonths, form.repeatDays)! })
                    : t('services.modal.repeatNone')}
                </div>
              </div>
            )}
          </div>

          {/* Booking type — a person-based service needs a specialist; a
              facility/entry service (spa sauna, pool, day pass) doesn't and is
              gated by concurrent capacity instead. */}
          <div className={s.formFull}>
            <div className={s.bookingType}>
              <div className={s.bookingTypeRow}>
                <span className={s.bookingTypeIcon}>
                  {form.requiresSpecialist ? <Users size={16} /> : <Waves size={16} />}
                </span>
                <div className={s.bookingTypeBody}>
                  <span className={s.bookingTypeLabel}>{t('services.modal.requiresSpecialist')}</span>
                  <span className={s.bookingTypeHint}>
                    {form.requiresSpecialist
                      ? t('services.modal.requiresSpecialistOn')
                      : t('services.modal.requiresSpecialistOff')}
                  </span>
                </div>
                <Toggle
                  checked={form.requiresSpecialist}
                  onChange={v => setForm(f => ({ ...f, requiresSpecialist: v }))}
                />
              </div>

              {!form.requiresSpecialist && (
                <div className={s.capacityRow}>
                  <Input
                    label={t('services.modal.capacityLabel')}
                    type="number"
                    min={1}
                    max={200}
                    value={form.capacity}
                    onChange={e => { setForm(f => ({ ...f, capacity: e.target.value })); setErrs(x => ({ ...x, capacity: '' })) }}
                    placeholder="10"
                    error={errs.capacity || undefined}
                  />
                  <span className={s.capacityHint}>{t('services.modal.capacityHint')}</span>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Toggle checked={form.active} onChange={v => setForm(f => ({ ...f, active: v }))} />
            <span style={{ fontSize: 13 }}>{t('services.modal.active')}</span>
          </div>
        </div>
      </Modal>
    </div>
  )
}
