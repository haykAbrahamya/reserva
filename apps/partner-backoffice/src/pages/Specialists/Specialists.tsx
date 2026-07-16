import { useState, useEffect } from 'react'
import { Plus, User, Pencil, MapPin } from 'lucide-react'
import { usePartner } from '@/store/app.store'
import { useResource } from '@/store/useResource'
import { Button, Toggle, Modal, Input, Select, Avatar, Empty, Badge, FieldError, useToast } from '@/components/ui'
import { SpecialistDashboard } from '@/components/specialists/SpecialistDashboard/SpecialistDashboard'
import { AvatarPicker } from '@/components/specialists/AvatarPicker/AvatarPicker'
import { normalizePhoneInput } from '@reserva/shared'
import { partnersService } from '@/services/partners.service'
import { errorMessage } from '@/utils/errors'
import { useScopedLocationId } from '@/store/auth.hooks'
import { useI18n } from '@/i18n'
import { useSpotlight } from '@/components/onboarding/useSpotlight'
import { notifyProfileUpdated } from '@/components/onboarding/useProfileCompletion'
import { I18nField } from '@/components/i18n/I18nField/I18nField'
import type { Specialist, LocalizedText } from '@/types'
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

const EMPTY_FORM = { name: '', title: '', titleI18n: null as LocalizedText | null, locationId: '', phone: '', active: true, services: [] as string[] }

export function Specialists() {
  const partner     = usePartner()
  const isMobile    = useIsMobile()
  const scopedLocationId = useScopedLocationId()
  const { t }       = useI18n()
  const toast       = useToast()
  useSpotlight()

  // How many cards to reveal at once. Grows on "Load more" — the full roster is
  // fetched once and paginated locally (no per-page round-trips).
  const PAGE_STEP = 12
  const [visible, setVisible] = useState(PAGE_STEP)

  // Full roster, fetched once. Managers are scoped to their own branch server-side.
  const { data: allSpecialists, reload } = useResource(
    () => partnersService.listSpecialists({
      includeInactive: true,
      ...(scopedLocationId ? { locationId: scopedLocationId } : {}),
    }),
    [scopedLocationId],
    [],
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

  // Staged profile photo. `avatarFile` is a newly-picked file to upload on save;
  // `avatarCleared` marks that the existing photo should be removed. The upload
  // itself happens after the specialist row exists (a new one has no id yet).
  const [avatarFile,    setAvatarFile]    = useState<File | null>(null)
  const [avatarCleared, setAvatarCleared] = useState(false)

  if (!partner) return null

  const total       = allSpecialists.length
  const specialists = allSpecialists.slice(0, visible)
  const hasMore     = visible < total

  // Managers can't reassign branches — lock the location select to their branch.
  const lockedLocation = scopedLocationId

  const openNew = () => {
    setEditing(null)
    setErrs({})
    setAvatarFile(null)
    setAvatarCleared(false)
    setForm({ ...EMPTY_FORM, locationId: lockedLocation ?? locations[0]?.id ?? '' })
    setModalOpen(true)
  }

  const openEdit = (sp: Specialist) => {
    setEditing(sp)
    setErrs({})
    setAvatarFile(null)
    setAvatarCleared(false)
    setForm({ name: sp.name, title: sp.title, titleI18n: sp.titleI18n ?? null, locationId: sp.locationId, phone: sp.phone, active: sp.active, services: sp.services })
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
      // 1) Persist the specialist first — a new one needs an id before we can
      //    attach a photo (the avatar route is /specialists/:id/avatar).
      const saved = editing
        ? await partnersService.updateSpecialist(editing.id, form)
        : await partnersService.createSpecialist(form)

      // 2) Apply any staged photo change against the now-existing row.
      if (avatarFile) {
        await partnersService.uploadSpecialistAvatar(saved.id, avatarFile)
      } else if (avatarCleared && editing?.avatarUrl) {
        await partnersService.removeSpecialistAvatar(saved.id)
      }

      await reload()
      notifyProfileUpdated()
      setModalOpen(false)
      setErrs({})
      setAvatarFile(null)
      setAvatarCleared(false)
    } catch (err) {
      toast(errorMessage(err, t))
    } finally {
      setSaving(false)
    }
  }

  const toggleSvc = (id: string) =>
    setForm(f => ({ ...f, services: f.services.includes(id) ? f.services.filter(x => x !== id) : [...f.services, id] }))

  // Local "load more" footer — shared by the mobile list + desktop card grid.
  const loadMore = total > 0 && (
    <div className={s.loadMore}>
      <span className={s.loadMoreCount}>{t('specialists.showingCount', { shown: specialists.length, total })}</span>
      {hasMore && (
        <Button variant="ghost" onClick={() => setVisible(v => v + PAGE_STEP)}>
          {t('specialists.loadMore')}
        </Button>
      )}
    </div>
  )

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
            const uniqueSvcs = Array.from(new Set(sp.services))
            const visibleSvcs = uniqueSvcs.slice(0, 3)
            const extra = uniqueSvcs.length - visibleSvcs.length
            return (
              <div key={sp.id} className={s.spCard} onClick={() => setDashboardSp(sp)}>
                <div className={s.spCardTop}>
                  <Avatar name={sp.name} src={sp.avatarUrl} color={partner.accent} size="lg" />
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
          {loadMore}
        </div>
      ) : (
        /* ── Desktop: profile cards ── */
        <div className={s.gridWrap}>
          <div className={s.grid}>
            {specialists.map(sp => {
              const loc = locations.find(l => l.id === sp.locationId)
              // Dedupe defensively — a specialist can carry duplicate service ids
              // from the join, and we never want the same tag rendered twice.
              const uniqueSvcs = Array.from(new Set(sp.services))
              const shownSvcs = uniqueSvcs.slice(0, 3)
              const extra = uniqueSvcs.length - shownSvcs.length
              return (
                <div key={sp.id} className={s.profileCard} onClick={() => setDashboardSp(sp)}>
                  <button
                    className={s.cardEdit}
                    onClick={e => { e.stopPropagation(); openEdit(sp) }}
                    aria-label={t('common.edit')}
                  >
                    <Pencil size={13} />
                  </button>

                  <div className={s.cardHead}>
                    <Avatar name={sp.name} src={sp.avatarUrl} color={partner.accent} size="lg" className={s.cardAvatar} />
                    <div className={s.cardIdentity}>
                      <div className={s.cardName}>{sp.name}</div>
                      {sp.title && <div className={s.cardTitle}>{sp.title}</div>}
                      <Badge
                        variant={sp.active ? 'active' : 'inactive'}
                        label={sp.active ? t('common.active') : t('common.inactive')}
                      />
                    </div>
                  </div>

                  <div className={s.cardLoc}>
                    <MapPin size={13} style={{ flexShrink: 0 }} />
                    <span>{loc?.name ?? '—'}</span>
                  </div>

                  <div className={s.cardSvcs}>
                    {shownSvcs.length === 0 ? (
                      <span className={s.cardNoSvc}>{t('specialists.noServices')}</span>
                    ) : (
                      <>
                        {shownSvcs.map(sid => {
                          const svc = services.find(sv => sv.id === sid)
                          return svc ? <span key={sid} className={s.svcTag}>{svc.name}</span> : null
                        })}
                        {extra > 0 && <span className={[s.svcTag, s.svcTagMore].join(' ')}>+{extra}</span>}
                      </>
                    )}
                  </div>

                  <div className={s.cardFoot}>
                    <span className={s.viewHint}>{t('specialists.viewStats')}</span>
                  </div>
                </div>
              )
            })}
          </div>
          {loadMore}
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
          <div className={[s.formFull, s.avatarRow].join(' ')}>
            <AvatarPicker
              currentUrl={avatarCleared ? '' : editing?.avatarUrl ?? ''}
              name={form.name}
              accent={partner.accent}
              onPick={(file) => { setAvatarFile(file); setAvatarCleared(false) }}
              onClear={() => { setAvatarFile(null); setAvatarCleared(true) }}
              onError={(msg) => toast(msg)}
            />
          </div>
          <div className={s.formFull}>
            <Input label={t('specialists.modal.nameLabel')} value={form.name} onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setErrs(x => ({ ...x, name: '' })) }} placeholder={t('specialists.modal.namePlaceholder')} error={errs.name || undefined} />
          </div>
          <div className={s.formFull}>
            <I18nField
              label={t('specialists.modal.titleLabel')}
              value={form.title}
              onChange={v => setForm(f => ({ ...f, title: v }))}
              i18n={form.titleI18n}
              onI18nChange={next => setForm(f => ({ ...f, titleI18n: next }))}
              placeholder={t('specialists.modal.titlePlaceholder')}
            />
          </div>
          <div className={s.formFull}>
            <Input label={t('specialists.modal.phoneLabel')} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: normalizePhoneInput(e.target.value) }))} placeholder="+37491234567" />
          </div>
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
