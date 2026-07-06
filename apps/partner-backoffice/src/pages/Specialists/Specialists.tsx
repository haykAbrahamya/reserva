import { useState, useEffect } from 'react'
import { Plus, User, Pencil, MapPin } from 'lucide-react'
import { usePartner } from '@/store/app.store'
import { useResource } from '@/store/useResource'
import { Button, Table, Th, Td, Tr, Toggle, Modal, Input, Select, Avatar, Empty, Badge, Pagination, FieldError, useToast } from '@/components/ui'
import { SpecialistDashboard } from '@/components/specialists/SpecialistDashboard/SpecialistDashboard'
import { normalizePhoneInput } from '@reserva/shared'
import { partnersService } from '@/services/partners.service'
import { errorMessage } from '@/utils/errors'
import { useScopedLocationId } from '@/store/auth.hooks'
import { useI18n } from '@/i18n'
import { useSpotlight } from '@/components/onboarding/useSpotlight'
import { notifyProfileUpdated } from '@/components/onboarding/useProfileCompletion'
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
  const isMobile    = useIsMobile()
  const scopedLocationId = useScopedLocationId()
  const { t }       = useI18n()
  const toast       = useToast()
  useSpotlight()

  const [page,     setPage]     = useState(1)
  const [pageSize, setPageSize] = useState(5)

  // Server-paginated roster. Managers are scoped to their own branch server-side.
  const { data: result, reload } = useResource(
    () => partnersService.listSpecialistsPaged({
      page,
      pageSize,
      includeInactive: true,
      ...(scopedLocationId ? { locationId: scopedLocationId } : {}),
    }),
    [page, pageSize, scopedLocationId],
  )

  // Catalog lookups for rendering names (full lists, not paginated).
  const { data: services } = useResource(() => partnersService.listServices(), [], [])
  const { data: locations } = useResource(() => partnersService.listLocations(), [], [])

  const [modalOpen,   setModalOpen]   = useState(false)
  const [editing,     setEditing]     = useState<Specialist | null>(null)
  const [form,        setForm]        = useState(EMPTY_FORM)
  const [errs,        setErrs]        = useState<Record<string, string>>({})
  const [saving,      setSaving]      = useState(false)
  const [dashboardSp, setDashboardSp] = useState<Specialist | null>(null)

  if (!partner) return null

  const specialists = result?.items ?? []
  const total       = result?.total ?? 0
  const pageCount   = result?.pageCount ?? 1
  const from        = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to          = Math.min(page * pageSize, total)
  const changePageSize = (n: number) => { setPageSize(n); setPage(1) }

  // Managers can't reassign branches — lock the location select to their branch.
  const lockedLocation = scopedLocationId

  const openNew = () => {
    setEditing(null)
    setErrs({})
    setForm({ ...EMPTY_FORM, locationId: lockedLocation ?? locations[0]?.id ?? '' })
    setModalOpen(true)
  }

  const openEdit = (sp: Specialist) => {
    setEditing(sp)
    setErrs({})
    setForm({ name: sp.name, title: sp.title, locationId: sp.locationId, phone: sp.phone, active: sp.active, services: sp.services })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (saving) return
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = t('errors.required')
    if (!form.locationId) e.locationId = t('errors.required')
    setErrs(e)
    if (Object.keys(e).length) { toast(t('errors.fixFields')); return }
    setSaving(true)
    try {
      if (editing) await partnersService.updateSpecialist(editing.id, form)
      else await partnersService.createSpecialist(form)
      await reload()
      notifyProfileUpdated()
      setModalOpen(false)
      setErrs({})
    } catch (err) {
      toast(errorMessage(err, t))
    } finally {
      setSaving(false)
    }
  }

  const toggleSvc = (id: string) =>
    setForm(f => ({ ...f, services: f.services.includes(id) ? f.services.filter(x => x !== id) : [...f.services, id] }))

  return (
    <div className={s.page}>
      <div className={s.head}>
        <div>
          <h1 className={s.h1}>{t('specialists.title')}</h1>
          <p className={s.sub}>{t('specialists.subtitle', { name: partner.name, count: total })}</p>
        </div>
        <span data-spotlight="addSpecialist" style={{ display: 'inline-flex' }}>
          <Button variant="accent" onClick={openNew}><Plus size={14} /> {t('specialists.addSpecialist')}</Button>
        </span>
      </div>

      {total === 0 ? (
        <Empty icon={User} title={t('specialists.emptyTitle')} description={t('specialists.emptyDesc')}
          action={<span data-spotlight="addSpecialist" style={{ display: 'inline-flex' }}><Button variant="accent" onClick={openNew}><Plus size={14} /> {t('specialists.addSpecialist')}</Button></span>}
        />
      ) : isMobile ? (
        /* ── Mobile: cards ── */
        <div className={s.cardList}>
          {specialists.map(sp => {
            const loc = locations.find(l => l.id === sp.locationId)
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
                    <Badge variant={sp.active ? 'active' : 'inactive'} label={sp.active ? t('common.active') : t('common.inactive')} />
                    <button className={s.spCardEditBtn} onClick={e => { e.stopPropagation(); openEdit(sp) }}>
                      <Pencil size={12} /> {t('common.edit')}
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
                      const svc = services.find(sv => sv.id === sid)
                      return svc ? <span key={sid} className={s.svcPill}>{svc.name}</span> : null
                    })}
                    {extra > 0 && <span className={[s.svcPill, s.more].join(' ')}>{t('common.more', { count: extra })}</span>}
                  </div>
                </div>
              </div>
            )
          })}
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
                <Th>{t('specialists.col.name')}</Th>
                <Th>{t('specialists.col.location')}</Th>
                <Th>{t('specialists.col.services')}</Th>
                <Th>{t('specialists.col.active')}</Th>
                <Th></Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {specialists.map(sp => {
                const loc = locations.find(l => l.id === sp.locationId)
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
                          const svc = services.find(sv => sv.id === sid)
                          return svc ? <span key={sid} className={s.svcTag}>{svc.name}</span> : null
                        })}
                        {sp.services.length > 3 && <span className={s.svcTag}>+{sp.services.length - 3}</span>}
                      </div>
                    </Td>
                    <Td><Badge variant={sp.active ? 'active' : 'inactive'} label={sp.active ? t('common.active') : t('common.inactive')} /></Td>
                    <Td>
                      <Button variant="ghost" size="sm" icon onClick={e => { e.stopPropagation(); openEdit(sp) }}>
                        <Pencil size={13} />
                      </Button>
                    </Td>
                    <Td>
                      <span className={s.viewHint}>{t('specialists.viewStats')}</span>
                    </Td>
                  </Tr>
                )
              })}
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
        title={editing ? t('specialists.modal.editTitle') : t('specialists.modal.newTitle')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button>
            <Button variant="accent" onClick={handleSave} disabled={saving}>{t('common.save')}</Button>
          </>
        }
      >
        <div className={s.formGrid}>
          <div className={s.formFull}>
            <Input label={t('specialists.modal.nameLabel')} value={form.name} onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setErrs(x => ({ ...x, name: '' })) }} placeholder={t('specialists.modal.namePlaceholder')} error={errs.name || undefined} />
          </div>
          <Input label={t('specialists.modal.titleLabel')} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder={t('specialists.modal.titlePlaceholder')} />
          <Input label={t('specialists.modal.phoneLabel')} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: normalizePhoneInput(e.target.value) }))} placeholder="+37491234567" />
          <div className={s.formFull}>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-1)', display: 'block', marginBottom: 6 }}>{t('specialists.modal.locationLabel')}</label>
            <Select
              value={form.locationId}
              onChange={v => { setForm(f => ({ ...f, locationId: v })); setErrs(x => ({ ...x, locationId: '' })) }}
              options={locations.map(l => ({ value: l.id, label: l.name }))}
              disabled={!!lockedLocation}
            />
            <FieldError message={errs.locationId} />
          </div>
          <div className={s.formFull}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-1)', marginBottom: 8 }}>{t('specialists.modal.servicesLabel')}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {services.map(svc => (
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
            <span style={{ fontSize: 13 }}>{t('specialists.modal.active')}</span>
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
