import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, User, Pencil, MapPin, Search } from 'lucide-react'
import { usePartner } from '@/store/app.store'
import { useResource } from '@/store/useResource'
import { Button, Toggle, Modal, Input, Select, Avatar, Empty, Badge, Chip, FieldError, useToast } from '@/components/ui'
import { SpecialistDashboard } from '@/components/specialists/SpecialistDashboard/SpecialistDashboard'
import { AvatarPicker } from '@/components/specialists/AvatarPicker/AvatarPicker'
import { ServicePicker } from '@/components/specialists/ServicePicker/ServicePicker'
import { normalizePhoneInput, specialistBranchIds } from '@reserva/shared'
import { partnersService } from '@/services/partners.service'
import { errorMessage } from '@/utils/errors'
import { useScopedLocationId } from '@/store/auth.hooks'
import { useBranchPricing } from '@/hooks/useBranchPricing'
import { useI18n } from '@/i18n'
import { useLocalized } from '@/i18n/useLocalized'
import { useSpecialistName } from '@/i18n/useSpecialistName'
import { useSpotlight } from '@/components/onboarding/useSpotlight'
import { notifyProfileUpdated } from '@/components/onboarding/useProfileCompletion'
import { I18nField } from '@/components/i18n/I18nField/I18nField'
import type { Specialist, LocalizedText, Location } from '@/types'
import { SpecialistsFilterBar } from './SpecialistsFilterBar'
import { filterSpecialists, rosterCategories, type SpecialistFilter } from './specialistFilters'
import s from './Specialists.module.scss'

/** Branch names a specialist works at, home first ("Kentron · Komitas"), in the UI language. */
function branchNames(sp: Specialist, locations: Location[], loc: ReturnType<typeof useLocalized>): string {
  const names = specialistBranchIds(sp)
    .map((id) => locations.find((l) => l.id === id))
    .filter((l): l is Location => !!l)
    .map((l) => loc(l.name, l.nameI18n))
  return names.length ? names.join(' · ') : '—'
}

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
  name: '',
  nameI18n: null as LocalizedText | null,
  title: '',
  titleI18n: null as LocalizedText | null,
  /** Main (home) branch. */
  locationId: '',
  /** Every branch they work at — only edited when branch pricing is on. */
  branchIds: [] as string[],
  phone: '',
  active: true,
  services: [] as string[],
}

export function Specialists() {
  const partner     = usePartner()
  const isMobile    = useIsMobile()
  const scopedLocationId = useScopedLocationId()
  const branchPricing = useBranchPricing()
  const { t }       = useI18n()
  const loc         = useLocalized()
  const spName      = useSpecialistName()
  const toast       = useToast()
  useSpotlight()

  // How many cards to reveal at once. Grows on "Load more" — the full roster is
  // fetched once and paginated locally (no per-page round-trips).
  const PAGE_STEP = 12
  const [visible, setVisible] = useState(PAGE_STEP)

  // Filters. Branch + categories live in the URL (deep-linkable, survive a
  // reload), as on Bookings; the name search is local. All three narrow the
  // roster in memory — it's already fully loaded.
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const branchParam    = searchParams.get('branch') ?? ''
  const categoryParams = searchParams.getAll('category')
  // A new filter starts again from the first page of results.
  const categoriesKey = categoryParams.join('|')
  useEffect(() => { setVisible(PAGE_STEP) }, [query, branchParam, categoriesKey])

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

  // Filter choices. A manager's roster is already one branch, so no branch
  // filter for them; categories are only those someone on the roster does.
  const branchOptions = scopedLocationId
    ? []
    : locations.map(l => ({ value: l.id, label: loc(l.name, l.nameI18n) }))
  const categoryOptions = rosterCategories(allSpecialists, services)
    .map(svc => ({ value: svc.category.trim(), label: loc(svc.category, svc.categoryI18n) }))
  // A filter with fewer than two choices is hidden, so it must not filter
  // either; URL values naming nothing here (a deleted branch) are dropped too.
  const filter: SpecialistFilter = {
    query,
    branchId: branchOptions.length > 1 && branchOptions.some(o => o.value === branchParam) ? branchParam : '',
    categories: categoryOptions.length > 1 ? categoryParams.filter(c => categoryOptions.some(o => o.value === c)) : [],
  }
  const setUrlFilters = (branch: string, categories: string[]) => {
    const next = new URLSearchParams(searchParams)
    next.delete('branch')
    next.delete('category')
    if (branch) next.set('branch', branch)
    categories.forEach(c => next.append('category', c))
    setSearchParams(next, { replace: true })
  }
  const clearFilters = () => { setQuery(''); setUrlFilters('', []) }

  const total       = allSpecialists.length
  const matching    = filterSpecialists(allSpecialists, services, filter)
  const specialists = matching.slice(0, visible)
  const hasMore     = visible < matching.length

  // Managers can't reassign branches — lock the location select to their branch.
  const lockedLocation = scopedLocationId
  // Several branches + the feature on: a specialist can work at more than one.
  // Otherwise the form keeps its single "Location" select, exactly as before.
  const multiBranch = branchPricing && locations.length > 1

  const openNew = () => {
    setEditing(null)
    setErrs({})
    setAvatarFile(null)
    setAvatarCleared(false)
    const home = lockedLocation ?? locations[0]?.id ?? ''
    setForm({ ...EMPTY_FORM, locationId: home, branchIds: home ? [home] : [] })
    setModalOpen(true)
  }

  const openEdit = (sp: Specialist) => {
    setEditing(sp)
    setErrs({})
    setAvatarFile(null)
    setAvatarCleared(false)
    setForm({
      name: sp.name,
      nameI18n: sp.nameI18n ?? null,
      title: sp.title,
      titleI18n: sp.titleI18n ?? null,
      locationId: sp.locationId,
      branchIds: specialistBranchIds(sp),
      phone: sp.phone,
      active: sp.active,
      services: sp.services,
    })
    setModalOpen(true)
  }

  /** Tick/untick a branch. The main branch follows: it must be one they work at. */
  const toggleBranch = (id: string) => {
    setErrs(x => ({ ...x, locationId: '' }))
    setForm(f => {
      const on = f.branchIds.includes(id)
      const branchIds = on ? f.branchIds.filter(b => b !== id) : [...f.branchIds, id]
      const locationId = branchIds.includes(f.locationId) ? f.locationId : (branchIds[0] ?? '')
      return { ...f, branchIds, locationId }
    })
  }

  const handleSave = async () => {
    if (saving) return
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = t('errors.required')
    if (!form.locationId) e.locationId = multiBranch ? t('branchPricing.worksAt.pickOne') : t('errors.required')
    setErrs(e)
    if (Object.keys(e).length) { toast(t('errors.fixFields')); return }
    setSaving(true)
    try {
      const { branchIds, ...fields } = form
      // The branch list is only sent by the multi-branch picker; without it the
      // server keeps treating `locationId` as the one branch, as it always has.
      const payload = multiBranch
        ? { ...fields, locations: branchIds.map(locationId => ({ locationId })) }
        : fields
      // 1) Persist the specialist first — a new one needs an id before we can
      //    attach a photo (the avatar route is /specialists/:id/avatar).
      const saved = editing
        ? await partnersService.updateSpecialist(editing.id, payload)
        : await partnersService.createSpecialist(payload)

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


  // Local "load more" footer — shared by the mobile list + desktop card grid.
  const loadMore = matching.length > 0 && (
    <div className={s.loadMore}>
      <span className={s.loadMoreCount}>{t('specialists.showingCount', { shown: specialists.length, total: matching.length })}</span>
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

      {/* Hidden only when there's nobody to filter; stays on a no-match result
          so the filters can be adjusted or cleared. */}
      {total > 0 && (
        <SpecialistsFilterBar
          filter={filter}
          onQueryChange={setQuery}
          onBranchChange={id => setUrlFilters(id, filter.categories)}
          onCategoriesChange={cats => setUrlFilters(filter.branchId, cats)}
          onClear={clearFilters}
          branches={branchOptions}
          categories={categoryOptions}
        />
      )}

      {total === 0 ? (
        <Empty icon={User} title={t('specialists.emptyTitle')} description={t('specialists.emptyDesc')}
          action={<span data-spotlight="addSpecialist" style={{ display: 'inline-flex' }}><Button variant="accent" onClick={openNew}><Plus size={14} /> {t('specialists.addSpecialist')}</Button></span>}
        />
      ) : matching.length === 0 ? (
        <Empty icon={Search} title={t('specialists.filter.noMatchTitle')} description={t('specialists.filter.noMatchDesc')}
          action={<Button variant="ghost" onClick={clearFilters}>{t('specialists.filter.clear')}</Button>}
        />
      ) : isMobile ? (
        /* ── Mobile: cards ── */
        <div className={s.cardList}>
          {specialists.map(sp => {
            const where = branchNames(sp, locations, loc)
            // Name (and so the avatar initials) in the UI language + the
            // salon's name order; title in the UI language.
            const name = spName(sp)
            const title = loc(sp.title, sp.titleI18n)
            const uniqueSvcs = Array.from(new Set(sp.services))
            const visibleSvcs = uniqueSvcs.slice(0, 3)
            const extra = uniqueSvcs.length - visibleSvcs.length
            return (
              <div key={sp.id} className={s.spCard} onClick={() => setDashboardSp(sp)}>
                <div className={s.spCardTop}>
                  <Avatar name={name} src={sp.avatarUrl} color={partner.accent} size="lg" />
                  <div className={s.spCardInfo}>
                    <div className={s.spCardName}>{name}</div>
                    <div className={s.spCardTitle}>{title}</div>
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
                    {where}
                  </div>
                  <div className={s.spCardSvcs}>
                    {visibleSvcs.map(sid => {
                      const svc = services.find(sv => sv.id === sid)
                      return svc ? <span key={sid} className={s.svcPill}>{loc(svc.name, svc.nameI18n)}</span> : null
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
              const where = branchNames(sp, locations, loc)
              // Name (and so the avatar initials) in the UI language + the
              // salon's name order; title in the UI language.
              const name = spName(sp)
              const title = loc(sp.title, sp.titleI18n)
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
                    <Avatar name={name} src={sp.avatarUrl} color={partner.accent} size="lg" className={s.cardAvatar} />
                    <div className={s.cardIdentity}>
                      <div className={s.cardName}>{name}</div>
                      {title && <div className={s.cardTitle}>{title}</div>}
                      <Badge
                        variant={sp.active ? 'active' : 'inactive'}
                        label={sp.active ? t('common.active') : t('common.inactive')}
                      />
                    </div>
                  </div>

                  <div className={s.cardLoc}>
                    <MapPin size={13} style={{ flexShrink: 0 }} />
                    <span>{where}</span>
                  </div>

                  <div className={s.cardSvcs}>
                    {shownSvcs.length === 0 ? (
                      <span className={s.cardNoSvc}>{t('specialists.noServices')}</span>
                    ) : (
                      <>
                        {shownSvcs.map(sid => {
                          const svc = services.find(sv => sv.id === sid)
                          return svc ? <span key={sid} className={s.svcTag}>{loc(svc.name, svc.nameI18n)}</span> : null
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
            <I18nField
              label={t('specialists.modal.nameLabel')}
              value={form.name}
              onChange={v => { setForm(f => ({ ...f, name: v })); setErrs(x => ({ ...x, name: '' })) }}
              i18n={form.nameI18n}
              onI18nChange={next => setForm(f => ({ ...f, nameI18n: next }))}
              placeholder={t('specialists.modal.namePlaceholder')}
              error={errs.name || undefined}
            />
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
          {multiBranch ? (
            /* Several branches: pick every branch they work at, then the main one. */
            <div className={[s.formFull, s.worksAt].join(' ')}>
              <div className={s.worksAtHead}>
                <span className={s.fieldLabel}>{t('branchPricing.worksAt.label')}</span>
                <span className={s.fieldHint}>
                  {lockedLocation ? t('branchPricing.worksAt.managerLocked') : t('branchPricing.worksAt.hint')}
                </span>
              </div>
              <div className={s.branchChips} role="group" aria-label={t('branchPricing.worksAt.label')}>
                {locations.map(l => (
                  <Chip
                    key={l.id}
                    label={l.name}
                    icon={MapPin}
                    selected={form.branchIds.includes(l.id)}
                    disabled={!!lockedLocation}
                    onClick={() => toggleBranch(l.id)}
                  />
                ))}
              </div>
              <FieldError message={errs.locationId} />
              {form.branchIds.length > 1 && (
                <div className={s.mainBranch}>
                  <div className={s.mainBranchText}>
                    <span className={s.fieldLabel}>{t('branchPricing.worksAt.main')}</span>
                    <span className={s.fieldHint}>{t('branchPricing.worksAt.mainHint')}</span>
                  </div>
                  <div className={s.mainBranchSelect}>
                    <Select
                      value={form.locationId}
                      onChange={v => setForm(f => ({ ...f, locationId: v }))}
                      options={locations.filter(l => form.branchIds.includes(l.id)).map(l => ({ value: l.id, label: l.name }))}
                      disabled={!!lockedLocation}
                    />
                  </div>
                </div>
              )}
              {form.branchIds.length > 1 && <p className={s.fieldNote}>{t('branchPricing.worksAt.hoursHint')}</p>}
            </div>
          ) : (
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
          )}
          <div className={s.formFull}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-1)', marginBottom: 8 }}>{t('specialists.modal.servicesLabel')}</div>
            <ServicePicker
              services={services}
              selected={form.services}
              onChange={next => setForm(f => ({ ...f, services: next }))}
            />
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
